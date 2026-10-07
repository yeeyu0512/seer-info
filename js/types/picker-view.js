import { typeIconUrl } from "../shared/assets.js";
import {createTypeLabel} from "./labels.js";
import { SEER_TYPE_DATA } from "../seer-type-data.js";
import { getRelatedTypeOptions } from "../shared/type-options.js";
const { singleTypes, combinations } = SEER_TYPE_DATA;
const combinationsById = new Map(combinations.map(item => [item.id,item]));
export const typePickerMethods = {
openPickerForLookup(opener) {
        this.currentPickerTarget = "lookup";
        this.openPickerModal(opener, "選擇計算屬性");
    },
openPickerForVsA(opener) {
        this.currentPickerTarget = "vsA";
        this.openPickerModal(opener, "選擇我方屬性");
    },
openPickerForVsB(opener) {
        this.currentPickerTarget = "vsB";
        this.openPickerModal(opener, "選擇對方屬性");
    },
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
    },
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
    },
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
    },
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
            icon.src = typeIconUrl(item.id);
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
};
