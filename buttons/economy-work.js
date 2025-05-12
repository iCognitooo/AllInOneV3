const { EmbedBuilder } = require("discord.js")
const { colors } = require("../config.json")

module.exports = {
  customId: "economy-work",
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

    // Verificar cooldown
    const now = Date.now()
    const cooldownTime = 3600000 // 1 hora en milisegundos

    if (profile.lastWork && now - profile.lastWork < cooldownTime) {
      const timeLeft = cooldownTime - (now - profile.lastWork)
      const minutes = Math.floor(timeLeft / 60000)
      const seconds = Math.floor((timeLeft % 60000) / 1000)

      return interaction.reply({
        content: `Debes esperar ${minutes}m ${seconds}s antes de volver a trabajar.`,
        ephemeral: true,
      })
    }

    // Lista de trabajos posibles
    const jobs = [
      {
        name: "Desarrollador",
        description: "Programaste una aplicación para un cliente.",
        reward: { min: 150, max: 300 },
      },
      {
        name: "Diseñador",
        description: "Creaste un logotipo para una empresa.",
        reward: { min: 120, max: 250 },
      },
      {
        name: "Escritor",
        description: "Escribiste un artículo para un blog.",
        reward: { min: 100, max: 200 },
      },
      {
        name: "Repartidor",
        description: "Entregaste pedidos durante todo el día.",
        reward: { min: 80, max: 180 },
      },
      {
        name: "Cajero",
        description: "Atendiste a clientes en una tienda.",
        reward: { min: 70, max: 150 },
      },
    ]

    // Seleccionar trabajo aleatorio
    const job = jobs[Math.floor(Math.random() * jobs.length)]

    // Calcular recompensa
    const reward = Math.floor(Math.random() * (job.reward.max - job.reward.min + 1)) + job.reward.min

    // Aplicar bonificaciones según nivel
    let bonusMultiplier = 1.0
    if (profile.level >= 10) bonusMultiplier += 0.1
    if (profile.level >= 20) bonusMultiplier += 0.1
    if (profile.level >= 30) bonusMultiplier += 0.1
    if (profile.level >= 50) bonusMultiplier += 0.2

    const finalReward = Math.floor(reward * bonusMultiplier)

    // Actualizar perfil
    profile.coins += finalReward
    profile.workCount += 1
    profile.lastWork = now

    // Añadir XP
    const xpGained = Math.floor(Math.random() * 11) + 5
    profile.xp += xpGained

    // Verificar si sube de nivel
    const xpNeeded = profile.level * 100
    if (profile.xp >= xpNeeded) {
      profile.level += 1
      profile.xp -= xpNeeded

      // Bonus por subir de nivel
      const levelUpBonus = profile.level * 50
      profile.coins += levelUpBonus
    }

    // Guardar perfil actualizado
    interaction.client.economy.set(userId, profile)

    // Crear embed
    const embed = new EmbedBuilder()
      .setTitle(`💼 Trabajaste como ${job.name}`)
      .setDescription(job.description)
      .addFields(
        { name: "Ganancia", value: `${finalReward} monedas`, inline: true },
        { name: "Nuevo Balance", value: `${profile.coins} monedas`, inline: true },
        { name: "XP Ganado", value: `+${xpGained} XP`, inline: true },
      )
      .setColor(colors.success)
      .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp()

    if (bonusMultiplier > 1.0) {
      embed.addFields({
        name: "Bonificación",
        value: `+${Math.round((bonusMultiplier - 1) * 100)}% por nivel ${profile.level}`,
        inline: true,
      })
    }

    await interaction.reply({ embeds: [embed] })
  },
}
