import { SEER_TYPE_DATA } from "./seer-type-data.js";

const { singleTypes, singleRelations, combinations } = SEER_TYPE_DATA;

// 建立 ID 快速對照索引
const combinationsById = new Map(combinations.map((item) => [item.id, item]));

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

    // 1. 單屬性攻擊方
    if (atkTypes.length === 1) {
        const a = atkTypes[0];
        // 單屬性攻擊單屬性
        if (defTypes.length === 1) {
            return getSingleVsSingle(a, defTypes[0]);
        }
        // 單屬性攻擊雙屬性：防守方拆分
        // 規則：雙2為2倍；含0為兩項之和除以4；其餘為兩項之和除以2
        const k1 = getSingleVsSingle(a, defTypes[0]);
        const k2 = getSingleVsSingle(a, defTypes[1]);
        if (k1 === 2.0 && k2 === 2.0) {
            return 2.0;
        } else if (k1 === 0.0 || k2 === 0.0) {
            return (k1 + k2) / 4.0;
        } else {
            return (k1 + k2) / 2.0;
        }
    }

    // 2. 雙屬性攻擊方 (a1, a2)
    const a1 = atkTypes[0];
    const a2 = atkTypes[1];

    // 雙屬性攻擊單屬性
    // 規則：雙2為4倍克制；含0為兩項之和除以4；其餘為兩項之和除以2
    if (defTypes.length === 1) {
        const d = defTypes[0];
        const k1 = getSingleVsSingle(a1, d);
        const k2 = getSingleVsSingle(a2, d);
        if (k1 === 2.0 && k2 === 2.0) {
            return 4.0;
        } else if (k1 === 0.0 || k2 === 0.0) {
            return (k1 + k2) / 4.0;
        } else {
            return (k1 + k2) / 2.0;
        }
    }

    // 雙屬性攻擊雙屬性
    // 規則：將防守方拆分，計算雙屬性攻擊方對防守方兩個單屬性各自克制係數
    const k1 = calculateTypeMultiplier(atkTypes, [defTypes[0]]);
    const k2 = calculateTypeMultiplier(atkTypes, [defTypes[1]]);
    if (k1 === 0.0 || k2 === 0.0) {
        return (k1 + k2) / 4.0;
    } else {
        return (k1 + k2) / 2.0;
    }
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

// ==========================================
// UI 元件與控制器
// ==========================================

export class SeerTypeCalculatorController {
    constructor(containerElement) {
        this.container = containerElement;
        this.selectedTypeId = 16; // 預設聖靈系 (經典且廣為人知)
        this.currentMode = "attack"; // 'attack' | 'defense'
        this.currentFilter = "all"; // 'all' | 'counter' | 'normal' | 'weak' | 'zero'
        this.searchQuery = "";
        this.typePickerCategory = "single"; // 'single' | 'double'
        this.pickerModalOpener = null;
        this.modalPointerStartedOnBackdrop = false;

        this.initDOMElements();
        this.bindEvents();
        this.render();
    }

