const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("8ball")
    .setDescription("Pregunta a la bola 8 mágica")
    .addStringOption((option) =>
      option.setName("pregunta").setDescription("La pregunta que quieres hacer").setRequired(true),
    ),
  cooldown: 5,
  async execute(interaction) {
    const question = interaction.options.getString("pregunta")

    const responses = [
      "Es cierto.",
      "Es decididamente así.",
      "Sin duda.",
      "Sí, definitivamente.",
      "Puedes confiar en ello.",
      "Como yo lo veo, sí.",
      "Probablemente.",
      "Las perspectivas son buenas.",
      "Sí.",
      "Las señales apuntan a que sí.",
      "Respuesta confusa, intenta de nuevo.",
      "Pregunta de nuevo más tarde.",
      "Mejor no decirte ahora.",
      "No puedo predecirlo ahora.",
      "Concéntrate y pregunta de nuevo.",
      "No cuentes con ello.",
      "Mi respuesta es no.",
      "Mis fuentes dicen que no.",
      "Las perspectivas no son buenas.",
      "Muy dudoso.",
    ]

    const response = responses[Math.floor(Math.random() * responses.length)]

    const embed = new EmbedBuilder()
      .setTitle("🎱 La Bola 8 Mágica")
      .addFields({ name: "Pregunta", value: question }, { name: "Respuesta", value: response })
      .setColor(colors.primary)
      .setFooter({ text: `Preguntado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
