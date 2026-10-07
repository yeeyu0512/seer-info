const fs=require("node:fs"),path=require("node:path"),http=require("node:http"),{spawnSync}=require("node:child_process"),assert=require("node:assert/strict");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root=process.cwd(),baseline=new Map(),ref=process.argv[2] || "d637a471a8c6e5bd009a23239a4a4d18a1840aec";
const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".ico":"image/x-icon"};
const pet={id:1,name:"測試精靈",gender:{id:1},type:{id:1},base_stats:{atk:100,sp_atk:90,def:80,sp_def:70,spd:60,hp:120,total:520},skill:[],soulmark:[],advance:{id:1}};
const mint={id:42729,name:"測試刻印",type:{id:3},max_attr_value:{atk:50,sp_atk:0,def:30,sp_def:30,spd:40,hp:100,total:250},extra_attr_value:{hp:5},mintmark_class:{id:1},pet:[]};
const suit={id:474,name:"測試套裝",equips:[],bonus:{desc:"全能力+8%",attribute:{atk:8,sp_atk:8,def:8,sp_def:8,spd:8,hp:8,percent:true}}};
const server=http.createServer((req,res)=>{
    const url=new URL(req.url,"http://localhost"), original=url.pathname.startsWith("/before/"),rel=decodeURIComponent(url.pathname.replace(/^\/(before|after)\//,""))||"index.html";
    if(rel.includes("..")){res.writeHead(403);return res.end();}
    let data;
    if(original){if(!baseline.has(rel)){const result=spawnSync("git",["show",ref+":"+rel],{maxBuffer:20*1024*1024});baseline.set(rel,result.status===0?result.stdout:null);}data=baseline.get(rel);}
    else if(fs.existsSync(path.join(root,rel)))data=fs.readFileSync(path.join(root,rel));
    if(!data){res.writeHead(404);return res.end();}
    res.setHeader("content-type",mime[path.extname(rel)]||"application/octet-stream");res.end(data);
});
(async()=>{
    const typeData=await import(require("node:url").pathToFileURL(path.join(root,"js/seer-type-data.js")).href);
    const combinations=typeData.SEER_TYPE_DATA.combinations.map(x=>({...x,is_double:x.types.length===2}));
    await new Promise(r=>server.listen(0,"127.0.0.1",r));
    const base="http://127.0.0.1:"+server.address().port;
    const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true}).catch(error => {server.close();throw error;});
    try{
        for(const width of [1440,390]) for (const pageKind of ["index.html","admin.html"]) {
            const snapshots=[];
            for(const mode of ["before","after"]){
                const context=await browser.newContext({viewport:{width,height:1000}});
                await context.route("**/*",async route=>{
                    const url=new URL(route.request().url());
                    if(url.origin===base)return route.continue();
                    if(url.href.includes("opencc-js"))return route.fulfill({contentType:"text/javascript",body:"export const Converter = () => value => value;"});
                    if(url.href.includes("@supabase/supabase-js"))return route.fulfill({contentType:"text/javascript",body:`window.supabase={createClient(){const records={seer_server_settings:{latest_pet_id:1,latest_skin_id:840,latest_mintmark_id:42729},pools:[{id:1,name:"測試票選",status:"draft",max_votes:1,start_at:"2026-10-01T00:00:00Z",end_at:"2026-11-01T00:00:00Z"}],competitive_pools:[{id:1,name:"測試競技池",start_at:"2026-10-01T00:00:00Z",end_at:"2026-11-01T00:00:00Z"}],pool_characters:[{id:1,character_id:1,character_name:"測試精靈"}],competitive_pool_characters:[{id:1,seer_pet_id:1,pet_name:"測試精靈",pool_type:"banned"}]};return {auth:{getSession:async()=>({data:{session:${pageKind==="admin.html"?"{user:{id:'test'}}":"null"}},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:table=>{const result={data:records[table]||[],error:null};const query=new Proxy({}, {get(t,k){if(k==="then")return Promise.resolve(result).then.bind(Promise.resolve(result));if(["insert","update","delete","upsert"].includes(k))return ()=>{throw Error("Writes forbidden in regression tests")};return ()=>query;}});return query;},rpc:async name=>({data:name==="is_admin"?true:[],error:null})};}};`});
                    if(url.hostname==="api.seerapi.com"){
                        const [,resource,id]=url.pathname.split("/").slice(1);
                        const records={pet:[pet],pet_skin:[{id:840,name:"測試皮膚",resource_id:1400812,pet:{id:1},category:{id:0}}],element_type_combination:combinations,mintmark:[mint],mintmark_class:[{id:1,name:"測試系列"}],suit:[suit],nature:[],pet_advance:[{id:1,base_stats:{...pet.base_stats,atk:110,total:530}}],pet_skin_category:[{id:0,name:"普通"}],equip:[],title:[]};
                        const list=records[resource]||[];
                        return route.fulfill({contentType:"application/json",body:JSON.stringify(id?list.find(x=>String(x.id)===id)||{}:{count:list.length,next:null,results:list})});
                    }
                    if(route.request().resourceType()==="image")return route.fulfill({contentType:"image/svg+xml",body:'<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#779"/></svg>'});
                    return route.abort();
                });
                const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
                await page.goto(base+"/"+mode+"/"+pageKind,{waitUntil:"networkidle"});
                const cssRules = await page.evaluate(() => {
                    const flatten = sheet => [...sheet.cssRules].flatMap(rule => {
                        if(rule.type === CSSRule.IMPORT_RULE) return flatten(rule.styleSheet);
                        return [rule.cssText.replace(/url\(([^)]+)\)/g,(_,raw) => {
                            const url = new URL(raw.replace(/^['"]|['"]$/g,''),sheet.href || location.href).href
                                .replace('/before/','/PROJECT/').replace('/after/','/PROJECT/')
                                .replace('/PROJECT/bg.png','/PROJECT/assets/site/background.png')
                                .replace('/PROJECT/1400837.png','/PROJECT/assets/site/about-artwork.png');
                            return 'url('+JSON.stringify(url)+')';
                        })];
                    });
                    return [...document.styleSheets].filter(sheet=>!sheet.href || sheet.href.startsWith(location.origin)).flatMap(flatten);
                });
                if (pageKind==="admin.html") {
                    await page.waitForSelector("#admin-workspace:not([hidden])");
                    await page.waitForTimeout(200);
                    const data=[cssRules];
                    await page.locator("#admin-pool-list button").first().click();
                    await page.waitForTimeout(100);
                    data.push(await page.locator("#pool-editor").innerText());
                    data.push(await page.locator("#admin-character-list").innerText());
                    for (const tab of await page.locator("[data-admin-tab]").all()) {
                        await tab.click();await page.waitForTimeout(50);
                        data.push(await page.locator("#admin-workspace").innerText());
                    }
                    assert.deepEqual(errors,[],mode+" admin");
                    snapshots.push(data);await context.close();continue;
                }
                await page.waitForSelector(".training-mode-tabs",{state:"attached"});
                assert.deepEqual(errors,[],mode+" startup");
                const data=[cssRules];
                const localMissing=[];
                page.on('response',response=>{if(response.url().startsWith(base+'/'+mode+'/') && response.status()===404)localMissing.push(response.url());});
                for(const [selector,panel] of [
                    ['[data-main-target="encyclopedia"]',"#seer-lookup-section"],
                    ['[data-lookup-mode="skin"]',"#seer-lookup-section"],
                    ['[data-main-target="type-chart"]',"#type-chart-section"],
                    ['[data-main-target="training"]',"#training-section"],
                    ['[data-main-target="about"]',"#about-section"]
                ]){
                    if(!await page.locator(selector).count())continue;
                    await page.locator(selector).click();await page.waitForTimeout(150);
                    data.push(await page.locator(panel).evaluate(el=>({text:el.innerText,box:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height},display:getComputedStyle(el).display})));
                }
                await page.locator('[data-main-target="encyclopedia"]').click();
                await page.locator('[data-lookup-mode="skin"]').click();
                await page.locator('#seer-lookup-id').fill('840');await page.locator('#seer-lookup-id').press('Enter');
                await page.waitForTimeout(200);data.push(await page.locator('#seer-lookup-section').innerText());
                await page.locator('[data-skin-search-mode="category"]').click();
                await page.waitForTimeout(250);data.push(await page.locator('#seer-lookup-section').innerText());
                await page.locator('[data-lookup-mode="pet"]').click();
                await page.locator('[data-pet-search-method="type"]').click();
                await page.waitForTimeout(200);data.push(await page.locator('#seer-lookup-section').innerText());
                await page.locator('[data-pet-search-method="query"]').click();
                await page.locator('[data-main-target="type-chart"]').click();
                await page.locator('#type-calc-trigger-card').click();
                await page.locator('#type-calc-modal [data-base-type]').first().click();
                data.push(await page.locator('#type-calc-modal').innerText());
                await page.keyboard.press('Escape');await page.waitForTimeout(200);
                await page.locator('[data-main-target="training"]').click();
                await page.locator('[data-art-placeholder]').click();
                await page.locator('.training-pet-dialog input').fill('1');
                await page.locator('.training-pet-dialog input').press('Enter');
                await page.locator('.training-pet-dialog .training-options button').first().click();
                await page.locator('[data-hp-training]').fill('20');
                await page.locator('[data-year-bonus]').check();
                await page.locator('[data-ev] input').first().fill('255');
                await page.waitForTimeout(100);
                for (const tab of await page.locator('[data-result-mode]').all()) {
                    await tab.click();data.push(await page.locator('.training-results').innerText());
                }
                await page.locator('[data-mint-slot="0"]').click();
                await page.locator('.training-dialog-mint').first().click();
                data.push(await page.locator('.training-results').innerText());
                await page.locator('[data-main-target="encyclopedia"]').click();
                await page.locator("#seer-lookup-id").fill("1");await page.locator("#seer-lookup-id").press("Enter");
                await page.waitForTimeout(300);
                await page.locator("#seer-pet-info-toggle").click();
                await page.waitForSelector("#seer-pet-info-modal:not([hidden])");
                await page.waitForTimeout(100);
                data.push(await page.locator("#seer-pet-info").innerText());
                assert.deepEqual(errors,[],mode+" interaction");
                assert.deepEqual(localMissing,[],mode+" local asset paths");
                fs.mkdirSync("tmp/refactor-qa",{recursive:true});await page.screenshot({path:`tmp/refactor-qa/${mode}-${width}.png`});
                snapshots.push(data);await context.close();
            }
            assert.deepEqual(snapshots[1],snapshots[0],"baseline comparison "+width);
            console.log("Baseline matches: "+width+"px, "+pageKind+".");
        }
    }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
