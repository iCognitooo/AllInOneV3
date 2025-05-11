<div align="center">
  <img src="https://i.imgur.com/XYq9ity.png" alt="Cognixion Studio Bot" width="200" height="200">
  <h1>Cognixion Studio Discord Bot</h1>
  <p>
    <b>Un bot de Discord profesional, modular y completo desarrollado con Node.js y discord.js v14</b>
  </p>
  <p>
    <img src="https://img.shields.io/badge/node.js-v16.9.0+-brightgreen.svg" alt="Node.js Version">
    <img src="https://img.shields.io/badge/discord.js-v14.14.1-blue.svg" alt="discord.js Version">
    <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License">
    <img src="https://img.shields.io/badge/status-active-success.svg" alt="Status">
  </p>
</div>

## 📋 Características Principales

- **Sistema de Comandos Modular**: Más de 400 comandos organizados por categorías
- **Slash Commands**: Comandos de barra diagonal para una experiencia de usuario moderna
- **Sistema de Tickets**: Gestión completa de tickets de soporte con transcripciones
- **Sistema de Verificación**: Múltiples métodos (botón, captcha, reacción) para verificar usuarios
- **Sistema de Niveles**: Tarjetas de nivel personalizadas, roles por nivel y tabla de clasificación
- **Sistema de Economía**: Monedas, tienda, trabajos, inventario y más
- **Sistema de Moderación**: Comandos para gestionar el servidor (ban, kick, mute, warn, etc.)
- **Auto-Moderación**: Filtros de palabras, anti-spam, anti-enlaces y más
- **Roles por Reacción**: Asigna roles mediante reacciones o menús desplegables
- **Sistema de Bienvenida**: Mensajes personalizables con embeds atractivos
- **Sistema de Sorteos**: Crea y gestiona sorteos con múltiples ganadores
- **Recordatorios**: Establece recordatorios personales o para el servidor
- **Sistema de Encuestas**: Crea encuestas interactivas con múltiples opciones
- **Estadísticas**: Visualiza datos del servidor con gráficos y análisis
- **Sistema de Login**: Autenticación segura con códigos o credenciales
- **Base de Datos**: Almacenamiento persistente con MySQL/MariaDB

## 🖼️ Capturas de Pantalla

<div align="center">
  <img src="https://i.imgur.com/XdJBjsf.png" alt="Tickets System" width="400">
  <img src="https://i.imgur.com/8tKY4nT.png" alt="Verification System" width="400">
  <img src="https://i.imgur.com/TKcVDPk.png" alt="Economy System" width="400">
  <img src="https://i.imgur.com/YCVZXd0.png" alt="Levels System" width="400">
</div>

## 🚀 Instalación

### Requisitos Previos

