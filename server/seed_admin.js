/**
 * Seed admin account + membership plans (idempotent)
 * Run once at server startup
 */
import crypto from 'crypto'
import db from './db.js'

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const key = crypto.pbkdf2Sync(password, salt, 310000, 32, 'sha256')
  return `${salt}:${key.toString('hex')}`
}

// --- Seed admin account ---
const existingAdmin = db.prepare('SELECT id FROM users WHERE role = ?').get('admin')
if (!existingAdmin) {
  const adminHash = hashPassword('Admin2024!@#')
  db.prepare(`
    INSERT INTO users (username, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', 'admin@edu-ai-teacher.com', adminHash, '系统管理员', 'admin')
  console.log('[Seed] Admin account created: admin / Admin2024!@#')
} else {
  console.log('[Seed] Admin account already exists, skipping.')
}

// --- Seed membership plans ---
const existingPlans = db.prepare('SELECT COUNT(*) as count FROM membership_plans').get()
if (existingPlans.count === 0) {
  const plans = [
    {
      name: '免费试用',
      price: 0,
      duration_days: 3,
      features: JSON.stringify(['3天全功能体验', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF']),
      sort_order: 1,
    },
    {
      name: '月度会员',
      price: 30,
      duration_days: 30,
      features: JSON.stringify(['全功能无限制', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '专属技术支持']),
      sort_order: 2,
    },
    {
      name: '季度会员',
      price: 80,
      duration_days: 90,
      features: JSON.stringify(['全功能无限制', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '专属技术支持', '省10元 vs 月度']),
      sort_order: 3,
    },
    {
      name: '年度会员',
      price: 280,
      duration_days: 365,
      features: JSON.stringify(['全功能无��制', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '优先技术支持', '省80元 vs 月度', '推荐']),
      sort_order: 4,
    },
    {
      name: '终身会员',
      price: 680,
      duration_days: 9999,
      features: JSON.stringify(['永久全功能', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '1对1专属顾问', '一次付费永久使用']),
      sort_order: 5,
    },
  ]

  const insert = db.prepare(`
    INSERT INTO membership_plans (name, price, duration_days, features, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `)

  for (const plan of plans) {
    insert.run(plan.name, plan.price, plan.duration_days, plan.features, plan.sort_order)
  }

  console.log(`[Seed] ${plans.length} membership plans created.`)
} else {
  console.log(`[Seed] Membership plans already exist (${existingPlans.count}), skipping.`)
}

console.log('[Seed] Done.')
