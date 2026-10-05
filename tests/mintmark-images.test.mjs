import { test } from "node:test";
import assert from "node:assert/strict";
import { MintmarkImageQueue, mintmarkSourceUrl } from "../js/seer-mintmark-images.js";

test("only positive integer IDs form official source URLs", () => {
    assert.equal(mintmarkSourceUrl(42415), "https://seer.61.com/resource/countermark/icon/42415.swf");
    for (const value of [0, -1, 1.5, "../x", "https://example.com", Infinity]) assert.throws(() => mintmarkSourceUrl(value));
});
test("concurrent duplicate IDs share one conversion and cached results", async () => {
    const calls = [];
    const queue = new MintmarkImageQueue(async id => { calls.push(id); return `png:${id}`; }, { delay: 0 });
    const [a, b, c] = await Promise.all([queue.get(1), queue.get(1), queue.get(2)]);
    assert.deepEqual([a, b, c], ["png:1", "png:1", "png:2"]);
    assert.deepEqual(calls, [1, 2]);
    await queue.get(1);
    assert.equal(calls.length, 2);
});
test("conversion is serial, skips invisible requests, and permits visible duplicate consumers", async () => {
    let concurrent = 0, peak = 0;
    const calls = [];
    const queue = new MintmarkImageQueue(async id => {
        peak = Math.max(peak, ++concurrent); calls.push(id);
        await new Promise(resolve => setTimeout(resolve, 5));
        concurrent--; return `png:${id}`;
    }, { delay: 0 });
    await Promise.all([queue.get(1), queue.get(2), queue.get(3, () => false)]);
    assert.equal(peak, 1);
    assert.deepEqual(calls, [1, 2]);
    assert.equal(queue.cache.has(3), false);
    await Promise.all([queue.get(3, () => false), queue.get(3, () => true)]);
    assert.deepEqual(calls, [1, 2, 3]);
});
test("failures are remembered for this page and memory cache stays bounded", async () => {
    let calls = 0;
    const queue = new MintmarkImageQueue(async id => { calls++; if (id === 1) throw Error("404"); return `png:${id}`; }, { delay: 0, limit: 2 });
    assert.equal(await queue.get(1), null);
    assert.equal(await queue.get(1), null);
    assert.equal(calls, 1);
    await queue.get(2); await queue.get(3);
    assert.equal(queue.cache.size, 2);
});