    initDOMElements() {
        this.container.innerHTML = `
            <div class="type-calc-wrapper">
                <!-- 頂部屬性卡片：使用與精靈篩選相同的 trigger-card 樣式 -->
                <div id="type-calc-trigger-card" class="seer-pet-type-trigger-card" role="button" tabindex="0" aria-haspopup="dialog" aria-label="開啟屬性選擇視窗">
                    <div class="seer-pet-type-current-info">
                        <span class="seer-pet-type-trigger-label">當前計算屬性</span>
                        <div class="seer-pet-type-current-badge">
                            <img id="type-calc-current-icon" class="seer-pet-type-current-icon" src="./seer_icons/16.png" alt="">
                            <span id="type-calc-current-name">聖靈</span>
                            <span id="type-calc-current-tag" class="type-calc-tag is-single">單屬性</span>
                        </div>
                    </div>
                    <button id="type-calc-open-modal-button" class="primary-button compact-button seer-pet-type-trigger-button" type="button" aria-haspopup="dialog">
                        <span>選擇屬性</span>
                        <span aria-hidden="true">▾</span>
                    </button>
                </div>

                <!-- 模式切換與搜尋列 -->
                <div class="type-calc-controls-bar">
                    <div class="type-calc-mode-tabs" role="tablist" aria-label="計算模式切換">
                        <button id="type-calc-mode-attack" class="type-calc-mode-tab is-active" type="button" role="tab" aria-selected="true" data-mode="attack">
                            ⚔️ 攻擊效果
                        </button>
                        <button id="type-calc-mode-defense" class="type-calc-mode-tab" type="button" role="tab" aria-selected="false" data-mode="defense">
                            🛡️ 被攻擊效果
                        </button>
                    </div>

                    <!-- 搜尋目標屬性 -->
                    <div class="type-calc-search-box">
                        <input id="type-calc-target-search" class="text-input type-calc-search-input" type="search" placeholder="搜尋目標屬性名稱…" autocomplete="off">
                    </div>
                </div>

                <!-- 統計與快速篩選標籤 (採用遊戲官方正統術語：克制、普通、微弱、無效) -->
                <div class="type-calc-stats-bar">
                    <div class="type-calc-filter-pills" role="toolbar" aria-label="倍率篩選">
                        <button class="type-calc-pill is-active" type="button" data-filter="all">全部 (<span id="type-count-all">138</span>)</button>
                        <button class="type-calc-pill" type="button" data-filter="counter">克制 (<span id="type-count-counter">0</span>)</button>
                        <button class="type-calc-pill" type="button" data-filter="normal">普通 (<span id="type-count-normal">0</span>)</button>
                        <button class="type-calc-pill" type="button" data-filter="weak">微弱 (<span id="type-count-weak">0</span>)</button>
                        <button class="type-calc-pill" type="button" data-filter="zero">無效 (<span id="type-count-zero">0</span>)</button>
                    </div>
                </div>

                <!-- 結果展示區塊 -->
                <div class="type-calc-results-section">
                    <div id="type-calc-card-grid" class="type-card-grid" aria-live="polite">
                        <!-- 屬性卡片網格 -->
                    </div>
                </div>
            </div>
        `;

        this.triggerCard = this.container.querySelector("#type-calc-trigger-card");
        this.openModalBtn = this.container.querySelector("#type-calc-open-modal-button");
        this.currentIcon = this.container.querySelector("#type-calc-current-icon");
        this.currentName = this.container.querySelector("#type-calc-current-name");
        this.currentTag = this.container.querySelector("#type-calc-current-tag");
        this.modeAttackBtn = this.container.querySelector("#type-calc-mode-attack");
        this.modeDefenseBtn = this.container.querySelector("#type-calc-mode-defense");
        this.targetSearchInput = this.container.querySelector("#type-calc-target-search");
        this.resultsGrid = this.container.querySelector("#type-calc-card-grid");

        // Stats elements
        this.countAll = this.container.querySelector("#type-count-all");
        this.countCounter = this.container.querySelector("#type-count-counter");
        this.countNormal = this.container.querySelector("#type-count-normal");
        this.countWeak = this.container.querySelector("#type-count-weak");
        this.countZero = this.container.querySelector("#type-count-zero");

        // Filter pills
        this.filterPills = Array.from(this.container.querySelectorAll(".type-calc-pill"));

        // Global Modal elements (位於 document.body 層級，與精靈屬性彈窗完全相同)
        this.pickerModal = document.getElementById("type-calc-modal");
        this.pickerCloseBtn = document.getElementById("type-calc-modal-close");
        this.pickerCategoryTabs = Array.from(this.pickerModal.querySelectorAll("[data-calc-type-category]"));
        this.pickerOptionsContainer = document.getElementById("type-calc-modal-options");
    }

