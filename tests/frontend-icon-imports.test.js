const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const frontendSrc = path.join(root, 'frontend', 'src');

// Brand marks were dropped from lucide-react 1.x. Importing them again turns the
// frontend job into a Rollup stack trace, so keep the import out of the source.
const REMOVED_BRAND_ICONS = ['Github', 'Instagram', 'Twitter', 'Facebook', 'Youtube', 'Linkedin'];

function read(relativePath) {
    return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(dir) {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.jsx?$/.test(entry.name) ? [full] : [];
    });
}

function lucideImportsIn(source) {
    const names = [];
    const pattern = /import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g;
    let match;
    while ((match = pattern.exec(source))) {
        for (const raw of match[1].split(',')) {
            const name = raw.trim().split(/\s+as\s+/)[0].trim();
            if (name) names.push(name);
        }
    }
    return names;
}

test('no frontend file imports a brand icon that lucide-react 1.x removed', () => {
    const offenders = [];
    for (const file of walk(frontendSrc)) {
        const names = lucideImportsIn(fs.readFileSync(file, 'utf8'));
        for (const name of names) {
            if (REMOVED_BRAND_ICONS.includes(name)) {
                offenders.push(`${path.relative(root, file)}: ${name}`);
            }
        }
    }

    assert.deepEqual(
        offenders,
        [],
        `brand icons must come from components/BrandIcons.jsx, not lucide-react: ${offenders.join(', ')}`
    );
});

test('the local BrandIcons module still provides the footer and auth marks', () => {
    const source = read('frontend/src/components/BrandIcons.jsx');

    assert.doesNotMatch(source, /from\s+['"]lucide-react['"]/, 'BrandIcons must not depend on lucide');
    assert.match(source, /export function GithubIcon\b/);
    assert.match(source, /export function InstagramIcon\b/);
    assert.match(source, /stroke:\s*'currentColor'/);
    assert.match(source, /viewBox:\s*'0 0 24 24'/);
    assert.match(source, /'aria-hidden':\s*'true'/);
});

test('both layouts render the brand links through BrandIcons', () => {
    for (const layout of ['DashboardLayout', 'AuthLayout']) {
        const source = read(`frontend/src/layouts/${layout}.jsx`);
        const names = lucideImportsIn(source);

        assert.ok(!names.includes('Github'), `${layout} still imports Github from lucide-react`);
        assert.ok(!names.includes('Instagram'), `${layout} still imports Instagram from lucide-react`);
        assert.match(source, /import\s*\{[^}]*GithubIcon[^}]*\}\s*from\s*['"]\.\.\/components\/BrandIcons['"]/);
        assert.match(source, /import\s*\{[^}]*InstagramIcon[^}]*\}\s*from\s*['"]\.\.\/components\/BrandIcons['"]/);
        assert.match(source, /<GithubIcon\b/);
        assert.match(source, /<InstagramIcon\b/);
    }
});

test('CI resolves lucide icons before building the frontend', () => {
    const workflow = read('.github/workflows/ci.yml');
    const manifest = JSON.parse(read('frontend/package.json'));

    assert.equal(
        typeof manifest.scripts['icons:check'],
        'string',
        'frontend/package.json needs an icons:check script'
    );
    assert.ok(
        fs.existsSync(path.join(root, 'frontend', 'scripts', 'check-icon-imports.mjs')),
        'frontend/scripts/check-icon-imports.mjs is missing'
    );

    const lines = workflow.split('\n');
    const start = lines.findIndex((line) => line === '  frontend:');
    assert.notEqual(start, -1, 'CI job "frontend" is missing');

    const job = lines.slice(start).join('\n');
    const checkIndex = job.indexOf('- run: npm run icons:check');
    const buildIndex = job.indexOf('- run: npm run build');

    assert.notEqual(checkIndex, -1, 'the frontend job must run npm run icons:check');
    assert.notEqual(buildIndex, -1, 'the frontend job must run npm run build');
    assert.ok(checkIndex < buildIndex, 'icons:check must run before the build');
});
