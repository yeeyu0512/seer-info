import { buildMintmarkFiles } from '../../tools/mintmark-files.mjs';
export const fixtureRecords = [
    { id: 1, name: '一般', type: { id: 3 }, mintmark_class: { id: 1 }, base_attr_value: { atk: 1 }, max_attr_value: { atk: 10, hp: 20, total: 30 }, extra_attr_value: { atk: 2 }, desc: '攻擊+12' },
    { id: 2, name: '专属全能', type: { id: 3 }, max_attr_value: { hp: 20 } },
    { id: 3, name: '限定', type: { id: 3 }, pet: [{ id: 123 }] },
    { id: 4, name: '專屬技能', type: { id: 1 }, pet: [{ id: 123 }], desc: '技能效果' },
    { id: 5, name: '隱藏', is_hidden: true, type: { id: 3 } },
    { id: 6, name: '能力', type: { id: 0 }, max_attr_value: { sp_atk: 10, percent: true } },
];
export const fixtureSeries = [{ id: 1, name: '系列' }];
export const page = (items, count = items.length, next = null) => ({ results: items, count, next });
export const source = async url => page(new URL(url).pathname.endsWith('mintmark_class') ? fixtureSeries : fixtureRecords);
export function bundle(fetchedAt = '2026-11-04T00:00:00Z', records = fixtureRecords) {
    return buildMintmarkFiles({
        general: { fetchedAt, series: fixtureSeries, records: records.filter(item => ![2, 3].includes(item.id)) },
        exclusive: { fetchedAt, records: records.filter(item => [2, 3].includes(item.id)) },
    });
}
