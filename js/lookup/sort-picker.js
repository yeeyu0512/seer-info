import { createSelectionPicker } from "../shared/selection-picker.js";

export function initSortPicker(select) {
    return createSelectionPicker(select, {
        triggerId: "seer-pet-sort-trigger",
        menuId: "seer-pet-sort-options",
        label: "精靈排序"
    });
}
