const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const { addLevelRole, getLevelRoles } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-level-roles")
    .setDescription("Configura roles que se otorgan al alcanzar ciertos niveles")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Añade un rol para un nivel específico")
        .addRoleOption((option) => option.setName("rol").setDescription("Rol a otorgar").setRequired(true))
        .addIntegerOption((option) =>
          option.setName("nivel").setDescription("Nivel requerido").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("list").setDescription("Muestra la lista de roles por nivel configurados"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Elimina un rol de nivel")
        .addIntegerOption((option) =>
          option.setName("nivel").setDescription("Nivel del rol a eliminar").setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("channel")
        .setDescription("Configura el canal donde se enviarán los mensajes de nivel")
        .addChannelOption((option) =>
          option.setName("canal").setDescription("Canal para mensajes de nivel").setRequired(true),
        ),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  cooldown: 5,
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand()

      if (subcommand === "add") {
        const role = interaction.options.getRole("rol")
        const level = interaction.options.getInteger("nivel")

        // Verificar permisos del bot
        if (!role.editable) {
          return interaction.reply({
            content: `No puedo asignar el rol ${role.name} porque está por encima de mi rol más alto.`,
            ephemeral: true,
          })
        }

        // Añadir rol de nivel
        await addLevelRole(interaction.guild.id, role.id, level)

        const embed = new EmbedBuilder()
          .setTitle("✅ Rol de Nivel Configurado")
          .setDescription(`El rol ${role} será otorgado al alcanzar el nivel ${level}.`)
          .setColor(colors.success)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
      } else if (subcommand === "list") {
        const levelRoles = await getLevelRoles(interaction.guild.id)

        if (levelRoles.length === 0) {
          return interaction.reply("No hay roles de nivel configurados.")
        }

        const embed = new EmbedBuilder()
          .setTitle("🏆 Roles de Nivel")
          .setDescription("Lista de roles que se otorgan al alcanzar ciertos niveles.")
          .setColor(colors.primary)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        for (const { role_id, level } of levelRoles) {
          embed.addFields({ name: `Nivel ${level}`, value: `<@&${role_id}>`, inline: true })
        }

        await interaction.reply({ embeds: [embed] })
      } else if (subcommand === "remove") {
        const level = interaction.options.getInteger("nivel")

        // Eliminar rol de nivel
        const { pool } = require("../../utils/database")
        const [result] = await pool.execute("DELETE FROM level_roles WHERE guild_id = ? AND level = ?", [
          interaction.guild.id,
          level,
        ])

        if (result.affectedRows === 0) {
          return interaction.reply(`No hay ningún rol configurado para el nivel ${level}.`)
        }

        const embed = new EmbedBuilder()
          .setTitle("✅ Rol de Nivel Eliminado")
          .setDescription(`El rol para el nivel ${level} ha sido eliminado.`)
          .setColor(colors.success)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
      } else if (subcommand === "channel") {
        const channel = interaction.options.getChannel("canal")

        // Actualizar canal de niveles
        const { updateGuildSettings } = require("../../utils/database")
        await updateGuildSettings(interaction.guild.id, { level_channel: channel.id })

        const embed = new EmbedBuilder()
          .setTitle("✅ Canal de Niveles Configurado")
          .setDescription(`Los mensajes de nivel se enviarán en ${channel}.`)
          .setColor(colors.success)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        await interaction.reply({ embeds: [embed] })
      }
    } catch (error) {
      console.error("Error al configurar roles de nivel:", error)
      await interaction.reply({
        content: "Hubo un error al configurar los roles de nivel.",
        ephemeral: true,
      })
    }
  },
}
