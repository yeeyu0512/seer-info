import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeCompetitiveServer, requireCompetitiveServer } from '../js/competitive/servers.js';
import { createCompetitiveView } from '../js/competitive/view-controller.js';
import { createAdminDateInputs } from '../js/admin/date-inputs.js';
import { getAdminErrorMessage } from '../js/admin/error-message.js';
import { createCompetitiveEditor } from '../js/admin/competitive-editor.js';
import { createCompetitivePreview } from '../js/admin/competitive-preview.js';
import { toCsvCell } from '../js/shared/csv.js';

function node() {
    return {
        value: '', hidden: true, disabled: false, _textContent: '', children: [], dataset: {}, style: {}, events: {},
        get textContent() { return this.children.length ? this.children.map(child => child.textContent).join('') : this._textContent; },
        set textContent(value) { this._textContent = String(value); this.children = []; },
        classList: { toggle() {}, add() {}, remove() {} },
        addEventListener(name, fn) { this.events[name] = fn; },
        setAttribute(name, value) { this[name] = value; }, removeAttribute(name) { delete this[name]; },
        append(...items) { this.children.push(...items); }, replaceChildren(...items) { this._textContent = ''; this.children = items; },
        querySelector() { return this.counter ??= node(); }, reset() {}, scrollIntoView() {},
        click() { this.clicked = true; }, focus() { this.focused = true; }
    };
}

function setupDocument() {
    const nodes = new Map();
    const tabs = ['banned', 'restricted', 'semi_restricted'].map(type => {
        const tab = node(); tab.dataset.poolType = type; tab.id = type; return tab;
    });
    globalThis.document = {
        getElementById(id) { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); },
        querySelectorAll: () => tabs,
        createElement: () => node()
    };
    globalThis.window = {
        location: { href: 'https://example.com/?tab=competitive' },
        history: { pushState(_state, _title, url) { window.location.href = url.href; } }
    };
    document.getElementById('competitive-pool-server').value = 'tw';
    document.getElementById('admin-competitive-pool-server').value = 'tw';
    return { nodes, tabs, get: id => document.getElementById(id) };
}

const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { resolve, promise }; };
const pool = (id, server) => ({ id, server, name: `${server}期間`, season_id: `season-${server}`, season: { id: `season-${server}`, name: `${server}賽季` }, pool_number: 1, start_at: '2026-10-01T00:00:00Z', end_at: '2026-11-01T00:00:00Z', competitive_pool_characters: [] });

test('untrusted route values default to Taiwan while data writes require an explicit valid server', () => {
    for (const value of [null, undefined, '', 'wrong', '__proto__', 'constructor']) {
        assert.equal(normalizeCompetitiveServer(value), 'tw');
        assert.throws(() => requireCompetitiveServer(value));
    }
    assert.equal(requireCompetitiveServer('cn'), 'cn');
});

test('late responses cannot replace the selected server and switching updates the share URL', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const ui = setupDocument(), tw = deferred(), cn = deferred(), calls = [];
        const view = createCompetitiveView({
            getCurrentCompetitivePool(server) { calls.push(server); return server === 'tw' ? tw.promise : cn.promise; },
            clearObservedTypeIcons() {}, createCharacterTypeIcon: node, seerLookup: {}
        });
        const first = view.loadCurrentCompetitivePool('tw');
        ui.get('competitive-pool-server').value = 'cn';
        ui.get('competitive-pool-server').events.change();
        assert.equal(new URL(window.location.href).searchParams.get('server'), 'cn');
        cn.resolve(pool('cn', 'cn'));
        await cn.promise; await Promise.resolve();
        assert.equal(ui.get('competitive-pool-message').children[0].dataset.server, 'cn');
        assert.equal(ui.get('competitive-pool-message').children[1].textContent, 'cn期間');
        assert.equal(ui.get('refresh-competitive-pool-button').disabled, false);
        tw.resolve(pool('tw', 'tw')); await first;
        assert.equal(ui.get('competitive-pool-message').children[0].dataset.server, 'cn');
        assert.equal(ui.get('competitive-pool-message').children[1].textContent, 'cn期間');
        assert.deepEqual(calls, ['tw', 'cn']);
        await view.loadCurrentCompetitivePool('cn');
    } finally { Object.assign(globalThis, original); }
});

