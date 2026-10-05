import assert from "node:assert/strict";
import { test } from "node:test";
import { groupMintmarksForExport } from "../js/seer-mintmark-export.js";
import { selectMintmarks } from "../js/seer-mintmarks.js";

test("export groups by series ID, preserves chosen ordering within groups and does not mutate records", () => {
    const records = [
        { id: 5, mintmark_class: { id: 62 } },
        { id: 4, mintmark_class: null },
        { id: 3, mintmark_class: { id: 61 } },
        { id: 2, mintmark_class: { id: 62 } },
        { id: 1, mintmark_class: { id: 61 } },
    ];
    const groups = groupMintmarksForExport(records, new Map([[61, "英雄之證系列"]]));
    assert.deepEqual(groups.map(group => [group.id, group.name, group.records.map(item => item.id)]), [
        [62, "系列 #62", [5, 2]], [61, "英雄之證系列", [3, 1]], [null, "未分類", [4]],
    ]);
    assert.deepEqual(records.map(item => item.id), [5, 4, 3, 2, 1]);
});

test("newest series comes first even when stat sorting puts its older member first; unclassified stays last", () => {
    const records = [
        { id: 42000, mintmark_class: { id: 97 } },
        { id: 41000, mintmark_class: { id: 61 } },
        { id: 42729, mintmark_class: { id: 61 } },
        { id: 50000, mintmark_class: null },
    ];
    const groups = groupMintmarksForExport(records);
    assert.deepEqual(groups.map(group => group.id), [61, 97, null]);
    assert.deepEqual(groups[0].records.map(record => record.id), [41000, 42729]);
});

test("export includes all filtered results across page boundaries and excludes hidden, exclusive and unreleased entries", () => {
    const records = Array.from({ length: 60 }, (_, index) => ({ id: index + 1, name: `刻印${index}`, type: { id: 3 }, mintmark_class: { id: 61 }, max_attr_value: { atk: 5, hp: 10 } }));
    records[0].is_hidden = true;
    records[1].pet = [{ id: 5000 }];
    const groups = groupMintmarksForExport(selectMintmarks(records, { maxId: 50, corners: "2", series: "61" }));
    assert.equal(groups[0].records.length, 48);
    assert.equal(groups[0].records[0].id, 50);
    assert.equal(groups[0].records.at(-1).id, 3);
    assert.deepEqual(groupMintmarksForExport([]), []);
});
