import { TRAINING_STATS } from "../seer-training-core.js";

// Preserve every other stat; a full target may leave some of the total unspent.
export function fillLearningEffort(values, target) {
    const keys = TRAINING_STATS.map(([key]) => key);
    if (!keys.includes(target)) throw new Error("無效學習力項目");
    if (keys.some(key => !Number.isInteger(values[key]) || values[key] < 0 || values[key] > 255)) return values[target];
    const total = keys.reduce((sum, key) => sum + values[key], 0);
    if (total >= 510) return values[target];
    return Math.min(255, values[target] + 510 - total);
}
