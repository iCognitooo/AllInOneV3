const { addUserXP } = require("../utils/database")

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      // Ignorar mensajes de bots y DMs
      if (message.author.bot || !message.guild) return

      // Cooldown para XP (para evitar spam)
      const xpCooldowns = new Map()
      const now = Date.now()
      const cooldownAmount = 60000 // 1 minuto

      if (xpCooldowns.has(message.author.id)) {
        const expirationTime = xpCooldowns.get(message.author.id) + cooldownAmount
        if (now < expirationTime) return
      }

      // Añadir XP aleatorio entre 15-25
      const xpToAdd = Math.floor(Math.random() * 11) + 15
      const result = await addUserXP(message.author.id, message.guild.id, xpToAdd)

      // Si el usuario subió de nivel, enviar mensaje
      if (result.leveledUp) {
        // Obtener configuración del servidor
        const { getGuildSettings } = require("../utils/database")
        const settings = await getGuildSettings(message.guild.id)

        // Verificar si hay un canal de niveles configurado
        let levelChannel = message.channel
        if (settings.level_channel) {
          const configuredChannel = await message.guild.channels.fetch(settings.level_channel).catch(() => null)
          if (configuredChannel) {
            levelChannel = configuredChannel
          }
        }

        // Enviar mensaje de nivel
        const { EmbedBuilder } = require("discord.js")
        const { colors } = require("../config.json")

        const embed = new EmbedBuilder()
          .setTitle("🎉 Subida de Nivel")
          .setDescription(`¡Felicidades ${message.author}! Has subido al nivel **${result.newLevel}**.`)
          .setColor(colors.success)
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: message.guild.name, iconURL: message.guild.iconURL() })
          .setTimestamp()

        await levelChannel.send({ embeds: [embed] })

        // Verificar si hay roles de nivel para asignar
        const { pool } = require("../utils/database")
        const [levelRoles] = await pool.execute(
          "SELECT * FROM level_roles WHERE guild_id = ? AND level <= ? ORDER BY level DESC LIMIT 1",
          [message.guild.id, result.newLevel],
        )

        if (levelRoles.length > 0) {
          const roleToAssign = await message.guild.roles.fetch(levelRoles[0].role_id).catch(() => null)
          if (roleToAssign && roleToAssign.editable) {
            // Quitar roles de nivel anteriores si está configurado
            if (settings.remove_previous_level_roles) {
              const [allLevelRoles] = await pool.execute("SELECT role_id FROM level_roles WHERE guild_id = ?", [
                message.guild.id,
              ])
              for (const { role_id } of allLevelRoles) {
                if (role_id !== roleToAssign.id && message.member.roles.cache.has(role_id)) {
                  await message.member.roles.remove(role_id)
                }
              }
            }

            // Asignar nuevo rol de nivel
            await message.member.roles.add(roleToAssign)
            await levelChannel.send({
              content: `${message.author} ha obtenido el rol **${roleToAssign.name}** por alcanzar el nivel ${result.newLevel}.`,
            })
          }
        }
      }

      // Actualizar cooldown
      xpCooldowns.set(message.author.id, now)
      setTimeout(() => xpCooldowns.delete(message.author.id), cooldownAmount)
    } catch (error) {
      console.error("Error en evento messageCreate:", error)
    }
  },
}
