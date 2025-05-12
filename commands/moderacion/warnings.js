const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const { getWarnings } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Muestra las advertencias de un usuario")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario del que quieres ver las advertencias").setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,
  async execute(interaction) {
    try {
      const targetUser = interaction.options.getUser("usuario")

      // Obtener advertencias
      const warnings = await getWarnings(targetUser.id, interaction.guild.id)

      if (warnings.length === 0) {
        return interaction.reply(`${targetUser.tag} no tiene advertencias.`)
      }

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle(`Advertencias de ${targetUser.tag}`)
        .setDescription(`${targetUser.tag} tiene ${warnings.length} advertencia(s).`)
        .setColor(colors.warning)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `ID: ${targetUser.id}`, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Añadir hasta 10 advertencias al embed
      const displayWarnings = warnings.slice(0, 10)
      for (let i = 0; i < displayWarnings.length; i++) {
        const warning = displayWarnings[i]
        const moderator = await interaction.client.users
          .fetch(warning.moderator_id)
          .catch(() => ({ tag: "Desconocido" }))
        const date = new Date(warning.created_at).toLocaleString()

        embed.addFields({
          name: `Advertencia ${i + 1} (${date})`,
          value: `**Razón:** ${warning.reason}\n**Moderador:** ${moderator.tag}`,
        })
      }

      if (warnings.length > 10) {
        embed.addFields({
          name: "Advertencias adicionales",
          value: `Y ${warnings.length - 10} más...`,
        })
      }

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      console.error("Error al obtener advertencias:", error)
      await interaction.reply({
        content: "Hubo un error al obtener las advertencias.",
        ephemeral: true,
      })
    }
  },
}
