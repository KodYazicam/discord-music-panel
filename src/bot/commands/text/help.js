/**
 * Help Command - Show all available commands
 */

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    aliases: ['h', 'yardim', 'komutlar', 'commands'],
    description: 'Show all available commands',
    usage: '[command]',
    cooldown: 3,

    async execute(message, args, bot) {
        const prefix = bot.getPrefix(message.guild.id);

        // Show specific command help
        if (args.length) {
            const commandName = args[0].toLowerCase();
            const command = bot.commands.get(commandName) 
                || bot.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

            if (!command) {
                return message.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(0xED4245)
                            .setDescription(`❌ Command \`${commandName}\` not found!`)
                    ]
                });
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📖 Command: ${command.name}`)
                .setDescription(command.description || 'No description')
                .addFields(
                    { name: 'Usage', value: `\`${prefix}${command.name} ${command.usage || ''}\``, inline: true },
                    { name: 'Cooldown', value: `${command.cooldown || 3} seconds`, inline: true }
                );

            if (command.aliases?.length) {
                embed.addFields({ name: 'Aliases', value: command.aliases.map(a => `\`${a}\``).join(', ') });
            }

            if (command.examples?.length) {
                embed.addFields({ name: 'Examples', value: command.examples.map(e => `\`${prefix}${e}\``).join('\n') });
            }

            return message.reply({ embeds: [embed] });
        }

        // Show all commands
        const categories = {
            '🎵 Music': ['play', 'pause', 'resume', 'skip', 'stop', 'queue', 'nowplaying'],
            '🔊 Audio': ['volume', 'loop', 'shuffle'],
            '📋 Queue': ['remove', 'clear', 'move', 'jump', 'search'],
            '🔧 Utility': ['help', 'leave', 'seek', 'lyrics']
        };

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Music Bot Commands')
            .setDescription(`Use \`${prefix}help <command>\` for more info on a command.\nPrefix: \`${prefix}\``)
            .setTimestamp()
            .setFooter({ text: `Requested by ${message.author.tag}`, iconURL: message.author.displayAvatarURL() });

        for (const [category, commands] of Object.entries(categories)) {
            const commandList = commands
                .filter(cmd => bot.commands.has(cmd))
                .map(cmd => `\`${cmd}\``)
                .join(', ');
            
            if (commandList) {
                embed.addFields({ name: category, value: commandList });
            }
        }

        // Add bot info
        const stats = bot.getStats();
        embed.addFields({
            name: '📊 Bot Stats',
            value: `Servers: ${stats.guildCount} | Playing: ${stats.playingCount} | Uptime: ${formatUptime(stats.uptime)}`
        });

        return message.reply({ embeds: [embed] });
    }
};

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}
