import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, isAbsolute } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { ensureMintmarks, latestMintmarkRefresh } from '../tools/ensure-mintmarks.mjs';
import { refreshMintmarkFiles } from '../tools/fetch-mintmarks.mjs';
import { readMintmarkFiles, writeMintmarkFiles, syncPublishedMintmarks } from '../tools/mintmark-files.mjs';
import { preparePublishedMintmarks } from '../tools/prepare-mintmarks.mjs';
import { createDevServer, devPort } from '../tools/dev-server.mjs';
import { bundle, source } from './helpers/mintmark-fixture.mjs';

async function fixture(t, date = '2026-10-30T10:01:00Z') {
    const path = await mkdtemp(join(tmpdir(), 'seervote-local-dev-'));
    t.after(async () => {
        const rel = relative(resolve(tmpdir()), resolve(path));
        assert.ok(!rel.startsWith('..') && !isAbsolute(rel));
        await rm(path, { recursive: true, force: true });
    });
    const directory = pathToFileURL(path + '/');
    const save = date => writeMintmarkFiles(bundle(date), directory);
    if (date) await save(date);
    return { directory, save, log: () => {}, warn: () => {}, sync: async () => { throw new Error('offline'); } };
}

test('dev port handles PowerShell forwarding and rejects invalid arguments', () => {
    assert.equal(devPort([], 5500), 5500);
    for (const args of [['--port', '5517'], ['5517'], ['--port=5517']]) assert.equal(devPort(args), 5517);
    for (const args of [['0'], ['65536'], ['-1'], ['other'], ['--port'], ['5517', 'extra']]) assert.throws(() => devPort(args), /連接埠/);
});

test('weekly boundary is Friday 18:00 Taiwan across weeks and year boundaries', () => {
    for (const [now, expected] of [
        ['2026-11-06T09:59:59.999Z', '2026-10-30T10:00:00.000Z'],
        ['2026-11-06T10:00:00Z', '2026-11-06T10:00:00.000Z'],
        ['2026-11-08T00:00:00Z', '2026-11-06T10:00:00.000Z'],
        ['2027-01-01T09:59:00Z', '2026-12-25T10:00:00.000Z'],
    ]) assert.equal(latestMintmarkRefresh(new Date(now)).toISOString(), expected);
});

test('fresh local files avoid source fetches while stale files refresh once', async t => {
    const options = await fixture(t); let calls = 0;
    const refresh = async () => { calls++; await options.save('2026-11-06T10:01:00Z'); };
    await ensureMintmarks({ ...options, now: new Date('2026-11-06T09:59:00Z'), refresh });
    assert.equal(calls, 0);
    await ensureMintmarks({ ...options, now: new Date('2026-11-06T10:02:00Z'), refresh });
    await ensureMintmarks({ ...options, now: new Date('2026-11-06T10:03:00Z'), refresh });
    assert.equal(calls, 1);
});

test('offline startup retains old generation and reports date; no valid files stops startup', async t => {
    const options = await fixture(t), warnings = [];
    const before = await readFile(new URL('manifest.json', options.directory), 'utf8');
    const refresh = async () => { throw new Error('offline'); };
    const result = await ensureMintmarks({ ...options, now: new Date('2026-11-06T11:00:00Z'), refresh, warn: message => warnings.push(message) });
    assert.equal(result.stale, true);
    assert.match(warnings[0], /2026\/10\/30.*18:01.*offline/);
    assert.equal(await readFile(new URL('manifest.json', options.directory), 'utf8'), before);
    await writeFile(new URL('manifest.json', options.directory), 'broken');
    await assert.rejects(ensureMintmarks({ ...options, refresh }), /沒有完整可用/);
});

test('online sync verifies hashes, reuses files, avoids downgrade and preserves pointer on partial failure', async t => {
    const options = await fixture(t), remote = bundle('2026-11-06T10:01:00Z');
    let calls = 0;
    const fetchText = async url => {
        calls++; const file = new URL(url).pathname.split('/').at(-1);
        return file === 'manifest.json' ? JSON.stringify(remote.manifest) : remote.files.get(file);
    };
    await syncPublishedMintmarks({ ...options, source: 'https://example.com/data/', fetchText });
    assert.equal(calls, 1, 'unchanged immutable files are reused');
    assert.equal((await readMintmarkFiles(options.directory)).manifest.fetchedAt, remote.manifest.fetchedAt);
    const result = await ensureMintmarks({ ...options, now: new Date('2026-11-06T11:00:00Z'),
        sync: input => syncPublishedMintmarks({ ...input, source: 'https://example.com/', fetchText }),
        refresh: () => { throw new Error('must not fetch API'); } });
    assert.equal(result.stale, false);
    const newer = '2026-11-13T10:01:00Z'; await options.save(newer);
    assert.equal((await syncPublishedMintmarks({ ...options, fetchText, keepNewerThan: newer })).fetchedAt, newer);
    const before = await readFile(new URL('manifest.json', options.directory), 'utf8');
    const damaged = bundle('2026-11-20T10:01:00Z');
    damaged.manifest.categories.general.list.sha256 = 'a'.repeat(64);
    damaged.manifest.categories.general.list.file = `general-list.${'a'.repeat(64)}.json`;
    await assert.rejects(syncPublishedMintmarks({ ...options, fetchText: async url => url.endsWith('manifest.json') ? JSON.stringify(damaged.manifest) : '{}' }), /校驗/);
    assert.equal(await readFile(new URL('manifest.json', options.directory), 'utf8'), before);
});

