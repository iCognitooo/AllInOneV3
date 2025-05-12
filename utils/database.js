const mysql = require("mysql2/promise")
const fs = require("fs")
const path = require("path")
const logger = require("./logger")

// Cargar configuración de la base de datos desde config.json
let dbConfig
try {
  const config = require("../config.json")
  dbConfig = {
    host: config.database?.host || "localhost",
    user: config.database?.user || "root",
    password: config.database?.password || "",
    database: config.database?.database || "discord_bot",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }
} catch (error) {
  logger.error(`Error al cargar la configuración de la base de datos: ${error.message}`)
  dbConfig = {
    host: "localhost",
    user: "root",
    password: "",
    database: "discord_bot",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  }
}

// Variable para almacenar el pool de conexiones
let pool = null

// Función para conectar a la base de datos
async function connectToDatabase() {
  try {
    logger.info("Intentando conectar a la base de datos...")

    // Crear pool de conexiones
    pool = mysql.createPool(dbConfig)

    // Verificar la conexión
    const connection = await pool.getConnection()
    connection.release()

    logger.info("Conexión a la base de datos establecida correctamente.")
    return pool
  } catch (error) {
    logger.error(`Error al conectar a la base de datos: ${error.message}`)
    pool = null
    return null
  }
}

// Función para ejecutar consultas SQL con manejo de errores
async function query(sql, params = []) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos. Intentando reconectar...")
      await connectToDatabase()

      if (!pool) {
        logger.error("No se pudo establecer conexión a la base de datos.")
        return { error: "No hay conexión a la base de datos", results: null }
      }
    }

    const [results] = await pool.execute(sql, params)
    return { error: null, results }
  } catch (error) {
    logger.error(`Error en la consulta SQL: ${error.message}`)
    return { error: error.message, results: null }
  }
}

// Función para verificar si una tabla existe
async function tableExists(tableName) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para verificar tabla.")
      return false
    }

    const { error, results } = await query(
      `SELECT COUNT(*) as count FROM information_schema.tables 
       WHERE table_schema = ? AND table_name = ?`,
      [dbConfig.database, tableName],
    )

    if (error) {
      logger.error(`Error al verificar si la tabla ${tableName} existe: ${error}`)
      return false
    }

    return results[0].count > 0
  } catch (error) {
    logger.error(`Error al verificar si la tabla ${tableName} existe: ${error.message}`)
    return false
  }
}

// Función para crear tablas si no existen
async function createTablesIfNotExist() {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para crear tablas.")
      return false
    }

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, "..", "database-schema.sql")
    if (!fs.existsSync(sqlPath)) {
      logger.error("No se encontró el archivo de esquema de base de datos.")
      return false
    }

    const sqlContent = fs.readFileSync(sqlPath, "utf8")
    const sqlStatements = sqlContent.split(";").filter((statement) => statement.trim() !== "")

    // Ejecutar cada declaración SQL
    for (const statement of sqlStatements) {
      const { error } = await query(statement)
      if (error) {
        logger.error(`Error al ejecutar la declaración SQL: ${error}`)
      }
    }

    logger.info("Tablas creadas o verificadas correctamente.")
    return true
  } catch (error) {
    logger.error(`Error al crear tablas: ${error.message}`)
    return false
  }
}

// Función para obtener datos con manejo de errores y fallback
async function getDataWithFallback(sql, params = [], fallbackData = []) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos. Usando datos de respaldo.")
      return fallbackData
    }

    const { error, results } = await query(sql, params)

    if (error) {
      logger.warn(`Error al obtener datos: ${error}. Usando datos de respaldo.`)
      return fallbackData
    }

    return results
  } catch (error) {
    logger.error(`Error al obtener datos: ${error.message}`)
    return fallbackData
  }
}

// Función para insertar datos con manejo de errores
async function insertData(sql, params = []) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para insertar datos.")
      return { success: false, error: "No hay conexión a la base de datos", insertId: null }
    }

    const { error, results } = await query(sql, params)

    if (error) {
      return { success: false, error, insertId: null }
    }

    return { success: true, error: null, insertId: results.insertId }
  } catch (error) {
    logger.error(`Error al insertar datos: ${error.message}`)
    return { success: false, error: error.message, insertId: null }
  }
}

// Función para actualizar datos con manejo de errores
async function updateData(sql, params = []) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para actualizar datos.")
      return { success: false, error: "No hay conexión a la base de datos", affectedRows: 0 }
    }

    const { error, results } = await query(sql, params)

    if (error) {
      return { success: false, error, affectedRows: 0 }
    }

    return { success: true, error: null, affectedRows: results.affectedRows }
  } catch (error) {
    logger.error(`Error al actualizar datos: ${error.message}`)
    return { success: false, error: error.message, affectedRows: 0 }
  }
}

// Función para eliminar datos con manejo de errores
async function deleteData(sql, params = []) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para eliminar datos.")
      return { success: false, error: "No hay conexión a la base de datos", affectedRows: 0 }
    }

    const { error, results } = await query(sql, params)

    if (error) {
      return { success: false, error, affectedRows: 0 }
    }

    return { success: true, error: null, affectedRows: results.affectedRows }
  } catch (error) {
    logger.error(`Error al eliminar datos: ${error.message}`)
    return { success: false, error: error.message, affectedRows: 0 }
  }
}

