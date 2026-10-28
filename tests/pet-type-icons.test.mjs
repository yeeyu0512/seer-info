import test from 'node:test';
import assert from 'node:assert/strict';
import { createPetTypeIcons } from '../js/shared/pet-type-icons.js';

test('externally created preview icons join the observed queue and load when visible', async () => {
    const previous = globalThis.IntersectionObserver;
    const observed = new Set(), requests = [];
    let onVisibility, loaded;
    const completed = new Promise(resolve => { loaded = resolve; });
    globalThis.IntersectionObserver = class {
        constructor(callback) { onVisibility = callback; }
        observe(icon) { observed.add(icon); }
        unobserve(icon) { observed.delete(icon); }
    };
    try {
        const icons = createPetTypeIcons({ fetchSeerJson: async url => {
            requests.push(url);
            return url.includes('/pet/') ? { type: { id: 1 } } : { id: 1 };
        } });
        const icon = {
            dataset: { characterId: '5000' }, isConnected: true, hidden: true,
            classList: { add() { loaded(); } }
        };
        icons.observeCharacterTypeIcon(icon);
        assert.equal(icon.hidden, false, 'hidden previews need a layout box for IntersectionObserver');
        assert.equal(observed.has(icon), true);
        assert.equal(requests.length, 0);
        onVisibility([{ target: icon, isIntersecting: true }]);
        await completed;
        assert.equal(requests.length, 2);
        assert.match(icon.src, /assets\/icons\/types\/1\.png$/);
        icons.clearObservedTypeIcons({ contains: candidate => candidate === icon });
        assert.equal(observed.has(icon), false);
    } finally { globalThis.IntersectionObserver = previous; }
});
