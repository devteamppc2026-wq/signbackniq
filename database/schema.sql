-- MySQL 8.4. All timestamps stored in UTC. Run against the configured database.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS admins (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sessions (
  token_hash CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  admin_id BIGINT UNSIGNED NOT NULL,
  csrf_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
  INDEX sessions_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS dashboard_users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','editor') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO dashboard_users (email, password_hash, role, created_at)
  SELECT email, password_hash, 'admin', created_at FROM admins;
CREATE TABLE IF NOT EXISTS dashboard_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission ENUM('news.create','news.update','news.delete','news.archive') NOT NULL,
  PRIMARY KEY (user_id, permission),
  FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS dashboard_sessions (
  token_hash CHAR(64) CHARACTER SET ascii NOT NULL PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  csrf_hash CHAR(64) CHARACTER SET ascii NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES dashboard_users(id) ON DELETE CASCADE,
  INDEX dashboard_sessions_expiry (expires_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS news (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  source VARCHAR(200) NOT NULL,
  category ENUM('national','union') NOT NULL,
  image_url VARCHAR(255) NULL,
  video_url VARCHAR(255) NULL,
  starts_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  slide_seconds SMALLINT UNSIGNED NULL,
  carousel_priority SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  archived_at DATETIME(3) NULL,
  status ENUM('draft','published') NOT NULL DEFAULT 'published',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX news_display (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS display_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  ticker VARCHAR(1500) NOT NULL,
  slide_seconds SMALLINT UNSIGNED NOT NULL DEFAULT 5,
  ticker_news_ids JSON NULL,
  CONSTRAINT single_settings CHECK (id = 1),
  CONSTRAINT slide_duration CHECK (slide_seconds BETWEEN 5 AND 120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO display_settings (id,ticker,slide_seconds) VALUES (1,'مرحباً بكم في النقابة العامة للعاملين بالبترول • معاً لخدمة العاملين بقطاع البترول',5);
CREATE TABLE IF NOT EXISTS display_screens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  screen_key VARCHAR(40) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO display_screens (screen_key, name) VALUES ('main', 'الشاشة الرئيسية');
CREATE TABLE IF NOT EXISTS display_video_schedules (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  video_url VARCHAR(255) NOT NULL,
  target ENUM('unassigned','all','screen') NOT NULL,
  screen_id BIGINT UNSIGNED NULL,
  starts_at DATETIME(3) NOT NULL,
  ends_at DATETIME(3) NOT NULL,
  cancelled_at DATETIME(3) NULL,
  FOREIGN KEY (screen_id) REFERENCES display_screens(id),
  CHECK (ends_at > starts_at),
  CHECK ((target = 'screen' AND screen_id IS NOT NULL) OR (target <> 'screen' AND screen_id IS NULL)),
  INDEX video_window (target, screen_id, cancelled_at, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
