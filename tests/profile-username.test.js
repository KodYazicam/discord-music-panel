const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'profile-username-test-secret';

const users = new Map();
const settings = new Map();
let nextUserId = 1;

function resetState() {
    users.clear();
    settings.clear();
    nextUserId = 1;
}

function seedUser({ username, password = 'correct-password', role = 'user' } = {}) {
    const id = nextUserId++;
    users.set(id, {
        id,
        username,
        password: bcrypt.hashSync(password, 4),
        email: `${username}@example.com`,
        role,
        created_at: '2026-01-01T00:00:00.000Z',
        last_login: null
    });
    return id;
}

function publicUser(user) {
    if (!user) return undefined;
    const { password, ...rest } = user;
    return rest;
}

const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        userOperations: {
            count: () => users.size,
            getAll: () => [...users.values()].map(publicUser),
            // Mirrors the real SQLite query: the first row with that username wins.
            getByUsername: (username) => [...users.values()].find(user => user.username === username),
            getById: (id) => publicUser(users.get(Number(id))),
            getAuthById: (id) => users.get(Number(id)),
            create: (username, password, email, role = 'user') => {
                const id = nextUserId++;
                users.set(id, {
                    id,
                    username,
                    password,
                    email,
                    role,
                    created_at: '2026-01-01T00:00:00.000Z',
                    last_login: null
                });
                return id;
            },
            updateProfile: (id, username, email) => {
                Object.assign(users.get(Number(id)), { username, email });
            },
            updatePassword: (id, password) => {
                users.get(Number(id)).password = password;
            },
            updateLastLogin: (id) => {
                users.get(Number(id)).last_login = '2026-01-02T00:00:00.000Z';
            }
        },
        settingOperations: {
            get: (key, fallback = null) => (settings.has(key) ? settings.get(key) : fallback),
            set: (key, value) => settings.set(key, value)
        },
        botOperations: { getById: () => null, getAll: () => [] },
        statisticsOperations: {},
        playlistOperations: {},
        guildOperations: {}
    }
};

const { setupRoutes } = require('../src/api/routes');

async function startServer(t) {
    const app = express();
    app.use(express.json());
    app.set('db', { prepare: () => ({ get: () => ({ ok: 1 }) }) });
    app.set('botManager', null);
    setupRoutes(app);

    const server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));

    return `http://127.0.0.1:${server.address().port}`;
}

function request(base, path, { token, method = 'GET', body } = {}) {
    const headers = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    return fetch(`${base}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

function tokenFor(user) {
    return jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET);
}

test('a profile rename cannot take a username another account already uses', async (t) => {
    resetState();
    seedUser({ username: 'alice' });
    const bobId = seedUser({ username: 'bob' });
    const base = await startServer(t);
    const token = tokenFor({ id: bobId, username: 'bob', role: 'user' });

    const response = await request(base, '/api/auth/profile', {
        token,
        method: 'PATCH',
        body: { username: 'alice', email: 'bob@example.com' }
    });

    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'Username already exists');
    assert.equal(users.get(bobId).username, 'bob');
});

test('an earlier account cannot shadow a later account by renaming into its username', async (t) => {
    resetState();
    const malloryId = seedUser({ username: 'mallory' });
    seedUser({ username: 'alice' });
    const base = await startServer(t);
    const token = tokenFor({ id: malloryId, username: 'mallory', role: 'user' });

    const rename = await request(base, '/api/auth/profile', {
        token,
        method: 'PATCH',
        body: { username: 'alice', email: 'mallory@example.com' }
    });
    assert.equal(rename.status, 400);

    const login = await request(base, '/api/auth/login', {
        method: 'POST',
        body: { username: 'alice', password: 'correct-password' }
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.username, 'alice');
});

test('saving the profile with the unchanged username still works', async (t) => {
    resetState();
    const aliceId = seedUser({ username: 'alice' });
    const base = await startServer(t);
    const token = tokenFor({ id: aliceId, username: 'alice', role: 'user' });

    const response = await request(base, '/api/auth/profile', {
        token,
        method: 'PATCH',
        body: { username: 'alice', email: 'alice@example.com' }
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.username, 'alice');
    assert.equal(users.get(aliceId).email, 'alice@example.com');
});
