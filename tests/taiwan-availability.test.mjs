import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTaiwanExclusions, normalizeTaiwanExclusions, isTaiwanExcluded, matchesTaiwanPetProgress, matchesTaiwanSkinProgress, matchesTaiwanSuitProgress } from "../js/shared/taiwan-availability.js";

test("range input keeps inclusive ranges compact and accepts notes and full-width input", () => {
    const ranges = parseTaiwanExclusions("# 合作內容\n４１００１－４１０２０ ＃ 合作 A\n41308\n42000 至 43000\n");
    assert.deepEqual(ranges, [[41001, 41020], [41308, 41308], [42000, 43000]]);
    for (const id of [41001, 41020, 41308, 42000, 43000]) assert.equal(isTaiwanExcluded(id, ranges), true);
    for (const id of [41000, 41021, 41309, 43001]) assert.equal(isTaiwanExcluded(id, ranges), false);
    assert.deepEqual(parseTaiwanExclusions("1-9007199254740991"), [[1, Number.MAX_SAFE_INTEGER]]);
});

test("bad ranges cannot be silently saved or partially applied", () => {
    for (const value of ["0", "-1", "20-10", "1.5", "10,20", "1-2-3", "9007199254740992", "名稱"]) {
        assert.throws(() => parseTaiwanExclusions(`100\n${value}`), /第 2 行/);
    }
    assert.throws(() => normalizeTaiwanExclusions({pet: []}));
    assert.throws(() => normalizeTaiwanExclusions([]));
    assert.deepEqual(normalizeTaiwanExclusions(), {pet: "", skin: "", mintmark: "", suit: ""});
});

test("suit progress combines the inclusive cap and exclusions without changing legacy rules", () => {
    const value = normalizeTaiwanExclusions({pet: "20", suit: "30-40 # 合作", latestSuitId: 50});
    assert.equal(value.pet, "20");
    assert.equal(value.latestSuitId, 50);
    const settings = {latestSuitId: value.latestSuitId, excludedRanges: {suit: parseTaiwanExclusions(value.suit)}};
    for (const id of [1, 29, 41, 50]) assert.equal(matchesTaiwanSuitProgress({id}, settings), true);
    for (const id of [0, 30, 40, 51]) assert.equal(matchesTaiwanSuitProgress({id}, settings), false);
    assert.equal(matchesTaiwanSuitProgress({id: 30}, null), true);
    assert.equal(matchesTaiwanSuitProgress({id: 1}, {latestSuitId: null}), false);
    for (const latestSuitId of [0, -1, "50", 1.5]) assert.throws(() => normalizeTaiwanExclusions({latestSuitId}), /套裝編號/);
});

test("Taiwan filters combine progress, exclusions, pet 5000 exception and related skins", () => {
    const settings = { latestPetId: 100, latestSkinId: 300, excludedRanges: {pet: [[20, 30]], skin: [[200, 210]]} };
    assert.equal(matchesTaiwanPetProgress({id: 19}, settings), true);
    assert.equal(matchesTaiwanPetProgress({id: 20}, settings), false);
    assert.equal(matchesTaiwanPetProgress({id: 101}, settings), false);
    assert.equal(matchesTaiwanPetProgress({id: 5000}, settings), true);
    assert.equal(matchesTaiwanPetProgress({id: 0}, settings), false);
    assert.equal(matchesTaiwanSkinProgress({id: 199, pet: {id: 19}}, null, settings), true);
    assert.equal(matchesTaiwanSkinProgress({id: 200, pet: {id: 19}}, null, settings), false);
    assert.equal(matchesTaiwanSkinProgress({id: 199, pet: {id: 20}}, null, settings), false);
    assert.equal(matchesTaiwanSkinProgress({id: 301, pet: {id: 19}}, null, settings), false);
    assert.equal(matchesTaiwanPetProgress({id: 20}, null), true);
    assert.equal(matchesTaiwanSkinProgress({id: 200, pet: {id: 20}}, null, null), true);
    settings.excludedRanges.pet.push([5000, 5000]);
    assert.equal(matchesTaiwanPetProgress({id: 5000}, settings), false);
});
