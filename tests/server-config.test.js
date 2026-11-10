const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8');

test('production SPA fallback uses an Express 5 named wildcard', () => {
    assert.doesNotMatch(source, /app\.get\(\s*['"]\*['"]/);
    assert.match(source, /app\.get\('\/\{\*splat\}', staticLimiter/);
});

test('SPA fallback skips API and Socket.IO paths', () => {
    assert.match(source, /req\.path\.startsWith\('\/api'\)/);
    assert.match(source, /req\.path\.startsWith\('\/socket\.io'\)/);
    assert.match(source, /sendFile\(path\.join\(__dirname, '\.\.\/frontend\/dist\/index\.html'\)\)/);
});

test('production SPA fallback is only registered for production builds', () => {
    const fallbackIndex = source.indexOf("app.get('/{*splat}'");
    const productionCheck = source.lastIndexOf("process.env.NODE_ENV === 'production'", fallbackIndex);

    assert.notEqual(fallbackIndex, -1);
    assert.ok(productionCheck !== -1 && productionCheck < fallbackIndex);
});
