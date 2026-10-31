import assert from 'node:assert/strict';
import { test } from 'node:test';

const queries = [];
const client = { from(table) {
    const calls = [['from', table]];
    queries.push(calls);
    const query = {};
    for (const method of ['select', 'eq', 'lte', 'gt', 'order', 'limit', 'insert', 'update']) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
    }
    query.maybeSingle = async () => ({ data: null, error: null });
    query.single = async () => ({ data: { id: 'new' }, error: null });
    query.then = (resolve, reject) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
    return query;
} };
globalThis.window = { supabase: { createClient: () => client } };
const api = await import('../js/competitive-pool.js');
delete globalThis.window;

test('public and admin queries always filter explicitly by server', async () => {
    for (const server of ['tw', 'cn']) {
        await api.getCurrentCompetitivePool(server);
        assert(queries.at(-1).some(call => call[0] === 'eq' && call[1] === 'server' && call[2] === server));
        await api.getAdminCompetitivePools(server);
        assert(queries.at(-1).some(call => call[0] === 'eq' && call[1] === 'server' && call[2] === server));
    }
    const before = queries.length;
    await assert.rejects(api.getCurrentCompetitivePool());
    await assert.rejects(api.getAdminCompetitivePools('bad'));
    assert.equal(queries.length, before);
});

test('new periods write their server and editing a period preserves its server', async () => {
    await api.createCompetitivePool('test', 'start', 'end', 'cn');
    assert.deepEqual(queries.at(-1).find(call => call[0] === 'insert')[1],
        { name: 'test', start_at: 'start', end_at: 'end', server: 'cn' });
    await api.updateCompetitivePool('existing', 'updated', 'start', 'end');
    assert.equal(Object.hasOwn(queries.at(-1).find(call => call[0] === 'update')[1], 'server'), false);
    await assert.rejects(api.createCompetitivePool('test', 'start', 'end'));
});