test('a server without an active period clears old characters and shows a server-specific empty state', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const ui = setupDocument();
        const view = createCompetitiveView({ getCurrentCompetitivePool: async () => null,
            clearObservedTypeIcons() {}, createCharacterTypeIcon: node, seerLookup: {} });
        await view.loadCurrentCompetitivePool('cn');
        assert.equal(ui.get('competitive-pool-message').textContent, '陸服目前沒有進行中的競技池。');
        assert.equal(ui.get('competitive-pool-groups').hidden, true);
        assert.equal(ui.get('competitive-pool-type-tabs').hidden, true);
        assert.deepEqual(ui.get('competitive-pool-groups').children, []);
    } finally { Object.assign(globalThis, original); }
});

test('admin date conversion always uses UTC+8, independently of the host timezone', () => {
    const original = { document: globalThis.document, window: globalThis.window };
    const previousTz = process.env.TZ;
    try {
        const ui = setupDocument();
        const dates = createAdminDateInputs({});
        for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Taipei']) {
            process.env.TZ = tz;
            ui.get('start').value = '2026-10-31'; ui.get('start-time').value = '00:05';
            assert.equal(dates.toIsoDate('start'), '2026-10-30T16:05:00.000Z');
            assert.equal(dates.toLocalDateTime('2026-10-30T16:05:00.000Z'), '2026-10-31T00:05');
            assert.equal(dates.formatDate('2026-10-30T16:05:00.000Z'),
                new Date('2026-10-30T16:05:00.000Z').toLocaleString('zh-TW', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Taipei' }));
        }
    } finally {
        if (previousTz === undefined) delete process.env.TZ; else process.env.TZ = previousTz;
        Object.assign(globalThis, original);
    }
});

test('admin switching keeps the selected server on cancel or busy operations and creates into the accepted server', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const ui = setupDocument(), reads = [], writes = [];
        let confirm = false;
        const editor = createCompetitiveEditor({
            getAdminCompetitivePools: async server => { reads.push(server); return writes.length ? [pool('new', server)] : []; },
            showAdminNotification() {}, getAdminErrorMessage, formatDate: value => value, setPoolDateValue() {},
            competitivePoolNameInput: ui.get('competitive-pool-name'), toLocalDateTime: value => value,
            toIsoDate: id => id.endsWith('start') ? '2026-10-01T00:00:00Z' : '2026-11-01T00:00:00Z',
            createCompetitivePool: async (...args) => { writes.push(args); return 'new'; },
            showConfirmDialog: async () => confirm, getCompetitivePoolCharacters: async () => [],
            competitivePoolImportProgress: node(), parseCompetitivePoolPetIds: () => ({ ids: [], invalidLines: [], duplicateCount: 0 })
        });
        await editor.loadAdminCompetitivePools();
        editor.showNewCompetitivePoolEditor();
        const select = ui.get('admin-competitive-pool-server');
        select.value = 'cn'; await select.events.change();
        assert.equal(select.value, 'tw'); assert.deepEqual(reads, ['tw']);
        assert.equal(ui.get('competitive-pool-editor').hidden, false);
        confirm = true;
        ui.get('competitive-pool-import-button').disabled = true;
        select.value = 'cn'; await select.events.change();
        assert.equal(select.value, 'tw'); assert.deepEqual(reads, ['tw']);
        ui.get('competitive-pool-import-button').disabled = false;
        select.value = 'cn'; await select.events.change();
        assert.equal(select.value, 'cn'); assert.deepEqual(reads, ['tw', 'cn']);
        assert.equal(ui.get('competitive-pool-editor').hidden, true);
        editor.showNewCompetitivePoolEditor();
        ui.get('competitive-pool-season-name').value = '測試';
        await editor.saveCompetitivePool({ preventDefault() {} });
        assert.equal(writes[0][0], '測試賽季');
        assert.equal(writes[0][1], 1);
        assert.equal(writes[0][4], 'cn');
        assert.equal(ui.get('competitive-pool-editor-title').children[0].textContent, '陸服');
    } finally { Object.assign(globalThis, original); }
});

test('database overlap errors explain the conflict to admins', () => {
    assert.match(getAdminErrorMessage({ code: '23P01' }), /此伺服器已有時間重疊/);
});

