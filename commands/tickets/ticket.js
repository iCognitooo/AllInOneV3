const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const { getData } = require("../../utils/data-manager")
const { createTicket } = require("../../utils/ticket-manager")
const logger = require("../../utils/logger")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Gestiona tickets o crea uno nuevo")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("crear")
        .setDescription("Crea un nuevo ticket")
        .addStringOption((option) =>
          option.setName("razon").setDescription("Razón para crear el ticket").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add")
        .setDescription("Añade un usuario al ticket actual")
        .addUserOption((option) => option.setName("usuario").setDescription("Usuario a añadir").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Elimina un usuario del ticket actual")
        .addUserOption((option) => option.setName("usuario").setDescription("Usuario a eliminar").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("close").setDescription("Cierra el ticket actual")),
  cooldown: 5,
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand()

      // Verificar si el sistema de tickets está configurado
      const settings = await getData(
        "guilds",
        { guildId: interaction.guild.id },
        "SELECT * FROM guild_settings WHERE guild_id = ?",
        [interaction.guild.id],
      )

      const guildSettings = settings && settings.length > 0 ? settings[0] : { guild_id: interaction.guild.id }

      if (!guildSettings.ticket_category || !guildSettings.ticket_log_channel) {
        return interaction.reply({
          content:
            "El sistema de tickets no está configurado. Un administrador debe usar `/setup-tickets` para configurarlo.",
          ephemeral: true,
        })
      }

      if (subcommand === "crear") {
        const reason = interaction.options.getString("razon") || "No se proporcionó una razón"
        await createTicket(interaction, "general", reason)
      } else {
        // Para los demás subcomandos, verificar si estamos en un canal de ticket
        const ticketData = await getTicketData(interaction.channel.id)
        if (!ticketData) {
          return interaction.reply({
            content: "Este comando solo puede usarse en un canal de ticket.",
            ephemeral: true,
          })
        }

        if (subcommand === "add") {
          const user = interaction.options.getUser("usuario")
          const member = await interaction.guild.members.fetch(user.id).catch(() => null)

          if (!member) {
            return interaction.reply({
              content: "No se pudo encontrar a ese usuario en el servidor.",
              ephemeral: true,
            })
          }

          // Dar permisos al usuario en el canal
          await interaction.channel.permissionOverwrites.edit(user.id, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          })

          const embed = new EmbedBuilder()
            .setTitle("Usuario Añadido")
            .setDescription(`${user} ha sido añadido al ticket.`)
            .setColor(colors.success)
            .setTimestamp()

          await interaction.reply({ embeds: [embed] })
        } else if (subcommand === "remove") {
          const user = interaction.options.getUser("usuario")

          // Verificar que no sea el creador del ticket
          if (user.id === ticketData.creator) {
            return interaction.reply({
              content: "No puedes eliminar al creador del ticket.",
              ephemeral: true,
            })
          }

          // Quitar permisos al usuario en el canal
          await interaction.channel.permissionOverwrites.edit(user.id, {
            ViewChannel: false,
          })

          const embed = new EmbedBuilder()
            .setTitle("Usuario Eliminado")
            .setDescription(`${user} ha sido eliminado del ticket.`)
            .setColor(colors.warning)
            .setTimestamp()

          await interaction.reply({ embeds: [embed] })
        } else if (subcommand === "close") {
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("confirm-close-ticket").setLabel("Confirmar").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId("cancel-close-ticket").setLabel("Cancelar").setStyle(ButtonStyle.Secondary),
          )

          const embed = new EmbedBuilder()
            .setTitle("Cerrar Ticket")
            .setDescription("¿Estás seguro de que quieres cerrar este ticket?")
            .setColor(colors.warning)
            .setFooter({ text: "Esta acción no se puede deshacer" })
            .setTimestamp()

          await interaction.reply({ embeds: [embed], components: [row] })
        }
      }
    } catch (error) {
      logger.error("Error en comando ticket:", error)
      await interaction.reply({
        content: "Hubo un error al procesar el comando.",
        ephemeral: true,
      })
    }
  },
}

// Función para obtener datos del ticket desde la base de datos o archivo
async function getTicketData(channelId) {
  try {
    // Intentar obtener de la base de datos
    const ticketData = await getData(
      "tickets",
      { channelId: channelId },
      "SELECT * FROM tickets WHERE channel_id = ?",
      [channelId],
    )

    if (ticketData && ticketData.length > 0) {
      return ticketData[0]
    }

    return null
  } catch (error) {
    logger.error("Error al obtener datos del ticket:", error)
    return null
  }
}
