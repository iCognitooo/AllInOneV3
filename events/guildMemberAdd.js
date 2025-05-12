const { EmbedBuilder } = require("discord.js")
const { getGuildSettings } = require("../utils/database")

module.exports = {
  name: "guildMemberAdd",
  async execute(member) {
    try {
      const { guild, user } = member

      // Obtener configuración del servidor
      const settings = await getGuildSettings(guild.id)

      // Verificar si el sistema de bienvenida está configurado
      if (settings.welcome_channel) {
        const welcomeChannel = await guild.channels.fetch(settings.welcome_channel).catch(() => null)
        if (welcomeChannel) {
          // Preparar mensaje de bienvenida
          const welcomeMessage = settings.welcome_message || "¡Bienvenido {user} a **{server}**!"
          const formattedMessage = welcomeMessage
            .replace(/{user}/g, user)
            .replace(/{server}/g, guild.name)
            .replace(/{count}/g, guild.memberCount)

          // Enviar mensaje según configuración
          if (settings.welcome_embed) {
            const embed = new EmbedBuilder()
              .setTitle(settings.welcome_title || "¡Nuevo Miembro!")
              .setDescription(formattedMessage)
              .setColor(settings.welcome_color || "#5865F2")
              .setThumbnail(user.displayAvatarURL({ dynamic: true }))
              .setFooter({ text: guild.name, iconURL: guild.iconURL() })
              .setTimestamp()

            if (settings.welcome_image) {
              embed.setImage(settings.welcome_image)
            }

            await welcomeChannel.send({ embeds: [embed] })
          } else {
            await welcomeChannel.send(formattedMessage)
          }
        }
      }

      // Asignar rol automático si está configurado
      if (settings.autorole_id) {
        const role = await guild.roles.fetch(settings.autorole_id).catch(() => null)
        if (role && role.editable) {
          await member.roles.add(role)
        }
      }

      // Registrar entrada en la base de datos
      const { pool } = require("../utils/database")
      await pool.execute(
        "INSERT INTO member_logs (user_id, guild_id, action, timestamp) VALUES (?, ?, 'join', NOW())",
        [user.id, guild.id],
      )
    } catch (error) {
      console.error("Error en evento guildMemberAdd:", error)
    }
  },
}
