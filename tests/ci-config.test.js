const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

test('Dependabot watches both npm lockfiles and groups frontend updates', () => {
    const config = read('.github/dependabot.yml');

    assert.match(config, /package-ecosystem: npm\n\s+directory: "\/"/);
    assert.match(config, /package-ecosystem: npm\n\s+directory: "\/frontend"/);
    assert.match(config, /directory: "\/frontend"[\s\S]*?interval: weekly/);
    assert.match(config, /directory: "\/frontend"[\s\S]*?prefix: "deps\(frontend\)"/);
});

test('both backend and frontend lockfiles are committed', () => {
    assert.equal(fs.existsSync(path.join(root, 'package-lock.json')), true);
    assert.equal(fs.existsSync(path.join(root, 'frontend/package-lock.json')), true);
});
