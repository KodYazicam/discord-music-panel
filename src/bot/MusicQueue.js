/**
 * MusicQueue - Manages the music queue for a single guild
 * Handles track searching, queueing, and playback state
 */

const { createAudioResource, StreamType } = require('@discordjs/voice');
const ytdlp = require('./ytdlp');

class MusicQueue {
    constructor(guildId, config, io, logger) {
        this.guildId = guildId;
        this.config = config;
        this.io = io;
        this.logger = logger;

        // Queue state
        this.tracks = [];
        this.currentTrack = null;
        this.currentIndex = -1;
        
        // Playback state
        this.isPlaying = false;
        this.isPaused = false;
        this.volume = config.volume || 100;
        
        // Loop modes
        this.loop = false; // Loop current track
        this.loopQueue = false; // Loop entire queue
        
        // Timing
        this.startTime = null;
        this.pauseTime = null;
        
        // Resource reference for volume control
        this.currentResource = null;
        this.currentProcess = null;
    }

    /**
     * Search for tracks
     * @param {string} query - Search query or URL
     * @param {string} engine - Search engine (youtube, soundcloud, spotify)
     * @returns {Array} Array of track objects
     */
    async search(query) {
        try {
            const limit = /^https?:\/\//i.test(query) ? this.config.maxQueueSize || 50 : 1;
            return await ytdlp.resolveQuery(query, limit);
        } catch (error) {
            this.logger.error('Search error:', error);
            throw error;
        }
    }

