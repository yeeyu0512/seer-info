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
    await updateSeerServerSettings(4901, 3001);
    assert.equal(Object.hasOwn(saved, "latest_mintmark_id"), false);
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
