const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
    const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
    if (!fs.existsSync(target)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({ '.json': 'application/json', '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ico': 'image/x-icon', '.png': 'image/png', '.webp': 'image/webp' })[path.extname(target)] || 'application/octet-stream');
    res.end(fs.readFileSync(target));
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, ignoreHTTPSErrors: true, reducedMotion: 'reduce' });
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
        fs.mkdirSync(path.join(root, 'artifacts', 'home-search'), { recursive: true });
        await page.locator('.home-carousel img').first().evaluate(img => img.decode());
        await page.screenshot({ path: path.join(root, 'artifacts/home-search/desktop-home.png'), fullPage: true });
        const panelTop = await page.locator('.home-overview').evaluate(node => node.getBoundingClientRect().top);
        await page.locator('#home-search-open').click();
        await page.locator('#home-search-input').fill('譜尼');
        await page.locator('.home-search-submit').click();
        await page.waitForFunction(() => document.querySelector('#home-search-results').getAttribute('aria-busy') === 'false');
        assert.equal(await page.locator('#home-search-results a[href="?tab=pet&id=5000"]').count(), 1, 'live API returns the matching pet');
        assert.equal(await page.locator('#home-search-results a[href*="tab=skin"]').count() > 0, true, 'live API returns skins');
        fs.mkdirSync(path.join(root, 'artifacts', 'home-search'), { recursive: true });
        await page.locator('.home-carousel img').first().evaluate(img => img.decode());
        await page.screenshot({ path: path.join(root, 'artifacts/home-search/desktop.png'), fullPage: true });
        assert.equal(await page.locator('.home-overview').evaluate(node => node.getBoundingClientRect().top), panelTop, 'search results do not move the home panels');
        for (const width of [1440, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `no overflow at ${width}`);
            const boxes = await page.locator('#home-search-form').evaluate(form => [...form.children].map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }));
            assert.equal(boxes.every(box => box.x >= 0 && box.right <= width), true, 'search controls fit');
            assert.equal(await page.locator('#home-search-dialog').evaluate(node => node.scrollWidth <= node.clientWidth), true, 'dialog has no horizontal overflow');
            if (width === 390) await page.screenshot({ path: path.join(root, 'artifacts/home-search/mobile.png'), fullPage: true });
        }
        await page.setViewportSize({ width: 1440, height: 1100 });
        await page.locator('#home-search-clear').click();
        assert.equal(await page.locator('#home-search-results').isVisible(), false);
        await page.locator('#home-search-scope').selectOption('tools');
        await page.locator('#home-search-input').fill('傷害');
        await page.locator('.home-search-submit').click();
        await page.locator('#home-search-results button').getByText('傷害計算', { exact: true }).click();
        assert.equal(await page.locator('#damage-calculator-section').isVisible(), true);
        await page.locator('#home-search-open').click();
        assert.equal(await page.locator('#home-search-dialog').isVisible(), true, 'search opens from damage calculator');
        await page.locator('#home-search-scope').selectOption('pet');
        await page.locator('#home-search-input').fill('5000');
        await page.locator('.home-search-submit').click();
        await page.locator('#home-search-results a[href="?tab=pet&id=5000"]').waitFor();
        await page.locator('#home-search-results a[href="?tab=pet&id=5000"]').click();
        await page.waitForURL('**/index.html?tab=pet&id=5000');
        await page.locator('#seer-lookup-section').waitFor({ state: 'visible' });
        await page.locator('#home-search-open').click();
        assert.equal(await page.locator('#home-search-dialog').isVisible(), true, 'search opens from pet encyclopedia');
        await page.locator('#home-search-scope').selectOption('pet');
        // Controlled failures and out-of-order completion must not overwrite a newer query.
        await page.route('https://api.seerapi.com/v1/pet?**', async route => {
            const query = new URL(route.request().url()).searchParams.get('name');
            if (query === 'failure') return route.fulfill({ status: 503, body: '{}' });
            if (query === 'slow') await new Promise(resolve => setTimeout(resolve, 600));
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ results: query === 'empty' ? [] : [{ id: 300, name: query }], next: null }) });
        });
        for (const [query, expected] of [['empty', '找不到符合'], ['failure', '暫時無法查詢']]) {
            await page.locator('#home-search-input').fill(query);
            await page.locator('.home-search-submit').click();
            await page.waitForFunction(text => document.querySelector('#home-search-status').textContent.includes(text), expected);
        }
        await page.locator('#home-search-input').fill('slow');
        await page.locator('.home-search-submit').click();
        await page.locator('#home-search-input').fill('new');
        await page.locator('.home-search-submit').click();
        await page.locator('#home-search-results a').getByText('new', { exact: true }).waitFor();
        await page.waitForTimeout(700);
        assert.equal(await page.locator('#home-search-results a').getByText('slow', { exact: true }).count(), 0);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#home-search-dialog').isVisible(), false);
        await page.waitForFunction(() => document.activeElement.id === 'home-search-open');
        await page.locator('[data-main-target="about"]').click();
        await page.locator('#home-search-open').click();
        assert.equal(await page.locator('#home-search-dialog').isVisible(), true, 'search opens from about page');
        await page.keyboard.press('Escape');
        await page.locator('.logo').click();
        for (const width of [1440, 1024, 800, 761, 760, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            assert.equal(await page.locator('#home-search-open').isVisible(), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `header fits at ${width}`);
            assert.equal(await page.locator('.header-inner').evaluate(node => {
                const boxes = [...node.children].filter(el => el.getBoundingClientRect().width).map(el => el.getBoundingClientRect());
                return boxes.every((a, i) => boxes.every((b, j) => i === j || a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1));
            }), true, `header controls do not overlap at ${width}`);
            if (width <= 760) {
                const columns = () => page.locator('.primary-main-tabs').evaluate(nav => [...nav.children].filter(el => !el.hidden).map(el => {
                    const rect = el.getBoundingClientRect(); return { width: rect.width, top: rect.top };
                }));
                for (const admin of [false, true]) {
                    await page.locator('#admin-tools').evaluate((node, visible) => { node.hidden = !visible; }, admin);
                    const cells = await columns();
                    assert.equal(cells.length, admin ? 5 : 4);
                    assert.equal(cells.every(cell => Math.abs(cell.width - cells[0].width) < 1 && Math.abs(cell.top - cells[0].top) < 1), true, `equal navigation columns at ${width}, admin=${admin}`);
                }
                await page.locator('#admin-tools').evaluate(node => { node.hidden = true; });
                for (const menu of ['encyclopedia-nav', 'tools-nav']) {
                    await page.locator(`#${menu} > summary`).click();
                    const menuBox = await page.locator(`#${menu} .admin-nav-menu`).boundingBox();
                    assert.equal(menuBox.x >= 0 && menuBox.x + menuBox.width <= width, true, 'dropdown stays on screen');
                    await page.keyboard.press('Escape');
                }
                await page.locator('#home-search-open').click();
                assert.equal(await page.locator('#home-search-dialog').isVisible(), true);
                await page.keyboard.press('Escape');
            }
            if (width === 390) {
                await page.setViewportSize({ width, height: 844 });
                await page.mouse.move(0, 500);
                await page.locator('.logo').focus();
                await page.locator('.logo').evaluate(node => node.blur());
                await page.screenshot({ path: path.join(root, 'artifacts/home-search/mobile-home.png'), fullPage: true });
                await page.screenshot({ path: path.join(root, 'artifacts/home-search/mobile-navigation.png') });
            }
        }
        assert.deepEqual(errors, []);
        console.log('PASS: live API, grouped results, numeric lookup, tool routing, clear, empty/error states, stale requests and 1440/390/320px layout.');
    } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
