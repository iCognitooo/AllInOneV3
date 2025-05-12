const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const { addWarning } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Advierte a un usuario")
    .addUserOption((option) => option.setName("usuario").setDescription("Usuario a advertir").setRequired(true))
    .addStringOption((option) => option.setName("razon").setDescription("Razón de la advertencia").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("usuario")
      const reason = interaction.options.getString("razon")

      // Verificar si el usuario está en el servidor
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
      if (!member) {
        return interaction.reply({
          content: "No se pudo encontrar a ese usuario en el servidor.",
          ephemeral: true,
        })
      }

      // Verificar permisos
      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({
          content: "No puedes advertir a este usuario porque tiene un rol igual o superior al tuyo.",
          ephemeral: true,
        })
      }

      // Añadir advertencia
      const warningCount = await addWarning(targetUser.id, interaction.guild.id, interaction.user.id, reason)

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Usuario Advertido")
        .setDescription(`${targetUser.tag} ha sido advertido.`)
        .addFields(
          { name: "Usuario", value: `<@${targetUser.id}>`, inline: true },
          { name: "Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Advertencias", value: `${warningCount}`, inline: true },
          { name: "Razón", value: reason },
        )
        .setColor(colors.warning)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // Enviar DM al usuario advertido
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Has sido advertido en ${interaction.guild.name}`)
          .setDescription(`Has recibido una advertencia de un moderador.`)
          .addFields(
            { name: "Razón", value: reason, inline: true },
            { name: "Moderador", value: interaction.user.tag, inline: true },
            { name: "Advertencias Totales", value: `${warningCount}`, inline: true },
          )
          .setColor(colors.warning)
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
      } catch (error) {
        console.log(`No se pudo enviar DM a ${targetUser.tag}`)
      }

      // Registrar acción en logs
      const logger = require("../../utils/logger")
      logger.logModeration("warn", interaction.user, targetUser, reason, interaction.guild)
    } catch (error) {
      console.error("Error al advertir usuario:", error)
      await interaction.reply({
        content: "Hubo un error al advertir al usuario.",
        ephemeral: true,
      })
    }
  },
}
