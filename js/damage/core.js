import { ATTACK_SUITS, DEFENSE_SUITS } from "./models.js";

export const ATTACK_DEFAULTS = Object.freeze({ bossRace: 150, effectiveness: 1, boost: 0, weaken: 0, bossBoost: 0, defenseMultiplier: 1, power: 150, skillMultiplier: 1, gem: 0, skillBonus: 0, traitBonus: 0, soulBonus: 0, firePan: 0, fixed: 0, bossReduction: 0, from: 600, to: 620, hp: 1000, native: true, suit: "none", critical: false, stage: false, purple: false });
export const DEFENSE_DEFAULTS = Object.freeze({ bossRace: 150, effectiveness: 1, power: 150, attackMultiplier: 1, bossBoost: 0, defenseStage: 0, soulReduction: 0, sharp: 0, shield: 0, barrier: 0, from: 300, to: 320, hp: 1000, lockedCritical: false, suit: "none", gold: false, immortal: false, reductionOrb: false, hard: false });

function check(value, label, min = 0, max = 1000000, integer = false) {
    if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new RangeError(`${label}請輸入 ${min}～${max} 的${integer ? "整數" : "數值"}。`);
}

export function validate(input, mode) {
    if (!["attack", "defense"].includes(mode)) throw new RangeError("未知計算模式。");
    const defaults = mode === "attack" ? ATTACK_DEFAULTS : DEFENSE_DEFAULTS;
    const p = { ...defaults, ...input };
    for (const [key, value] of Object.entries(defaults)) {
        if (key === "hp" && p.hp === null) continue;
        if (typeof value === "boolean") {
            if (typeof p[key] !== "boolean") throw new RangeError("選項設定無效。");
        } else if (typeof value === "number" && key !== "defenseStage") check(p[key], key);
    }
    check(p.bossRace, "BOSS 種族值", 0, 1000, true);
    check(p.effectiveness, "克制倍率", 0, 4);
    check(p.power, "技能威力", 1, 10000);
    check(p.from, "範圍起點", 1, 1000000, true);
    check(p.to, "範圍終點", p.from, 1000000, true);
    if (p.to - p.from > 500) throw new RangeError("攻防範圍的跨度最多 500，請縮小範圍。");
    if (p.hp !== null) check(p.hp, "體力", 1, 1000000, true);
    for (const key of mode === "attack" ? ["boost", "weaken", "bossBoost"] : ["bossBoost"]) check(p[key], "強化／弱化等級", 0, 6, true);
    if (mode === "defense") check(p.defenseStage, "我方能力等級", -6, 6, true);
    for (const key of mode === "attack" ? ["skillBonus", "traitBonus", "soulBonus", "bossReduction"] : ["soulReduction"]) check(p[key], "百分比", 0, 100);
    for (const key of mode === "attack" ? ["defenseMultiplier", "skillMultiplier"] : ["attackMultiplier"]) check(p[key], "能力／傷害倍數", 0.01, 100);
    if (mode === "attack") {
        check(p.firePan, "火潘層數", 0, 3, true);
        check(p.gem, "威力寶石", 0, 1000);
        check(p.fixed, "附加粉傷", 0, 1000000, true);
    } else {
        for (const key of ["sharp", "shield", "barrier"]) check(p[key], "固傷／護盾／護罩", 0, 1000000, true);
    }
    if (!Object.hasOwn(mode === "attack" ? ATTACK_SUITS : DEFENSE_SUITS, p.suit)) throw new RangeError("請選擇有效套裝。");
    return p;
}

