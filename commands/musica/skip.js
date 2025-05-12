const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder().setName("skip").setDescription("Salta a la siguiente canción en la cola"),
  cooldown: 3,
  async execute(interaction) {
    // Verificar si el usuario está en un canal de voz
    const voiceChannel = interaction.member.voice.channel
    if (!voiceChannel) {
      return interaction.reply({
        content: "Debes estar en un canal de voz para usar este comando.",
        ephemeral: true,
      })
    }

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

    // Verificar si el usuario está en el mismo canal que el bot
    if (queue.voiceChannel.id !== voiceChannel.id) {
      return interaction.reply({
        content: "Debes estar en el mismo canal de voz que el bot para usar este comando.",
        ephemeral: true,
      })
    }

    // Obtener la canción que se va a saltar
    const skippedSong = queue.songs[0]

    // Crear embed de confirmación
    const embed = new EmbedBuilder()
      .setTitle("⏭️ Canción Saltada")
      .setDescription(`Se ha saltado **[${skippedSong.title}](${skippedSong.url})**`)
      .setColor(colors.primary)
      .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()

    // Verificar si hay más canciones en la cola
    if (queue.songs.length > 1) {
      const nextSong = queue.songs[1]
      embed.addFields({
        name: "🎵 Siguiente Canción",
        value: `**[${nextSong.title}](${nextSong.url})**`,
      })
    } else {
      embed.addFields({
        name: "🎵 Siguiente Canción",
        value: "*No hay más canciones en la cola*",
      })
    }

    // Simular salto de canción
    queue.songs.shift()

    // Verificar si hay más canciones
    if (queue.songs.length > 0) {
      // Simular reproducción de la siguiente canción
      setTimeout(() => {
        const newSong = queue.songs[0]

        // Crear embed para la nueva canción
        const newSongEmbed = new EmbedBuilder()
          .setTitle("🎵 Reproduciendo Ahora")
          .setDescription(`**[${newSong.title}](${newSong.url})**`)
          .addFields(
            { name: "Duración", value: newSong.duration, inline: true },
            { name: "Solicitado por", value: newSong.requestedBy, inline: true },
            { name: "Canal de voz", value: queue.voiceChannel.name, inline: true },
          )
          .setThumbnail(newSong.thumbnail)
          .setColor(colors.primary)
          .setFooter({ text: `Volumen: ${queue.volume}%`, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        interaction.channel.send({ embeds: [newSongEmbed] }).catch(console.error)
      }, 1000)
    } else {
      // No hay más canciones
      queue.playing = false

      // Informar que la cola ha terminado
      setTimeout(() => {
        const endEmbed = new EmbedBuilder()
          .setTitle("🎵 Cola Finalizada")
          .setDescription("No hay más canciones en la cola.")
          .setColor(colors.primary)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        interaction.channel.send({ embeds: [endEmbed] }).catch(console.error)
      }, 1000)
    }

    // Guardar la cola actualizada
    interaction.client.musicPlayer.set(interaction.guild.id, queue)

    await interaction.reply({ embeds: [embed] })
  },
}
