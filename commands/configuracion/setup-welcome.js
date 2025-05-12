const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const { updateGuildSettings } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-welcome")
    .setDescription("Configura el sistema de bienvenida para tu servidor")
    .addChannelOption((option) =>
      option
        .setName("canal")
        .setDescription("Canal donde se enviarán los mensajes de bienvenida")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("mensaje")
        .setDescription("Mensaje de bienvenida (usa {user} para mencionar al usuario)")
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option.setName("embed").setDescription("¿Usar embed para el mensaje?").setRequired(false),
    )
    .addStringOption((option) => option.setName("color").setDescription("Color del embed (hex)").setRequired(false))
    .addStringOption((option) => option.setName("titulo").setDescription("Título del embed").setRequired(false))
    .addStringOption((option) =>
      option.setName("imagen").setDescription("URL de la imagen para el embed").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 30,
  async execute(interaction) {
    try {
      const channel = interaction.options.getChannel("canal")
      const message =
        interaction.options.getString("mensaje") ||
        "¡Bienvenido {user} a **{server}**!\n\nEres el miembro número **{count}**.\n\nNo olvides leer las reglas y divertirte."
      const useEmbed = interaction.options.getBoolean("embed") ?? true
      const color = interaction.options.getString("color") || colors.primary
      const title = interaction.options.getString("titulo") || "¡Nuevo Miembro!"
      const image = interaction.options.getString("imagen")

      // Guardar configuración en la base de datos
      await updateGuildSettings(interaction.guild.id, {
        welcome_channel: channel.id,
        welcome_message: message,
        welcome_embed: useEmbed ? 1 : 0,
        welcome_color: color,
        welcome_title: title,
        welcome_image: image,
      })

      // Crear vista previa
      let preview
      if (useEmbed) {
        const previewEmbed = new EmbedBuilder()
          .setTitle(title)
          .setDescription(
            message
              .replace(/{user}/g, interaction.user)
              .replace(/{server}/g, interaction.guild.name)
              .replace(/{count}/g, interaction.guild.memberCount),
          )
          .setColor(color)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        if (image) {
          previewEmbed.setImage(image)
        }

        preview = { embeds: [previewEmbed] }
      } else {
        preview = {
          content: message
            .replace(/{user}/g, interaction.user)
            .replace(/{server}/g, interaction.guild.name)
            .replace(/{count}/g, interaction.guild.memberCount),
        }
      }

      // Confirmar configuración
      const confirmEmbed = new EmbedBuilder()
        .setTitle("✅ Sistema de Bienvenida Configurado")
        .setDescription("El sistema de bienvenida ha sido configurado correctamente.")
        .addFields(
          { name: "Canal", value: `<#${channel.id}>`, inline: true },
          { name: "Usar Embed", value: useEmbed ? "Sí" : "No", inline: true },
        )
        .setColor(colors.success)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("test-welcome").setLabel("Probar Mensaje").setStyle(ButtonStyle.Primary),
      )

      await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true })

      // Colector para el botón de prueba
      const filter = (i) => i.customId === "test-welcome" && i.user.id === interaction.user.id
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: 60000,
        max: 1,
      })

      collector.on("collect", async (i) => {
        await channel.send(preview)
        await i.update({
          content: "Mensaje de prueba enviado al canal configurado.",
          components: [],
        })
      })
    } catch (error) {
      console.error("Error al configurar bienvenida:", error)
      await interaction.reply({
        content: "Hubo un error al configurar el sistema de bienvenida.",
        ephemeral: true,
      })
    }
  },
}
