import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNavigation } from '../js/app/navigation.js';

function setup(search) {
    const calls = [], elements = new Map();
    const element = () => ({ hidden: true, querySelectorAll: () => [] });
    globalThis.document = { getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
    } };
    globalThis.window = {
        location: { search, href: `https://example.com/seer-info/${search}` },
        addEventListener() {}, history: { pushState(_state, _title, url) { window.location.href = url.href; } }
    };
    let mode = 'pet';
    const navigation = createNavigation({
        primaryMainTabs: [], votePanels: new Map(),
        seerLookup: { setMode(value) { mode = value; }, getMode: () => mode,
            searchPetById: id => calls.push(['pet', id]), searchSkinById: id => calls.push(['skin', id]), browseLatestIfEmpty() {} },
        sealEncyclopediaSection: element(), suitEncyclopediaSection: element(),
        seerMintmarks: { load() {}, searchById: id => calls.push(['mintmark', id]) },
        seerSuits: { load() {}, searchById: id => calls.push(['suit', id]) },
        trainingSection: element(), accountSection: element(),
        seerTraining: { cancelRestore() {} }, votingSubTabs: element(), encyclopediaSubTabs: element(),
        getIsAdministrator: () => false
    });
    return { navigation, calls };
}

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

test('changing encyclopedia tabs clears the previous resource ID', () => {
    try {
        const { navigation } = setup('?tab=skin&id=241');
        navigation.activateTab('suit-encyclopedia-section');
        const url = new URL(window.location.href);
        assert.equal(url.searchParams.get('tab'), 'suit');
        assert.equal(url.searchParams.has('id'), false);
    } finally { delete globalThis.document; delete globalThis.window; }
});
