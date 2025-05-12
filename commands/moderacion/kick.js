const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")
const { colors } = require("../../config.json")
const { logModAction } = require("../../utils/data-manager")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsa a un usuario del servidor")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario que quieres expulsar").setRequired(true),
    )
    .addStringOption((option) => option.setName("razon").setDescription("Razón de la expulsión").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("usuario")
    const reason = interaction.options.getString("razon") || "No se proporcionó una razón"

    // Verificar si el bot tiene permisos para expulsar
    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.KickMembers)) {
      return interaction.reply({
        content: "❌ No tengo permisos para expulsar miembros en este servidor.",
        ephemeral: true,
      })
    }

    // Obtener el miembro a expulsar
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null)

    // Verificar si el miembro existe
    if (!targetMember) {
      return interaction.reply({
        content: "❌ No se encontró al usuario en este servidor.",
        ephemeral: true,
      })
    }

    // Verificar si el bot puede expulsar al miembro (jerarquía de roles)
    if (!targetMember.kickable) {
      return interaction.reply({
        content:
          "❌ No puedo expulsar a este usuario. Puede que tenga un rol más alto que el mío o que sea el propietario del servidor.",
        ephemeral: true,
      })
    }

    // Verificar si el moderador tiene un rol más alto que el miembro a expulsar
    if (interaction.member.roles.highest.position <= targetMember.roles.highest.position) {
      return interaction.reply({
        content: "❌ No puedes expulsar a este usuario porque tiene un rol igual o superior al tuyo.",
        ephemeral: true,
      })
    }

    // Crear embed de confirmación
    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ Confirmación de Expulsión")
      .setDescription(`¿Estás seguro de que quieres expulsar a **${targetUser.tag}**?`)
      .addFields(
        { name: "Usuario", value: `${targetUser} (${targetUser.id})`, inline: true },
        { name: "Razón", value: reason, inline: true },
      )
      .setColor(colors.warning)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .setFooter({ text: "Esta acción quedará registrada en los logs de moderación" })
      .setTimestamp()

    // Enviar mensaje de confirmación
    await interaction.reply({ embeds: [confirmEmbed], ephemeral: true })

    // Preguntar si está seguro
    const filter = (i) => i.user.id === interaction.user.id
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 30000 })

    collector.on("collect", async (i) => {
      if (i.customId === "confirm-kick") {
        // Intentar expulsar al usuario
        try {
          await targetMember.kick(`${reason} | Por: ${interaction.user.tag}`)

          // Crear embed de éxito
          const successEmbed = new EmbedBuilder()
            .setTitle("✅ Usuario Expulsado")
            .setDescription(`**${targetUser.tag}** ha sido expulsado del servidor.`)
            .addFields(
              { name: "Moderador", value: `${interaction.user} (${interaction.user.id})`, inline: true },
              { name: "Razón", value: reason, inline: true },
            )
            .setColor(colors.success)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setTimestamp()

          await i.update({ embeds: [successEmbed], components: [] })

          // Registrar acción en los logs
          try {
            await logModAction(interaction.guild.id, {
              type: "kick",
              userId: targetUser.id,
              userTag: targetUser.tag,
              moderatorId: interaction.user.id,
              moderatorTag: interaction.user.tag,
              reason: reason,
              timestamp: new Date(),
            })
          } catch (logError) {
            console.error("Error al registrar acción de moderación:", logError)
          }

          // Intentar enviar DM al usuario
          try {
            const dmEmbed = new EmbedBuilder()
              .setTitle(`Has sido expulsado de ${interaction.guild.name}`)
              .setDescription(`**Razón:** ${reason}`)
              .setColor(colors.warning)
              .setFooter({ text: `Moderador: ${interaction.user.tag}` })
              .setTimestamp()

            await targetUser.send({ embeds: [dmEmbed] }).catch(() => {
              // Ignorar errores al enviar DM (usuario puede tener DMs cerrados)
            })
          } catch (dmError) {
            // Ignorar errores al enviar DM
          }
        } catch (error) {
          console.error("Error al expulsar usuario:", error)
          await i.update({
            content: "❌ Ocurrió un error al intentar expulsar al usuario. Verifica mis permisos e inténtalo de nuevo.",
            embeds: [],
            components: [],
            ephemeral: true,
          })
        }
      } else if (i.customId === "cancel-kick") {
        // Cancelar expulsión
        const cancelEmbed = new EmbedBuilder()
          .setTitle("❌ Expulsión Cancelada")
          .setDescription(`La expulsión de **${targetUser.tag}** ha sido cancelada.`)
          .setColor(colors.error)
          .setTimestamp()

        await i.update({ embeds: [cancelEmbed], components: [], ephemeral: true })
      }

      collector.stop()
    })

    collector.on("end", async (collected) => {
      if (collected.size === 0) {
        // Tiempo expirado
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏱️ Tiempo Expirado")
          .setDescription("La confirmación de expulsión ha expirado.")
          .setColor(colors.error)
          .setTimestamp()

        await interaction.editReply({ embeds: [timeoutEmbed], components: [], ephemeral: true }).catch(() => {})
      }
    })
  },
}
