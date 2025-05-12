const { EmbedBuilder, WebhookClient } = require("discord.js")
const { colors } = require("../config.json")

class Logger {
  constructor() {
    this.webhookClient = null
  }

  setWebhook(url) {
    if (!url) return
    this.webhookClient = new WebhookClient({ url })
  }

  log(message, type = "info") {
    const timestamp = new Date().toISOString()

    switch (type.toLowerCase()) {
      case "info":
        console.log(`[${timestamp}] [INFO] ${message}`)
        break
      case "warn":
        console.warn(`[${timestamp}] [WARN] ${message}`)
        break
      case "error":
        console.error(`[${timestamp}] [ERROR] ${message}`)
        break
      case "debug":
        console.debug(`[${timestamp}] [DEBUG] ${message}`)
        break
      default:
        console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`)
    }
  }

  // Métodos abreviados compatibles
  info(message) {
    this.log(message, "info")
  }

  warn(message) {
    this.log(message, "warn")
  }

  error(message) {
    this.log(message, "error")
  }

  debug(message) {
    this.log(message, "debug")
  }

  async logToDiscord(options) {
    if (!this.webhookClient) return

    const { title, description, fields, color, footer, thumbnail } = options

    const embed = new EmbedBuilder()
      .setTitle(title || "Log")
      .setDescription(description || "")
      .setColor(color || colors.info)
      .setTimestamp()

    if (fields && Array.isArray(fields)) {
      embed.addFields(...fields)
    }

    if (footer) {
      embed.setFooter({ text: footer })
    }

    if (thumbnail) {
      embed.setThumbnail(thumbnail)
    }

    try {
      await this.webhookClient.send({ embeds: [embed] })
    } catch (error) {
      console.error("Error al enviar log a Discord:", error)
    }
  }

  async logCommand(interaction, success = true) {
    this.log(
      `Comando ejecutado: ${interaction.commandName} por ${interaction.user.tag} (${interaction.user.id}) en ${interaction.guild.name} (${interaction.guild.id})`,
      success ? "info" : "error"
    )

    if (this.webhookClient) {
      await this.logToDiscord({
        title: `Comando ${success ? "Ejecutado" : "Fallido"}`,
        description: `Comando: \`/${interaction.commandName}\``,
        fields: [
          { name: "Usuario", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
          { name: "Servidor", value: `${interaction.guild.name} (${interaction.guild.id})`, inline: true },
          { name: "Canal", value: `${interaction.channel.name} (${interaction.channel.id})`, inline: true },
        ],
        color: success ? colors.success : colors.error,
        thumbnail: interaction.user.displayAvatarURL({ dynamic: true }),
      })
    }
  }

  async logError(error, context = {}) {
    this.error(`Error: ${error.message}`)

    if (this.webhookClient) {
      await this.logToDiscord({
        title: "Error",
        description: `\`\`\`${error.message}\`\`\``,
        fields: [
          { name: "Stack", value: `\`\`\`${error.stack ? error.stack.slice(0, 1000) : "No stack trace"}\`\`\`` },
          ...Object.entries(context).map(([key, value]) => ({
            name: key,
            value: String(value).slice(0, 1000),
            inline: true,
          })),
        ],
        color: colors.error,
      })
    }
  }

  async logModeration(action, moderator, target, reason, guild) {
    this.info(
      `Acción de moderación: ${action} | Moderador: ${moderator.tag} | Objetivo: ${target.tag} | Razón: ${reason}`
    )

    if (this.webhookClient) {
      await this.logToDiscord({
        title: `Moderación: ${action}`,
        description: `Se ha realizado una acción de moderación`,
        fields: [
          { name: "Acción", value: action, inline: true },
          { name: "Moderador", value: `${moderator.tag} (${moderator.id})`, inline: true },
          { name: "Objetivo", value: `${target.tag} (${target.id})`, inline: true },
          { name: "Razón", value: reason || "No se proporcionó una razón" },
          { name: "Servidor", value: `${guild.name} (${guild.id})`, inline: true },
        ],
        color: colors.warning,
        thumbnail: target.displayAvatarURL({ dynamic: true }),
      })
    }
  }
}

module.exports = new Logger()
