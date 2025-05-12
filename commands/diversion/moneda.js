const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moneda")
    .setDescription("Lanza una moneda al aire")
    .addIntegerOption((option) =>
      option
        .setName("veces")
        .setDescription("Número de veces que lanzar la moneda (1-20)")
        .setMinValue(1)
        .setMaxValue(20)
        .setRequired(false),
    ),

  cooldown: 3,

  async execute(interaction) {
    const veces = interaction.options.getInteger("veces") || 1

    const resultados = []
    let caras = 0
    let cruces = 0

    for (let i = 0; i < veces; i++) {
      const resultado = Math.random() < 0.5 ? "cara" : "cruz"
      resultados.push(resultado)

      if (resultado === "cara") caras++
      else cruces++
    }

    const embed = new EmbedBuilder()
      .setTitle(`🪙 Lanzamiento de ${veces === 1 ? "una moneda" : `${veces} monedas`}`)
      .setColor(colors.primary)
      .setTimestamp()

    if (veces === 1) {
      const resultado = resultados[0]
      embed
        .setDescription(`La moneda cayó en: **${resultado.charAt(0).toUpperCase() + resultado.slice(1)}**`)
        .setThumbnail(resultado === "cara" ? "https://i.imgur.com/HAvGDfl.png" : "https://i.imgur.com/XnAHEie.png")
    } else {
      embed
        .setDescription(`Resultados de los ${veces} lanzamientos:`)
        .addFields(
          { name: "Caras", value: `${caras} (${((caras / veces) * 100).toFixed(1)}%)`, inline: true },
          { name: "Cruces", value: `${cruces} (${((cruces / veces) * 100).toFixed(1)}%)`, inline: true },
        )

      // Si son menos de 10 lanzamientos, mostrar cada resultado
      if (veces <= 10) {
        embed.addFields({
          name: "Detalle",
          value: resultados
            .map(
              (r, i) =>
                `Lanzamiento ${i + 1}: **${r.charAt(0).toUpperCase() + r.slice(1)}** ${r === "cara" ? "(🟡)" : "(⚪)"}`,
            )
            .join("\n"),
        })
      }

      // Añadir una visualización gráfica simple para cualquier número de lanzamientos
      const caraEmoji = "🟡"
      const cruzEmoji = "⚪"

      let visualizacion = ""
      for (let i = 0; i < Math.min(veces, 20); i++) {
        visualizacion += resultados[i] === "cara" ? caraEmoji : cruzEmoji
      }

      embed.addFields({ name: "Visualización", value: visualizacion })
    }

    await interaction.reply({ embeds: [embed] })
  },
}
