const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder().setName("stop").setDescription("Detiene la reproducción y limpia la cola"),
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

    // Limpiar la cola y detener reproducción
    queue.songs = []
    queue.playing = false

    // Guardar la cola actualizada
    interaction.client.musicPlayer.set(interaction.guild.id, queue)

    // Crear embed de confirmación
    const embed = new EmbedBuilder()
      .setTitle("⏹️ Reproducción Detenida")
      .setDescription("Se ha detenido la reproducción y se ha limpiado la cola.")
      .setColor(colors.error)
      .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
