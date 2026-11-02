export const CN_VOTES_ENDPOINT = "https://seer-info-tw-api.koreacentral.cloudapp.azure.com/api/cn/votes";

export function validateVoteSnapshot(data) {
    const validDate = value => typeof value === "string" && Number.isFinite(Date.parse(value));
    if (!data || data.server !== "cn" || !validDate(data.fetched_at)
        || typeof data.cached !== "boolean" || typeof data.realtime !== "boolean"
        || !Number.isInteger(data.cache_seconds) || data.cache_seconds < 0
        || !Array.isArray(data.pools) || data.pools.length !== 2) throw new Error("票選資料格式異常，請稍後重試。");
    const limits = new Set();
    for (const pool of data.pools) {
        if (![2, 3].includes(pool.limit) || limits.has(pool.limit)
            || pool.top_n !== (pool.limit === 2 ? 20 : 30)
            || !validDate(pool.start_at) || !validDate(pool.end_at)
            || !["upcoming", "active", "ended"].includes(pool.status)
            || !Array.isArray(pool.list) || pool.list.length > pool.top_n) throw new Error("票選資料格式異常，請稍後重試。");
        limits.add(pool.limit);
        for (const item of pool.list) {
            if (!Number.isSafeInteger(item.pet_id) || item.pet_id <= 0
                || !Number.isSafeInteger(item.rank) || item.rank <= 0
                || !Number.isSafeInteger(item.votes) || item.votes < 0) throw new Error("票選資料格式異常，請稍後重試。");
        }
    }
    return data;
}

export async function fetchCnVotes({ signal, fetchImpl = globalThis.fetch } = {}) {
    const response = await fetchImpl(CN_VOTES_ENDPOINT, { signal, cache: "no-store", credentials: "omit" });
    if (!response.ok) {
        const messages = {
            429: "查詢過於頻繁或服務暫時冷卻，請稍後再試。",
            502: "陸服票選資料取得失敗，請稍後重試。",
            503: "陸服票選服務暫停，請稍後再試。",
            504: "查詢等候逾時，請稍後重試。"
        };
        const error = new Error(messages[response.status] || "票選資料載入失敗，請稍後重試。");
        if (response.status === 429) {
            const seconds = Number(response.headers.get("Retry-After"));
            error.retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 300) : 30;
        }
        throw error;
    }
    return validateVoteSnapshot(await response.json());
}
