import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename, rm, readdir } from 'node:fs/promises';
import { MINTMARK_CATEGORIES, decodeMintmarkList, validateMintmarkFull, validateMintmarkManifest } from '../js/data/mintmark-snapshot-format.js';
import { isExclusiveMintmark } from '../js/data/mintmark-catalog.js';
import { mintmarkFinalStats } from '../js/seer-mintmark-stats.js';

export const LOCAL_MINTMARKS = new URL('../tmp/mintmarks/', import.meta.url);
export const PUBLISHED_MINTMARKS = 'https://seerinfo.app/data/mintmarks/';
export const sha256 = body => createHash('sha256').update(body).digest('hex');
const STATS = ['atk', 'sp_atk', 'def', 'sp_def', 'spd', 'hp', 'total'];

function generations(manifest) {
    validateMintmarkManifest(manifest);
    if (!manifest.previous) return [manifest];
    if (manifest.previous.previous) throw new Error('刻印歷史版本格式無效');
    validateMintmarkManifest(manifest.previous);
    return [manifest, manifest.previous];
}

export function buildMintmarkFiles(snapshot) {
    const all = [...snapshot.general.records, ...snapshot.exclusive.records].sort((a, b) => a.id - b.id);
    if (new Set(all.map(item => item.id)).size !== all.length) throw new Error('Duplicate mintmark IDs');
    const groups = { general: [], exclusive: [], ability: [], skill: [] };
    for (const record of all) {
        const category = Number(record.type?.id) === 0 ? 'ability' : Number(record.type?.id) === 1 ? 'skill'
            : Number(record.type?.id) === 3 ? isExclusiveMintmark(record) ? 'exclusive' : 'general' : null;
        if (!category) throw new Error('Unsupported mintmark type');
        groups[category].push(record);
    }
    const files = new Map(), categories = {};
    for (const category of MINTMARK_CATEGORIES) {
        const list = groups[category].filter(record => !record.is_hidden).map(record => {
            const stats = mintmarkFinalStats(record);
            const row = [record.id, record.name, record.mintmark_class?.id ?? null, stats ? [...STATS.map(key => stats[key]), Number(stats.percent)] : null];
            if (!stats && record.desc) row.push(record.desc);
            return row;
        });
        categories[category] = {};
        for (const [kind, records] of [['list', list], ['full', groups[category]]]) {
            const body = JSON.stringify({ version: 2, category, records }) + '\n';
            const hash = sha256(body), file = `${category}-${kind}.${hash}.json`;
            files.set(file, body);
            categories[category][kind] = { file, sha256: hash, count: records.length };
        }
    }
    const series = [...snapshot.general.series].sort((a, b) => a.id - b.id);
    const revision = sha256(JSON.stringify({ categories, series }));
    return { manifest: { version: 2, revision, fetchedAt: snapshot.general.fetchedAt, series, categories }, files };
}

export function checkMintmarkFile(body, category, kind, entry) {
    if (sha256(body) !== entry.sha256) throw new Error('刻印檔案校驗失敗');
    const data = JSON.parse(body);
    const rows = kind === 'list' ? decodeMintmarkList(data, category) : validateMintmarkFull(data, category);
    if (rows.length !== entry.count || new Set(rows.map(item => item.id)).size !== rows.length) throw new Error('刻印檔案筆數無效');
}

export async function readMintmarkFiles(directory = LOCAL_MINTMARKS) {
    const manifest = validateMintmarkManifest(JSON.parse(await readFile(new URL('manifest.json', directory), 'utf8')));
    const files = new Map();
    for (const generation of generations(manifest)) for (const category of MINTMARK_CATEGORIES) for (const kind of ['list', 'full']) {
        const entry = generation.categories[category][kind];
        const body = await readFile(new URL(entry.file, directory), 'utf8');
        checkMintmarkFile(body, category, kind, entry);
        files.set(entry.file, body);
    }
    return { manifest, files };
}

export async function writeMintmarkFiles(bundle, directory = LOCAL_MINTMARKS) {
    // Verify the entire generation before writing; publish its pointer last.
    for (const generation of generations(bundle.manifest)) for (const category of MINTMARK_CATEGORIES) for (const kind of ['list', 'full']) {
        const entry = generation.categories[category][kind];
        checkMintmarkFile(bundle.files.get(entry.file), category, kind, entry);
    }
    await mkdir(directory, { recursive: true });
    for (const [file, body] of bundle.files) {
        let existing;
        try { existing = await readFile(new URL(file, directory), 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (existing !== body) await writeFile(new URL(file, directory), body);
    }
    const temporary = new URL('manifest.json.tmp', directory);
    try {
        await writeFile(temporary, JSON.stringify(bundle.manifest) + '\n');
        await rename(temporary, new URL('manifest.json', directory));
    } finally { await rm(temporary, { force: true }); }
    // Only remove our generated immutable files; keep current + previous revision.
    for (const file of await readdir(directory)) {
        if (/^(general|exclusive|ability|skill)-(list|full)\.[a-f0-9]{64}\.json$/.test(file) && !bundle.files.has(file)) {
            await rm(new URL(file, directory));
        }
    }
}

export async function fetchMintmarkText(url) {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Object.assign(new Error(`刻印來源 HTTP ${response.status}`), { status: response.status });
    return response.text();
}

export async function syncPublishedMintmarks({ directory = LOCAL_MINTMARKS, source = PUBLISHED_MINTMARKS, fetchText = fetchMintmarkText, keepNewerThan } = {}) {
    const manifest = validateMintmarkManifest(JSON.parse(await fetchText(new URL('manifest.json', source).href).catch(error => {
        error.manifestMissing = error.status === 404;
        throw error;
    })));
    if (keepNewerThan && Date.parse(keepNewerThan) > Date.parse(manifest.fetchedAt)) {
        return (await readMintmarkFiles(directory)).manifest;
    }
    const files = new Map();
    for (const generation of generations(manifest)) for (const category of MINTMARK_CATEGORIES) for (const kind of ['list', 'full']) {
        const entry = generation.categories[category][kind];
        let body;
        try {
            body = await readFile(new URL(entry.file, directory), 'utf8');
            checkMintmarkFile(body, category, kind, entry);
        } catch {
            body = await fetchText(new URL(entry.file, source).href);
            checkMintmarkFile(body, category, kind, entry);
        }
        files.set(entry.file, body);
    }
    await writeMintmarkFiles({ manifest, files }, directory);
    return manifest;
}
