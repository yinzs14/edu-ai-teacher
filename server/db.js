import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_DIR = join(__dirname, '..', 'data')
const DB_PATH = join(DB_DIR, 'edu_ai_teacher.db')

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true })
}

const db = new Database(DB_PATH)

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL')

// ==================== Users Table ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    role TEXT DEFAULT 'teacher',
    avatar TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    school TEXT DEFAULT '',
    email_verified INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    last_login_at TEXT
  )
`)

// ==================== Rate Limiting Table ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS login_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    attempted_at TEXT DEFAULT (datetime('now')),
    success INTEGER DEFAULT 0
  )
`)

// Index for rate limiting queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier
  ON login_attempts(identifier, attempted_at)
`)

// Clean up old login attempts (older than 15 minutes)
function cleanupOldAttempts() {
  db.prepare(
    "DELETE FROM login_attempts WHERE attempted_at < datetime('now', '-15 minutes')"
  ).run()
}

// Run cleanup every 5 minutes
setInterval(cleanupOldAttempts, 5 * 60 * 1000)

// ==================== Membership Plans Table ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS membership_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    duration_days INTEGER NOT NULL,
    features TEXT DEFAULT '[]',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  )
`)

// ==================== User Subscriptions Table ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS user_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER,
    plan_name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    payment_order_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

// Indexes for subscription queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sub_user ON user_subscriptions(user_id)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sub_status ON user_subscriptions(status, end_date)
`)

// ==================== Payment Orders Table ====================
db.exec(`
  CREATE TABLE IF NOT EXISTS payment_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    plan_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT DEFAULT '',
    transaction_id TEXT DEFAULT '',
    paid_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )
`)

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pay_user ON payment_orders(user_id)
`)
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pay_status ON payment_orders(status)
`)

export default db
