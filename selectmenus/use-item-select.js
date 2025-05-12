const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "use-item-select",
  async execute(interaction) {
    try {
      const itemId = interaction.values[0]

      // Obtener información del artículo
      const { pool } = require("../utils/database")
      const [items] = await pool.execute(
        `
        SELECT i.*, ui.quantity 
        FROM user_inventory ui 
        JOIN shop_items i ON ui.item_id = i.id 
        WHERE ui.user_id = ? AND i.id = ?
      `,
        [interaction.user.id, itemId],
      )

      if (items.length === 0) {
        return interaction.reply({
          content: "No tienes ese artículo en tu inventario.",
          ephemeral: true,
        })
      }

      const item = items[0]

      // Procesar uso del artículo según su tipo
      let result = "Has usado el artículo correctamente."
      let success = true

      if (item.type === "consumable") {
        // Consumibles (comida, pociones, etc.)
        // Reducir cantidad en inventario
        await pool.execute("UPDATE user_inventory SET quantity = quantity - 1 WHERE user_id = ? AND item_id = ?", [
          interaction.user.id,
          itemId,
        ])

        // Aplicar efectos según los datos del artículo
        if (item.data) {
          try {
            const data = JSON.parse(item.data)
            if (data.coins) {
              await pool.execute("UPDATE users SET coins = coins + ? WHERE id = ?", [data.coins, interaction.user.id])
              result = `Has ganado ${data.coins} monedas al usar este artículo.`
            } else if (data.xp) {
              const { addUserXP } = require("../utils/database")
              const xpResult = await addUserXP(interaction.user.id, interaction.guild.id, data.xp)
              result = `Has ganado ${data.xp} XP al usar este artículo.`
              if (xpResult.leveledUp) {
                result += ` ¡Has subido al nivel ${xpResult.newLevel}!`
              }
            }
          } catch (error) {
            console.error("Error al procesar datos del artículo:", error)
          }
        }
      } else if (item.type === "key") {
        // Llaves (para cajas, cofres, etc.)
        result = "Este tipo de artículo no se puede usar directamente."
        success = false
      } else {
        // Tipo desconocido
        result = "Este tipo de artículo no se puede usar."
        success = false
      }

      // Crear embed de resultado
      const embed = new EmbedBuilder()
        .setTitle(success ? "✅ Artículo Usado" : "❌ No se puede usar")
        .setDescription(result)
        .addFields(
          { name: "Artículo", value: item.name, inline: true },
          { name: "Cantidad Restante", value: (item.quantity - (success ? 1 : 0)).toString(), inline: true },
        )
        .setColor(success ? colors.success : colors.error)
        .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp()

      if (item.image_url) {
        embed.setThumbnail(item.image_url)
      }

      await interaction.update({ content: null, embeds: [embed], components: [] })
    } catch (error) {
      console.error("Error al usar artículo:", error)
      await interaction.reply({
        content: "Hubo un error al usar el artículo.",
        ephemeral: true,
      })
    }
  },
}
