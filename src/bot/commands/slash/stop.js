/**
 * Stop Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),
    cooldown: 2,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const result = bot.stopPlayback(interaction.guild.id);
        
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? '⏹️ Stopped the music and cleared the queue' : `❌ ${result.message}`)]
        });
    }
};
