const { ActivityType } = require("discord.js")

module.exports = {
  name: "ready",
  once: true,
  execute(client) {
    console.log(`¡Listo! Iniciado sesión como ${client.user.tag}`)

    // Establecer actividad "Jugando a Cognixion Studio"
    client.user.setPresence({
      activities: [
        {
          name: "Cognixion Studio",
          type: ActivityType.Playing,
        },
      ],
      status: "online",
    })
  },
}
