import assert from "node:assert/strict";
import { test } from "node:test";
import { selectMintmarks, fetchMintmarkCatalog } from "../js/seer-mintmarks.js";

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
