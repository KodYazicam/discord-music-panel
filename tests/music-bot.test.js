const { test } = require('node:test');
const assert = require('node:assert/strict');

// Replace the database module before MusicBot is loaded so these tests never
// touch SQLite, Better-SQLite3, or the on-disk database.
const dbModulePath = require.resolve('../src/database/db');
require.cache[dbModulePath] = {
    id: dbModulePath,
    filename: dbModulePath,
    loaded: true,
    exports: {
        guildOperations: {
            getSettings: () => null,
            getPresets: () => {
                if (presetStore.error) throw presetStore.error;
                return presetStore.value;
            },
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

const presetStore = { value: {}, error: null };

function createIo() {
    const emitted = [];
    const globalEmitted = [];
    return {
        emitted,
        globalEmitted,
        to(room) {
            return {
                emit(name, payload) {
                    emitted.push({ room, name, payload });
                }
            };
        },
        emit(name, payload) {
            globalEmitted.push({ name, payload });
        }
    };
}

function createConfig(overrides = {}) {
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
        activityText: 'testing',
        ...overrides
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

function createResource() {
    const volumes = [];
    return {
        volumes,
        volume: { setVolume: value => volumes.push(value) }
    };
}

function createPlayer() {
    const calls = { play: [], pause: 0, unpause: 0, stop: 0 };
    return {
        calls,
        play(resource) {
            calls.play.push(resource);
        },
        pause() {
            calls.pause++;
        },
        unpause() {
            calls.unpause++;
        },
        stop() {
            calls.stop++;
        }
    };
}

function createHarness(t, overrides = {}) {
    const io = createIo();
    const bot = new MusicBot(createConfig(overrides), null, io);
    const guildId = 'guild-1';

    t.after(() => {
        bot.client.destroy();
    });

    function attachQueue(tracks = []) {
        const queue = new MusicQueue(guildId, bot.config, bot.io, bot.logger);
        queue.tracks = [...tracks];
        bot.queues.set(guildId, queue);
        return queue;
    }

    function attachPlayer() {
        const player = createPlayer();
        bot.players.set(guildId, player);
        return player;
    }

    function attachConnection() {
        const connection = {
            subscribed: [],
            subscribe(player) {
                this.subscribed.push(player);
            },
            destroy() {}
        };
        bot.connections.set(guildId, connection);
        return connection;
    }

    function attachGuild(voiceChannelId = 'voice-1') {
        const voiceChannel = { id: voiceChannelId, name: 'Music' };
        const guild = {
            id: guildId,
            name: 'Test Guild',
            memberCount: 10,
            channels: { cache: new Map([[voiceChannelId, voiceChannel]]) }
        };
        bot.client.guilds.cache.set(guildId, guild);
        return { guild, voiceChannel };
    }

    return { bot, io, guildId, attachQueue, attachPlayer, attachConnection, attachGuild };
}

test('startPlayback moves an idle queue to playing and emits trackStart', async (t) => {
    const { bot, io, guildId, attachQueue, attachPlayer, attachConnection } = createHarness(t);
    const track = makeTrack(1);
    const queue = attachQueue([track]);
    const player = attachPlayer();
    attachConnection();

    const resource = createResource();
    queue.createResource = async () => resource;

    await bot.startPlayback(guildId);

    assert.equal(queue.isPlaying, true);
    assert.equal(queue.isPaused, false);
    assert.equal(queue.currentTrack, track);
    assert.equal(typeof queue.startTime, 'number');
    assert.deepEqual(player.calls.play, [resource]);
    assert.deepEqual(resource.volumes, [1]);

    const trackStart = io.emitted.find(event => event.name === 'music:trackStart');
    assert.ok(trackStart);
    assert.equal(trackStart.payload.track, track);
    assert.equal(trackStart.payload.position, 0);
});

test('startPlayback does nothing without a queue or voice connection', async (t) => {
    const { bot, guildId } = createHarness(t);

    await bot.startPlayback(guildId);
    assert.equal(bot.players.has(guildId), false);
});

test('handleTrackEnd advances playing -> playing for the next track', async (t) => {
    const { bot, io, guildId, attachQueue, attachPlayer, attachConnection } = createHarness(t);
    const first = makeTrack(1);
    const second = makeTrack(2);
    const queue = attachQueue([first, second]);
    const player = attachPlayer();
    attachConnection();

    const resources = [];
    queue.createResource = async track => {
        const resource = createResource();
        resources.push({ track, resource });
        return resource;
    };

    await bot.startPlayback(guildId);
    assert.equal(queue.currentTrack, first);

    bot.handleTrackEnd(guildId);
    await flush();

    assert.equal(queue.isPlaying, true);
    assert.equal(queue.currentTrack, second);
    assert.deepEqual(queue.tracks, [second]);
    assert.deepEqual(player.calls.play, [resources[0].resource, resources[1].resource]);
});

test('handleTrackEnd moves the queue to idle when the last track ends', async (t) => {
    const { bot, io, guildId, attachQueue, attachPlayer, attachConnection } = createHarness(t);
    const queue = attachQueue([makeTrack(1)]);
    attachPlayer();
    attachConnection();
    queue.createResource = async () => createResource();

    await bot.startPlayback(guildId);
    bot.handleTrackEnd(guildId);
    await flush();

    assert.equal(queue.isPlaying, false);
    assert.equal(queue.currentTrack, null);
    assert.equal(queue.currentIndex, -1);
    assert.deepEqual(queue.tracks, []);

    const ended = io.emitted.find(event => event.name === 'queue:ended');
    assert.ok(ended);
});

test('track loop replays the same track without draining the queue', async (t) => {
    const { bot, guildId, attachQueue, attachPlayer, attachConnection } = createHarness(t);
    const track = makeTrack(1);
    const queue = attachQueue([track]);
    const player = attachPlayer();
    attachConnection();
    queue.loop = true;
    queue.createResource = async () => createResource();

    await bot.startPlayback(guildId);
    bot.handleTrackEnd(guildId);
    await flush();

    assert.equal(queue.currentTrack, track);
    assert.deepEqual(queue.tracks, [track]);
    assert.equal(player.calls.play.length, 2);
    assert.equal(queue.isPlaying, true);
});

test('queue loop appends the finished track to the back of the queue', async (t) => {
    const { bot, guildId, attachQueue, attachPlayer, attachConnection } = createHarness(t);
    const first = makeTrack(1);
    const second = makeTrack(2);
    const queue = attachQueue([first, second]);
    attachPlayer();
    attachConnection();
    queue.loopQueue = true;
    queue.createResource = async () => createResource();

    await bot.startPlayback(guildId);
    bot.handleTrackEnd(guildId);
    await flush();

    assert.equal(queue.currentTrack, second);
    assert.deepEqual(queue.tracks, [second, first]);

    bot.handleTrackEnd(guildId);
    await flush();

    assert.equal(queue.currentTrack, first);
    assert.deepEqual(queue.tracks, [first, second]);
});

test('pause and resume toggle state and adjust the start time', async (t) => {
    const { bot, guildId, attachQueue, attachPlayer, attachConnection } = createHarness(t);
    const queue = attachQueue([makeTrack(1)]);
    const player = attachPlayer();
    attachConnection();
    queue.createResource = async () => createResource();

    await bot.startPlayback(guildId);
    const originalStart = queue.startTime;

    assert.deepEqual(bot.pause(guildId), { success: true, message: 'Paused' });
    assert.equal(queue.isPaused, true);
    assert.equal(player.calls.pause, 1);
    assert.equal(typeof queue.pauseTime, 'number');

    assert.deepEqual(bot.resume(guildId), { success: true, message: 'Resumed' });
    assert.equal(queue.isPaused, false);
    assert.equal(queue.pauseTime, null);
    assert.equal(player.calls.unpause, 1);
    assert.ok(queue.startTime >= originalStart);
});

test('pause and resume report failure when nothing is playing', (t) => {
    const { bot, guildId } = createHarness(t);

    assert.equal(bot.pause(guildId).success, false);
    assert.equal(bot.resume(guildId).success, false);
});

test('skip stops the player without clearing the queue', (t) => {
    const { bot, guildId, attachQueue, attachPlayer } = createHarness(t);
    const track = makeTrack(1);
    const queue = attachQueue([track]);
    const player = attachPlayer();

    assert.equal(bot.skip(guildId).success, true);
    assert.equal(player.calls.stop, 1);
    assert.deepEqual(queue.tracks, [track]);
});

test('stopPlayback stops the player, clears the queue, and emits stop', (t) => {
    const { bot, io, guildId, attachQueue, attachPlayer } = createHarness(t);
    const queue = attachQueue([makeTrack(1)]);
    const player = attachPlayer();

    assert.deepEqual(bot.stopPlayback(guildId), { success: true, message: 'Stopped' });
    assert.equal(player.calls.stop, 1);
    assert.deepEqual(queue.tracks, []);
    assert.equal(queue.isPlaying, false);

    const stopped = io.emitted.find(event => event.name === 'music:stop');
    assert.ok(stopped);
    assert.equal(stopped.payload.botId, 'bot-1');
});

test('play adds tracks to an existing queue and emits a queue update', async (t) => {
    const { bot, io, guildId, attachQueue, attachPlayer, attachConnection, attachGuild } = createHarness(t);
    const { voiceChannel } = attachGuild();
    const queue = attachQueue([]);
    attachPlayer();
    attachConnection();

    const track = makeTrack(1);
    queue.search = async query => {
        assert.equal(query, 'test query');
        return [track];
    };
    queue.createResource = async () => createResource();

    const result = await bot.play(guildId, 'test query', voiceChannel.id);

    assert.equal(result.success, true);
    assert.deepEqual(queue.tracks, [track]);
    assert.equal(queue.currentTrack, track);

    const update = io.emitted.find(event => event.name === 'music:queueUpdate' && Array.isArray(event.payload.queue?.tracks));
    assert.ok(update);
    assert.equal(update.payload.botId, 'bot-1');
    assert.equal(update.payload.guildId, guildId);
    assert.deepEqual(update.payload.queue.tracks, [track]);
});

test('play reports a missing guild and a missing voice channel', async (t) => {
    const { bot, guildId, attachGuild } = createHarness(t);

    assert.equal((await bot.play('missing-guild', 'query', 'voice-1')).message, 'Guild not found');

    attachGuild();

    assert.equal((await bot.play(guildId, 'query', 'missing-voice')).message, 'Voice channel not found');
});

test('play returns a failure result when the search throws', async (t) => {
    const { bot, guildId, attachQueue, attachGuild } = createHarness(t);
    const { voiceChannel } = attachGuild();
    const queue = attachQueue([]);
    queue.search = async () => {
        throw new Error('search exploded');
    };

    const result = await bot.play(guildId, 'query', voiceChannel.id);

    assert.equal(result.success, false);
    assert.equal(result.message, 'search exploded');
});

test('executeCommand routes known commands and rejects unknown ones', async (t) => {
    const { bot, guildId, attachQueue, attachPlayer, attachGuild } = createHarness(t);
    attachGuild();
    attachQueue([makeTrack(1)]);
    attachPlayer();

    const volume = await bot.executeCommand(guildId, 'volume', { volume: 40 });
    assert.equal(volume.success, true);

    const unknown = await bot.executeCommand(guildId, 'nope', {});
    assert.equal(unknown.success, false);
    assert.equal(unknown.message, 'Unknown command');
});

test('getQueue returns a detached snapshot of playback state', (t) => {
    const { bot, guildId, attachQueue } = createHarness(t);
    const track = makeTrack(1);
    const queue = attachQueue([track]);
    queue.currentTrack = track;
    queue.currentIndex = 0;
    queue.isPlaying = true;
    queue.volume = 75;

    const snapshot = bot.getQueue(guildId);

    assert.deepEqual(snapshot.tracks, [track]);
    assert.equal(snapshot.currentTrack, track);
    assert.equal(snapshot.isPlaying, true);
    assert.equal(snapshot.volume, 75);
    assert.equal(bot.getQueue('missing-guild'), null);
});

test('leaveVoice destroys the connection and clears queue state', (t) => {
    const { bot, io, guildId, attachQueue, attachConnection } = createHarness(t);
    const queue = attachQueue([makeTrack(1)]);
    attachConnection();
    let destroyed = false;
    bot.connections.get(guildId).destroy = () => {
        destroyed = true;
    };

    assert.equal(bot.leaveVoice(guildId).success, true);
    assert.equal(destroyed, true);
    assert.equal(bot.connections.has(guildId), false);
    assert.equal(bot.queues.has(guildId), false);
    assert.deepEqual(queue.tracks, []);
    assert.ok(io.emitted.find(event => event.name === 'queue:cleared'));
});

test('applyPresetsToQueue applies allowlisted fields to a queue', (t) => {
    const { bot, guildId, attachQueue } = createHarness(t);
    const queue = attachQueue([makeTrack(1)]);

    bot.applyPresetsToQueue(queue, {
        volume: 65,
        maxQueueSize: 3,
        defaultLoopMode: 'queue',
        announceSongs: false,
        stayInChannel: true,
        ignored: 'value'
    });

    assert.equal(queue.volume, 65);
    assert.equal(queue.maxQueueSize, 3);
    assert.equal(queue.loop, false);
    assert.equal(queue.loopQueue, true);
    assert.equal(queue.announceSongs, false);
    assert.equal(queue.stayInChannel, true);
    assert.equal('ignored' in queue, false);
});

test('applyPresetsToQueue switches between track and queue loop modes', (t) => {
    const { bot, guildId, attachQueue } = createHarness(t);
    const queue = attachQueue([]);

    bot.applyPresetsToQueue(queue, { defaultLoopMode: 'track' });
    assert.equal(queue.loop, true);
    assert.equal(queue.loopQueue, false);

    bot.applyPresetsToQueue(queue, { defaultLoopMode: 'off' });
    assert.equal(queue.loop, false);
    assert.equal(queue.loopQueue, false);
});

function stubQueueIo(t, tracks) {
    const originalSearch = MusicQueue.prototype.search;
    const originalCreateResource = MusicQueue.prototype.createResource;

    MusicQueue.prototype.search = async () => tracks;
    MusicQueue.prototype.createResource = async () => createResource();

    t.after(() => {
        MusicQueue.prototype.search = originalSearch;
        MusicQueue.prototype.createResource = originalCreateResource;
    });
}

test('play applies saved guild presets to a newly created queue', async (t) => {
    presetStore.value = {
        volume: 40,
        maxQueueSize: 3,
        defaultLoopMode: 'queue',
        announceSongs: false,
        stayInChannel: true
    };
    t.after(() => {
        presetStore.value = {};
    });

    const { bot, guildId, attachPlayer, attachConnection, attachGuild } = createHarness(t);
    const { voiceChannel } = attachGuild();
    attachPlayer();
    attachConnection();
    stubQueueIo(t, [makeTrack(1)]);

    const result = await bot.play(guildId, 'query', voiceChannel.id);

    assert.equal(result.success, true);
    const queue = bot.queues.get(guildId);
    assert.equal(queue.volume, 40);
    assert.equal(queue.maxQueueSize, 3);
    assert.equal(queue.loopQueue, true);
    assert.equal(queue.announceSongs, false);
    assert.equal(queue.stayInChannel, true);
});

test('play keeps bot defaults when preset loading fails', async (t) => {
    presetStore.error = new Error('database offline');
    t.after(() => {
        presetStore.error = null;
    });

    const { bot, guildId, attachPlayer, attachConnection, attachGuild } = createHarness(t);
    const { voiceChannel } = attachGuild();
    attachPlayer();
    attachConnection();
    stubQueueIo(t, [makeTrack(1)]);

    const result = await bot.play(guildId, 'query', voiceChannel.id);

    assert.equal(result.success, true);
    const queue = bot.queues.get(guildId);
    assert.equal(queue.volume, 100);
    assert.equal(queue.maxQueueSize, 10);
});
