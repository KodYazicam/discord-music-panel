/**
 * Jump Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jump')
        .setDescription('Jump to a specific track in the queue')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('Track number in the queue (1-based)')
                .setRequired(true)
                .setMinValue(1)),
    cooldown: 2,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const index = interaction.options.getInteger('number') - 1;
        const result = bot.jumpTo(interaction.guild.id, index);

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? `⏭️ Jumped to track #${index + 1}` : `❌ ${result.message}`)]
        });
    }
};
