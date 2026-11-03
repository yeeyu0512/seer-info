import { pathToFileURL } from 'node:url';
import { fetchMintmarkCatalog, fetchMintmarkSeries, isExclusiveMintmark } from '../js/data/mintmark-catalog.js';
import { buildMintmarkFiles, LOCAL_MINTMARKS, readMintmarkFiles, writeMintmarkFiles } from './mintmark-files.mjs';

export async function fetchMintmarkSnapshot(fetchJson, fetchedAt = new Date().toISOString()) {
    const expectedCounts = new Map();
    const strictFetch = async url => {
        const data = await fetchJson(url);
        if (!Array.isArray(data.results) || !Number.isSafeInteger(data.count) || data.count < 1
            || !(data.next === null || typeof data.next === 'string')
            || data.results.some(record => !Number.isSafeInteger(record.id) || typeof record.name !== 'string')) {
            throw new Error('Invalid mintmark source page; preserving previous snapshot.');
        }
        const resource = new URL(url).pathname;
        if (expectedCounts.has(resource) && expectedCounts.get(resource) !== data.count) throw new Error('Mintmark count changed during download.');
        expectedCounts.set(resource, data.count);
        return data;
    };
    const [records, series] = await Promise.all([fetchMintmarkCatalog(strictFetch), fetchMintmarkSeries(strictFetch)]);
    if (records.length !== expectedCounts.get('/v1/mintmark') || series.length !== expectedCounts.get('/v1/mintmark_class')) throw new Error('Incomplete mintmark snapshot; preserving previous data.');
    records.sort((a, b) => a.id - b.id);
    const general = records.filter(record => !isExclusiveMintmark(record));
    const exclusive = records.filter(isExclusiveMintmark);
    if (!general.length || !exclusive.length) throw new Error('Empty mintmark partition; preserving previous data.');
    return {
        general: { version: 1, fetchedAt, series, records: general },
        exclusive: { version: 1, fetchedAt, records: exclusive },
    };
}

export async function refreshMintmarkFiles({ directory = LOCAL_MINTMARKS, fetchJson = async url => {
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`SeerAPI HTTP ${response.status}`);
        return response.json();
    } } = {}) {
    const snapshot = await fetchMintmarkSnapshot(fetchJson);
    const bundle = buildMintmarkFiles(snapshot);
    let previous;
    try { previous = await readMintmarkFiles(directory); }
    catch (error) { if (error.code && error.code !== 'ENOENT') throw error; }
    if (previous) for (const category of Object.keys(bundle.manifest.categories)) {
        if (bundle.manifest.categories[category].full.count < previous.manifest.categories[category].full.count * 0.9) throw new Error('Unexpected mintmark data loss; preserving previous snapshot.');
    }
    if (previous) {
        const old = previous.manifest.revision === bundle.manifest.revision ? previous.manifest.previous : previous.manifest;
        if (old) {
            const { previous: ignored, ...generation } = old;
            bundle.manifest.previous = generation;
            for (const entry of Object.values(generation.categories).flatMap(group => [group.list, group.full])) {
                bundle.files.set(entry.file, previous.files.get(entry.file));
            }
        }
    }
    await writeMintmarkFiles(bundle, directory);
    console.log(`刻印資料已驗證：${previous?.manifest.revision === bundle.manifest.revision ? '內容未變，沿用檔案' : '已產生新版列表與完整資料'}。`);
    return bundle;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await refreshMintmarkFiles();
