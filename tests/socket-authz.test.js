const { test } = require('node:test');
const assert = require('node:assert/strict');

// Stub the database before the socket layer loads: requireBotAccess reads
// botOperations.getById, and these tests never open SQLite.
const bots = new Map([
    [1, { id: 1, name: 'alice-bot', created_by: 1 }],
    [2, { id: 2, name: 'bob-bot', created_by: 2 }]
]);
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        botOperations: {
            getById: (id) => bots.get(Number(id)) || null
        }
    }
};

const { setupSocketHandlers } = require('../src/api/socket');

function createBotManager() {
    const calls = {
        executeCommand: [],
        getBot: 0,
        getBotGuilds: 0,
        getQueue: 0,
        lifecycle: []
    };

    return {
        calls,
        bots,
        getAllBots: () => [
            { id: 1, name: 'alice-bot', createdBy: 1, created_by: 1 },
            { id: 2, name: 'bob-bot', createdBy: 2, created_by: 2 }
        ],
        getBot: (botId) => {
            calls.getBot += 1;
            return { id: Number(botId), name: 'alice-bot' };
        },
        getBotGuilds: () => {
            calls.getBotGuilds += 1;
            return [{ id: 'g1', name: 'secret guild' }];
        },
        getQueue: () => {
            calls.getQueue += 1;
            return { tracks: [{ title: 'secret song' }] };
        },
        getGlobalStats: () => ({ runningBots: 1, totalBots: 2 }),
        executeCommand: async (botId, guildId, command, args) => {
            calls.executeCommand.push({ botId, guildId, command, args });
            return { success: true };
        },
        startBot: async (botId) => {
            calls.lifecycle.push({ action: 'start', botId });
            return { success: true };
        },
        stopBot: async (botId) => {
            calls.lifecycle.push({ action: 'stop', botId });
            return { success: true };
        },
        restartBot: async (botId) => {
            calls.lifecycle.push({ action: 'restart', botId });
            return { success: true };
        }
    };
}

function connect(user, botManager) {
    let connection;
    const io = {
        use() {},
        on(event, handler) {
            if (event === 'connection') connection = handler;
        },
        to: () => ({ emit() {} }),
        emit() {}
    };

    setupSocketHandlers(io, botManager, {});

    const handlers = new Map();
    const socket = {
        id: `socket-${user.id}`,
        user,
        handshake: { auth: {} },
        on(event, handler) {
            handlers.set(event, handler);
        },
        join() {},
        leave() {}
    };
    connection(socket);

    const emit = (event, ...args) => new Promise((resolve) => {
        const handler = handlers.get(event);
        assert.equal(typeof handler, 'function', `missing handler for ${event}`);
        handler(...args, resolve);
    });

    // Invoke the registered handler exactly as Socket.IO does when the client
    // omits the acknowledgement callback.
    const raw = async (event, ...args) => {
        const handler = handlers.get(event);
        assert.equal(typeof handler, 'function', `missing handler for ${event}`);
        return handler(...args);
    };

    return { emit, raw };
}

const alice = { id: 1, username: 'alice', role: 'user' };
const bob = { id: 2, username: 'bob', role: 'user' };
const admin = { id: 99, username: 'admin', role: 'admin' };

const lifecycleEvents = ['bot:start', 'bot:stop', 'bot:restart'];
const perBotEvents = [
    ...lifecycleEvents.map((event) => [event, [1]]),
    ['bot:status', [1]],
    ['guilds:list', [1]],
    ['queue:get', [{ botId: 1, guildId: 'g1' }]],
    ['music:play', [{ botId: 1, guildId: 'g1', query: 'never gonna give you up' }]],
    ['music:pause', [{ botId: 1, guildId: 'g1' }]],
    ['music:resume', [{ botId: 1, guildId: 'g1' }]],
    ['music:skip', [{ botId: 1, guildId: 'g1' }]],
    ['music:stop', [{ botId: 1, guildId: 'g1' }]],
    ['music:volume', [{ botId: 1, guildId: 'g1', volume: 100 }]],
    ['music:shuffle', [{ botId: 1, guildId: 'g1' }]],
    ['music:loop', [{ botId: 1, guildId: 'g1', mode: 'track' }]],
    ['music:remove', [{ botId: 1, guildId: 'g1', index: 0 }]],
    ['music:clear', [{ botId: 1, guildId: 'g1' }]],
    ['music:move', [{ botId: 1, guildId: 'g1', from: 0, to: 1 }]],
    ['music:jump', [{ botId: 1, guildId: 'g1', index: 0 }]],
    ['music:leave', [{ botId: 1, guildId: 'g1' }]]
];

