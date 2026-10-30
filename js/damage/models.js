// Compatibility rules from the user's reference, not officially verified mechanics.
export const REFERENCE = "https://seer-calculator-tianfu.netlify.app/";
export const MODEL = {
    status: "參考程式模型，尚未經遊戲實測驗證",
    conditions: "以 100 級、單次攻擊估算；BOSS 基礎能力為種族值 × 2＋29，再套用能力倍數與強化。承傷計算固定本系倍率 1.5、暴擊傷害倍率 1.3、固傷抗性 35%。",
    unsupported: "連擊、免死、鎖血、傷害上限及特殊 BOSS 機制。",
};
export const ATTACK_SUITS = {
    none: { name: "無套裝增傷", bonus: 0 },
    dark: { name: "漆黑（增傷 40%）", bonus: 0.4 },
    silver: { name: "銀翼（增傷 30%）", bonus: 0.3 },
    silverFirst: { name: "銀翼先手（增傷 60%）", bonus: 0.6 },
};
export const DEFENSE_SUITS = {
    none: { name: "無套裝減傷", normal: 0, critical: 0 },
    glory: { name: "耀世（半血以上，減傷 15%）", normal: 0.15, critical: 0.15 },
    celestial: { name: "天人（一般 10%／暴擊 20%）", normal: 0.1, critical: 0.2 },
};
export const EFFECTS = [
    { name: "承傷計算", source: REFERENCE, status: "參考分組", condition: "套裝與魂印加算，上限 100%；金火、不滅珠、減傷珠、堅硬各自乘算。" },
    { name: "傷害計算", source: REFERENCE, status: "參考分組", condition: "套裝、火潘、技能與魂印加算；蒂朵舞台、特性、紫火另乘。套裝只改傷害，不改面板。" },
    { name: "護盾與護罩", source: REFERENCE, status: "參考簡化", condition: "護盾扣紅傷，護罩扣抗性後的鋒銳固傷；不模擬後續回合。" },
];

