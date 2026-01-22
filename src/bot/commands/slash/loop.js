/**
 * Loop Slash Command
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Toggle loop mode')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Loop mode')
                .setRequired(false)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )),
    cooldown: 2,

    async execute(interaction, bot) {
        const voiceChannel = interaction.member?.voice?.channel;
        if (!voiceChannel) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ You must be in a voice channel!')],
                ephemeral: true
            });
        }

        const queue = bot.queues.get(interaction.guild.id);
        if (!queue) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor(0xED4245).setDescription('❌ No active queue!')],
                ephemeral: true
            });
        }

        let mode = interaction.options.getString('mode');
        if (!mode) {
            if (!queue.loop && !queue.loopQueue) mode = 'track';
            else if (queue.loop) mode = 'queue';
            else mode = 'off';
        }

        const result = bot.setLoop(interaction.guild.id, mode);
        let emoji, text;
        switch (mode) {
            case 'off': emoji = '➡️'; text = 'Loop disabled'; break;
            case 'track': emoji = '🔂'; text = 'Looping current track'; break;
            case 'queue': emoji = '🔁'; text = 'Looping entire queue'; break;
        }
        
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setColor(result.success ? 0x57F287 : 0xED4245)
                .setDescription(result.success ? `${emoji} ${text}` : `❌ ${result.message}`)]
        });
    }
};
