const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")
const { getGuildSettings } = require("../utils/database")

module.exports = {
  name: "messageCreate",
  async execute(message) {
    try {
      // Ignorar mensajes de bots y DMs
      if (message.author.bot || !message.guild) return

      // Obtener configuración del servidor
      const settings = await getGuildSettings(message.guild.id)

      // Verificar si la auto-moderación está configurada
      if (!settings.automod_logs_channel) return

      // Verificar si el usuario está en la lista blanca
      const { pool } = require("../utils/database")
      const [roleWhitelist] = await pool.execute(
        "SELECT * FROM automod_whitelist WHERE guild_id = ? AND type = 'role'",
        [message.guild.id],
      )

      // Verificar si el usuario tiene algún rol de la lista blanca
      const userRoles = message.member.roles.cache.map((role) => role.id)
      const isRoleWhitelisted = roleWhitelist.some((entry) => userRoles.includes(entry.item_id))

      if (isRoleWhitelisted) return

      // Verificar si el canal está en la lista blanca
      const [channelWhitelist] = await pool.execute(
        "SELECT * FROM automod_whitelist WHERE guild_id = ? AND type = 'channel' AND item_id = ?",
        [message.guild.id, message.channel.id],
      )

      if (channelWhitelist.length > 0) return

      // Verificar filtros activos
      let violation = null
      let action = null

      // 1. Filtro de palabras
      if (settings.automod_anti_links && containsLinks(message.content)) {
        violation = "enlaces"
        action = "delete"
      } else if (settings.automod_anti_invites && containsInvites(message.content)) {
        violation = "invitaciones de Discord"
        action = "delete"
      } else if (settings.automod_anti_caps && containsExcessiveCaps(message.content)) {
        violation = "exceso de mayúsculas"
        action = "delete"
      } else if (settings.automod_anti_mentions && containsExcessiveMentions(message)) {
        violation = "menciones masivas"
        action = "delete"
      } else if (await containsFilteredWords(message.content, message.guild.id)) {
        violation = "palabras filtradas"
        action = "delete"
      } else if (settings.automod_anti_spam && (await isSpamming(message))) {
        violation = "spam"
        action = "delete"
      }

      // Si se detectó una violación, tomar acción
      if (violation && action) {
        // Registrar violación
        await pool.execute(
          "INSERT INTO automod_logs (guild_id, user_id, action, content, reason, channel_id) VALUES (?, ?, ?, ?, ?, ?)",
          [message.guild.id, message.author.id, action, message.content, `Automod: ${violation}`, message.channel.id],
        )

        // Eliminar mensaje si es necesario
        if (action === "delete") {
          await message.delete().catch(() => {})
        }

        // Notificar al usuario
        try {
          await message.author.send({
            content: `Tu mensaje en **${message.guild.name}** ha sido eliminado por contener ${violation}.`,
          })
        } catch (error) {
          console.log(`No se pudo enviar DM a ${message.author.tag}`)
        }

        // Enviar log
        const logChannel = await message.guild.channels.fetch(settings.automod_logs_channel).catch(() => null)
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setTitle("🛡️ Auto-Moderación")
            .setDescription(`Se ha detectado una violación de las reglas.`)
            .addFields(
              { name: "Usuario", value: `${message.author.tag} (${message.author.id})`, inline: true },
              { name: "Canal", value: `<#${message.channel.id}>`, inline: true },
              { name: "Acción", value: action === "delete" ? "Mensaje eliminado" : "Advertencia", inline: true },
              { name: "Razón", value: `Contenido con ${violation}` },
              { name: "Contenido", value: message.content.substring(0, 1024) || "[No hay texto]" },
            )
            .setColor(colors.warning)
            .setTimestamp()

          await logChannel.send({ embeds: [embed] })
        }
      }
    } catch (error) {
      console.error("Error en auto-moderación:", error)
    }
  },
}

// Función para verificar si un mensaje contiene enlaces
function containsLinks(content) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return urlRegex.test(content)
}

// Función para verificar si un mensaje contiene invitaciones de Discord
function containsInvites(content) {
  const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/.+/gi
  return inviteRegex.test(content)
}

// Función para verificar si un mensaje contiene exceso de mayúsculas
function containsExcessiveCaps(content) {
  if (content.length < 10) return false
  const upperCaseChars = content.replace(/[^A-Z]/g, "").length
  const totalChars = content.replace(/\s/g, "").length
  return totalChars > 0 && upperCaseChars / totalChars > 0.7
}

// Función para verificar si un mensaje contiene menciones masivas
function containsExcessiveMentions(message) {
  return message.mentions.users.size > 5 || message.mentions.roles.size > 3
}

// Función para verificar si un mensaje contiene palabras filtradas
async function containsFilteredWords(content, guildId) {
  const { pool } = require("../utils/database")
  const [words] = await pool.execute("SELECT word FROM filtered_words WHERE guild_id = ?", [guildId])

  if (words.length === 0) return false

  const contentLower = content.toLowerCase()
  return words.some((w) => contentLower.includes(w.word.toLowerCase()))
}

// Función para verificar si un usuario está spammeando
async function isSpamming(message) {
  // Implementación simple: verificar si el usuario ha enviado más de 5 mensajes en los últimos 5 segundos
  const messages = await message.channel.messages.fetch({ limit: 10 })
  const userMessages = messages.filter(
    (m) => m.author.id === message.author.id && Date.now() - m.createdTimestamp < 5000,
  )
  return userMessages.size > 5
}
