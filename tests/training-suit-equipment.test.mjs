import test from "node:test";
import assert from "node:assert/strict";
import {createSuitEyeDetector} from "../js/training/suit-equipment.js";

test("suit eye detection uses part types and reuses resolved requests",async () => {
    let requests = 0;
    const detect = createSuitEyeDetector(async url => {requests++; return {id:Number(url.split("/").at(-1)),part_type:{id:1}};});
    assert.equal(await detect({id:1,equips:[{id:100}]}),true);
    assert.equal(await detect({id:1,equips:[{id:100}]}),true);
    assert.equal(requests,1);
    assert.equal(await detect({id:2,equips:[{id:200,part_type:{id:2}},{id:201,part_type:{id:5}}]}),false);
    assert.equal(requests,1);
});
test("failed detection is retryable and does not assume a missing part is safe",async () => {
    let attempts = 0;
    const detect = createSuitEyeDetector(async () => {if (++attempts === 1) throw new Error("offline"); return {id:100,part_type:{id:1}};});
    const suit = {id:1,equips:[{id:100}]};
    await assert.rejects(detect(suit),/offline/);
    assert.equal(await detect(suit),true);
});
