const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { getData, saveData, updateData } = require("../../utils/data-manager")
const logger = require("../../utils/logger")

// Lista de trabajos posibles con sus rangos de pago
const jobs = [
  {
    name: "Programador",
    minPay: 150,
    maxPay: 300,
    messages: ["Arreglaste un bug crítico", "Desarrollaste una nueva función", "Optimizaste el código"],
  },
  {
    name: "Médico",
    minPay: 200,
    maxPay: 350,
    messages: [
      "Atendiste una emergencia",
      "Realizaste una cirugía exitosa",
      "Diagnosticaste correctamente a un paciente",
    ],
  },
  {
    name: "Chef",
    minPay: 100,
    maxPay: 250,
    messages: ["Preparaste un plato exquisito", "Impresionaste a un crítico culinario", "Creaste un nuevo menú"],
  },
  {
    name: "Profesor",
    minPay: 120,
    maxPay: 220,
    messages: [
      "Diste una clase magistral",
      "Ayudaste a un estudiante a aprobar",
      "Organizaste una actividad educativa",
    ],
  },
  {
    name: "Policía",
    minPay: 130,
    maxPay: 280,
    messages: ["Resolviste un caso difícil", "Capturaste a un criminal buscado", "Ayudaste a la comunidad"],
  },
  {
    name: "Bombero",
    minPay: 140,
    maxPay: 290,
    messages: [
      "Apagaste un incendio",
      "Rescataste a alguien de un edificio en llamas",
      "Salvaste a un gato de un árbol",
    ],
  },
  {
    name: "Artista",
    minPay: 80,
    maxPay: 400,
    messages: ["Vendiste una obra de arte", "Realizaste una exposición exitosa", "Recibiste un encargo importante"],
  },
  {
    name: "Músico",
    minPay: 90,
    maxPay: 350,
    messages: ["Diste un concierto lleno", "Compusiste una canción exitosa", "Firmaste con una discográfica"],
  },
  {
    name: "Escritor",
    minPay: 100,
    maxPay: 300,
    messages: ["Publicaste un libro bestseller", "Ganaste un premio literario", "Firmaste un contrato para una serie"],
  },
  {
    name: "Astronauta",
    minPay: 250,
    maxPay: 500,
    messages: ["Completaste una misión espacial", "Descubriste algo nuevo en el espacio", "Reparaste un satélite"],
  },
]

module.exports = {
  data: new SlashCommandBuilder().setName("work").setDescription("Trabaja para ganar monedas"),

  async execute(interaction) {
    try {
      await interaction.deferReply()

      // Consulta SQL para obtener los datos económicos del usuario
      const sqlQuery = `
        SELECT * FROM economy 
        WHERE user_id = ? AND guild_id = ?
      `

      // Obtener datos económicos del usuario
      const economyData = await getData(
        "economy",
        { userId: interaction.user.id, guildId: interaction.guild.id },
        sqlQuery,
        [interaction.user.id, interaction.guild.id],
      )

      // Si no hay datos económicos, crear un registro predeterminado
      let userEconomy
      if (!economyData || economyData.length === 0) {
        userEconomy = {
          userId: interaction.user.id,
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

      // Verificar si el usuario ya trabajó recientemente
      const now = new Date()
      const lastWork = userEconomy.lastWork ? new Date(userEconomy.lastWork) : null
      const cooldown = 30 * 60 * 1000 // 30 minutos en milisegundos

      // Si el usuario ya trabajó y no ha pasado el tiempo de espera
      if (lastWork && now - lastWork < cooldown) {
        const timeLeft = cooldown - (now - lastWork)
        const minutes = Math.floor(timeLeft / (60 * 1000))
        const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000)

        const embed = new EmbedBuilder()
          .setTitle("⏳ Necesitas descansar")
          .setDescription(
            `Estás cansado de tu último trabajo. Podrás trabajar nuevamente en **${minutes} minutos y ${seconds} segundos**.`,
          )
          .setColor("#FF9900")
          .setFooter({ text: `Solicitado por ${interaction.user.username}` })
          .setTimestamp()

        return await interaction.editReply({ embeds: [embed] })
      }

      // Seleccionar un trabajo aleatorio
      const job = jobs[Math.floor(Math.random() * jobs.length)]

      // Seleccionar un mensaje aleatorio para el trabajo
      const message = job.messages[Math.floor(Math.random() * job.messages.length)]

      // Calcular la cantidad de monedas ganadas
      const amount = Math.floor(Math.random() * (job.maxPay - job.minPay + 1)) + job.minPay

      // Actualizar balance y última vez que trabajó
      const newBalance = (userEconomy.balance || 0) + amount

      // Actualizar datos en la base de datos
      if (userEconomy.id) {
        // Si el usuario ya existe en la base de datos, actualizar
        await updateData(
          "economy",
          userEconomy.id,
          {
            balance: newBalance,
            lastWork: now.toISOString(),
          },
          `UPDATE economy SET balance = ?, last_work = ? WHERE id = ?`,
          [newBalance, now.toISOString(), userEconomy.id],
        )
      } else {
        // Si el usuario no existe en la base de datos, insertar
        await saveData(
          "economy",
          {
            userId: interaction.user.id,
            guildId: interaction.guild.id,
            balance: newBalance,
            bank: 0,
            lastDaily: null,
            lastWork: now.toISOString(),
            inventory: [],
          },
          `INSERT INTO economy (user_id, guild_id, balance, bank, last_work) VALUES (?, ?, ?, ?, ?)`,
          [interaction.user.id, interaction.guild.id, newBalance, 0, now.toISOString()],
        )
      }

      // Crear un embed con la información del trabajo
      const embed = new EmbedBuilder()
        .setTitle(`💼 Trabajaste como ${job.name}`)
        .setDescription(`${message} y ganaste **${amount} monedas**!`)
        .setColor("#00FF00")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "💵 Monedas ganadas", value: `${amount}`, inline: true },
          { name: "🏦 Nuevo balance", value: `${newBalance}`, inline: true },
          { name: "⏱️ Próximo trabajo", value: "Disponible en 30 minutos", inline: true },
        )
        .setFooter({ text: `Buen trabajo, ${interaction.user.username}!` })
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      logger.error(`Error en el comando work: ${error.message}`)

      // Si ya se ha diferido la respuesta, editar la respuesta
      if (interaction.deferred) {
        await interaction
          .editReply({
            content: "Ha ocurrido un error al trabajar. Por favor, inténtalo de nuevo más tarde.",
          })
          .catch(console.error)
      } else {
        // Si no se ha diferido, responder normalmente
        await interaction
          .reply({
            content: "Ha ocurrido un error al trabajar. Por favor, inténtalo de nuevo más tarde.",
            ephemeral: true,
          })
          .catch(console.error)
      }
    }
  },
}
