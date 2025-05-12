const { SlashCommandBuilder, EmbedBuilder } = require("discord.js")
const { colors } = require("../../config.json")
const fetch = import("node-fetch")

// Reemplazar con tu API key de OpenWeatherMap
const API_KEY = "YOUR_OPENWEATHERMAP_API_KEY"

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clima")
    .setDescription("Muestra el clima actual de una ciudad")
    .addStringOption((option) =>
      option.setName("ciudad").setDescription("Ciudad de la que quieres ver el clima").setRequired(true),
    ),

  cooldown: 10,

  async execute(interaction) {
    await interaction.deferReply()

    const ciudad = interaction.options.getString("ciudad")

    try {
      // Si no hay API key configurada, mostrar mensaje de error
      if (API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
        return interaction.editReply({
          content:
            "Este comando no está configurado correctamente. El administrador del bot debe configurar una API key de OpenWeatherMap.",
          ephemeral: true,
        })
      }

      // Obtener datos del clima
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(ciudad)}&appid=${API_KEY}&units=metric&lang=es`,
      )

      if (!response.ok) {
        if (response.status === 404) {
          return interaction.editReply({
            content: `No se encontró la ciudad "${ciudad}". Verifica el nombre e inténtalo de nuevo.`,
            ephemeral: true,
          })
        } else {
          throw new Error(`Error en la API: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()

      // Formatear datos
      const temp = Math.round(data.main.temp)
      const tempMin = Math.round(data.main.temp_min)
      const tempMax = Math.round(data.main.temp_max)
      const sensacionTermica = Math.round(data.main.feels_like)
      const humedad = data.main.humidity
      const viento = Math.round(data.wind.speed * 3.6) // Convertir de m/s a km/h
      const presion = data.main.pressure
      const descripcion = data.weather[0].description.charAt(0).toUpperCase() + data.weather[0].description.slice(1)
      const icono = data.weather[0].icon
      const iconoURL = `https://openweathermap.org/img/wn/${icono}@4x.png`
      const pais = data.sys.country
      const amanecer = new Date(data.sys.sunrise * 1000).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
      const anochecer = new Date(data.sys.sunset * 1000).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      })
      const visibilidad = data.visibility ? `${(data.visibility / 1000).toFixed(1)} km` : "No disponible"
      const nubes = data.clouds ? `${data.clouds.all}%` : "No disponible"

      // Determinar color según temperatura
      let color
      if (temp <= 0)
        color = "#9dc3e6" // Azul frío
      else if (temp <= 10)
        color = "#a8d08d" // Verde fresco
      else if (temp <= 20)
        color = "#ffe699" // Amarillo templado
      else if (temp <= 30)
        color = "#f8cbad" // Naranja cálido
      else color = "#ff7c80" // Rojo caliente

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle(`🌡️ Clima en ${data.name}, ${pais}`)
        .setColor(color)
        .setThumbnail(iconoURL)
        .setDescription(
          `**${descripcion}**\n**Temperatura:** ${temp}°C (Mín: ${tempMin}°C / Máx: ${tempMax}°C)\n**Sensación térmica:** ${sensacionTermica}°C`,
        )
        .addFields(
          { name: "💧 Humedad", value: `${humedad}%`, inline: true },
          { name: "💨 Viento", value: `${viento} km/h`, inline: true },
          { name: "🔍 Visibilidad", value: visibilidad, inline: true },
          { name: "☁️ Nubosidad", value: nubes, inline: true },
          { name: "🧭 Presión", value: `${presion} hPa`, inline: true },
          { name: "🌅 Amanecer", value: amanecer, inline: true },
          { name: "🌇 Anochecer", value: anochecer, inline: true },
        )
        .setFooter({ text: "Datos proporcionados por OpenWeatherMap" })
        .setTimestamp()

      // Añadir coordenadas
      if (data.coord) {
        embed.addFields({
          name: "📍 Coordenadas",
          value: `Lat: ${data.coord.lat.toFixed(2)}, Lon: ${data.coord.lon.toFixed(2)}`,
          inline: true,
        })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      console.error("Error en comando clima:", error)
      await interaction.editReply({
        content: "Hubo un error al obtener los datos del clima. Inténtalo de nuevo más tarde.",
        ephemeral: true,
      })
    }
  },
}
