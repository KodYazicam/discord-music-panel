/**
 * MusicBot - Individual Discord Music Bot Instance
 * Supports slash commands, text prefixes, and hybrid mode
 */

const { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    ActivityType,
    Events
} = require('discord.js');
const { 
    joinVoiceChannel, 
    createAudioPlayer, 
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    getVoiceConnection
} = require('@discordjs/voice');
const { Logger } = require('../utils/Logger');
const { MusicQueue } = require('./MusicQueue');
const { loadCommands, loadSlashCommands } = require('./commands');
const { guildOperations, statisticsOperations, logOperations } = require('../database/db');

class MusicBot {
    constructor(config, db, io) {
        this.config = config;
        this.db = db;
        this.io = io;
        this.logger = new Logger(`Bot:${config.name}`);
        
        // Discord client
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent
            ]
        });

        // Collections
        this.commands = new Collection(); // Text commands
        this.slashCommands = new Collection(); // Slash commands
        this.cooldowns = new Collection();
        
        // Music queues per guild
        this.queues = new Map(); // guildId -> MusicQueue
        this.emitToGuild = (guildId, events, payload) => {
            const names = Array.isArray(events) ? events : [events];
            const room = `guild:${this.config.id}:${guildId}`;
            for (const name of names) {
                this.io?.to(room).emit(name, { botId: this.config.id, guildId, ...payload });
            }
        };
        
        // Audio players per guild
        this.players = new Map(); // guildId -> AudioPlayer
        
        // Voice connections per guild
        this.connections = new Map(); // guildId -> VoiceConnection
        this.skipAdvance = new Set();

        // Statistics
        this.stats = {
            startTime: null,
            commandsExecuted: 0,
            songsPlayed: 0,
            totalPlaytime: 0
        };

        // Setup event handlers
        this.setupEventHandlers();
    }

    /**
     * Setup Discord.js event handlers
     */
    setupEventHandlers() {
        // Ready event
        this.client.once(Events.ClientReady, () => {
            this.logger.info(`Bot logged in as ${this.client.user.tag}`);
            this.stats.startTime = Date.now();
            
            // Set activity
            this.updateActivity();
            
            // Sync guilds to database
            this.syncGuilds();
            
            // Emit ready event
            this.io?.emit('bot:ready', {
                botId: this.config.id,
                username: this.client.user.username,
                discriminator: this.client.user.discriminator,
                avatar: this.client.user.displayAvatarURL()
            });
        });

        // Message event (for text prefix commands)
        this.client.on(Events.MessageCreate, async (message) => {
            if (message.author.bot) return;
            if (!message.guild) return;

            // Check if message starts with prefix
            const prefix = this.getPrefix(message.guild.id);
            
            if (this.config.prefixType === 'slash') return; // Slash only mode
            
            if (!message.content.startsWith(prefix)) return;

            // Parse command and args
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const commandName = args.shift().toLowerCase();

            // Get command
            const command = this.commands.get(commandName) 
                || this.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) return;

            // Check cooldown
            if (this.isOnCooldown(message.author.id, commandName)) {
                const remaining = this.getCooldownRemaining(message.author.id, commandName);
                return message.reply(`Please wait ${remaining.toFixed(1)} seconds before using \`${commandName}\` again.`);
            }

            // Execute command
            try {
                await command.execute(message, args, this);
                this.setCooldown(message.author.id, commandName, command.cooldown || 3);
                this.stats.commandsExecuted++;
                
                // Log command
                logOperations.add(this.config.id, message.guild.id, message.author.id, commandName, args);
                
                // Update statistics
                statisticsOperations.increment(this.config.id, message.guild.id, 'commands_used');

                // Delete command message if configured
                if (this.config.deleteBotMessages && message.deletable) {
                    setTimeout(() => message.delete().catch(() => {}), 5000);
                }
            } catch (error) {
                this.logger.error(`Error executing command ${commandName}:`, error);
                message.reply('An error occurred while executing that command.');
            }
        });

        // Interaction event (for slash commands)
        this.client.on(Events.InteractionCreate, async (interaction) => {
            if (!interaction.isChatInputCommand()) return;
            
            if (this.config.prefixType === 'text') return; // Text only mode

            const command = this.slashCommands.get(interaction.commandName);
            if (!command) return;

            // Check cooldown
            if (this.isOnCooldown(interaction.user.id, interaction.commandName)) {
                const remaining = this.getCooldownRemaining(interaction.user.id, interaction.commandName);
                return interaction.reply({ 
                    content: `Please wait ${remaining.toFixed(1)} seconds before using this command again.`,
                    ephemeral: true 
                });
            }

            try {
                await command.execute(interaction, this);
                this.setCooldown(interaction.user.id, interaction.commandName, command.cooldown || 3);
                this.stats.commandsExecuted++;
                
                // Log command
                logOperations.add(this.config.id, interaction.guild.id, interaction.user.id, interaction.commandName, []);
                
                // Update statistics
                statisticsOperations.increment(this.config.id, interaction.guild.id, 'commands_used');
            } catch (error) {
                this.logger.error(`Error executing slash command ${interaction.commandName}:`, error);
                const reply = { content: 'An error occurred while executing that command.', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        });

        // Voice state update (for auto-leave)
        this.client.on(Events.VoiceStateUpdate, (oldState, newState) => {
            // Check if bot was disconnected
            if (oldState.member?.id === this.client.user.id && !newState.channel) {
                this.handleBotDisconnect(oldState.guild.id);
            }

            // Check if channel became empty
            if (oldState.channel && !this.config.stayInChannel) {
                const connection = this.connections.get(oldState.guild.id);
                if (connection && oldState.channel.id === connection.joinConfig.channelId) {
                    const members = oldState.channel.members.filter(m => !m.user.bot);
                    if (members.size === 0) {
                        this.logger.info(`Channel empty, leaving voice in ${oldState.guild.name}`);
                        setTimeout(() => {
                            // Re-check if still empty
                            const channel = oldState.channel;
                            if (channel) {
                                const currentMembers = channel.members.filter(m => !m.user.bot);
                                if (currentMembers.size === 0) {
                                    this.leaveVoice(oldState.guild.id);
                                }
                            }
                        }, 30000); // 30 second delay
                    }
                }
            }
        });

        // Guild join
        this.client.on(Events.GuildCreate, (guild) => {
            this.logger.info(`Joined guild: ${guild.name} (${guild.id})`);
            guildOperations.upsert(this.config.id, guild.id, guild.name, guild.memberCount);
            
            this.io?.emit('bot:guildJoin', {
                botId: this.config.id,
                guild: {
                    id: guild.id,
                    name: guild.name,
                    memberCount: guild.memberCount,
                    icon: guild.iconURL()
                }
            });
        });

        // Guild leave
        this.client.on(Events.GuildDelete, (guild) => {
            this.logger.info(`Left guild: ${guild.name} (${guild.id})`);
            guildOperations.remove(this.config.id, guild.id);
            
            // Cleanup
            this.queues.delete(guild.id);
            this.players.delete(guild.id);
            this.connections.delete(guild.id);
            
            this.io?.emit('bot:guildLeave', {
                botId: this.config.id,
                guildId: guild.id
            });
        });

        // Error handling
        this.client.on(Events.Error, (error) => {
            this.logger.error('Discord client error:', error);
        });

        this.client.on(Events.Warn, (warning) => {
            this.logger.warn('Discord client warning:', warning);
        });
    }

    /**
     * Start the bot
     */
    async start() {
        this.logger.info('Starting bot...');
        
        // Load commands
        this.commands = loadCommands();
        this.slashCommands = loadSlashCommands();
        
        // Login
        await this.client.login(this.config.token);
        
        // Register slash commands if needed
        if (this.config.prefixType === 'slash' || this.config.prefixType === 'both') {
            await this.registerSlashCommands();
        }
    }

    /**
     * Stop the bot
     */
    async stop() {
        this.logger.info('Stopping bot...');
        
        // Leave all voice channels
        for (const [guildId] of this.connections) {
            this.leaveVoice(guildId);
        }
        
        // Clear queues
        this.queues.clear();
        this.players.clear();
        this.connections.clear();
        
        // Destroy client
        this.client.destroy();
        
        this.logger.info('Bot stopped');
    }

    /**
     * Check if bot is connected
     */
    isConnected() {
        return this.client.isReady();
    }

    /**
     * Update bot activity/presence
     */
    updateActivity() {
        if (!this.client.user) return;

        const activityTypes = {
            'PLAYING': ActivityType.Playing,
            'STREAMING': ActivityType.Streaming,
            'LISTENING': ActivityType.Listening,
            'WATCHING': ActivityType.Watching,
            'COMPETING': ActivityType.Competing
        };

        const type = activityTypes[this.config.activityType] || ActivityType.Listening;
        const text = this.config.activityText || `${this.config.prefix}help`;

        this.client.user.setActivity(text, { type });
    }

    /**
     * Sync guilds to database
     */
    syncGuilds() {
        for (const [, guild] of this.client.guilds.cache) {
            guildOperations.upsert(this.config.id, guild.id, guild.name, guild.memberCount);
        }
    }

    /**
     * Register slash commands with Discord
     */
    async registerSlashCommands() {
        const commands = [];
        for (const [, command] of this.slashCommands) {
            if (command.data) {
                commands.push(command.data.toJSON());
            }
        }

        try {
            await this.client.application.commands.set(commands);
            this.logger.info(`Registered ${commands.length} slash commands`);
        } catch (error) {
            this.logger.error('Failed to register slash commands:', error);
        }
    }

    /**
     * Get prefix for a guild (supports override)
     */
    getPrefix(guildId) {
        const guildSettings = guildOperations.getSettings(this.config.id, guildId);
        return guildSettings?.prefix_override || this.config.prefix;
    }

    /**
     * Update bot configuration dynamically
     */
    updateConfig(updates) {
        Object.assign(this.config, updates);
        
        if (updates.activityType || updates.activityText) {
            this.updateActivity();
        }
        
        if (updates.volume !== undefined) {
            // Update volume for all playing guilds
            for (const [guildId, queue] of this.queues) {
                queue.setVolume(updates.volume);
            }
        }
    }

    /**
     * Get bot statistics
     */
    getStats() {
        const uptime = this.stats.startTime ? Date.now() - this.stats.startTime : 0;
        let playingCount = 0;
        let totalQueuedSongs = 0;
        let totalUsers = 0;

        for (const [, queue] of this.queues) {
            if (queue.isPlaying) playingCount++;
            totalQueuedSongs += queue.tracks.length;
        }

        for (const [, guild] of this.client.guilds.cache) {
            totalUsers += guild.memberCount;
        }

        return {
            guildCount: this.client.guilds.cache.size,
            playingCount,
            totalQueuedSongs,
            totalUsers,
            uptime,
            commandsExecuted: this.stats.commandsExecuted,
            songsPlayed: this.stats.songsPlayed,
            ping: this.client.ws.ping
        };
    }

    /**
     * Get guild count
     */
    getGuildCount() {
        return this.client.guilds.cache.size;
    }

    /**
     * Get all guilds
     */
    getGuilds() {
        return this.client.guilds.cache.map(guild => ({
            id: guild.id,
            name: guild.name,
            memberCount: guild.memberCount,
            icon: guild.iconURL(),
            isPlaying: this.queues.has(guild.id) && this.queues.get(guild.id).isPlaying,
            queueLength: this.queues.has(guild.id) ? this.queues.get(guild.id).tracks.length : 0
        }));
    }

    /**
     * Get queue for a guild
     */
    getQueue(guildId) {
        const queue = this.queues.get(guildId);
        if (!queue) return null;
        
        return {
            tracks: queue.tracks,
            currentTrack: queue.currentTrack,
            isPlaying: queue.isPlaying,
            isPaused: queue.isPaused,
            volume: queue.volume,
            loop: queue.loop,
            loopQueue: queue.loopQueue,
            position: queue.getPosition()
        };
    }

    /**
     * Execute a command from the panel
     */
    async executeCommand(guildId, command, args) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) {
            return { success: false, message: 'Guild not found' };
        }

        switch (command) {
            case 'play':
                return await this.play(guildId, args.query, args.voiceChannelId, args.textChannelId);
            case 'pause':
                return this.pause(guildId);
            case 'resume':
                return this.resume(guildId);
            case 'skip':
                return this.skip(guildId);
            case 'stop':
                return this.stopPlayback(guildId);
            case 'volume':
                return this.setVolume(guildId, args.volume);
            case 'seek':
                return this.seek(guildId, args.position);
            case 'shuffle':
                return this.shuffle(guildId);
            case 'loop':
                return this.setLoop(guildId, args.mode);
            case 'remove':
                return this.removeTrack(guildId, args.index);
            case 'clear':
                return this.clearQueue(guildId);
            case 'move':
                return this.moveTrack(guildId, args.from, args.to);
            case 'jump':
                return this.jumpTo(guildId, args.index);
            case 'leave':
                return this.leaveVoice(guildId);
            default:
                return { success: false, message: 'Unknown command' };
        }
    }

    // ==================== Music Methods ====================

    /**
     * Play a track or add to queue
     */
    async play(guildId, query, voiceChannelId, textChannelId) {
        const guild = this.client.guilds.cache.get(guildId);
        if (!guild) return { success: false, message: 'Guild not found' };

        const voiceChannel = guild.channels.cache.get(voiceChannelId);
        if (!voiceChannel) return { success: false, message: 'Voice channel not found' };

        const textChannel = textChannelId ? guild.channels.cache.get(textChannelId) : null;

        // Get or create queue
        let queue = this.queues.get(guildId);
        if (!queue) {
            queue = new MusicQueue(guildId, this.config, this.io, this.logger);
            this.queues.set(guildId, queue);
        }

        // Search and add track
        try {
            const tracks = await queue.search(query);
            
            if (!tracks || tracks.length === 0) {
                return { success: false, message: 'No tracks found' };
            }

            // Add tracks to queue
            for (const track of tracks) {
                queue.addTrack(track);
            }

            // Join voice channel if not already connected
            if (!this.connections.has(guildId)) {
                await this.joinVoice(guildId, voiceChannelId);
            }

            // Start playing if not already
            if (!queue.isPlaying) {
                await this.startPlayback(guildId, textChannel);
            }

            // Emit queue update
            this.emitToGuild(guildId, ['queue:update', 'music:queueUpdate'], {
                botId: this.config.id,
                guildId,
                queue: this.getQueue(guildId)
            });

            return { 
                success: true, 
                message: tracks.length > 1 
                    ? `Added ${tracks.length} tracks to queue` 
                    : `Added "${tracks[0].title}" to queue`,
                tracks
            };
        } catch (error) {
            this.logger.error('Error playing track:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Join a voice channel
     */
    async joinVoice(guildId, channelId) {
        const guild = this.client.guilds.cache.get(guildId);
        const channel = guild.channels.cache.get(channelId);

        if (!channel) {
            throw new Error('Voice channel not found');
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator
        });

        // Handle connection state changes
        connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(connection, VoiceConnectionStatus.Signalling, 5000),
                    entersState(connection, VoiceConnectionStatus.Connecting, 5000)
                ]);
            } catch (error) {
                this.handleBotDisconnect(guildId);
            }
        });

        connection.on(VoiceConnectionStatus.Destroyed, () => {
            this.handleBotDisconnect(guildId);
        });

        this.connections.set(guildId, connection);
        this.logger.info(`Joined voice channel in ${guild.name}`);
        
        return connection;
    }

    /**
     * Leave a voice channel
     */
    leaveVoice(guildId) {
        const connection = this.connections.get(guildId);
        if (connection) {
            connection.destroy();
            this.connections.delete(guildId);
        }

        const player = this.players.get(guildId);
        if (player) {
            player.stop();
            this.players.delete(guildId);
        }

        const queue = this.queues.get(guildId);
        if (queue) {
            queue.clear();
            this.queues.delete(guildId);
        }

        this.emitToGuild(guildId, ['queue:cleared', 'music:stop'], {});
        
        return { success: true, message: 'Left voice channel' };
    }

    /**
     * Handle bot disconnect
     */
    handleBotDisconnect(guildId) {
        this.connections.delete(guildId);
        this.players.delete(guildId);
        
        const queue = this.queues.get(guildId);
        if (queue) {
            queue.clear();
            this.queues.delete(guildId);
        }

        this.io?.emit('bot:disconnected', { botId: this.config.id, guildId });
    }

    /**
     * Start playback
     */
    async startPlayback(guildId, textChannel = null) {
        const queue = this.queues.get(guildId);
        if (!queue || queue.tracks.length === 0) return;

        const connection = this.connections.get(guildId);
        if (!connection) return;

        // Get or create audio player
        let player = this.players.get(guildId);
        if (!player) {
            player = createAudioPlayer();
            this.players.set(guildId, player);
            connection.subscribe(player);

            // Handle player state changes
            player.on(AudioPlayerStatus.Idle, () => {
                this.handleTrackEnd(guildId, textChannel);
            });

            player.on('error', (error) => {
                this.logger.error('Audio player error:', error);
                this.handleTrackEnd(guildId, textChannel);
            });
        }

        // Get next track
        const track = queue.getCurrentTrack();
        if (!track) return;

        try {
            // Create audio resource
            const resource = await queue.createResource(track);
            
            // Set volume
            resource.volume?.setVolume(queue.volume / 100);
            
            // Play
            player.play(resource);
            queue.isPlaying = true;
            queue.isPaused = false;
            queue.startTime = Date.now();

            // Announce song
            if (this.config.announceSongs && textChannel) {
                const embed = queue.createNowPlayingEmbed(track);
                textChannel.send({ embeds: [embed] }).catch(() => {});
            }

            // Emit now playing
            this.emitToGuild(guildId, ['nowplaying:update', 'music:trackStart'], {
                botId: this.config.id,
                guildId,
                track,
                position: 0
            });

            // Update stats
            this.stats.songsPlayed++;
            statisticsOperations.increment(this.config.id, guildId, 'songs_played');

            this.logger.music(this.config.name, guildId, `Now playing: ${track.title}`);
        } catch (error) {
            this.logger.error('Error starting playback:', error);
            this.handleTrackEnd(guildId, textChannel);
        }
    }

    /**
     * Handle track end
     */
    handleTrackEnd(guildId, textChannel) {
        const queue = this.queues.get(guildId);
        if (!queue) return;

        if (this.skipAdvance.has(guildId)) {
            this.skipAdvance.delete(guildId);
            this.startPlayback(guildId, textChannel);
            return;
        }

        // Update playtime stats
        if (queue.currentTrack && queue.startTime) {
            const playtime = Math.floor((Date.now() - queue.startTime) / 1000);
            this.stats.totalPlaytime += playtime;
            statisticsOperations.increment(this.config.id, guildId, 'total_playtime', playtime);
        }

        // Handle loop modes
        if (queue.loop && queue.currentTrack) {
            // Loop single track - don't advance
            this.startPlayback(guildId, textChannel);
            return;
        }

        if (queue.loopQueue && queue.currentTrack) {
            // Loop queue - add current track to end
            queue.tracks.push(queue.currentTrack);
        }

        // Advance to next track
        queue.nextTrack();

        // Check if queue is empty
        if (queue.tracks.length === 0) {
            queue.isPlaying = false;
            queue.currentTrack = null;
            
            this.emitToGuild(guildId, ['queue:ended', 'music:trackEnd'], {});
            
            // Auto-leave if configured
            if (!this.config.stayInChannel) {
                setTimeout(() => {
                    if (!this.queues.get(guildId)?.isPlaying) {
                        this.leaveVoice(guildId);
                    }
                }, 60000); // 1 minute delay
            }
            return;
        }

        // Play next track
        this.startPlayback(guildId, textChannel);
    }

    /**
     * Pause playback
     */
    pause(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);
        
        if (!player || !queue) {
            return { success: false, message: 'Nothing is playing' };
        }

        player.pause();
        queue.isPaused = true;
        queue.pauseTime = Date.now();

        this.emitToGuild(guildId, ['player:paused', 'music:pause'], {});
        
        return { success: true, message: 'Paused' };
    }

    /**
     * Resume playback
     */
    resume(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);
        
        if (!player || !queue) {
            return { success: false, message: 'Nothing is playing' };
        }

        player.unpause();
        queue.isPaused = false;
        
        // Adjust start time to account for pause duration
        if (queue.pauseTime) {
            queue.startTime += (Date.now() - queue.pauseTime);
            queue.pauseTime = null;
        }

        this.emitToGuild(guildId, ['player:resumed', 'music:resume'], {});
        
        return { success: true, message: 'Resumed' };
    }

    /**
     * Skip current track
     */
    skip(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);
        
        if (!player || !queue) {
            return { success: false, message: 'Nothing is playing' };
        }

        player.stop();
        
        return { success: true, message: 'Skipped' };
    }

    /**
     * Stop playback and clear queue
     */
    stopPlayback(guildId) {
        const player = this.players.get(guildId);
        const queue = this.queues.get(guildId);
        
        if (player) {
            player.stop();
        }
        
        if (queue) {
            queue.clear();
        }

        this.emitToGuild(guildId, ['queue:cleared', 'music:stop'], {});
        
        return { success: true, message: 'Stopped' };
    }

    /**
     * Set volume
     */
    setVolume(guildId, volume) {
        const queue = this.queues.get(guildId);
        
        if (!queue) {
            return { success: false, message: 'No active queue' };
        }

        volume = Math.max(0, Math.min(200, volume));
        queue.setVolume(volume);

        this.emitToGuild(guildId, ['volume:update', 'music:volumeChange'], { volume });
        
        return { success: true, message: `Volume set to ${volume}%` };
    }

    /**
     * Seek to position
     */
    seek(guildId, position) {
        // Note: Seeking requires restarting the stream at a specific position
        // This is a simplified implementation
        return { success: false, message: 'Seeking not yet implemented' };
    }

    /**
     * Shuffle queue
     */
    shuffle(guildId) {
        const queue = this.queues.get(guildId);
        
        if (!queue || queue.tracks.length < 2) {
            return { success: false, message: 'Not enough tracks to shuffle' };
        }

        queue.shuffle();
        
        this.emitToGuild(guildId, ['queue:update', 'music:queueUpdate'], {
            queue: this.getQueue(guildId)
        });
        
        return { success: true, message: 'Queue shuffled' };
    }

    /**
     * Set loop mode
     */
    setLoop(guildId, mode) {
        const queue = this.queues.get(guildId);
        
        if (!queue) {
            return { success: false, message: 'No active queue' };
        }

        switch (mode) {
            case 'off':
                queue.loop = false;
                queue.loopQueue = false;
                break;
            case 'track':
                queue.loop = true;
                queue.loopQueue = false;
                break;
            case 'queue':
                queue.loop = false;
                queue.loopQueue = true;
                break;
        }

        this.emitToGuild(guildId, ['loop:update', 'music:queueUpdate'], { mode, queue: this.getQueue(guildId) });
        
        return { success: true, message: `Loop mode: ${mode}` };
    }

    /**
     * Remove track from queue
     */
    removeTrack(guildId, index) {
        const queue = this.queues.get(guildId);
        
        if (!queue) {
            return { success: false, message: 'No active queue' };
        }

        const removed = queue.removeTrack(index);
        
        if (!removed) {
            return { success: false, message: 'Invalid track index' };
        }

        this.emitToGuild(guildId, ['queue:update', 'music:queueUpdate'], {
            queue: this.getQueue(guildId)
        });
        
        return { success: true, message: `Removed "${removed.title}"` };
    }

    /**
     * Clear queue
     */
    clearQueue(guildId) {
        const queue = this.queues.get(guildId);
        
        if (!queue) {
            return { success: false, message: 'No active queue' };
        }

        const currentTrack = queue.currentTrack;
        queue.tracks = [];
        
        this.emitToGuild(guildId, ['queue:update', 'music:queueUpdate'], {
            queue: this.getQueue(guildId)
        });
        
        return { success: true, message: 'Queue cleared' };
    }

    /**
     * Move track in queue
     */
    moveTrack(guildId, from, to) {
        const queue = this.queues.get(guildId);
        
        if (!queue) {
            return { success: false, message: 'No active queue' };
        }

        const success = queue.moveTrack(from, to);
        
        if (!success) {
            return { success: false, message: 'Invalid indices' };
        }

        this.emitToGuild(guildId, ['queue:update', 'music:queueUpdate'], {
            queue: this.getQueue(guildId)
        });
        
        return { success: true, message: 'Track moved' };
    }

    /**
     * Jump to specific track
     */
    jumpTo(guildId, index) {
        const queue = this.queues.get(guildId);
        const player = this.players.get(guildId);
        
        if (!queue || !player) {
            return { success: false, message: 'No active queue' };
        }

        const success = queue.jumpTo(index);
        
        if (!success) {
            return { success: false, message: 'Invalid track index' };
        }

        this.skipAdvance.add(guildId);
        player.stop();
        
        return { success: true, message: 'Jumped to track' };
    }

    // ==================== Cooldown Methods ====================

    isOnCooldown(userId, commandName) {
        const key = `${userId}-${commandName}`;
        const cooldownEnd = this.cooldowns.get(key);
        return cooldownEnd && Date.now() < cooldownEnd;
    }

    getCooldownRemaining(userId, commandName) {
        const key = `${userId}-${commandName}`;
        const cooldownEnd = this.cooldowns.get(key);
        return (cooldownEnd - Date.now()) / 1000;
    }

    setCooldown(userId, commandName, seconds) {
        const key = `${userId}-${commandName}`;
        this.cooldowns.set(key, Date.now() + (seconds * 1000));
        
        // Auto-cleanup
        setTimeout(() => {
            this.cooldowns.delete(key);
        }, seconds * 1000);
    }
}

module.exports = { MusicBot };
