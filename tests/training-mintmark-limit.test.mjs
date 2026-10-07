import { test } from "node:test";
import assert from "node:assert/strict";
import { canEquipMintmark } from "../js/training/mintmark-limit.js";

const mark = (id, series) => ({id, mintmark_class:series == null ? null : {id:series}});
test("two marks per series are allowed; a third is blocked even with a different mark ID", () => {
    const selected = new Map([["mint0",mark(1,10)]]);
    assert.equal(canEquipMintmark(selected,"mint1",mark(2,10)),true);
    selected.set("mint1",mark(2,10));
    assert.equal(canEquipMintmark(selected,"mint2",mark(3,10)),false);
    assert.equal(canEquipMintmark(selected,"mint2",mark(1,10)),false);
    assert.equal(canEquipMintmark(selected,"mint2",mark(3,20)),true);
});
test("replacement excludes the current slot, and unloading restores eligibility", () => {
    const selected = new Map([["mint0",mark(1,10)],["mint1",mark(2,"10")],["mint2",mark(3,20)]]);
    assert.equal(canEquipMintmark(selected,"mint0",mark(4,10)),true);
    assert.equal(canEquipMintmark(selected,"mint2",mark(4,10)),false);
    selected.delete("mint1");
    assert.equal(canEquipMintmark(selected,"mint2",mark(4,10)),true);
});
test("unclassified marks are not incorrectly grouped into one series", () => {
    const selected = new Map([["mint0",mark(1,null)],["mint1",mark(2,null)]]);
    assert.equal(canEquipMintmark(selected,"mint2",mark(3,null)),true);
    assert.equal(canEquipMintmark(selected,"mint2",mark(3,10)),true);
});
