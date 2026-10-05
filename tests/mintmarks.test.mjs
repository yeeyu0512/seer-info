import assert from "node:assert/strict";
import { test } from "node:test";
import { selectMintmarks, fetchMintmarkCatalog, fetchMintmarkSeries, mintmarkCornerCount } from "../js/seer-mintmarks.js";

const records = [
    { id: 1, name: "攻擊", searchName: "攻击", type: { id: 3 }, max_attr_value: { atk: 30, total: 100 } },
    { id: 2, name: "速度", type: { id: 3 }, max_attr_value: { atk: 10, total: 120 } },
    { id: 3, name: "技能", type: { id: 1 }, max_attr_value: null },
    { id: 4, name: "隱藏", type: { id: 3 }, is_hidden: true },
];
test("catalog filters hidden records, searches both scripts and sorts maximum stats", () => {
    assert.deepEqual(selectMintmarks(records).map(x => x.id), [2, 1]);
    assert.deepEqual(selectMintmarks(records, { query: "攻击" }).map(x => x.id), [1]);
    assert.deepEqual(selectMintmarks(records, { query: "3", type: "all" }).map(x => x.id), [3]);
    assert.deepEqual(selectMintmarks(records, { sort: "atk" }).map(x => x.id), [1, 2]);
    assert.deepEqual(selectMintmarks(records, { sort: "total" }).map(x => x.id), [2, 1]);
    assert.equal(records[0].id, 1);
});
test("catalog follows pagination and deduplicates IDs", async () => {
    let calls = 0;
    const result = await fetchMintmarkCatalog(async () => ++calls === 1
        ? { results: records.slice(0, 2), count: 3, next: "https://api.seerapi.com/v1/mintmark?offset=2" }
        : { results: records.slice(1, 3), count: 3, next: null });
    assert.equal(calls, 2);
    assert.deepEqual(result.map(x => x.id), [1, 2, 3]);
});
test("Taiwan progress includes the boundary and excludes later IDs across searches and categories", () => {
    assert.deepEqual(selectMintmarks(records, { maxId: 1 }).map(x => x.id), [1]);
    assert.deepEqual(selectMintmarks(records, { maxId: 2, query: "速度" }).map(x => x.id), [2]);
    assert.deepEqual(selectMintmarks(records, { maxId: 2, type: "all" }).map(x => x.id), [2, 1]);
    assert.deepEqual(selectMintmarks(records, { maxId: 2, query: "3", type: "all" }).map(x => x.id), []);
    assert.deepEqual(selectMintmarks(records, { maxId: null, type: "all" }).map(x => x.id), [3, 2, 1]);
});
test("exclusive universal mintmarks are hidden unless enabled, without excluding skill mintmarks", () => {
    const exclusiveRecords = [
        ...records,
        { id: 5, name: "精靈專屬全能刻印", type: { id: 3 } },
        { id: 6, name: "精灵专属全能刻印", type: { id: 3 } },
        { id: 7, name: "限定刻印", type: { id: 3 }, pet: [{ id: 4950 }] },
        { id: 8, name: "專屬技能刻印", type: { id: 1 }, pet: [{ id: 4950 }] },
    ];
    assert.deepEqual(selectMintmarks(exclusiveRecords).map(x => x.id), [2, 1]);
    assert.deepEqual(selectMintmarks(exclusiveRecords, { showExclusive: true }).map(x => x.id), [7, 6, 5, 2, 1]);
    assert.deepEqual(selectMintmarks(exclusiveRecords, { type: "all" }).map(x => x.id), [8, 3, 2, 1]);
    assert.deepEqual(selectMintmarks(exclusiveRecords, { query: "專屬" }).map(x => x.id), []);
});
test("catalog rejects foreign pagination and cycles", async () => {
    await assert.rejects(fetchMintmarkCatalog(async () => ({ results: [], next: "https://example.com/v1/mintmark" })), /分頁/);
    await assert.rejects(fetchMintmarkCatalog(async url => ({ results: [], next: url })), /分頁/);
});

test("corner counts use nonzero maximum stats, ignore rarity and totals, and mark absent stats as inapplicable", () => {
    assert.equal(mintmarkCornerCount({ type: { id: 3 }, rarity: { id: 3 }, max_attr_value: { atk: 50, def: 35, sp_atk: 0, sp_def: 35, spd: 20, hp: 80, total: 220 } }), 5);
    assert.equal(mintmarkCornerCount({ type: { id: 0 }, max_attr_value: { sp_atk: 32, hp: 70, total: 102 } }), 2);
    assert.equal(mintmarkCornerCount({ type: { id: 1 }, max_attr_value: { sp_atk: 32, hp: 70 } }), null);
    assert.equal(mintmarkCornerCount({ max_attr_value: { total: 0 } }), null);
    assert.equal(mintmarkCornerCount({ max_attr_value: null }), null);
});

test("corner and series filters intersect with search, Taiwan progress and exclusive visibility", () => {
    const items = [
        { id: 1, name: "系列甲", type: { id: 3 }, mintmark_class: { id: 61 }, max_attr_value: { atk: 5, hp: 10 } },
        { id: 2, name: "系列乙", type: { id: 3 }, mintmark_class: { id: 62 }, max_attr_value: { atk: 5, hp: 10 } },
        { id: 3, name: "系列專屬", type: { id: 3 }, mintmark_class: { id: 61 }, max_attr_value: { atk: 5, hp: 10 } },
        { id: 4, name: "系列丙", type: { id: 3 }, mintmark_class: { id: 61 }, max_attr_value: { atk: 5, hp: 10, spd: 1 } },
        { id: 5, name: "技能", type: { id: 1 }, max_attr_value: null },
    ];
    assert.deepEqual(selectMintmarks(items, { corners: "2", series: "61", query: "系列", maxId: 3 }).map(x => x.id), [1]);
    assert.deepEqual(selectMintmarks(items, { corners: "2", series: "61", showExclusive: true }).map(x => x.id), [3, 1]);
    assert.deepEqual(selectMintmarks(items, { corners: "3", series: "61" }).map(x => x.id), [4]);
    assert.deepEqual(selectMintmarks(items, { type: "all", corners: "none", series: "none" }).map(x => x.id), [5]);
});

test("series loader follows validated pagination, deduplicates and keeps only IDs and names", async () => {
    let calls = 0;
    const result = await fetchMintmarkSeries(async () => ++calls === 1
        ? { results: [{ id: 61, name: "英雄之证系列", mintmark: [{ id: 42729 }] }], next: "https://api.seerapi.com/v1/mintmark_class?offset=1" }
        : { results: [{ id: 61, name: "英雄之证系列" }, { id: 62, name: "另一系列" }], next: null });
    assert.deepEqual(result, [{ id: 61, name: "英雄之证系列" }, { id: 62, name: "另一系列" }]);
    await assert.rejects(fetchMintmarkSeries(async () => ({ results: [], next: "https://example.com/v1/mintmark_class" })), /分頁/);
    await assert.rejects(fetchMintmarkSeries(async url => ({ results: [], next: url })), /分頁/);
    await assert.rejects(fetchMintmarkSeries(async () => ({ results: null })), /格式/);
});
