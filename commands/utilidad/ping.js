const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder().setName("ping").setDescription("Responde con la latencia del bot"),
  cooldown: 5,
  async execute(interaction) {
    const sent = await interaction.deferReply({ fetchReply: true })
    const latency = sent.createdTimestamp - interaction.createdTimestamp
    const apiLatency = Math.round(interaction.client.ws.ping)

    const embed = new EmbedBuilder()
      .setTitle("🏓 Pong!")
      .setDescription("Información de latencia del bot")
      .addFields(
        { name: "Latencia del Bot", value: `${latency}ms`, inline: true },
        { name: "Latencia de la API", value: `${apiLatency}ms`, inline: true },
      )
      .setColor(colors.primary)
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })
  },
}
