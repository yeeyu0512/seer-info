import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayerPetImages } from '../js/player-pet-images.js';
import { renderPetBag } from '../js/player-lookup.js';

const head = id => `https://newseer.61.com/web/monster/head/${id}.png`;
class TestImage extends EventTarget {
    isConnected = true;
    complete = true;
    naturalWidth = 0;
    removeAttribute() { this.src = ''; }
    getAttribute() { return this.src; }
    fail() { this.dispatchEvent(new Event('error')); }
}
const image = () => new TestImage();
const tick = () => new Promise(resolve => setImmediate(resolve));
async function failAfterRetry(img, t) {
    const before = new URL(img.src);
    img.fail();
    t.mock.timers.tick(300);
    before.searchParams.set('skin_retry', '1');
    assert.equal(img.src, before.href);
    img.fail();
    await tick();
}
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

test('skin 702 and its encoded variant use the pet 164 thumbnail', async () => {
    const calls = [];
    const images = createPlayerPetImages({fetchJson:async url => {
        calls.push(url);
        return {...skin(702, 4732, 1400702), category:{id:0}};
    }});
    for (const skinId of [702, 100702]) {
        const img = image();
        await images.set(img, {id:4732, skin_id:skinId});
        assert.equal(img.src, head(164));
    }
    assert.deepEqual(calls, ['https://api.seerapi.com/v1/pet_skin/702']);
});

test('failed 1500 skin heads retry before trying the matching 1400 head', async t => {
    t.mock.timers.enable({apis:['setTimeout']});
    const calls = [];
    const images = createPlayerPetImages({ fetchJson: async url => {
        calls.push(url);
        return skin(123, 7, 1500123);
    } });
    const img = image();
    await images.set(img, {id:7, skin_id:123});
    assert.equal(img.src, head(1500123), 'successful 1500 heads stay unchanged');
    await failAfterRetry(img, t);
    assert.equal(img.src, head(1400123));
    assert.equal(img.hidden, false);
    assert.equal(calls.length, 1, 'prefix correction needs no extra metadata query');
});

test('a missing corrected head keeps the original fallback and terminates retries', async t => {
    t.mock.timers.enable({apis:['setTimeout']});
    const images = createPlayerPetImages({ fetchJson: async url => url.includes('/pet_skin/')
        ? skin(123, 7, 1500001) : {results:[]} });
    const img = image();
    await images.set(img, {id:7, skin_id:123});
    await failAfterRetry(img, t);
    assert.equal(img.src, head(1400001), 'leading zeros in the suffix are preserved');
    await failAfterRetry(img, t);
    assert.equal(img.src, head(7));
    await failAfterRetry(img, t);
    assert.equal(img.hidden, true);
});

test('old 1500 image failures cannot overwrite a newer player pet image', async t => {
    t.mock.timers.enable({apis:['setTimeout']});
    const images = createPlayerPetImages({fetchJson:async () => skin(123, 7, 1500123)});
    const img = image();
    await images.set(img, {id:7, skin_id:123});
    img.fail();
    await images.set(img, {id:8, skin_id:0});
    t.mock.timers.tick(300);
    assert.equal(img.src, head(8));
});

test('player skin 100512 resolves catalog 512 and preserves the 1500512 to 1400512 correction', async t => {
    t.mock.timers.enable({apis:['setTimeout']});
    const calls = [];
    const images = createPlayerPetImages({fetchJson:async url => {
        calls.push(url);
        return skin(512, 3788, 1400512);
    }});
    const pet = {id:3788, name:'混元天尊', skin_id:100512};
    const img = image();
    await images.set(img, pet);
    assert.equal(img.src, head(1500512));
    await failAfterRetry(img, t);
    assert.equal(img.src, head(1400512));
    assert.deepEqual(calls, ['https://api.seerapi.com/v1/pet_skin/512']);
    assert.equal(pet.skin_id, 100512, 'the original player result stays unchanged');
});

test('variant skin resolution still rejects a mismatched linked pet', async () => {
    const images = createPlayerPetImages({fetchJson:async () => skin(512, 3789, 1400512)});
    const img = image();
    await images.set(img, {id:3788, skin_id:100512});
    assert.equal(img.src, head(3788));
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

test('unavailable skin images fall back to the original and stop retrying', async t => {
    t.mock.timers.enable({apis:['setTimeout']});
    const images = createPlayerPetImages({ fetchJson: async url => url.includes('/pet_skin/') ? skin(123) : { results: [] } });
    const img = image();
    await images.set(img, { id: 7, skin_id: 123 });
    await failAfterRetry(img, t);
    assert.equal(img.src, head(7));
    await failAfterRetry(img, t);
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
