import test from "node:test";
import assert from "node:assert/strict";
import { encodeShareConfig, decodeShareConfig, createShareUrl, resolveShareConfig, createShareRestorer, MAX_BUILD_LENGTH } from "../js/training/share-config.js";
import { calculateTraining, zeroStats } from "../js/seer-training-core.js";
import { createSuitEyeDetector } from "../js/training/suit-equipment.js";

const config = () => ({v:1,pet:1,skin:2,nature:1,iv:31,ev:{...zeroStats(),atk:255,spd:255},team:zeroStats(),hp:20,year:true,mint:[3,null,4],suit:5,eye:6,title:7,mode:"PVP",awakened:true});
const stats = value => Object.fromEntries(Object.keys(zeroStats()).map(key => [key,value]));
const records = () => ({
    "pet/1":{id:1,name:"精靈",base_stats:stats(100),advance:{id:9}},
    "pet_skin/2":{id:2,name:"皮膚",pet:{id:1}},
    "nature/1":{id:1,name:"個性",attributes:{atk:10,sp_atk:-10}},
    "mintmark/3":{id:3,name:"刻印",max_attr_value:stats(10),mintmark_class:{id:1},pet:[{id:1}]},
    "mintmark/4":{id:4,name:"刻印2",max_attr_value:stats(20),mintmark_class:{id:1}},
    "suit/5":{id:5,name:"套裝",equips:[{id:8}],bonus:{attribute:{...stats(10),percent:true}}},
    "equip/8":{id:8,name:"部件",part_type:{id:2}},
    "equip/6":{id:6,name:"目鏡",part_type:{id:1},bonus:{attribute:stats(5)}},
    "title/7":{id:7,name:"稱號",attr_bonus:stats(5)},
    "pet_advance/9":{id:9,base_stats:stats(120)}
});
const dependencies = data => {const fetchCached = async url => {const key=url.split("/v1/")[1]; if (!data[key]) throw new Error("API 無法取得資料"); return data[key];}; return {fetchCached,suitHasEye:createSuitEyeDetector(fetchCached)};};

test("share round trips every field and drops unrelated URL information",() => {
    for (const mode of ["base","PVE","PVP"]) { const c={...config(),mode}; assert.deepEqual(decodeShareConfig(encodeShareConfig(c)),c); }
    const url=new URL(createShareUrl("https://example.com/seer-info/?token=secret&tab=home#auth",config()));
    assert.equal(url.pathname,"/seer-info/"); assert.equal(url.searchParams.get("tab"),"training");
    assert.deepEqual([...url.searchParams.keys()],["tab","build"]); assert.equal(url.hash,"");
});
test("malformed, oversized, unsupported and out-of-range configurations are rejected",() => {
    for (const encoded of ["", "%%%", "a".repeat(MAX_BUILD_LENGTH+1),btoa("null"),btoa("{")]) assert.throws(() => decodeShareConfig(encoded));
    for (const patch of [{v:2},{iv:32},{iv:1.5},{hp:21},{pet:-1},{year:1},{mode:"unknown"},{mint:[1,2]},{ev:{...zeroStats(),atk:255,spd:255,hp:1}},{team:{...zeroStats(),hp:31}},{team:{...zeroStats(),spd:-1}},{ev:{...zeroStats(),atk:256}},{personal:"secret"}]) assert.throws(() => encodeShareConfig({...config(),...patch}));
});
test("full restore resolves skin, slot order, equipment, awakening and recomputes editable results",async () => {
    const data=records(), applied=[],messages=[];
    const restorer=createShareRestorer({resolve:c => resolveShareConfig(c,dependencies(data)),onStatus:m => messages.push(m),apply:(c,r) => {
        applied.push({c,r});
        const result=calculateTraining({race:r.advance.base_stats,ev:c.ev,iv:c.iv,nature:r.nature.attributes,sources:[{stats:stats(50),modes:["PVE","PVP"]}],suit:{stats:r.suit.bonus.attribute,modes:["PVE","PVP"]},hpTraining:c.hp});
        assert.equal(result.PVP.hp,494);
        c.ev.atk=0;
        assert.ok(calculateTraining({race:r.advance.base_stats,ev:c.ev,iv:c.iv,nature:r.nature.attributes}).base.atk < result.base.atk);
    }});
    await restorer.restore(encodeShareConfig(config()));
    assert.equal(applied.length,1); assert.deepEqual(applied[0].r.mint.map(r => r?.id ?? null),[3,null,4]);
    assert.equal(applied[0].r.skin.id,2); assert.equal(applied[0].r.eye.id,6); assert.equal(applied[0].r.title.id,7);
    assert.match(messages.at(-1),/已還原/);
});
test("API failures and special restrictions fail before applying any state",async () => {
    for (const mutate of [d=>delete d["pet/1"],d=>d["pet_skin/2"].pet.id=9,d=>d["equip/8"].part_type.id=1,d=>d["equip/6"].part_type.id=2,d=>d["mintmark/3"].pet=[{id:9}],d=>delete d["pet/1"].advance,d=>delete d["pet_advance/9"].base_stats,d=>d["title/7"].attr_bonus.percent=true]) {
        const d=records();mutate(d);await assert.rejects(resolveShareConfig(config(),dependencies(d)));
    }
    await assert.rejects(resolveShareConfig({...config(),mint:[3,4,3]},dependencies(records())),/同系列/);
});
test("late restores and cancelled restores cannot replace newer selections",async () => {
    const pending=[],applied=[],messages=[];
    const restorer=createShareRestorer({resolve:c => new Promise(resolve=>pending.push(()=>resolve(c))),apply:c=>applied.push(c.pet),onStatus:m=>messages.push(m)});
    const old=restorer.restore(encodeShareConfig(config()));
    const next=restorer.restore(encodeShareConfig({...config(),pet:2}));pending[1]();await next;pending[0]();await old;
    assert.deepEqual(applied,[2]);
    const cancelled=restorer.restore(encodeShareConfig(config()));restorer.cancel();pending[2]();await cancelled;
    assert.deepEqual(applied,[2]);
    await restorer.restore("bad!");assert.match(messages.at(-1),/還原失敗/);
});