    bindEvents() {
        // 切換模式 (攻 / 防)
        this.modeAttackBtn.addEventListener("click", () => {
            this.setMode("attack");
        });
        this.modeDefenseBtn.addEventListener("click", () => {
            this.setMode("defense");
        });

        // 目標屬性搜尋
        this.targetSearchInput.addEventListener("input", (e) => {
            this.searchQuery = e.target.value.trim();
            this.renderResults();
        });

        // 倍率快速篩選按鈕
        this.filterPills.forEach((pill) => {
            pill.addEventListener("click", () => {
                this.setFilter(pill.dataset.filter);
            });
        });

        // 觸發卡片點擊開啟彈窗
        this.triggerCard.addEventListener("click", () => this.openPickerModal(this.triggerCard));
        this.triggerCard.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.openPickerModal(this.triggerCard);
            }
        });
        this.openModalBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openPickerModal(this.openModalBtn);
        });

        // 彈窗關閉按鈕
        this.pickerCloseBtn.addEventListener("click", () => this.closePickerModal());

        // 彈窗背景點擊關閉
        this.pickerModal.addEventListener("pointerdown", (event) => {
            this.modalPointerStartedOnBackdrop = event.target === this.pickerModal;
        });
        this.pickerModal.addEventListener("click", (event) => {
            if (this.modalPointerStartedOnBackdrop && event.target === this.pickerModal) {
                this.closePickerModal();
            }
            this.modalPointerStartedOnBackdrop = false;
        });

        // 彈窗分類標籤（單屬性 / 雙屬性）
        this.pickerCategoryTabs.forEach((tab) => {
            tab.addEventListener("click", () => {
                this.pickerCategoryTabs.forEach((t) => {
                    const isActive = t === tab;
                    t.classList.toggle("is-active", isActive);
                    t.setAttribute("aria-selected", String(isActive));
                });
                this.typePickerCategory = tab.dataset.calcTypeCategory;
                this.renderPickerOptions();
            });
        });

        // ESC 鍵關閉彈窗
        this.pickerModal.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                this.closePickerModal();
            }
        });
    }

    setMode(mode) {
        if (this.currentMode === mode) return;
        this.currentMode = mode;
        this.modeAttackBtn.classList.toggle("is-active", mode === "attack");
        this.modeAttackBtn.setAttribute("aria-selected", String(mode === "attack"));
        this.modeDefenseBtn.classList.toggle("is-active", mode === "defense");
        this.modeDefenseBtn.setAttribute("aria-selected", String(mode === "defense"));
        this.renderResults();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.filterPills.forEach((pill) => {
            const isActive = pill.dataset.filter === filter;
            pill.classList.toggle("is-active", isActive);
            pill.setAttribute("aria-pressed", String(isActive));
        });
        this.renderResults();
    }

    setSelectedType(typeId) {
        if (this.selectedTypeId === typeId) return;
        this.selectedTypeId = typeId;
        this.render();
    }

    openPickerModal(opener = document.activeElement) {
        if (!this.pickerModal.hidden) return;
        this.pickerModalOpener = opener;
        this.pickerModal.classList.remove("is-closing");
        this.pickerModal.hidden = false;
        this.renderPickerOptions();
        this.pickerCloseBtn.focus();
    }

    closePickerModal(restoreFocus = true) {
        if (this.pickerModal.hidden || this.pickerModal.classList.contains("is-closing")) return;
        this.pickerModal.classList.add("is-closing");
        window.setTimeout(() => {
            if (!this.pickerModal.classList.contains("is-closing")) return;
            this.pickerModal.hidden = true;
            this.pickerModal.classList.remove("is-closing");
            if (restoreFocus && this.pickerModalOpener && this.pickerModalOpener.isConnected) {
                this.pickerModalOpener.focus();
            }
            this.pickerModalOpener = null;
        }, 180);
    }

    render() {
        const analysis = getTypeMatchupAnalysis(this.selectedTypeId);
        const { activeType } = analysis;

        // 更新頂部卡片
        this.currentIcon.src = `./seer_icons/${activeType.id}.png`;
        this.currentName.textContent = activeType.name;
        this.currentTag.textContent = activeType.isDouble ? "雙屬性" : "單屬性";
        this.currentTag.className = `type-calc-tag ${activeType.isDouble ? "is-double" : "is-single"}`;

        this.renderResults();
    }

    renderResults() {
        const analysis = getTypeMatchupAnalysis(this.selectedTypeId);
        const isAttack = this.currentMode === "attack";
        const items = isAttack ? analysis.attackResults : analysis.defenseResults;

        // 計算統計數字
        let counterCount = 0;
        let normalCount = 0;
        let weakCount = 0;
        let zeroCount = 0;

        items.forEach((item) => {
            const mult = item.multiplier;
            if (mult > 1.0) counterCount++;
            else if (mult === 1.0) normalCount++;
            else if (mult > 0.0) weakCount++;
            else zeroCount++;
        });

        this.countAll.textContent = String(items.length);
        this.countCounter.textContent = String(counterCount);
        this.countNormal.textContent = String(normalCount);
        this.countWeak.textContent = String(weakCount);
        this.countZero.textContent = String(zeroCount);

        // 依篩選條件過濾
        let filtered = items.filter((item) => {
            const mult = item.multiplier;
            if (this.currentFilter === "counter" && mult <= 1.0) return false;
            if (this.currentFilter === "normal" && mult !== 1.0) return false;
            if (this.currentFilter === "weak" && (mult <= 0 || mult >= 1.0)) return false;
            if (this.currentFilter === "zero" && mult !== 0) return false;

            if (this.searchQuery) {
                const targetName = item.type.name.toLowerCase();
                if (!targetName.includes(this.searchQuery.toLowerCase())) return false;
            }
            return true;
        });

        this.resultsGrid.replaceChildren();

        if (filtered.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "type-calc-empty";
            emptyState.textContent = "沒有符合條件的屬性";
            this.resultsGrid.append(emptyState);
            return;
        }

        // 遍歷所有屬性生成與圖片一模一樣的卡片
        filtered.forEach((item) => {
            const type = item.type;
            const mult = item.multiplier;

            const card = document.createElement("button");
            card.type = "button";
            card.className = "type-card";
            card.title = `點擊切換為此屬性（${type.name}，倍率: ${formatCardMultiplier(mult)}）`;
            card.setAttribute("aria-label", `查看 ${type.name} 的屬性克制（當前倍率 ${formatCardMultiplier(mult)}）`);

            const body = document.createElement("div");
            body.className = "type-card-body";

            const icon = document.createElement("img");
            icon.className = "type-card-icon";
            icon.src = `./seer_icons/${type.id}.png`;
            icon.alt = "";
            icon.loading = "lazy";
            icon.addEventListener("error", () => {
                icon.style.visibility = "hidden";
            }, { once: true });

            const name = document.createElement("span");
            name.className = "type-card-name";
            name.textContent = type.name;

            body.append(icon, name);

            const multBanner = document.createElement("div");
            multBanner.className = "type-card-multiplier";
            if (mult > 1.0) {
                multBanner.classList.add("is-counter");
            } else if (mult === 1.0) {
                multBanner.classList.add("is-normal");
            } else if (mult > 0.0) {
                multBanner.classList.add("is-weak");
            } else {
                multBanner.classList.add("is-zero");
            }
            multBanner.textContent = formatCardMultiplier(mult);

            card.append(body, multBanner);

            card.addEventListener("click", () => {
                this.setSelectedType(type.id);
                // 平滑滾動至頂部英雄卡片
                this.container.scrollIntoView({ behavior: "smooth", block: "start" });
            });

            this.resultsGrid.append(card);
        });
    }

    renderPickerOptions() {
        this.pickerOptionsContainer.replaceChildren();

        const filtered = combinations
            .filter((item) => item.isDouble === (this.typePickerCategory === "double"))
            .sort((a, b) => a.id - b.id);

        filtered.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "seer-pet-type-option";
            const isSelected = item.id === this.selectedTypeId;
            button.classList.toggle("is-active", isSelected);
            button.setAttribute("aria-pressed", String(isSelected));
            button.dataset.calcTypeId = String(item.id);

            const icon = document.createElement("img");
            icon.src = `./seer_icons/${item.id}.png`;
            icon.alt = "";
            icon.loading = "lazy";
            icon.addEventListener("error", () => { icon.hidden = true; }, { once: true });

            const name = document.createElement("span");
            name.textContent = item.name;

            button.append(icon, name);

            button.addEventListener("click", () => {
                this.setSelectedType(item.id);
                this.closePickerModal();
            });

            this.pickerOptionsContainer.append(button);
        });
    }
}

let typeCalculatorInstance = null;

export function initSeerTypeCalculator(containerSelector = "#type-chart-section") {
    const el = document.querySelector(containerSelector);
    if (!el) {
        console.warn(`Type calculator container ${containerSelector} not found.`);
        return null;
    }
    if (!typeCalculatorInstance) {
        typeCalculatorInstance = new SeerTypeCalculatorController(el);
    }
    return typeCalculatorInstance;
}
