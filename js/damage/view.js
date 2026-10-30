import { ATTACK_DEFAULTS, DEFENSE_DEFAULTS, calculateAttack, calculateDefense } from "./core.js";
import { ATTACK_SUITS, DEFENSE_SUITS, EFFECTS, MODEL, REFERENCE } from "./models.js";
import { initDamageTypePicker } from "./type-picker.js";
import { calculateTypeMultiplier } from "../types/core.js";

const fields = {
    defense: [
        ["bossRace", "攻擊／特攻種族值", 0, 1000],
        ["effectiveness", "克制倍率（BOSS → 我）", 0, 4, 0.001],
        ["power", "技能威力", 1, 10000, 0.01],
        ["attackMultiplier", "BOSS 雙攻倍數", 0.01, 100, 0.01],
        ["bossBoost", "BOSS 強化等級", 0, 6],
        ["defenseStage", "我方防禦強化／弱化", -6, 6],
        ["soulReduction", "魂印減傷 (%)", 0, 100, 0.01],
        ["sharp", "BOSS 鋒銳固傷", 0, 1000000],
        ["shield", "我方護盾", 0, 1000000],
        ["barrier", "我方護罩", 0, 1000000],
        ["from", "防禦／特防起點", 1, 1000000],
        ["to", "防禦／特防終點", 1, 1000000],
        ["hp", "我方目前體力（可留空）", 1, 1000000],
    ],
    attack: [
        ["bossRace", "防禦／特防種族值", 0, 1000],
        ["effectiveness", "克制倍率（我 → BOSS）", 0, 4, 0.001],
        ["boost", "我方強化等級", 0, 6],
        ["weaken", "我方弱化等級", 0, 6],
        ["bossBoost", "BOSS 強化等級", 0, 6],
        ["defenseMultiplier", "BOSS 雙防倍數", 0.01, 100, 0.01],
        ["power", "技能威力", 1, 10000, 0.01],
        ["skillMultiplier", "技能傷害倍率", 0.01, 100, 0.01],
        ["gem", "威力寶石加成", 0, 1000, 0.01],
        ["skillBonus", "技能增傷 (%)", 0, 100, 0.01],
        ["traitBonus", "特性增傷 (%)", 0, 100, 0.01],
        ["soulBonus", "魂印增傷 (%)", 0, 100, 0.01],
        ["firePan", "火潘層數", 0, 3],
        ["fixed", "附加粉傷", 0, 1000000],
        ["bossReduction", "BOSS 減傷 (%)", 0, 100, 0.01],
        ["hp", "BOSS 體力（可留空）", 1, 1000000],
        ["from", "攻擊／特攻起點", 1, 1000000],
        ["to", "攻擊／特攻終點", 1, 1000000],
    ],
};
const switches = {
    defense: [["lockedCritical", "鎖定暴擊", "勾選後僅算暴擊；否則範圍涵蓋一般與暴擊傷害，不估計暴擊率。"], ["gold", "金火", "減傷 25%"], ["immortal", "不滅珠", "減傷 25%"], ["reductionOrb", "減傷珠", "減傷 25%"], ["hard", "堅硬", "3～5 星，減傷 10%"]],
    attack: [["native", "本系技能", "本系倍率 1.5"], ["critical", "暴擊", "暴擊倍率 2，不估計暴擊率。"], ["stage", "蒂朵舞台", "傷害倍率 2.3"], ["purple", "紫火", "傷害倍率 1.25，僅適用可受紫火加成的技能。"]],
};

const groups = {
    defense: [
        ["BOSS 資料", ["bossRace", "power", "attackMultiplier", "bossBoost", "effectiveness"]],
        ["我方能力", ["from", "to", "defenseStage", "hp"]],
        ["減傷與防護", ["soulReduction", "sharp", "shield", "barrier"]],
    ],
    attack: [
        ["BOSS 資料", ["bossRace", "bossBoost", "defenseMultiplier", "bossReduction", "hp", "effectiveness"]],
        ["我方能力與技能", ["from", "to", "boost", "weaken", "power", "skillMultiplier", "gem"]],
        ["增傷效果", ["skillBonus", "traitBonus", "soulBonus", "firePan", "fixed"]],
    ],
};

