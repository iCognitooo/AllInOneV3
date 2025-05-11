-- Tabla para verificaciones
CREATE TABLE IF NOT EXISTS verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verification_type VARCHAR(20) NOT NULL,
  INDEX user_guild_idx (user_id, guild_id)
);

-- Tabla para roles por reacción
CREATE TABLE IF NOT EXISTS reaction_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  role_id VARCHAR(20) NOT NULL,
  emoji VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL DEFAULT 'menu',
  INDEX guild_message_idx (guild_id, message_id)
);

-- Tabla para encuestas
CREATE TABLE IF NOT EXISTS polls (
  id VARCHAR(50) PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  creator_id VARCHAR(20) NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  anonymous TINYINT(1) NOT NULL DEFAULT 1,
  active TINYINT(1) NOT NULL DEFAULT 1,
  end_time TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX guild_channel_idx (guild_id, channel_id)
);

-- Tabla para votos de encuestas
CREATE TABLE IF NOT EXISTS poll_votes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  option_index INT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY poll_user_idx (poll_id, user_id)
);

-- Tabla para roles de nivel
CREATE TABLE IF NOT EXISTS level_roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  role_id VARCHAR(20) NOT NULL,
  level INT NOT NULL,
  UNIQUE KEY guild_level_idx (guild_id, level)
);

-- Tabla para registros de miembros
CREATE TABLE IF NOT EXISTS member_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  action ENUM('join', 'leave', 'ban', 'unban') NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX user_guild_idx (user_id, guild_id)
);

-- Actualizar tabla guild_settings para incluir nuevas configuraciones
ALTER TABLE guild_settings 
ADD COLUMN verification_channel VARCHAR(20) NULL AFTER ticket_staff_role,
ADD COLUMN verification_role VARCHAR(20) NULL AFTER verification_channel,
ADD COLUMN verification_type VARCHAR(20) NULL DEFAULT 'button' AFTER verification_role,
ADD COLUMN goodbye_channel VARCHAR(20) NULL AFTER welcome_message,
ADD COLUMN goodbye_message TEXT NULL AFTER goodbye_channel,
ADD COLUMN welcome_embed TINYINT(1) NULL DEFAULT 1 AFTER goodbye_message,
ADD COLUMN welcome_color VARCHAR(10) NULL DEFAULT '#5865F2' AFTER welcome_embed,
ADD COLUMN welcome_title VARCHAR(100) NULL AFTER welcome_color,
ADD COLUMN welcome_image VARCHAR(255) NULL AFTER welcome_title,
ADD COLUMN level_channel VARCHAR(20) NULL AFTER welcome_image,
ADD COLUMN remove_previous_level_roles TINYINT(1) NULL DEFAULT 1 AFTER level_channel;
