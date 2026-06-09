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

  // 创建表（IF NOT EXISTS，幂等）
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

  // 创建索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`)

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
