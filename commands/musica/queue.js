const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder().setName("queue").setDescription("Muestra la cola de reproducción actual"),
  cooldown: 3,
  async execute(interaction) {
    // Verificar si hay un reproductor de música
    if (!interaction.client.musicPlayer) {
      return interaction.reply({
        content: "No hay ninguna reproducción activa.",
        ephemeral: true,
      })
    }

    // Obtener la cola de este servidor
    const queue = interaction.client.musicPlayer.get(interaction.guild.id)

    if (!queue || !queue.songs || queue.songs.length === 0) {
      return interaction.reply({
        content: "No hay canciones en la cola de reproducción.",
        ephemeral: true,
      })
    }

    // Crear embed con la cola
    const embed = new EmbedBuilder()
      .setTitle("🎵 Cola de Reproducción")
      .setColor(colors.primary)
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
      .setTimestamp()

    // Añadir canción actual
    const currentSong = queue.songs[0]
    embed.addFields({
      name: "🎧 Reproduciendo Ahora",
      value: `**[${currentSong.title}](${currentSong.url})** | \`${currentSong.duration}\` | Solicitado por: ${currentSong.requestedBy}`,
    })

    // Añadir próximas canciones (hasta 10)
    if (queue.songs.length > 1) {
      let queueText = ""
      const displayedSongs = queue.songs.slice(1, 11) // Mostrar hasta 10 canciones

      displayedSongs.forEach((song, index) => {
        queueText += `**${index + 1}.** [${song.title}](${song.url}) | \`${song.duration}\` | ${song.requestedBy}\n`
      })

      // Si hay más canciones, indicarlo
      if (queue.songs.length > 11) {
        queueText += `\n*Y ${queue.songs.length - 11} canciones más...*`
      }

      embed.addFields({
        name: "📋 Próximas Canciones",
        value: queueText,
      })
    } else {
      embed.addFields({
        name: "📋 Próximas Canciones",
        value: "*No hay canciones en espera*",
      })
    }

    // Añadir información adicional
    embed.addFields({
      name: "🔊 Información",
      value: `**Canal de voz:** ${queue.voiceChannel.name}\n**Volumen:** ${queue.volume}%\n**Total de canciones:** ${queue.songs.length}`,
    })

    await interaction.reply({ embeds: [embed] })
  },
}
