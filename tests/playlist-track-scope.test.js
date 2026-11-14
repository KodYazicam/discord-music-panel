const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const jwt = require('jsonwebtoken');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'playlist-track-scope-'));
process.env.DATABASE_PATH = path.join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'playlist-track-scope-test-secret';

const {
    initDatabase,
    userOperations,
    playlistOperations
} = require('../src/database/db');
const { setupRoutes } = require('../src/api/routes');

let server;
let baseUrl;
let victim;
let attacker;
let admin;
let victimList;
let attackerList;
let victimTrack;

before(async () => {
    initDatabase();

    victim = userOperations.create('victim', 'x', 'victim@example.com', 'user');
    attacker = userOperations.create('attacker', 'x', 'attacker@example.com', 'user');
    admin = userOperations.create('root', 'x', 'root@example.com', 'admin');

    victimList = playlistOperations.create({ name: 'theirs', createdBy: victim, isPublic: false });
    attackerList = playlistOperations.create({ name: 'mine', createdBy: attacker, isPublic: false });

    playlistOperations.addTrack(victimList, { title: 'Victim song', url: 'https://youtu.be/x' });
    victimTrack = playlistOperations.getTracks(victimList)[0];

    const app = express();
    app.use(express.json());
    app.set('botManager', {});
    setupRoutes(app);

    server = app.listen(0);
    await new Promise(resolve => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

function tokenFor(user) {
    return jwt.sign({ id: user, username: `user-${user}`, role: user === admin ? 'admin' : 'user' }, process.env.JWT_SECRET);
}

function deleteTrack(playlistId, trackId, userId) {
    return fetch(`${baseUrl}/api/playlists/${playlistId}/tracks/${trackId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${tokenFor(userId)}` }
    });
}

test('rejects deleting a track that belongs to another playlist', async () => {
    const res = await deleteTrack(attackerList, victimTrack.id, attacker);
    const body = await res.json();

    assert.equal(res.status, 404);
    assert.equal(body.success, false);
    assert.equal(playlistOperations.getTracks(victimList).length, 1);
});

test('keeps the 403 for playlists the caller does not own', async () => {
    const res = await deleteTrack(victimList, victimTrack.id, attacker);
    assert.equal(res.status, 403);
    assert.equal(playlistOperations.getTracks(victimList).length, 1);
});

test('removes a track from the playlist in the URL for its owner', async () => {
    playlistOperations.addTrack(attackerList, { title: 'Mine', url: 'https://youtu.be/y' });
    const ownTrack = playlistOperations.getTracks(attackerList)[0];

    const res = await deleteTrack(attackerList, ownTrack.id, attacker);
    assert.equal(res.status, 200);
    assert.equal(playlistOperations.getTracks(attackerList).length, 0);
});

test('admins can still remove tracks from another user\'s playlist', async () => {
    const res = await deleteTrack(victimList, victimTrack.id, admin);
    assert.equal(res.status, 200);
    assert.equal(playlistOperations.getTracks(victimList).length, 0);
});
