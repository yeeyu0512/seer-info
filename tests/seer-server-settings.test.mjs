import { test } from "node:test";
import assert from "node:assert/strict";

let row;
let saved;
let selected;
const client = {
    from(name) {
        assert.equal(name, "seer_server_settings");
        const request = {
            select(fields) { selected = fields; return request; },
            update(payload) { saved = payload; return request; },
            eq(key, id) { assert.equal(key, "id"); assert.equal(id, 1); return request; },
            async single() { return { data: row, error: null }; },
        };
        return request;
    },
};
globalThis.window = { supabase: { createClient: () => client } };
const { getSeerServerSettings, updateSeerServerSettings } = await import("../js/seer-server-settings.js");

test("legacy schema still provides pet and skin progress without selecting a missing column", async () => {
    row = { latest_pet_id: 4900, latest_skin_id: 3000 };
    const settings = await getSeerServerSettings();
    assert.equal(selected, "*");
    assert.equal(settings.latestPetId, 4900);
    assert.equal(settings.latestSkinId, 3000);
    assert.equal(settings.latestMintmarkId, null);
    assert.equal(settings.hasMintmarkProgressField, false);
    assert.equal(settings.hasExclusionsField, false);
    assert.deepEqual(settings.excludedRanges, {pet: [], skin: [], mintmark: [], suit: []});
    assert.equal(settings.latestSuitId, null);
    await updateSeerServerSettings(4901, 3001);
    assert.equal(Object.hasOwn(saved, "latest_mintmark_id"), false);
    assert.equal(Object.hasOwn(saved, "taiwan_exclusions"), false);
});

test("exclusion rules round-trip with comments and reject invalid input before writing", async () => {
    const exclusions = {pet: "10-20 # 合作", skin: "30", mintmark: "41001-41020\n41308", suit: "300-310 # 合作", latestSuitId: 500};
    row = {latest_pet_id: 4900, latest_skin_id: 3000, taiwan_exclusions: exclusions};
    const settings = await getSeerServerSettings();
    assert.equal(settings.hasExclusionsField, true);
    assert.deepEqual(settings.exclusions, exclusions);
    assert.equal(settings.latestSuitId, 500);
    assert.deepEqual(settings.excludedRanges.suit, [[300, 310]]);
    assert.deepEqual(settings.excludedRanges.mintmark, [[41001, 41020], [41308, 41308]]);
    await updateSeerServerSettings(4900, 3000, undefined, exclusions);
    assert.deepEqual(saved.taiwan_exclusions, exclusions);
    const previous = saved;
    await assert.rejects(updateSeerServerSettings(4900, 3000, undefined, {pet: "20-10"}), /第 1 行/);
    assert.equal(saved, previous);
});
test("new field supports setting and clearing mintmark progress alongside existing settings", async () => {
    row = { latest_pet_id: "4900", latest_skin_id: "3000", latest_mintmark_id: "42729" };
    const settings = await getSeerServerSettings();
    assert.equal(settings.latestMintmarkId, 42729);
    assert.equal(settings.hasMintmarkProgressField, true);
    await updateSeerServerSettings(4900, 3000, 42729);
    assert.equal(saved.latest_pet_id, 4900);
    assert.equal(saved.latest_skin_id, 3000);
    assert.equal(saved.latest_mintmark_id, 42729);
    await updateSeerServerSettings(4900, 3000, null);
    assert.equal(saved.latest_mintmark_id, null);
});