- Node.js 16.9.0 o superior
- MySQL/MariaDB
- Un bot de Discord registrado en [Discord Developer Portal](https://discord.com/developers/applications)

### Pasos de Instalación

1. **Clonar el repositorio**
   \`\`\`bash
   git clone https://github.com/tu-usuario/cognixion-discord-bot.git
   cd cognixion-discord-bot
   \`\`\`

2. **Instalar dependencias**
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurar el archivo `config.json`**
   \`\`\`json
   {
     "token": "TU_TOKEN_DE_DISCORD",
     "clientId": "ID_DE_TU_BOT",
     "guildId": "ID_DE_TU_SERVIDOR",
     "database": {
       "host": "localhost",
       "user": "usuario",
       "password": "contraseña",
       "database": "cognixion_bot"
     },
     "colors": {
       "primary": "#5865F2",
       "success": "#57F287",
       "warning": "#FEE75C",
       "error": "#ED4245",
       "info": "#5865F2"
     }
   }
   \`\`\`

4. **Crear la base de datos**
   \`\`\`sql
   CREATE DATABASE cognixion_bot;
   \`\`\`

5. **Registrar los comandos de barra diagonal**
   \`\`\`bash
   npm run deploy
   \`\`\`

6. **Iniciar el bot**
   \`\`\`bash
   npm start
   \`\`\`

## 📚 Estructura del Proyecto

\`\`\`
cognixion-discord-bot/
├── index.js                # Archivo principal del bot
├── config.json             # Configuración del bot
├── deploy-commands.js      # Script para registrar comandos
├── commands/               # Comandos organizados por categorías
│   ├── admin/              # Comandos administrativos
│   ├── economia/           # Sistema económico
│   ├── moderacion/         # Comandos de moderación
│   ├── niveles/            # Sistema de niveles
│   ├── tickets/            # Sistema de tickets
│   ├── utilidad/           # Comandos útiles
│   └── ...
├── events/                 # Manejadores de eventos
├── buttons/                # Manejadores de interacciones de botones
├── modals/                 # Manejadores de interacciones de modales
├── selectMenus/            # Manejadores de interacciones de menús
└── utils/                  # Utilidades y funciones auxiliares
    ├── database.js         # Funciones de base de datos
    ├── logger.js           # Sistema de registro
    ├── ticket-manager.js   # Gestor de tickets
    └── ...
\`\`\`

## 🔧 Comandos Principales

### Configuración
- `/setup-tickets` - Configura el sistema de tickets
- `/setup-verification` - Configura el sistema de verificación
- `/setup-welcome` - Configura mensajes de bienvenida
- `/setup-reaction-roles` - Configura roles por reacción
- `/setup-level-roles` - Configura roles por nivel
- `/automod setup` - Configura la auto-moderación

### Moderación
- `/ban` - Banea a un usuario
- `/kick` - Expulsa a un usuario
- `/mute` - Silencia a un usuario
- `/warn` - Advierte a un usuario
- `/clear` - Elimina mensajes

### Economía
- `/balance` - Muestra tu balance de monedas
- `/daily` - Reclama tu recompensa diaria
- `/work` - Trabaja para ganar monedas
- `/shop` - Accede a la tienda del servidor
- `/rob` - Intenta robar monedas a otro usuario

### Niveles
- `/rank` - Muestra tu tarjeta de nivel
- `/leaderboard` - Muestra la tabla de clasificación

### Utilidad
- `/help` - Muestra ayuda sobre los comandos
- `/poll` - Crea una encuesta
- `/giveaway` - Gestiona sorteos
- `/reminder` - Establece recordatorios
- `/stats` - Muestra estadísticas del servidor

### Tickets
- `/ticket crear` - Crea un nuevo ticket
- `/ticket close` - Cierra un ticket
- `/ticket-panel` - Crea un panel de tickets

## 🛠️ Personalización

El bot es altamente personalizable a través del archivo `config.json` y los comandos de configuración. Puedes modificar:

- **Colores**: Cambia los colores de los embeds
- **Emojis**: Personaliza los emojis utilizados
- **Mensajes**: Modifica los mensajes de bienvenida, tickets, etc.
- **Funcionalidades**: Activa o desactiva sistemas específicos

## 📈 Escalabilidad

El diseño modular del bot permite añadir fácilmente nuevas funcionalidades:

1. Crea un nuevo archivo en la carpeta correspondiente (commands, events, etc.)
2. Sigue la estructura existente para mantener la coherencia
3. El bot cargará automáticamente tu nueva funcionalidad

## 🤝 Contribuir

Las contribuciones son bienvenidas y apreciadas. Para contribuir:

1. Haz un fork del repositorio
2. Crea una rama para tu funcionalidad (`git checkout -b feature/amazing-feature`)
3. Haz commit de tus cambios (`git commit -m 'Add some amazing feature'`)
4. Haz push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

Si necesitas ayuda o tienes alguna pregunta:

- Abre un issue en este repositorio
- Únete a nuestro [servidor de Discord](https://discord.gg/cognixion)
- Contacta con el desarrollador en Discord: `tu_usuario#0000`

## 🙏 Agradecimientos

- [discord.js](https://discord.js.org/) por proporcionar una excelente biblioteca
- [Node.js](https://nodejs.org/) por el entorno de ejecución
- A todos los contribuidores y usuarios del bot

---

<div align="center">
  <p>Desarrollado con ❤️ por Cognixion Studio</p>
  <p>
    <a href="https://discord.gg/cognixion">Discord</a> •
    <a href="https://github.com/tu-usuario">GitHub</a> •
    <a href="https://cognixion.com">Website</a>
  </p>
</div>
