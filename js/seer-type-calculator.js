import { getSkillStoneMatchupAnalysis, calculateTypeMultiplier, getTypeMatchupAnalysis, formatMultiplier, formatCardMultiplier, getTypeEffectLabel, getTypeEffectClass } from "./types/core.js";
export { getSkillStoneMatchupAnalysis, calculateTypeMultiplier, getTypeMatchupAnalysis, formatMultiplier, formatCardMultiplier, getTypeEffectLabel, getTypeEffectClass } from "./types/core.js";
import { getRelatedTypeOptions } from "./shared/type-options.js";
export { getRelatedTypeOptions } from "./shared/type-options.js";
import { SEER_TYPE_DATA } from "./seer-type-data.js";

const { singleTypes, combinations } = SEER_TYPE_DATA;

// 建立 ID 快速對照索引
const combinationsById = new Map(combinations.map((item) => [item.id, item]));

function createTypeLabel(type, text = type.name) {
    const label = document.createElement("span");
    label.className = "type-vs-inline-type";
    const icon = document.createElement("img");
    icon.src = `./seer_icons/${type.id}.png`;
    icon.alt = "";
    label.append(icon, text);
    return label;
}

function renderAttackTitle(title, attacker, defender, attackerText = attacker.name) {
    const action = document.createElement("span");
    action.className = "type-vs-attack-label";
    action.textContent = "攻擊";
    title.replaceChildren(createTypeLabel(attacker, attackerText), action, createTypeLabel(defender));
}

// ==========================================
// UI 元件與控制器
// ==========================================

export class SeerTypeCalculatorController {
    constructor(containerElement) {
        this.container = containerElement;
        this.currentFeature = "lookup"; // 'lookup' | 'vs'
        this.selectedTypeId = null;
        this.vsTypeAId = null;
        this.vsTypeBId = null;
        this.selectedSkillStoneId = null;
        this.currentPickerTarget = "lookup"; // 'lookup' | 'vsA' | 'vsB'
        this.currentMode = "attack"; // 'attack' | 'defense'
        this.currentFilter = "all"; // 'all' | 'counter' | 'normal' | 'weak' | 'zero'
        this.searchQuery = "";
        this.pickerBaseType = null;
        this.pickerSearchQuery = "";
        this.pickerModalOpener = null;
        this.modalPointerStartedOnBackdrop = false;

        this.initDOMElements();
        this.bindEvents();
        this.render();
    }

