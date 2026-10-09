import { typeIconUrl } from "./shared/assets.js";
import {createTypeLabel, renderAttackTitle} from "./types/labels.js";
import { typePickerMethods } from "./types/picker-view.js";
import { TYPE_CALCULATOR_TEMPLATE } from "./types/template.js";
import { getSkillStoneTypes, calculateTypeMultiplier, getTypeMatchupAnalysis, formatMultiplier, formatCardMultiplier, getTypeEffectLabel, getTypeEffectClass } from "./types/core.js";
export { getSkillStoneMatchupAnalysis, calculateTypeMultiplier, getTypeMatchupAnalysis, formatMultiplier, formatCardMultiplier, getTypeEffectLabel, getTypeEffectClass } from "./types/core.js";
import { getRelatedTypeOptions } from "./shared/type-options.js";
export { getRelatedTypeOptions } from "./shared/type-options.js";
import { SEER_TYPE_DATA } from "./seer-type-data.js";

const { singleTypes, combinations } = SEER_TYPE_DATA;

// 建立 ID 快速對照索引
const combinationsById = new Map(combinations.map((item) => [item.id, item]));





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
        this.currentPickerTarget = "lookup"; // 'lookup' | 'vsA' | 'vsB' | 'stone'
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
        this.container.innerHTML = TYPE_CALCULATOR_TEMPLATE;

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
            this.currentIcon.src = typeIconUrl(activeType.id);
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
            if (type) icon.src = typeIconUrl(type.id);
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
        this.vsIconA.src = typeIconUrl(typeA.id);
        this.vsNameA.textContent = typeA.name;

        // 屬性 B 更新
        this.vsIconB.src = typeIconUrl(typeB.id);
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
        for (const type of getSkillStoneTypes()) {
            const item = document.createElement("button");
            item.type = "button";
            item.className = "seer-pet-type-option";
            item.classList.toggle("is-active", type.id === this.selectedSkillStoneId);
            item.setAttribute("aria-pressed", String(type.id === this.selectedSkillStoneId));
            const icon = document.createElement("img");
            icon.src = typeIconUrl(type.id);
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
            icon.src = typeIconUrl(type.id);
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

    

    
}

Object.assign(SeerTypeCalculatorController.prototype, typePickerMethods);

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
