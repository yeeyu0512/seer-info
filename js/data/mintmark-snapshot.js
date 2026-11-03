import { MINTMARK_CATEGORIES, decodeMintmarkList, validateMintmarkFull, validateMintmarkManifest } from './mintmark-snapshot-format.js';

const BASE = new URL('../../data/mintmarks/', import.meta.url);
export function mintmarkCategories(type = '3', showExclusive = false) {
    const result = type === 'all' ? ['general', 'ability', 'skill'] : type === '0' ? ['ability'] : type === '1' ? ['skill'] : ['general'];
    if (showExclusive && (type === 'all' || type === '3')) result.push('exclusive');
    return result;
}

export function createMintmarkSnapshotLoader(fetchJson = async url => {
    const response = await fetch(url, { cache: url.endsWith('manifest.json') ? 'no-cache' : 'default', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`刻印資料下載失敗（${response.status}），若網站剛更新請重新整理。`);
    return response.json();
}) {
    let manifestPending;
    const requests = new Map();
    function manifest() {
        return manifestPending ??= fetchJson(new URL('manifest.json', BASE).href).then(validateMintmarkManifest)
            .catch(error => { manifestPending = null; throw error; });
    }
    async function partition(category, kind) {
        if (!MINTMARK_CATEGORIES.includes(category)) throw new Error('刻印分類無效');
        const info = await manifest();
        const entry = info.categories[category][kind];
        if (!requests.has(entry.file)) requests.set(entry.file, fetchJson(new URL(entry.file, BASE).href).then(data => {
            const records = kind === 'list' ? decodeMintmarkList(data, category) : validateMintmarkFull(data, category);
            if (records.length !== entry.count || new Set(records.map(item => item.id)).size !== records.length) throw new Error('刻印資料不完整');
            return records;
        }).catch(error => { requests.delete(entry.file); throw error; }));
        return requests.get(entry.file);
    }
    return {
        manifest,
        async lists(categories) {
            const [info, ...groups] = await Promise.all([manifest(), ...categories.map(category => partition(category, 'list'))]);
            return { series: info.series, records: groups.flat() };
        },
        async complete(matches) {
            const ids = new Set(matches.map(item => item.id));
            const categories = [...new Set(matches.map(item => item.type?.id === 0 ? 'ability' : item.type?.id === 1 ? 'skill' : item.is_exclusive ? 'exclusive' : 'general'))];
            const groups = await Promise.all(categories.map(category => partition(category, 'full')));
            const byId = new Map(groups.flat().filter(item => ids.has(item.id) && !item.is_hidden).map(item => [item.id, item]));
            if (byId.size !== ids.size) throw new Error('刻印完整資料不齊，請重試。');
            return matches.map(item => byId.get(item.id));
        },
    };
}