// Función para cerrar la conexión a la base de datos
async function closeConnection() {
  try {
    if (pool) {
      await pool.end()
      logger.info("Conexión a la base de datos cerrada correctamente.")
    }
  } catch (error) {
    logger.error(`Error al cerrar la conexión a la base de datos: ${error.message}`)
  }
}

// Función para verificar el estado de la conexión
function isConnected() {
  return pool !== null
}

// Función para obtener usuario con fallback
async function getUser(userId, username) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para obtener usuario. Usando datos de respaldo.")
      return { id: userId, username, xp: 0, level: 1, coins: 0, last_daily: null, last_work: null }
    }

    const [rows] = await pool.execute("SELECT * FROM users WHERE id = ?", [userId])

    if (rows.length > 0) {
      return rows[0]
    } else {
      // Crear nuevo usuario
      try {
        await pool.execute("INSERT INTO users (id, username) VALUES (?, ?)", [userId, username])
        const [newUser] = await pool.execute("SELECT * FROM users WHERE id = ?", [userId])
        return newUser[0]
      } catch (error) {
        logger.error(`Error al crear nuevo usuario: ${error.message}`)
        return { id: userId, username, xp: 0, level: 1, coins: 0, last_daily: null, last_work: null }
      }
    }
  } catch (error) {
    logger.error(`Error al obtener usuario: ${error.message}`)
    return { id: userId, username, xp: 0, level: 1, coins: 0, last_daily: null, last_work: null }
  }
}

// Función para obtener configuración de un servidor con fallback
async function getGuildSettings(guildId) {
  try {
    if (!pool) {
      logger.warn(
        "No hay conexión a la base de datos para obtener configuración del servidor. Usando datos de respaldo.",
      )
      return { guild_id: guildId }
    }

    const [rows] = await pool.execute("SELECT * FROM guild_settings WHERE guild_id = ?", [guildId])

    if (rows.length > 0) {
      return rows[0]
    } else {
      // Crear configuración por defecto
      try {
        await pool.execute("INSERT INTO guild_settings (guild_id) VALUES (?)", [guildId])
        const [newSettings] = await pool.execute("SELECT * FROM guild_settings WHERE guild_id = ?", [guildId])
        return newSettings[0]
      } catch (error) {
        logger.error(`Error al crear configuración del servidor: ${error.message}`)
        return { guild_id: guildId }
      }
    }
  } catch (error) {
    logger.error(`Error al obtener configuración del servidor: ${error.message}`)
    return { guild_id: guildId }
  }
}

// Función para actualizar configuración de un servidor con fallback
async function updateGuildSettings(guildId, settings) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para actualizar configuración del servidor.")
      return { success: false, error: "No hay conexión a la base de datos" }
    }

    const keys = Object.keys(settings)
    const values = Object.values(settings)

    if (keys.length === 0) return { success: false, error: "No hay datos para actualizar" }

    const setClause = keys.map((key) => `${key} = ?`).join(", ")
    const query = `UPDATE guild_settings SET ${setClause} WHERE guild_id = ?`

    const { error } = await this.query(query, [...values, guildId])

    if (error) {
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    logger.error(`Error al actualizar configuración del servidor: ${error.message}`)
    return { success: false, error: error.message }
  }
}

// Función para añadir XP a un usuario con fallback
async function addUserXP(userId, guildId, xpToAdd) {
  try {
    if (!pool) {
      logger.warn("No hay conexión a la base de datos para añadir XP. Usando datos de respaldo.")
      return { oldLevel: 1, newLevel: 1, leveledUp: false, xp: xpToAdd }
    }

    // Obtener usuario actual
    const [user] = await pool.execute("SELECT * FROM users WHERE id = ?", [userId])

    if (user.length === 0) {
      throw new Error("Usuario no encontrado")
    }

    const currentXP = user[0].xp
    const currentLevel = user[0].level
    const newXP = currentXP + xpToAdd

    // Calcular si sube de nivel (fórmula: 5 * (lvl^2) + 50 * lvl + 100)
    const xpNeeded = 5 * currentLevel ** 2 + 50 * currentLevel + 100
    let newLevel = currentLevel
    let leveledUp = false

    if (newXP >= xpNeeded) {
      newLevel = currentLevel + 1
      leveledUp = true
    }

    // Actualizar usuario
    await pool.execute("UPDATE users SET xp = ?, level = ? WHERE id = ?", [newXP, newLevel, userId])

    return {
      oldLevel: currentLevel,
      newLevel,
      leveledUp,
      xp: newXP,
    }
  } catch (error) {
    logger.error(`Error al añadir XP: ${error.message}`)
    return { oldLevel: 1, newLevel: 1, leveledUp: false, xp: xpToAdd }
  }
}

// Exportar funciones
module.exports = {
  pool: () => pool,
  connectToDatabase,
  query,
  tableExists,
  createTablesIfNotExist,
  getDataWithFallback,
  insertData,
  updateData,
  deleteData,
  closeConnection,
  isConnected,
  getUser,
  getGuildSettings,
  updateGuildSettings,
  addUserXP,
}
