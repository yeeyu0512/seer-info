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
        const selectScope = async value => {
            await page.locator('#home-search-scope-trigger').click();
            await page.locator(`#home-search-scope-options [data-value="${value}"]`).click();
        };
        await page.goto(base + '/index.html', { waitUntil: 'networkidle' });
        await page.locator('#open-changelog-button').click();
        const latestLog = page.locator('#changelog-full-list > li').first();
        const nestedList = latestLog.locator(':scope > div > .changelog-details');
        const expectedLog = JSON.parse(fs.readFileSync(path.join(root, 'data/changelog.json'), 'utf8')).entries[0];
        const expectedGroups = expectedLog.details.filter(item => typeof item === 'object');
        assert.equal(await nestedList.locator(':scope > li').count(), expectedGroups.length);
        assert.deepEqual(await nestedList.locator(':scope > li > .changelog-group-label').allTextContents(), expectedGroups.map(group => group.text));
        assert.equal(await nestedList.locator(':scope > li > ul > li').count(), expectedGroups.reduce((count, group) => count + group.details.length, 0));
        assert.equal(await latestLog.locator('h4').count(), 0, 'categories are bullet items, not headings');
        assert.equal(await page.locator('#changelog-full-list > li').nth(1).locator('.changelog-details > li').count() > 0, true, 'legacy flat entries still render');
        for (const width of [1440, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            assert.equal(await page.locator('#changelog-dialog').evaluate(node => node.scrollWidth <= node.clientWidth), true, 'nested bullets fit the viewport');
        }
        await page.locator('#close-changelog-button').click();
        await page.setViewportSize({ width: 1440, height: 1100 });
        for (const [opener, modal, field, close] of [
            ['#home-search-open', '#home-search-dialog', '#home-search-input', '#home-search-close'],
            ['#open-player-lookup', '#player-lookup-dialog', '#player-lookup-mimi-id', '#close-player-lookup']
        ]) {
            await page.locator(opener).click();
            await page.locator(field).fill('20000001234567');
            const inputBox = await page.locator(field).boundingBox();
            const dialogBox = await page.locator(modal).boundingBox();
            const outside = { x: dialogBox.x + dialogBox.width + 12, y: inputBox.y + inputBox.height / 2 };
            await page.mouse.move(inputBox.x + 12, outside.y);
            await page.mouse.down();
            await page.mouse.move(outside.x, outside.y, { steps: 12 });
            await page.mouse.up();
            assert.equal(await page.locator(modal).isVisible(), true, `${modal}: dragging a text selection outside must not close the dialog`);
            assert.equal(await page.locator(field).evaluate(input => input.selectionEnd > input.selectionStart), true, 'text was selected');
            await page.mouse.click(outside.x, outside.y);
            await page.locator(modal).waitFor({ state: 'hidden' });
            await page.locator(opener).click();
            await page.locator(close).click();
            await page.locator(modal).waitFor({ state: 'hidden' });
            await page.locator(opener).click();
            await page.keyboard.press('Escape');
            await page.locator(modal).waitFor({ state: 'hidden' });
        }
        let playerResponse;
        const playerApi = '**/api/tw/player/query';
        await page.route(playerApi, route => route.fulfill({ contentType: 'application/json', body: JSON.stringify(playerResponse) }));
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.locator('#open-player-lookup').click();
            for (const [online, lastLogin, expected] of [
                [false, 1704067200, '最後登入：2024/01/01 08:00:00（台灣時間）'],
                [false, undefined, '最後登入：未知'],
                [true, 1704067200, ''],
                [false, 1704067200, '最後登入：2024/01/01 08:00:00（台灣時間）']
            ]) {
                playerResponse = { user_id: 123, nickname: '測試玩家', online, last_login_time: lastLogin,
                    server: online ? 1707 : null, sport: {}, wild: {}, pets: { primary: [], secondary: [] } };
                await page.locator('#player-lookup-mimi-id').fill('123');
                const response = page.waitForResponse(r => r.url().endsWith('/api/tw/player/query'));
                await page.locator('#lookup-submit').click();
                await response;
                await page.waitForFunction(text => document.querySelector('#player-last-login').textContent === text, expected);
                assert.equal(await page.locator('#player-last-login').isVisible(), !online);
                assert.equal(await page.locator('#player-server').isVisible(), online);
                assert.equal(await page.locator('#player-lookup-dialog').evaluate(node => node.scrollWidth <= node.clientWidth), true);
            }
            await page.locator('#close-player-lookup').click();
        }
        await page.unroute(playerApi);
        await page.setViewportSize({ width: 1440, height: 1100 });
        fs.mkdirSync(path.join(root, 'artifacts', 'home-search'), { recursive: true });
        await page.locator('#home-search-open').click();
        await page.locator('#home-search-input').fill('競技池');
        await selectScope('suit');
        await page.locator('.home-search-empty strong').getByText('找不到「競技池」的套裝結果', { exact: true }).waitFor();
        await page.screenshot({ path: path.join(root, 'artifacts/home-search/empty-results.png') });
        await page.locator('#home-search-scope-trigger').click();
        assert.equal(await page.locator('#home-search-scope-options').isVisible(), true);
        await page.screenshot({ path: path.join(root, 'artifacts/home-search/category-menu.png') });
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#home-search-dialog').isVisible(), true, 'Escape closes category menu first');
        await page.locator('.home-search-empty button').getByText('搜尋全部分類', { exact: true }).click();
        await page.locator('#home-search-results button').getByText('競技池', { exact: true }).waitFor();
        await page.waitForFunction(() => document.querySelector('#home-search-results').getAttribute('aria-busy') === 'false');
        assert.equal(await page.locator('.home-search-empty').count(), 0);
        await page.locator('#home-search-scope-trigger').press('ArrowDown');
        await page.keyboard.press('End');
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#home-search-scope').inputValue(), 'tools');
        await page.locator('#home-search-clear').click();
        await selectScope('all');
        await page.locator('#home-search-close').click();

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
        await selectScope('tools');
        await page.locator('#home-search-input').fill('傷害');
        await page.locator('.home-search-submit').click();
        await page.locator('#home-search-results button').getByText('傷害計算', { exact: true }).click();
        assert.equal(await page.locator('#damage-calculator-section').isVisible(), true);
        await page.locator('#home-search-open').click();
        assert.equal(await page.locator('#home-search-dialog').isVisible(), true, 'search opens from damage calculator');
        await selectScope('pet');
        await page.locator('#home-search-input').fill('5000');
        await page.locator('.home-search-submit').click();
        await page.locator('#home-search-results a[href="?tab=pet&id=5000"]').waitFor();
        await page.locator('#home-search-results a[href="?tab=pet&id=5000"]').click();
        await page.waitForURL('**/index.html?tab=pet&id=5000');
        await page.locator('#seer-lookup-section').waitFor({ state: 'visible' });
        await page.locator('#home-search-open').click();
        assert.equal(await page.locator('#home-search-dialog').isVisible(), true, 'search opens from pet encyclopedia');
        await selectScope('pet');
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
                await page.locator('#home-search-scope-trigger').click();
                const optionsBox = await page.locator('#home-search-scope-options').boundingBox();
                assert.equal(optionsBox.x >= 0 && optionsBox.x + optionsBox.width <= width && optionsBox.y >= 0 && optionsBox.y + optionsBox.height <= 1000, true, 'category popover fits the mobile viewport');
                await page.keyboard.press('Escape');
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
