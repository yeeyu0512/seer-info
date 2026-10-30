import { typePickerMethods } from "../types/picker-view.js";
import { createTypeLabel } from "../types/labels.js";
import { SEER_TYPE_DATA } from "../seer-type-data.js";

// Reuse the site's type picker markup and option rendering, with isolated state.
export function initDamageTypePicker(root, onChange) {
    const source = document.querySelector("#type-calc-modal .seer-pet-type-dialog");
    const dialog = document.createElement("dialog");
    dialog.className = "damage-type-dialog type-related-picker";
    dialog.setAttribute("aria-labelledby", "damage-type-modal-title");
    const content = source.cloneNode(true);
    content.removeAttribute("role");
    content.removeAttribute("aria-modal");
    for (const node of [content, ...content.querySelectorAll("*")]) {
        for (const attribute of ["id", "for", "aria-labelledby", "aria-controls"]) {
            if (node.hasAttribute(attribute)) node.setAttribute(attribute, node.getAttribute(attribute).replaceAll("type-calc", "damage-type"));
        }
    }
    dialog.append(content);
    root.append(dialog);
    const query = selector => dialog.querySelector(selector);
    const buttons = { vsA: root.querySelector("[data-player-type]"), vsB: root.querySelector("[data-boss-type]") };
    let opener;
    const picker = {
        vsTypeAId: null, vsTypeBId: null, currentPickerTarget: "vsA",
        pickerBaseType: null, pickerSearchQuery: "",
        pickerBases: query("#damage-type-picker-bases"),
        pickerSearchInput: query("#damage-type-picker-search"),
        pickerOptionsTitle: query("#damage-type-picker-options-title"),
        pickerOptionsContainer: query("#damage-type-modal-options"),
        renderPickerBases: typePickerMethods.renderPickerBases,
        renderPickerOptions: typePickerMethods.renderPickerOptions,
        setVsTypeA(id) { select("vsA", id); },
        setVsTypeB(id) { select("vsB", id); },
        closePickerModal() { dialog.close(); },
    };
    function select(side, id) {
        picker[side === "vsA" ? "vsTypeAId" : "vsTypeBId"] = id;
        const type = SEER_TYPE_DATA.combinations.find(item => item.id === id);
        buttons[side].querySelector("[data-type-name]").replaceChildren(createTypeLabel(type));
        buttons[side].classList.add("has-type");
        buttons[side].querySelector("[data-type-action]").textContent = "更換";
        const player = SEER_TYPE_DATA.combinations.find(item => item.id === picker.vsTypeAId);
        const boss = SEER_TYPE_DATA.combinations.find(item => item.id === picker.vsTypeBId);
        if (player && boss) onChange(player, boss);
    }
    for (const [side, button] of Object.entries(buttons)) button.addEventListener("click", () => {
        opener = button;
        picker.currentPickerTarget = side;
        const selected = SEER_TYPE_DATA.combinations.find(item => item.id === picker[side === "vsA" ? "vsTypeAId" : "vsTypeBId"]);
        picker.pickerBaseType = selected?.types[0] ?? null;
        picker.pickerSearchQuery = "";
        picker.pickerSearchInput.value = "";
        query("#damage-type-modal-title").textContent = side === "vsA" ? "選擇我方屬性" : "選擇 BOSS 屬性";
        picker.renderPickerBases();
        picker.renderPickerOptions();
        dialog.showModal();
        picker.pickerSearchInput.focus();
    });
    picker.pickerSearchInput.addEventListener("input", () => {
        picker.pickerSearchQuery = picker.pickerSearchInput.value;
        picker.renderPickerOptions();
    });
    query("#damage-type-modal-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener("close", () => opener?.focus({ preventScroll: true }));
}
