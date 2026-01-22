/**
 * Command Loader - Loads both text and slash commands
 */

const { Collection } = require('discord.js');
const { Logger } = require('../../utils/Logger');

// Text Commands
const playCommand = require('./text/play');
const pauseCommand = require('./text/pause');
const resumeCommand = require('./text/resume');
const skipCommand = require('./text/skip');
const stopCommand = require('./text/stop');
const queueCommand = require('./text/queue');
const volumeCommand = require('./text/volume');
const nowPlayingCommand = require('./text/nowplaying');
const shuffleCommand = require('./text/shuffle');
const loopCommand = require('./text/loop');
const removeCommand = require('./text/remove');
const clearCommand = require('./text/clear');
const moveCommand = require('./text/move');
const jumpCommand = require('./text/jump');
const leaveCommand = require('./text/leave');
const helpCommand = require('./text/help');
const seekCommand = require('./text/seek');
const searchCommand = require('./text/search');
const lyricsCommand = require('./text/lyrics');

// Slash Commands
const playSlash = require('./slash/play');
const pauseSlash = require('./slash/pause');
const resumeSlash = require('./slash/resume');
const skipSlash = require('./slash/skip');
const stopSlash = require('./slash/stop');
const queueSlash = require('./slash/queue');
const volumeSlash = require('./slash/volume');
const nowPlayingSlash = require('./slash/nowplaying');
const shuffleSlash = require('./slash/shuffle');
const loopSlash = require('./slash/loop');
const removeSlash = require('./slash/remove');
const clearSlash = require('./slash/clear');
const helpSlash = require('./slash/help');

const logger = new Logger('CommandLoader');

/**
 * Load text commands
 */
function loadCommands() {
    const commands = new Collection();
    
    const textCommands = [
        playCommand,
        pauseCommand,
        resumeCommand,
        skipCommand,
        stopCommand,
        queueCommand,
        volumeCommand,
        nowPlayingCommand,
        shuffleCommand,
        loopCommand,
        removeCommand,
        clearCommand,
        moveCommand,
        jumpCommand,
        leaveCommand,
        helpCommand,
        seekCommand,
        searchCommand,
        lyricsCommand
    ];

    for (const command of textCommands) {
        commands.set(command.name, command);
        logger.debug(`Loaded text command: ${command.name}`);
    }

    logger.info(`Loaded ${commands.size} text commands`);
    return commands;
}

/**
 * Load slash commands
 */
function loadSlashCommands() {
    const commands = new Collection();
    
    const slashCommands = [
        playSlash,
        pauseSlash,
        resumeSlash,
        skipSlash,
        stopSlash,
        queueSlash,
        volumeSlash,
        nowPlayingSlash,
        shuffleSlash,
        loopSlash,
        removeSlash,
        clearSlash,
        helpSlash
    ];

    for (const command of slashCommands) {
        commands.set(command.data.name, command);
        logger.debug(`Loaded slash command: ${command.data.name}`);
    }

    logger.info(`Loaded ${commands.size} slash commands`);
    return commands;
}

module.exports = { loadCommands, loadSlashCommands };
