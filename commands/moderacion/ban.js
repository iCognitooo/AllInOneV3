const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banea a un usuario del servidor")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("El usuario que quieres banear").setRequired(true),
    )
    .addStringOption((option) => option.setName("razon").setDescription("La razón del baneo").setRequired(false))
    .addIntegerOption((option) =>
      option
        .setName("dias")
        .setDescription("Número de días para eliminar mensajes (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,
  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario")
    const reason = interaction.options.getString("razon") || "No se proporcionó una razón"
    const days = interaction.options.getInteger("dias") || 1

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

    // Verificar si el usuario puede ser baneado
    if (targetMember) {
      if (!targetMember.bannable) {
        return interaction.reply({
          content:
            "No puedo banear a este usuario. Es posible que tenga un rol más alto que el mío o que yo no tenga permisos para banear.",
          ephemeral: true,
        })
      }

      if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
        return interaction.reply({
          content: "No puedes banear a este usuario porque tiene un rol igual o superior al tuyo.",
          ephemeral: true,
        })
      }
    }

    try {
      await interaction.guild.members.ban(targetUser, {
        deleteMessageDays: days,
        reason: `${reason} (Baneado por ${interaction.user.tag})`,
      })

      const embed = new EmbedBuilder()
        .setTitle("Usuario Baneado")
        .setDescription(`${targetUser.tag} ha sido baneado del servidor.`)
        .addFields(
          { name: "Usuario", value: `<@${targetUser.id}>`, inline: true },
          { name: "Moderador", value: `<@${interaction.user.id}>`, inline: true },
          { name: "Razón", value: reason },
        )
        .setColor(colors.error)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // Enviar DM al usuario baneado
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle(`Has sido baneado de ${interaction.guild.name}`)
          .setDescription(`Has sido baneado por un moderador.`)
          .addFields({ name: "Razón", value: reason }, { name: "Moderador", value: interaction.user.tag })
          .setColor(colors.error)
          .setTimestamp()

        await targetUser.send({ embeds: [dmEmbed] })
      } catch (error) {
        console.log(`No se pudo enviar DM a ${targetUser.tag}`)
      }
    } catch (error) {
      console.error(error)
      await interaction.reply({
        content: "Hubo un error al intentar banear al usuario.",
        ephemeral: true,
      })
    }
  },
}
