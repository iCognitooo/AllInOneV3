const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Elimina mensajes del canal actual")
    .addIntegerOption((option) =>
      option
        .setName("cantidad")
        .setDescription("Cantidad de mensajes a eliminar (1-100)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100),
    )
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Eliminar mensajes solo de este usuario").setRequired(false),
    )
    .addBooleanOption((option) =>
      option.setName("silencioso").setDescription("No mostrar confirmación").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  async execute(interaction) {
    try {
      const amount = interaction.options.getInteger("cantidad")
      const user = interaction.options.getUser("usuario")
      const silent = interaction.options.getBoolean("silencioso") || false

      await interaction.deferReply({ ephemeral: silent })

      // Obtener mensajes
      const messages = await interaction.channel.messages.fetch({ limit: 100 })

      // Filtrar mensajes si se especificó un usuario
      let filteredMessages = messages
      if (user) {
        filteredMessages = messages.filter((m) => m.author.id === user.id)
      }

      // Limitar a la cantidad especificada
      const messagesToDelete = filteredMessages.first(amount)

      if (messagesToDelete.length === 0) {
        return interaction.editReply("No se encontraron mensajes para eliminar.")
      }

      // Eliminar mensajes
      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true)

      // Crear embed de confirmación
      const embed = new EmbedBuilder()
        .setTitle("🧹 Mensajes Eliminados")
        .setDescription(`Se han eliminado ${deleted.size} mensajes.`)
        .setColor(colors.success)
        .setFooter({ text: `Solicitado por ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp()

      if (user) {
        embed.addFields({ name: "Usuario", value: `${user.tag} (${user.id})`, inline: true })
      }

      await interaction.editReply({ embeds: [embed] })

      // Registrar acción en logs
      const logger = require("../../utils/logger")
      logger.logModeration(
        "clear",
        interaction.user,
        user || { tag: "Todos los usuarios", id: "N/A" },
        `${deleted.size} mensajes eliminados en #${interaction.channel.name}`,
        interaction.guild,
      )
    } catch (error) {
      console.error("Error al eliminar mensajes:", error)
      await interaction.editReply(
        "Hubo un error al eliminar los mensajes. Recuerda que no se pueden eliminar mensajes con más de 14 días de antigüedad.",
      )
    }
  },
}