test('CSV exports include server attribution in the header, rows and filename', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
    try {
        const ui = setupDocument(), links = [];
        let blob;
        const createElement = document.createElement;
        document.createElement = tag => { const element = createElement(tag); if (tag === 'a') links.push(element); return element; };
        URL.createObjectURL = value => { blob = value; return 'blob:test'; };
        URL.revokeObjectURL = () => {};
        const editor = createCompetitiveEditor({
            getAdminCompetitivePools: async server => [pool('tw-period', server)],
            showAdminNotification() {}, getAdminErrorMessage, formatDate: value => value, setPoolDateValue() {},
            competitivePoolNameInput: ui.get('competitive-pool-name'), toLocalDateTime: value => value,
            getCompetitivePoolCharacters: async () => [{ id: 'c1', seer_pet_id: 1, pet_name: '精靈', pool_type: 'banned' }],
            competitivePoolImportProgress: node(), parseCompetitivePoolPetIds: () => ({ ids: [], invalidLines: [], duplicateCount: 0 }),
            toCsvCell
        });
        await editor.loadAdminCompetitivePools();
        await editor.openCompetitivePoolEditor('tw-period');
        editor.exportCompetitivePoolCsv();
        const csv = await blob.text();
        assert.match(csv, /^"伺服器","競技池期間",/);
        assert.match(csv, /\r\n"台服","tw期間",/);
        assert.equal(links[0].download, '台服_tw期間_競技池名單.csv');
        assert.equal(links[0].clicked, true);
    } finally {
        URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke;
        Object.assign(globalThis, original);
    }
});

test('preview titles show the selected server', () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const ui = setupDocument();
        document.body = { classList: { add() {} } };
        document.querySelectorAll = () => [];
        ui.get('close-competitive-pool-preview-button').focus = () => {};
        ui.get('competitive-pool-name').value = '測試期間';
        ui.get('admin-competitive-pool-server').value = 'cn';
        const preview = createCompetitivePreview({
            competitivePoolNameInput: ui.get('competitive-pool-name'), toIsoDate: () => null,
            clearObservedTypeIcons() {}, getPreviewCharacters: () => []
        });
        preview.openCompetitivePoolPreview();
        assert.equal(ui.get('competitive-pool-preview-title').children[0].textContent, '陸服');
        assert.equal(ui.get('competitive-pool-preview-title').children[1].textContent, '測試期間｜首頁預覽');
    } finally { Object.assign(globalThis, original); }
});

async function setupSearchEditor(fetchJson) {
    const ui = setupDocument(), writes = [];
    const editor = createCompetitiveEditor({
        getAdminCompetitivePools: async () => [pool('tw-period', 'tw')],
        showAdminNotification() {}, getAdminErrorMessage, formatDate: value => value, setPoolDateValue() {},
        competitivePoolNameInput: ui.get('competitive-pool-name'), toLocalDateTime: value => value,
        getCompetitivePoolCharacters: async () => [],
        competitivePoolImportProgress: node(), parseCompetitivePoolPetIds: () => ({ ids: [], invalidLines: [], duplicateCount: 0 }),
        fetchJson,
        toTraditionalChinese: value => value.replaceAll('圣灵谱尼', '聖靈譜尼'),
        convertToSimplifiedChinese: value => value.replaceAll('聖靈譜尼', '圣灵谱尼'),
        addCompetitivePoolCharacter: async (...args) => { writes.push(args); }
    });
    await editor.loadAdminCompetitivePools();
    await editor.openCompetitivePoolEditor('tw-period');
    ui.get('competitive-pet-type').value = 'restricted';
    return { ...ui, editor, writes };
}

