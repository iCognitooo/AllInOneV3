const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const ms = require("ms")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Silencia a un usuario")
    .addUserOption((option) => option.setName("usuario").setDescription("Usuario a silenciar").setRequired(true))
    .addStringOption((option) =>
      option.setName("duracion").setDescription("Duración del silencio (ej: 10m, 1h, 1d)").setRequired(true),
    )
    .addStringOption((option) => option.setName("razon").setDescription("Razón del silencio").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("usuario")
      const durationString = interaction.options.getString("duracion")
      const reason = interaction.options.getString("razon") || "No se proporcionó una razón"

      // Convertir duración a milisegundos
      const duration = ms(durationString)
      if (!duration || duration < 1000 || duration > 2419200000) {
        // Máximo 28 días según Discord
        return interaction.reply({
          content: "Duración inválida. Usa un formato como '10s', '5m', '1h', '1d'. La duración máxima es de 28 días.",
          ephemeral: true,
        })
      }

      // Obtener miembro
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null)
      if (!member) {
        return interaction.reply({
          content: "No se pudo encontrar a ese usuario en el servidor.",
          ephemeral: true,
        })
      }

      // Verificar permisos
      if (!member.moderatable) {
        return interaction.reply({
          content:
            "No puedo silenciar a este usuario. Es posible que tenga un rol más alto que el mío o que yo no tenga permisos para silenciar.",
          ephemeral: true,
        })
      }

      if (interaction.member.roles.highest.position <= member.roles.highest.position) {
        return interaction.reply({
          content: "No puedes silenciar a este usuario porque tiene un rol igual o superior al tuyo.",
          ephemeral: true,
        })
      }

      // Silenciar usuario
      await member.timeout(duration, `${reason} (Por ${interaction.user.tag})`)

      // Crear embed de confirmación
      const embed = new EmbedBuilder()
        .setTitle("Usuario Silenciado")
        .setDescription(`${targetUser.tag} ha sido silenciado.`)
        .addFields(
          { name: "Usuario", value: `<@${targetUser.id}>`, inline: true },
          { name: "Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Duración", value: durationString, inline: true },
          { name: "Razón", value: reason },
        )
        .setColor(colors.warning)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // Enviar DM al usuario silenciado
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Has sido silenciado en ${interaction.guild.name}`)
          .setDescription(`Has sido silenciado por un moderador.`)
          .addFields(
            { name: "Duración", value: durationString, inline: true },
            { name: "Razón", value: reason, inline: true },
            { name: "Moderador", value: interaction.user.tag },
          )
          .setColor(colors.warning)
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
      } catch (error) {
        console.log(`No se pudo enviar DM a ${targetUser.tag}`)
      }

      // Registrar acción en logs
      const logger = require("../../utils/logger")
      logger.logModeration("mute", interaction.user, targetUser, `${reason} (${durationString})`, interaction.guild)
    } catch (error) {
      console.error("Error al silenciar usuario:", error)
      await interaction.reply({
        content: "Hubo un error al silenciar al usuario.",
        ephemeral: true,
      })
    }
  },
}
