/**
 * MusicQueue - Manages the music queue for a single guild
 * Handles track searching, queueing, and playback state
 */

const play = require('play-dl');
const { createAudioResource, StreamType } = require('@discordjs/voice');
const { EmbedBuilder } = require('discord.js');

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
    }

    /**
     * Search for tracks
     * @param {string} query - Search query or URL
     * @param {string} engine - Search engine (youtube, soundcloud, spotify)
     * @returns {Array} Array of track objects
     */
    async search(query, engine = 'youtube') {
        try {
            // Check if it's a URL
            const urlType = await play.validate(query);
            
            if (urlType) {
                return await this.handleUrl(query, urlType);
            }
            
            // It's a search query
            return await this.searchQuery(query, engine);
        } catch (error) {
            this.logger.error('Search error:', error);
            throw error;
        }
    }

    /**
     * Handle URL (YouTube, Spotify, SoundCloud)
     */
    async handleUrl(url, type) {
        const tracks = [];

        switch (type) {
            case 'yt_video': {
                const info = await play.video_info(url);
                tracks.push(this.formatYouTubeTrack(info.video_details));
                break;
            }
            
            case 'yt_playlist': {
                const playlist = await play.playlist_info(url, { incomplete: true });
                const videos = await playlist.all_videos();
                
                for (const video of videos.slice(0, this.config.maxQueueSize)) {
                    tracks.push(this.formatYouTubeTrack(video));
                }
                break;
            }
            
            case 'sp_track': {
                // Spotify track - search on YouTube
                if (play.is_expired()) {
                    await play.refreshToken();
                }
                const sp = await play.spotify(url);
                const searchResult = await play.search(`${sp.name} ${sp.artists[0].name}`, { limit: 1 });
                if (searchResult.length > 0) {
                    tracks.push(this.formatYouTubeTrack(searchResult[0]));
                }
                break;
            }
            
            case 'sp_playlist':
            case 'sp_album': {
                // Spotify playlist/album - search each track on YouTube
                if (play.is_expired()) {
                    await play.refreshToken();
                }
                const sp = await play.spotify(url);
                const spTracks = await sp.all_tracks();
                
                for (const track of spTracks.slice(0, this.config.maxQueueSize)) {
                    try {
                        const searchResult = await play.search(
                            `${track.name} ${track.artists[0].name}`, 
                            { limit: 1 }
                        );
                        if (searchResult.length > 0) {
                            tracks.push(this.formatYouTubeTrack(searchResult[0]));
                        }
                    } catch (e) {
                        // Skip failed tracks
                        this.logger.warn(`Failed to find: ${track.name}`);
                    }
                }
                break;
            }
            
            case 'so_track': {
                const info = await play.soundcloud(url);
                tracks.push(this.formatSoundCloudTrack(info));
                break;
            }
            
            case 'so_playlist': {
                const playlist = await play.soundcloud(url);
                const scTracks = await playlist.all_tracks();
                
                for (const track of scTracks.slice(0, this.config.maxQueueSize)) {
                    tracks.push(this.formatSoundCloudTrack(track));
                }
                break;
            }
            
            default:
                throw new Error('Unsupported URL type');
        }

        return tracks;
    }

    /**
     * Search query on specified engine
     */
    async searchQuery(query, engine) {
        let searchResult;
        
        switch (engine) {
            case 'youtube':
                searchResult = await play.search(query, { limit: 1, source: { youtube: 'video' } });
                if (searchResult.length > 0) {
                    return [this.formatYouTubeTrack(searchResult[0])];
                }
                break;
                
            case 'soundcloud':
                searchResult = await play.search(query, { limit: 1, source: { soundcloud: 'tracks' } });
                if (searchResult.length > 0) {
                    return [this.formatSoundCloudTrack(searchResult[0])];
                }
                break;
                
            case 'spotify':
                // Spotify search requires authentication, search on YouTube instead
                searchResult = await play.search(query, { limit: 1, source: { youtube: 'video' } });
                if (searchResult.length > 0) {
                    return [this.formatYouTubeTrack(searchResult[0])];
                }
                break;
        }
        
        return [];
    }

    /**
     * Format YouTube track object
     */
    formatYouTubeTrack(video) {
        return {
            title: video.title || 'Unknown Title',
            url: video.url,
            duration: video.durationInSec || 0,
            durationFormatted: video.durationRaw || '0:00',
            thumbnail: video.thumbnails?.[0]?.url || null,
            author: video.channel?.name || 'Unknown Artist',
            authorUrl: video.channel?.url || null,
            source: 'youtube',
            requestedAt: Date.now()
        };
    }

    /**
     * Format SoundCloud track object
     */
    formatSoundCloudTrack(track) {
        return {
            title: track.name || 'Unknown Title',
            url: track.url,
            duration: Math.floor(track.durationInMs / 1000) || 0,
            durationFormatted: this.formatDuration(Math.floor(track.durationInMs / 1000)),
            thumbnail: track.thumbnail || null,
            author: track.user?.name || 'Unknown Artist',
            authorUrl: track.user?.url || null,
            source: 'soundcloud',
            requestedAt: Date.now()
        };
    }

    /**
     * Format duration in seconds to mm:ss or hh:mm:ss
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
        let stream;
        
        try {
            if (track.source === 'youtube') {
                stream = await play.stream(track.url);
            } else if (track.source === 'soundcloud') {
                stream = await play.stream(track.url);
            }
            
            const resource = createAudioResource(stream.stream, {
                inputType: stream.type,
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
        this.io.emit('queue:trackAdded', {
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
