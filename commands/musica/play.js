const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce música en un canal de voz")
    .addStringOption((option) =>
      option
        .setName("cancion")
        .setDescription("Nombre o URL de la canción a reproducir")
        .setRequired(true)
        .setAutocomplete(true),
    ),
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

    // Verificar permisos
    const permissions = voiceChannel.permissionsFor(interaction.client.user)
    if (!permissions.has("Connect") || !permissions.has("Speak")) {
      return interaction.reply({
        content: "Necesito permisos para unirme y hablar en tu canal de voz.",
        ephemeral: true,
      })
    }

    await interaction.deferReply()

    // Obtener la canción
    const query = interaction.options.getString("cancion")

    // Simulamos la reproducción de música (en un bot real, aquí se usaría una biblioteca como discord-player)
    // Crear un objeto de reproductor de música si no existe
    if (!interaction.client.musicPlayer) {
      interaction.client.musicPlayer = new Map()
    }

    // Obtener o crear la cola de reproducción para este servidor
    const guildQueue = interaction.client.musicPlayer.get(interaction.guild.id) || {
      voiceChannel: null,
      textChannel: null,
      connection: null,
      songs: [],
      volume: 50,
      playing: false,
    }

    // Simular búsqueda de canción
    const song = {
      title: query.includes("http") ? "Canción desde URL" : query,
      url: query.includes("http") ? query : `https://example.com/search?q=${encodeURIComponent(query)}`,
      duration: "3:45",
      thumbnail: "https://i.imgur.com/wSTFkRM.png",
      requestedBy: interaction.user.tag,
    }

    // Añadir canción a la cola
    guildQueue.songs.push(song)

    // Si no hay reproducción activa, iniciar
    if (!guildQueue.playing) {
      guildQueue.voiceChannel = voiceChannel
      guildQueue.textChannel = interaction.channel
      guildQueue.playing = true

      // Guardar la cola actualizada
      interaction.client.musicPlayer.set(interaction.guild.id, guildQueue)

      // Simular reproducción
      await playSong(interaction, guildQueue, song)
    } else {
      // Guardar la cola actualizada
      interaction.client.musicPlayer.set(interaction.guild.id, guildQueue)

      // Informar que se añadió a la cola
      const embed = new EmbedBuilder()
        .setTitle("🎵 Añadido a la Cola")
        .setDescription(`**[${song.title}](${song.url})**`)
        .addFields(
          { name: "Duración", value: song.duration, inline: true },
          { name: "Solicitado por", value: song.requestedBy, inline: true },
          { name: "Posición en cola", value: `${guildQueue.songs.length - 1}`, inline: true },
        )
        .setThumbnail(song.thumbnail)
        .setColor(colors.primary)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    }
  },

  // Autocompletado para búsqueda de canciones
  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused()

    // Simulamos resultados de búsqueda
    const choices = [
      "Despacito - Luis Fonsi",
      "Shape of You - Ed Sheeran",
      "Blinding Lights - The Weeknd",
      "Dance Monkey - Tones and I",
      "Believer - Imagine Dragons",
      "Bad Guy - Billie Eilish",
      "Uptown Funk - Mark Ronson ft. Bruno Mars",
      "Señorita - Shawn Mendes, Camila Cabello",
      "Memories - Maroon 5",
      "Someone You Loved - Lewis Capaldi",
    ]

    // Filtrar según lo que el usuario ha escrito
    const filtered = choices.filter((choice) => choice.toLowerCase().includes(focusedValue.toLowerCase()))

    // Responder con hasta 25 opciones
    await interaction.respond(filtered.map((choice) => ({ name: choice, value: choice })).slice(0, 25))
  },
}

async function playSong(interaction, queue, song) {
  try {
    // Crear embed para la canción actual
    const embed = new EmbedBuilder()
      .setTitle("🎵 Reproduciendo Ahora")
      .setDescription(`**[${song.title}](${song.url})**`)
      .addFields(
        { name: "Duración", value: song.duration, inline: true },
        { name: "Solicitado por", value: song.requestedBy, inline: true },
        { name: "Canal de voz", value: queue.voiceChannel.name, inline: true },
      )
      .setThumbnail(song.thumbnail)
      .setColor(colors.primary)
      .setFooter({ text: `Volumen: ${queue.volume}%`, iconURL: interaction.guild.iconURL() })
      .setTimestamp()

    await interaction.editReply({ embeds: [embed] })

    // Simular finalización de la canción después de un tiempo
    setTimeout(() => {
      // Eliminar la canción reproducida
      queue.songs.shift()

      // Verificar si hay más canciones en la cola
      if (queue.songs.length > 0) {
        playSong(interaction, queue, queue.songs[0])
      } else {
        // No hay más canciones, finalizar reproducción
        queue.playing = false
        interaction.client.musicPlayer.set(interaction.guild.id, queue)

        // Informar que la cola ha terminado
        const endEmbed = new EmbedBuilder()
          .setTitle("🎵 Cola Finalizada")
          .setDescription("No hay más canciones en la cola.")
          .setColor(colors.primary)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        interaction.channel.send({ embeds: [endEmbed] }).catch(console.error)
      }
    }, 10000) // Simulamos 10 segundos de reproducción
  } catch (error) {
    console.error("Error al reproducir canción:", error)

    // Informar del error
    await interaction.channel
      .send({
        content: "Ocurrió un error al reproducir la canción.",
      })
      .catch(console.error)

    // Limpiar la cola
    queue.songs = []
    queue.playing = false
    interaction.client.musicPlayer.set(interaction.guild.id, queue)
  }
}
