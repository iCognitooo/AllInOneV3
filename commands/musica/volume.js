const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("Ajusta el volumen de la música")
    .addIntegerOption((option) =>
      option
        .setName("nivel")
        .setDescription("Nivel de volumen (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    ),

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

    // Obtener el nivel de volumen
    const volumeLevel = interaction.options.getInteger("nivel")

    // Ajustar el volumen
    try {
      const previousVolume = queue.volume
      queue.setVolume(volumeLevel)

      // Determinar si el volumen aumentó o disminuyó
      const volumeChanged = volumeLevel > previousVolume ? "aumentado" : "disminuido"
      const emoji = volumeLevel > previousVolume ? "🔊" : "🔉"

      // Crear una barra de volumen visual
      const volumeBar = createVolumeBar(volumeLevel)

      const embed = new EmbedBuilder()
        .setTitle(`${emoji} Volumen ${volumeChanged}`)
        .setDescription(`El volumen ha sido ajustado a **${volumeLevel}%**\n\n${volumeBar}`)
        .setColor(colors.primary)
        .setFooter({ text: `Ajustado por ${interaction.user.tag}` })
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      console.error("Error al ajustar el volumen:", error)
      await interaction.reply({
        content: "❌ Ocurrió un error al intentar ajustar el volumen.",
        ephemeral: true,
      })
    }
  },
}

// Función para crear una barra visual del volumen
function createVolumeBar(volume) {
  const barLength = 20
  const filledBars = Math.round((volume / 100) * barLength)
  const emptyBars = barLength - filledBars

  let volumeBar = ""

  // Determinar el emoji para el indicador de volumen
  let volumeEmoji
  if (volume === 0) volumeEmoji = "🔇"
  else if (volume < 30) volumeEmoji = "🔈"
  else if (volume < 70) volumeEmoji = "🔉"
  else volumeEmoji = "🔊"

  // Crear la barra
  volumeBar += volumeEmoji + " "
  volumeBar += "█".repeat(filledBars)
  volumeBar += "░".repeat(emptyBars)
  volumeBar += ` ${volume}%`

  return volumeBar
}
