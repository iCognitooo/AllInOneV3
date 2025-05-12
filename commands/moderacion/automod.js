const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require("discord.js")
const { colors } = require("../../config.json")
const { updateGuildSettings, getGuildSettings } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configura el sistema de auto-moderación")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Configura el sistema de auto-moderación")
        .addChannelOption((option) =>
          option
            .setName("logs")
            .setDescription("Canal donde se enviarán los logs de auto-moderación")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addBooleanOption((option) =>
          option.setName("anti_spam").setDescription("Activar protección anti-spam").setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("anti_links").setDescription("Activar protección anti-enlaces").setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("anti_invites").setDescription("Activar protección anti-invitaciones").setRequired(false),
        )
        .addBooleanOption((option) =>
          option.setName("anti_caps").setDescription("Activar protección anti-mayúsculas").setRequired(false),
        )
        .addBooleanOption((option) =>
          option
            .setName("anti_mentions")
            .setDescription("Activar protección anti-menciones masivas")
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("filter")
        .setDescription("Gestiona el filtro de palabras")
        .addStringOption((option) =>
          option
            .setName("accion")
            .setDescription("Acción a realizar")
            .setRequired(true)
            .addChoices(
              { name: "Añadir", value: "add" },
              { name: "Eliminar", value: "remove" },
              { name: "Ver", value: "view" },
            ),
        )
        .addStringOption((option) =>
          option.setName("palabra").setDescription("Palabra a añadir/eliminar del filtro").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("whitelist")
        .setDescription("Gestiona la lista blanca de canales y roles")
        .addStringOption((option) =>
          option
            .setName("tipo")
            .setDescription("Tipo de elemento")
            .setRequired(true)
            .addChoices({ name: "Canal", value: "channel" }, { name: "Rol", value: "role" }),
        )
        .addStringOption((option) =>
          option
            .setName("accion")
            .setDescription("Acción a realizar")
            .setRequired(true)
            .addChoices(
              { name: "Añadir", value: "add" },
              { name: "Eliminar", value: "remove" },
              { name: "Ver", value: "view" },
            ),
        )
        .addChannelOption((option) =>
          option.setName("canal").setDescription("Canal a añadir/eliminar de la lista blanca").setRequired(false),
        )
        .addRoleOption((option) =>
          option.setName("rol").setDescription("Rol a añadir/eliminar de la lista blanca").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("status").setDescription("Muestra el estado actual del sistema de auto-moderación"),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand()

      if (subcommand === "setup") {
        const logsChannel = interaction.options.getChannel("logs")
        const antiSpam = interaction.options.getBoolean("anti_spam")
        const antiLinks = interaction.options.getBoolean("anti_links")
        const antiInvites = interaction.options.getBoolean("anti_invites")
        const antiCaps = interaction.options.getBoolean("anti_caps")
        const antiMentions = interaction.options.getBoolean("anti_mentions")

        // Obtener configuración actual
        const settings = await getGuildSettings(interaction.guild.id)

        // Preparar nuevos ajustes
        const newSettings = {
          automod_logs_channel: logsChannel.id,
        }

        if (antiSpam !== null) newSettings.automod_anti_spam = antiSpam ? 1 : 0
        if (antiLinks !== null) newSettings.automod_anti_links = antiLinks ? 1 : 0
        if (antiInvites !== null) newSettings.automod_anti_invites = antiInvites ? 1 : 0
        if (antiCaps !== null) newSettings.automod_anti_caps = antiCaps ? 1 : 0
        if (antiMentions !== null) newSettings.automod_anti_mentions = antiMentions ? 1 : 0

        // Actualizar configuración
        await updateGuildSettings(interaction.guild.id, newSettings)

        // Crear embed de confirmación
        const embed = new EmbedBuilder()
          .setTitle("✅ Auto-Moderación Configurada")
          .setDescription("El sistema de auto-moderación ha sido configurado correctamente.")
          .addFields({ name: "Canal de Logs", value: `<#${logsChannel.id}>`, inline: true })
          .setColor(colors.success)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        // Añadir campos para cada configuración
        if (antiSpam !== null)
          embed.addFields({
            name: "Anti-Spam",
            value: antiSpam ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          })
        if (antiLinks !== null)
          embed.addFields({
            name: "Anti-Enlaces",
            value: antiLinks ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          })
        if (antiInvites !== null)
          embed.addFields({
            name: "Anti-Invitaciones",
            value: antiInvites ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          })
        if (antiCaps !== null)
          embed.addFields({
            name: "Anti-Mayúsculas",
            value: antiCaps ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          })
        if (antiMentions !== null)
          embed.addFields({
            name: "Anti-Menciones Masivas",
            value: antiMentions ? "✅ Activado" : "❌ Desactivado",
            inline: true,
          })

        await interaction.reply({ embeds: [embed] })
      } else if (subcommand === "filter") {
        const action = interaction.options.getString("accion")
        const word = interaction.options.getString("palabra")

        const { pool } = require("../../utils/database")

        if (action === "view") {
          // Ver palabras filtradas
          const [words] = await pool.execute("SELECT word FROM filtered_words WHERE guild_id = ? ORDER BY word ASC", [
            interaction.guild.id,
          ])

          if (words.length === 0) {
            return interaction.reply({
              content: "No hay palabras en el filtro.",
              ephemeral: true,
            })
          }

          const embed = new EmbedBuilder()
            .setTitle("🔍 Filtro de Palabras")
            .setDescription("Lista de palabras filtradas en el servidor.")
            .addFields({
              name: "Palabras",
              value: words.map((w) => `\`${w.word}\``).join(", "),
            })
            .setColor(colors.primary)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

          await interaction.reply({ embeds: [embed], ephemeral: true })
        } else if (action === "add") {
          if (!word) {
            return interaction.reply({
              content: "Debes proporcionar una palabra para añadir al filtro.",
              ephemeral: true,
            })
          }

          // Añadir palabra al filtro
          await pool.execute("INSERT IGNORE INTO filtered_words (guild_id, word) VALUES (?, ?)", [
            interaction.guild.id,
            word.toLowerCase(),
          ])

          await interaction.reply({
            content: `La palabra \`${word}\` ha sido añadida al filtro.`,
            ephemeral: true,
          })
        } else if (action === "remove") {
          if (!word) {
            return interaction.reply({
              content: "Debes proporcionar una palabra para eliminar del filtro.",
              ephemeral: true,
            })
          }

          // Eliminar palabra del filtro
          const [result] = await pool.execute("DELETE FROM filtered_words WHERE guild_id = ? AND word = ?", [
            interaction.guild.id,
            word.toLowerCase(),
          ])

          if (result.affectedRows === 0) {
            return interaction.reply({
              content: `La palabra \`${word}\` no estaba en el filtro.`,
              ephemeral: true,
            })
          }

          await interaction.reply({
            content: `La palabra \`${word}\` ha sido eliminada del filtro.`,
            ephemeral: true,
          })
        }
      } else if (subcommand === "whitelist") {
        const type = interaction.options.getString("tipo")
        const action = interaction.options.getString("accion")
        const channel = interaction.options.getChannel("canal")
        const role = interaction.options.getRole("rol")

        const { pool } = require("../../utils/database")

        if (action === "view") {
          // Ver lista blanca
          const [whitelist] = await pool.execute(
            "SELECT type, item_id FROM automod_whitelist WHERE guild_id = ? AND type = ? ORDER BY item_id ASC",
            [interaction.guild.id, type],
          )

          if (whitelist.length === 0) {
            return interaction.reply({
              content: `No hay ${type === "channel" ? "canales" : "roles"} en la lista blanca.`,
              ephemeral: true,
            })
          }

          const embed = new EmbedBuilder()
            .setTitle("📋 Lista Blanca")
            .setDescription(`Lista de ${type === "channel" ? "canales" : "roles"} excluidos de la auto-moderación.`)
            .addFields({
              name: type === "channel" ? "Canales" : "Roles",
              value: whitelist.map((w) => `<#${w.item_id}>`).join(", "),
            })
            .setColor(colors.primary)
            .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
            .setTimestamp()

          await interaction.reply({ embeds: [embed], ephemeral: true })
        } else if (action === "add") {
          const item = type === "channel" ? channel : role
          if (!item) {
            return interaction.reply({
              content: `Debes proporcionar un ${type === "channel" ? "canal" : "rol"} para añadir a la lista blanca.`,
              ephemeral: true,
            })
          }

          // Añadir a la lista blanca
          await pool.execute("INSERT IGNORE INTO automod_whitelist (guild_id, type, item_id) VALUES (?, ?, ?)", [
            interaction.guild.id,
            type,
            item.id,
          ])

          await interaction.reply({
            content: `${type === "channel" ? "El canal" : "El rol"} ${
              type === "channel" ? channel : role
            } ha sido añadido a la lista blanca.`,
            ephemeral: true,
          })
        } else if (action === "remove") {
          const item = type === "channel" ? channel : role
          if (!item) {
            return interaction.reply({
              content: `Debes proporcionar un ${type === "channel" ? "canal" : "rol"} para eliminar de la lista blanca.`,
              ephemeral: true,
            })
          }

          // Eliminar de la lista blanca
          const [result] = await pool.execute(
            "DELETE FROM automod_whitelist WHERE guild_id = ? AND type = ? AND item_id = ?",
            [interaction.guild.id, type, item.id],
          )

          if (result.affectedRows === 0) {
            return interaction.reply({
              content: `${type === "channel" ? "El canal" : "El rol"} ${
                type === "channel" ? channel : role
              } no estaba en la lista blanca.`,
              ephemeral: true,
            })
          }

          await interaction.reply({
            content: `${type === "channel" ? "El canal" : "El rol"} ${
              type === "channel" ? channel : role
            } ha sido eliminado de la lista blanca.`,
            ephemeral: true,
          })
        }
      } else if (subcommand === "status") {
        // Obtener configuración actual
        const settings = await getGuildSettings(interaction.guild.id)

        // Obtener estadísticas
        const { pool } = require("../../utils/database")
        const [wordCount] = await pool.execute("SELECT COUNT(*) as count FROM filtered_words WHERE guild_id = ?", [
          interaction.guild.id,
        ])
        const [channelWhitelist] = await pool.execute(
          "SELECT COUNT(*) as count FROM automod_whitelist WHERE guild_id = ? AND type = 'channel'",
          [interaction.guild.id],
        )
        const [roleWhitelist] = await pool.execute(
          "SELECT COUNT(*) as count FROM automod_whitelist WHERE guild_id = ? AND type = 'role'",
          [interaction.guild.id],
        )

        // Crear embed
        const embed = new EmbedBuilder()
          .setTitle("⚙️ Estado de Auto-Moderación")
          .setDescription("Configuración actual del sistema de auto-moderación.")
          .addFields(
            {
              name: "Canal de Logs",
              value: settings.automod_logs_channel ? `<#${settings.automod_logs_channel}>` : "No configurado",
              inline: true,
            },
            {
              name: "Anti-Spam",
              value: settings.automod_anti_spam ? "✅ Activado" : "❌ Desactivado",
              inline: true,
            },
            {
              name: "Anti-Enlaces",
              value: settings.automod_anti_links ? "✅ Activado" : "❌ Desactivado",
              inline: true,
            },
            {
              name: "Anti-Invitaciones",
              value: settings.automod_anti_invites ? "✅ Activado" : "❌ Desactivado",
              inline: true,
            },
            {
              name: "Anti-Mayúsculas",
              value: settings.automod_anti_caps ? "✅ Activado" : "❌ Desactivado",
              inline: true,
            },
            {
              name: "Anti-Menciones Masivas",
              value: settings.automod_anti_mentions ? "✅ Activado" : "❌ Desactivado",
              inline: true,
            },
            {
              name: "Palabras Filtradas",
              value: `${wordCount[0].count} palabras`,
              inline: true,
            },
            {
              name: "Canales en Lista Blanca",
              value: `${channelWhitelist[0].count} canales`,
              inline: true,
            },
            {
              name: "Roles en Lista Blanca",
              value: `${roleWhitelist[0].count} roles`,
              inline: true,
            },
          )
          .setColor(colors.primary)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
      }
    } catch (error) {
      console.error("Error en comando automod:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
