const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', path.extname(file) === '.js' ? 'text/javascript' : 'text/css');
    res.end(fs.readFileSync(file));
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    let browser;
    try {
        browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        for (const width of [1280, 390, 320]) {
            const page = await browser.newPage({ viewport: { width, height: 800 } });
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(`http://127.0.0.1:${server.address().port}/css/style.css`);
            await page.setContent(`<link rel="stylesheet" href="/css/style.css"><main style="max-width:480px;padding:16px;margin:auto"><h2>選單檢查</h2><form><label for="sort">排序</label><select id="sort"><option value="new">編號新 → 舊</option><option value="old">編號舊 → 新</option><option value="name" disabled>名稱排序</option></select><div class="mint-series-combobox"><input id="series" aria-label="系列"><div class="mint-series-options" role="listbox" hidden></div><select hidden><option value="all">全部系列</option></select></div><button type="reset">重設</button></form><dialog><label>對話框排序<select id="dialog-sort"><option value="a">ID 由大到小</option><option value="b">能力總和</option></select></label></dialog></main>`);
            await page.evaluate(async () => {
                const { initSelectionPickers } = await import('/js/shared/selection-picker.js');
                const { createMintmarkSeriesSearch } = await import('/js/data/mintmark-series-search.js');
                window.series = createMintmarkSeriesSearch(document.querySelector('.mint-series-combobox'));
                window.series.setOptions([{ value: 'all', label: '全部系列' }, { value: '61', label: '英雄之證系列' }]);
                initSelectionPickers();
                window.changes = 0;
                document.querySelector('#sort').addEventListener('change', () => window.changes++);
            });
            const trigger = page.locator('#sort + button');
            await trigger.click();
            const menu = page.locator('.site-picker-options:popover-open');
            assert.equal(await menu.locator('button[disabled]').count(), 1);
            assert.equal(await page.evaluate(() => {
                const trigger = document.querySelector('#sort + button').getBoundingClientRect();
                const menu = document.querySelector('.site-picker-options:popover-open').getBoundingClientRect();
                return Math.abs(trigger.width - menu.width) <= 1 && menu.right <= innerWidth;
            }), true);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `selection-picker-${width}.png`) });
            await page.keyboard.press('ArrowDown');
            await page.keyboard.press('Enter');
            assert.equal(await page.locator('#sort').inputValue(), 'old');
            assert.equal(await page.evaluate(() => changes), 1);
            await page.evaluate(() => document.querySelector('#sort').value = 'new');
            assert.match(await trigger.textContent(), /新/);
            await trigger.click(); await page.keyboard.press('Escape');
            assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
            await page.locator('#series').click();
            await page.locator('#series').fill('英雄');
            assert.equal(await page.locator('#series').isEditable(), true);
            await page.locator('.mint-series-combobox [role="option"]').filter({ hasText: '英雄之證系列' }).click();
            assert.equal(await page.locator('.mint-series-combobox select').inputValue(), '61');
            await page.evaluate(() => series.setOptions([{ value: 'all', label: '全部系列' }, { value: '61', label: '已更新系列' }]));
            assert.equal(await page.locator('#series').inputValue(), '已更新系列');
            await page.evaluate(() => document.querySelector('#sort').disabled = true);
            await page.waitForFunction(() => document.querySelector('#sort + button').disabled);
            await page.evaluate(() => {
                document.querySelector('#sort').disabled = false;
                const select = document.createElement('select'); select.id = 'dynamic'; select.add(new Option('動態選單', '1'));
                document.querySelector('main').append(select);
            });
            await page.locator('#dynamic + button').waitFor();
            await page.evaluate(() => document.querySelector('dialog').showModal());
            await page.locator('#dialog-sort + button').click();
            await page.locator('.site-picker-options:popover-open [data-value="b"]').click();
            assert.equal(await page.locator('#dialog-sort').inputValue(), 'b');
            await page.keyboard.press('Escape');
            assert.equal(await page.evaluate(() => document.querySelector('dialog').open), false);
            await page.evaluate(async () => {
                const { initDamageCalculator } = await import('/js/damage/view.js');
                const source = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
                document.body.append(source.querySelector('#type-calc-modal'));
                const root = document.createElement('section'); root.id = 'damage-check';
                document.body.append(root); initDamageCalculator(root);
            });
            const damage = page.locator('#damage-check');
            await damage.locator('#damage-attack-tab').click();
            for (let i = 0; i < 3; i++) await damage.locator('[data-wizard-next]').click();
            const suit = damage.locator('[data-mode="attack"] [name="suit"] + button');
            assert.equal(await suit.isVisible(), true, await damage.evaluate(node => JSON.stringify({ step: node.querySelector('.damage-wizard-step.is-current')?.dataset.wizardStep, cardHidden: node.querySelector('[data-mode="attack"]').hidden, fields: [...node.querySelector('[data-mode="attack"]').querySelectorAll('[data-form-step]')].map(field => [field.dataset.formStep, field.hidden]) })));
            await suit.click();
            await page.locator('.site-picker-options:popover-open [data-value="silverFirst"]').click();
            assert.equal(await damage.locator('[data-mode="attack"] [name="suit"]').inputValue(), 'silverFirst');
            await damage.locator('[data-mode="attack"] [data-form-step="4"] [data-reset]').click();
            assert.equal(await damage.locator('[data-mode="attack"] [name="suit"]').inputValue(), 'none');
            assert.equal(await suit.textContent(), await damage.locator('[data-mode="attack"] [name="suit"] option:checked').textContent());
            await damage.locator('[data-wizard-next]').click();
            assert.ok(await damage.locator('[data-result-focus] tbody tr').count() > 0);
            await page.evaluate(async () => {
                const { initTrainingSelectors } = await import('/js/seer-training-selectors.js');
                window.trainingChoices = initTrainingSelectors(document.body, {
                    fetchJson: async () => ({ results: [{ id: 1, name: '測試套裝', bonus: { desc: '測試能力加成' } }], next: null }),
                    traditional: text => text, simplified: text => text, getPet: () => ({ id: 1, name: '測試精靈' }),
                    onSuit: () => {}, onSkin: () => {}, images: new Map()
                });
                trainingChoices.open('suit');
            });
            const choices = page.locator('.training-choice-dialog');
            const choiceSearch = choices.locator('.training-choice-filters input');
            await choices.locator('.site-picker-trigger').waitFor();
            assert.ok((await choiceSearch.boundingBox()).width >= 90, 'training suit picker must leave room for searching');
            await choiceSearch.fill('測試');
            await choices.locator('.site-picker-trigger').click();
            await page.locator('.site-picker-options:popover-open [data-value="bonus"]').click();
            assert.equal(await choiceSearch.inputValue(), '測試');
            assert.equal(await choices.evaluate(node => node.scrollWidth <= node.clientWidth), true);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `training-choice-picker-${width}.png`) });
            await page.keyboard.press('Escape');
            await page.evaluate(() => trainingChoices.open('skin'));
            await page.waitForFunction(() => document.querySelector('.training-choice-filters .site-picker-trigger').hidden);
            assert.ok((await choiceSearch.boundingBox()).width >= 180, 'hidden suit filter must release search width in skin mode');
            await page.keyboard.press('Escape');
            await page.evaluate(async () => {
                const source = new DOMParser().parseFromString(await (await fetch('/admin.html')).text(), 'text/html');
                const audit = document.createElement('section'); audit.id = 'compact-picker-check';
                audit.style.cssText = 'width:calc(100% - 40px);max-width:480px;margin:auto';
                for (const control of source.querySelectorAll('.pool-date-time-control')) {
                    audit.append(control);
                    const select = control.querySelector('select'); select.add(new Option('23:55', '23:55'));
                }
                const server = source.querySelector('.competitive-server-control'); audit.append(server);
                document.body.append(audit);
            });
            const compact = page.locator('#compact-picker-check');
            await compact.locator('.site-picker-trigger').first().waitFor();
            for (const row of await compact.locator('.pool-date-time-control').all()) {
                assert.ok((await row.locator('input').boundingBox()).width >= 90, 'admin time picker must preserve the date field');
                await row.locator('input').fill('2026-11-04');
                await row.locator('button').click();
                const menuBox = await page.locator('.site-picker-options:popover-open').boundingBox();
                assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= width + 1);
                await page.keyboard.press('Escape');
                assert.equal(await row.evaluate(node => node.scrollWidth <= node.clientWidth), true);
            }
            assert.equal(await compact.locator('.competitive-server-control').evaluate(node => node.scrollWidth <= node.clientWidth), true);
            await page.evaluate(async () => {
                const source = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
                for (const href of ['/css/player-lookup.css', '/css/player-lookup-dialog.css']) {
                    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
                    await new Promise(resolve => { link.onload = resolve; document.head.append(link); });
                }
                const dialog = source.querySelector('#player-lookup-dialog'); document.body.append(dialog);
                document.querySelector('#player-lookup-form').addEventListener('submit', event => {
                    event.preventDefault(); window.playerSubmission = Object.fromEntries(new FormData(event.target));
                });
                dialog.showModal();
            });
            const mimi = page.locator('#player-lookup-mimi-id');
            const region = page.locator('#player-lookup-region + button');
            await region.waitFor();
            assert.ok((await mimi.boundingBox()).width >= 90, 'region picker must leave room for the Mimi ID');
            await mimi.fill('20000001');
            await region.click();
            await page.locator('.site-picker-options:popover-open [data-value="cn"]').click();
            assert.equal(await mimi.inputValue(), '20000001', 'changing server preserves the typed ID');
            await mimi.press('Enter');
            assert.deepEqual(await page.evaluate(() => playerSubmission), { mimi_id: '20000001', region: 'cn' });
            assert.equal(await page.locator('#player-lookup-dialog').evaluate(node => node.scrollWidth <= node.clientWidth), true);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `player-picker-${width}.png`) });
            assert.deepEqual(errors, []);
            console.log(`${width}px passed: selection only, keyboard, same-width menu, disabled, dynamic options, restored values, dialog focus`);
            await page.close();
        }
    } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
