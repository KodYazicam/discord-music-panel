const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { MusicQueue } = require('../src/bot/MusicQueue');

function createIo() {
    const emitted = [];
    return {
        emitted,
        to(room) {
            return {
                emit(name, payload) {
                    emitted.push({ room, name, payload });
                }
            };
        }
    };
}

function createLogger() {
    return {
        errors: [],
        error(...args) {
            this.errors.push(args);
        }
    };
}

function makeTrack(id, overrides = {}) {
    return {
        title: `Track ${id}`,
        url: `https://example.test/${id}`,
        duration: 60,
        durationFormatted: '1:00',
        author: 'Test Artist',
        source: 'youtube',
        ...overrides
    };
}

function makeQueue(overrides = {}) {
    const io = createIo();
    const logger = createLogger();
    const queue = new MusicQueue('guild-1', {
        id: 'bot-1',
        volume: 100,
        maxQueueSize: 5,
        ...overrides
    }, io, logger);

    return { queue, io, logger };
}

test('addTrack appends a track and emits add/update events', () => {
    const { queue, io } = makeQueue();
    const track = makeTrack(1);

    queue.addTrack(track);

    assert.deepEqual(queue.tracks, [track]);
    assert.equal(io.emitted.length, 2);

    const added = io.emitted.find(event => event.name === 'queue:trackAdded');
    const updated = io.emitted.find(event => event.name === 'music:queueUpdate');

    assert.equal(added.room, 'guild:bot-1:guild-1');
    assert.deepEqual(added.payload, {
        botId: 'bot-1',
        guildId: 'guild-1',
        track,
        position: 0
    });
    assert.deepEqual(updated.payload, added.payload);
});

test('addTrack inserts at an explicit position', () => {
    const { queue } = makeQueue();
    const first = makeTrack(1);
    const second = makeTrack(2);
    const inserted = makeTrack(3);

    queue.addTrack(first);
    queue.addTrack(second);
    queue.addTrack(inserted, 0);

    assert.deepEqual(queue.tracks, [inserted, first, second]);
});

test('addTrack rejects a full queue without mutating it', () => {
    const { queue } = makeQueue({ maxQueueSize: 2 });
    queue.addTrack(makeTrack(1));
    queue.addTrack(makeTrack(2));

    assert.throws(() => queue.addTrack(makeTrack(3)), /Queue is full \(max 2 tracks\)/);
    assert.equal(queue.tracks.length, 2);
});

test('removeTrack removes and returns the track at the index', () => {
    const { queue } = makeQueue();
    const first = makeTrack(1);
    const second = makeTrack(2);
    queue.addTrack(first);
    queue.addTrack(second);

    assert.equal(queue.removeTrack(0), first);
    assert.deepEqual(queue.tracks, [second]);
});

test('removeTrack ignores out-of-range indices', () => {
    const { queue } = makeQueue();
    const track = makeTrack(1);
    queue.addTrack(track);

    assert.equal(queue.removeTrack(-1), null);
    assert.equal(queue.removeTrack(1), null);
    assert.deepEqual(queue.tracks, [track]);
});

test('removeTrack shifts currentIndex down when an earlier track is removed', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1), makeTrack(2), makeTrack(3)];
    queue.currentIndex = 2;
    queue.currentTrack = queue.tracks[2];

    queue.removeTrack(0);

    assert.equal(queue.currentIndex, 1);
    assert.equal(queue.currentTrack.title, 'Track 3');
});

test('nextTrack advances and drops the finished track', () => {
    const { queue } = makeQueue();
    const first = makeTrack(1);
    const second = makeTrack(2);
    queue.tracks = [first, second];

    assert.equal(queue.nextTrack(), second);
    assert.deepEqual(queue.tracks, [second]);
    assert.equal(queue.currentIndex, 0);

    assert.equal(queue.nextTrack(), null);
    assert.deepEqual(queue.tracks, []);
    assert.equal(queue.currentTrack, null);
    assert.equal(queue.currentIndex, -1);
});

test('nextTrack keeps the current track when track loop is enabled', () => {
    const { queue } = makeQueue();
    const track = makeTrack(1);
    queue.tracks = [track];
    queue.loop = true;

    assert.equal(queue.nextTrack(), track);
    assert.deepEqual(queue.tracks, [track]);
    assert.equal(queue.currentIndex, 0);
});

