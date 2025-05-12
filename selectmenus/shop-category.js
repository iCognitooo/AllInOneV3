const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "shop-category",
  async execute(interaction) {
    try {
      const category = interaction.values[0]

      // Obtener artículos de la categoría seleccionada
      const { pool } = require("../utils/database")
      const [items] = await pool.execute(
        "SELECT * FROM shop_items WHERE (guild_id = ? OR guild_id IS NULL) AND category = ? ORDER BY price ASC",
        [interaction.guild.id, category],
      )

      if (items.length === 0) {
        return interaction.reply({
          content: "No hay artículos disponibles en esta categoría.",
          ephemeral: true,
        })
      }

      // Crear embed de la categoría
      const embed = new EmbedBuilder()
        .setTitle(`🛒 Tienda - ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription("Selecciona un artículo para ver más detalles.")
        .setColor(colors.primary)
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Añadir artículos al embed
      for (const item of items) {
        embed.addFields({
          name: `${item.name} - ${item.price} monedas`,
          value: `ID: \`${item.id}\`\n${item.description}`,
        })
      }

      // Botón para volver a la lista de categorías
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("shop-back").setLabel("Volver").setStyle(ButtonStyle.Secondary),
      )

      await interaction.update({ embeds: [embed], components: [row] })
    } catch (error) {
      console.error("Error al mostrar categoría de tienda:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
