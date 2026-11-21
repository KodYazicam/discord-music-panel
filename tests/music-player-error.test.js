const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

// CI installs with `npm ci --ignore-scripts`, so the native Opus addon is not
// built and a real AudioPlayer cannot create a resource. Stub @discordjs/voice
// with a minimal player so the listener contract runs without audio I/O.
const voicePath = require.resolve('@discordjs/voice');

class FakePlayer extends EventEmitter {
    constructor() {
        super();
        this.state = { status: 'idle' };
    }

    play(resource) {
        this.resource = resource;
        this.state = { status: 'playing' };
    }

    pause() {
        this.state = { status: 'paused' };
    }

    unpause() {
        this.state = { status: 'playing' };
    }

    stop() {
        this.state = { status: 'idle' };
    }
}

const createdPlayers = [];

require.cache[voicePath] = {
    id: voicePath,
    filename: voicePath,
    loaded: true,
    exports: {
        joinVoiceChannel: () => ({}),
        createAudioPlayer: () => {
            const player = new FakePlayer();
            createdPlayers.push(player);
            return player;
        },
        createAudioResource: () => ({ volume: { setVolume: () => {} } }),
        AudioPlayerStatus: { Idle: 'idle', Playing: 'playing', Paused: 'paused' },
        VoiceConnectionStatus: { Ready: 'ready', Disconnected: 'disconnected' },
        entersState: async () => {},
        getVoiceConnection: () => undefined
    }
};

// Replace the database module before MusicBot is loaded so the test never
// touches SQLite or the on-disk database.
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        guildOperations: {
            getSettings: () => null,
            getPresets: () => ({}),
            upsert: () => {},
            remove: () => {}
        },
        statisticsOperations: { increment: () => {} },
        logOperations: { add: () => {} }
    }
};

const { MusicBot } = require('../src/bot/MusicBot');
const { MusicQueue } = require('../src/bot/MusicQueue');

const flush = () => new Promise(resolve => setImmediate(resolve));

function createConfig() {
    return {
        id: 'bot-1',
        name: 'Test Bot',
        prefix: '!',
        prefixType: 'both',
        volume: 100,
        maxQueueSize: 10,
        announceSongs: false,
        stayInChannel: true,
        activityType: 'LISTENING',
        activityText: 'testing'
    };
}

function makeTrack(id) {
    return {
        title: `Track ${id}`,
        url: `https://example.test/${id}`,
        duration: 60,
        durationFormatted: '1:00',
        author: 'Test Artist',
        source: 'youtube'
    };
}

test('a player error followed by idle advances the queue only once', async (t) => {
    createdPlayers.length = 0;
    const emitted = [];
    const io = {
        to(room) {
            return { emit(name, payload) { emitted.push({ room, name, payload }); } };
        },
        emit(name, payload) {
            emitted.push({ room: null, name, payload });
        }
    };
    const bot = new MusicBot(createConfig(), null, io);
    const guildId = 'guild-1';

    t.after(() => bot.client.destroy());

    const queue = new MusicQueue(guildId, bot.config, bot.io, bot.logger);
    const first = makeTrack(1);
    const second = makeTrack(2);
    const third = makeTrack(3);
    queue.tracks = [first, second, third];
    queue.createResource = async () => ({ volume: { setVolume: () => {} } });
    bot.queues.set(guildId, queue);
    bot.connections.set(guildId, { subscribe: () => {}, destroy: () => {} });

    await bot.startPlayback(guildId);
    assert.equal(queue.currentTrack, first);
    assert.equal(createdPlayers.length, 1);

    // Count resumptions so a double advance cannot hide behind async timing.
    let resumes = 0;
    const resume = bot.startPlayback.bind(bot);
    bot.startPlayback = (...args) => {
        resumes++;
        return resume(...args);
    };

    // @discordjs/voice emits 'error' and then transitions the player to Idle
    // for the same failed resource.
    const player = createdPlayers[0];
    player.emit('error', new Error('simulated stream failure'));
    player.emit('idle');
    await flush();

    assert.equal(resumes, 1, 'one failed track must advance exactly once');
    assert.equal(queue.currentTrack, second);
    assert.deepEqual(queue.tracks, [second, third]);
    assert.equal(emitted.some(event => event.name === 'queue:ended'), false);

    player.removeAllListeners();
});
