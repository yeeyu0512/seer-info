import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerPetImages } from '../js/player-pet-images.js';
import { renderPetBag } from '../js/player-lookup.js';

const head = id => `https://newseer.61.com/web/monster/head/${id}.png`;
const image = () => ({ isConnected: true, removeAttribute() { this.src = ''; } });
const tick = () => new Promise(resolve => setImmediate(resolve));
const skin = (id, petId = 7, resourceId = 1400123) => ({
    id, pet: { id: petId }, resource_id: resourceId, name: '測試皮膚', category: { id: 3 }
});

test('unskinned and legacy pets use the original head without fetching metadata', async () => {
    const images = createPlayerPetImages({ fetchJson: () => { throw new Error('unexpected request'); } });
    for (const skinId of [undefined, null, 0, -1, true, '123', 1.5, 0x100000000]) {
        const img = image();
        await images.set(img, { id: 7, skin_id: skinId });
        assert.equal(img.src, head(7));
        assert.equal(img.hidden, false);
    }
});

test('uses skin resource IDs and shares metadata between duplicate pets', async () => {
    let calls = 0;
    const images = createPlayerPetImages({ fetchJson: async url => {
        calls++;
        assert.equal(url, 'https://api.seerapi.com/v1/pet_skin/123');
        return skin(123, 7, 1400999);
    } });
    const first = image(), second = image(), original = image();
    await Promise.all([images.set(first, { id: 7, skin_id: 123 }), images.set(second, { id: 7, skin_id: 123 }),
        images.set(original, { id: 7, skin_id: 0 })]);
    assert.equal(first.src, head(1400999));
    assert.equal(second.src, first.src);
    assert.equal(original.src, head(7));
    assert.equal(calls, 1);
});

test('reuses the skin 840 resource correction', async () => {
    const images = createPlayerPetImages({ fetchJson: async () => skin(840, 4911, 1400840) });
    const img = image();
    await images.set(img, { id: 4911, skin_id: 840 });
    assert.equal(img.src, head(1400812));
});

test('metadata errors and wrong pet or skin IDs preserve the original head', async () => {
    for (const fetchJson of [async () => { throw new Error('offline'); }, async () => skin(123, 8),
        async () => skin(456), async () => null]) {
        const images = createPlayerPetImages({ fetchJson });
        const img = image();
        await images.set(img, { id: 7, skin_id: 123 });
        assert.equal(img.src, head(7));
    }
});

test('failed skin metadata can be retried on a later query', async () => {
    let calls = 0;
    const images = createPlayerPetImages({ fetchJson: async () => {
        if (++calls === 1) throw new Error('offline');
        return skin(123);
    } });
    const img = image();
    await images.set(img, { id: 7, skin_id: 123 });
    await images.set(img, { id: 7, skin_id: 123 });
    assert.equal(img.src, head(1400123));
    assert.equal(calls, 2);
});

test('unavailable skin images fall back to the original and stop retrying', async () => {
    const images = createPlayerPetImages({ fetchJson: async url => url.includes('/pet_skin/') ? skin(123) : { results: [] } });
    const img = image();
    await images.set(img, { id: 7, skin_id: 123 });
    await img.onerror();
    assert.equal(img.src, head(7));
    await img.onerror();
    assert.equal(img.hidden, true);
});

test('original appearance skins reuse the existing exact-name image lookup', async () => {
    const images = createPlayerPetImages({ fetchJson: async url => url.includes('/pet_skin/')
        ? { ...skin(859, 3506), category: { id: 0 }, name: '波塞冬' }
        : { results: [{ id: 2354, name: '波塞冬' }, { id: 3506, name: '驚濤海皇·波塞冬' }] } });
    const img = image();
    await images.set(img, { id: 3506, skin_id: 859 });
    await tick();
    assert.equal(img.src, head(2354));
});

test('late skin metadata cannot overwrite a reused or detached image', async () => {
    for (const detach of [false, true]) {
        let finish;
        const images = createPlayerPetImages({ fetchJson: () => new Promise(resolve => { finish = resolve; }) });
        const img = image();
        const pending = images.set(img, { id: 7, skin_id: 123 });
        await tick();
        if (detach) img.isConnected = false;
        else await images.set(img, { id: 8, skin_id: 0 });
        finish(skin(123));
        await pending;
        assert.equal(img.src, head(detach ? 7 : 8));
    }
});

test('pet card labels and species IDs remain unchanged when a skin is present', () => {
    const doc = { createElement(tag) {
        return { tag, ownerDocument: doc, children: [], classList: { add() {} },
            append(child) { this.children.push(child); },
            replaceChildren() { this.children = []; },
            querySelector(tag) { return this.children.find(child => child.tag === tag); } };
    } };
    const container = doc.createElement('div');
    renderPetBag(container, [{ id: 7, name: '火焰猩猩', skin_id: 123 }]);
    const info = container.children[0].children[1];
    assert.equal(info.children[0].textContent, '火焰猩猩');
    assert.equal(info.children[1].textContent, '#7');
});
