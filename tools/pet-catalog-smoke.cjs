const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const pet = id => ({ id, name: `測試精靈 ${id}`, type: { id: id === 27 ? 2 : id === 28 ? 3 : 1 }, base_stats: { hp: 140, atk: 100, def: 100, sp_atk: 130, sp_def: 100, spd: 100, total: 670 }, skill: [{ id: 1, learning_level: 1 }], soulmark: [{ id: 1 }] });
const pets = Array.from({ length: 28 }, (_, i) => pet(i + 1));
const skins = Array.from({ length: 24 }, (_, i) => ({ id:817+i, name:`測試皮膚 ${817+i}`, resource_id:1400817+i, pet:{id:1}, category:{id:i%2} }));
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' })[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
        const widths = process.env.PET_SMOKE_WIDTHS ? process.env.PET_SMOKE_WIDTHS.split(',').map(Number) : [1440, 1024, 390, 320];
        for (const width of widths) {
            const apiRequests = [];
            const context = await browser.newContext({ viewport: { width, height: width > 900 ? 640 : width < 350 ? 740 : 844 }, reducedMotion: 'reduce' });
            await context.route('**/*', async route => {
                const url = new URL(route.request().url());
                if (url.origin === base) return route.continue();
                if (url.href.includes('opencc-js')) return route.fulfill({ contentType: 'text/javascript', body: 'export const Converter = () => value => value;' });
                if (url.href.includes('@supabase/supabase-js')) return route.fulfill({ contentType: 'text/javascript', body: `window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}},from(table){const result={data:table==='seer_server_settings'?{latest_pet_id:8,latest_skin_id:840}:[],error:null};const q=new Proxy({}, {get(t,k){return k==='then'?Promise.resolve(result).then.bind(Promise.resolve(result)):()=>q;}});return q;}}}};` });
                if (url.hostname === 'api.seerapi.com') {
                    apiRequests.push(url);
                    const [, resource, id] = url.pathname.split('/').slice(1);
                    const combinations = [{ id: 1, name: '草', is_double: false }, { id: 2, name: '火', is_double: false }, { id: 3, name: '草火', is_double: true }];
                    const records = {
                        pet: pets, element_type_combination: combinations, element_type: combinations,
                        skill: [{ id: 1, name: '測試技能', power: 150, max_pp: 5, type: { id: 1 }, category: { id: 1 }, skill_effect: [{ info: '測試效果。'.repeat(40) }] }],
                        soulmark: [{ id: 1, desc: '回合開始時觸發測試效果。|受到攻擊時判定附加效果。' }],
                        pet_skin: skins,
                        pet_skin_category: [{ id: 0, name: '普通' }, { id: 1, name: '限定' }]
                    };
                    const list = (records[resource] || []).filter(item => resource !== 'pet' || !url.searchParams.has('name') || item.name.includes(url.searchParams.get('name')));
                    const data = id ? resource === 'pet' ? pet(Number(id)) : list.find(x => String(x.id) === id) || {}
                        : { count: list.length, next: null, results: list.slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + Number(url.searchParams.get('limit') || 500)) };
                    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
                }
                if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><ellipse cx="80" cy="125" rx="55" ry="85" fill="#9da9ef"/></svg>' });
                return route.abort();
            });
            const page = await context.newPage(), errors = [];
            page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
            const lookup = page.locator('#seer-lookup-section'), results = page.locator('#seer-lookup-results .seer-lookup-result');
            const modal = page.locator('#seer-pet-info-modal');
            const closeInfo = async () => { await page.keyboard.press('Escape'); await modal.waitFor({ state: 'hidden' }); };
            const openCatalog = async () => { await page.locator('#encyclopedia-nav summary').click(); await page.locator('#encyclopedia-nav [data-lookup-mode="pet"]').click(); };
            const chooseTypeCategory = async category => {
                await page.locator('#seer-pet-type-open-modal').click();
                await page.locator(`#seer-pet-type-modal [data-pet-type-category="${category}"]`).click();
                await page.locator('#seer-pet-type-modal').waitFor({ state: 'hidden' });
            };
            const chooseGrass = async () => {
                await page.locator('#seer-pet-type-open-modal').click();
                await page.locator('#seer-pet-type-search').fill('草');
                await page.locator('#seer-pet-type-options [data-pet-type-id="1"]').click();
                await page.locator('#seer-pet-type-modal').waitFor({ state: 'hidden' });
            };
            await page.goto(`${base}/index.html?tab=pet`, { waitUntil: 'networkidle' });
            await results.first().waitFor();
            if (width <= 900) {
                assert.equal(await page.evaluate(() => {
                    const attribute = document.querySelector('.seer-pet-attribute-control').getBoundingClientRect();
                    const sort = document.querySelector('#seer-pet-sort-trigger').getBoundingClientRect();
                    return Math.abs(attribute.top - sort.top) <= 1;
                }), true, 'mobile attribute and order controls share one compact row');
                await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-mobile-list-${width}.png`) });
            }
            if (width > 900) {
                const desktopLayout = await page.evaluate(() => {
                    const box = selector => document.querySelector(selector).getBoundingClientRect();
                    return {
                        toolbarAligned: Math.abs(box('#seer-pet-type-filter').top - box('#seer-lookup-id').top) <= 2
                            && Math.abs(box('#seer-pet-sort-trigger').top - box('#seer-lookup-id').top) <= 2,
                        compactGaps: box('#seer-pet-type-filter').left - box('#seer-lookup-id').right <= 12
                            && box('#seer-pet-sort-trigger').left - box('#seer-pet-type-filter').right <= 12,
                        consistentHeight: Math.abs(box('#seer-pet-sort-trigger').height - box('#seer-lookup-id').height) <= 1,
                        searchGap: box('#seer-pet-type-filter').left - box('#seer-lookup-id').right,
                        sortGap: box('#seer-pet-sort-trigger').left - box('#seer-pet-type-filter').right,
                        resultsOffset: box('#seer-lookup-results').top - box('#seer-lookup-section').top
                    };
                });
                assert.equal(desktopLayout.toolbarAligned, true, `desktop search and attribute controls share one row: ${JSON.stringify(desktopLayout)}`);
                assert.equal(desktopLayout.compactGaps, true, `search, attribute and sort controls stay grouped without large gaps: ${JSON.stringify(desktopLayout)}`);
                assert.equal(desktopLayout.consistentHeight, true, 'toolbar controls share the same height');
                assert(desktopLayout.resultsOffset < 210, `desktop results stay within the heading and toolbar area (${desktopLayout.resultsOffset}px)`);
            }
            await results.first().click();
            await page.locator('#seer-lookup-preview:not([hidden])').waitFor();
            const selectedName = await page.locator('#seer-lookup-name').textContent();
            if (width <= 900) {
                assert.equal(await page.locator('#seer-pet-back-to-results').textContent(), '‹ 返回清單');
                assert.equal(await page.locator('#seer-pet-back-to-results').evaluate(node => {
                    const style = getComputedStyle(node);
                    return style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.borderTopWidth === '0px' && node.getBoundingClientRect().height >= 44;
                }), true, 'mobile back navigation uses a quiet text treatment with a usable touch target');
                assert.equal(await page.evaluate(() => {
                    const info = document.querySelector('#seer-pet-info-toggle').getBoundingClientRect();
                    const skins = document.querySelector('#seer-lookup-pet-skins').getBoundingClientRect();
                    const art = document.querySelector('.seer-lookup-illustration-stage').getBoundingClientRect();
                    const header = document.querySelector('.site-header').getBoundingClientRect();
                    return info.top >= header.bottom && info.bottom <= innerHeight && skins.bottom <= innerHeight
                        && info.bottom <= art.top && Math.abs(info.top - skins.top) <= 1;
                }), true, 'mobile info and skin actions appear together above artwork and within the viewport after selection');
                await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-mobile-preview-${width}.png`) });
            }
            assert.match(await page.locator('#seer-lookup-message').textContent(), /共 28 隻精靈.*已顯示 20 隻/);
            await page.locator('#seer-pet-sort-trigger').click(); await page.locator('#seer-pet-sort-options [data-value="id-asc"]').click();
            assert.match(await results.first().textContent(), /#1$/);
            assert.equal(await page.locator('#seer-lookup-name').textContent(), selectedName, 'sorting preserves the selected pet preview');
            if (width <= 900) await page.locator('#seer-pet-back-to-results').click();
            await page.locator('#seer-lookup-results .seer-lookup-browse-sentinel').click();
            assert.equal(await results.count(), 28);
            assert.match(await results.last().textContent(), /#28$/);
            await page.locator('#seer-pet-sort-trigger').click(); await page.locator('#seer-pet-sort-options [data-value="name"]').click();
            assert.match(await results.first().textContent(), /#1$/);
            await page.locator('#seer-pet-sort-trigger').click(); await page.locator('#seer-pet-sort-options [data-value="id-desc"]').click();
            assert.match(await results.first().textContent(), /#28$/);
            assert.equal(await results.first().getAttribute('aria-pressed'), 'true');
            if (width <= 900) { await results.first().click(); await page.locator('#seer-lookup-preview:not([hidden])').waitFor(); }
            if (width > 900) {
                await page.evaluate(() => window.scrollTo(0, 0));
                assert.equal(await page.evaluate(() => {
                    const info = document.querySelector('#seer-pet-info-toggle').getBoundingClientRect();
                    const skinNode = document.querySelector('#seer-lookup-pet-skins');
                    const skin = skinNode.getBoundingClientRect();
                    const name = document.querySelector('#seer-lookup-name').getBoundingClientRect();
                    const art = document.querySelector('.seer-lookup-illustration-stage').getBoundingClientRect();
                    return info.top >= 0 && info.bottom <= innerHeight && info.top <= name.bottom && info.bottom <= art.top
                        && skin.bottom <= art.top && Math.abs(skin.top - info.top) <= 1 && Math.abs(skin.width - info.width) <= 1
                        && skin.left - info.right <= 10
                        && getComputedStyle(skinNode).backgroundColor === getComputedStyle(document.querySelector('#seer-pet-info-toggle')).backgroundColor;
                }), true, 'both equally styled actions stay together beside the name and visible without scrolling in a 640px-high desktop viewport');
            }
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-preview-${width}.png`), fullPage: true });
            assert.equal(await results.first().getAttribute('aria-pressed'), 'true');
            assert.equal(await page.locator('#seer-lookup-preview').evaluate(node => node.parentElement.id), 'seer-lookup-illustration');
            await page.locator('#seer-pet-info-toggle').click();
            await page.locator('.seer-pet-info-section-nav').waitFor();
            assert.equal(await page.locator('#seer-pet-info-title').textContent(), selectedName);
            await page.locator('.seer-pet-info-section-nav button').getByText('技能', { exact: true }).click();
            assert.equal(await page.locator('#seer-pet-info').evaluate(node => node.scrollHeight <= node.clientHeight || node.scrollTop > 0), true);
            await closeInfo();
            assert.equal(await page.locator('#seer-pet-info-toggle').evaluate(node => node === document.activeElement), true);
            if (width > 900) await page.locator('#seer-lookup-results').evaluate(node => { node.scrollTop = 120; });
            await page.locator('[data-main-target="home"]').click();
            const homePet = page.locator('[data-home-pet-id]').first();
            const homeId = await homePet.getAttribute('data-home-pet-id');
            await homePet.click();
            await page.waitForFunction(id => document.querySelector('#seer-pet-info-title').textContent === `測試精靈 ${id}`, homeId);
            await page.locator('#seer-pet-info-skins').click();
            await page.locator('#seer-related-skins-modal:not([hidden])').waitFor();
            await page.keyboard.press('Escape');
            await page.locator('#seer-related-skins-modal').waitFor({ state: 'hidden' });
            await closeInfo();
            await openCatalog();
            assert.equal(await page.locator('#seer-lookup-name').textContent(), selectedName, 'external info preserves the catalog pet');
            assert.equal(await results.first().getAttribute('aria-pressed'), 'true');
            if (width > 900) assert.equal(await page.locator('#seer-lookup-results').evaluate(node => node.scrollTop), 120, 'external info preserves the catalog scroll position');
            await page.locator('#seer-pet-info-toggle').click();
            await page.waitForFunction(name => document.querySelector('#seer-pet-info-title').textContent === name, selectedName);
            await closeInfo();
            if (width <= 900) {
                assert.equal(await page.locator('#seer-lookup-results').isVisible(), false);
                await page.locator('#seer-pet-back-to-results').click();
                assert.equal(await page.locator('#seer-lookup-results').isVisible(), true);
            }
            await page.locator('#seer-lookup-id').fill('1');
            await page.locator('#seer-lookup-id').press('Enter');
            await page.waitForFunction(() => document.querySelector('#seer-lookup-id-result').textContent === '#1' && !document.querySelector('#seer-lookup-preview').hidden);
            assert.equal(await lookup.getAttribute('data-pet-presentation'), 'direct');
            assert.equal(await page.locator('#seer-pet-sort-label').isVisible(), false, 'direct ID lookup does not show meaningless sorting');
            if (width > 900) {
                await page.evaluate(() => window.scrollTo(0, 0));
                assert.equal(await page.locator('#seer-pet-info-toggle').evaluate(node => node.getBoundingClientRect().bottom <= innerHeight), true, 'direct ID lookup info action also stays visible without scrolling');
            }
            assert.equal(await page.locator('#seer-lookup-results').isVisible(), false);
            if (width > 900) {
                assert.equal(await page.evaluate(() => {
                    const page = document.querySelector('#seer-lookup-section').getBoundingClientRect();
                    const preview = document.querySelector('#seer-lookup-illustration').getBoundingClientRect();
                    return preview.width >= page.width * .9;
                }), true, 'ID lookup uses the full result area instead of reserving an empty list column');
                const actionsTogether = await page.locator('.seer-lookup-preview-actions button:visible').evaluateAll(buttons => {
                    const first = buttons[0].getBoundingClientRect(), second = buttons[1].getBoundingClientRect();
                    return Math.abs(first.top - second.top) <= 1 && second.left - first.right <= 14;
                });
                assert.equal(actionsTogether, true, 'ID lookup actions stay grouped beside the pet identity');
                assert.equal(await page.evaluate(() => {
                    const art = document.querySelector('.seer-lookup-illustration-stage').getBoundingClientRect();
                    const name = document.querySelector('#seer-lookup-name').getBoundingClientRect();
                    const actions = document.querySelector('.seer-lookup-preview-actions').getBoundingClientRect();
                    return art.left < name.left && Math.abs((name.top + actions.bottom) / 2 - (art.top + art.bottom) / 2) <= 24;
                }), true, 'ID lookup keeps its identity and actions vertically centered beside the artwork');
            }
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-id-lookup-${width}.png`), fullPage: true });
            await page.locator('[data-main-target="home"]').click();
            await homePet.click();
            await modal.waitFor();await closeInfo();await openCatalog();
            assert.equal(await page.locator('#seer-lookup-id').inputValue(), '1');
            assert.equal(await page.locator('#seer-lookup-id-result').textContent(), '#1');
            if (width <= 900) await page.locator('#seer-pet-back-to-results').click();
            else await page.locator('#seer-pet-browse-latest').click();
            assert.equal(await page.locator('#seer-lookup-id').inputValue(), '');
            await results.first().waitFor();
            assert.equal(await lookup.getAttribute('data-pet-presentation'), 'browse');
            assert.equal(await page.locator('[data-pet-search-method]').count(), 0);
            await chooseGrass();
            await results.first().waitFor();
            assert.equal(await results.count(), 20);
            assert.equal(await lookup.getAttribute('data-pet-presentation'), 'browse');
            await results.first().click();
            await page.locator('#seer-lookup-preview:not([hidden])').waitFor();
            if (width <= 900) await page.locator('#seer-pet-back-to-results').click();
            await page.locator('#seer-lookup-results .seer-lookup-browse-sentinel').click();
            assert.equal(await results.count(), 26, 'selecting a type result preserves pagination');
            await page.locator('#seer-lookup-id').fill('測試精靈 2');
            await page.locator('#seer-lookup-id').press('Enter');
            await page.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 8);
            await chooseTypeCategory('double');
            assert.equal(await page.locator('#seer-lookup-id').inputValue(), '測試精靈 2', 'attribute changes retain the search text');
            await page.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 1);
            assert.match(await results.first().textContent(), /28/);
            await chooseTypeCategory('all');
            await page.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 10);
            await chooseGrass();
            await page.locator('#seer-lookup-id').fill('27');await page.locator('#seer-lookup-id').press('Enter');
            await page.waitForFunction(() => document.querySelector('#seer-lookup-message').textContent.includes('不符合目前的屬性篩選'));
            assert.equal(await page.locator('#seer-lookup-preview').isVisible(), false);
            await page.locator('#seer-pet-clear-type').click();
            assert.equal(await page.locator('#seer-lookup-id').inputValue(), '27');
            await page.waitForFunction(() => document.querySelector('#seer-lookup-id-result').textContent === '#27' && !document.querySelector('#seer-lookup-preview').hidden);
            await page.locator('#seer-lookup-id').fill('');await results.first().waitFor();await chooseGrass();
            await results.first().waitFor();
            await page.locator('#seer-taiwan-progress-only').check();
            await page.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 8);
            await page.locator('#seer-pet-clear-type').click();
            assert.equal(await page.locator('#seer-taiwan-progress-only').isChecked(), true, 'clearing attributes preserves Taiwan progress');
            assert.equal(await page.locator('#seer-lookup-id').inputValue(), '');
            assert.equal(await page.locator('#seer-pet-clear-type').isVisible(), false, 'clear cross disappears when no attribute condition remains');
            assert.equal(await page.locator('#seer-pet-type-current-name').textContent(), '全部屬性');
            await page.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 8);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            assert.equal(await page.locator('#seer-lookup-results').evaluate(node => node.scrollWidth <= node.clientWidth), true);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-catalog-${width}.png`), fullPage: true });
            await results.first().click();await page.locator('#seer-pet-info-toggle').click();await page.locator('.seer-pet-info-section-nav').waitFor();
            assert.equal(await page.locator('.seer-pet-info-dialog').evaluate(node => node.scrollWidth <= node.clientWidth), true);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-info-${width}.png`), fullPage: true });
            await closeInfo();
            const petHeader = await page.evaluate(() => ({
                titleSize: getComputedStyle(document.querySelector('#seer-lookup-title')).fontSize,
                descriptionSize: getComputedStyle(document.querySelector('#seer-lookup-description')).fontSize,
                accent: getComputedStyle(document.querySelector('#seer-lookup-section'), '::before').backgroundImage
            }));
            assert.equal(await page.locator('#seer-lookup-description').isVisible(), true);
            await page.locator('#encyclopedia-nav summary').click();await page.locator('#encyclopedia-nav [data-lookup-mode="skin"]').click();
            assert.equal(await lookup.getAttribute('data-lookup-mode'), 'skin');
            assert.equal(await lookup.evaluate(node => node.classList.contains('panel')), true, 'skin shares the catalog workspace');
            const skinHeader = await page.evaluate(() => ({
                titleSize: getComputedStyle(document.querySelector('#seer-lookup-title')).fontSize,
                descriptionSize: getComputedStyle(document.querySelector('#seer-lookup-description')).fontSize,
                accent: getComputedStyle(document.querySelector('#seer-lookup-section'), '::before').backgroundImage
            }));
            assert.deepEqual(petHeader, skinHeader, 'pet and skin headers use the same shared typography and accent');
            assert.equal(await page.locator('#seer-lookup-preview').evaluate(node => node.parentElement.id), 'seer-lookup-illustration');
            await results.first().waitFor();
            await results.first().click();
            await page.locator('#seer-lookup-preview:not([hidden])').waitFor();
            assert.equal(await page.locator('#seer-lookup-id-result').textContent(), '#840');
            assert.equal(await page.locator('#seer-lookup-message').textContent(), '共 24 款皮膚', 'selecting a skin keeps the results summary visible');
            assert.equal(await page.locator('#seer-pet-info-toggle').textContent(), '綁定精靈資訊');
            if (width <= 900) {
                assert.equal(await page.locator('#seer-lookup-results').isVisible(), false);
                await page.locator('#seer-pet-back-to-results').click();
                assert.equal(await results.first().isVisible(), true);
                await results.first().click();
            }
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-skin-preview-${width}.png`), fullPage: true });
            await page.locator('#seer-pet-info-toggle').click();
            await modal.waitFor();
            await closeInfo();
            assert.equal(await page.locator('#seer-lookup-id-result').textContent(), '#840', 'shared pet info preserves skin preview');
            if (width > 900) {
                assert.equal(await page.evaluate(() => {
                    const list = document.querySelector('#seer-lookup-results').getBoundingClientRect();
                    const preview = document.querySelector('#seer-lookup-illustration').getBoundingClientRect();
                    return list.right <= preview.left && Math.abs(list.top - preview.top) < 2;
                }), true, 'skin browsing aligns its list beside the artwork preview');
            } else {
                assert.equal(await page.evaluate(() => {
                    const buttons = [...document.querySelectorAll('.seer-lookup-preview-actions button')].filter(node => !node.hidden);
                    const [info, wiki] = buttons.map(node => node.getBoundingClientRect());
                    const art = document.querySelector('.seer-lookup-illustration-stage').getBoundingClientRect();
                    return Math.abs(info.top - wiki.top) < 2 && info.bottom < art.top && wiki.bottom < art.top;
                }), true, 'skin actions share a row above the mobile artwork');
            }
            for (const searchMode of ['pet', 'category', 'skin']) {
                await page.locator(`[data-skin-search-mode="${searchMode}"]`).click();
                if (searchMode === 'pet') {
                    await page.locator('#seer-lookup-id').fill('1');
                    await page.locator('#seer-lookup-id').press('Enter');
                }
                await results.first().waitFor();
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            }
            await page.locator('#seer-lookup-id').fill('840');
            await page.locator('#seer-lookup-id').press('Enter');
            await page.waitForFunction(() => document.querySelector('#seer-lookup-section').dataset.petPresentation === 'direct' && !document.querySelector('#seer-lookup-preview').hidden);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-skin-direct-${width}.png`), fullPage: true });
            await page.locator('#seer-lookup-name').evaluate(node => { node.textContent = '測試用較長皮膚名稱・星海之中的永恆守望者'; });
            await page.locator('#seer-lookup-related-pet').evaluate(node => { node.textContent = '綁定精靈：測試用較長精靈名稱・星海之中的永恆守望者 (#5000)'; });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await page.screenshot({ path: path.join(process.env.TEMP || root, `seer-skin-long-name-${width}.png`), fullPage: true });
            if (width <= 900) {
                await page.locator('#seer-pet-back-to-results').click();
                await results.first().waitFor();
                assert.equal(await page.locator('#seer-lookup-id').inputValue(), '');
            }
            for (const mode of ['seal', 'suit']) {
                await page.locator(`#encyclopedia-sub-tabs [data-lookup-mode="${mode}"]`).click();
                const filter = page.locator(mode === 'seal' ? '[data-seal-sort] + button' : '[data-suit-sort] + button');
                await filter.click();
                await page.locator('.site-picker-options:popover-open button').last().click();
                if (mode === 'seal') {
                    assert.equal(await page.locator('[data-seal-series-combobox] input').isEditable(), true);
                    await page.locator('[data-seal-series-combobox] input').click();
                    await page.keyboard.press('Escape');
                }
                assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
                await page.screenshot({ path: path.join(process.env.TEMP || root, `${mode}-pickers-${width}.png`), fullPage: true });
            }
            {
                await page.locator('#tools-nav summary').click();
                await page.locator('[data-main-target="training"]').click();
                await page.locator('[data-art-placeholder]').click();
                const picker = page.locator('.training-pet-dialog');
                await picker.locator('[data-method="type"]').click();
                await picker.locator('.training-options .seer-lookup-result').first().waitFor();
                await picker.locator('[data-type-open]').click();
                const typePicker = page.locator('.training-type-dialog');
                assert.equal(await typePicker.locator('[data-pet-type-category="all"]').count(), 0);
                await typePicker.locator('[data-pet-type-category="double"]').click();
                await page.waitForFunction(() => document.querySelectorAll('.training-options .seer-lookup-result').length === 1);
                await picker.locator('.training-options .seer-lookup-result').click();
                await picker.waitFor({ state: 'hidden' });
                assert.match(await page.locator('.training-pet-name strong').textContent(), /28/);
                await page.locator('[data-nature] + button').click();
                await page.locator('.site-picker-options:popover-open button').last().click();
                await page.locator('[data-mint-slot="0"]').click();
                await page.locator('[data-training-series-combobox] input').click();
                await page.locator('[data-training-series-combobox] [role="option"]').first().click();
                await page.locator('.training-mint-dialog select[aria-label="刻印排序"] + button').click();
                await page.screenshot({ path: path.join(process.env.TEMP || root, 'training-pickers.png') });
                await page.locator('.site-picker-options:popover-open button').last().click();
                await page.keyboard.press('Escape');
            }
            assert.deepEqual(errors, []);
            if (width === widths[0]) {
                const cold = await context.newPage();
                const since = apiRequests.length;
                await cold.goto(`${base}/index.html?tab=skin`, { waitUntil:'networkidle' });
                const skinResults = cold.locator('#seer-lookup-results .seer-lookup-result');
                await skinResults.first().waitFor();
                assert.equal(await skinResults.count(), 24, 'all matching skins are available together');
                const requests = () => apiRequests.slice(since);
                const catalogCalls = requests().filter(url => url.pathname === '/v1/pet_skin').length;
                assert.equal(catalogCalls, 1, 'cold skin list loads the catalog once');
                assert.equal(requests().filter(url => url.pathname === '/v1/pet/1').length, 0, 'skin names reuse the shared pet catalog');
                assert((await cold.locator('#seer-lookup-results .seer-lookup-result-pet').allTextContents()).every(text => text === '綁定精靈：測試精靈 1'), 'linked pet names are present before selecting any skin');
                await cold.locator('#seer-lookup-results').evaluate(node => { node.scrollTop = node.scrollHeight; });
                await cold.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 24);
                assert.equal(requests().filter(url => url.pathname === '/v1/pet_skin').length, catalogCalls, 'scrolling pages uses the cached catalog');
                await cold.locator('#seer-lookup-id').fill('皮膚 82');
                await cold.locator('#seer-lookup-id').press('Enter');
                await cold.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 10);
                assert.equal(requests().filter(url => url.searchParams.has('name') && url.pathname === '/v1/pet_skin').length, 0, 'skin name search stays local');
                await skinResults.first().click();
                await cold.locator('#seer-lookup-preview:not([hidden])').waitFor();
                assert.equal(requests().filter(url => url.pathname === '/v1/pet/1').length, 0, 'preview uses catalog names and types without fetching full details');
                await cold.locator('#seer-pet-info-toggle').click();
                await cold.locator('.seer-pet-info-section-nav').waitFor();
                assert.equal(requests().filter(url => url.pathname === '/v1/pet/1').length, 1, 'only opening full info requests pet details');
                await cold.keyboard.press('Escape');
                await cold.locator('#seer-pet-info-modal').waitFor({state:'hidden'});
                await cold.locator('[data-skin-search-mode="pet"]').click();
                await cold.locator('#seer-lookup-id').fill('測試精靈 1');
                await cold.locator('#seer-lookup-id').press('Enter');
                await cold.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 24);
                assert.equal(requests().filter(url => url.pathname === '/v1/pet' && url.searchParams.has('name')).length, 0, 'linked-pet name search also stays local');
                await cold.locator('[data-skin-search-mode="category"]').click();
                await cold.locator('[data-skin-category-id="1"]').click();
                await cold.waitForFunction(() => document.querySelectorAll('#seer-lookup-results .seer-lookup-result').length === 12);
                for (const category of ['0', '1', '0']) {
                    await cold.locator('#seer-lookup-results .seer-lookup-result').first().click();
                    await cold.locator('#seer-lookup-preview:not([hidden])').waitFor();
                    assert.notEqual(await cold.locator('#seer-lookup-illustration-category-icon').getAttribute('src'), null);
                    await cold.locator(`[data-skin-category-id="${category}"]`).click();
                    await cold.locator('#seer-lookup-preview').waitFor({state:'hidden'});
                    for (const icon of ['#seer-lookup-skin-category-icon', '#seer-lookup-illustration-category-icon']) {
                        assert.equal(await cold.locator(icon).getAttribute('src'), null, 'changing categories clears the previous skin badge');
                        assert.notEqual(await cold.locator(icon).getAttribute('hidden'), null);
                    }
                }
                assert.equal(requests().filter(url => url.pathname === '/v1/pet_skin').length, catalogCalls, 'category changes reuse the same catalog');
                await cold.close();
            }
            await context.close();
            console.log(`${width}px passed: catalog, shared homepage info, selection/search retention, mobile return, type pagination, Taiwan progress, skin layout and overflow`);
        }
    } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
