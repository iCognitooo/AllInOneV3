const { StringSelectMenuBuilder, ActionRowBuilder } = require("discord.js")

module.exports = {
  customId: "use-item",
  async execute(interaction) {
    try {
      // Obtener inventario del usuario
      const { pool } = require("../utils/database")
      const [inventory] = await pool.execute(
        `
        SELECT i.*, ui.quantity 
        FROM user_inventory ui 
        JOIN shop_items i ON ui.item_id = i.id 
        WHERE ui.user_id = ? AND ui.quantity > 0
        ORDER BY i.category, i.name
      `,
        [interaction.user.id],
      )

      if (inventory.length === 0) {
        return interaction.reply({
          content: "No tienes ningún artículo que puedas usar.",
          ephemeral: true,
        })
      }

      // Filtrar solo artículos usables
      const usableItems = inventory.filter((item) => item.type !== "role" && item.type !== "badge")

      if (usableItems.length === 0) {
        return interaction.reply({
          content: "No tienes ningún artículo que puedas usar.",
          ephemeral: true,
        })
      }

      // Crear menú de selección
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("use-item-select")
          .setPlaceholder("Selecciona un artículo para usar")
          .addOptions(
            usableItems.map((item) => ({
              label: item.name,
              description: `${item.description.substring(0, 50)}${item.description.length > 50 ? "..." : ""}`,
              value: item.id,
            })),
          ),
      )

      await interaction.reply({
        content: "Selecciona un artículo para usar:",
        components: [row],
        ephemeral: true,
      })
    } catch (error) {
      console.error("Error al mostrar menú de uso de artículos:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
