import { mintmarkFinalStats } from "../seer-mintmark-stats.js";

const API = "https://api.seerapi.com/v1/mintmark";
const STATS = [["atk", "攻擊"], ["sp_atk", "特攻"], ["def", "防禦"], ["sp_def", "特防"], ["spd", "速度"], ["hp", "體力"]];

export function mintmarkCornerCount(record) {
    if (![0, 3].includes(Number(record.type?.id)) || !record.max_attr_value) return null;
    const count = STATS.filter(([key]) => mintmarkFinalStats(record)[key] > 0).length;
    return count || null;
}

export function selectMintmarks(records, { query = "", type = "3", sort = "id", showExclusive = false, maxId = null, corners = "all", series = "all" } = {}) {
    const key = query.trim().toLocaleLowerCase();
    return records.filter(record => !record.is_hidden
        && (maxId === null || record.id <= maxId)
        && (type === "all" || String(record.type?.id) === type)
        && (corners === "all" || (corners === "none" ? mintmarkCornerCount(record) === null : mintmarkCornerCount(record) === Number(corners)))
        && (series === "all" || (series === "none" ? !record.mintmark_class?.id : String(record.mintmark_class?.id) === String(series)))
        && (showExclusive || Number(record.type?.id) !== 3
            || !(record.pet?.length || /專屬|专属/.test(`${record.name} ${record.searchName || ""}`)))
        && (!key || String(record.id).includes(key) || record.name.toLocaleLowerCase().includes(key) || record.searchName?.toLocaleLowerCase().includes(key)))
        .sort((a, b) => sort === "id" ? b.id - a.id
            : (Number(mintmarkFinalStats(b)?.[sort]) || 0) - (Number(mintmarkFinalStats(a)?.[sort]) || 0) || b.id - a.id);
}

export async function fetchMintmarkSeries(fetchJson) {
    const series = new Map();
    const visited = new Set();
    let next = "https://api.seerapi.com/v1/mintmark_class?offset=0&limit=200&expand=true";
    while (next) {
        const url = new URL(next);
        if (url.origin !== "https://api.seerapi.com" || url.pathname !== "/v1/mintmark_class" || visited.has(url.href)) throw new Error("刻印系列分頁網址無效");
        visited.add(url.href);
        const page = await fetchJson(url.href);
        if (!Array.isArray(page.results)) throw new Error("刻印系列格式無效");
        page.results.forEach(item => {
            if (Number.isSafeInteger(item.id) && typeof item.name === "string") series.set(item.id, { id: item.id, name: item.name });
        });
        next = page.next;
    }
    return [...series.values()];
}

export async function fetchMintmarkCatalog(fetchJson, onProgress = () => {}) {
    const records = new Map();
    let next = `${API}?offset=0&limit=200&expand=true`;
    const visited = new Set();
    while (next) {
        const url = new URL(next);
        if (url.origin !== "https://api.seerapi.com" || url.pathname !== "/v1/mintmark" || visited.has(url.href)) {
            throw new Error("刻印資料分頁網址無效");
        }
        visited.add(url.href);
        const page = await fetchJson(url.href);
        if (!Array.isArray(page.results)) throw new Error("刻印資料格式無效");
        page.results.forEach(record => {
            if (Number.isSafeInteger(record.id) && typeof record.name === "string") records.set(record.id, record);
        });
        onProgress(records.size, page.count);
        next = page.next;
    }
    return [...records.values()];
}

