const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
} = require("discord.js")
const { colors } = require("../../config.json")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-reaction-roles")
    .setDescription("Configura roles por reacción para tu servidor")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se enviará el mensaje de roles")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("titulo").setDescription("Título del mensaje de roles").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("descripcion").setDescription("Descripción del mensaje de roles").setRequired(true),
    )
    .addRoleOption((option) => option.setName("rol1").setDescription("Primer rol").setRequired(true))
    .addStringOption((option) => option.setName("emoji1").setDescription("Emoji para el primer rol").setRequired(true))
    .addRoleOption((option) => option.setName("rol2").setDescription("Segundo rol").setRequired(false))
    .addStringOption((option) =>
      option.setName("emoji2").setDescription("Emoji para el segundo rol").setRequired(false),
    )
    .addRoleOption((option) => option.setName("rol3").setDescription("Tercer rol").setRequired(false))
    .addStringOption((option) => option.setName("emoji3").setDescription("Emoji para el tercer rol").setRequired(false))
    .addRoleOption((option) => option.setName("rol4").setDescription("Cuarto rol").setRequired(false))
    .addStringOption((option) => option.setName("emoji4").setDescription("Emoji para el cuarto rol").setRequired(false))
    .addRoleOption((option) => option.setName("rol5").setDescription("Quinto rol").setRequired(false))
    .addStringOption((option) => option.setName("emoji5").setDescription("Emoji para el quinto rol").setRequired(false))
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Tipo de selector de roles")
        .setRequired(false)
        .addChoices({ name: "Menú Desplegable", value: "menu" }, { name: "Botones", value: "buttons" }),
    )
    .addStringOption((option) => option.setName("color").setDescription("Color del embed (hex)").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 30,
  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel("canal")
      const title = interaction.options.getString("titulo")
      const description = interaction.options.getString("descripcion")
      const type = interaction.options.getString("tipo") || "menu"
      const color = interaction.options.getString("color") || colors.primary

      // Recopilar roles y emojis
      const roles = []
      for (let i = 1; i <= 5; i++) {
        const role = interaction.options.getRole(`rol${i}`)
        const emoji = interaction.options.getString(`emoji${i}`)
        if (role && emoji) {
          // Verificar si el bot puede asignar el rol
          if (!role.editable) {
            return interaction.reply({
              content: `No puedo asignar el rol ${role.name} porque está por encima de mi rol más alto.`,
              ephemeral: true,
            })
          }
          roles.push({ role, emoji })
        }
      }

      if (roles.length === 0) {
        return interaction.reply({
          content: "Debes proporcionar al menos un rol y un emoji.",
          ephemeral: true,
        })
      }

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Crear componente según el tipo
      let row
      if (type === "menu") {
        row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("reaction-roles")
            .setPlaceholder("Selecciona tus roles")
            .setMinValues(0)
            .setMaxValues(roles.length)
            .addOptions(
              roles.map((r) => ({
                label: r.role.name,
                value: r.role.id,
                emoji: r.emoji,
                description: `Obtén el rol ${r.role.name}`,
              })),
            ),
        )
      } else {
        // Implementación de botones en buttons/reaction-role.js
        // Aquí solo guardamos la configuración en la base de datos
      }

      // Guardar configuración en la base de datos
      const { pool } = require("../../utils/database")
      await pool.execute("DELETE FROM reaction_roles WHERE guild_id = ? AND channel_id = ?", [
        interaction.guild.id,
        channel.id,
      ])

      for (const { role, emoji } of roles) {
        await pool.execute(
          "INSERT INTO reaction_roles (guild_id, channel_id, message_id, role_id, emoji, type) VALUES (?, ?, ?, ?, ?, ?)",
          [interaction.guild.id, channel.id, "pending", role.id, emoji, type],
        )
      }

      // Enviar mensaje
      const message = await channel.send({ embeds: [embed], components: type === "menu" ? [row] : [] })

      // Actualizar message_id en la base de datos
      await pool.execute(
        "UPDATE reaction_roles SET message_id = ? WHERE guild_id = ? AND channel_id = ? AND message_id = ?",
        [message.id, interaction.guild.id, channel.id, "pending"],
      )

      // Confirmar configuración
      const confirmEmbed = new EmbedBuilder()
        .setTitle("✅ Roles por Reacción Configurados")
        .setDescription("El sistema de roles por reacción ha sido configurado correctamente.")
        .addFields(
          { name: "Canal", value: `<#${channel.id}>`, inline: true },
          { name: "Tipo", value: type === "menu" ? "Menú Desplegable" : "Botones", inline: true },
          { name: "Roles", value: roles.map((r) => `${r.emoji} <@&${r.role.id}>`).join("\n") },
        )
        .setColor(colors.success)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true })
    } catch (error) {
      console.error("Error al configurar roles por reacción:", error)
      await interaction.reply({
        content: "Hubo un error al configurar los roles por reacción.",
        ephemeral: true,
      })
    }
  },
}
