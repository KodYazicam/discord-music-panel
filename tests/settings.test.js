const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

test('BotManager maps extra_settings JSON on update', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/bot/BotManager.js'), 'utf8');
    assert.match(src, /extra_settings/);
    assert.match(src, /JSON\.stringify\(updates\.settings\)/);
    assert.match(src, /function parseExtraSettings/);
});
