import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The statistics page used to render invented sample numbers; both pages must
// keep reading the real overview endpoints.
const read = (file) => fs.readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8');

test('the panel reads the overview endpoints instead of sample data', () => {
    const statistics = read('pages/Statistics.jsx');
    assert.match(statistics, /\/stats\/overview/);
    assert.match(statistics, /overview\?\.daily/);
    assert.doesNotMatch(statistics, /2547|2,547|Blinding Lights|156h 32m|trends:\s*\{/);
    assert.doesNotMatch(statistics, /Normally statistics data would be fetched/);

    const dashboard = read('pages/Dashboard.jsx');
    assert.match(dashboard, /\/stats\/overview/);
    assert.match(dashboard, /\/stats\/recent-activity/);
});