test('admin name search accepts traditional names and requires choosing a candidate before adding by its ID', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const urls = [];
        const ui = await setupSearchEditor(async url => {
            urls.push(url);
            if (new URL(url).search) return { count: 2, results: [{ id: 5001, name: '圣灵谱尼·真身' }, { id: 5000, name: '圣灵谱尼' }] };
            return { id: 5001, name: '圣灵谱尼·真身' };
        });
        ui.get('competitive-pet-id').value = '聖靈譜尼';
        await ui.editor.lookupCompetitivePet();
        assert.equal(new URL(urls[0]).searchParams.get('name'), '圣灵谱尼');
        const candidates = ui.get('competitive-pet-search-results');
        assert.equal(candidates.hidden, false);
        assert.equal(candidates.children.length, 2);
        assert.equal(candidates.children[0].children[1].textContent, '聖靈譜尼 #5000');
        assert.equal(ui.get('add-competitive-pet-button').disabled, true);
        await ui.editor.addSelectedCompetitivePet({ preventDefault() {} });
        assert.deepEqual(ui.writes, []);
        await candidates.children[1].events.click();
        assert.equal(urls[1], 'https://api.seerapi.com/v1/pet/5001');
        assert.equal(ui.get('competitive-pet-name').textContent, '聖靈譜尼·真身');
        assert.equal(ui.get('competitive-pet-id').value, '聖靈譜尼');
        assert.equal(ui.get('add-competitive-pet-button').disabled, false);
        await ui.editor.addSelectedCompetitivePet({ preventDefault() {} });
        assert.deepEqual(ui.writes, [['tw-period', 5001, '聖靈譜尼·真身', 'restricted']]);
        assert.equal(ui.get('competitive-pet-preview').hidden, true);
    } finally { Object.assign(globalThis, original); }
});

test('admin ID lookup supports full-width digits and input changes invalidate the selected pet', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const urls = [];
        const ui = await setupSearchEditor(async url => { urls.push(url); return { id: 5000, name: '圣灵谱尼' }; });
        ui.get('competitive-pet-id').value = '５０００';
        await ui.editor.lookupCompetitivePet();
        assert.deepEqual(urls, ['https://api.seerapi.com/v1/pet/5000']);
        assert.equal(ui.get('add-competitive-pet-button').disabled, false);
        ui.get('competitive-pet-id').value = '其他';
        ui.get('competitive-pet-id').events.input();
        await ui.editor.addSelectedCompetitivePet({ preventDefault() {} });
        assert.equal(ui.get('add-competitive-pet-button').disabled, true);
        assert.deepEqual(ui.writes, []);
        ui.get('competitive-pet-id').value = '0';
        await ui.editor.lookupCompetitivePet();
        assert.equal(urls.length, 1);
    } finally { Object.assign(globalThis, original); }
});

test('Enter searches names without inserting and old candidates cannot select a pet for a changed query', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        let requests = 0, prevented = false;
        const ui = await setupSearchEditor(async () => { requests++; return { count: 1, results: [{ id: 5000, name: '圣灵谱尼' }] }; });
        ui.get('competitive-pet-id').value = '聖靈譜尼';
        ui.get('competitive-pet-id').events.keydown({ key: 'Enter', preventDefault() { prevented = true; } });
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(prevented, true);
        assert.deepEqual(ui.writes, []);
        const oldCandidate = ui.get('competitive-pet-search-results').children[0];
        ui.get('competitive-pet-id').value = '其他';
        ui.get('competitive-pet-id').events.input();
        await oldCandidate.events.click();
        assert.equal(requests, 1);
        assert.equal(ui.get('competitive-pet-search-results').hidden, true);
    } finally { Object.assign(globalThis, original); }
});

test('no name matches leave insertion disabled and late lookups cannot restore cleared previews', async () => {
    const original = { document: globalThis.document, window: globalThis.window };
    try {
        const pending = deferred();
        const ui = await setupSearchEditor(url => new URL(url).search ? Promise.resolve({ count: 0, results: [] }) : pending.promise);
        ui.get('competitive-pet-id').value = '聖靈譜尼';
        await ui.editor.lookupCompetitivePet();
        assert.match(ui.get('competitive-pet-message').textContent, /找不到/);
        assert.equal(ui.get('add-competitive-pet-button').disabled, true);
        ui.get('competitive-pet-id').value = '5000';
        const lookup = ui.editor.lookupCompetitivePet();
        ui.editor.closeCompetitivePoolEditor();
        pending.resolve({ id: 5000, name: '圣灵谱尼' }); await lookup;
        assert.equal(ui.get('competitive-pet-preview').hidden, true);
        assert.equal(ui.get('add-competitive-pet-button').disabled, true);
        assert.equal(ui.get('competitive-pet-id').disabled, false);
    } finally { Object.assign(globalThis, original); }
});
