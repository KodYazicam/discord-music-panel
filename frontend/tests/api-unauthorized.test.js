import test from 'node:test';
import assert from 'node:assert/strict';

// The shared Axios instance and the auth store touch browser globals at module
// scope (zustand persist + initAuth), so provide minimal stubs before import.
globalThis.window = { location: { href: '/', pathname: '/' } };
globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
};

const { default: api } = await import('../src/utils/api.js');
const { useAuthStore } = await import('../src/stores/authStore.js');

function unauthorizedAdapter(config) {
    const error = new Error('Request failed with status code 401');
    error.config = config;
    error.response = {
        status: 401,
        statusText: 'Unauthorized',
        data: { error: 'Invalid credentials' },
        headers: {},
        config,
    };
    return Promise.reject(error);
}

function resetLocation(href) {
    globalThis.window.location.href = href;
    globalThis.window.location.pathname = new URL(href, 'http://localhost').pathname;
}

test('a 401 from /auth/login keeps the session and the login form intact', async () => {
    useAuthStore.setState({ user: { id: 1 }, token: 'jwt', isAuthenticated: true, isLoading: false });
    resetLocation('/');
    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = unauthorizedAdapter;

    try {
        const result = await useAuthStore.getState().login('alice', 'wrong-password');

        assert.deepEqual(result, { success: false, error: 'Invalid credentials' });
        assert.equal(globalThis.window.location.href, '/');
        assert.equal(useAuthStore.getState().token, 'jwt');
        assert.equal(useAuthStore.getState().isAuthenticated, true);
    } finally {
        api.defaults.adapter = originalAdapter;
    }
});

test('a 401 from a protected endpoint still logs out and redirects to /login', async () => {
    useAuthStore.setState({ user: { id: 1 }, token: 'jwt', isAuthenticated: true, isLoading: false });
    resetLocation('/dashboard');
    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = unauthorizedAdapter;

    try {
        await assert.rejects(api.get('/bots'));

        assert.equal(globalThis.window.location.href, '/login');
        assert.equal(useAuthStore.getState().token, null);
        assert.equal(useAuthStore.getState().isAuthenticated, false);
    } finally {
        api.defaults.adapter = originalAdapter;
    }
});

test('a 401 while already on /login logs out without reloading the page', async () => {
    useAuthStore.setState({ user: { id: 1 }, token: 'expired', isAuthenticated: true, isLoading: false });
    resetLocation('/login#form');
    const hrefBefore = globalThis.window.location.href;
    const originalAdapter = api.defaults.adapter;
    api.defaults.adapter = unauthorizedAdapter;

    try {
        await assert.rejects(api.get('/auth/me'));

        assert.equal(globalThis.window.location.href, hrefBefore);
        assert.equal(useAuthStore.getState().token, null);
        assert.equal(useAuthStore.getState().isAuthenticated, false);
    } finally {
        api.defaults.adapter = originalAdapter;
    }
});
