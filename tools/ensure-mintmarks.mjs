import { pathToFileURL } from 'node:url';
import { refreshMintmarkFiles } from './fetch-mintmarks.mjs';
import { LOCAL_MINTMARKS, readMintmarkFiles, syncPublishedMintmarks } from './mintmark-files.mjs';

const TAIWAN_OFFSET = 8 * 60 * 60 * 1000, WEEK = 7 * 24 * 60 * 60 * 1000;
export function latestMintmarkRefresh(now = new Date()) {
    const local = new Date(now.getTime() + TAIWAN_OFFSET);
    local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 2) % 7);
    local.setUTCHours(18, 0, 0, 0);
    let boundary = local.getTime() - TAIWAN_OFFSET;
    if (boundary > now.getTime()) boundary -= WEEK;
    return new Date(boundary);
}
const taiwanDate = date => new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', dateStyle: 'short', timeStyle: 'short', hour12: false,
}).format(date);

export async function ensureMintmarks({
    directory = LOCAL_MINTMARKS, now = new Date(), refresh = refreshMintmarkFiles,
    sync = syncPublishedMintmarks, log = console.log, warn = console.warn,
} = {}) {
    let local;
    try { local = await readMintmarkFiles(directory); } catch { /* Initial or invalid local generation. */ }
    const boundary = latestMintmarkRefresh(now);
    const fresh = manifest => {
        const date = new Date(manifest.fetchedAt);
        return date >= boundary && date.getTime() <= Math.max(now.getTime(), Date.now());
    };
    try {
        // A successful sync never downgrades a newer locally generated revision.
        const remote = await sync({ directory, keepNewerThan: local?.manifest.fetchedAt });
        local = await readMintmarkFiles(directory);
        if (fresh(remote)) {
            log(`刻印資料已同步，資料日期：${taiwanDate(new Date(remote.fetchedAt))}（台灣時間）。`);
            return { refreshed: true, stale: false, fetchedAt: new Date(remote.fetchedAt) };
        }
    } catch (error) {
        log(`線上刻印版本暫時無法同步：${error.message}`);
    }
    if (local && fresh(local.manifest)) {
        log(`沿用本週本機刻印資料：${taiwanDate(new Date(local.manifest.fetchedAt))}（台灣時間）。`);
        return { refreshed: false, stale: false, fetchedAt: new Date(local.manifest.fetchedAt) };
    }
    log(`正在從 SeerAPI 更新本機刻印資料；更新基準：${taiwanDate(boundary)}（台灣時間）。`);
    try {
        await refresh({ directory });
        const updated = await readMintmarkFiles(directory);
        if (!fresh(updated.manifest)) throw new Error('更新後資料日期無效');
        log(`刻印資料更新完成：${taiwanDate(new Date(updated.manifest.fetchedAt))}（台灣時間）。`);
        return { refreshed: true, stale: false, fetchedAt: new Date(updated.manifest.fetchedAt) };
    } catch (error) {
        let retained;
        try { retained = await readMintmarkFiles(directory); } catch { /* No usable fallback. */ }
        if (!retained) throw new Error('刻印更新失敗，且本機沒有完整可用的資料。請連線後重新執行 npm run dev。', { cause: error });
        const date = new Date(retained.manifest.fetchedAt);
        warn(`刻印更新失敗，沿用本機資料：${taiwanDate(date)}（台灣時間）；可能落後最新內容。原因：${error.message}`);
        return { refreshed: false, stale: true, fetchedAt: date };
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try { await ensureMintmarks(); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
}
