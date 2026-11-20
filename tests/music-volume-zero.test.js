const { test } = require('node:test');
const assert = require('node:assert/strict');

// A stored volume of 0 is a real setting (mute), not a missing value. Every
// default that decides "which volume should this queue use" must only replace
// null/undefined, exactly like the schema default and the dashboard's `?? 100`.

const { MusicQueue } = require('../src/bot/MusicQueue');

function createLogger() {
    return { error() {} };
}

function embedDescription(payload) {
    return payload.embeds[0].toJSON().description;
}

test('a queue keeps an explicit volume of 0 instead of falling back to 100', () => {
    const queue = new MusicQueue('guild-1', { id: 'bot-1', volume: 0 }, {}, createLogger());
    assert.equal(queue.volume, 0);
});

test('a queue without a configured volume still defaults to 100', () => {
    const queue = new MusicQueue('guild-1', { id: 'bot-1' }, {}, createLogger());
    assert.equal(queue.volume, 100);
});

test('BotManager.startBot forwards a stored volume of 0 to the bot unchanged', async () => {
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

    require.cache[musicBotPath] = {
        id: musicBotPath,
        filename: musicBotPath,
        loaded: true,
        exports: { MusicBot: FakeMusicBot }
    };
    require.cache[dbPath] = {
        id: dbPath,
        filename: dbPath,
        loaded: true,
        exports: {
            botOperations: {
                getById: () => ({
                    id: 'bot-1',
                    name: 'Muted bot',
                    token: 'token',
                    client_id: 'client',
                    prefix: '!',
                    prefix_type: 'text',
                    volume: 0,
                    max_queue_size: 500,
                    default_search_engine: 'youtube',
                    announce_songs: 1,
                    delete_bot_messages: 0,
                    stay_in_channel: 0,
                    dj_role_id: null
                }),
                updateStatus: () => {}
            }
        }
    };

    try {
        delete require.cache[require.resolve('../src/bot/BotManager')];
        const { BotManager } = require('../src/bot/BotManager');
        const manager = new BotManager({}, { to: () => ({ emit() {} }), emit() {} });
        const result = await manager.startBot('bot-1');
        assert.equal(result.success, true);
        assert.equal(captured.volume, 0);
    } finally {
        if (previousMusicBot) require.cache[musicBotPath] = previousMusicBot;
        else delete require.cache[musicBotPath];
        if (previousDb) require.cache[dbPath] = previousDb;
        else delete require.cache[dbPath];
    }
});

test('slash /volume with no argument reports 0% for a muted queue', async () => {
    const command = require('../src/bot/commands/slash/volume');
    const replies = [];
    const interaction = {
        member: { voice: { channel: { id: 'voice-1' } } },
        guild: { id: 'guild-1' },
        options: { getInteger: () => null },
        reply: async (payload) => {
            replies.push(payload);
            return payload;
        }
    };
    const bot = { queues: new Map([['guild-1', { volume: 0 }]]), setVolume() {} };

    await command.execute(interaction, bot);

    assert.match(embedDescription(replies[0]), /\*\*0%\*\*/);
});

test('text !volume with no argument reports 0% for a muted queue', async () => {
    const command = require('../src/bot/commands/text/volume');
    const replies = [];
    const message = {
        member: { voice: { channel: { id: 'voice-1' } } },
        guild: { id: 'guild-1' },
        reply: async (payload) => {
            replies.push(payload);
            return payload;
        }
    };
    const bot = { queues: new Map([['guild-1', { volume: 0 }]]), setVolume() {} };

    await command.execute(message, [], bot);

    assert.match(embedDescription(replies[0]), /\*\*0%\*\*/);
});
