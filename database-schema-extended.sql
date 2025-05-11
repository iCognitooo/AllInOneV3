-- Tablas para el sistema de economía avanzado
CREATE TABLE IF NOT EXISTS shop_items (
  id VARCHAR(50) PRIMARY KEY,
  guild_id VARCHAR(20) NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  price INT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  type VARCHAR(50) NOT NULL DEFAULT 'item',
  data TEXT NULL,
  image_url VARCHAR(255) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_inventory (
  user_id VARCHAR(20) NOT NULL,
  item_id VARCHAR(50) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, item_id)
);

-- Tablas para el sistema de sorteos
CREATE TABLE IF NOT EXISTS giveaways (
  id VARCHAR(50) PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message_id VARCHAR(20) NOT NULL,
  prize VARCHAR(255) NOT NULL,
  description TEXT NULL,
  winners_count INT NOT NULL DEFAULT 1,
  end_time TIMESTAMP NOT NULL,
  creator_id VARCHAR(20) NOT NULL,
  ended TINYINT(1) NOT NULL DEFAULT 0,
  winners TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX guild_channel_idx (guild_id, channel_id)
);

CREATE TABLE IF NOT EXISTS giveaway_entries (
  giveaway_id VARCHAR(50) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (giveaway_id, user_id)
);

-- Tablas para el sistema de auto-moderación
CREATE TABLE IF NOT EXISTS filtered_words (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  word VARCHAR(100) NOT NULL,
  UNIQUE KEY guild_word_idx (guild_id, word)
);

CREATE TABLE IF NOT EXISTS automod_whitelist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  type ENUM('channel', 'role') NOT NULL,
  item_id VARCHAR(20) NOT NULL,
  UNIQUE KEY guild_type_item_idx (guild_id, type, item_id)
);

CREATE TABLE IF NOT EXISTS automod_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guild_id VARCHAR(20) NOT NULL,
  user_id VARCHAR(20) NOT NULL,
  action VARCHAR(50) NOT NULL,
  content TEXT NULL,
  reason TEXT NULL,
  channel_id VARCHAR(20) NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX guild_user_idx (guild_id, user_id)
);

-- Tabla para el sistema de recordatorios
CREATE TABLE IF NOT EXISTS reminders (
  id VARCHAR(50) PRIMARY KEY,
  user_id VARCHAR(20) NOT NULL,
  guild_id VARCHAR(20) NOT NULL,
  channel_id VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  end_time TIMESTAMP NOT NULL,
  is_private TINYINT(1) NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX user_active_idx (user_id, active)
);

-- Actualizar tabla users para el sistema de economía avanzado
ALTER TABLE users 
ADD COLUMN last_work TIMESTAMP NULL AFTER last_daily,
ADD COLUMN last_rob TIMESTAMP NULL AFTER last_work,
ADD COLUMN bank INT DEFAULT 0 AFTER coins;

-- Actualizar tabla guild_settings para auto-moderación
ALTER TABLE guild_settings 
ADD COLUMN automod_logs_channel VARCHAR(20) NULL AFTER remove_previous_level_roles,
ADD COLUMN automod_anti_spam TINYINT(1) NULL DEFAULT 0 AFTER automod_logs_channel,
ADD COLUMN automod_anti_links TINYINT(1) NULL DEFAULT 0 AFTER automod_anti_spam,
ADD COLUMN automod_anti_invites TINYINT(1) NULL DEFAULT 0 AFTER automod_anti_links,
ADD COLUMN automod_anti_caps TINYINT(1) NULL DEFAULT 0 AFTER automod_anti_invites,
ADD COLUMN automod_anti_mentions TINYINT(1) NULL DEFAULT 0 AFTER automod_anti_caps;
