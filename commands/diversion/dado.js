const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dado")
    .setDescription("Lanza uno o varios dados")
    .addIntegerOption((option) =>
      option
        .setName("caras")
        .setDescription("Número de caras del dado (2-100)")
        .setMinValue(2)
        .setMaxValue(100)
        .setRequired(false),
    )
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de dados a lanzar (1-10)")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false),
    ),

  cooldown: 3,

  async execute(interaction) {
    const caras = interaction.options.getInteger("caras") || 6
    const cantidad = interaction.options.getInteger("cantidad") || 1

    const resultados = []
    let total = 0

    for (let i = 0; i < cantidad; i++) {
      const resultado = Math.floor(Math.random() * caras) + 1
      resultados.push(resultado)
      total += resultado
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎲 Lanzamiento de ${cantidad} ${cantidad === 1 ? "dado" : "dados"} de ${caras} caras`)
      .setColor(colors.primary)
      .setTimestamp()

    if (cantidad === 1) {
      embed.setDescription(`El resultado es: **${resultados[0]}**`)

      // Añadir representación visual para dados estándar
      if (caras === 6) {
        embed.addFields({
          name: "Representación",
          value: getDiceEmoji(resultados[0]),
        })
      }
    } else {
      embed
        .setDescription(`Resultados: ${resultados.map((r, i) => `Dado ${i + 1}: **${r}**`).join("\n")}`)
        .addFields({ name: "Total", value: `**${total}**` })

      // Si son dados de 6 caras, mostrar emojis
      if (caras === 6) {
        embed.addFields({
          name: "Representación",
          value: resultados.map((r) => getDiceEmoji(r)).join(" "),
        })
      }

      // Añadir estadísticas si hay más de un dado
      const min = Math.min(...resultados)
      const max = Math.max(...resultados)
      const avg = (total / cantidad).toFixed(2)

      embed.addFields({
        name: "Estadísticas",
        value: `Mínimo: **${min}**\nMáximo: **${max}**\nPromedio: **${avg}**`,
      })
    }

    await interaction.reply({ embeds: [embed] })
  },
}

function getDiceEmoji(value) {
  const diceEmojis = {
    1: "⚀",
    2: "⚁",
    3: "⚂",
    4: "⚃",
    5: "⚄",
    6: "⚅",
  }

  return diceEmojis[value] || `[${value}]`
}
