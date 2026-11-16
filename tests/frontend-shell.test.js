const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

test('frontend shell declares the language the dashboard actually renders', () => {
    const html = read('frontend/index.html');
    const lang = html.match(/<html[^>]*\blang="([^"]+)"/)?.[1];

    assert.equal(
        lang,
        'en',
        'frontend/index.html must declare lang="en" because every dashboard string is English'
    );
});

test('frontend meta description is written in the declared language', () => {
    const html = read('frontend/index.html');
    const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/)?.[1];

    assert.ok(description, 'frontend/index.html must keep a meta description');
    assert.match(description, /Discord music bot management panel/i);
    assert.doesNotMatch(
        description,
        /Müzik|Yönetim|Birden fazla/,
        'the meta description must not be Turkish when the UI and lang attribute are English'
    );
});

test('README documents the dashboard language and the localization scope', () => {
    const readme = read('README.md');

    assert.match(readme, /### Localization/);
    assert.match(readme, /English/);
    assert.match(readme, /frontend\/index\.html/);
});
