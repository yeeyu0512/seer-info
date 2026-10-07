import { test } from "node:test";
import assert from "node:assert/strict";
import { downloadTrainingImage } from "../js/seer-training-export.js";

test("PNG export includes the selected portrait and all three cached mintmark images",async t=>{
    const images=[],drawn=[]; let clicked=false,created=0;
    t.mock.method(globalThis,"setTimeout",()=>0);
    t.mock.method(globalThis,"clearTimeout",()=>{});
    t.mock.method(URL,"createObjectURL",blob=>{assert.equal(blob.type,"image/png");created++;return "blob:test";});
    t.mock.method(URL,"revokeObjectURL",()=>{});
    const originalImage=globalThis.Image,originalDocument=globalThis.document;
    t.after(()=>{if(originalImage===undefined)delete globalThis.Image;else globalThis.Image=originalImage;
        if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;});
    globalThis.Image=class {
        naturalWidth=100; naturalHeight=100;
        set src(url) { images.push(url);assert.equal(this.crossOrigin,"anonymous");
            if (url.startsWith("https://newseer.61.com")) this.onerror(); else this.onload(); }
    };
    const link={click(){clicked=true;},remove(){}};
    const ctx={fillRect(){},fillText(){},drawImage(...args){drawn.push(args);}};
    globalThis.document={body:{append(){}},createElement(tag){
        return tag === "canvas" ? {getContext(){return ctx;},toBlob(cb){cb(new Blob(["png"],{type:"image/png"}));}} : link;
    }};
    await downloadTrainingImage({petName:"角色/測試",petId:5000,portrait:"https://newseer.61.com/web/monster/head/5000.png",
        appearance:"原始外觀",mode:"PVP",nature:"開朗",iv:31,raceVersion:"一般種族值",hpTraining:20,year:true,
        stats:{},ev:{},team:{},mintmarks:[1,2,3].map(id=>({id,name:`刻印${id}`,image:`data:image/png;base64,${id}`})),suit:"無",eye:"無",title:"無"});
    assert.equal(drawn.length,4);
    assert.equal(images.filter(url=>url.startsWith("data:image/png")).length,3);
    assert.ok(images.some(url=>url.startsWith("https://wsrv.nl/")));
    assert.equal(created,1);assert.ok(clicked);
    assert.equal(link.download,"角色_測試-PVP-培養.png");
});
