const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "economy-withdraw-all",
  async execute(interaction) {
    // Verificar si existe el sistema de economía
    if (!interaction.client.economy) {
      interaction.client.economy = new Map()
    }

    // Obtener perfil del usuario
    const userId = interaction.user.id
    let profile = interaction.client.economy.get(userId)

    if (!profile) {
      profile = {
        coins: 500,
        bank: 0,
        level: 1,
        xp: 0,
        workCount: 0,
        robSuccessCount: 0,
        robFailCount: 0,
        dailyCount: 0,
        lastDaily: null,
        lastWork: null,
        lastRob: null,
        inventory: [],
      }
    }

    // Verificar si tiene monedas en el banco para retirar
    if (profile.bank <= 0) {
      return interaction.reply({
        content: "No tienes monedas en el banco para retirar.",
        ephemeral: true,
      })
    }

    // Retirar todas las monedas
    const amount = profile.bank
    profile.coins += amount
    profile.bank = 0

    // Guardar perfil actualizado
    interaction.client.economy.set(userId, profile)

    // Crear embed
    const embed = new EmbedBuilder()
      .setTitle("💸 Retiro Exitoso")
      .setDescription(`Has retirado **${amount.toLocaleString()} monedas** de tu cuenta bancaria.`)
      .addFields(
        { name: "Monedas", value: `${profile.coins.toLocaleString()} monedas`, inline: true },
        { name: "Banco", value: `${profile.bank.toLocaleString()} monedas`, inline: true },
        { name: "Total", value: `${(profile.coins + profile.bank).toLocaleString()} monedas`, inline: true },
      )
      .setColor(colors.success)
      .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()

    await interaction.reply({ embeds: [embed] })
  },
}
