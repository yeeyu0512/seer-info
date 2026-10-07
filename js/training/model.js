import { trainingModes } from "../seer-training-core.js";
export function trainingDescription(record, kind) {
        return kind === "title" ? record.ability_desc || "無六維能力加成" : record.bonus?.desc || "無六維能力加成";
    }

export function trainingSource(record, kind, name) {
        const stats = kind === "title" ? record.attr_bonus : record.bonus?.attribute;
        if (!stats || stats.percent) return null;
        return {label:name(record), stats, modes:trainingModes(record, trainingDescription(record, kind))};
    }
