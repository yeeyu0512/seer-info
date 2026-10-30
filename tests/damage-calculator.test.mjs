import test from "node:test";
import assert from "node:assert/strict";
import { attackDamage, defenseDamage, calculateAttack, calculateDefense } from "../js/damage/core.js";

test("single-hit reference fixtures retain attack floor and defense staged ceiling", () => {
    assert.deepEqual(attackDamage({}, 600), { min: 295, max: 347, kill: false, effectiveAttack: 600, defense: 329 });
    assert.deepEqual(defenseDamage({}, 300), { min: 179, max: 275, naked: 179, tank: true, shell: false, attack: 329, effectiveDefense: 300 });
    assert.deepEqual(defenseDamage({ lockedCritical: true }, 300), { min: 233, max: 275, naked: 233, tank: true, shell: false, attack: 329, effectiveDefense: 300 });
});

test("minimum damage exactly equal to HP guarantees a kill; maximum equal to HP cannot guarantee survival", () => {
    assert.equal(attackDamage({ hp: 295 }, 600).kill, true);
    assert.equal(attackDamage({ hp: 296 }, 600).kill, false);
    assert.equal(defenseDamage({ hp: 275 }, 300).tank, false);
    assert.equal(defenseDamage({ hp: 276 }, 300).tank, true);
});

test("zero effectiveness and complete reductions allow zero red damage while fixed damage stays separate", () => {
    for (const input of [{ effectiveness: 0 }, { bossReduction: 100 }]) {
        assert.equal(attackDamage(input, 600).max, 0);
        assert.equal(attackDamage({ ...input, fixed: 30 }, 600).min, 30);
    }
    for (const input of [{ effectiveness: 0 }, { soulReduction: 100 }]) {
        assert.equal(defenseDamage(input, 300).max, 0);
        assert.equal(defenseDamage({ ...input, sharp: 100 }, 300).min, 65);
    }
});

test("shield and barrier subtract from their own damage categories", () => {
    assert.equal(defenseDamage({ shield: 10000, sharp: 100 }, 300).max, 65);
    assert.equal(defenseDamage({ shield: 10000, sharp: 100, barrier: 65 }, 300).max, 0);
    assert.equal(defenseDamage({ effectiveness: 0, sharp: 100, barrier: 1000 }, 300).min, 0);
});

test("named effects change damage and keep input panel stats unchanged", () => {
    const plain = attackDamage({}, 600);
    for (const input of [{ suit: "dark" }, { suit: "silver" }, { suit: "silverFirst" }, { stage: true }, { purple: true }, { critical: true }, { firePan: 3 }, { traitBonus: 50 }, { skillBonus: 50 }, { soulBonus: 50 }, { gem: 20 }]) {
        const result = attackDamage(input, 600);
        assert.ok(result.min > plain.min);
        assert.equal(result.effectiveAttack, plain.effectiveAttack);
    }
    const normal = defenseDamage({}, 300);
    for (const input of [{ suit: "glory" }, { suit: "celestial" }, { gold: true }, { immortal: true }, { reductionOrb: true }, { hard: true }, { soulReduction: 50 }]) {
        assert.ok(defenseDamage(input, 300).max < normal.max);
    }
    assert.equal(defenseDamage({ gold: true, immortal: true, reductionOrb: true, hard: true }, 300).max, 105);
});

test("range validation rejects invalid defense, reversed ranges, oversized work and bad percentages", () => {
    for (const defense of [0, -1, NaN, Infinity, "300", 1.5]) assert.throws(() => defenseDamage({}, defense), RangeError);
    for (const input of [{ from: 0 }, { from: 500, to: 499 }, { from: 1, to: 502 }, { bossRace: NaN }, { defenseStage: -7 }, { attackMultiplier: 0 }, { soulReduction: 101 }]) assert.throws(() => calculateDefense(input), RangeError);
    assert.throws(() => calculateAttack({ defenseMultiplier: 0 }), RangeError);
    assert.throws(() => calculateAttack({ suit: "unknown" }), RangeError);
    assert.equal(calculateAttack({ from: 1, to: 501 }).rows.length, 501);
    assert.deepEqual(calculateDefense({ from: 300, to: 302 }).rows.map(row => row.value), [300, 301, 302]);
});

test("defensive negative stages work and effective defense has a minimum of one", () => {
    assert.equal(defenseDamage({ defenseStage: -1 }, 300).effectiveDefense, 200);
    assert.equal(defenseDamage({ defenseStage: -6 }, 1).effectiveDefense, 1);
    assert.equal(attackDamage({ boost: 2, weaken: 1 }, 600).effectiveAttack, 800);
});

test("reverse attack and defense searches return the first passing integer with no off-by-one", () => {
    const attack = calculateAttack({ hp: 500 });
    assert.ok(attack.threshold > 1);
    assert.equal(attackDamage({ hp: 500 }, attack.threshold).kill, true);
    assert.equal(attackDamage({ hp: 500 }, attack.threshold - 1).kill, false);
    const defense = calculateDefense();
    assert.equal(defense.threshold, 82);
    assert.equal(defenseDamage({}, defense.threshold).tank, true);
    assert.equal(defenseDamage({}, defense.threshold - 1).tank, false);
});

test("reverse boundaries handle 1, cap, no solution and fixed lethal damage", () => {
    assert.equal(calculateAttack({ effectiveness: 0 }).threshold, null);
    assert.equal(calculateAttack({ effectiveness: 0, fixed: 1000 }).threshold, 1);
    assert.equal(calculateDefense({ soulReduction: 100 }).threshold, 1);
    assert.equal(calculateDefense({ effectiveness: 0, sharp: 1000, hp: 650 }).threshold, null);
    const hp = attackDamage({}, 1500).min;
    const result = calculateAttack({ hp });
    assert.ok(result.threshold <= result.cap);
    assert.equal(attackDamage({ hp }, result.threshold).kill, true);
});

test("shell range only describes the reference inequality, and blank HP skips all verdicts", () => {
    const result = calculateDefense({ hp: 100, soulReduction: 70 });
    assert.ok(result.shellRange);
    for (const value of result.shellRange) {
        const row = defenseDamage({ hp: 100, soulReduction: 70 }, value);
        assert.ok(row.max < 100 && 100 < row.naked);
    }
    assert.equal(calculateDefense({ hp: null }).threshold, null);
    assert.equal(calculateDefense({ hp: null }).shellRange, null);
    assert.equal(calculateAttack({ hp: null }).threshold, null);
    assert.equal(attackDamage({ hp: null }, 600).kill, false);
});

test("defense bounds stay ordered when critical-specific reductions exceed normal reductions", () => {
    for (const soulReduction of [0, 10, 70, 80, 85, 90, 100]) {
        const result = defenseDamage({ suit: "celestial", soulReduction }, 300);
        assert.ok(result.min <= result.max);
    }
});

