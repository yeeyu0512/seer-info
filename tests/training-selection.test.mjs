import test from "node:test";
import assert from "node:assert/strict";
import {searchTrainingPets} from "../js/training/pet-search.js";
import {createTrainingImages} from "../js/training/images.js";

const simplified = value => value.replaceAll("驚濤", "惊涛");
test("pet search normalizes separators and prioritizes exact matches", async () => {
    const pets = [{id:3506,name:"惊涛海皇·波塞冬"},{id:2354,name:"波塞冬"},{id:1,name:"其他"}];
    const fetchCached = async () => ({results:pets,count:3});
    assert.deepEqual((await searchTrainingPets("波塞冬",{fetchCached,simplified})).records.map(p => p.id),[2354,3506]);
    assert.deepEqual((await searchTrainingPets("驚濤海皇 波塞冬",{fetchCached,simplified})).records.map(p => p.id),[3506]);
    assert.deepEqual((await searchTrainingPets("波塞冬 驚濤",{fetchCached,simplified})).records.map(p => p.id),[3506]);
    let url;
    await searchTrainingPets("３５０６",{simplified,fetchCached:async value => { url = value; return pets[0]; }});
    assert.equal(url,"https://api.seerapi.com/v1/pet/3506");
});

class TestImage extends EventTarget {
    isConnected = true;
    complete = true;
    naturalWidth = 0;
    removeAttribute() { this.src = ""; }
    getAttribute() { return this.src; }
    fail() { this.dispatchEvent(new Event("error")); }
}
const image = () => new TestImage();
test("skin 702 uses pet 164 only for its thumbnail", async () => {
    const images = createTrainingImages({simplified,fetchCached:async () => ({results:[]})});
    const skin = {id:702,name:"闪光皮皮",pet:{id:4732},category:{id:0}};
    const head = image(), body = image();
    images.set(head,{id:1400702,skin});
    images.set(body,{id:1400702,skin,kind:"body"});
    assert.equal(head.src,"https://newseer.61.com/web/monster/head/164.png");
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(body.src,"https://newseer.61.com/web/monster/body/1400702.png");
});
test("original skin uses exact-name pet image and shares the lookup", async () => {
    let requests = 0;
    const images = createTrainingImages({simplified,fetchCached:async () => {requests++; return {results:[{id:2354,name:"波塞冬"},{id:3506,name:"惊涛海皇·波塞冬"}]}; }});
    const skin = {id:859,name:"波塞冬",pet:{id:3506},category:{id:0}};
    const head = image(),body = image();
    images.set(head,{id:1400859,skin}); images.set(body,{id:1400859,skin,kind:"body"});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(head.src,"https://newseer.61.com/web/monster/head/2354.png");
    assert.equal(body.src,"https://newseer.61.com/web/monster/body/2354.png");
    assert.equal(requests,1);
});
test("late image fallback cannot replace a newly selected appearance", async () => {
    let finish;
    const images = createTrainingImages({simplified,fetchCached:() => new Promise(resolve => {finish = resolve;})});
    const img = image();
    images.set(img,{id:1400859,skin:{name:"波塞冬",category:{id:0}}});
    images.set(img,{id:523});
    finish({results:[{id:2354,name:"波塞冬"}]});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(img.src,"https://newseer.61.com/web/monster/head/523.png");
});
test("failed skin images retry the same path before trying the existing original image fallback", async t => {
    t.mock.timers.enable({apis:["setTimeout"]});
    const images = createTrainingImages({simplified,fetchCached:async () => ({results:[{id:2354,name:"波塞冬"}]})});
    const img = image(); images.set(img,{id:1400859,skin:{name:"波塞冬"}});
    img.fail();
    t.mock.timers.tick(300);
    assert.equal(img.src,"https://newseer.61.com/web/monster/head/1400859.png?skin_retry=1");
    img.fail();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(img.src,"https://newseer.61.com/web/monster/head/2354.png");
    img.fail();
    t.mock.timers.tick(300);
    assert.equal(img.src,"https://newseer.61.com/web/monster/head/2354.png?skin_retry=1");
    img.fail();
    assert.equal(img.hidden,true);
});
test("clearing a pet invalidates pending skin images", async () => {
    let finish;
    const images = createTrainingImages({simplified,fetchCached:() => new Promise(resolve => {finish = resolve;})});
    const img = image(); images.set(img,{id:1400859,skin:{name:"波塞冬",category:{id:0}}});
    images.clear(img); finish({results:[{id:2354,name:"波塞冬"}]});
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(img.hidden,true); assert.equal(img.src,"");
});
