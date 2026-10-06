import { test } from "node:test";
import assert from "node:assert/strict";
import { zeroStats, trainingBaseStats, trainingModes, calculateTraining } from "../js/seer-training-core.js";

test("personality preserves learning fractions and exact integer boundaries", () => {
    const race = {...zeroStats(), sp_atk:132, hp:180};
    assert.equal(trainingBaseStats(race,{...zeroStats(),sp_atk:254},31,{sp_atk:10}).sp_atk,399);
    assert.equal(trainingBaseStats(race,{...zeroStats(),sp_atk:255},31,{sp_atk:10}).sp_atk,400);
    assert.equal(trainingBaseStats(race,zeroStats(),31,{hp:10}).hp,501);
});
test("three engravings and title/lens additions are included before suit percentage", () => {
    const race = {...zeroStats(),atk:100};
    const sources = [10,20,30,50,30].map(atk => ({stats:{...zeroStats(),atk},modes:["PVE","PVP"]}));
    const result = calculateTraining({race,ev:zeroStats(),sources,suit:{stats:{...zeroStats(),atk:8,percent:true},modes:["PVE"]}});
    assert.equal(result.base.atk,236);
    assert.equal(result.PVE.atk,406);
    assert.equal(result.PVP.atk,376);
});
test("fixed suit bonuses and per-mode additions are independent", () => {
    const result = calculateTraining({race:zeroStats(),ev:zeroStats(),sources:[{stats:{...zeroStats(),hp:40},modes:["PVP"]}],suit:{stats:{...zeroStats(),hp:60,percent:false},modes:["PVE"]}});
    assert.equal(result.PVE.hp,201);
    assert.equal(result.PVP.hp,181);
});
test("invalid EV allocation cannot produce plausible results", () => {
    const args = {race:zeroStats(),ev:zeroStats()};
    assert.throws(() => calculateTraining({...args,ev:{...args.ev,atk:256}}),/255/);
    assert.throws(() => calculateTraining({...args,ev:{...args.ev,atk:255,spd:255,hp:1}}),/510/);
    assert.throws(() => calculateTraining({...args,iv:NaN}),/個體/);
    assert.throws(() => calculateTraining({...args,ev:{...args.ev,hp:1.5}}),/整數/);
});
test("HP-limit cultivation adds at most 20 after suit scaling and leaves other stats unchanged", () => {
    const args = {race:{...zeroStats(),hp:166},ev:zeroStats(),suit:{stats:{...zeroStats(),hp:8,percent:true},modes:["PVE"]}};
    const baseline = calculateTraining(args);
    const trained = calculateTraining({...args,hpTraining:20});
    assert.equal(trained.PVE.hp - baseline.PVE.hp,20);
    assert.equal(trained.PVP.hp - baseline.PVP.hp,20);
    assert.deepEqual(trained.base,baseline.base);
    assert.equal(trained.PVE.atk,baseline.PVE.atk);
    for (const hpTraining of [-1,21,1.5,NaN]) assert.throws(() => calculateTraining({...args,hpTraining}),/體力上限/);
});
test("equipment occasions override descriptive text and support both scripts", () => {
    assert.deepEqual(trainingModes({occasion:{id:1}},"全部战斗有效"),["PVP"]);
    assert.deepEqual(trainingModes({occasion:{id:2}}),["PVE"]);
    assert.deepEqual(trainingModes(null,"（PVE無效）"),["PVP"]);
    assert.deepEqual(trainingModes(null,"仅限赛尔与赛尔之间对战"),["PVP"]);
    assert.deepEqual(trainingModes(null,"所有對戰有效"),["PVE","PVP"]);
});
