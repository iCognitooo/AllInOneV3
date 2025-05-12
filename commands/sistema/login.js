const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const crypto = require("crypto")

// Almacenamiento temporal de tokens (en producción, usar una base de datos)
const loginTokens = new Map()

module.exports = {
  data: new SlashCommandBuilder().setName("login").setDescription("Inicia sesión en el sistema de Cognixion Studio"),
  cooldown: 30,
  async execute(interaction) {
    // Generar un token único para este usuario
    const token = crypto.randomBytes(20).toString("hex")

    // Guardar el token con un tiempo de expiración (10 minutos)
    loginTokens.set(interaction.user.id, {
      token,
      expires: Date.now() + 600000, // 10 minutos
      attempts: 0,
    })

    const embed = new EmbedBuilder()
      .setTitle("Sistema de Inicio de Sesión")
      .setDescription("Por favor, selecciona una opción para iniciar sesión en el sistema de Cognixion Studio.")
      .addFields(
        { name: "Código de Acceso", value: "Recibirás un código único por mensaje directo." },
        { name: "Credenciales", value: "Introduce tu nombre de usuario y contraseña." },
      )
      .setColor(colors.primary)
      .setFooter({
        text: "Este inicio de sesión expirará en 10 minutos",
        iconURL: interaction.client.user.displayAvatarURL(),
      })
      .setTimestamp()

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("login-code").setLabel("Código de Acceso").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("login-credentials").setLabel("Credenciales").setStyle(ButtonStyle.Secondary),
    )

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true })

    // Configurar colector de interacciones para los botones
    const filter = (i) =>
      i.user.id === interaction.user.id && (i.customId === "login-code" || i.customId === "login-credentials")

    const collector = interaction.channel.createMessageComponentCollector({
      filter,
      time: 300000, // 5 minutos
    })

    collector.on("collect", async (i) => {
      if (i.customId === "login-code") {
        try {
          // Enviar código por DM
          const dmEmbed = new EmbedBuilder()
            .setTitle("Código de Acceso - Cognixion Studio")
            .setDescription(
              `Tu código de acceso es: **${token.substring(0, 6)}**\n\nEste código expirará en 10 minutos.`,
            )
            .setColor(colors.primary)
            .setTimestamp()

          await interaction.user.send({ embeds: [dmEmbed] })

          // Actualizar mensaje original
          const updatedEmbed = new EmbedBuilder()
            .setTitle("Código Enviado")
            .setDescription(
              "Se ha enviado un código de acceso a tus mensajes directos. Por favor, introduce el código a continuación.",
            )
            .setColor(colors.primary)
            .setFooter({
              text: "Este código expirará en 10 minutos",
              iconURL: interaction.client.user.displayAvatarURL(),
            })
            .setTimestamp()

          const codeRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("login-enter-code")
              .setLabel("Introducir Código")
              .setStyle(ButtonStyle.Primary),
          )

          await i.update({ embeds: [updatedEmbed], components: [codeRow] })
          collector.stop()
        } catch (error) {
          console.error("Error al enviar DM:", error)
          await i.reply({
            content:
              "No pude enviarte un mensaje directo. Por favor, asegúrate de tener habilitados los mensajes directos de miembros del servidor.",
            ephemeral: true,
          })
        }
      } else if (i.customId === "login-credentials") {
        // Crear modal para credenciales
        const modal = new ModalBuilder().setCustomId("login-modal").setTitle("Iniciar Sesión - Cognixion Studio")

        const usernameInput = new TextInputBuilder()
          .setCustomId("login-username")
          .setLabel("Nombre de Usuario")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)

        const passwordInput = new TextInputBuilder()
          .setCustomId("login-password")
          .setLabel("Contraseña")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)

        const firstRow = new ActionRowBuilder().addComponents(usernameInput)
        const secondRow = new ActionRowBuilder().addComponents(passwordInput)

        modal.addComponents(firstRow, secondRow)

        await i.showModal(modal)
        collector.stop()
      }
    })

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        interaction
          .editReply({
            content: "El tiempo para iniciar sesión ha expirado. Por favor, intenta de nuevo.",
            components: [],
            embeds: [],
          })
          .catch(console.error)
      }
    })
  },
}
