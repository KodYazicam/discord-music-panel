const { test } = require('node:test');
const assert = require('node:assert/strict');
const { assertAllowedQuery } = require('../src/bot/ytdlp');

test('allows youtube and soundcloud hosts', () => {
    assert.doesNotThrow(() => assertAllowedQuery('https://www.youtube.com/watch?v=dQw4w9WgXcQ'));
    assert.doesNotThrow(() => assertAllowedQuery('never gonna give you up'));
});

test('rejects arbitrary http hosts', () => {
    assert.throws(() => assertAllowedQuery('http://169.254.169.254/latest/meta-data'), /Host not allowed/);
    assert.throws(() => assertAllowedQuery('https://evil.example/track.mp3'), /Host not allowed/);
});
