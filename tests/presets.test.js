const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
    LOOP_MODES,
    PresetValidationError,
    normalizePresets,
    parseStoredPresets
} = require('../src/utils/presets');

test('normalizePresets accepts every allowlisted field', () => {
    const presets = {
        volume: 60,
        maxQueueSize: 50,
        defaultLoopMode: 'queue',
        announceSongs: false,
        stayInChannel: true
    };

    assert.deepEqual(normalizePresets(presets), presets);
});

test('normalizePresets accepts a partial preset', () => {
    assert.deepEqual(normalizePresets({ volume: 0 }), { volume: 0 });
    assert.deepEqual(normalizePresets({}), {});
});

test('normalizePresets accepts range boundaries', () => {
    assert.deepEqual(normalizePresets({ volume: 200, maxQueueSize: 1 }), { volume: 200, maxQueueSize: 1 });
    assert.deepEqual(normalizePresets({ volume: 0, maxQueueSize: 500 }), { volume: 0, maxQueueSize: 500 });
});

test('normalizePresets rejects out-of-range numbers', () => {
    assert.throws(() => normalizePresets({ volume: 201 }), PresetValidationError);
    assert.throws(() => normalizePresets({ volume: -1 }), PresetValidationError);
    assert.throws(() => normalizePresets({ maxQueueSize: 0 }), PresetValidationError);
    assert.throws(() => normalizePresets({ maxQueueSize: 501 }), PresetValidationError);
});

test('normalizePresets rejects non-integer and non-boolean values', () => {
    assert.throws(() => normalizePresets({ volume: 60.5 }), /volume must be an integer/);
    assert.throws(() => normalizePresets({ volume: '60' }), /volume must be an integer/);
    assert.throws(() => normalizePresets({ announceSongs: 1 }), /announceSongs must be a boolean/);
    assert.throws(() => normalizePresets({ stayInChannel: 'yes' }), /stayInChannel must be a boolean/);
});

test('normalizePresets rejects unknown keys', () => {
    assert.throws(() => normalizePresets({ volume: 50, token: 'secret' }), /Unknown preset field: token/);
});

test('normalizePresets rejects invalid loop modes', () => {
    for (const mode of LOOP_MODES) {
        assert.equal(normalizePresets({ defaultLoopMode: mode }).defaultLoopMode, mode);
    }
    assert.throws(() => normalizePresets({ defaultLoopMode: 'all' }), /defaultLoopMode must be one of/);
});

test('normalizePresets rejects non-object input', () => {
    for (const input of [null, 'preset', 42, ['volume']]) {
        assert.throws(() => normalizePresets(input), PresetValidationError);
    }
});

test('parseStoredPresets handles empty, corrupt, and legacy values', () => {
    assert.deepEqual(parseStoredPresets(null), {});
    assert.deepEqual(parseStoredPresets(''), {});
    assert.deepEqual(parseStoredPresets('{}'), {});
    assert.deepEqual(parseStoredPresets('{not json'), {});
    assert.deepEqual(parseStoredPresets(JSON.stringify({ volume: 40 })), { volume: 40 });
    assert.deepEqual(parseStoredPresets({ defaultLoopMode: 'track' }), { defaultLoopMode: 'track' });
    assert.deepEqual(parseStoredPresets(JSON.stringify({ token: 'leak' })), {});
});
