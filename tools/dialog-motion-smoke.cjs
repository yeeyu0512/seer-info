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
            const context = await browser.newContext({ viewport: { width, height: width > 900 ? 640 : width < 350 ? 740 : 844 }, reducedMotion: 'no-preference' });
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
            const page = await context.newPage();
            await page.goto(`${base}/index.html?tab=skin`, {waitUntil:'networkidle'});
            await page.evaluate(async () => {
                const {openDialog, closeDialog} = await import('/js/shared/dialog-motion.js');
                window.motion = {openDialog, closeDialog};
            });
            await page.locator('[data-main-target="training"]').evaluate(button => button.click());
            await page.locator('.training-pet-dialog').waitFor({state:'attached'});
            await page.locator('[data-main-target="damage"]').evaluate(button => button.click());
            await page.locator('.damage-type-dialog').waitFor({state:'attached'});
            const ids = await page.locator('dialog').evaluateAll(items => items.map((item, index) => item.id ||= `motion-qa-${index}`));
            for (const id of ids) {
                const result = await page.evaluate(async id => {
                    const dialog = document.getElementById(id);
                    motion.openDialog(dialog);
                    const enter = getComputedStyle(dialog).animationName;
                    const backdrop = getComputedStyle(dialog, '::backdrop').animationName;
                    motion.closeDialog(dialog);
                    return {enter, backdrop, exit:getComputedStyle(dialog).animationName, stillOpen:dialog.open};
                }, id);
                assert.equal(result.enter, 'modal-content-in', id);
                assert.equal(result.backdrop, 'modal-backdrop-in', id);
                assert.equal(result.exit, 'modal-content-out', id);
                assert.equal(result.stillOpen, true, id);
                await page.waitForFunction(id => !document.getElementById(id).open, id);
            }
            for (const [id, closeId] of [
                ['login-modal','login-close'],
                ['seer-pet-info-modal','seer-pet-info-close'],
                ['seer-related-skins-modal','seer-related-skins-close'],
                ['seer-external-link-modal','seer-external-link-cancel'],
                ['seer-pet-type-modal','seer-pet-type-close'],
                ['type-calc-modal','type-calc-modal-close']
            ]) {
                await page.evaluate(id => {document.getElementById(id).hidden=false;}, id);
                const content = id === 'login-modal' ? '#login-section' : '.admin-confirm-dialog';
                assert.equal(await page.locator(`#${id}`).evaluate(el=>getComputedStyle(el).animationName),'modal-backdrop-in');
                assert.equal(await page.locator(`#${id} ${content}`).evaluate(el=>getComputedStyle(el).animationName),'modal-content-in');
                await page.locator(`#${closeId}`).evaluate(button=>button.click());
                assert.equal(await page.locator(`#${id}`).evaluate(el=>getComputedStyle(el).animationName),'modal-backdrop-out');
                assert.equal(await page.locator(`#${id} ${content}`).evaluate(el=>getComputedStyle(el).animationName),'modal-content-out');
                await page.locator(`#${id}`).waitFor({state:'hidden'});
            }
            console.log(`${width}px: 6 custom overlays enter/exit passed`);
            await page.evaluate(async () => {
                const html = await (await fetch('/admin.html')).text();
                const source = new DOMParser().parseFromString(html,'text/html');
                for (const id of ['competitive-pool-preview-modal','preview-competitive-pool-button','admin-competitive-pool-server']) document.body.append(source.getElementById(id));
                const {createCompetitivePreview} = await import('/js/admin/competitive-preview.js');
                window.adminPreview = createCompetitivePreview({
                    competitivePoolNameInput:{value:'動畫測試'}, toIsoDate:()=> '2026-11-04',
                    requestCharacterTypeIcon:()=>{}, clearObservedTypeIcons:()=>{}, getPreviewCharacters:()=>[]
                });
                document.querySelector('#preview-competitive-pool-button').focus();
                adminPreview.openCompetitivePoolPreview();
            });
            assert.equal(await page.locator('#competitive-pool-preview-modal .admin-confirm-dialog').evaluate(el=>getComputedStyle(el).animationName),'modal-content-in');
            await page.locator('#close-competitive-pool-preview-button').evaluate(button=>button.click());
            assert.equal(await page.locator('#competitive-pool-preview-modal .admin-confirm-dialog').evaluate(el=>getComputedStyle(el).animationName),'modal-content-out');
            await page.locator('#competitive-pool-preview-modal').waitFor({state:'hidden'});
            assert.equal(await page.evaluate(()=>document.activeElement.id),'preview-competitive-pool-button');
            console.log(`${width}px: admin preview enter/exit and focus restoration passed`);
            const dynamic = await page.evaluate(async () => {
                const outer = document.createElement('dialog'), inner = document.createElement('dialog');
                outer.id='motion-test-outer'; inner.id='motion-test-inner';
                outer.innerHTML='<input autofocus><button>Close</button>'; inner.innerHTML='<input autofocus>';
                document.body.append(outer,inner);
                motion.openDialog(outer); motion.openDialog(inner);
                return document.activeElement.closest('dialog').id;
            });
            assert.equal(dynamic,'motion-test-inner');
            await page.keyboard.press('Escape');
            assert.equal(await page.locator('#motion-test-inner').evaluate(el => el.classList.contains('is-closing')), true);
            await page.waitForFunction(() => !document.querySelector('#motion-test-inner').open);
            assert.equal(await page.evaluate(() => document.activeElement.closest('dialog')?.id), 'motion-test-outer');
            await page.evaluate(() => {
                const dialog = document.querySelector('#motion-test-outer');
                motion.closeDialog(dialog); motion.closeDialog(dialog); motion.openDialog(dialog);
            });
            await page.waitForTimeout(240);
            assert.equal(await page.locator('#motion-test-outer').evaluate(el=>el.open && !el.classList.contains('is-closing')),true);
            await page.emulateMedia({reducedMotion:'reduce'});
            assert.equal(await page.locator('#motion-test-outer').evaluate(el=>getComputedStyle(el).animationName),'none');
            await page.evaluate(() => motion.closeDialog(document.querySelector('#motion-test-outer')));
            assert.equal(await page.locator('#motion-test-outer').evaluate(el=>el.open),false);
            console.log(`${width}px: ${ids.length} native dialogs enter/exit, Escape, nested focus, reopen and reduced motion passed`);
            await context.close();
        }
    } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
