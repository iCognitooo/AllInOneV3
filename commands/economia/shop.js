const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")
const { colors } = require("../../config.json")
const { getUser } = require("../../utils/database")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("Muestra la tienda del servidor o compra un artículo")
    .addSubcommand((subcommand) => subcommand.setName("view").setDescription("Ver la tienda del servidor"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("buy")
        .setDescription("Comprar un artículo de la tienda")
        .addStringOption((option) =>
          option.setName("id").setDescription("ID del artículo que quieres comprar").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("inventory").setDescription("Ver tu inventario de artículos")),
  cooldown: 5,
  async execute(interaction) {
    try {
      const subcommand = interaction.options.getSubcommand()

      if (subcommand === "view") {
        // Obtener artículos de la tienda
        const { pool } = require("../../utils/database")
        const [items] = await pool.execute(
          "SELECT * FROM shop_items WHERE guild_id = ? OR guild_id IS NULL ORDER BY price ASC",
          [interaction.guild.id],
        )

        if (items.length === 0) {
          return interaction.reply("No hay artículos disponibles en la tienda.")
        }

        // Agrupar artículos por categoría
        const categories = {}
        for (const item of items) {
          if (!categories[item.category]) {
            categories[item.category] = []
          }
          categories[item.category].push(item)
        }

        // Crear embed inicial
        const embed = new EmbedBuilder()
          .setTitle("🛒 Tienda del Servidor")
          .setDescription("Selecciona una categoría para ver los artículos disponibles.")
          .setColor(colors.primary)
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        // Crear menú de selección de categorías
        const row = new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId("shop-category")
            .setPlaceholder("Selecciona una categoría")
            .addOptions(
              Object.keys(categories).map((category) => ({
                label: category.charAt(0).toUpperCase() + category.slice(1),
                description: `Ver artículos de ${category}`,
                value: category,
              })),
            ),
        )

        await interaction.reply({ embeds: [embed], components: [row] })
      } else if (subcommand === "buy") {
        const itemId = interaction.options.getString("id")

        // Obtener artículo
        const { pool } = require("../../utils/database")
        const [items] = await pool.execute("SELECT * FROM shop_items WHERE id = ?", [itemId])

        if (items.length === 0) {
          return interaction.reply({
            content: "No se encontró ningún artículo con ese ID.",
            ephemeral: true,
          })
        }

        const item = items[0]

        // Verificar si el artículo está disponible en este servidor
        if (item.guild_id !== null && item.guild_id !== interaction.guild.id) {
          return interaction.reply({
            content: "Este artículo no está disponible en este servidor.",
            ephemeral: true,
          })
        }

        // Obtener usuario
        const user = await getUser(interaction.user.id, interaction.user.tag)

        // Verificar si tiene suficientes monedas
        if (user.coins < item.price) {
          return interaction.reply({
            content: `No tienes suficientes monedas para comprar este artículo. Necesitas ${item.price} monedas.`,
            ephemeral: true,
          })
        }

        // Restar monedas
        await pool.execute("UPDATE users SET coins = coins - ? WHERE id = ?", [item.price, interaction.user.id])

        // Añadir artículo al inventario
        await pool.execute(
          "INSERT INTO user_inventory (user_id, item_id, acquired_at, quantity) VALUES (?, ?, NOW(), 1) ON DUPLICATE KEY UPDATE quantity = quantity + 1",
          [interaction.user.id, item.id],
        )

        // Confirmar compra
        const embed = new EmbedBuilder()
          .setTitle("✅ Compra Exitosa")
          .setDescription(`Has comprado **${item.name}** por ${item.price} monedas.`)
          .addFields(
            { name: "Descripción", value: item.description, inline: false },
            { name: "Monedas Restantes", value: `${user.coins - item.price}`, inline: true },
          )
          .setColor(colors.success)
          .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
          .setTimestamp()

        if (item.image_url) {
          embed.setThumbnail(item.image_url)
        }

        await interaction.reply({ embeds: [embed] })

        // Ejecutar acciones especiales según el tipo de artículo
        if (item.type === "role" && item.data) {
          try {
            const roleId = item.data
            const role = await interaction.guild.roles.fetch(roleId).catch(() => null)
            if (role && role.editable) {
              await interaction.member.roles.add(role)
              await interaction.followUp({
                content: `Se te ha otorgado el rol ${role.name}.`,
                ephemeral: true,
              })
            }
          } catch (error) {
            console.error("Error al asignar rol:", error)
          }
        }
      } else if (subcommand === "inventory") {
        // Obtener inventario del usuario
        const { pool } = require("../../utils/database")
        const [inventory] = await pool.execute(
          `
          SELECT i.*, ui.quantity, ui.acquired_at 
          FROM user_inventory ui 
          JOIN shop_items i ON ui.item_id = i.id 
          WHERE ui.user_id = ? 
          ORDER BY ui.acquired_at DESC
        `,
          [interaction.user.id],
        )

        if (inventory.length === 0) {
          return interaction.reply("No tienes ningún artículo en tu inventario.")
        }

        // Crear embed
        const embed = new EmbedBuilder()
          .setTitle("🎒 Tu Inventario")
          .setDescription(`Inventario de ${interaction.user.tag}`)
          .setColor(colors.primary)
          .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })
          .setTimestamp()

        // Agrupar artículos por categoría
        const categories = {}
        for (const item of inventory) {
          if (!categories[item.category]) {
            categories[item.category] = []
          }
          categories[item.category].push(item)
        }

        // Añadir campos por categoría
        for (const [category, items] of Object.entries(categories)) {
          let itemsText = ""
          for (const item of items) {
            const date = new Date(item.acquired_at).toLocaleDateString()
            itemsText += `**${item.name}** (x${item.quantity}) - Adquirido: ${date}\n`
          }
          embed.addFields({ name: category.charAt(0).toUpperCase() + category.slice(1), value: itemsText })
        }

        // Botones para usar artículos
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("use-item").setLabel("Usar Artículo").setStyle(ButtonStyle.Primary),
        )

        await interaction.reply({ embeds: [embed], components: [row] })
      }
    } catch (error) {
      console.error("Error en comando shop:", error)
      await interaction.reply({
        content: "Hubo un error al procesar tu solicitud.",
        ephemeral: true,
      })
    }
  },
}
