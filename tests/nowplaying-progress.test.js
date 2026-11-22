const { test } = require('node:test');
const assert = require('node:assert/strict');

const command = require('../src/bot/commands/text/nowplaying');

function makeQueue(position, duration) {
    return {
        currentTrack: {
            title: 'Test Track',
            url: 'https://example.test/track',
            author: 'Test Artist',
            duration,
            durationFormatted: '1:00',
            source: 'youtube',
            thumbnail: null
        },
        getPosition: () => position,
        isPaused: false,
        loop: false,
        loopQueue: false,
        volume: 100
    };
}

async function render(position, duration) {
    let reply;
    const bot = {
        queues: new Map([['guild-1', makeQueue(position, duration)]])
    };
    const message = {
        guild: { id: 'guild-1' },
        reply: async (payload) => {
            reply = payload;
            return payload;
        }
    };

    await command.execute(message, [], bot);
    return reply.embeds[0].toJSON();
}

function progressField(embed) {
    const field = embed.fields.find((entry) => entry.name === 'Progress');
    assert.ok(field, 'the now-playing embed has a Progress field');
    const match = /^`([^`]+)` (.+) `([^`]+)`$/.exec(field.value);
    assert.ok(match, `unexpected progress field: ${field.value}`);
    return { elapsed: match[1], bar: match[2], duration: match[3] };
}

test('nowplaying renders the bar when the position reaches the track duration', async () => {
    const embed = await render(60, 60);
    const { elapsed, bar, duration } = progressField(embed);

    assert.equal((bar.match(/🔘/g) || []).length, 1);
    assert.equal((bar.match(/▬/g) || []).length, 19);
    assert.equal(elapsed, '1:00');
    assert.equal(duration, '1:00');
});

test('nowplaying clamps a position past the track duration instead of throwing', async () => {
    const embed = await render(61, 60);
    const { elapsed, bar, duration } = progressField(embed);

    assert.equal((bar.match(/🔘/g) || []).length, 1);
    assert.equal((bar.match(/▬/g) || []).length, 19);
    assert.equal(elapsed, '1:00');
    assert.equal(duration, '1:00');
});

test('nowplaying keeps the normal bar shape before the track ends', async () => {
    const embed = await render(30, 60);
    const { elapsed, bar, duration } = progressField(embed);

    assert.equal((bar.match(/▬/g) || []).length, 19);
    assert.equal(bar.indexOf('🔘'), 10);
    assert.equal(elapsed, '0:30');
    assert.equal(duration, '1:00');
});

test('nowplaying renders a full bar for a track with no known duration', async () => {
    const embed = await render(0, 0);
    const { elapsed, bar, duration } = progressField(embed);

    assert.equal((bar.match(/▬/g) || []).length, 19);
    assert.equal(bar.indexOf('🔘'), 0);
    assert.equal(elapsed, '0:00');
    assert.equal(duration, '0:00');
});
