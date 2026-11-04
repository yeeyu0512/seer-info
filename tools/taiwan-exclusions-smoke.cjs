const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp'})[path.extname(file)] || 'application/octet-stream');
    let body = fs.readFileSync(file);
    if (file.endsWith('admin.html')) body = body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
    res.end(body);
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        for (const width of [1440, 1024, 390, 320]) {
            const page = await browser.newPage({viewport: {width, height: 900}});
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route(/^https:\/\//, route => route.abort());
            await page.goto(`http://127.0.0.1:${server.address().port}/admin.html`);
            await page.evaluate(async () => {
                document.body.classList.add('admin-page');
                document.querySelector('#admin-login-panel').hidden = true;
                document.querySelector('#access-denied').hidden = true;
                document.querySelector('#admin-workspace').hidden = false;
                document.querySelector('#admin-competitive-tools').hidden = true;
                document.querySelector('#admin-taiwan-settings-tools').hidden = false;
                for (const tab of document.querySelectorAll('[data-admin-tab]')) {
                    const active = tab.dataset.adminTab === 'admin-taiwan-settings-tools';
                    tab.classList.toggle('is-active', active); tab.setAttribute('aria-selected', active);
                }
                window.fixture = {latestPetId: 4900, latestSkinId: 3000, latestMintmarkId: 43000, hasMintmarkProgressField: true, hasExclusionsField: true, exclusions: {pet: '', skin: '', mintmark: ''}};
                window.saves = [];
                const { createAdminServerSettings } = await import('/js/admin/server-settings.js');
                window.editor = createAdminServerSettings({getSeerServerSettings: async () => fixture, getAdminErrorMessage: error => error.message, updateSeerServerSettings: async (...args) => {
                    saves.push(args); fixture.exclusions = args[3] ?? fixture.exclusions; fixture.latestSuitId = fixture.exclusions.latestSuitId ?? null;
                }});
                await editor.loadTaiwanSeerSettings();
            });
            await page.locator('#taiwan-exclusions-mintmark').fill('41001-41020 # 示範合作\n41308');
            await page.locator('#taiwan-latest-suit-id').fill('500');
            await page.locator('#taiwan-exclusions-suit').fill('300-310 # 示範合作');
            assert.match(await page.locator('[data-exclusions-summary="mintmark"]').textContent(), /2 筆/);
            await page.locator('#taiwan-exclusions-pet').fill('30-20');
            await page.locator('#save-taiwan-seer-settings-button').click();
            assert.equal(await page.evaluate(() => saves.length), 0);
            assert.equal(await page.locator('#taiwan-exclusions-pet').getAttribute('aria-invalid'), 'true');
            await page.locator('#taiwan-exclusions-pet').fill('20-30 # 示範合作');
            await page.locator('#save-taiwan-seer-settings-button').click();
            assert.equal(await page.evaluate(() => saves.length), 1);
            assert.equal(await page.evaluate(() => saves[0][3].mintmark), '41001-41020 # 示範合作\n41308');
            assert.equal(await page.evaluate(() => saves[0][3].latestSuitId), 500);
            assert.equal(await page.evaluate(() => saves[0][3].suit), '300-310 # 示範合作');
            await page.evaluate(() => editor.loadTaiwanSeerSettings());
            assert.equal(await page.locator('#taiwan-exclusions-pet').inputValue(), '20-30 # 示範合作');
            assert.equal(await page.locator('#taiwan-latest-suit-id').inputValue(), '500');
            assert.equal(await page.locator('#taiwan-exclusions-suit').inputValue(), '300-310 # 示範合作');
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow at ${width}`);
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({path: path.join(root, `tmp/taiwan-exclusions-${width}.png`), fullPage: true});
            if (width === 1440) await page.locator('#taiwan-exclusions-fields').screenshot({path: path.join(root, 'tmp/taiwan-exclusions-preview.png')});
            await page.evaluate(async () => {fixture.hasExclusionsField = false; await editor.loadTaiwanSeerSettings();});
            assert.equal(await page.locator('#taiwan-exclusions-pet').isDisabled(), true);
            assert.match(await page.locator('#taiwan-exclusions-schema').textContent(), /add_taiwan_exclusions.sql/);
            await page.locator('#save-taiwan-seer-settings-button').click();
            assert.equal(await page.evaluate(() => saves[1][3]), undefined, 'legacy save omits unavailable column');
            assert.deepEqual(errors, []);
            await page.close();
        }
        console.log('Taiwan exclusions: desktop/mobile form, range validation, save/reload, legacy schema and overflow checks passed (mock data; no database writes).');
    } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error); process.exitCode = 1;});