test('getCurrentTrack lazily selects the first track', () => {
    const { queue } = makeQueue();
    const track = makeTrack(1);
    queue.tracks = [track];

    assert.equal(queue.currentIndex, -1);
    assert.equal(queue.getCurrentTrack(), track);
    assert.equal(queue.currentIndex, 0);
    assert.equal(queue.currentTrack, track);
});

test('getCurrentTrack returns null for an empty queue', () => {
    const { queue } = makeQueue();

    assert.equal(queue.getCurrentTrack(), null);
    assert.equal(queue.currentIndex, -1);
});

test('jumpTo drops everything before the target track', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1), makeTrack(2), makeTrack(3)];

    assert.equal(queue.jumpTo(2), true);
    assert.equal(queue.currentTrack.title, 'Track 3');
    assert.deepEqual(queue.tracks.map(track => track.title), ['Track 3']);
    assert.equal(queue.jumpTo(5), false);
});

test('moveTrack reorders valid indices and rejects invalid ones', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1), makeTrack(2), makeTrack(3)];

    assert.equal(queue.moveTrack(0, 2), true);
    assert.deepEqual(queue.tracks.map(track => track.title), ['Track 2', 'Track 3', 'Track 1']);

    assert.equal(queue.moveTrack(-1, 0), false);
    assert.equal(queue.moveTrack(0, 9), false);
});

test('shuffle keeps every track exactly once', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1), makeTrack(2), makeTrack(3), makeTrack(4)];

    const random = mock.method(Math, 'random', () => 0);
    try {
        queue.shuffle();
    } finally {
        random.mock.restore();
    }

    assert.deepEqual(queue.tracks.map(track => track.title), ['Track 2', 'Track 3', 'Track 4', 'Track 1']);
});

test('clear resets queue and playback state', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1)];
    queue.currentTrack = queue.tracks[0];
    queue.currentIndex = 0;
    queue.isPlaying = true;
    queue.isPaused = true;
    queue.startTime = Date.now();
    queue.pauseTime = Date.now();

    queue.clear();

    assert.deepEqual(queue.tracks, []);
    assert.equal(queue.currentTrack, null);
    assert.equal(queue.currentIndex, -1);
    assert.equal(queue.isPlaying, false);
    assert.equal(queue.isPaused, false);
    assert.equal(queue.startTime, null);
    assert.equal(queue.pauseTime, null);
});

test('setVolume clamps to 0..200 and updates the live resource', () => {
    const { queue } = makeQueue();
    const applied = [];
    queue.currentResource = { volume: { setVolume: value => applied.push(value) } };

    queue.setVolume(250);
    assert.equal(queue.volume, 200);
    assert.deepEqual(applied, [2]);

    queue.setVolume(-10);
    assert.equal(queue.volume, 0);
    assert.deepEqual(applied, [2, 0]);
});

test('durations are formatted and summed', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1, { duration: 65 }), makeTrack(2, { duration: 3600 })];

    assert.equal(queue.formatDuration(65), '1:05');
    assert.equal(queue.formatDuration(3661), '1:01:01');
    assert.equal(queue.getTotalDuration(), 3665);
});

test('createNowPlayingEmbed renders track details', () => {
    const { queue } = makeQueue();
    queue.tracks = [makeTrack(1), makeTrack(2)];

    const embed = queue.createNowPlayingEmbed(makeTrack(1)).toJSON();

    assert.equal(embed.title, '🎵 Now Playing');
    assert.match(embed.description, /Track 1/);
    assert.equal(embed.footer.text, '1 tracks in queue');
});

test('createQueueEmbed reports loop mode and volume', () => {
    const { queue } = makeQueue({ volume: 80 });
    queue.tracks = [makeTrack(1)];
    queue.currentTrack = queue.tracks[0];
    queue.currentIndex = 0;
    queue.loopQueue = true;

    const embed = queue.createQueueEmbed().toJSON();
    const fields = Object.fromEntries(embed.fields.map(field => [field.name, field.value]));

    assert.equal(fields['Loop'], '🔁 Looping Queue');
    assert.equal(fields['Volume'], '80%');
});
