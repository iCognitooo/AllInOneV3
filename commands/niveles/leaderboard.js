const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { getData } = require("../../utils/data-manager")
const { colors } = require("../../config.json")
const logger = require("../../utils/logger")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Muestra la tabla de clasificación de niveles del servidor")
    .addIntegerOption((option) =>
      option.setName("pagina").setDescription("Número de página").setRequired(false).setMinValue(1),
    ),
  cooldown: 10,
  async execute(interaction) {
    try {
      const page = interaction.options.getInteger("pagina") || 1
      const perPage = 10
      const offset = (page - 1) * perPage

      // Obtener usuarios ordenados por nivel y XP
      const usersData = await getData(
        "levels",
        { guildId: interaction.guild.id },
        "SELECT id, username, level, xp FROM users ORDER BY level DESC, xp DESC LIMIT ? OFFSET ?",
        [perPage, offset],
      )

      // Obtener total de usuarios para paginación
      const totalData = await getData(
        "levels",
        { guildId: interaction.guild.id },
        "SELECT COUNT(*) as count FROM users",
        [],
      )

      const totalUsers = totalData && totalData.length > 0 ? totalData[0].count : 0
      const totalPages = Math.ceil(totalUsers / perPage) || 1

      if (!usersData || usersData.length === 0) {
        return interaction.reply("No hay usuarios registrados en la base de datos.")
      }

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle("🏆 Tabla de Clasificación")
        .setDescription(`Clasificación de niveles de ${interaction.guild.name}`)
        .setColor(colors.primary)
        .setFooter({ text: `Página ${page}/${totalPages}`, iconURL: interaction.guild.iconURL() })
        .setTimestamp()

      // Añadir usuarios al embed
      let leaderboardText = ""
      for (let i = 0; i < usersData.length; i++) {
        const user = usersData[i]
        const position = offset + i + 1
        const medal = position === 1 ? "🥇" : position === 2 ? "🥈" : position === 3 ? "🥉" : `${position}.`

        // Intentar obtener el usuario de Discord
        let username = user.username || "Usuario Desconocido"
        try {
          const discordUser = await interaction.client.users.fetch(user.id || user.userId)
          username = discordUser.tag
        } catch {
          // Si no se puede obtener, usar el nombre guardado
        }

        leaderboardText += `${medal} **${username}** - Nivel ${user.level || 1} (${user.xp || 0} XP)\n`
      }

      embed.setDescription(leaderboardText)

      // Enviar embed
      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      logger.error("Error al obtener leaderboard:", error)
      await interaction.reply("Hubo un error al obtener la tabla de clasificación.")
    }
  },
}
