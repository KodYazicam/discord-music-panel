import test from 'node:test';
import assert from 'node:assert/strict';

// The Axios instance and the auth store touch browser globals at module scope.
globalThis.window = { location: { href: '/', pathname: '/' } };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const { default: api } = await import('../src/utils/api.js');
const { useMusicStore, selectQueue, EMPTY_QUEUE } = await import('../src/stores/musicStore.js');

let calls = [];

function respond(data) {
    api.defaults.adapter = async (config) => {
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        calls.push({ url: config.url, method: config.method, data: body });
        return { data, status: 200, statusText: 'OK', headers: {}, config };
    };
}

function reset(queues = {}) {
    calls = [];
    useMusicStore.setState({ queues, isLoading: false, error: null });
}

test.afterEach(() => {
    calls = [];
    api.defaults.adapter = undefined;
});
test('fetchQueue reads the bot guild endpoint and normalises loop state', async () => {
    reset();
    respond({
        success: true,
        queue: { tracks: [{ title: 'A' }, { title: 'B' }], currentTrack: { title: 'A' }, isPlaying: true, volume: 80, loop: false, loopQueue: true, position: 12 },
    });

    await useMusicStore.getState().fetchQueue('bot-1', 'guild-1');

    assert.deepEqual(calls, [{ url: '/bots/bot-1/guilds/guild-1/queue', method: 'get', data: undefined }]);
    const queue = selectQueue(useMusicStore.getState(), 'bot-1', 'guild-1');
    assert.equal(queue.tracks.length, 2);
    assert.equal(queue.currentTrack.title, 'A');
    assert.equal(queue.loopMode, 'queue');
    assert.equal(queue.position, 12);
});
test('every control posts the matching command to the bot guild endpoint', async () => {
    const cases = [
        ['pause', [], 'pause', {}],
        ['resume', [], 'resume', {}],
        ['skip', [], 'skip', {}],
        ['stop', [], 'stop', {}],
        ['setVolume', [55], 'volume', { volume: 55 }],
        ['setLoop', ['track'], 'loop', { mode: 'track' }],
        ['shuffleQueue', [], 'shuffle', {}],
        ['removeFromQueue', [2], 'remove', { index: 2 }],
        ['clearQueue', [], 'clear', {}],
        ['addToQueue', ['a query'], 'play', { query: 'a query' }],
    ];

    for (const [name, values, command, args] of cases) {
        reset();
        respond({ success: true });
        const result = await useMusicStore.getState()[name]('bot-1', 'guild-1', ...values);
        assert.equal(result.success, true);
        assert.deepEqual(calls, [{ url: '/bots/bot-1/guilds/guild-1/command', method: 'post', data: { command, args } }]);
    }
});

test('toggleLoop cycles off to track to queue and back', async () => {
    reset({ 'bot-1-guild-1': { ...EMPTY_QUEUE, tracks: [{ title: 'A' }, { title: 'B' }], loopMode: 'off' } });
    respond({ success: true });

    for (const mode of ['track', 'queue', 'off']) {
        await useMusicStore.getState().toggleLoop('bot-1', 'guild-1');
        assert.equal(calls.at(-1).data.args.mode, mode);
        assert.equal(selectQueue(useMusicStore.getState(), 'bot-1', 'guild-1').loopMode, mode);
    }
});

test('socket queue payloads normalise and unknown guilds get an empty queue', () => {
    reset();
    useMusicStore.getState().updateQueue('bot-1', 'guild-1', {
        tracks: [{ title: 'A' }], currentTrack: { title: 'A' }, isPlaying: true, volume: 70, loop: true, loopQueue: false,
    });

    assert.equal(selectQueue(useMusicStore.getState(), 'bot-1', 'guild-1').loopMode, 'track');
    assert.deepEqual(selectQueue(useMusicStore.getState(), 'bot-1', 'guild-9'), EMPTY_QUEUE);
});
