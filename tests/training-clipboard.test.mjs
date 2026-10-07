import {test} from 'node:test';
import assert from 'node:assert/strict';
import {copyTrainingImage} from '../js/seer-training-export.js';

function globals(t,values) {
    for(const [key,value] of Object.entries(values)) {
        const descriptor=Object.getOwnPropertyDescriptor(globalThis,key);
        Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
        t.after(()=>descriptor ? Object.defineProperty(globalThis,key,descriptor) : delete globalThis[key]);
    }
}

test('copy writes a promised PNG during the user gesture without downloading',async t=>{
    let written=false,rendered=false;
    const ctx={fillRect(){},fillText(){},drawImage(){},measureText(value){return {width:String(value).length*12};},beginPath(){},roundRect(){},fill(){},stroke(){},moveTo(){},lineTo(){},createLinearGradient(){return {addColorStop(){}};}};
    globals(t,{
        isSecureContext:true,
        Image:class {naturalWidth=100;naturalHeight=100;set src(value){queueMicrotask(()=>this.onload());}},
        document:{createElement(tag){assert.equal(tag,'canvas');return {getContext:()=>ctx,toBlob(cb){rendered=true;cb(new Blob(['png'],{type:'image/png'}));}};}},
        ClipboardItem:class {static supports(type){return type==='image/png';}constructor(values){this.values=values;}},
        navigator:{clipboard:{async write(items){written=true;assert.equal(rendered,false);assert.equal(items.length,1);const blob=await items[0].values['image/png'];assert.equal(blob.type,'image/png');assert.ok(blob.size>0);}}}
    });
    const pending=copyTrainingImage({petName:'測試',petId:81234,portrait:'https://newseer.61.com/web/monster/head/81234.png',appearance:'原始外觀',mode:'PVP',nature:'固執',iv:31,hpTraining:20,year:false,stats:{},ev:{},team:{},mintmarks:[],suit:'無',eye:'無',title:'無'});
    assert.equal(written,true);
    await pending;assert.equal(rendered,true);
});

test('unsupported clipboard fails before image generation',async t=>{
    globals(t,{isSecureContext:true,navigator:{clipboard:{}},ClipboardItem:class {}});
    await assert.rejects(copyTrainingImage({}),/請改用下載圖片/);
});

test('clipboard denial remains actionable for the caller',async t=>{
    globals(t,{isSecureContext:true,navigator:{clipboard:{write(){return Promise.reject(new DOMException('Denied','NotAllowedError'));}}},ClipboardItem:class {constructor(){}}});
    // An empty image request resolves without fetching a remote image in this test.
    globals(t,{document:{createElement(){return {getContext(){return {fillRect(){},fillText(){},drawImage(){},measureText(){return {width:0};},beginPath(){},roundRect(){},fill(){},stroke(){},moveTo(){},lineTo(){},createLinearGradient(){return {addColorStop(){}};}};},toBlob(cb){cb(new Blob(['png'],{type:'image/png'}));}};}},Image:class {naturalWidth=100;naturalHeight=100;set src(value){queueMicrotask(()=>this.onload());}}});
    await assert.rejects(copyTrainingImage({petName:'測試',portrait:'https://newseer.61.com/web/monster/head/81235.png',mode:'PVP',mintmarks:[],stats:{},ev:{},team:{}}),{name:'NotAllowedError'});
});

test('preview copy and download reuse the generated PNG without re-rendering',async t=>{
    const {downloadTrainingImage}=await import('../js/seer-training-export.js');
    const blob=new Blob(['preview png'],{type:'image/png'});
    let copied=false,downloaded=false;
    const link={click(){downloaded=true;},remove(){}};
    globals(t,{isSecureContext:true,ClipboardItem:class {constructor(values){this.values=values;}},navigator:{clipboard:{async write(items){assert.equal(await items[0].values['image/png'],blob);copied=true;}}},document:{body:{append(){}},createElement(tag){assert.equal(tag,'a');return link;}}});
    t.mock.method(URL,'createObjectURL',value=>{assert.equal(value,blob);return 'blob:preview';});
    t.mock.method(globalThis,'setTimeout',()=>0);
    await copyTrainingImage({},blob);
    await downloadTrainingImage({petName:'測試',mode:'PVE'},blob);
    assert.ok(copied && downloaded);assert.equal(link.download,'測試-PVE-培養.png');
});
