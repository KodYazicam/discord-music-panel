const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function jobBlock(workflow, name) {
    const lines = workflow.split('\n');
    const start = lines.findIndex(line => line === `  ${name}:`);
    assert.notEqual(start, -1, `CI job "${name}" is missing`);

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^  [A-Za-z0-9_.-]+:$/.test(lines[i]) || /^[A-Za-z]/.test(lines[i])) {
            end = i;
            break;
        }
    }

    return lines.slice(start, end).join('\n');
}

test('CI builds the frontend with its own lockfile cache key', () => {
    const workflow = read('.github/workflows/ci.yml');
    const frontend = jobBlock(workflow, 'frontend');

    assert.match(frontend, /working-directory: frontend/);
    assert.match(frontend, /cache-dependency-path: frontend\/package-lock\.json/);
    assert.match(frontend, /- run: npm ci\b/);
    assert.match(frontend, /- run: npm run build\b/);
});

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
