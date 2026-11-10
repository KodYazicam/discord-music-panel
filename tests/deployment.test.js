const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function read(file) {
    return fs.readFileSync(path.join(root, file), 'utf8');
}

function serviceBlock(compose, name) {
    const lines = compose.split('\n');
    const start = lines.findIndex(line => line === `  ${name}:`);
    assert.notEqual(start, -1, `compose service "${name}" is missing`);

    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
        if (/^  [A-Za-z0-9_.-]+:$/.test(lines[i]) || /^[A-Za-z]/.test(lines[i])) {
            end = i;
            break;
        }
    }

    return lines.slice(start, end).join('\n');
}

test('compose defines a panel service bound to localhost', () => {
    const compose = read('docker-compose.yml');
    const panel = serviceBlock(compose, 'panel');

    assert.match(panel, /- "127\.0\.0\.1:4000:4000"/);
    assert.match(panel, /NODE_ENV: production/);
    assert.match(panel, /DATABASE_PATH: \/app\/data\/database\.sqlite/);
    assert.match(panel, /- panel-data:\/app\/data/);
    assert.match(panel, /- panel-logs:\/app\/logs/);
});

test('compose exposes one optional bot behind the bot profile', () => {
    const compose = read('docker-compose.yml');
    const bot = serviceBlock(compose, 'bot');

    assert.match(bot, /profiles:\n\s+- bot/);
    assert.match(bot, /command: \["node", "src\/bot\/standalone\.js"\]/);
    assert.match(bot, /- bot-data:\/app\/data/);
    assert.match(bot, /- bot-logs:\/app\/logs/);
    assert.match(bot, /DATABASE_PATH: \/app\/data\/bot\.sqlite/);
    assert.match(bot, /BOT_NAME: \$\{BOT_NAME:-DockerMusicBot\}/);
    assert.match(bot, /PREFIX: \$\{BOT_PREFIX:-!\}/);
});

test('panel and bot never share a data or log volume', () => {
    const compose = read('docker-compose.yml');
    const panel = serviceBlock(compose, 'panel');
    const bot = serviceBlock(compose, 'bot');

    const panelVolumes = [...panel.matchAll(/- ([\w-]+):\/app\/(data|logs)/g)].map(match => match[1]);
    const botVolumes = [...bot.matchAll(/- ([\w-]+):\/app\/(data|logs)/g)].map(match => match[1]);

    assert.deepEqual(panelVolumes, ['panel-data', 'panel-logs']);
    assert.deepEqual(botVolumes, ['bot-data', 'bot-logs']);
    assert.equal(panelVolumes.some(name => botVolumes.includes(name)), false);
});

test('image prepares writable data and log directories for the non-root user', () => {
    const dockerfile = read('Dockerfile');

    assert.match(dockerfile, /useradd --create-home --uid 10001 panel/);
    assert.match(dockerfile, /mkdir -p \/app\/data \/app\/logs/);
    assert.match(dockerfile, /chown -R 10001:10001 \/app\/data \/app\/logs/);
    assert.match(dockerfile, /USER 10001/);

    const chownIndex = dockerfile.indexOf('chown -R 10001:10001');
    const userIndex = dockerfile.indexOf('USER 10001');
    assert.ok(chownIndex !== -1 && chownIndex < userIndex, 'chown must run before dropping to UID 10001');
});

test('env example documents the bot profile without committing a token', () => {
    const envExample = read('.env.example');
    const gitignore = read('.gitignore');

    assert.match(envExample, /^DISCORD_TOKEN=$/m);
    assert.match(envExample, /^BOT_NAME=DockerMusicBot$/m);
    assert.match(envExample, /^BOT_PREFIX=!$/m);
    assert.match(gitignore, /^\.env$/m);
    assert.doesNotMatch(envExample, /^DISCORD_TOKEN=\S+/m);
});

test('README documents both compose commands', () => {
    const readme = read('README.md');

    assert.match(readme, /docker compose up --build/);
    assert.match(readme, /docker compose --profile bot up --build/);
    assert.match(readme, /DISCORD_TOKEN/);
    assert.match(readme, /bot-data/);
});