function panel(mode) {
    const defense = mode === "defense";
    const defaults = defense ? DEFENSE_DEFAULTS : ATTACK_DEFAULTS;
    const suits = defense ? DEFENSE_SUITS : ATTACK_SUITS;
    const renderField = key => {
        const [, label, min, max, step = 1] = fields[mode].find(field => field[0] === key);
        return `<label class="damage-field"><span>${label}</span><input name="${key}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${defaults[key]}"${key === "hp" ? "" : " required"}></label>`;
    };
    return `<section class="damage-card" data-mode="${mode}" id="damage-${mode}-panel" role="tabpanel" aria-labelledby="damage-${mode}-tab"${defense ? "" : " hidden"}>
        <div class="damage-workspace"><form novalidate><div class="damage-form-sections">
        ${groups[mode].map(([title, keys], index) => `<fieldset class="damage-input-group"><legend><span>${String(index + 1).padStart(2, "0")}</span>${title}</legend><div class="damage-fields">${keys.map(renderField).join("")}
            ${index === 2 ? `<label class="damage-field damage-wide"><span>套裝</span><select name="suit">${Object.entries(suits).map(([key, suit]) => `<option value="${key}">${suit.name}</option>`).join("")}</select></label>` : ""}
        </div>${index === 2 ? `<div class="damage-switches">${switches[mode].map(([key, label, title]) => `<label title="${title}"><input type="checkbox" name="${key}"${defaults[key] ? " checked" : ""}><span>${label}</span></label>`).join("")}</div>` : ""}
        ${index === 1 ? '<p class="damage-field-hint">填入相同起訖值可單獨比較；範圍最多相差 500。</p>' : ""}</fieldset>`).join("")}</div>
        <div class="damage-actions"><button type="submit" class="primary-button">${defense ? "計算承傷" : "計算傷害"}</button><button type="button" data-reset class="secondary-button">重設</button></div>
        <p class="damage-error" data-error role="alert" hidden></p></form>
        <div class="damage-result-column"><div class="damage-result-heading"><h3>試算結果</h3><span class="damage-live-label">隨輸入更新</span></div><div data-result></div></div></div>
    </section>`;
}

function renderResult(mode, result, onlyHighlights) {
    const defense = mode === "defense";
    const hasThreshold = result.hp !== null && result.threshold !== null;
    const damageMin = Math.min(...result.rows.map(row => row.min));
    const damageMax = Math.max(...result.rows.map(row => row.max));
    const thresholdValue = hasThreshold ? result.threshold.toLocaleString("zh-TW") : "—";
    const explanation = result.hp === null ? `填入${defense ? "我方" : "BOSS"}體力後顯示門檻` : hasThreshold ? defense ? "可承受一次攻擊的最低面板" : "以最低傷害擊殺的所需面板" : `搜尋至 ${result.cap} 仍無符合數值`;
    const rows = result.rows.filter(row => !onlyHighlights || (defense ? row.tank : row.kill));
    return `<div class="damage-summary" aria-live="polite">
        <div class="damage-threshold"><span class="damage-summary-label">${defense ? "最低防禦／特防" : "最低攻擊／特攻"}</span><div class="damage-threshold-value">${hasThreshold ? '<span class="damage-at-least">≥</span>' : ""}${thresholdValue}</div><p>${explanation}</p></div>
        <div class="damage-result-facts"><div><span>${defense ? "承受傷害" : "造成傷害"}</span><strong>${damageMin.toLocaleString("zh-TW")}<i>～</i>${damageMax.toLocaleString("zh-TW")}</strong><small>目前比較範圍的傷害上下限</small></div><div><span>${defense ? "我方目前體力" : "BOSS 體力"}</span><strong>${result.hp === null ? "未填入" : result.hp.toLocaleString("zh-TW")}</strong><small>${defense ? "傷害低於體力才可存活" : "傷害等於體力即可擊殺"}</small></div></div>
        ${defense ? `<div class="damage-shell-result"><span>卡裸傷區間</span><strong class="${result.shellRange ? "" : "is-empty"}">${result.hp === null ? "尚未填入體力" : result.shellRange ? result.shellRange.join("～") : "無符合區間"}</strong></div>` : ""}
        <p class="damage-search-note">門檻搜尋範圍 1～${result.cap}，獨立於下方比較範圍。</p>
    </div>
        <div class="damage-comparison-title"><h4>${defense ? "防禦" : "攻擊"}範圍比較</h4><span>${result.rows[0].value}～${result.rows.at(-1).value}</span></div>
        <div class="damage-result-toolbar"><span>${defense ? "紅色：卡裸傷 · 綠色：可抗一次" : "綠色：可一擊擊殺"}</span><label><input type="checkbox" data-filter${onlyHighlights ? " checked" : ""}>僅顯示符合條件</label></div>
        <div class="damage-table-scroll"><table><caption class="damage-sr-only">${defense ? "防禦範圍承傷比較" : "攻擊範圍傷害比較"}</caption><thead><tr><th>${defense ? "防禦／特防" : "攻擊／特攻"}</th><th>傷害範圍</th>${defense ? "<th>最低裸傷</th>" : ""}<th>判定</th></tr></thead><tbody>
            ${rows.map(row => `<tr class="${defense ? row.shell ? "is-shell" : row.tank ? "is-good" : "" : row.kill ? "is-good" : ""}"><td>${row.value}</td><td>${row.min}～${row.max}</td>${defense ? `<td>${row.naked}</td>` : ""}<td><span class="damage-verdict">${result.hp === null ? "—" : defense ? row.shell ? "可卡裸傷" : row.tank ? "可抗一次" : "無法保證" : row.kill ? "可擊殺" : "無法保證"}</span></td></tr>`).join("")}
            ${rows.length ? "" : `<tr><td colspan="${defense ? 4 : 3}">目前範圍沒有符合條件的數值。</td></tr>`}
        </tbody></table></div>`;
}

