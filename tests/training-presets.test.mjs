import test from "node:test";
import assert from "node:assert/strict";
import {EQUIPMENT_PRESETS,loadEquipmentPreset} from "../js/training/equipment-presets.js";

test("preset resolves the specified suit, face equipment and title in stable order",async () => {
    const calls = [];
    const records = await loadEquipmentPreset(EQUIPMENT_PRESETS[0],async url => {
        calls.push(url); const id = Number(url.split("/").at(-1)); return {id,name:"裝備",part_type:{id:1}};
    });
    assert.deepEqual(records.map(([kind,record]) => [kind,record.id]),[["suit",447],["eye",1301040],["title",300]]);
    assert.equal(calls.length,3);
});
test("a missing or invalid preset item rejects the whole batch",async () => {
    await assert.rejects(loadEquipmentPreset(EQUIPMENT_PRESETS[0],async url => {
        const id = Number(url.split("/").at(-1)); return {id,name:"裝備",part_type:{id:2}};
    }),/資料無效/);
    await assert.rejects(loadEquipmentPreset(EQUIPMENT_PRESETS[0],async url => {
        if (url.includes("title/")) throw new Error("offline");
        return {id:Number(url.split("/").at(-1)),name:"裝備",part_type:{id:1}};
    }),/offline/);
});
