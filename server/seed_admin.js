/**
 * Seed admin account + membership plans (idempotent)
 * Uses sql.js + bcryptjs (matching server auth patterns)
 */
import bcrypt from 'bcryptjs'
import { getDB, saveDB } from './db.js'

export async function seedAll() {
  const db = await getDB()

  // --- Seed admin account ---
  const existing = db.exec('SELECT id FROM users WHERE role = ?', ['admin'])
  if (existing.length === 0 || existing[0].values.length === 0) {
    const salt = bcrypt.genSaltSync(10)
    const adminHash = bcrypt.hashSync('Admin2024!@#', salt)
    db.run(
      'INSERT INTO users (username, email, password_hash, nickname, role) VALUES (?, ?, ?, ?, ?)',
      ['admin', 'admin@edu-ai-teacher.com', adminHash, '系统管理员', 'admin']
    )
    saveDB()
    console.log('[Seed] Admin account created: admin / Admin2024!@#')
  } else {
    console.log('[Seed] Admin account already exists, skipping.')
  }

  // --- Seed membership plans ---
  const planCount = db.exec('SELECT COUNT(*) as cnt FROM membership_plans')
  const count = planCount.length > 0 ? planCount[0].values[0][0] : 0

  if (count === 0) {
    const plans = [
      { name: '免费试用', price: 0, duration_days: 3, features: JSON.stringify(['3天全功能体验', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF']), sort_order: 1 },
      { name: '月度会员', price: 30, duration_days: 30, features: JSON.stringify(['全功能无限制', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '专属技术支持']), sort_order: 2 },
      { name: '季度会员', price: 80, duration_days: 90, features: JSON.stringify(['全功能无限制', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '专属技术支持', '省10元 vs 月度']), sort_order: 3 },
      { name: '年度会员', price: 280, duration_days: 365, features: JSON.stringify(['全功能无限制', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '优先技术支持', '省80元 vs 月度', '推荐']), sort_order: 4 },
      { name: '终身会员', price: 680, duration_days: 9999, features: JSON.stringify(['永久全功能', '无限次学情诊断', '无限次课件生成', '下载PPT/Word/PDF', '自传模板课件', '1对1专属顾问', '一次付费永久使用']), sort_order: 5 },
    ]

    for (const plan of plans) {
      db.run(
        'INSERT INTO membership_plans (name, price, duration_days, features, sort_order) VALUES (?, ?, ?, ?, ?)',
        [plan.name, plan.price, plan.duration_days, plan.features, plan.sort_order]
      )
    }
    saveDB()
    console.log(`[Seed] ${plans.length} membership plans created.`)
  } else {
    console.log(`[Seed] Membership plans already exist (${count}), skipping.`)
  }

  console.log('[Seed] Done.')
}

// Auto-run on import
seedAll().catch(e => console.error('[Seed] Error:', e.message))
