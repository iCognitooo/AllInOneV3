const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "close-ticket",
  async execute(interaction) {
    try {
      const embed = new EmbedBuilder()
        .setTitle("Cerrar Ticket")
        .setDescription("¿Estás seguro de que quieres cerrar este ticket?")
        .setColor(colors.warning)
        .setFooter({ text: "Esta acción no se puede deshacer" })
        .setTimestamp()

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("confirm-close-ticket").setLabel("Confirmar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("cancel-close-ticket").setLabel("Cancelar").setStyle(ButtonStyle.Secondary),
      )

      await interaction.reply({ embeds: [embed], components: [row] })
    } catch (error) {
      console.error("Error al mostrar confirmación de cierre:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
