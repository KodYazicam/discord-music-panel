/**
 * Help Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Specific command to get help for')
                .setRequired(false)),
    cooldown: 3,

    async execute(interaction, bot) {
        const commandName = interaction.options.getString('command');
        const prefix = bot.getPrefix(interaction.guild.id);

        if (commandName) {
            const command = bot.slashCommands.get(commandName);
            if (!command) {
                return interaction.reply({
                    embeds: [new EmbedBuilder().setColor(0xED4245).setDescription(`❌ Command \`${commandName}\` not found!`)],
                    ephemeral: true
                });
            }

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle(`📖 Command: /${command.data.name}`)
                    .setDescription(command.data.description)
                    .addFields({ name: 'Cooldown', value: `${command.cooldown || 3} seconds`, inline: true })]
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎵 Music Bot Commands')
            .setDescription(`Use slash commands (/) or prefix \`${prefix}\``)
            .addFields(
                { name: '🎵 Music', value: '`/play` `/pause` `/resume` `/skip` `/stop`' },
                { name: '📋 Queue', value: '`/queue` `/nowplaying` `/remove` `/clear`' },
                { name: '🔧 Control', value: '`/volume` `/loop` `/shuffle`' }
            )
            .setTimestamp()
            .setFooter({ text: `Requested by ${interaction.user.tag}` });

        const stats = bot.getStats();
        embed.addFields({
            name: '📊 Bot Stats',
            value: `Servers: ${stats.guildCount} | Playing: ${stats.playingCount} | Ping: ${stats.ping}ms`
        });

        return interaction.reply({ embeds: [embed] });
    }
};
