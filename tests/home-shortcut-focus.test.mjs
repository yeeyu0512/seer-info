import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { focusHomeShortcutTarget, openHomeShortcut } from '../js/app/home.js';

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const shortcuts = [
    ['pet', 'seer-lookup-section'],
    ['skin', 'seer-lookup-section'],
    ['seal', 'seal-encyclopedia-section'],
    ['suit', 'suit-encyclopedia-section']
];

test('all four encyclopedia shortcuts focus the selected dropdown summary', () => {
    try {
        for (const [mode, target] of shortcuts) {
            const button = mode === 'pet' || mode === 'skin'
                ? `data-home-target="${target}" data-home-mode="${mode}"`
                : `data-home-target="${target}"`;
            assert(homepage.includes(button), `${mode} shortcut exists`);
            const calls = [];
            globalThis.document = {
                querySelector(selector) {
                    assert.equal(selector, '.primary-main-tabs [aria-selected="true"]');
                    return { focus(options) { calls.push(['focus', options]); } };
                },
                getElementById() { throw new Error('selected navigation should receive focus'); }
            };
            globalThis.window = { scrollTo(options) { calls.push(['scroll', options]); } };
            const shortcut = { dataset: { homeTarget: target, ...(mode === 'pet' || mode === 'skin' ? { homeMode: mode } : {}) } };
            assert.doesNotThrow(() => openHomeShortcut(shortcut, {
                seerLookup: { setMode(value) { calls.push(['mode', value]); } },
                activateTab(value) { calls.push(['activate', value]); }
            }));
            assert.deepEqual(calls, [
                ...(shortcut.dataset.homeMode ? [['mode', mode]] : []),
                ['activate', target], ['focus', { preventScroll: true }], ['scroll', { top: 0 }]
            ]);
        }
    } finally { delete globalThis.document; delete globalThis.window; }
});

test('shortcut focuses its target section when selected navigation is unavailable', () => {
    try {
        const section = { focus(options) { this.focusOptions = options; } };
        globalThis.document = {
            querySelector: () => null,
            getElementById(id) { assert.equal(id, 'seal-encyclopedia-section'); return section; }
        };
        focusHomeShortcutTarget('seal-encyclopedia-section');
        assert.equal(section.tabIndex, -1);
        assert.deepEqual(section.focusOptions, { preventScroll: true });
    } finally { delete globalThis.document; }
});
