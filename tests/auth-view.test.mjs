import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAuthView } from '../js/account/auth-view.js';

function setup(login = async () => ({ error: null })) {
    const timers = [];
    const nodes = new Map(['login-modal', 'email', 'password', 'login-message', 'login-button', 'about-login-trigger', 'login-close']
        .map(id => [id, {
            hidden: true, value: '', textContent: '', disabled: false, events: {},
            classList: (() => {
                const classes = new Set();
                return { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
            })(),
            addEventListener(name, callback) { this.events[name] = callback; },
            focus() { this.focused = true; }
        }]));
    const calls = [];
    const view = createAuthView({
        document: { getElementById(id) { assert.ok(nodes.has(id), `Unexpected auth control: ${id}`); return nodes.get(id); } },
        window: { setTimeout: callback => timers.push(callback), matchMedia: () => ({ matches: false }) },
        login: async (...args) => { calls.push(args); return login(...args); },
        onAuthenticated: async () => { calls.push('authenticated'); }
    });
    return { get: id => nodes.get(id), calls, view, finishAnimation: () => timers.splice(0).forEach(callback => callback()) };
}

test('staff login opens and authenticates using only email and password', async () => {
    const ui = setup();
    ui.get('about-login-trigger').events.click();
    assert.equal(ui.get('login-modal').hidden, false);
    assert.equal(ui.get('email').focused, true);
    ui.get('email').value = ' staff@example.com ';
    ui.get('password').value = 'secret';
    await ui.get('login-button').events.click();
    assert.deepEqual(ui.calls, [['staff@example.com', 'secret'], 'authenticated']);
    assert.equal(ui.get('login-modal').hidden, false, 'successful login preserves the exit animation');
    assert.equal(ui.get('login-modal').classList.contains('is-closing'), true);
    ui.finishAnimation();
    assert.equal(ui.get('login-modal').hidden, true);
    assert.equal(ui.get('password').value, '');
    assert.equal(ui.get('login-button').disabled, false);
});

test('reopening the login modal cancels the previous exit', () => {
    const ui = setup();
    ui.view.openLoginModal();
    ui.view.closeLoginModal();
    ui.view.openLoginModal();
    ui.finishAnimation();
    assert.equal(ui.get('login-modal').hidden, false);
});

test('empty credentials do not submit and failed login remains retryable', async () => {
    const ui = setup(async () => ({ error: { message: 'Invalid login credentials' } }));
    await ui.get('login-button').events.click();
    assert.deepEqual(ui.calls, []);
    assert.match(ui.get('login-message').textContent, /請輸入/);
    ui.view.openLoginModal();
    ui.get('email').value = 'staff@example.com';
    ui.get('password').value = 'wrong';
    await ui.get('login-button').events.click();
    assert.match(ui.get('login-message').textContent, /Email 或密碼錯誤/);
    assert.equal(ui.get('login-modal').hidden, false);
    assert.equal(ui.get('login-button').disabled, false);
    assert.equal(ui.get('login-button').textContent, '登入');
    assert.deepEqual(ui.calls, [['staff@example.com', 'wrong']]);
});

test('the entry page has no registration controls or archive loading paths', () => {
    const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    for (const id of ['password-confirm-group', 'password-confirm', 'mimi-id-group', 'mimi-id', 'register-button', 'auth-mode-toggle']) {
        assert.ok(!html.includes(`id="${id}"`), `Registration control remains: ${id}`);
    }
    assert.doesNotMatch(html, /(?:src|href)=["'][^"']*archive\/registration/);
    assert.match(html, /id="login-button"/);
    const auth = readFileSync(new URL('../js/auth.js', import.meta.url), 'utf8');
    assert.match(auth, /signInWithPassword/);
    assert.doesNotMatch(auth, /signUp/);
});
