import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdminSession } from '../js/admin/session-controller.js';

function setup({ signedIn = false, admin = false, loadError = null } = {}) {
    const nodes = new Map(), calls = [];
    globalThis.document = {
        body: { classList: { add() {}, remove() {} } },
        getElementById(id) {
            if (!nodes.has(id)) nodes.set(id, {
                hidden: true, value: '', textContent: '', innerHTML: '',
                addEventListener() {}
            });
            return nodes.get(id);
        }
    };
    const errorContainer = document.getElementById('data-list');
    const session = createAdminSession({
        logout: async () => ({}), login: async () => ({}),
        getSession: async () => signedIn ? { user: { id: 'test-admin' } } : null,
        isAdmin: async () => admin,
        showAdminNotification: () => calls.push('error'),
        getAdminErrorMessage: error => error.message,
        errorContainer,
        loadWorkspace: async () => {
            calls.push('load');
            if (loadError) throw loadError;
        }
    });
    return { ...session, nodes, calls, errorContainer };
}

test('admin pages do not load workspace data for guests or regular accounts', async () => {
    const previous = globalThis.document;
    try {
        const guest = setup();
        await guest.loadAdminPage();
        assert.deepEqual(guest.calls, []);
        assert.equal(guest.nodes.get('admin-login-panel').hidden, false);
        const regular = setup({ signedIn: true });
        await regular.loadAdminPage();
        assert.deepEqual(regular.calls, []);
        assert.equal(regular.nodes.get('access-denied').hidden, false);
        assert.equal(regular.nodes.get('admin-workspace').hidden, true);
    } finally { globalThis.document = previous; }
});

test('confirmed admins load only the configured website workspace', async () => {
    const previous = globalThis.document;
    try {
        const admin = setup({ signedIn: true, admin: true });
        await admin.loadAdminPage();
        assert.deepEqual(admin.calls, ['load']);
        assert.equal(admin.nodes.get('admin-workspace').hidden, false);
        assert.equal(admin.nodes.get('admin-login-panel').hidden, true);
    } finally { globalThis.document = previous; }
});

test('workspace failures render into the website-specific error container', async () => {
    const previous = globalThis.document, previousError = console.error;
    console.error = () => {};
    try {
        const admin = setup({ signedIn: true, admin: true, loadError: new Error('offline') });
        await admin.loadAdminPage();
        assert.deepEqual(admin.calls, ['load', 'error']);
        assert.match(admin.errorContainer.innerHTML, /載入管理資料失敗/);
    } finally { globalThis.document = previous; console.error = previousError; }
});
