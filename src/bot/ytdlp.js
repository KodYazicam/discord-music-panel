const { spawn } = require('child_process');
const { existsSync } = require('fs');

function bin() {
    return process.env.YTDLP_PATH || 'yt-dlp';
}

function cookieArgs() {
    const cookie = process.env.YOUTUBE_COOKIE;
    if (!cookie) return [];
    if (existsSync(cookie)) return ['--cookies', cookie];
    return ['--add-header', `Cookie:${cookie}`];
}

function runJson(args) {
    return new Promise((resolve, reject) => {
        const child = spawn(bin(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let out = '';
        let err = '';
        child.stdout.on('data', (chunk) => {
            out += chunk;
        });
        child.stderr.on('data', (chunk) => {
            err += chunk;
        });
        child.on('error', (error) => {
            if (error.code === 'ENOENT') {
                reject(new Error('yt-dlp is not installed. Install it with: pipx install yt-dlp'));
                return;
            }
            reject(error);
        });
        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(err.trim().split('\n').pop() || `yt-dlp exited ${code}`));
                return;
            }
            try {
                resolve(JSON.parse(out));
            } catch (error) {
                reject(error);
            }
        });
    });
}

function formatEntry(entry) {
    if (!entry) return null;
    const seconds = Math.floor(Number(entry.duration) || 0);
    const url = entry.webpage_url || entry.url || (entry.id ? `https://www.youtube.com/watch?v=${entry.id}` : null);
    if (!url) return null;
    return {
        title: entry.title || 'Unknown Title',
        url,
        duration: seconds,
        durationFormatted: formatDuration(seconds),
        thumbnail: entry.thumbnail || entry.thumbnails?.[0]?.url || null,
        author: entry.uploader || entry.channel || entry.artist || 'Unknown Artist',
        authorUrl: entry.uploader_url || entry.channel_url || null,
        source: sourceFromExtractor(entry.extractor || entry.ie_key || url),
        requestedAt: Date.now()
    };
}

function sourceFromExtractor(value) {
    const text = String(value).toLowerCase();
    if (text.includes('soundcloud')) return 'soundcloud';
    if (text.includes('spotify')) return 'spotify';
    return 'youtube';
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

async function resolveQuery(query, limit = 1) {
    const isUrl = /^https?:\/\//i.test(query);
    const target = isUrl ? query : `ytsearch${limit}:${query}`;
    const data = await runJson([
        '--dump-single-json',
        '--no-warnings',
        '--no-check-certificates',
        '--flat-playlist',
        '--yes-playlist',
        ...cookieArgs(),
        target
    ]);
    const entries = Array.isArray(data.entries) ? data.entries : [data];
    return entries.map(formatEntry).filter(Boolean).slice(0, Math.max(limit, 1));
}

function stream(url) {
    const args = [
        '-f', 'bestaudio[ext=webm]/bestaudio/best',
        '-o', '-',
        '--no-warnings',
        '--no-playlist',
        '--no-check-certificates',
        ...cookieArgs(),
        url
    ];
    const child = spawn(bin(), args, { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stderr.on('data', () => {});
    return child;
}

module.exports = { resolveQuery, stream, formatDuration };
