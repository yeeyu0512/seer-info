import { SEER_TYPE_DATA } from "../seer-type-data.js";

const { combinations } = SEER_TYPE_DATA;

export function getRelatedTypeOptions(baseType, query = "", catalog = combinations) {
    const normalize = value => value.replace(/[\s·・／/]/g, "");
    const search = normalize(query.trim());
    return catalog.filter(type => search
        ? normalize(type.name).includes(search) || normalize(type.types.join("")).includes(search)
        : type.types.includes(baseType)
    ).sort((a, b) => a.types.length - b.types.length || a.id - b.id);
}

