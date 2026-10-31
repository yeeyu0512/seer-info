import assert from 'node:assert/strict';
import { test } from 'node:test';

const queries = [];
let nextResult = [];
const client = { rpc: async (name, args) => { queries.push([['rpc', name, args]]); return { data: 'saved-pool', error: null }; }, from(table) {
    const calls = [['from', table]];
    queries.push(calls);
    const query = {};
    for (const method of ['select', 'eq', 'lte', 'gt', 'order', 'limit', 'insert', 'update']) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
    }
    query.maybeSingle = async () => ({ data: Array.isArray(nextResult) ? null : nextResult, error: null });
    query.single = async () => ({ data: { id: 'new' }, error: null });
    query.then = (resolve, reject) => Promise.resolve({ data: nextResult, error: null }).then(resolve, reject);
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

test('period writes atomically resolve the manually entered season through the admin RPC', async () => {
    assert.equal(await api.createCompetitivePool('帝皇', 1, 'start', 'end', 'cn'), 'saved-pool');
    assert.deepEqual(queries.at(-1)[0], ['rpc', 'save_competitive_pool_period', {
        p_pool_id: null, p_server: 'cn', p_season_name: '帝皇賽季', p_pool_number: 1, p_start_at: 'start', p_end_at: 'end'
    }]);
    await api.updateCompetitivePool('existing', '帝皇賽季', 2, 'start', 'end', 'cn');
    assert.equal(queries.at(-1)[0][2].p_pool_id, 'existing');
    assert.equal(queries.at(-1)[0][2].p_pool_number, 2);
    const before = queries.length;
    await assert.rejects(api.createCompetitivePool('帝皇', 0, 'start', 'end', 'tw'));
    await assert.rejects(api.createCompetitivePool('', 1, 'start', 'end', 'tw'));
    await assert.rejects(api.createCompetitivePool('帝皇', 1, 'start', 'end'));
    assert.equal(queries.length, before);
});

test('pool titles derive from season and ordinal, ignoring legacy title strings', async () => {
    const record = { id: 'period', name: 'old title', season_id: 'season', season: { id: 'season', name: '帝皇賽季' }, pool_number: 2 };
    nextResult = record;
    assert.equal((await api.getCurrentCompetitivePool('tw')).name, '帝皇賽季 第二池');
    nextResult = [record];
    assert.equal((await api.getAdminCompetitivePools('tw'))[0].name, '帝皇賽季 第二池');
    nextResult = [];
});
