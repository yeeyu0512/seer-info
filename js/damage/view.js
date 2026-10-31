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
const fieldHints = {
    to: "起點與終點最多相差 500。",
    bossRace: "填入對應的種族值，非戰鬥面板數值。",
    power: "填入本次使用技能的威力。",
    defenseStage: "未強化或弱化填 0；弱化以負數表示。",
    hp: "填入後才會顯示門檻與判定",
};

function panel(mode) {
    const defense = mode === "defense";
    const defaults = defense ? DEFENSE_DEFAULTS : ATTACK_DEFAULTS;
    const suits = defense ? DEFENSE_SUITS : ATTACK_SUITS;
    const renderField = key => {
        const [, label, min, max, step = 1] = fields[mode].find(field => field[0] === key);
        const detail = fieldHints[key];
        return `<label class="damage-field"><span>${label}</span><input name="${key}" type="number" inputmode="decimal" min="${min}" max="${max}" step="${step}" value="${defaults[key]}"${key === "hp" ? "" : " required"}>${detail ? `<small>${detail}</small>` : ""}</label>`;
    };
    const renderGroup = ([title, keys], index) => {
        const formStep = index === 2 ? 4 : index === 0 ? 3 : 2;
        const resetButton = `<div class="damage-actions"><button type="button" data-reset class="secondary-button" aria-label="重設${title}">重設</button></div>`;
        const content = `<fieldset class="damage-input-group ${index < 2 ? "is-primary" : "is-advanced"}" data-form-step="${formStep}"><legend><span>${String(formStep).padStart(2, "0")}</span>${title}</legend><div class="damage-fields">${keys.map(renderField).join("")}
            ${index === 2 ? `<label class="damage-field"><span>套裝</span><select name="suit">${Object.entries(suits).map(([key, suit]) => `<option value="${key}">${suit.name}</option>`).join("")}</select></label>` : ""}
        ${index === 2 ? "" : resetButton}</div>${index === 2 ? `<div class="damage-effects-row"><div class="damage-switches">${switches[mode].map(([key, label, title]) => `<label title="${title}"><input type="checkbox" name="${key}"${defaults[key] ? " checked" : ""}><span>${label}</span></label>`).join("")}</div>${resetButton}</div>` : ""}
        </fieldset>`;
        return content;
    };
    return `<section class="damage-card" data-mode="${mode}" id="damage-${mode}-panel" role="tabpanel" aria-labelledby="damage-${mode}-tab"${defense ? "" : " hidden"}>
        <div class="damage-workspace"><form novalidate><div class="damage-form-sections">
        ${groups[mode].map(renderGroup).join("")}</div>
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
        ${defense ? `<div class="damage-shell-result${result.shellRange ? " has-range" : ""}"><div><span>卡裸傷區間</span><small>最高承傷低於體力，且最低裸傷高於體力</small></div><strong class="${result.shellRange ? "" : "is-empty"}">${result.hp === null ? "尚未填入體力" : result.shellRange ? result.shellRange.join("～") : "無符合區間"}</strong></div>` : ""}
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
    root.innerHTML = `<div class="damage-heading"><div><div class="damage-title-row"><h2>傷害計算</h2><span class="damage-version">測試中</span></div><p>比較單次攻擊的傷害，估算存活或擊殺所需的能力值。</p></div><button type="button" class="damage-reference-trigger" data-reference-open aria-haspopup="dialog" aria-controls="damage-reference-dialog">計算說明</button></div>
        <div class="damage-mode-tabs" role="tablist" aria-label="計算模式"><button type="button" id="damage-defense-tab" role="tab" aria-selected="true" aria-controls="damage-defense-panel" data-damage-tab="defense"><span><strong>承傷計算、卡裸傷</strong><small>需要多少防禦才能存活</small></span></button><button type="button" id="damage-attack-tab" role="tab" aria-selected="false" aria-controls="damage-attack-panel" tabindex="-1" data-damage-tab="attack"><span><strong>傷害計算</strong><small>需要多少攻擊才能擊殺</small></span></button></div>
        <ol class="damage-steps" aria-label="操作流程"><li data-wizard-indicator="1" class="is-current"><b>1</b><span><strong>選擇屬性</strong></span></li><li data-wizard-indicator="2"><b>2</b><span><strong>我方資料</strong></span></li><li data-wizard-indicator="3"><b>3</b><span><strong>BOSS 資料</strong></span></li><li data-wizard-indicator="4"><b>4</b><span><strong>進階設定</strong></span></li><li data-wizard-indicator="5"><b>5</b><span><strong>查看結果</strong></span></li></ol>
        <section class="damage-wizard-step is-current" data-wizard-step="1"><div class="damage-step-heading"><h3>屬性設定</h3><p>選填；選擇後自動帶入克制倍率。</p></div><div class="damage-type-helper"><div class="damage-type-matchup"><button class="damage-type-trigger" type="button" data-player-type aria-haspopup="dialog"><span class="damage-type-role">我方</span><span data-type-name>選擇精靈屬性</span><span data-type-action>選擇 <span aria-hidden="true">＋</span></span></button><span class="damage-type-versus" aria-hidden="true">VS</span><button class="damage-type-trigger" type="button" data-boss-type aria-haspopup="dialog"><span class="damage-type-role">BOSS</span><span data-type-name>選擇 BOSS 屬性</span><span data-type-action>選擇 <span aria-hidden="true">＋</span></span></button></div><p data-type-result aria-live="polite">不選屬性也可以直接手動輸入克制倍率。</p></div></section>
        <section class="damage-wizard-step" data-wizard-step="2"><div class="damage-step-heading"><h3>我方資料</h3><p>填入要比較的面板能力範圍；只算單一數值時，起點與終點填相同。</p></div><div class="damage-columns" data-form-slot="2">${panel("defense")}${panel("attack")}</div></section>
        <section class="damage-wizard-step" data-wizard-step="3"><div class="damage-step-heading"><h3>BOSS 資料</h3><p>依本次技能的攻擊類型，填入對應的攻擊／特攻或防禦／特防種族值。</p></div><div class="damage-columns damage-step-opponent" data-form-slot="3"></div></section>
        <section class="damage-wizard-step" data-wizard-step="4"><div class="damage-step-heading"><h3>進階設定</h3><p>選擇本次生效的套裝與效果；沒有的效果維持 0 或不勾選。</p></div><div class="damage-columns damage-step-advanced" data-form-slot="4"></div></section>
        <section class="damage-wizard-step" data-wizard-step="5"><div class="damage-step-heading"><h3>計算結果</h3><p>最低能力值依存活或擊殺條件反推；下方表格可比較不同面板的傷害。</p></div><div class="damage-result-focus" data-result-focus></div></section>
        <div class="damage-wizard-actions"><button type="button" class="secondary-button" data-wizard-prev disabled>上一步</button><button type="button" class="primary-button" data-wizard-next>下一步</button></div>
        <dialog id="damage-reference-dialog" class="damage-reference" aria-labelledby="damage-reference-title"><div class="damage-reference-heading"><h3 id="damage-reference-title">計算方式與適用範圍</h3><button type="button" data-reference-close aria-label="關閉計算說明" autofocus>×</button></div>
            <div class="damage-reference-content">
                <p>本工具依<a href="${REFERENCE}" target="_blank" rel="noopener noreferrer">參考計算器</a>的算法估算，尚未經遊戲實測驗證。</p>
                <section><h4>計算前提</h4><p>${MODEL.conditions}</p><p>我方請填入含套裝能力加成的面板數值；選擇套裝只會套用增減傷效果，不會再增加面板能力。</p></section>
                <section><h4>如何看結果</h4><ul>
                    <li>傷害範圍包含 217/255～1 的隨機浮動，不代表發生機率。</li>
                    <li>承傷計算以最高傷害低於我方目前體力判定可存活；傷害計算以最低傷害達到 BOSS 體力判定可擊殺。</li>
                    <li>未勾選「鎖定暴擊」時，承傷範圍包含一般與暴擊傷害；勾選後只計算暴擊，不估算暴擊率。</li>
                    <li>「卡裸傷」需同時符合：最高承傷 ＜ 我方體力 ＜ 最低裸傷。這只表示數值符合條件，不保證 BOSS 的選招。</li>
                </ul></section>
                <section><h4>效果如何計入</h4><ul>${EFFECTS.map(effect => `<li><strong>${effect.name}：</strong>${effect.condition}</li>`).join("")}</ul><p>耀世需符合半血以上條件；紫火需確認本次技能適用。傷害計算最後向下取整，承傷計算依參考算法分段向上取整。</p></section>
                <section><h4>未涵蓋的情況</h4><p>${MODEL.unsupported}結果僅供單次攻擊比較，不模擬後續回合。</p></section>
            </div>
        </dialog>`;
    const referenceDialog = root.querySelector("#damage-reference-dialog");
    root.querySelector("[data-reference-open]").addEventListener("click", () => referenceDialog.showModal());
    root.querySelector("[data-reference-close]").addEventListener("click", () => referenceDialog.close());
    const tabs = [...root.querySelectorAll("[data-damage-tab]")];
    let wizardStep = 1;
    const wizardSteps = [...root.querySelectorAll("[data-wizard-step]")];
    const wizardIndicators = [...root.querySelectorAll("[data-wizard-indicator]")];
    const previousButton = root.querySelector("[data-wizard-prev]");
    const nextButton = root.querySelector("[data-wizard-next]");
    const skipButton = root.querySelector("[data-wizard-skip]");
    const setWizardStep = step => {
        wizardStep = Math.max(1, Math.min(5, step));
        wizardSteps.forEach(item => item.classList.toggle("is-current", Number(item.dataset.wizardStep) === wizardStep));
        wizardIndicators.forEach(item => {
            const value = Number(item.dataset.wizardIndicator);
            item.classList.toggle("is-current", value === wizardStep);
            item.classList.toggle("is-complete", value < wizardStep);
        });
        previousButton.disabled = wizardStep === 1;
        nextButton.textContent = wizardStep === 5 ? "重新計算" : wizardStep === 4 ? "查看結果" : "下一步";
        const focus = root.querySelector("[data-result-focus]");
        const activeCard = root.querySelector(".damage-card:not([hidden])");
        if (activeCard && wizardStep >= 2 && wizardStep <= 4) root.querySelector(`[data-form-slot="${wizardStep}"]`).append(activeCard);
        activeCard?.querySelectorAll("[data-form-step]").forEach(item => item.hidden = wizardStep < 2 || wizardStep > 4 || Number(item.dataset.formStep) !== wizardStep);
        if (focus && wizardStep === 5) {
            focus.innerHTML = activeCard ? activeCard.querySelector("[data-result]").innerHTML : "";
        }
    };
    previousButton.addEventListener("click", () => setWizardStep(wizardStep - 1));
    nextButton.addEventListener("click", () => {
        if (wizardStep === 4) root.querySelector(".damage-card:not([hidden]) form").requestSubmit();
        setWizardStep(wizardStep === 5 ? 4 : wizardStep + 1);
    });
    root.addEventListener("change", event => {
        if (!event.target.matches("[data-result-focus] [data-filter]")) return;
        const activeFilter = root.querySelector(".damage-card:not([hidden]) [data-filter]");
        if (!activeFilter) return;
        activeFilter.checked = event.target.checked;
        activeFilter.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const selectTab = selected => {
        const changed = tabs.find(tab => tab.getAttribute("aria-selected") === "true")?.dataset.damageTab !== selected;
        tabs.forEach(tab => {
            const active = tab.dataset.damageTab === selected;
            tab.setAttribute("aria-selected", String(active));
            tab.tabIndex = active ? 0 : -1;
            root.querySelector(`[data-mode="${tab.dataset.damageTab}"]`).hidden = !active;
        });
        setWizardStep(changed ? 1 : wizardStep);
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
        const render = () => {
            resultNode.innerHTML = renderResult(mode, result, onlyHighlights);
            resultNode.hidden = false;
            if (wizardStep === 5 && !card.hidden) root.querySelector("[data-result-focus]").innerHTML = resultNode.innerHTML;
        };
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
        });
        const schedule = () => { resultNode.hidden = true; errorNode.hidden = true; clearTimeout(timer); timer = setTimeout(() => run(), 250); };
        form.addEventListener("input", schedule);
        form.addEventListener("change", schedule);
        card.querySelectorAll("[data-reset]").forEach(button => button.addEventListener("click", () => {
            clearTimeout(timer);
            button.closest("fieldset").querySelectorAll("input, select").forEach(node => {
                const value = defaults[node.name];
                if (typeof value === "boolean") node.checked = value;
                else node.value = value ?? "";
            });
            onlyHighlights = false;
            run();
        }));
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
    setWizardStep(1);
}
