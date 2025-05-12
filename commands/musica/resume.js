const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder().setName("resume").setDescription("Reanuda la canción que está pausada actualmente"),

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

    // Verificar si la música ya está reproduciéndose
    if (!queue.paused) {
      return interaction.reply({
        content: "⚠️ La música ya está reproduciéndose. Usa `/pause` para pausarla.",
        ephemeral: true,
      })
    }

    // Reanudar la música
    try {
      queue.resume()

      const embed = new EmbedBuilder()
        .setTitle("▶️ Música Reanudada")
        .setDescription(`La reproducción ha sido reanudada por ${interaction.user}`)
        .setColor(colors.primary)
        .setFooter({ text: "Disfruta de la música" })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      console.error("Error al reanudar la música:", error)
      await interaction.reply({
        content: "❌ Ocurrió un error al intentar reanudar la música.",
        ephemeral: true,
      })
    }
  },
}
