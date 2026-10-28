import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionController } from '../js/app/session-controller.js';

function setup({ signedIn = false, admin = false } = {}) {
    const nodes = new Map(), calls = [], events = {};
    const document = { getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, {
            hidden: true, open: false, value: '', textContent: '',
            classList: { remove() {} }, listeners: {},
            addEventListener(name, callback) { this.listeners[name] = callback; }
        });
        return nodes.get(id);
    } };
    const controller = createSessionController({
        document,
        getSession: async () => signedIn ? { user: { id: 'staff' } } : null,
        isAdmin: async () => typeof admin === 'function' ? admin() : admin,
        logout: async () => ({ error: null }),
        supabaseClient: { auth: { onAuthStateChange(callback) { events.auth = callback; } } },
        activateTab: target => calls.push(target),
        defer: callback => events.deferred = callback
    });
    return { ...controller, nodes, calls, events, document };
}

test('management remains hidden for guests and regular users, visible only to confirmed admins', async () => {
    for (const [signedIn, admin, visible] of [[false, false, false], [true, false, false], [true, true, true]]) {
        const state = setup({ signedIn, admin });
        await state.checkSession();
        assert.equal(state.getIsAdministrator(), visible);
        for (const id of ['admin-tools', 'admin-link', 'competitive-pool-trigger', 'logout-button']) {
            assert.equal(state.nodes.get(id).hidden, !visible);
        }
        assert.equal(state.nodes.get('about-login-trigger').hidden, visible);
    }
});

test('sign-out hides and closes management and exits the competitive pool', async () => {
    const state = setup({ signedIn: true, admin: true });
    await state.checkSession();
    state.nodes.get('admin-tools').open = true;
    state.document.getElementById('competitive-pool-section').hidden = false;
    state.events.auth('SIGNED_OUT');
    assert.equal(state.getIsAdministrator(), false);
    assert.equal(state.nodes.get('admin-tools').hidden, true);
    assert.equal(state.nodes.get('admin-tools').open, false);
    assert.deepEqual(state.calls, ['home-section']);
});

test('an admin check completing after sign-out cannot restore the management menu', async () => {
    let finish;
    const state = setup({ signedIn: true, admin: () => new Promise(resolve => { finish = resolve; }) });
    const pending = state.checkSession();
    await Promise.resolve();
    state.events.auth('SIGNED_OUT');
    finish(true);
    await pending;
    assert.equal(state.getIsAdministrator(), false);
    assert.equal(state.nodes.get('admin-tools').hidden, true);
});

test('failed admin verification keeps management hidden', async () => {
    const previousError = console.error;
    console.error = () => {};
    try {
        const state = setup({ signedIn: true, admin: () => { throw new Error('offline'); } });
        await state.checkSession();
        assert.equal(state.getIsAdministrator(), false);
        assert.equal(state.nodes.get('admin-tools').hidden, true);
    } finally { console.error = previousError; }
});
