const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Pausa la canción que se está reproduciendo actualmente"),

  async execute(interaction) {
    // Verificar si el usuario está en un canal de voz
    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: "❌ Debes estar en un canal de voz para usar este comando.",
        ephemeral: true,
      })
    }

    // Verificar si el bot está reproduciendo música
    const queue = interaction.client.distube?.getQueue(interaction.guildId)

    if (!queue) {
      return interaction.reply({
        content: "❌ No hay música reproduciéndose actualmente.",
        ephemeral: true,
      })
    }

    // Verificar si el usuario está en el mismo canal de voz que el bot
    if (
      interaction.guild.members.me.voice.channelId &&
      interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId
    ) {
      return interaction.reply({
        content: "❌ Debes estar en el mismo canal de voz que yo para usar este comando.",
        ephemeral: true,
      })
    }

    // Verificar si la música ya está pausada
    if (queue.paused) {
      return interaction.reply({
        content: "⚠️ La música ya está pausada. Usa `/resume` para reanudarla.",
        ephemeral: true,
      })
    }

    // Pausar la música
    try {
      queue.pause()

      const embed = new EmbedBuilder()
        .setTitle("⏸️ Música Pausada")
        .setDescription(`La reproducción ha sido pausada por ${interaction.user}`)
        .setColor(colors.primary)
        .setFooter({ text: "Usa /resume para reanudar la reproducción" })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      console.error("Error al pausar la música:", error)
      await interaction.reply({
        content: "❌ Ocurrió un error al intentar pausar la música.",
        ephemeral: true,
      })
    }
  },
}
