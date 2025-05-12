const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { getData } = require("../../utils/data-manager")
const logger = require("../../utils/logger")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Muestra tu balance económico o el de otro usuario")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuario del que quieres ver el balance").setRequired(false),
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply()

      // Obtener el usuario objetivo (el mencionado o el autor del comando)
      const targetUser = interaction.options.getUser("usuario") || interaction.user

      // Consulta SQL para obtener los datos económicos del usuario
      const sqlQuery = `
        SELECT * FROM economy 
        WHERE user_id = ? AND guild_id = ?
      `

      // Obtener datos económicos del usuario
      const economyData = await getData("economy", { userId: targetUser.id, guildId: interaction.guild.id }, sqlQuery, [
        targetUser.id,
        interaction.guild.id,
      ])

      // Si no hay datos económicos, crear un registro predeterminado
      let userEconomy
      if (!economyData || economyData.length === 0) {
        userEconomy = {
          userId: targetUser.id,
          guildId: interaction.guild.id,
          balance: 0,
          bank: 0,
          lastDaily: null,
          lastWork: null,
          inventory: [],
        }
      } else {
        userEconomy = economyData[0]
      }

      // Calcular el balance total
      const totalBalance = (userEconomy.balance || 0) + (userEconomy.bank || 0)

      // Crear un embed con la información económica
      const embed = new EmbedBuilder()
        .setTitle(`💰 Balance de ${targetUser.username}`)
        .setDescription(`Aquí está la información económica de ${targetUser.toString()}`)
        .setColor("#FFD700")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "💵 Efectivo", value: `${userEconomy.balance || 0} monedas`, inline: true },
          { name: "🏦 Banco", value: `${userEconomy.bank || 0} monedas`, inline: true },
          { name: "💎 Total", value: `${totalBalance} monedas`, inline: true },
        )
        .setFooter({ text: `ID: ${targetUser.id}` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      logger.error(`Error en el comando balance: ${error.message}`)

      // Si ya se ha diferido la respuesta, editar la respuesta
      if (interaction.deferred) {
        await interaction
          .editReply({
            content:
              "Ha ocurrido un error al obtener la información económica. Por favor, inténtalo de nuevo más tarde.",
          })
          .catch(console.error)
      } else {
        // Si no se ha diferido, responder normalmente
        await interaction
          .reply({
            content:
              "Ha ocurrido un error al obtener la información económica. Por favor, inténtalo de nuevo más tarde.",
            ephemeral: true,
          })
          .catch(console.error)
      }
    }
  },
}