export function initDamageCalculator(root) {
    root.innerHTML = `<div class="damage-heading"><div><div class="damage-eyebrow">PVE 工具 <span>陸服頁遊</span></div><h2>傷害計算</h2><p>試算能扛多少傷害，以及擊敗 BOSS 所需的攻擊。</p></div><span class="damage-version">單擊試算</span></div>
        <div class="damage-type-helper"><div class="damage-helper-title"><strong>對局屬性</strong><span>選填 · 自動帶入克制倍率</span></div><div class="damage-type-matchup"><button class="damage-type-trigger" type="button" data-player-type aria-haspopup="dialog"><span class="damage-type-role">我方</span><span data-type-name>選擇精靈屬性</span><span data-type-action>選擇 <span aria-hidden="true">＋</span></span></button><span class="damage-type-versus" aria-hidden="true">VS</span><button class="damage-type-trigger" type="button" data-boss-type aria-haspopup="dialog"><span class="damage-type-role">BOSS</span><span data-type-name>選擇 BOSS 屬性</span><span data-type-action>選擇 <span aria-hidden="true">＋</span></span></button></div><p data-type-result aria-live="polite">使用圖示選擇單／雙屬性；非本系技能可手動修改克制倍率。</p></div>
        <div class="damage-mode-tabs" role="tablist" aria-label="計算模式"><button type="button" id="damage-defense-tab" role="tab" aria-selected="true" aria-controls="damage-defense-panel" data-damage-tab="defense">站場承傷<span>反推可抗住的防禦</span></button><button type="button" id="damage-attack-tab" role="tab" aria-selected="false" aria-controls="damage-attack-panel" tabindex="-1" data-damage-tab="attack">強攻輸出<span>反推擊殺所需攻擊</span></button></div>
        <div class="damage-columns">${panel("defense")}${panel("attack")}</div>
        <details class="damage-reference"><summary>計算方式與適用範圍</summary><p>依<a href="${REFERENCE}" target="_blank" rel="noopener noreferrer">參考計算器</a>的算法實作，未使用其圖片或介面。${MODEL.status}。${MODEL.conditions}</p><p>傷害範圍使用 217/255～1 的上下限；不提供機率或連擊計算。強攻最後向下取整，站場依參考程式分段向上取整。未鎖定暴擊時，承傷範圍涵蓋非暴擊與暴擊，取兩者的最低與最高值。</p>${EFFECTS.map(effect => `<p><strong>${effect.name}：</strong>${effect.condition}</p>`).join("")}<p>卡裸傷沿用參考判定：最高承傷 ＜ 我方體力 ＜ 最低裸傷；只作數值比較，不保證 BOSS 的選招。耀世需自行確認半血以上，紫火需確認技能適用；套裝能力加成應先包含在我方面板。未支援：${MODEL.unsupported}</p></details>`;
    const tabs = [...root.querySelectorAll("[data-damage-tab]")];
    const selectTab = selected => {
        tabs.forEach(tab => {
            const active = tab.dataset.damageTab === selected;
            tab.setAttribute("aria-selected", String(active));
            tab.tabIndex = active ? 0 : -1;
            root.querySelector(`[data-mode="${tab.dataset.damageTab}"]`).hidden = !active;
        });
    };
    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => selectTab(tab.dataset.damageTab));
        tab.addEventListener("keydown", event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[1] : tabs[1 - index];
            selectTab(next.dataset.damageTab);
            next.focus();
        });
    });
    const controllers = new Map();
    root.querySelectorAll("[data-mode]").forEach(card => {
        const mode = card.dataset.mode;
        const defaults = mode === "attack" ? ATTACK_DEFAULTS : DEFENSE_DEFAULTS;
        const form = card.querySelector("form");
        const resultNode = card.querySelector("[data-result]");
        const errorNode = card.querySelector("[data-error]");
        let result = null, onlyHighlights = false, timer;
        const field = key => form.elements.namedItem(key);
        const render = () => { resultNode.innerHTML = renderResult(mode, result, onlyHighlights); resultNode.hidden = false; };
        const run = (showValidity = false) => {
            clearTimeout(timer);
            errorNode.hidden = true;
            resultNode.hidden = true;
            if (!form.checkValidity()) {
                if (showValidity) form.reportValidity();
                return;
            }
            const parameters = Object.fromEntries(Object.entries(defaults).map(([key, value]) => {
                const node = field(key);
                return [key, typeof value === "boolean" ? node.checked : key === "suit" ? node.value : node.value.trim() === "" ? key === "hp" ? null : NaN : Number(node.value)];
            }));
            try {
                result = mode === "attack" ? calculateAttack(parameters) : calculateDefense(parameters);
                render();
                try { localStorage.setItem(`seer-damage-${mode}-v1`, JSON.stringify(parameters)); } catch { /* Storage is optional. */ }
            } catch (error) {
                errorNode.textContent = error.message;
                errorNode.hidden = false;
            }
        };
        try {
            const saved = JSON.parse(localStorage.getItem(`seer-damage-${mode}-v1`) || "null");
            if (saved && typeof saved === "object") for (const [key, value] of Object.entries(defaults)) {
                if (!Object.hasOwn(saved, key)) continue;
                if (typeof value === "boolean" && typeof saved[key] === "boolean") field(key).checked = saved[key];
                else if (key === "suit" && typeof saved[key] === "string") field(key).value = saved[key];
                else if (typeof saved[key] === "number" && Number.isFinite(saved[key])) field(key).value = String(saved[key]);
                else if (key === "hp" && saved[key] === null) field(key).value = "";
            }
        } catch { /* Invalid or unavailable storage falls back to defaults. */ }
        form.addEventListener("submit", event => {
            event.preventDefault();
            run(true);
            if (!resultNode.hidden && window.matchMedia("(max-width: 850px)").matches) {
                const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                resultNode.parentElement.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
            }
        });
        const schedule = () => { resultNode.hidden = true; errorNode.hidden = true; clearTimeout(timer); timer = setTimeout(() => run(), 250); };
        form.addEventListener("input", schedule);
        form.addEventListener("change", schedule);
        card.querySelector("[data-reset]").addEventListener("click", () => {
            clearTimeout(timer);
            form.reset();
            onlyHighlights = false;
            run();
        });
        resultNode.addEventListener("change", event => {
            if (!event.target.matches("[data-filter]")) return;
            onlyHighlights = event.target.checked;
            render();
        });
        controllers.set(mode, { field, run });
        run();
    });
    initDamageTypePicker(root, (player, boss) => {
        const attack = calculateTypeMultiplier(player.types, boss.types);
        const defense = calculateTypeMultiplier(boss.types, player.types);
        root.querySelector("[data-type-result]").textContent = `我 → BOSS：${attack} 倍　｜　BOSS → 我：${defense} 倍（已填入）`;
        for (const [mode, value] of [["attack", attack], ["defense", defense]]) {
            controllers.get(mode).field("effectiveness").value = String(value);
            controllers.get(mode).run();
        }
    });
}

