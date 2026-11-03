import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchMintmarkSnapshot } from '../tools/fetch-mintmarks.mjs';
import { createMintmarkSnapshotLoader, mintmarkCategories } from '../js/data/mintmark-snapshot.js';
import { decodeMintmarkList, validateMintmarkManifest } from '../js/data/mintmark-snapshot-format.js';
import { selectMintmarks, mintmarkCornerCount } from '../js/data/mintmark-catalog.js';
import { mintmarkFinalStats } from '../js/seer-mintmark-stats.js';
import { fixtureRecords as records, fixtureSeries as series, source, page, bundle } from './helpers/mintmark-fixture.mjs';

test('source refuses truncated pagination, count changes, invalid rows and failed pages', async () => {
    await assert.rejects(fetchMintmarkSnapshot(async url => new URL(url).pathname.endsWith('mintmark_class') ? page(series) : page(records, 99)), /Incomplete/);
    await assert.rejects(fetchMintmarkSnapshot(async url => {
        if (new URL(url).pathname.endsWith('mintmark_class')) return page(series);
        return new URL(url).searchParams.get('offset') === '0'
            ? page(records.slice(0, 2), 6, 'https://api.seerapi.com/v1/mintmark?offset=2') : page(records.slice(2), 7);
    }), /count changed/);
    await assert.rejects(fetchMintmarkSnapshot(async () => page([{ id: 1 }])), /Invalid/);
    await assert.rejects(fetchMintmarkSnapshot(async () => { throw new Error('offline'); }), /offline/);
    const snapshot = await fetchMintmarkSnapshot(source);
    assert.deepEqual(snapshot.exclusive.records.map(item => item.id), [2, 3]);
});

test('compact lists preserve all visible IDs, final stats, corner counts, descriptions and filter results', () => {
    const b = bundle();
    const all = Object.entries(b.manifest.categories).flatMap(([category, entries]) => decodeMintmarkList(JSON.parse(b.files.get(entries.list.file)), category));
    assert.equal(all.length, 5);
    for (const item of all) {
        const original = records.find(record => record.id === item.id);
        assert.deepEqual(mintmarkFinalStats(item), mintmarkFinalStats(original));
        assert.equal(mintmarkCornerCount(item), mintmarkCornerCount(original));
    }
    assert.equal(all.find(item => item.id === 4).desc, '技能效果');
    for (const options of [{}, { type: 'all' }, { type: 'all', showExclusive: true }, { type: '3', showExclusive: true, sort: 'hp' }, { type: '0', sort: 'sp_atk' }, { series: '1', corners: '2', maxId: 3 }]) {
        assert.deepEqual(selectMintmarks(all, options).map(item => item.id), selectMintmarks(records, options).map(item => item.id));
    }
    const unchanged = bundle('2026-11-06T10:00:00Z');
    assert.equal(unchanged.manifest.revision, b.manifest.revision);
    assert.deepEqual([...unchanged.files], [...b.files]);
});

test('loader fetches only requested lists, lazily fills full records and caches concurrent requests', async () => {
    const b = bundle(), calls = [];
    const loader = createMintmarkSnapshotLoader(async url => {
        const file = url.split('/').at(-1); calls.push(file);
        return file === 'manifest.json' ? b.manifest : JSON.parse(b.files.get(file));
    });
    const [data] = await Promise.all([loader.lists(['general']), loader.lists(['general'])]);
    assert.deepEqual(data.records.map(item => item.id), [1]);
    assert.equal(calls.length, 2);
    assert.ok(calls.every(file => !file.startsWith('exclusive') && !file.includes('-full.')));
    const [full] = await loader.complete(data.records);
    assert.deepEqual(full, records[0]);
    await loader.complete(data.records);
    assert.equal(calls.length, 3);
    const extra = await loader.lists(['general', 'exclusive']);
    const complete = await loader.complete(extra.records.filter(item => item.id === 3));
    assert.deepEqual(complete[0].pet, [{ id: 123 }]);
    assert.equal(calls.filter(file => file.startsWith('exclusive-full.')).length, 1);
    assert.deepEqual(mintmarkCategories('1', true), ['skill']);
    assert.deepEqual(mintmarkCategories('all', false), ['general', 'ability', 'skill']);
});

test('loader retries failed downloads, pins a generation and rejects invalid manifests or counts', async () => {
    const b = bundle(); let failed = false;
    const loader = createMintmarkSnapshotLoader(async url => {
        const file = url.split('/').at(-1);
        if (file === 'manifest.json') return b.manifest;
        if (!failed) { failed = true; throw new Error('offline'); }
        return JSON.parse(b.files.get(file));
    });
    await assert.rejects(loader.lists(['general']), /offline/);
    assert.equal((await loader.lists(['general'])).records.length, 1);
    const invalid = structuredClone(b.manifest);
    invalid.categories.general.list.file = '../other.json';
    assert.throws(() => validateMintmarkManifest(invalid), /無效/);
    const truncated = createMintmarkSnapshotLoader(async url => url.endsWith('manifest.json') ? b.manifest : { version: 2, category: 'general', records: [] });
    await assert.rejects(truncated.lists(['general']), /不完整/);
});