    initDOMElements() {
        this.container.innerHTML = `
            <div class="type-calc-wrapper">
                <!-- 功能一：屬性倍率查詢 -->
                <div id="type-calc-view-lookup" class="type-calc-view-section">
                    <!-- 頂部屬性卡片：使用與精靈篩選相同的 trigger-card 樣式 -->
                    <div id="type-calc-trigger-card" class="seer-pet-type-trigger-card" role="button" tabindex="0" aria-haspopup="dialog" aria-label="開啟屬性選擇視窗">
                        <div class="seer-pet-type-current-info">
                            <span class="seer-pet-type-trigger-label">當前計算屬性</span>
                            <div class="seer-pet-type-current-badge">
                                <img id="type-calc-current-icon" class="seer-pet-type-current-icon" alt="" hidden>
                                <span id="type-calc-current-name">尚未選擇</span>
                                <span id="type-calc-current-tag" class="type-calc-tag" hidden></span>
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

                <!-- 功能二：對局屬性助手 -->
                <div id="type-calc-view-vs" class="type-calc-view-section type-vs-container" hidden>
                    <!-- 雙方屬性選擇器 -->
                    <div class="type-vs-selector-row">
                        <!-- 我方屬性 A -->
                        <div id="type-vs-trigger-a" class="type-vs-picker-card" role="button" tabindex="0" aria-label="選擇我方屬性">
                            <span class="type-vs-picker-role">我方屬性</span>
                            <div class="type-vs-picker-content">
                                <img id="type-vs-icon-a" class="type-vs-picker-icon" alt="" hidden>
                                <div class="type-vs-picker-meta">
                                    <span id="type-vs-name-a" class="type-vs-picker-name">尚未選擇</span>
                                </div>
                            </div>
                            <button id="type-vs-btn-a" class="primary-button compact-button type-vs-change-btn" type="button">更換屬性 ▾</button>
                        </div>

                        <!-- 互換按鈕 -->
                        <button id="type-vs-swap-btn" class="type-vs-swap-button" type="button" title="互換雙方屬性" aria-label="互換雙方屬性">
                            <span class="type-vs-swap-icon">⇄</span>
                        </button>

                        <!-- 對方屬性 B -->
                        <div id="type-vs-trigger-b" class="type-vs-picker-card" role="button" tabindex="0" aria-label="選擇對方屬性">
                            <span class="type-vs-picker-role is-opponent">對方屬性</span>
                            <div class="type-vs-picker-content">
                                <img id="type-vs-icon-b" class="type-vs-picker-icon" alt="" hidden>
                                <div class="type-vs-picker-meta">
                                    <span id="type-vs-name-b" class="type-vs-picker-name">尚未選擇</span>
                                </div>
                            </div>
                            <button id="type-vs-btn-b" class="primary-button compact-button type-vs-change-btn" type="button">更換屬性 ▾</button>
                        </div>
                    </div>

                    <div class="type-vs-stone-selection">
                        <span>我方技能石</span>
                        <button id="type-vs-stone-select" class="secondary-button compact-button" type="button" aria-haspopup="dialog">不攜帶 ▾</button>
                    </div>
                    <p id="type-vs-empty" class="panel-description" role="status">請選擇我方與對方屬性。</p>
                    <div class="type-vs-results-grid" aria-live="polite" aria-label="攻擊倍率" hidden>
                        <div class="type-vs-result-card">
                            <span id="type-vs-card-title-a" class="type-vs-result-title"></span>
                            <div class="type-vs-stat-val-group">
                                <span id="type-vs-atk-mult-a" class="type-vs-stat-multiplier"></span>
                                <span id="type-vs-atk-badge-a" class="type-vs-stat-tag"></span>
                            </div>
                        </div>
                        <div class="type-vs-result-card">
                            <span id="type-vs-card-title-b" class="type-vs-result-title"></span>
                            <div class="type-vs-stat-val-group">
                                <span id="type-vs-atk-mult-b" class="type-vs-stat-multiplier"></span>
                                <span id="type-vs-atk-badge-b" class="type-vs-stat-tag"></span>
                            </div>
                        </div>
                    </div>
                    <div id="type-vs-stone-result" class="type-vs-result-card" aria-live="polite" hidden>
                        <span id="type-vs-stone-title" class="type-vs-result-title"></span>
                        <div class="type-vs-stat-val-group">
                            <span id="type-vs-stone-mult" class="type-vs-stat-multiplier"></span>
                            <span id="type-vs-stone-badge" class="type-vs-stat-tag"></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Sub-tabs elements
        this.tabLookupBtn = document.getElementById("type-calc-tab-lookup");
        this.tabVsBtn = document.getElementById("type-calc-tab-vs");
        this.lookupView = this.container.querySelector("#type-calc-view-lookup");
        this.vsView = this.container.querySelector("#type-calc-view-vs");

        // Lookup View elements
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

        // VS View elements
        this.vsTriggerA = this.container.querySelector("#type-vs-trigger-a");
        this.vsBtnA = this.container.querySelector("#type-vs-btn-a");
        this.vsIconA = this.container.querySelector("#type-vs-icon-a");
        this.vsNameA = this.container.querySelector("#type-vs-name-a");

        this.vsSwapBtn = this.container.querySelector("#type-vs-swap-btn");

        this.vsTriggerB = this.container.querySelector("#type-vs-trigger-b");
        this.vsBtnB = this.container.querySelector("#type-vs-btn-b");
        this.vsIconB = this.container.querySelector("#type-vs-icon-b");
        this.vsNameB = this.container.querySelector("#type-vs-name-b");


        this.vsCardTitleA = this.container.querySelector("#type-vs-card-title-a");
        this.vsAtkMultA = this.container.querySelector("#type-vs-atk-mult-a");
        this.vsAtkBadgeA = this.container.querySelector("#type-vs-atk-badge-a");

        this.vsCardTitleB = this.container.querySelector("#type-vs-card-title-b");
        this.vsAtkMultB = this.container.querySelector("#type-vs-atk-mult-b");
        this.vsAtkBadgeB = this.container.querySelector("#type-vs-atk-badge-b");
        this.vsResults = this.container.querySelector(".type-vs-results-grid");
        this.vsEmpty = this.container.querySelector("#type-vs-empty");

        this.vsStoneSelect = this.container.querySelector("#type-vs-stone-select");
        this.vsStoneResult = this.container.querySelector("#type-vs-stone-result");
        this.vsStoneTitle = this.container.querySelector("#type-vs-stone-title");
        this.vsStoneMult = this.container.querySelector("#type-vs-stone-mult");
        this.vsStoneBadge = this.container.querySelector("#type-vs-stone-badge");

        // Global Modal elements (位於 document.body 層級，與精靈屬性彈窗完全相同)
        this.pickerModal = document.getElementById("type-calc-modal");
        this.pickerCloseBtn = document.getElementById("type-calc-modal-close");
        this.pickerOptionsContainer = document.getElementById("type-calc-modal-options");
        this.pickerBases = document.getElementById("type-calc-picker-bases");
        this.pickerBasePanel = document.getElementById("type-calc-picker-base-panel");
        this.pickerOptionsTitle = document.getElementById("type-calc-picker-options-title");
        this.pickerSearchInput = document.getElementById("type-calc-picker-search");
        this.pickerSearchRow = document.getElementById("type-calc-picker-search-row");
    }

    bindEvents() {
        this.vsStoneSelect.addEventListener("click", () => {
            this.currentPickerTarget = "stone";
            this.openPickerModal(this.vsStoneSelect, "選擇我方技能石");
        });
        // 功能子標籤切換 (速查 / 對決)
        this.tabLookupBtn.addEventListener("click", () => this.setFeature("lookup"));
        this.tabVsBtn.addEventListener("click", () => this.setFeature("vs"));

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

        // 速查觸發卡片點擊開啟彈窗
        this.triggerCard.addEventListener("click", () => this.openPickerForLookup(this.triggerCard));
        this.triggerCard.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.openPickerForLookup(this.triggerCard);
            }
        });
        this.openModalBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openPickerForLookup(this.openModalBtn);
        });

        // 對決試算 A / B 屬性觸發
        this.vsTriggerA.addEventListener("click", () => this.openPickerForVsA(this.vsTriggerA));
        this.vsTriggerA.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.openPickerForVsA(this.vsTriggerA);
            }
        });
        this.vsBtnA.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openPickerForVsA(this.vsBtnA);
        });

        this.vsTriggerB.addEventListener("click", () => this.openPickerForVsB(this.vsTriggerB));
        this.vsTriggerB.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                this.openPickerForVsB(this.vsTriggerB);
            }
        });
        this.vsBtnB.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openPickerForVsB(this.vsBtnB);
        });

        // 雙方互換按鈕
        this.vsSwapBtn.addEventListener("click", () => this.swapVsTypes());

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

        this.pickerSearchInput.addEventListener("input", () => {
            this.pickerSearchQuery = this.pickerSearchInput.value;
            this.renderPickerOptions();
        });

        // ESC 鍵關閉彈窗
        this.pickerModal.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                event.preventDefault();
                this.closePickerModal();
            }
        });
    }

    setFeature(feature) {
        if (this.currentFeature === feature) return;
        this.currentFeature = feature;

        const isLookup = feature === "lookup";
        this.tabLookupBtn.classList.toggle("is-active", isLookup);
        this.tabLookupBtn.setAttribute("aria-selected", String(isLookup));

        this.tabVsBtn.classList.toggle("is-active", !isLookup);
        this.tabVsBtn.setAttribute("aria-selected", String(!isLookup));

        this.lookupView.hidden = !isLookup;
        this.vsView.hidden = isLookup;

        this.render();
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

    openLookup(typeId) {
        if (!combinationsById.has(typeId)) return false;
        this.searchQuery = "";
        this.targetSearchInput.value = "";
        this.selectedTypeId = typeId;
        this.setFeature("lookup");
        this.setMode("attack");
        this.setFilter("all");
        this.render();
        return true;
    }

    setVsTypeA(typeId) {
        if (this.vsTypeAId === typeId) return;
        this.vsTypeAId = typeId;
        this.renderVs();
    }

    setVsTypeB(typeId) {
        if (this.vsTypeBId === typeId) return;
        this.vsTypeBId = typeId;
        this.renderVs();
    }

    swapVsTypes() {
        const temp = this.vsTypeAId;
        this.vsTypeAId = this.vsTypeBId;
        this.vsTypeBId = temp;
        this.renderVs();
    }

    openPickerForLookup(opener) {
        this.currentPickerTarget = "lookup";
        this.openPickerModal(opener, "選擇計算屬性");
    }

    openPickerForVsA(opener) {
        this.currentPickerTarget = "vsA";
        this.openPickerModal(opener, "選擇我方屬性");
    }

    openPickerForVsB(opener) {
        this.currentPickerTarget = "vsB";
        this.openPickerModal(opener, "選擇對方屬性");
    }

    openPickerModal(opener = document.activeElement, titleText = "選擇屬性") {
        if (!this.pickerModal.hidden) return;
        this.pickerModalOpener = opener;
        const modalTitle = document.getElementById("type-calc-modal-title");
        if (modalTitle) modalTitle.textContent = titleText;
        const isStone = this.currentPickerTarget === "stone";
        this.pickerBasePanel.hidden = isStone;
        this.pickerSearchRow.hidden = isStone;
        this.pickerOptionsTitle.hidden = isStone;
        this.pickerModal.classList.toggle("is-stone-picker", isStone);
        this.pickerSearchQuery = "";
        this.pickerSearchInput.value = "";
        if (!isStone) {
            const activeId = this.currentPickerTarget === "vsA" ? this.vsTypeAId
                : this.currentPickerTarget === "vsB" ? this.vsTypeBId : this.selectedTypeId;
            this.pickerBaseType = combinationsById.get(activeId)?.types[0] || null;
            this.renderPickerBases();
        }
        this.pickerModal.querySelector(".seer-pet-info-message").textContent = isStone
            ? "選擇一種技能石，或不攜帶。"
            : "點選單屬性，查看相關組合。";
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
        if (this.currentFeature === "lookup") {
            const activeType = combinationsById.get(this.selectedTypeId);
            const hasType = Boolean(activeType);
            this.currentIcon.hidden = !hasType;
            this.currentTag.hidden = !hasType;
            this.container.querySelector(".type-calc-controls-bar").hidden = !hasType;
            this.container.querySelector(".type-calc-stats-bar").hidden = !hasType;
            this.currentName.textContent = activeType?.name || "尚未選擇";
            if (!hasType) {
                this.renderResults();
                return;
            }

            // 更新頂部卡片
            this.currentIcon.src = `./seer_icons/${activeType.id}.png`;
            this.currentName.textContent = activeType.name;
            this.currentTag.textContent = activeType.isDouble ? "雙屬性" : "單屬性";
            this.currentTag.className = `type-calc-tag ${activeType.isDouble ? "is-double" : "is-single"}`;

            this.renderResults();
        } else if (this.currentFeature === "vs") {
            this.renderVs();
        }
    }

    renderVs() {
        const typeA = combinationsById.get(this.vsTypeAId);
        const typeB = combinationsById.get(this.vsTypeBId);

        for (const [type, icon, name, button] of [
            [typeA, this.vsIconA, this.vsNameA, this.vsBtnA],
            [typeB, this.vsIconB, this.vsNameB, this.vsBtnB],
        ]) {
            icon.hidden = !type;
            if (type) icon.src = `./seer_icons/${type.id}.png`;
            name.textContent = type?.name || "尚未選擇";
            button.textContent = type ? "更換屬性 ▾" : "選擇屬性 ▾";
        }
        const ready = Boolean(typeA && typeB);
        this.vsResults.hidden = !ready;
        this.vsEmpty.hidden = ready;
        this.vsEmpty.textContent = !typeA && !typeB ? "請選擇我方與對方屬性。"
            : !typeA ? "請選擇我方屬性。" : "請選擇對方屬性。";
        this.renderSkillStones();
        if (!ready) return;

        // 屬性 A 更新
        this.vsIconA.src = `./seer_icons/${typeA.id}.png`;
        this.vsNameA.textContent = typeA.name;

        // 屬性 B 更新
        this.vsIconB.src = `./seer_icons/${typeB.id}.png`;
        this.vsNameB.textContent = typeB.name;

        // 倍率計算
        const multAtoB = calculateTypeMultiplier(typeA.types, typeB.types);
        const multBtoA = calculateTypeMultiplier(typeB.types, typeA.types);

        // 卡片標題
        for (const [title, attacker, defender] of [
            [this.vsCardTitleA, typeA, typeB],
            [this.vsCardTitleB, typeB, typeA],
        ]) {
            renderAttackTitle(title, attacker, defender);
        }

        // 我方攻擊
        // A 攻擊 B (進攻克制倍率)
        this.vsAtkMultA.textContent = formatMultiplier(multAtoB);
        this.vsAtkBadgeA.textContent = getTypeEffectLabel(multAtoB, false);
        this.vsAtkBadgeA.className = `type-vs-stat-tag ${getTypeEffectClass(multAtoB)}`;

        // 對方攻擊
        // B 攻擊 A (進攻克制倍率)
        this.vsAtkMultB.textContent = formatMultiplier(multBtoA);
        this.vsAtkBadgeB.textContent = getTypeEffectLabel(multBtoA, false);
        this.vsAtkBadgeB.className = `type-vs-stat-tag ${getTypeEffectClass(multBtoA)}`;

    }

    renderSkillStones() {
        const target = combinationsById.get(this.vsTypeBId);
        const stone = combinationsById.get(this.selectedSkillStoneId);
        if (stone) {
            this.vsStoneSelect.replaceChildren(createTypeLabel(stone, `${stone.name}系技能石`), " ▾");
        } else {
            this.vsStoneSelect.textContent = "不攜帶 ▾";
        }
        this.vsStoneResult.hidden = !stone || !target;
        if (!stone || !target) return;
        const multiplier = calculateTypeMultiplier(stone.types, target.types);
        renderAttackTitle(this.vsStoneTitle, stone, target, `${stone.name}系技能石`);
        this.vsStoneMult.textContent = formatMultiplier(multiplier);
        this.vsStoneBadge.textContent = getTypeEffectLabel(multiplier);
        this.vsStoneBadge.className = `type-vs-stat-tag ${getTypeEffectClass(multiplier)}`;
    }

    renderStonePicker() {
        const fragment = document.createDocumentFragment();
        const none = document.createElement("button");
        none.type = "button";
        none.className = "seer-pet-type-option";
        none.textContent = "不攜帶";
        none.setAttribute("aria-pressed", String(this.selectedSkillStoneId === null));
        none.classList.toggle("is-active", this.selectedSkillStoneId === null);
        none.addEventListener("click", () => this.selectSkillStone(null));
        fragment.append(none);
        const stoneTypes = combinations
            .filter((type) => type.types.length === 1 && skillStoneTypeNames.has(type.name))
            .sort((a, b) => a.id - b.id);
        for (const type of stoneTypes) {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "seer-pet-type-option";
            item.classList.toggle("is-active", type.id === this.selectedSkillStoneId);
            item.setAttribute("aria-pressed", String(type.id === this.selectedSkillStoneId));
            const icon = document.createElement("img");
            icon.src = `./seer_icons/${type.id}.png`;
            icon.alt = "";
            const name = document.createElement("span");
            name.textContent = type.name;
            item.append(icon, name);
            item.addEventListener("click", () => this.selectSkillStone(type.id));
            fragment.append(item);
        }
        this.pickerOptionsContainer.replaceChildren(fragment);
    }

    selectSkillStone(typeId) {
        this.selectedSkillStoneId = typeId;
        this.renderSkillStones();
        this.closePickerModal();
    }

    renderResults() {
        if (!combinationsById.has(this.selectedTypeId)) {
            for (const count of [this.countAll, this.countCounter, this.countNormal, this.countWeak, this.countZero]) {
                count.textContent = "0";
            }
            const hint = document.createElement("p");
            hint.className = "type-calc-empty";
            hint.textContent = "請先選擇要查詢的屬性。";
            this.resultsGrid.replaceChildren(hint);
            return;
        }
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

    renderPickerBases() {
        this.pickerBases.replaceChildren();
        for (const type of combinations.filter(type => type.types.length === 1)) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "seer-pet-type-option";
            button.dataset.baseType = type.name;
            button.append(createTypeLabel(type));
            button.addEventListener("click", () => {
                this.pickerBaseType = type.name;
                this.pickerSearchQuery = "";
                this.pickerSearchInput.value = "";
                this.renderPickerOptions();
                this.pickerOptionsContainer.scrollTop = 0;
            });
            this.pickerBases.append(button);
        }
    }

    renderPickerOptions() {
        if (this.currentPickerTarget === "stone") {
            this.pickerOptionsContainer.classList.remove("is-empty");
            this.renderStonePicker();
            return;
        }
        this.pickerOptionsContainer.replaceChildren();

        const activeId =
            this.currentPickerTarget === "vsA" ? this.vsTypeAId :
            this.currentPickerTarget === "vsB" ? this.vsTypeBId :
            this.selectedTypeId;

        const filtered = getRelatedTypeOptions(this.pickerBaseType, this.pickerSearchQuery);
        for (const button of this.pickerBases.querySelectorAll("[data-base-type]")) {
            const active = button.dataset.baseType === this.pickerBaseType && !this.pickerSearchQuery.trim();
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-pressed", String(active));
        }
        this.pickerOptionsTitle.textContent = this.pickerSearchQuery.trim() ? `搜尋結果（${filtered.length}）`
            : this.pickerBaseType ? `${this.pickerBaseType}系相關屬性（${filtered.length}）` : "相關屬性";
        this.pickerOptionsContainer.classList.toggle("is-empty", !filtered.length);
        if (!filtered.length) {
            const hint = document.createElement("p");
            hint.className = "type-calc-picker-hint";
            hint.textContent = this.pickerSearchQuery.trim() ? "找不到符合的屬性" : "選擇一個單屬性";
            const detail = document.createElement("span");
            detail.textContent = this.pickerSearchQuery.trim() ? "試試其他名稱或縮短關鍵字" : "相關雙屬性會顯示在這裡";
            hint.append(detail);
            this.pickerOptionsContainer.append(hint);
        }

        filtered.forEach((item) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "seer-pet-type-option";
            const isSelected = item.id === activeId;
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
                if (this.currentPickerTarget === "vsA") {
                    this.setVsTypeA(item.id);
                } else if (this.currentPickerTarget === "vsB") {
                    this.setVsTypeB(item.id);
                } else {
                    this.setSelectedType(item.id);
                }
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
