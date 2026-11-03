export const MINTMARK_CATEGORIES = ['general', 'exclusive', 'ability', 'skill'];
export const MINTMARK_TYPES = { general: 3, exclusive: 3, ability: 0, skill: 1 };
const STATS = ['atk', 'sp_atk', 'def', 'sp_def', 'spd', 'hp', 'total'];

export function validateMintmarkManifest(data) {
    if (data?.version !== 2 || !/^[a-f0-9]{64}$/.test(data.revision)
        || !Number.isFinite(Date.parse(data.fetchedAt)) || !Array.isArray(data.series)
        || !data.series.every(item => Number.isSafeInteger(item.id) && typeof item.name === 'string')) throw new Error('刻印版本資訊無效');
    for (const category of MINTMARK_CATEGORIES) for (const kind of ['list', 'full']) {
        const entry = data.categories?.[category]?.[kind];
        if (!entry || !Number.isSafeInteger(entry.count) || entry.count < 0
            || !/^[a-f0-9]{64}$/.test(entry.sha256)
            || entry.file !== `${category}-${kind}.${entry.sha256}.json`) throw new Error('刻印檔案資訊無效');
    }
    return data;
}

export function decodeMintmarkList(data, category) {
    if (data?.version !== 2 || data.category !== category || !Array.isArray(data.records)) throw new Error('刻印列表格式無效');
    return data.records.map(row => {
        if (!Array.isArray(row) || !Number.isSafeInteger(row[0]) || typeof row[1] !== 'string'
            || !(row[2] === null || Number.isSafeInteger(row[2]))
            || !(row[3] === null || (Array.isArray(row[3]) && row[3].length === 8 && row[3].every(Number.isFinite)))) throw new Error('刻印列表項目無效');
        return {
            id: row[0], name: row[1], type: { id: MINTMARK_TYPES[category] },
            mintmark_class: row[2] === null ? null : { id: row[2] },
            max_attr_value: row[3] === null ? null : { ...Object.fromEntries(STATS.map((key, i) => [key, row[3][i]])), percent: Boolean(row[3][7]) },
            is_exclusive: category === 'exclusive', desc: row[4] || '',
        };
    });
}

export function validateMintmarkFull(data, category) {
    if (data?.version !== 2 || data.category !== category || !Array.isArray(data.records)
        || !data.records.every(item => Number.isSafeInteger(item.id) && typeof item.name === 'string'
            && Number(item.type?.id) === MINTMARK_TYPES[category])) throw new Error('刻印完整資料格式無效');
    return data.records;
}
