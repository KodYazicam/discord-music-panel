const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.TOKEN_ENCRYPTION_KEY = 'test-key-for-unit-tests';
const { encryptSecret, decryptSecret, PREFIX } = require('../src/utils/crypto');

test('round-trips a bot token', () => {
    const token = 'MTA.fake.discord-bot-token-value';
    const enc = encryptSecret(token);
    assert.ok(enc.startsWith(PREFIX));
    assert.notEqual(enc, token);
    assert.equal(decryptSecret(enc), token);
});

test('leaves already-encrypted values alone', () => {
    const once = encryptSecret('abc');
    assert.equal(encryptSecret(once), once);
});
