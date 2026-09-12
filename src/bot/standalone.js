/**
 * Run a single music bot without the web panel.
 * Requires DISCORD_TOKEN (and optionally CLIENT_ID, PREFIX) in the environment.
 */
require('dotenv').config();
const { MusicBot } = require('./MusicBot');
const { initDatabase } = require('../database/db');
const { Logger } = require('../utils/Logger');

const logger = new Logger('Standalone');
const token = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!token) {
    logger.error('Missing DISCORD_TOKEN. Copy .env.example to .env or export the token.');
    process.exit(1);
}

const db = initDatabase();
const bot = new MusicBot(
    {
        id: 'standalone',
        name: process.env.BOT_NAME || 'MusicBot',
        token,
        clientId: process.env.CLIENT_ID || '',
        prefix: process.env.PREFIX || '!',
        prefixType: process.env.PREFIX_TYPE || 'both',
        volume: Number(process.env.VOLUME || 100),
        maxQueueSize: Number(process.env.MAX_QUEUE_SIZE || 500),
        defaultSearchEngine: process.env.DEFAULT_SEARCH_ENGINE || 'youtube',
        announceSongs: true,
        deleteBotMessages: false,
        stayInChannel: false,
    },
    db,
    null,
);

bot.start()
    .then(() => logger.info('Standalone music bot is running.'))
    .catch((error) => {
        logger.error('Failed to start standalone bot:', error);
        process.exit(1);
    });

process.on('SIGINT', async () => {
    await bot.stop();
    process.exit(0);
});
