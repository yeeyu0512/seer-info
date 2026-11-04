import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSkinImage, cancelSkinImage } from '../js/lookup/skin-image.js';

class Image extends EventTarget {
    isConnected = true;
    complete = true;
    naturalWidth = 0;
    hidden = false;
    src = '';
    getAttribute() { return this.src; }
    fail() { this.naturalWidth = 0; this.dispatchEvent(new Event('error')); }
    succeed() { this.naturalWidth = 100; this.dispatchEvent(new Event('load')); }
}
const wait = () => new Promise(resolve => setTimeout(resolve, 15));
const url = 'https://example.com/body/1400691.png';

test('transient failures retry the original resource and restore visibility', async () => {
    const image = new Image();
    let fallbackCalls = 0;
    loadSkinImage(image, url, { retryDelay: 0, fallback: () => { fallbackCalls++; } });
    image.fail();
    await wait();
    assert.equal(new URL(image.src).pathname, '/body/1400691.png');
    assert.equal(new URL(image.src).searchParams.get('skin_retry'), '1');
    image.hidden = true;
    image.succeed();
    assert.equal(image.hidden, false);
    assert.equal(fallbackCalls, 0);
});

test('failed head and successful body have independent fallback and visibility', async () => {
    const head = new Image(), body = new Image();
    loadSkinImage(head, url, { retryDelay: 0, fallback: async () => null });
    loadSkinImage(body, url);
    body.succeed();
    head.fail();
    await wait();
    head.fail();
    await wait();
    assert.equal(head.hidden, true);
    assert.equal(body.hidden, false);
    assert.equal(body.src, url);
});

test('late fallback cannot replace a newly selected skin', async () => {
    const image = new Image();
    let resolve;
    loadSkinImage(image, url, { retryDelay: 0, fallback: () => new Promise(done => { resolve = done; }) });
    image.fail();
    await wait();
    image.fail();
    const next = 'https://example.com/body/1400799.png';
    loadSkinImage(image, next);
    image.succeed();
    resolve('https://example.com/body/4450.png');
    await wait();
    assert.equal(image.src, next);
    assert.equal(image.hidden, false);
});

test('fallback failure terminates without a retry loop', async () => {
    const image = new Image();
    let calls = 0;
    loadSkinImage(image, url, { retryDelay: 0, fallback: async () => { calls++; return 'https://example.com/body/4450.png'; } });
    image.fail();
    await wait();
    image.fail();
    await wait();
    image.fail();
    await wait();
    assert.equal(calls, 1);
    assert.equal(image.hidden, true);
});

test('category reset cancels scheduled retry and pending events', async () => {
    const image = new Image();
    loadSkinImage(image, url, { retryDelay: 0 });
    image.fail();
    cancelSkinImage(image);
    image.hidden = true;
    await wait();
    image.succeed();
    assert.equal(image.src, url);
    assert.equal(image.hidden, true);
});
