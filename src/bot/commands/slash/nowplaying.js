/**
 * Now Playing Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing track'),
    cooldown: 3,

    async execute(interaction, bot) {
        const queue = bot.queues.get(interaction.guild.id);
        
        if (!queue || !queue.currentTrack) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xFEE75C).setDescription('🎵 Nothing is playing right now!')]
            });
        }

        const track = queue.currentTrack;
        const embed = queue.createNowPlayingEmbed(track);
        
        return interaction.reply({ embeds: [embed] });
    }
};
