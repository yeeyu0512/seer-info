const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync('tmp/mintmarks/manifest.json'));
const general = { series: manifest.series };
const generalFull = JSON.parse(fs.readFileSync(path.join('tmp/mintmarks', manifest.categories.general.full.file))).records;
const exportSample = generalFull.find(record => !record.is_hidden && record.extra_attr_value) || generalFull.find(record => !record.is_hidden);
const exclusive = JSON.parse(fs.readFileSync(path.join('tmp/mintmarks', manifest.categories.exclusive.full.file)));
const sample = exclusive.records.find(record => !record.is_hidden);
const section = fs.readFileSync('index.html', 'utf8').match(/<section id="seal-encyclopedia-section"[\s\S]*?<\/section>/)[0].replace(' hidden', '');
const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, pathname.startsWith('/data/mintmarks/') ? './tmp/mintmarks/' + path.basename(pathname) : '.' + pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' })[path.extname(file)] || 'text/plain');
    res.end(fs.readFileSync(file));
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        for (const width of [1440, 1024, 390, 320]) {
            const page = await browser.newPage({ viewport: { width, height: width > 900 ? 640 : 844 } });
            const errors = [], calls = { general: 0, exclusive: 0, api: 0, full: 0, ability: 0, skill: 0 };
            let failGeneral = true, failExclusive = true, releaseExclusive;
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.hostname === 'api.seerapi.com') calls.api++;
                // Image conversion is outside this data-loading test; screenshots use placeholders.
                if (url.origin !== base) return route.abort();
                // Capture the real export inputs; Excel formatting is covered by
                // its existing tests, without downloading the CDN runtime here.
                if (url.pathname === '/js/seer-mintmark-export.js') return route.fulfill({
                    contentType: 'text/javascript', body: 'export async function downloadMintmarkWorkbook(records) { window.exportedRecords = records; }',
                });
                if (url.pathname.includes('-full.')) calls.full++;
                if (url.pathname.includes('/ability-list.')) calls.ability++;
                if (url.pathname.includes('/skill-list.')) calls.skill++;
                if (url.pathname.includes('/general-list.')) {
                    calls.general++;
                    if (failGeneral) { failGeneral = false; return route.fulfill({ status: 503, body: 'offline' }); }
                }
                if (url.pathname.includes('/exclusive-list.')) {
                    calls.exclusive++;
                    if (failExclusive) { failExclusive = false; return route.fulfill({ status: 503, body: 'offline' }); }
                    await new Promise(resolve => { releaseExclusive = resolve; });
                }
                return route.continue();
            });
            await page.goto(`${base}/css/style.css`);
            await page.setContent(`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/css/style.css"><main style="max-width:1200px;margin:16px auto;padding:0 12px">${section}</main>`);
            await page.evaluate(async () => {
                const { initSeerMintmarks } = await import('/js/seer-mintmarks.js');
                window.catalog = initSeerMintmarks(document.querySelector('#seal-encyclopedia-section'), {
                    fetchSeerJson: () => { throw new Error('Unexpected API request'); },
                    getSeerServerSettings: async () => ({ latestMintmarkId: 99999 }),
                });
                document.querySelector('#seal-taiwan-progress-only').checked = false;
                await window.catalog.load();
                const { initSelectionPickers } = await import('/js/shared/selection-picker.js');
                initSelectionPickers();
            });
            const retry = page.locator('[data-seal-retry]');
            await retry.waitFor({ state: 'visible' });
            await retry.click();
            await page.waitForFunction(() => document.querySelector('.seal-card'));
            assert.equal(calls.general, 2);
            assert.equal(calls.exclusive, 0, 'default view must never download exclusive data');
            assert.equal(calls.full + calls.ability + calls.skill, 0, 'initial load must only fetch the compact general list');
            const normalStatus = await page.locator('.seal-status').textContent();
            const toggle = page.locator('[data-seal-exclusive]');
            await toggle.check();
            await retry.waitFor({ state: 'visible' });
            assert.equal(await page.locator('[data-seal-export]').isDisabled(), true);
            await toggle.uncheck();
            await page.waitForFunction(normal => document.querySelector('.seal-status').textContent === normal, normalStatus);
            assert.equal(await page.locator('.seal-status').textContent(), normalStatus);
            await toggle.check();
            await page.waitForFunction(() => document.querySelector('.seal-status').textContent.includes('正在載入刻印列表'));
            while (!releaseExclusive) await new Promise(resolve => setTimeout(resolve, 10));
            await toggle.uncheck();
            releaseExclusive();
            await page.waitForFunction(normal => document.querySelector('.seal-status').textContent === normal, normalStatus);
            assert.equal(await page.locator('.seal-status').textContent(), normalStatus);
            await toggle.check();
            await page.waitForFunction(normal => document.querySelector('.seal-status').textContent !== normal && !document.querySelector('[data-seal-export]').disabled, normalStatus);
            await toggle.uncheck();
            await toggle.check();
            assert.equal(calls.exclusive, 2, 'one failed request plus one successful request, then cached');
            assert.equal(calls.api, 0);
            assert.equal(calls.full, 0);
            const seriesInput = page.locator('#seal-series-search');
            await seriesInput.fill(String(general.series[0].id));
            await seriesInput.press('ArrowDown');
            await seriesInput.press('Enter');
            await page.locator('input[type="search"]').fill('不存在的刻印測試');
            await page.waitForFunction(() => document.querySelector('.seal-grid').children.length === 0);
            await page.locator('input[type="search"]').fill('');
            await page.evaluate(() => {
                const series = document.querySelector('[data-seal-series]'); series.value = 'all'; series.dispatchEvent(new Event('change'));
            });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `overflow at ${width}`);
            fs.mkdirSync('tmp/mintmark-snapshot-qa', { recursive: true });
            await page.screenshot({ path: `tmp/mintmark-snapshot-qa/${width}.png`, fullPage: true });
            await page.locator('input[type="search"]').fill(String(exportSample.id));
            await page.locator('[data-seal-export]').click();
            await page.waitForFunction(() => window.exportedRecords?.length);
            const exported = await page.evaluate(id => window.exportedRecords.find(record => record.id === id), exportSample.id);
            assert.deepEqual(exported.max_attr_value, exportSample.max_attr_value);
            assert.deepEqual(exported.extra_attr_value, exportSample.extra_attr_value);
            assert.equal(calls.full, 1, 'export lazily fills the complete general category');
            await page.locator('input[type="search"]').fill('');
            await page.evaluate(() => {
                const type = document.querySelector('[data-seal-type]'); type.value = '0'; type.dispatchEvent(new Event('change'));
            });
            await page.waitForFunction(count => document.querySelector('.seal-status').textContent.startsWith(`${count.toLocaleString()} `), manifest.categories.ability.list.count);
            assert.equal(calls.ability, 1);
            assert.equal(calls.skill, 0);
            await page.evaluate(() => {
                const type = document.querySelector('[data-seal-type]'); type.value = '1'; type.dispatchEvent(new Event('change'));
            });
            await page.waitForFunction(count => document.querySelector('.seal-status').textContent.startsWith(`${count.toLocaleString()} `), manifest.categories.skill.list.count);
            assert.equal(calls.skill, 1);
            assert.equal(calls.full, 1);
            await page.evaluate(id => window.catalog.searchById(id), sample.id);
            assert.equal(await page.locator('#seal-detail-title').textContent(), sample.name);
            assert.equal(calls.full, 2, 'ID detail only fetches its own full category');
            await page.locator('.seal-dialog button[aria-label="關閉刻印詳情"]').click();
            await page.evaluate(id => window.catalog.searchById(id), sample.id);
            assert.equal(calls.full, 2, 'detail data is cached');
            assert.equal(calls.exclusive, 2);
            assert.deepEqual(errors, []);
            console.log(`${width}px: compact initial load, category lazy loading, retry, toggle race, cache, search, series input and full ID details passed`);
            await page.close();
        }
    } finally {
        await browser?.close();
        server.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
