import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNavigation } from '../js/app/navigation.js';

function setup(search, { menuSummary, menuOptions } = {}) {
    const calls = [], elements = new Map();
    const element = () => ({ hidden: true, querySelectorAll: () => [] });
    globalThis.document = { getElementById(id) {
        if (id === 'encyclopedia-nav' && menuSummary) {
            return { querySelector: () => menuSummary, querySelectorAll: () => menuOptions };
        }
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    } };
    globalThis.window = {
        location: { search, href: `https://example.com/seer-info/${search}` },
        addEventListener() {}, history: { pushState(_state, _title, url) { window.location.href = url.href; } }
    };
    let mode = 'pet';
    const navigation = createNavigation({
        primaryMainTabs: [],
        seerLookup: { setMode(value) { mode = value; }, getMode: () => mode,
            searchPetById: id => calls.push(['pet', id]), searchSkinById: id => calls.push(['skin', id]), browseLatestIfEmpty() {} },
        sealEncyclopediaSection: element(), suitEncyclopediaSection: element(),
        seerMintmarks: { load() {}, searchById: id => calls.push(['mintmark', id]) },
        seerSuits: { load() {}, searchById: id => calls.push(['suit', id]) },
        trainingSection: element(),
        seerTraining: { cancelRestore() {} }, encyclopediaSubTabs: element(),
        loadCurrentCompetitivePool: () => calls.push(['competitive'])
    });
    return { navigation, calls, elements };
}

test('the competitive pool route can be opened and restored publicly', () => {
    try {
        const { navigation, calls, elements } = setup('?tab=competitive');
        navigation.restoreRouteFromUrl({ initial: true });
        assert.deepEqual(calls, [['competitive']]);
        assert.equal(elements.get('competitive-pool-section').hidden, false);
        assert.equal(elements.get('home-section').hidden, true);
        navigation.activateTab('home-section');
        assert.equal(elements.get('competitive-pool-section').hidden, true);
        navigation.activateTab('competitive-pool-section');
        assert.equal(new URL(window.location.href).searchParams.get('tab'), 'competitive');
        assert.deepEqual(calls, [['competitive'], ['competitive']]);
    } finally { delete globalThis.document; delete globalThis.window; }
});

test('guests can load competitive pool data through direct routes', () => {
    try {
        const { navigation, calls, elements } = setup('?tab=competitive');
        navigation.restoreRouteFromUrl({ initial: true });
        assert.deepEqual(calls, [['competitive']]);
        assert.equal(elements.get('competitive-pool-section').hidden, false);
        assert.equal(elements.get('home-section').hidden, true);
        navigation.activateTab('competitive-pool-section');
        assert.deepEqual(calls, [['competitive'], ['competitive']]);
    } finally { delete globalThis.document; delete globalThis.window; }
});

test('all four encyclopedia routes restore their own ID without confusing resource types', () => {
    try {
        for (const tab of ['pet', 'skin', 'mintmark', 'suit']) {
            const { navigation, calls } = setup(`?tab=${tab}&id=241`);
            navigation.restoreRouteFromUrl({ initial: true });
            assert.deepEqual(calls, [[tab, '241']]);
        }
        for (const id of ['0', '-1', 'abc', '1.5', '12345678901']) {
            const { navigation, calls } = setup(`?tab=skin&id=${id}`);
            navigation.restoreRouteFromUrl();
            assert.deepEqual(calls, []);
        }
    } finally { delete globalThis.document; delete globalThis.window; }
});

test('header encyclopedia menu opens each catalog route and marks the selected choice', () => {
    const summary = {
        classList: { toggle() {} },
        setAttribute(name, value) { this[name] = value; }
    };
    const options = ['pet', 'skin', 'seal', 'suit'].map(mode => ({
        dataset: { lookupMode: mode },
        classList: { toggle() {} },
        setAttribute(name, value) { this[name] = value; },
        addEventListener(_name, handler) { this.click = handler; }
    }));
    try {
        const { navigation } = setup('', { menuSummary: summary, menuOptions: options });
        for (const [mode, route] of [['pet', 'pet'], ['skin', 'skin'], ['seal', 'mintmark'], ['suit', 'suit']]) {
            options.find(option => option.dataset.lookupMode === mode).click();
            assert.equal(new URL(window.location.href).searchParams.get('tab'), route);
            assert.equal(summary['aria-selected'], 'true');
            assert.deepEqual(options.map(option => option['aria-pressed']),
                options.map(option => String(option.dataset.lookupMode === mode)));
        }
        navigation.activateTab('home-section');
        assert.equal(summary['aria-selected'], 'false');
        assert(options.every(option => option['aria-pressed'] === 'false'));
    } finally { delete globalThis.document; delete globalThis.window; }
});

test('changing encyclopedia tabs clears the previous resource ID', () => {
    try {
        const { navigation } = setup('?tab=skin&id=241');
        navigation.activateTab('suit-encyclopedia-section');
        const url = new URL(window.location.href);
        assert.equal(url.searchParams.get('tab'), 'suit');
        assert.equal(url.searchParams.has('id'), false);
    } finally { delete globalThis.document; delete globalThis.window; }
});

test('damage calculator has a public deep link and leaves training share state behind', () => {
    try {
        const { navigation, elements } = setup('?tab=damage');
        navigation.restoreRouteFromUrl({ initial: true });
        assert.equal(elements.get('damage-calculator-section').hidden, false);
        assert.equal(elements.get('home-section').hidden, true);
        navigation.activateTab('home-section');
        assert.equal(elements.get('damage-calculator-section').hidden, true);
        window.location.href = 'https://example.com/?tab=training&build=old&id=123';
        navigation.activateTab('damage-calculator-section');
        const url = new URL(window.location.href);
        assert.equal(url.searchParams.get('tab'), 'damage');
        assert.equal(url.searchParams.has('build'), false);
        assert.equal(url.searchParams.has('id'), false);
    } finally { delete globalThis.document; delete globalThis.window; }
});
