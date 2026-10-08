const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = process.cwd();
const server = http.createServer((req,res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (!file.startsWith(root + path.sep)) {res.writeHead(403); return res.end();}
    const target = fs.existsSync(file) && fs.statSync(file).isDirectory() ? path.join(file,'index.html') : file;
    if (!fs.existsSync(target)) {res.writeHead(404); return res.end();}
    res.setHeader('Content-Type', ({'.json':'application/json','.html':'text/html','.js':'text/javascript','.css':'text/css','.ico':'image/x-icon','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'})[path.extname(target)] || 'application/octet-stream');
    res.end(fs.readFileSync(target));
});
(async () => {
    await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
    const base = 'http://127.0.0.1:' + server.address().port;
    let browser;
    try {
        browser = await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
        for (const width of [1440,390,320]) {
            const context = await browser.newContext({viewport:{width,height:1000}});
            await context.route('**/*', route => {
                const url = route.request().url();
                if (url.startsWith(base)) return route.continue();
                if (url.includes('opencc-js')) return route.fulfill({contentType:'text/javascript',body:'export const Converter = () => value => value;'});
                if (url.includes('@supabase/supabase-js')) return route.fulfill({contentType:'text/javascript',body:`window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}},from(){const q=new Proxy({}, {get(t,k){return k==='then'?Promise.resolve({data:[],error:null}).then.bind(Promise.resolve({data:[],error:null})):()=>q;}});return q;}}}};`});
                if (url.includes('api.seerapi.com')) return route.fulfill({contentType:'application/json',body:JSON.stringify({count:0,next:null,results:[]})});
                return route.abort();
            });
            const page = await context.newPage(), errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.goto(base + '/index.html',{waitUntil:'networkidle'});
            assert.equal(await page.locator('#known-issues-modal').count(),0);
            assert.equal(await page.locator('#home-search-form').count(),0);
            assert.equal(await page.locator('.home-known-issues').isVisible(),true);
            assert.equal(await page.locator('[data-home-visibility="account-tab"]').isVisible(),false);
            assert.equal(await page.locator('[data-home-visibility="voting"]').isVisible(),false);
            await page.waitForTimeout(220);
            assert.equal(await page.locator('#home-section').isVisible(),true);
            assert.equal(await page.locator('#seer-lookup-section').isVisible(),false);
            assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
            const icons = await page.locator('.home-key-icon').evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height, fill: getComputedStyle(node).fill })));
            assert.equal(icons.length,7);
            assert.equal(icons.every(icon => icon.width===18 && icon.height===18 && icon.fill==='none'),true);
            const carousel = page.locator('.home-carousel');
            await carousel.locator('img').first().evaluate(img => img.decode());
            assert.match(await carousel.locator('img').first().evaluate(img => img.currentSrc), /home-banner-\d+\.webp$/);

            await carousel.locator('[data-carousel-next]').click();
            assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'2 / 2');
            await carousel.locator('img').nth(1).evaluate(img => img.decode());
            assert.match(await carousel.locator('img').nth(1).evaluate(img => img.currentSrc), /home-banner-2-\d+\.webp$/);
            await carousel.locator('[data-carousel-prev]').click();
            await carousel.locator('[data-carousel-prev]').click();
            assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'2 / 2');
            await carousel.locator('[data-carousel-pages] button').nth(0).click();
            await carousel.locator('[data-carousel-pages] button').nth(0).press('ArrowRight');
            assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'2 / 2');
            await carousel.locator('[data-carousel-pause]').click();
            assert.equal(await carousel.locator('[data-carousel-pause]').textContent(),'播放輪播');
            await page.evaluate(() => {
                const stage = document.querySelector('[data-carousel-stage]');
                const start = new Event('touchstart');
                Object.defineProperty(start,'touches',{value:[{clientX:200,clientY:50}]});
                stage.dispatchEvent(start);
                const end = new Event('touchend');
                Object.defineProperty(end,'changedTouches',{value:[{clientX:100,clientY:52}]});
                stage.dispatchEvent(end);
            });
            assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'1 / 2');
            await carousel.locator('[data-carousel-pages] button').nth(0).click();
            // Autoplay stops while hidden and resumes only after returning to home.
            if (width === 1440) {
                await carousel.locator('[data-carousel-pause]').click();
                await page.locator('.logo').focus();
                await page.mouse.move(0,0);
                await page.waitForTimeout(5200);
                assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'2 / 2');
                await page.locator('[data-main-target="about"]').click();
                await page.waitForTimeout(5200);
                assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'2 / 2');
                await page.locator('.logo').click();
                await page.waitForTimeout(5200);
                assert.equal(await carousel.locator('[data-carousel-count]').textContent(),'1 / 2');
            }
            await page.emulateMedia({reducedMotion:'reduce'});
            assert.equal(await carousel.locator('[data-carousel-pause]').textContent(),'播放輪播');
            await page.screenshot({path:`${process.env.TEMP}/seer-home-${width}.png`,fullPage:true});
            assert.equal(await page.locator('.home-training').count(),0);
            const columns = await page.evaluate(() => { const left=document.querySelector('.home-shortcuts').getBoundingClientRect(), right=document.querySelector('.home-community').getBoundingClientRect(); return innerWidth>760 ? left.right<=right.left && Math.abs(left.top-right.top)<1 : left.bottom<=right.top; });
            assert.equal(columns,true);
            assert.equal(await page.evaluate(() => { const banner=document.querySelector('.home-carousel'),nav=document.querySelector('.home-shortcuts'),updates=document.querySelector('.home-updates'),issues=document.querySelector('.home-known-issues'); return banner.getBoundingClientRect().bottom <= nav.getBoundingClientRect().top && updates.getBoundingClientRect().bottom <= issues.getBoundingClientRect().top; }),true);
            for (const [label,target] of [['精靈圖鑑','seer-lookup-section'],['皮膚圖鑑','seer-lookup-section'],['刻印圖鑑','seal-encyclopedia-section'],['套裝圖鑑','suit-encyclopedia-section'],['模擬培養','training-section'],['屬性克制','type-chart-section'],['關於本站','about-section']]) {
                await page.locator('#home-section').getByRole('button',{name:label,exact:true}).click();
                assert.equal(await page.locator('#'+target).isVisible(),true);
                assert.equal(await page.locator('#home-section').isVisible(),false);
                if (width === 1440 || width === 390) {
                    await page.screenshot({path:`${process.env.TEMP}/seer-${target}-${width}.png`,fullPage:true});
                }
                await page.locator('.logo').click();
            }
            for (const id of [3506,4554,4329,4500]) {
                await page.locator(`[data-home-pet-id="${id}"]`).click();
                assert.equal(await page.locator('#seer-pet-info-modal').isVisible(),true);
                assert.equal(await page.locator('#home-section').isVisible(),true);
                await page.locator('#seer-pet-info-close').click();
                await page.waitForTimeout(220);
            }
            assert.deepEqual(errors,[]);
            console.log(`Home ${width}px: default, seven entries, inline known issues, guest permissions, overflow and runtime checks passed.`);
            await context.close();
        }
    } finally {if(browser) await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
