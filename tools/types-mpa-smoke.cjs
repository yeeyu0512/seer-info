const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = process.cwd();
const pet = { id: 1, name: '測試精靈', gender: { id: 1 }, type: { id: 1 }, base_stats: { atk: 100, sp_atk: 90, def: 80, sp_def: 70, spd: 60, hp: 120, total: 520 }, skill: [], soulmark: [] };
const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { response.writeHead(403); return response.end(); }
    const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file, 'index.html') : file;
    if (!fs.existsSync(target)) { response.writeHead(404); return response.end(); }
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.webp': 'image/webp' };
    response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
    response.end(fs.readFileSync(target));
});

async function chooseType(page, trigger, id) {
    await page.locator(trigger).click();
    await page.locator(`#type-calc-modal [data-base-type="${id === 2 ? '水' : '草'}"]`).click();
    await page.locator(`#type-calc-modal [data-calc-type-id="${id}"]`).click();
    await page.locator('#type-calc-modal').waitFor({ state: 'hidden' });
}

(async () => {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    try {
        for (const width of [1440, 390, 320]) {
            const context = await browser.newContext({ viewport: { width, height: 900 } });
            let externalRequests = 0;
            await context.route('**/*', route => {
                const url = new URL(route.request().url());
                if (url.origin === base) return route.continue();
                externalRequests++;
                if (url.href.includes('opencc-js')) return route.fulfill({ contentType: 'text/javascript', body: 'export const Converter = () => value => value;' });
                if (url.href.includes('@supabase/supabase-js')) return route.fulfill({ contentType: 'text/javascript', body: 'window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange(){}},from(){const q=new Proxy({}, {get(t,k){return k==="then"?Promise.resolve({data:[],error:null}).then.bind(Promise.resolve({data:[],error:null})):()=>q;}});return q;}}}};' });
                if (url.hostname === 'api.seerapi.com') {
                    const data = url.pathname === '/v1/pet/1' ? pet : url.pathname === '/v1/element_type_combination/1'
                        ? { id: 1, name: '草' } : { count: 0, next: null, results: [] };
                    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
                }
                if (route.request().resourceType() === 'image') return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"/>' });
                return route.abort();
            });
            const page = await context.newPage();
            const errors = [], missing = [];
            page.on('pageerror', error => errors.push(error.message));
            page.on('response', response => { if (response.url().startsWith(base) && response.status() === 404) missing.push(response.url()); });

            await page.goto(base + '/types/', { waitUntil: 'networkidle' });
            assert.equal(externalRequests, 0, 'standalone types page must not initialize external services');
            assert.equal(await page.locator('#type-chart-section').isVisible(), true);
            assert.equal(await page.locator('#home-section').count(), 0);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
            await chooseType(page, '#type-calc-trigger-card', 1);
            assert.equal(await page.locator('#type-calc-current-name').textContent(), '草');
            assert((await page.locator('#type-calc-card-grid').innerText()).length > 100);
            await page.locator('#type-calc-mode-defense').click();
            assert.equal(await page.locator('#type-calc-mode-defense').getAttribute('aria-selected'), 'true');
            await page.locator('#type-calc-tab-vs').click();
            await chooseType(page, '#type-vs-trigger-a', 1);
            await chooseType(page, '#type-vs-trigger-b', 2);
            assert.equal(await page.locator('.type-vs-results-grid').isVisible(), true);
            await page.locator('#type-vs-stone-select').click();
            await page.locator('#type-calc-modal-options .seer-pet-type-option').nth(1).click();
            assert.doesNotMatch(await page.locator('#type-vs-stone-select').textContent(), /不攜帶/);
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

            await page.goto(base + '/?tab=types', { waitUntil: 'networkidle' });
            await page.waitForURL('**/types/');
            assert.equal(await page.locator('#type-chart-section').isVisible(), true);
            await page.goto(base + '/index.html?tab=types&id=1', { waitUntil: 'networkidle' });
            await page.waitForURL('**/types/?id=1');
            assert.equal(await page.locator('#type-calc-current-name').textContent(), '草');

            await page.goto(base + '/?tab=pet&id=1', { waitUntil: 'networkidle' });
            await page.locator('#seer-pet-info-toggle').waitFor({ state: 'visible' });
            await page.locator('#seer-pet-info-toggle').click();
            await page.locator('.seer-pet-info-type-link').waitFor({ state: 'visible' });
            await page.locator('.seer-pet-info-type-link').click();
            await page.waitForURL('**/types/?id=1');
            assert.equal(await page.locator('#type-calc-current-name').textContent(), '草');
            assert.deepEqual(errors, [], `${width}px page errors`);
            assert.deepEqual(missing, [], `${width}px local 404s`);
            console.log(`Types MPA ${width}px: features, old URLs and pet link passed.`);
            await context.close();
        }
    } finally {
        await browser.close();
        server.close();
    }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
