import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CN_VOTES_ENDPOINT, fetchCnVotes, validateVoteSnapshot } from '../js/competitive/votes-api.js';
import { createVotesView } from '../js/competitive/votes-view.js';
import { createChineseConverters } from '../js/shared/chinese.js';

const snapshot = () => ({ server: 'cn', fetched_at: '2026-11-02T10:40:00Z', cached: true, realtime: false, cache_seconds: 300,
    pools: [2, 3].map(limit => ({ limit, top_n: limit === 2 ? 20 : 30, start_at: '2026-11-02T00:00:00+08:00', end_at: '2026-11-05T00:00:00+08:00',
        status: limit === 2 ? 'active' : 'upcoming', list: limit === 2 ? [{ pet_id: 5000, rank: 1, votes: 1234, name: '<img onerror=bad>' }] : [] })) });

test('vote requests use the fixed public endpoint without credentials or browser cache', async () => {
    const data = snapshot(), signal = new AbortController().signal;
    assert.equal(await fetchCnVotes({ signal, fetchImpl: async (url, options) => {
        assert.equal(url, CN_VOTES_ENDPOINT);
        assert.deepEqual(options, { signal, cache: 'no-store', credentials: 'omit' });
        return { ok: true, json: async () => data };
    } }), data);
});

test('malformed responses fail instead of appearing as an empty ranking', () => {
    for (const mutate of [d => d.server = 'tw', d => d.pools.pop(), d => d.fetched_at = 'invalid',
        d => d.pools[0].list[0].votes = -1, d => d.pools[0].list[0].pet_id = '../x',
        d => d.pools[1].limit = 2, d => d.pools[0].status = 'broken']) {
        const data = snapshot(); mutate(data); assert.throws(() => validateVoteSnapshot(data), /格式異常/);
    }
});

test('service errors expose useful messages and a bounded retry cooldown', async () => {
    for (const status of [429, 502, 503, 504]) {
        await assert.rejects(fetchCnVotes({ fetchImpl: async () => ({ ok: false, status, headers: new Headers({ 'Retry-After': '30' }) }) }), error => {
            assert.match(error.message, /稍後/);
            if (status === 429) assert.equal(error.retryAfter, 30);
            return true;
        });
    }
});

function node(id = '') {
    return { id, hidden: false, children: [], events: {}, attributes: {}, textContent: '',
        classList: { add() {}, remove() {}, toggle() {} },
        append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children = children; },
        addEventListener(type, handler) { this.events[type] = handler; },
        setAttribute(key, value) { this.attributes[key] = value; }, focus() {}, click() { this.events.click?.(); } };
}
function setup() {
    const original = globalThis.document, nodes = new Map();
    globalThis.document = { getElementById(id) { if (!nodes.has(id)) nodes.set(id, node(id)); return nodes.get(id); }, createElement: () => node() };
    return { get: name => document.getElementById(`competitive-vote-${name}`), restore: () => { globalThis.document = original; } };
}
const flatten = node => [node.textContent, ...node.children.map(flatten)].join(' ');

test('rankings render text safely, switch pools locally, and preserve old data on refresh failure', async () => {
    const ui = setup();
    try {
        let calls = 0, opened;
        const view = createVotesView({ seerLookup: { openPetInfo: id => opened = id }, fetchVotes: async () => {
            if (++calls > 1) throw new Error('服務暫停');
            return snapshot();
        } });
        view.setActive(true); await view.load();
        assert.match(ui.get('status').textContent, /快取資料/);
        assert.match(flatten(ui.get('results')), /<img onerror=bad>/);
        const table = ui.get('results').children[0], row = table.children[2].children[0];
        row.children[1].children[0].children[1].children[0].click(); assert.equal(opened, 5000);
        ui.get('semi').click(); assert.match(flatten(ui.get('results')), /尚未開始/); assert.equal(calls, 1);
        ui.get('restricted').click(); await view.load();
        assert.match(ui.get('status').textContent, /保留上次/);
        assert.match(flatten(ui.get('results')), /1,234/);
    } finally { ui.restore(); }
});

test('leaving vote mode aborts the request and ignores its late response', async () => {
    const ui = setup();
    try {
        let resolve, signal;
        const view = createVotesView({ seerLookup: {}, fetchVotes: options => {
            signal = options.signal; return new Promise(done => { resolve = done; });
        } });
        view.setActive(true); const pending = view.load();
        view.setActive(false); assert.equal(signal.aborted, true);
        resolve(snapshot()); await pending;
        assert.equal(ui.get('results').children.length, 0);
        assert.equal(document.getElementById('competitive-votes').hidden, true);
    } finally { ui.restore(); }
});

test('API traditional names are normalized through the site converters with protected name characters', async () => {
    const ui = setup();
    try {
        const replacements = {
            cn: { '嶽': '岳', '傑': '杰', '託': '托', '裏': '里', '揹': '背', '聖': '圣', '靈': '灵' },
            tw: { '岳': '嶽', '杰': '傑', '托': '託', '里': '裏', '背': '揹', '圣': '聖', '灵': '靈' }
        };
        const converters = createChineseConverters(({ to }) => text =>
            [...text].map(char => replacements[to][char] || char).join(''));
        const data = snapshot();
        data.pools[0].list[0].name = '聖靈嶽傑託裏揹';
        const view = createVotesView({ seerLookup: {}, ...converters, fetchVotes: async () => data });
        view.setActive(true); await view.load();
        const table = ui.get('results').children[0];
        const name = table.children[2].children[0].children[1].children[0].children[1].children[0];
        assert.equal(name.textContent, '聖靈岳杰托里背');
        assert.equal(name.attributes['aria-label'], '查看聖靈岳杰托里背精靈資訊');
        assert.equal(data.pools[0].list[0].name, '聖靈嶽傑託裏揹');
    } finally { ui.restore(); }
});