export function attackDamage(input, attack) {
    const p = validate(input, "attack");
    check(attack, "攻擊／特攻", 1, 1000000, true);
    const effectiveAttack = Math.floor(attack * (2 + p.boost) / (2 + p.weaken));
    const defense = Math.ceil((p.bossRace * 2 + 29) * (2 + p.bossBoost) / 2);
    const base = (42 * (p.power + p.gem) * effectiveAttack / (defense * 50 * p.defenseMultiplier) + 2) * (p.native ? 1.5 : 1) * p.effectiveness * p.skillMultiplier;
    const bonus = (1 + ATTACK_SUITS[p.suit].bonus + 0.5 * p.firePan + p.skillBonus / 100 + p.soulBonus / 100) * (p.stage ? 2.3 : 1) * (1 + p.traitBonus / 100) * (p.purple ? 1.25 : 1);
    const red = base * bonus * (1 - p.bossReduction / 100) * (p.critical ? 2 : 1);
    const min = Math.floor(red * 217 / 255) + p.fixed;
    const max = Math.floor(red) + p.fixed;
    return { min, max, kill: p.hp !== null && min >= p.hp, effectiveAttack, defense };
}

export function defenseDamage(input, defense) {
    const p = validate(input, "defense");
    check(defense, "防禦／特防", 1, 1000000, true);
    const attack = Math.floor(Math.floor((p.bossRace * 2 + 29) * p.attackMultiplier) * (2 + p.bossBoost) / 2);
    const effectiveDefense = Math.max(1, Math.floor(defense * (p.defenseStage >= 0 ? (2 + p.defenseStage) / 2 : 2 / (2 - p.defenseStage))));
    const base = (0.84 * attack * p.power / effectiveDefense + 2) * p.effectiveness * 1.5;
    const other = (p.gold ? 0.75 : 1) * (p.immortal ? 0.75 : 1) * (p.reductionOrb ? 0.75 : 1) * (p.hard ? 0.9 : 1);
    const suit = DEFENSE_SUITS[p.suit];
    const fixed = Math.max(0, p.sharp * 0.65 - p.barrier);
    const scenario = (roll, critical) => {
        const reduction = Math.min(1, (critical ? suit.critical : suit.normal) + p.soulReduction / 100);
        const red = Math.ceil(Math.ceil(base * roll) * (critical ? 1.3 : 1) * (1 - reduction) * other);
        return Math.ceil(Math.max(0, red - p.shield) + fixed);
    };
    const endpoints = [scenario(217 / 255, true), scenario(1, true)];
    if (!p.lockedCritical) endpoints.push(scenario(217 / 255, false), scenario(1, false));
    const min = Math.min(...endpoints), max = Math.max(...endpoints);
    const naked = p.lockedCritical ? Math.ceil(Math.ceil(base * 217 / 255) * 1.3) : Math.ceil(base * 217 / 255);
    const tank = p.hp !== null && max < p.hp;
    return { min, max, naked, tank, shell: tank && p.hp < naked, attack, effectiveDefense };
}

function firstPassing(predicate, cap) {
    if (!predicate(cap)) return null;
    let low = 1, high = cap;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (predicate(mid)) high = mid;
        else low = mid + 1;
    }
    return low;
}

export function calculateAttack(input = {}) {
    const p = validate(input, "attack");
    const cap = Math.max(1500, p.to);
    const threshold = p.hp === null ? null : firstPassing(value => attackDamage(p, value).kill, cap);
    const rows = Array.from({ length: p.to - p.from + 1 }, (_, i) => ({ value: p.from + i, ...attackDamage(p, p.from + i) }));
    return { rows, threshold, cap, hp: p.hp };
}

export function calculateDefense(input = {}) {
    const p = validate(input, "defense");
    const cap = 1500;
    const threshold = p.hp === null ? null : firstPassing(value => defenseDamage(p, value).tank, cap);
    const shellValues = [];
    if (p.hp !== null) for (let value = 1; value <= cap; value++) if (defenseDamage(p, value).shell) shellValues.push(value);
    const rows = Array.from({ length: p.to - p.from + 1 }, (_, i) => ({ value: p.from + i, ...defenseDamage(p, p.from + i) }));
    return { rows, threshold, shellRange: shellValues.length ? [shellValues[0], shellValues.at(-1)] : null, cap, hp: p.hp };
}

