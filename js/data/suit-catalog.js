const API = "https://api.seerapi.com/v1/suit";
export const COMMON_SUIT_IDS = new Set([447, 462, 365, 448, 428, 474]);

export function suitBattleModes(record) {
    if (!record.bonus) return [];
    const characters = { 赛: "賽", 尔: "爾", 仅: "僅", 与: "與", 间: "間", 对: "對", 战: "戰", 无: "無", 适: "適" };
    const description = (record.bonus.desc || "").replace(/\s/g, "").toUpperCase().replace(/[赛尔仅与间对战无适]/g, character => characters[character]);
    const pveOnly = /(?:僅限|只限|只在)(?:賽爾與)?(?:BOSS|PVE)/.test(description);
    const pvpOnly = /(?:僅限|只限|只在)(?:賽爾與賽爾|PVP|玩家)/.test(description);
    const pveExcluded = /(?:PVE|BOSS)(?:間對戰|對戰)?(?:中)?[：:]?(?:無效|不生效|不適用)/.test(description);
    const pvpExcluded = /(?:PVP|玩家對戰|賽爾與賽爾間對戰)(?:中)?[：:]?(?:無效|不生效|不適用)/.test(description);
    return [!pveExcluded && (!pvpOnly || pveOnly) && "PVE", !pvpExcluded && (!pveOnly || pvpOnly) && "PVP"].filter(Boolean);
}

export function selectSuits(records, { query = "", effect = "all", battleMode = "all", sort = "newest" } = {}) {
    const key = query.trim().toLocaleLowerCase();
    return records.filter(record => (!key || [record.name, record.searchName, String(record.id)].some(value => value?.toLocaleLowerCase().includes(key)))
        && (effect === "all" || (effect === "common" ? COMMON_SUIT_IDS.has(record.id) : effect === "bonus" ? Boolean(record.bonus) : !record.bonus))
        && (battleMode === "all" || suitBattleModes(record).includes(battleMode)))
        .sort((a, b) => sort === "oldest" ? a.id - b.id : b.id - a.id);
}

export async function fetchSuitCatalog(fetchJson, onProgress = () => {}) {
    const records = new Map(), visited = new Set();
    let next = `${API}?offset=0&limit=200&expand=true`;
    while (next) {
        const url = new URL(next);
        if (url.origin !== "https://api.seerapi.com" || url.pathname !== "/v1/suit" || visited.has(url.href)) throw new Error("套裝分頁網址無效");
        visited.add(url.href);
        const page = await fetchJson(url.href, { signal: AbortSignal.timeout(20000) });
        if (!Array.isArray(page.results)) throw new Error("套裝資料格式無效");
        page.results.forEach(record => { if (Number.isSafeInteger(record.id) && typeof record.name === "string") records.set(record.id, record); });
        onProgress(records.size, page.count); next = page.next;
    }
    return [...records.values()];
}
