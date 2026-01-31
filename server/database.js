const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'hydromate.db');
const fs = require('fs');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    must_change_password INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS gardens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    system_type TEXT NOT NULL,
    plant_types TEXT NOT NULL,
    start_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS log_entries (
    id TEXT PRIMARY KEY,
    garden_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    ph REAL,
    ppm INTEGER,
    water_temp REAL,
    nutrients TEXT,
    notes TEXT,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    garden_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    is_recurring INTEGER NOT NULL DEFAULT 0,
    recurring_days INTEGER,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plants (
    id TEXT PRIMARY KEY,
    garden_id TEXT NOT NULL,
    name TEXT NOT NULL,
    plant_type TEXT NOT NULL,
    species TEXT NOT NULL,
    seeded_date TEXT,
    transplanted_date TEXT,
    current_stage TEXT NOT NULL DEFAULT 'seed',
    notes TEXT,
    created_at TEXT NOT NULL,
    harvest_date TEXT,
    yield_amount REAL,
    is_active INTEGER NOT NULL DEFAULT 1,
    initial_ph REAL,
    initial_ppm INTEGER,
    FOREIGN KEY (garden_id) REFERENCES gardens(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_log_entries_garden ON log_entries(garden_id);
  CREATE INDEX IF NOT EXISTS idx_log_entries_timestamp ON log_entries(timestamp);
  CREATE INDEX IF NOT EXISTS idx_tasks_garden ON tasks(garden_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_plants_garden ON plants(garden_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
`);

module.exports = db;
