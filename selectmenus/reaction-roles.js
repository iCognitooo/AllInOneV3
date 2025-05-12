const { getGuildSettings } = require("../utils/database")

module.exports = {
  customId: "reaction-roles",
  async execute(interaction) {
    try {
      const { guild, member, values } = interaction

      // Obtener roles configurados para este mensaje
      const { pool } = require("../utils/database")
      const [roleData] = await pool.execute("SELECT * FROM reaction_roles WHERE guild_id = ? AND message_id = ?", [
        guild.id,
        interaction.message.id,
      ])

      if (roleData.length === 0) {
        return interaction.reply({
          content: "Este selector de roles ya no está configurado.",
          ephemeral: true,
        })
      }

      // Mapear roles disponibles
      const availableRoles = roleData.map((r) => r.role_id)

      // Roles a añadir y quitar
      const rolesToAdd = values.filter((roleId) => availableRoles.includes(roleId))
      const rolesToRemove = availableRoles.filter((roleId) => !values.includes(roleId))

      // Verificar permisos del bot
      for (const roleId of [...rolesToAdd, ...rolesToRemove]) {
        const role = await guild.roles.fetch(roleId).catch(() => null)
        if (role && !role.editable) {
          return interaction.reply({
            content: `No puedo gestionar el rol ${role.name} porque está por encima de mi rol más alto.`,
            ephemeral: true,
          })
        }
      }

      // Añadir roles seleccionados
      for (const roleId of rolesToAdd) {
        if (!member.roles.cache.has(roleId)) {
          await member.roles.add(roleId)
        }
      }

      // Quitar roles no seleccionados
      for (const roleId of rolesToRemove) {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId)
        }
      }

      // Confirmar cambios
      await interaction.reply({
        content: "Tus roles han sido actualizados.",
        ephemeral: true,
      })
    } catch (error) {
      console.error("Error al gestionar roles por reacción:", error)
      await interaction.reply({
        content: "Hubo un error al actualizar tus roles.",
        ephemeral: true,
      })
    }
  },
}
