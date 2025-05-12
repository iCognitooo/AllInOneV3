const { EmbedBuilder } = require("discord.js")
const { getGuildSettings } = require("../utils/database")

module.exports = {
  name: "guildMemberRemove",
  async execute(member) {
    try {
      const { guild, user } = member

      // Obtener configuración del servidor
      const settings = await getGuildSettings(guild.id)

      // Verificar si el sistema de despedida está configurado
      if (settings.goodbye_channel) {
        const goodbyeChannel = await guild.channels.fetch(settings.goodbye_channel).catch(() => null)
        if (goodbyeChannel) {
          // Preparar mensaje de despedida
          const goodbyeMessage = settings.goodbye_message || "¡Adiós {user}! Esperamos verte pronto."
          const formattedMessage = goodbyeMessage
            .replace(/{user}/g, user.tag)
            .replace(/{server}/g, guild.name)
            .replace(/{count}/g, guild.memberCount)

          // Crear embed
          const embed = new EmbedBuilder()
            .setTitle("Miembro Saliente")
            .setDescription(formattedMessage)
            .setColor("#ED4245")
            .setThumbnail(user.displayAvatarURL({ dynamic: true }))
            .addFields(
              { name: "ID", value: user.id, inline: true },
              { name: "Cuenta Creada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
            )
            .setFooter({ text: guild.name, iconURL: guild.iconURL() })
            .setTimestamp()

          await goodbyeChannel.send({ embeds: [embed] })
        }
      }

      // Registrar salida en la base de datos
      const { pool } = require("../utils/database")
      await pool.execute(
        "INSERT INTO member_logs (user_id, guild_id, action, timestamp) VALUES (?, ?, 'leave', NOW())",
        [user.id, guild.id],
      )
    } catch (error) {
      console.error("Error en evento guildMemberRemove:", error)
    }
  },
}
