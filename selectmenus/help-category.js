const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { colors } = require("../config.json")
const fs = require("node:fs")
const path = require("node:path")

module.exports = {
  customId: "help-category",
  async execute(interaction) {
    const selectedCategory = interaction.values[0]
    const { client } = interaction

    // Obtener comandos de la categoría seleccionada
    const categoryPath = path.join(__dirname, `../commands/${selectedCategory}`)
    const commandFiles = fs.readdirSync(categoryPath).filter((file) => file.endsWith(".js"))

    // Crear embed para la categoría
    const embed = new EmbedBuilder()
      .setTitle(`Comandos de ${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}`)
      .setDescription(
        `Aquí tienes una lista de todos los comandos disponibles en la categoría **${selectedCategory}**.`,
      )
      .setColor(colors.primary)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .setFooter({
        text: `${commandFiles.length} comandos • Usa /help [comando] para más detalles`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp()

    // Añadir cada comando al embed
    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file)
      const command = require(filePath)

      if ("data" in command && "execute" in command) {
        embed.addFields({
          name: `/${command.data.name}`,
          value: command.data.description || "Sin descripción",
          inline: true,
        })
      }
    }

    // Crear botones de navegación
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("help-home")
        .setLabel("Volver al Inicio")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🏠"),
      new ButtonBuilder()
        .setCustomId("help-support")
        .setLabel("Soporte")
        .setStyle(ButtonStyle.Link)
        .setURL("https://discord.gg/cognixion")
        .setEmoji("🔧"),
    )

    await interaction.update({ embeds: [embed], components: [interaction.message.components[0], row] })
  },
}