test('a non-owner cannot read or control another user\'s bot', async () => {
    const botManager = createBotManager();
    const { emit } = connect(bob, botManager);

    for (const [event, args] of perBotEvents) {
        const result = await emit(event, ...args);
        assert.deepEqual(result, { success: false, error: 'Forbidden' }, `${event} must be forbidden for a non-owner`);
    }

    assert.equal(botManager.calls.executeCommand.length, 0, 'no command may reach the bot');
    assert.equal(botManager.calls.getBot, 0, 'no bot metadata may be read');
    assert.equal(botManager.calls.getBotGuilds, 0, 'no guild list may be read');
    assert.equal(botManager.calls.getQueue, 0, 'no queue may be read');
    assert.equal(botManager.calls.lifecycle.length, 0, 'no lifecycle action may reach the bot');
});

test('the owner and an admin can start, stop and restart a bot', async () => {
    for (const user of [alice, admin]) {
        const botManager = createBotManager();
        const { emit } = connect(user, botManager);

        for (const event of lifecycleEvents) {
            assert.deepEqual(await emit(event, 1), { success: true }, `${event} must be allowed for ${user.username}`);
        }

        assert.deepEqual(botManager.calls.lifecycle, [
            { action: 'start', botId: 1 },
            { action: 'stop', botId: 1 },
            { action: 'restart', botId: 1 }
        ]);
    }
});

test('a non-owner gets Bot not found for an unknown bot id', async () => {
    const { emit } = connect(bob, createBotManager());

    assert.deepEqual(await emit('bot:status', 999), { success: false, error: 'Bot not found' });
    assert.deepEqual(await emit('music:stop', { botId: 999, guildId: 'g1' }), { success: false, error: 'Bot not found' });
});

test('the owner can read and control their own bot', async () => {
    const botManager = createBotManager();
    const { emit } = connect(alice, botManager);

    assert.deepEqual(await emit('bot:status', 1), { success: true, bot: { id: 1, name: 'alice-bot' } });
    assert.deepEqual(await emit('guilds:list', 1), { success: true, guilds: [{ id: 'g1', name: 'secret guild' }] });
    assert.deepEqual(await emit('queue:get', { botId: 1, guildId: 'g1' }), {
        success: true,
        queue: { tracks: [{ title: 'secret song' }] }
    });

    for (const [event, args] of perBotEvents.filter(([name]) => name.startsWith('music:'))) {
        assert.deepEqual(await emit(event, ...args), { success: true }, `${event} must be allowed for the owner`);
    }

    assert.equal(botManager.calls.executeCommand.length, 13);
    assert.equal(botManager.calls.executeCommand[0].botId, 1);
});

test('an admin can read any bot', async () => {
    const { emit } = connect(admin, createBotManager());

    assert.equal((await emit('bot:status', 1)).success, true);
    assert.equal((await emit('music:stop', { botId: 1, guildId: 'g1' })).success, true);
});

test('bots:list returns only the caller\'s bots unless the caller is an admin', async () => {
    const bobSocket = connect(bob, createBotManager());
    const bobList = await bobSocket.emit('bots:list');
    assert.deepEqual(bobList.bots.map((bot) => bot.name), ['bob-bot']);

    const adminSocket = connect(admin, createBotManager());
    const adminList = await adminSocket.emit('bots:list');
    assert.deepEqual(adminList.bots.map((bot) => bot.name), ['alice-bot', 'bob-bot']);
});

test('callback-taking handlers tolerate a client that omits the acknowledgement callback', async () => {
    const events = [
        ...perBotEvents,
        ['bots:list', []],
        ['stats:global', []]
    ];

    for (const user of [bob, alice]) {
        const botManager = createBotManager();
        const { raw } = connect(user, botManager);

        for (const [event, args] of events) {
            await assert.doesNotReject(
                async () => raw(event, ...args),
                `${event} must not throw or reject for ${user.username} without an ack`
            );
        }

        if (user === bob) {
            assert.equal(botManager.calls.executeCommand.length, 0, 'no command may reach the bot');
            assert.equal(botManager.calls.lifecycle.length, 0, 'no lifecycle action may reach the bot');
            assert.equal(botManager.calls.getBotGuilds, 0, 'no guild list may be read');
            assert.equal(botManager.calls.getQueue, 0, 'no queue may be read');
        } else {
            assert.equal(botManager.calls.lifecycle.length, 3, 'the owner lifecycle actions still run');
        }
    }
});
