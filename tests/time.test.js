const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseTimeToSeconds, formatTime } = require('../src/utils/time');

test('parses plain seconds', () => {
    assert.equal(parseTimeToSeconds('90'), 90);
    assert.equal(parseTimeToSeconds('0'), 0);
    assert.equal(parseTimeToSeconds('  45  '), 45);
});

test('parses m:ss and h:mm:ss', () => {
    assert.equal(parseTimeToSeconds('1:30'), 90);
    assert.equal(parseTimeToSeconds('01:30'), 90);
    assert.equal(parseTimeToSeconds('1:30:15'), 5415);
    assert.equal(parseTimeToSeconds('10:00'), 600);
});

test('rejects invalid or negative input', () => {
    assert.equal(parseTimeToSeconds('abc'), null);
    assert.equal(parseTimeToSeconds(''), null);
    assert.equal(parseTimeToSeconds('   '), null);
    assert.equal(parseTimeToSeconds('-30'), null);
    assert.equal(parseTimeToSeconds('1:2:3:4'), null);
    assert.equal(parseTimeToSeconds('1:99'), 159); // minutes/seconds are still digits: 1*60+99
    assert.equal(parseTimeToSeconds(null), null);
    assert.equal(parseTimeToSeconds(undefined), null);
});

test('formats seconds like the queue display', () => {
    assert.equal(formatTime(0), '0:00');
    assert.equal(formatTime(65), '1:05');
    assert.equal(formatTime(600), '10:00');
    assert.equal(formatTime(5415), '1:30:15');
    assert.equal(formatTime(-5), '0:00');
});
