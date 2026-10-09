import { SEER_TYPE_DATA } from "../seer-type-data.js";

const { singleRelations, combinations } = SEER_TYPE_DATA;
const combinationsById = new Map(combinations.map(item => [item.id,item]));

// 百度百科「技能石」列出的 21 種單屬性技能石。
const skillStoneTypeNames = new Set([
    "草", "水", "火", "飛行", "電", "機械", "地面", "普通", "冰", "超能",
    "戰鬥", "光", "暗影", "神秘", "龍", "聖靈", "次元", "遠古", "邪靈", "自然", "蟲",
]);

export function getSkillStoneTypes() {
    return combinations
        .filter((type) => type.types.length === 1 && skillStoneTypeNames.has(type.name))
        .sort((a, b) => a.id - b.id);
}

export function getSkillStoneMatchupAnalysis(targetId) {
    const target = combinationsById.get(targetId) || combinations[0];
    return getSkillStoneTypes()
        .map((type) => ({ type, multiplier: calculateTypeMultiplier(type.types, target.types) }))
        .sort((a, b) => b.multiplier - a.multiplier || a.type.id - b.type.id);
}

// 單屬性對單屬性基礎判定
function getSingleVsSingle(atk, def) {
    const rel = singleRelations[atk];
    if (!rel) return 1.0;
    if (rel.eff_2x && rel.eff_2x.includes(def)) return 2.0;
    if (rel.eff_05x && rel.eff_05x.includes(def)) return 0.5;
    if (rel.eff_0x && rel.eff_0x.includes(def)) return 0.0;
    return 1.0;
}

/**
 * 計算攻擊方對防守方的克制倍率
 * @param {string[]} atkTypes 攻擊方屬性陣列 (單屬性為 [name], 雙屬性為 [name1, name2])
 * @param {string[]} defTypes 防守方屬性陣列 (單屬性為 [name], 雙屬性為 [name1, name2])
 * @returns {number} 克制係數
 */
export function calculateTypeMultiplier(atkTypes, defTypes) {
    if (!atkTypes || !defTypes || atkTypes.length === 0 || defTypes.length === 0) return 1.0;

    // 公式來源：https://www.bilibili.com/opus/393640212312106869
    if (atkTypes.length === 1 && defTypes.length === 1) {
        return getSingleVsSingle(atkTypes[0], defTypes[0]);
    }

    if (atkTypes.length === 1) {
        return combineSingleMatchups(
            getSingleVsSingle(atkTypes[0], defTypes[0]),
            getSingleVsSingle(atkTypes[0], defTypes[1]),
        );
    }

    if (defTypes.length === 1) {
        return combineSingleMatchups(
            getSingleVsSingle(atkTypes[0], defTypes[0]),
            getSingleVsSingle(atkTypes[1], defTypes[0]),
        );
    }

    // 雙打雙必須拆防守方；最後一層直接平均，不再套用無效減半規則。
    return (
        calculateTypeMultiplier(atkTypes, [defTypes[0]])
        + calculateTypeMultiplier(atkTypes, [defTypes[1]])
    ) / 2;
}

// 單打雙與雙打單共用：雙克制為 4；含無效時總和 / 4；其餘總和 / 2。
function combineSingleMatchups(first, second) {
    if (first === 2 && second === 2) return 4;
    return (first + second) / (first === 0 || second === 0 ? 4 : 2);
}

/**
 * 取得指定屬性對全屬性的完整分析（進攻克制與防守受擊）
 * @param {number} typeId 屬性 ID
 */
export function getTypeMatchupAnalysis(typeId) {
    const activeType = combinationsById.get(typeId) || combinations[0];
    const attackResults = [];
    const defenseResults = [];

    combinations.forEach((target) => {
        // 進攻：activeType 打 target
        const atkMult = calculateTypeMultiplier(activeType.types, target.types);
        attackResults.push({
            type: target,
            multiplier: atkMult
        });

        // 防守：target 打 activeType
        const defMult = calculateTypeMultiplier(target.types, activeType.types);
        defenseResults.push({
            type: target,
            multiplier: defMult
        });
    });

    // 排序：倍率由高至低
    attackResults.sort((a, b) => b.multiplier - a.multiplier || a.type.id - b.type.id);
    defenseResults.sort((a, b) => b.multiplier - a.multiplier || a.type.id - b.type.id);

    return {
        activeType,
        attackResults,
        defenseResults
    };
}

// 格式化倍率文字 (例如 2 -> "2×", 1.25 -> "1.25×")
export function formatMultiplier(multiplier) {
    if (multiplier === 0) return "0×";
    const rounded = Math.round(multiplier * 1000) / 1000;
    return `${rounded}×`;
}

// 格式化屬性卡片底部倍率標籤 (高度還原圖片: 4, 2.75, 2, 1, 0.5, 0)
export function formatCardMultiplier(multiplier) {
    if (multiplier === 0) return "0";
    const rounded = Math.round(multiplier * 1000) / 1000;
    return String(rounded);
}

// 判定克制類型標籤文字與樣式
export function getTypeEffectLabel(multiplier, isDefense = false) {
    if (multiplier > 1.0) return isDefense ? "受到克制" : "克制";
    if (multiplier === 1.0) return isDefense ? "普通" : "普通";
    if (multiplier > 0.0) return isDefense ? "受到微弱" : "微弱";
    return isDefense ? "受到無效" : "無效";
}

export function getTypeEffectClass(multiplier) {
    if (multiplier > 1.0) return "is-counter";
    if (multiplier === 1.0) return "is-normal";
    if (multiplier > 0.0) return "is-weak";
    return "is-zero";
}
