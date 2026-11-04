const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return res.writeHead(404).end();
    res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp'})[path.extname(file)] || 'application/octet-stream');
    res.end(fs.readFileSync(file));
});
(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    let browser;
    try {
        browser = await chromium.launch({executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true});
        for (const width of [1440, 1024, 390, 320]) {
            const page = await browser.newPage({viewport: {width, height: 850}, reducedMotion: 'reduce'});
            const errors = [];
            let latestSuitId = 6;
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.origin === base) return route.continue();
                if (url.href.includes('opencc-js')) return route.fulfill({contentType:'text/javascript', body:'export const Converter = () => value => value;'});
                if (url.href.includes('@supabase/supabase-js')) return route.fulfill({contentType:'text/javascript', body:`window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}},from(table){const result={data:table==='seer_server_settings'?{latest_pet_id:8,latest_skin_id:840,latest_mintmark_id:43000,taiwan_exclusions:{pet:'',skin:'',mintmark:'',suit:'2-3 # 測試合作',latestSuitId:${JSON.stringify(latestSuitId)}}}:[],error:null};const q=new Proxy({}, {get(t,k){return k==='then'?Promise.resolve(result).then.bind(Promise.resolve(result)):()=>q;}});return q;}}}};`});
                if (url.hostname === 'api.seerapi.com') {
                    const resource = url.pathname.split('/')[2];
                    const records = resource === 'suit' ? Array.from({length:8}, (_,i) => ({id:i+1, name:`測試套裝 ${i+1}`, equips:[], bonus:i%2 ? null : {desc:'所有對戰有效'}})) : [];
                    return route.fulfill({contentType:'application/json', body:JSON.stringify({count:records.length, next:null, results:records})});
                }
                if (route.request().resourceType() === 'image') return route.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'});
                return route.abort();
            });
            await page.goto(`${base}/index.html?tab=suit`, {waitUntil:'networkidle'});
            await page.waitForFunction(() => document.querySelector('.suit-status').textContent === '8 套套裝');
            await page.locator('[data-suit-id="7"]').click();
            await page.locator('#suit-taiwan-progress-only').check();
            await page.waitForFunction(() => document.querySelector('.suit-status').textContent.includes('4 套套裝'));
            assert.deepEqual(await page.locator('.suit-card').evaluateAll(nodes => nodes.map(node => Number(node.dataset.suitId))), [6,5,4,1]);
            assert.equal(await page.locator('[data-suit-title]').textContent(), '選擇一套套裝');
            for (const id of ['seer', 'seal', 'suit']) assert.equal(await page.locator(`#${id}-taiwan-progress-only`).isChecked(), true);
            await page.locator('.suit-toolbar input').fill('套裝 4');
            await page.waitForFunction(() => document.querySelectorAll('.suit-card').length === 1);
            assert.equal(await page.locator('.suit-card').getAttribute('data-suit-id'), '4');
            await page.locator('.suit-toolbar input').fill('');
            await page.evaluate(() => {const node=document.querySelector('#seal-taiwan-progress-only');node.checked=false;node.dispatchEvent(new Event('change'));});
            await page.waitForFunction(() => document.querySelector('.suit-status').textContent === '8 套套裝');
            for (const id of ['seer', 'seal', 'suit']) assert.equal(await page.locator(`#${id}-taiwan-progress-only`).isChecked(), false);
            await page.evaluate(() => {const node=document.querySelector('#seer-taiwan-progress-only');node.checked=true;node.dispatchEvent(new Event('change'));});
            await page.waitForFunction(() => document.querySelectorAll('.suit-card').length === 4);
            assert.equal(await page.locator('#seal-taiwan-progress-only').isChecked(), true);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            if (width >= 1024) assert.equal(await page.evaluate(() => {
                const hint=document.querySelector('.suit-description-row .panel-description').getBoundingClientRect();
                const toggle=document.querySelector('.suit-progress-toggle').getBoundingClientRect();
                return toggle.left >= hint.right && Math.abs((hint.top+hint.bottom)/2-(toggle.top+toggle.bottom)/2) < 3;
            }), true, 'toggle sits beside the heading description');
            await page.evaluate(() => window.scrollTo(0,0));
            await page.screenshot({path:path.join(root, `tmp/suit-progress-${width}.png`), fullPage:true});
            const section = page.locator('#suit-encyclopedia-section');
            await section.evaluate(node => node.hidden=false);
            await page.evaluate(async () => { const {setTaiwanProgressOnly}=await import('/js/shared/taiwan-progress-toggle.js'); setTaiwanProgressOnly(false); });
            if (width === 1440) {
                await page.goto(`${base}/index.html?tab=suit&id=2`, {waitUntil:'networkidle'});
                await page.waitForFunction(() => document.querySelector('[data-suit-title]').textContent === '測試套裝 2');
                assert.equal(await page.locator('#suit-taiwan-progress-only').isChecked(), false, 'ID routes expose excluded suits with the filter disabled');
                latestSuitId = null;
                await page.goto(`${base}/index.html?tab=suit`, {waitUntil:'networkidle'});
                await page.locator('#suit-taiwan-progress-only').check();
                await page.waitForFunction(() => document.querySelector('.suit-status').textContent.includes('尚未設定台服最新套裝編號'));
                assert.equal(await page.locator('.suit-card').count(), 0);
                await page.locator('#suit-taiwan-progress-only').uncheck();
                await page.waitForFunction(() => document.querySelector('.suit-status').textContent === '8 套套裝');
            }
            assert.deepEqual(errors, []);
            await page.close();
            console.log(`${width}px: suit progress, exclusion ranges, search, preview reset, three shared toggles and layout passed (mock data).`);
        }
    } finally { await browser?.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => {console.error(error); process.exitCode=1;});
