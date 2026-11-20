const { test } = require('node:test');
const assert = require('node:assert/strict');

// Stub the database before the socket layer loads: requireBotAccess reads
// botOperations.getById, and these tests never open SQLite.
let botLookups = 0;
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        botOperations: {
            getById: () => {
                botLookups += 1;
                return null;
            }
        }
    }
};

const { setupSocketHandlers } = require('../src/api/socket');

const objectPayloadEvents = [
    'guild:subscribe',
    'guild:unsubscribe',
    'queue:get',
    'join:music',
    'leave:music',
    'join:bot',
    'leave:bot',
    'music:play',
    'music:pause',
    'music:resume',
    'music:skip',
    'music:stop',
    'music:volume',
    'music:shuffle',
    'music:loop',
    'music:remove',
    'music:clear',
    'music:move',
    'music:jump',
    'music:leave'
];

function createBotManager() {
    const calls = { executeCommand: [], lifecycle: [], getBot: 0, getBotGuilds: 0, getQueue: 0 };

    return {
        calls,
        getAllBots: () => [],
        getBot: () => {
            calls.getBot += 1;
            return null;
        },
        getBotGuilds: () => {
            calls.getBotGuilds += 1;
            return [];
        },
        getQueue: () => {
            calls.getQueue += 1;
            return { tracks: [] };
        },
        getGlobalStats: () => ({ runningBots: 0, totalBots: 0 }),
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

function connect() {
    const botManager = createBotManager();
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
    const rooms = [];
    const socket = {
        id: 'socket-alice',
        user: { id: 1, username: 'alice', role: 'user' },
        handshake: { auth: {} },
        on(event, handler) {
            handlers.set(event, handler);
        },
        join(room) {
            rooms.push({ action: 'join', room });
        },
        leave(room) {
            rooms.push({ action: 'leave', room });
        }
    };
    connection(socket);
    rooms.length = 0;

    return { botManager, handlers, rooms };
}

async function invoke(handler) {
    let result;
    assert.doesNotThrow(() => {
        result = handler();
    }, 'a listener must not throw synchronously');
    if (result && typeof result.then === 'function') {
        await assert.doesNotReject(result, 'an async listener must not reject');
    }
}

test('every socket event tolerates a missing payload', async () => {
    const { botManager, handlers, rooms } = connect();
    assert.ok(handlers.size > 0, 'the connection must register listeners');

    for (const [event, handler] of handlers) {
        await invoke(handler).catch((error) => {
            throw new Error(`${event}: ${error.message}`);
        });
    }

    assert.equal(botManager.calls.executeCommand.length, 0, 'no command may run without a payload');
    assert.equal(botManager.calls.lifecycle.length, 0, 'no lifecycle action may run without a payload');
    assert.deepEqual(rooms, [], 'no room may be joined or left for an empty payload');
});

test('object-payload events tolerate a null payload', async () => {
    const { botManager, handlers, rooms } = connect();

    for (const event of objectPayloadEvents) {
        const handler = handlers.get(event);
        assert.equal(typeof handler, 'function', `missing handler for ${event}`);
        await invoke(() => handler(null)).catch((error) => {
            throw new Error(`${event}: ${error.message}`);
        });
    }

    assert.equal(botManager.calls.executeCommand.length, 0);
    assert.equal(botManager.calls.lifecycle.length, 0);
    assert.deepEqual(rooms, []);
});

test('guild room events without ids do not look up a bot or touch a room', async () => {
    const { handlers, rooms } = connect();
    const before = botLookups;

    await invoke(handlers.get('guild:subscribe'));
    await invoke(handlers.get('guild:unsubscribe'));

    assert.equal(botLookups, before, 'a room event without a botId must not query the database');
    assert.deepEqual(rooms, []);
});
