// Run with PLAYWRIGHT_MODULE pointing to an existing installation if needed.
// External services are stubbed: this verifies the local site and calculator only.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    const relative = path.relative(root, file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) {
        res.writeHead(403).end(); return;
    }
    fs.readFile(file, (error, data) => {
        if (error) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
    });
});

(async () => {
    let browser;
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    fs.mkdirSync(path.join(root, 'artifacts'), { recursive: true });
    try {
        browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        for (const width of [1440, 390, 320]) {
            const context = await browser.newContext({ viewport: { width, height: 1000 } });
            await context.route('**/*', route => {
                const url = route.request().url();
                if (url.startsWith(base)) return route.continue();
                if (url.includes('opencc-js')) return route.fulfill({ contentType: 'text/javascript', body: 'export const Converter = () => value => value;' });
                if (url.includes('@supabase/supabase-js')) return route.fulfill({ contentType: 'text/javascript', body: "window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}},from(){const result=Promise.resolve({data:[],error:null});const q=new Proxy({}, {get(t,k){return k==='then'?result.then.bind(result):()=>q;}});return q;}}}};" });
                if (url.includes('api.seerapi.com')) return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ count: 0, next: null, results: [] }) });
                return route.abort();
            });
            const page = await context.newPage(), errors = [];
            page.setDefaultTimeout(10000);
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
            await page.locator('#tools-nav summary').click();
            assert.equal(await page.locator('#tools-nav [data-main-target]').first().textContent(), '競技池');
            await page.locator('[data-main-target="damage"]').click();
            const rootNode = page.locator('#damage-calculator-section');
            await rootNode.waitFor({ state: 'visible' });
            const attack = rootNode.locator('[data-mode="attack"]');
            const defense = rootNode.locator('[data-mode="defense"]');
            await page.locator('#damage-attack-tab').click();
            assert.equal(new URL(page.url()).searchParams.get('tab'), 'damage');
            assert.equal(await page.locator('#tools-nav').getAttribute('open'), null);
            assert.equal(await page.locator('#tools-nav summary').getAttribute('aria-selected'), 'true');
            assert.equal(await rootNode.locator('[name="hits"]').count(), 0);
            assert.equal(await rootNode.locator('[name="model"]').count(), 0);
            assert.match(await attack.locator('tbody tr').first().textContent(), /295～347/);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.screenshot({ path: 'artifacts/damage-simple-' + width + '.png', fullPage: true });

            await attack.locator('[name="hp"]').fill('295');
            await attack.locator('button[type="submit"]').click();
            assert.match(await attack.locator('tbody tr').first().textContent(), /可擊殺/);
            await attack.locator('[data-filter]').check();
            assert.equal(await attack.locator('tbody tr').count(), 21);
            await attack.locator('[name="suit"]').selectOption('silverFirst');
            await attack.locator('[name="stage"]').check();
            await attack.locator('[name="purple"]').check();
            await attack.locator('button[type="submit"]').click();
            assert.doesNotMatch(await attack.locator('tbody tr').first().textContent(), /295～347/);
            await attack.locator('[data-reset]').click();
            assert.equal(await attack.locator('[name="suit"]').inputValue(), 'none');
            assert.equal(await attack.locator('[name="purple"]').isChecked(), false);
            assert.match(await attack.locator('tbody tr').first().textContent(), /295～347/);

            await page.locator('#damage-defense-tab').click();
            await defense.locator('[name="from"]').fill('0');
            await defense.locator('button[type="submit"]').click();
            assert.equal(await defense.locator('[name="from"]').evaluate(node => node.validity.valid), false);
            assert.equal(await defense.locator('[data-result]').isVisible(), false);
            await defense.locator('[data-reset]').click();
            await defense.locator('[name="soulReduction"]').fill('100');
            await defense.locator('button[type="submit"]').click();
            assert.match(await defense.locator('tbody tr').first().textContent(), /0～0/);
            await defense.locator('[name="hp"]').fill('');
            await defense.locator('button[type="submit"]').click();
            assert.match(await defense.locator('.damage-summary').textContent(), /填入我方體力/);
            await defense.locator('[data-reset]').click();

            await page.locator('#damage-attack-tab').click();
            await rootNode.locator('[data-player-type]').click();
            await page.locator('.damage-type-dialog [data-base-type="地面"]').click();
            await page.locator('#damage-type-modal-options').getByRole('button', { name: '地面', exact: true }).click();
            await rootNode.locator('[data-boss-type]').click();
            await page.locator('.damage-type-dialog [data-base-type="飛行"]').click();
            await page.locator('#damage-type-modal-options').getByRole('button', { name: '飛行', exact: true }).click();
            assert.equal(await attack.locator('[name="effectiveness"]').inputValue(), '0');
            assert.equal(await defense.locator('[name="effectiveness"]').inputValue(), '1');
            assert.match(await attack.locator('tbody tr').first().textContent(), /0～0/);
            await attack.locator('[name="to"]').fill('1200');
            await attack.locator('button[type="submit"]').click();
            assert.match(await attack.locator('[data-error]').textContent(), /跨度最多 500/);
            await attack.locator('[data-reset]').click();
            assert.match(await attack.locator('tbody tr').first().textContent(), /295～347/);

            await attack.locator('[name="fixed"]').fill('123');
            await attack.locator('button[type="submit"]').click();
            await page.reload({ waitUntil: 'networkidle' });
            await page.locator('#damage-attack-tab').click();
            assert.equal(await attack.locator('[name="fixed"]').inputValue(), '123');
            assert.equal(await rootNode.isVisible(), true);
            await attack.locator('[data-reset]').click();
            await page.locator('[data-main-target="home"]').click();
            assert.equal(await rootNode.isVisible(), false);
            await page.goBack({ waitUntil: 'networkidle' });
            assert.equal(await rootNode.isVisible(), true);
            await page.locator('#tools-nav summary').click();
            await page.locator('#tools-nav summary').press('Escape');
            assert.equal(await page.locator('#tools-nav').getAttribute('open'), null);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assert.deepEqual(errors, []);
            console.log('PASS ' + width + 'px: public menu, direct route/history, reference results, effects, exact kill, zero defense, full reduction, type core, filtering, persistence and reset; no page errors or horizontal overflow.');
            await context.close();
        }
    } finally {
        if (browser) await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => { console.error(error); process.exitCode = 1; });

