export const TRAINING_STATS = [["atk", "攻擊"], ["sp_atk", "特攻"], ["def", "防禦"], ["sp_def", "特防"], ["spd", "速度"], ["hp", "體力"]];
export const zeroStats = () => Object.fromEntries(TRAINING_STATS.map(([key]) => [key, 0]));

export function trainingBaseStats(race, ev, iv = 31, nature = {}) {
    // Keep EV fractions through the personality correction; integer arithmetic
    // also avoids 1.1 floating-point errors at exact integer boundaries.
    return Object.fromEntries(TRAINING_STATS.map(([key]) => [key, key === "hp"
        ? Math.floor((8 * race[key] + 4 * iv + ev[key] + 440) / 4)
        : Math.floor((8 * race[key] + 4 * iv + ev[key] + 20) * (100 + (nature[key] || 0)) / 400)]));
}

export function trainingModes(record, description = "") {
    if (record?.occasion?.id === 1) return ["PVP"];
    if (record?.occasion?.id === 2) return ["PVE"];
    const text = description.replace(/\s/g, "").toUpperCase().replace(/[賽爾僅與間對戰無]/g, c => ({賽:"赛",爾:"尔",僅:"仅",與:"与",間:"间",對:"对",戰:"战",無:"无"})[c]);
    const onlyPve = /(?:仅限|只限|只在)(?:赛尔与)?(?:BOSS|PVE)/.test(text);
    const onlyPvp = /(?:仅限|只限|只在)(?:赛尔与赛尔|PVP|玩家)/.test(text);
    const noPve = /(?:PVE|BOSS)(?:之间对战|间对战|对战)?(?:中)?[：:]?(?:无效|不生效|不适用)/.test(text);
    const noPvp = /(?:PVP|玩家对战|赛尔与赛尔(?:之间|间)对战)(?:中)?[：:]?(?:无效|不生效|不适用)/.test(text);
    return [!noPve && !onlyPvp && "PVE", !noPvp && !onlyPve && "PVP"].filter(Boolean);
}

export function calculateTraining({ race, ev, iv = 31, nature = {}, sources = [], suit = null, hpTraining = 0 }) {
    if (!Number.isInteger(iv) || iv < 0 || iv > 31) throw new Error("個體值需為 0～31 的整數。");
    if (!Number.isInteger(hpTraining) || hpTraining < 0 || hpTraining > 20) throw new Error("體力上限培養需為 0～20 的整數。");
    for (const [key] of TRAINING_STATS) {
        if (!Number.isFinite(race[key]) || race[key] < 0) throw new Error("精靈種族值不完整。");
        if (!Number.isInteger(ev[key]) || ev[key] < 0 || ev[key] > 255) throw new Error("各項學習力需為 0～255 的整數。");
    }
    if (TRAINING_STATS.reduce((sum, [key]) => sum + ev[key], 0) > 510) throw new Error("學習力總和不能超過 510。");
    const base = trainingBaseStats(race, ev, iv, nature);
    const result = { base };
    for (const mode of ["PVE", "PVP"]) {
        const fixed = zeroStats();
        for (const source of sources) {
            if (!source.modes.includes(mode)) continue;
            for (const [key] of TRAINING_STATS) fixed[key] += Number(source.stats[key]) || 0;
        }
        const activeSuit = suit?.modes.includes(mode) ? suit.stats : null;
        result[mode] = Object.fromEntries(TRAINING_STATS.map(([key]) => [key,
            activeSuit?.percent
                ? Math.floor((base[key] + fixed[key]) * (100 + (Number(activeSuit[key]) || 0)) / 100)
                : base[key] + fixed[key] + (Number(activeSuit?.[key]) || 0)]));
        // Permanent HP-limit cultivation is a separate item bonus, after suit scaling.
        result[mode].hp += hpTraining;
    }
    return result;
}
