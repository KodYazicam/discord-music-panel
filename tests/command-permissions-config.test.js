const { test } = require('node:test');
const assert = require('node:assert/strict');

test('BotManager.startBot forwards DJ Mode and restriction settings from extra_settings', async () => {
    const musicBotPath = require.resolve('../src/bot/MusicBot');
    const dbPath = require.resolve('../src/database/db');
    const previousMusicBot = require.cache[musicBotPath];
    const previousDb = require.cache[dbPath];
    let captured = null;

    class FakeMusicBot {
        constructor(config) {
            captured = config;
        }
        async start() {}
        isConnected() {
            return true;
        }
    }

    const botRow = {
        id: 'bot-1',
        name: 'Guarded bot',
        token: 'token',
        client_id: 'client',
        prefix: '!',
        prefix_type: 'both',
        dj_role_id: 'dj-role-1',
        extra_settings: JSON.stringify({
            djEnabled: true,
            djOnlyCommands: ['skip', 'Stop'],
            allowedChannels: ['channel-1'],
            blockedChannels: ['channel-2'],
            allowedRoles: ['role-1'],
            blockedUsers: ['user-1']
        })
    };

    require.cache[musicBotPath] = {
        id: musicBotPath, filename: musicBotPath, loaded: true, exports: { MusicBot: FakeMusicBot }
    };
    require.cache[dbPath] = {
        id: dbPath,
        filename: dbPath,
        loaded: true,
        exports: {
            botOperations: { getById: () => botRow, updateStatus: () => {} }
        }
    };

    try {
        delete require.cache[require.resolve('../src/bot/BotManager')];
        const { BotManager } = require('../src/bot/BotManager');
        const manager = new BotManager({}, { to: () => ({ emit() {} }), emit() {} });
        const result = await manager.startBot('bot-1');

        assert.equal(result.success, true);
        assert.equal(captured.djEnabled, true);
        assert.equal(captured.djRoleId, 'dj-role-1');
        assert.deepEqual(captured.djOnlyCommands, ['skip', 'stop']);
        assert.deepEqual(captured.allowedChannels, ['channel-1']);
        assert.deepEqual(captured.blockedChannels, ['channel-2']);
        assert.deepEqual(captured.allowedRoles, ['role-1']);
        assert.deepEqual(captured.blockedUsers, ['user-1']);
    } finally {
        if (previousMusicBot) require.cache[musicBotPath] = previousMusicBot;
        else delete require.cache[musicBotPath];
        if (previousDb) require.cache[dbPath] = previousDb;
        else delete require.cache[dbPath];
    }
});