    /**
     * Handle URL (YouTube, Spotify, SoundCloud)
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Create audio resource from track
     */
    async createResource(track) {
        try {
            if (this.currentProcess && !this.currentProcess.killed) {
                this.currentProcess.kill('SIGKILL');
            }
            const child = ytdlp.stream(track.url);
            this.currentProcess = child;
            const resource = createAudioResource(child.stdout, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true
            });
            resource.volume?.setVolume(this.volume / 100);
            this.currentResource = resource;
            return resource;
        } catch (error) {
            this.logger.error('Error creating audio resource:', error);
            throw error;
        }
    }

    /**
     * Add track to queue
     */
    addTrack(track, position = -1) {
        if (this.tracks.length >= this.config.maxQueueSize) {
            throw new Error(`Queue is full (max ${this.config.maxQueueSize} tracks)`);
        }
        
        if (position >= 0 && position < this.tracks.length) {
            this.tracks.splice(position, 0, track);
        } else {
            this.tracks.push(track);
        }
        
        // Emit update
        this.io?.emit('queue:trackAdded', {
            botId: this.config.id,
            guildId: this.guildId,
            track,
            position: position >= 0 ? position : this.tracks.length - 1
        });
    }

    /**
     * Remove track from queue
     */
    removeTrack(index) {
        if (index < 0 || index >= this.tracks.length) {
            return null;
        }
        
        const [removed] = this.tracks.splice(index, 1);
        
        // Adjust current index if needed
        if (index < this.currentIndex) {
            this.currentIndex--;
        }
        
        return removed;
    }

    /**
     * Get current track
     */
    getCurrentTrack() {
        if (this.currentIndex === -1 && this.tracks.length > 0) {
            this.currentIndex = 0;
            this.currentTrack = this.tracks[0];
        }
        return this.currentTrack;
    }

    /**
     * Advance to next track
     */
    nextTrack() {
        // Remove current track from queue if not looping
        if (!this.loop && this.tracks.length > 0) {
            this.tracks.shift();
        }
        
        if (this.tracks.length > 0) {
            this.currentTrack = this.tracks[0];
            this.currentIndex = 0;
        } else {
            this.currentTrack = null;
            this.currentIndex = -1;
        }
        
        return this.currentTrack;
    }

    /**
     * Go to previous track
     */
    previousTrack() {
        // This would require keeping history, simplified version
        return this.currentTrack;
    }

    /**
     * Jump to specific track in queue
     */
    jumpTo(index) {
        if (index < 0 || index >= this.tracks.length) {
            return false;
        }
        
        // Remove all tracks before the target
        this.tracks.splice(0, index);
        this.currentTrack = this.tracks[0];
        this.currentIndex = 0;
        
        return true;
    }

    /**
     * Move track from one position to another
     */
    moveTrack(from, to) {
        if (from < 0 || from >= this.tracks.length || to < 0 || to >= this.tracks.length) {
            return false;
        }
        
        const [track] = this.tracks.splice(from, 1);
        this.tracks.splice(to, 0, track);
        
        return true;
    }

    /**
     * Shuffle the queue
     */
    shuffle() {
        // Fisher-Yates shuffle
        for (let i = this.tracks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.tracks[i], this.tracks[j]] = [this.tracks[j], this.tracks[i]];
        }
    }

    /**
     * Clear the queue
     */
    clear() {
        this.tracks = [];
        this.currentTrack = null;
        this.currentIndex = -1;
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = null;
        this.pauseTime = null;
    }

    /**
     * Set volume
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(200, volume));
        
        if (this.currentResource?.volume) {
            this.currentResource.volume.setVolume(this.volume / 100);
        }
    }

    /**
     * Get current playback position in seconds
     */
    getPosition() {
        if (!this.startTime || !this.isPlaying) {
            return 0;
        }
        
        if (this.isPaused && this.pauseTime) {
            return Math.floor((this.pauseTime - this.startTime) / 1000);
        }
        
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Create now playing embed
     */
    createNowPlayingEmbed(track) {
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Now Playing')
            .setDescription(`[${track.title}](${track.url})`)
            .addFields(
                { name: 'Duration', value: track.durationFormatted || 'Unknown', inline: true },
                { name: 'Artist', value: track.author || 'Unknown', inline: true },
                { name: 'Source', value: track.source === 'youtube' ? '🔴 YouTube' : '🟠 SoundCloud', inline: true }
            )
            .setTimestamp();
        
        if (track.thumbnail) {
            embed.setThumbnail(track.thumbnail);
        }
        
        // Add queue info
        if (this.tracks.length > 1) {
            embed.setFooter({ text: `${this.tracks.length - 1} tracks in queue` });
        }
        
        return embed;
    }

    /**
     * Create queue embed
     */
    createQueueEmbed(page = 1, pageSize = 10) {
        const start = (page - 1) * pageSize;
        const end = Math.min(start + pageSize, this.tracks.length);
        const totalPages = Math.ceil(this.tracks.length / pageSize);
        
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📋 Music Queue')
            .setTimestamp();
        
        // Current track
        if (this.currentTrack) {
            embed.addFields({
                name: '🎵 Now Playing',
                value: `[${this.currentTrack.title}](${this.currentTrack.url}) - ${this.currentTrack.durationFormatted}`
            });
        }
        
        // Queue
        if (this.tracks.length > 0) {
            const queueList = this.tracks
                .slice(start, end)
                .map((track, index) => `**${start + index + 1}.** [${track.title}](${track.url}) - ${track.durationFormatted}`)
                .join('\n');
            
            embed.addFields({
                name: `Queue (${this.tracks.length} tracks)`,
                value: queueList || 'No tracks in queue'
            });
        } else {
            embed.setDescription('The queue is empty');
        }
        
        // Footer with page info
        if (totalPages > 1) {
            embed.setFooter({ text: `Page ${page}/${totalPages} • Total: ${this.tracks.length} tracks` });
        }
        
        // Loop status
        let loopStatus = '';
        if (this.loop) loopStatus = '🔂 Looping Track';
        else if (this.loopQueue) loopStatus = '🔁 Looping Queue';
        
        if (loopStatus) {
            embed.addFields({ name: 'Loop', value: loopStatus, inline: true });
        }
        
        embed.addFields({ name: 'Volume', value: `${this.volume}%`, inline: true });
        
        return embed;
    }

    /**
     * Get total queue duration
     */
    getTotalDuration() {
        return this.tracks.reduce((total, track) => total + (track.duration || 0), 0);
    }

    /**
     * Get total queue duration formatted
     */
    getTotalDurationFormatted() {
        return this.formatDuration(this.getTotalDuration());
    }
}

module.exports = { MusicQueue };
