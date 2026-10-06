import assert from "node:assert/strict";
import { test } from "node:test";
import { selectSuits, fetchSuitCatalog, suitBattleModes } from "../js/seer-suits.js";
import { suitPartSourceUrl, prepareSuitSwf, createSuitImageService } from "../js/seer-suit-images.js";

test("battle modes respect restrictions and exclusions for ability suits only", () => {
    const modes = desc => suitBattleModes({ bonus: { desc } });
    assert.deepEqual(modes("（僅限賽爾與BOSS間對戰）"), ["PVE"]);
    assert.deepEqual(modes("（仅限赛尔与赛尔间对战）"), ["PVP"]);
    assert.deepEqual(modes("（PVE無效，聖芒佑界戰盔額外效果：命中+15%）"), ["PVP"]);
    assert.deepEqual(modes("（pvp 不适用）"), ["PVE"]);
    assert.deepEqual(modes("所有對戰有效"), ["PVE", "PVP"]);
    assert.deepEqual(modes("僅限PVE，但BOSS無效"), []);
    assert.deepEqual(suitBattleModes({ bonus: null, suit_desc: "套裝介紹" }), []);
});

test("battle filters combine with common suits and include suits supporting both modes", () => {
    const records = [
        {id:474, name:"雙模式", bonus:{desc:"所有對戰有效"}},
        {id:448, name:"BOSS", bonus:{desc:"僅限賽爾與BOSS間對戰"}},
        {id:447, name:"玩家", bonus:{desc:"PVE無效"}},
        {id:479, name:"其他", bonus:{desc:"所有對戰有效"}},
        {id:478, name:"炫酷", bonus:null}
    ];
    assert.deepEqual(selectSuits(records,{effect:"common",battleMode:"PVE"}).map(r=>r.id),[474,448]);
    assert.deepEqual(selectSuits(records,{effect:"common",battleMode:"PVP"}).map(r=>r.id),[474,447]);
    assert.deepEqual(selectSuits(records,{battleMode:"PVE",query:"479"}).map(r=>r.id),[479]);
    assert.deepEqual(selectSuits(records,{effect:"appearance",battleMode:"PVP"}),[]);
});

test("suit search supports both scripts, effect filters and new-to-old sorting", () => {
    const records = [
        { id: 1, name: "新手裝", searchName: "新手装", bonus: null },
        { id: 479, name: "帝皇戰甲", searchName: "帝皇战甲", bonus: { desc: "攻擊+60" } },
        { id: 478, name: "酷酷鯊套裝", bonus: null }
    ];
    assert.deepEqual(selectSuits(records).map(item => item.id), [479, 478, 1]);
    assert.deepEqual(selectSuits(records, { query: "战甲" }).map(item => item.id), [479]);
    assert.deepEqual(selectSuits(records, { query: "戰甲" }).map(item => item.id), [479]);
    assert.deepEqual(selectSuits(records, { effect: "appearance", sort: "oldest" }).map(item => item.id), [1, 478]);
    assert.deepEqual(selectSuits(records, { effect: "bonus", query: "479" }).map(item => item.id), [479]);
    assert.equal(records[0].id, 1);
});

test("catalog follows API pages and rejects loops and foreign next links", async () => {
    let count = 0;
    const records = await fetchSuitCatalog(async () => ++count === 1
        ? { results: [{ id: 1, name: "一" }], next: "https://api.seerapi.com/v1/suit?offset=1" }
        : { results: [{ id: 1, name: "一" }, { id: 2, name: "二" }], next: null });
    assert.deepEqual(records.map(item => item.id), [1, 2]);
    await assert.rejects(fetchSuitCatalog(async () => ({ results: [], next: "https://example.com/" })), /分頁網址/);
    await assert.rejects(fetchSuitCatalog(async url => ({ results: [], next: url })), /分頁網址/);
});

test("SWF preparation expands bounds and removes author-stage placement", async () => {
    // One-frame FWS containing a PlaceObject2 with an authoring-stage matrix and name.
    const raw = new Uint8Array([70,87,83,10,0,0,0,0,8,0,0,12,1,0,137,6,38,1,0,2,0,0,97,0,0,64,0,0,0]);
    new DataView(raw.buffer).setUint32(4, raw.length, true);
    const output = await prepareSuitSwf(raw);
    assert.equal(String.fromCharCode(...output.slice(0, 3)), "FWS");
    assert.equal(new DataView(output.buffer).getUint32(4, true), output.length);
    const start = 8 + Math.ceil((5 + 4 * (output[8] >> 3)) / 8) + 4;
    assert.deepEqual([...output.slice(start, start + 8)], [134,6,6,1,0,2,0,0]);
    await assert.rejects(prepareSuitSwf(new Uint8Array(8)), /無效 SWF/);
    assert.equal(suitPartSourceUrl(1301167), "https://seer.61.com/resource/item/cloth/prev/1301167.swf");
    assert.throws(() => suitPartSourceUrl(-1));
});

test("unselected suits make no requests and shared equipment metadata is reused", async () => {
    let requests = 0;
    const service = createSuitImageService(async () => { requests++; return { id: 12, name: "部件", part_type: { id: 0 } }; });
    const record = { id: 1, equips: [{ id: 12 }] };
    assert.equal(await service.image(record, () => false), undefined);
    assert.equal(requests, 0);
    await Promise.all([service.equips(record), service.equips(record)]);
    assert.equal(requests, 1);
    await service.equips(record);
    assert.equal(requests, 1);
});

test("wrapper previews instantiate the exported item instead of the authoring container", async () => {
    const raw = new Uint8Array([70,87,83,9,0,0,0,0,8,0,0,12,1,0,
        134,6,6,1,0,5,0,0,
        9,19,1,0,4,0,105,116,101,109,0,
        64,0,0,0]);
    new DataView(raw.buffer).setUint32(4, raw.length, true);
    const output = await prepareSuitSwf(raw);
    const start = 8 + Math.ceil((5 + 4 * (output[8] >> 3)) / 8) + 4;
    assert.equal(new DataView(output.buffer).getUint16(start + 5, true), 4);
});
