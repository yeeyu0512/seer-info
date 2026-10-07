import { test } from "node:test";
import assert from "node:assert/strict";
import { fillLearningEffort } from "../js/training/learning-effort.js";
import { zeroStats } from "../js/seer-training-core.js";

test("fill allocates remaining EVs to one stat while preserving other allocations", () => {
    const ev = {...zeroStats(), sp_atk:200, hp:100, spd:20};
    assert.equal(fillLearningEffort(ev, "spd"),210);
    assert.deepEqual(ev, {...zeroStats(), sp_atk:200, hp:100, spd:20});
    assert.equal(fillLearningEffort({...ev, spd:210}, "spd"),210);
});
test("fill respects the 255 target cap even if the total cannot reach 510", () => {
    assert.equal(fillLearningEffort(zeroStats(), "spd"),255);
    assert.equal(fillLearningEffort({...zeroStats(), sp_atk:100, spd:250}, "spd"),255);
    assert.equal(fillLearningEffort({...zeroStats(), hp:255, atk:254}, "spd"),1);
});
test("full, overallocated or invalid inputs are not silently redistributed", () => {
    for (const ev of [{...zeroStats(),hp:255,atk:255}, {...zeroStats(),hp:255,atk:255,spd:5}, {...zeroStats(),atk:NaN}, {...zeroStats(),hp:-1}, {...zeroStats(),atk:256}, {...zeroStats(),atk:1.5}]) {
        assert.equal(fillLearningEffort(ev,"spd"),ev.spd);
    }
    assert.throws(()=>fillLearningEffort(zeroStats(),"invalid"));
});
