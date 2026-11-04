export const TAIWAN_CONTENT_KINDS = ["pet", "skin", "mintmark", "suit"];

// Keep ranges compact: a large range must not allocate one entry per ID.
export function parseTaiwanExclusions(value = "") {
    if (typeof value !== "string") throw new Error("排除清單必須是文字。");
    const ranges = [];
    for (const [index, line] of value.normalize("NFKC").split(/\r?\n/).entries()) {
        const content = line.split("#", 1)[0].trim();
        if (!content) continue;
        const match = content.match(/^(\d+)(?:\s*[-–—~～至]\s*(\d+))?$/);
        const start = Number(match?.[1]), end = Number(match?.[2] ?? match?.[1]);
        if (!match || !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 1 || end < start) {
            throw new Error(`第 ${index + 1} 行格式有誤，請輸入正整數或由小到大的編號範圍。`);
        }
        ranges.push([start, end]);
    }
    return ranges;
}

export function normalizeTaiwanExclusions(value = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("台服排除清單格式有誤。");
    const exclusions = Object.fromEntries(TAIWAN_CONTENT_KINDS.map(kind => {
        const text = value[kind] ?? "";
        parseTaiwanExclusions(text);
        return [kind, text];
    }));
    if (Object.hasOwn(value, "latestSuitId")) {
        const id = value.latestSuitId;
        if (id !== null && (!Number.isSafeInteger(id) || id < 1)) throw new Error("台服最新套裝編號必須是正整數或留空。");
        exclusions.latestSuitId = id;
    }
    return exclusions;
}

export function isTaiwanExcluded(id, ranges = []) {
    return ranges.some(([start, end]) => Number(id) >= start && Number(id) <= end);
}

export function matchesTaiwanPetProgress(pet, settings) {
    if (!settings) return true;
    const id = Number(pet?.id);
    return Number.isSafeInteger(id) && id > 0
        && (id === 5000 || id <= settings.latestPetId)
        && !isTaiwanExcluded(id, settings.excludedRanges?.pet);
}

export function matchesTaiwanSkinProgress(skin, pet, settings) {
    if (!settings) return true;
    const id = Number(skin?.id);
    return Number.isSafeInteger(id) && id > 0 && id <= settings.latestSkinId
        && !isTaiwanExcluded(id, settings.excludedRanges?.skin)
        && matchesTaiwanPetProgress(pet || skin?.pet, settings);
}

export function matchesTaiwanSuitProgress(suit, settings) {
    if (!settings) return true;
    const id = Number(suit?.id);
    return Number.isSafeInteger(id) && id > 0
        && Number.isSafeInteger(settings.latestSuitId) && settings.latestSuitId > 0
        && id <= settings.latestSuitId && !isTaiwanExcluded(id, settings.excludedRanges?.suit);
}
