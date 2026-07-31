// ==================== SQLite 数据库（sql.js）====================
// 零依赖编译，纯 JS/WASM，跨平台兼容 Windows/macOS/Linux

import initSqlJs from 'sql.js'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_DIR = join(__dirname, 'data')
const DB_PATH = join(DB_DIR, 'auth.db')

/** 全局数据库实例（单例，懒初始化） */
let db = null
let SQL = null

/** 初始化数据库（首次调用时创建表） */
export async function getDB() {
  if (db) return db

  // 加载 sql.js
  SQL = await initSqlJs()

  // 确保目录存在
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true })
  }

  // 从文件加载或创建新数据库
  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  // --- users 表 ---
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      nickname TEXT,
      role TEXT DEFAULT 'teacher',
      avatar TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)

  // --- 题库表 ---
  db.run(`
    CREATE TABLE IF NOT EXISTS question_bank (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject TEXT NOT NULL DEFAULT '数学',
      grade INTEGER NOT NULL,
      knowledge_points TEXT NOT NULL,
      question_type TEXT NOT NULL,
      subtype TEXT DEFAULT '',
      difficulty REAL NOT NULL DEFAULT 0.5,
      cognitive_level TEXT NOT NULL DEFAULT 'B',
      step_level TEXT NOT NULL DEFAULT 'step1',
      direction TEXT NOT NULL DEFAULT 'A',
      context_type TEXT NOT NULL DEFAULT 'pure',
      stem TEXT NOT NULL,
      options TEXT DEFAULT '',
      answer TEXT NOT NULL,
      solution TEXT DEFAULT '',
      source TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      embedding TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_qb_grade ON question_bank(grade)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_qb_type ON question_bank(question_type)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_qb_difficulty ON question_bank(difficulty)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_qb_cognitive ON question_bank(cognitive_level)`)

  // 添加 textbook_unit 列（如果不存在）
  try {
    db.run(`ALTER TABLE question_bank ADD COLUMN textbook_unit TEXT DEFAULT ''`)
  } catch (e) {
    // 列已存在，忽略
  }
  db.run(`CREATE INDEX IF NOT EXISTS idx_qb_textbook ON question_bank(textbook_unit)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_qb_subject ON question_bank(subject)`)

  // --- 会员套餐表 ---
  db.run(`
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

  // --- 用户订阅表 ---
  db.run(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      plan_id INTEGER,
      plan_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      payment_order_id TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_user ON user_subscriptions(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_sub_status ON user_subscriptions(status, end_date)`)

  // --- 支付订单表 ---
  db.run(`
    CREATE TABLE IF NOT EXISTS payment_orders (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      plan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_method TEXT DEFAULT '',
      transaction_id TEXT DEFAULT '',
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_pay_user ON payment_orders(user_id)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_pay_status ON payment_orders(status)`)

  // --- 登录尝试记录表 ---
  db.run(`
    CREATE TABLE IF NOT EXISTS login_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identifier TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      attempted_at TEXT DEFAULT (datetime('now', 'localtime')),
      success INTEGER DEFAULT 0
    )
  `)
  db.run(`CREATE INDEX IF NOT EXISTS idx_la_identifier ON login_attempts(identifier, attempted_at)`)

  saveDB()
  console.log('[DB] SQLite 数据库已初始化:', DB_PATH)
  return db
}

/** 持久化数据库到磁盘 */
export function saveDB() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync(DB_PATH, buffer)
}

/** 安全关闭数据库 */
export function closeDB() {
  if (db) {
    saveDB()
    db.close()
    db = null
    SQL = null
  }
}