test('writer preserves unchanged filenames and refuses incomplete sources before replacing a generation', async t => {
    const options = await fixture(t);
    const before = await readMintmarkFiles(options.directory);
    await assert.rejects(refreshMintmarkFiles({ directory: options.directory, fetchJson: async url => ({ ...await source(url), count: 99 }) }), /Incomplete/);
    assert.equal((await readMintmarkFiles(options.directory)).manifest.revision, before.manifest.revision);
    await refreshMintmarkFiles({ directory: options.directory, fetchJson: source });
    assert.equal((await readMintmarkFiles(options.directory)).manifest.revision, before.manifest.revision);
});

test('publication reuses deployed data and bootstraps only missing manifests, never network or blob failures', async () => {
    let fetched = 0;
    const refresh = async () => { fetched++; };
    const sync = async () => {};
    await preparePublishedMintmarks({ sync, refresh }); assert.equal(fetched, 0);
    await preparePublishedMintmarks({ sync, refresh, refreshRequested: true }); assert.equal(fetched, 1);
    await preparePublishedMintmarks({ sync: async () => { throw Object.assign(new Error('404'), { manifestMissing: true }); }, refresh });
    assert.equal(fetched, 2);
    for (const error of [new Error('timeout'), Object.assign(new Error('missing blob'), { status: 404 })]) {
        await assert.rejects(preparePublishedMintmarks({ sync: async () => { throw error; }, refresh }));
    }
    assert.equal(fetched, 2);
});

test('weekly changes retain one previous generation through later hourly syncs without retaining every revision', async t => {
    const options = await fixture(t);
    const initial = await readMintmarkFiles(options.directory);
    const changedSource = suffix => async url => {
        const data = await source(url);
        return new URL(url).pathname.endsWith('mintmark_class') ? data
            : { ...data, results: data.results.map(item => item.id === 1 ? { ...item, name: item.name + suffix } : item) };
    };
    await refreshMintmarkFiles({ directory: options.directory, fetchJson: changedSource('二') });
    const second = await readMintmarkFiles(options.directory);
    assert.equal(second.manifest.previous.revision, initial.manifest.revision);
    const receiver = await fixture(t, null);
    await syncPublishedMintmarks({ directory: receiver.directory, fetchText: async url => url.endsWith('manifest.json') ? JSON.stringify(second.manifest) : second.files.get(new URL(url).pathname.split('/').at(-1)) });
    assert.equal((await readMintmarkFiles(receiver.directory)).manifest.previous.revision, initial.manifest.revision);
    await refreshMintmarkFiles({ directory: options.directory, fetchJson: changedSource('三') });
    const third = await readMintmarkFiles(options.directory);
    assert.equal(third.manifest.previous.revision, second.manifest.revision);
    assert.equal(third.manifest.previous.previous, undefined);
    const firstList = initial.manifest.categories.general.list.file;
    assert.equal(third.files.has(firstList), false);
    await assert.rejects(readFile(new URL(firstList, options.directory)), { code: 'ENOENT' });
});

test('local server maps public snapshot URLs to ignored data without changing repository data', async t => {
    const options = await fixture(t);
    const server = createDevServer(undefined, fileURLToPath(options.directory));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base)).status, 200);
    assert.match((await fetch(`${base}/js/data/mintmark-snapshot.js`)).headers.get('content-type'), /javascript/);
    const manifest = await fetch(`${base}/data/mintmarks/manifest.json`);
    assert.equal(manifest.headers.get('cache-control'), 'no-store');
    const data = await manifest.json();
    const full = await fetch(`${base}/data/mintmarks/${data.categories.general.full.file}`);
    assert.ok((await full.json()).records.length);
    assert.equal((await fetch(`${base}/.git/config`)).status, 403);
    assert.equal((await fetch(`${base}/missing.html`)).status, 404);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
});
