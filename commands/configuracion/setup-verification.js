const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js")
const { colors } = require("../../config.json")
const { updateGuildSettings } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-verification")
    .setDescription("Configura el sistema de verificación para tu servidor")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se mostrará el mensaje de verificación")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option.setName("rol").setDescription("Rol que se otorgará al verificarse").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("tipo")
        .setDescription("Tipo de verificación")
        .setRequired(true)
        .addChoices(
          { name: "Botón Simple", value: "button" },
          { name: "Captcha", value: "captcha" },
          { name: "Reacción", value: "reaction" },
        ),
    )
    .addStringOption((option) =>
      option.setName("titulo").setDescription("Título del mensaje de verificación").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("descripcion").setDescription("Descripción del mensaje de verificación").setRequired(false),
    )
    .addStringOption((option) => option.setName("color").setDescription("Color del embed (hex)").setRequired(false))
    .addStringOption((option) =>
      option.setName("imagen").setDescription("URL de la imagen para el embed").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel("canal")
      const role = interaction.options.getRole("rol")
      const type = interaction.options.getString("tipo")
      const title = interaction.options.getString("titulo") || "Verificación del Servidor"
      const description =
        interaction.options.getString("descripcion") ||
        "Para acceder al servidor, debes verificar que eres humano. Haz clic en el botón de abajo para verificarte."
      const color = interaction.options.getString("color") || colors.primary
      const image = interaction.options.getString("imagen")

      // Verificar permisos del bot
      if (!role.editable) {
        return interaction.reply({
          content: `No puedo asignar el rol ${role.name} porque está por encima de mi rol más alto.`,
          ephemeral: true,
        })
      }

      // Guardar configuración en la base de datos
      await updateGuildSettings(interaction.guild.id, {
        verification_channel: channel.id,
        verification_role: role.id,
        verification_type: type,
      })

      // Crear embed de verificación
      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      if (image) {
        embed.setImage(image)
      }

      // Crear botones según el tipo de verificación
      const row = new ActionRowBuilder()

      if (type === "button") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("verify-button")
            .setLabel("Verificarme")
            .setStyle(ButtonStyle.Success)
            .setEmoji("✅"),
        )
      } else if (type === "captcha") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("verify-captcha")
            .setLabel("Verificarme")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🔐"),
        )
      } else if (type === "reaction") {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId("verify-reaction")
            .setLabel("Verificarme")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("👍"),
        )
      }

      // Enviar mensaje de verificación
      await channel.send({ embeds: [embed], components: [row] })

      // Confirmar configuración
      const confirmEmbed = new EmbedBuilder()
        .setTitle("✅ Sistema de Verificación Configurado")
        .setDescription("El sistema de verificación ha sido configurado correctamente.")
        .addFields(
          { name: "Canal", value: `<#${channel.id}>`, inline: true },
          { name: "Rol", value: `<@&${role.id}>`, inline: true },
          { name: "Tipo", value: type, inline: true },
        )
        .setColor(colors.success)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      await interaction.reply({ embeds: [confirmEmbed], ephemeral: true })
    } catch (error) {
      console.error("Error al configurar verificación:", error)
      await interaction.reply({
        content: "Hubo un error al configurar el sistema de verificación.",
        ephemeral: true,
      })
    }
  },
}
