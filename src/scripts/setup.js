/**
 * First-run helper: copy .env.example and create data/logs folders.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '../..');
const envExample = path.join(root, '.env.example');
const envFile = path.join(root, '.env');

fs.mkdirSync(path.join(root, 'data'), { recursive: true });
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });

if (!fs.existsSync(envFile)) {
    if (!fs.existsSync(envExample)) {
        console.error('Missing .env.example');
        process.exit(1);
    }
    fs.copyFileSync(envExample, envFile);
    console.log('Created .env from .env.example — fill in JWT_SECRET and SESSION_SECRET.');
} else {
    console.log('.env already exists.');
}

console.log('data/ and logs/ are ready.');
console.log('Next: npm run install:all && npm start');
