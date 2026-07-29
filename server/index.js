import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import { execSync, spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, writeFileSync, unlinkSync, readFileSync, mkdirSync, readdirSync } from 'fs'
import { platform } from 'os'
import { authMiddleware, requireAuth, signToken } from './middleware/auth.js'
import { getDB, saveDB } from './db.js'
import bcrypt from 'bcryptjs'
import './seed_admin.js'  // Seed admin account + membership plans on startup

// ==================== 工具函数 ====================

/** 获取跨平台的 Python 路径 */
function getPythonPath() {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH
  if (platform() === 'win32') return join('C:', 'Users', '63435', '.workbuddy', 'binaries', 'python', 'versions', '3.13.12', 'python.exe')
  return 'python3'
}

/** 带超时的 fetch 封装 */
function fetchWithTimeout(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer))
}

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3001
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

// ==================== 请求体验证（Webhook 需要 raw body） ====================
app.use(cors())

// Webhook 路由需要原始请求体（验证 HMAC 签名），必须在 express.json() 之前注册
app.use('/api/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '50mb' }))

// ==================== 认证中间件（解析 token，不强制登录）====================
app.use(authMiddleware)

// ==================== 限流中间件 ====================
const rateLimitStore = new Map()

function rateLimiter(maxRequests = 10, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown'
    const now = Date.now()
    const record = rateLimitStore.get(ip)
    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs })
      return next()
    }
    record.count++
    if (record.count > maxRequests) {
      return res.status(429).json({ success: false, error: '请求过于频繁，请 1 分钟后再试' })
    }
    next()
  }
}
// 每5分钟清理过期记录
setInterval(() => {
  const now = Date.now()
  for (const [ip, r] of rateLimitStore) { if (now > r.resetTime) rateLimitStore.delete(ip) }
}, 300000)

// 对认证接口应用限流（15次/分钟）
app.use('/api/auth', rateLimiter(15, 60000))

// ==================== 认证路由（直接注册以保证 Express 5 兼容）====================

// POST /api/auth/register — 用户注册
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body
    if (!username || !password) return res.status(400).json({ success: false, error: '请输入用户名和密码' })
    if (username.length < 2 || username.length > 20) return res.status(400).json({ success: false, error: '用户名长度需在 2-20 个字符之间' })
    if (password.length < 6 || password.length > 50) return res.status(400).json({ success: false, error: '密码长度需在 6-50 个字符之间' })

    const db = await getDB()
    const existing = db.exec('SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0 && existing[0].values.length > 0) {
      return res.status(409).json({ success: false, error: '该用户名已被注册' })
    }

    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync(password, salt)
    db.run('INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)', [username, passwordHash, nickname || username])
    saveDB()
    const userIdResult = db.exec('SELECT id FROM users WHERE username = ?', [username])
    const userId = userIdResult.length > 0 && userIdResult[0].values.length > 0 ? userIdResult[0].values[0][0] : 0

    // 自动创建 3 天免费试用
    try {
      const trialPlan = db.exec('SELECT id, duration_days FROM membership_plans WHERE name = ? AND is_active = 1', ['免费试用'])
      if (trialPlan.length > 0 && trialPlan[0].values.length > 0) {
        const [planId, duration] = trialPlan[0].values[0]
        const now = new Date().toISOString()
        const endDate = new Date(Date.now() + duration * 86400000).toISOString()
        db.run(
          'INSERT INTO user_subscriptions (user_id, plan_id, plan_name, start_date, end_date, status) VALUES (?, ?, ?, ?, ?, ?)',
          [userId, planId, '免费试用', now, endDate, 'active']
        )
        saveDB()
      }
    } catch (e) {
      console.error('[Register trial]', e.message)
    }

    const token = signToken({ id: userId, username })
    res.status(201).json({ success: true, data: { token, user: { id: userId, username, nickname: nickname || username, role: 'teacher', avatar: '' } } })
  } catch (err) {
    console.error('[Auth] 注册失败:', err.message)
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' })
  }
})

// POST /api/auth/login — 用户登录
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) return res.status(400).json({ success: false, error: '请输入用户名和密码' })

    const db = await getDB()
    const result = db.exec('SELECT id, username, password_hash, nickname, role, avatar, email FROM users WHERE username = ?', [username])
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' })
    }

    const row = result[0].values[0]
    if (!bcrypt.compareSync(password, row[2])) {
      return res.status(401).json({ success: false, error: '用户名或密码错误' })
    }

    const token = signToken({ id: row[0], username: row[1] })
    res.json({ success: true, data: { token, user: { id: row[0], username: row[1], nickname: row[3], role: row[4], avatar: row[5], email: row[6] } } })
  } catch (err) {
    console.error('[Auth] 登录失败:', err.message)
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' })
  }
})

// GET /api/auth/me — 获取当前用户信息（需登录）
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const db = await getDB()
    const result = db.exec('SELECT id, username, nickname, role, avatar, email, created_at FROM users WHERE id = ?', [req.user.id])
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }
    const row = result[0].values[0]

    // Get subscription info
    const sub = db.exec(
      `SELECT plan_name, end_date, status FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now', 'localtime')
       ORDER BY end_date DESC LIMIT 1`,
      [req.user.id]
    )
    const subscription = (sub.length > 0 && sub[0].values.length > 0)
      ? { plan_name: sub[0].values[0][0], end_date: sub[0].values[0][1], status: sub[0].values[0][2] }
      : null

    res.json({ success: true, data: { id: row[0], username: row[1], nickname: row[2], role: row[3], avatar: row[4], email: row[5], createdAt: row[6], subscription } })
  } catch (err) {
    console.error('[Auth] 获取信息失败:', err.message)
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

// PUT /api/auth/profile — 更新个人信息（需登录）
app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { nickname, email } = req.body
    const db = await getDB()
    if (nickname) db.run('UPDATE users SET nickname = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [nickname, req.user.id])
    if (email !== undefined) db.run('UPDATE users SET email = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [email, req.user.id])
    saveDB()
    const result = db.exec('SELECT id, username, nickname, role, avatar, email FROM users WHERE id = ?', [req.user.id])
    const row = result[0].values[0]
    res.json({ success: true, data: { id: row[0], username: row[1], nickname: row[2], role: row[3], avatar: row[4], email: row[5] } })
  } catch (err) {
    console.error('[Auth] 更新失败:', err.message)
    res.status(500).json({ success: false, error: '更新个人信息失败' })
  }
})

// POST /api/auth/reset-password — 重置密码（通过用户名）
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ success: false, error: '请输入用户名' })

    const db = await getDB()
    const result = db.exec('SELECT id, username, email FROM users WHERE username = ?', [username])
    if (result.length === 0 || result[0].values.length === 0) {
      // 不暴露用户是否存在，统一提示
      return res.json({ success: true, message: '如用户名存在，新密码已生成' })
    }

    // 生成8位随机密码（字母+数字）
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
    let newPwd = ''
    for (let i = 0; i < 8; i++) newPwd += chars[Math.floor(Math.random() * chars.length)]

    const salt = bcrypt.genSaltSync(10)
    const hash = bcrypt.hashSync(newPwd, salt)
    db.run('UPDATE users SET password_hash = ?, updated_at = datetime("now", "localtime") WHERE id = ?', [hash, result[0].values[0][0]])
    saveDB()

    console.log(`[Auth] 密码已重置: ${username}`)
    res.json({ success: true, data: { newPassword: newPwd }, message: '密码已重置，请使用新密码登录后及时修改' })
  } catch (err) {
    console.error('[Auth] 重置密码失败:', err.message)
    res.status(500).json({ success: false, error: '重置密码失败，请稍后重试' })
  }
})

// GET /api/auth/stats — 获取用户使用统计（需登录）
app.get('/api/auth/stats', requireAuth, async (req, res) => {
  try {
    const db = await getDB()
    const uid = req.user.id

    // 统计各类操作次数
    const stats = {}

    // 反馈次数
    try {
      const r = db.exec('SELECT COUNT(*) FROM feedback WHERE user_id = ?', [uid])
      stats.feedbackCount = r[0]?.values?.[0]?.[0] || 0
    } catch { stats.feedbackCount = 0 }

    // 模板上传次数
    try {
      const r = db.exec('SELECT COUNT(*) FROM templates WHERE uploader_id = ?', [uid])
      stats.templateCount = r[0]?.values?.[0]?.[0] || 0
    } catch { stats.templateCount = 0 }

    // 题库题目数（如果是教师角色）
    try {
      const r = db.exec('SELECT COUNT(*) FROM question_bank')
      stats.questionBankTotal = r[0]?.values?.[0]?.[0] || 0
    } catch { stats.questionBankTotal = 0 }

    // 用户角色
    try {
      const r = db.exec('SELECT role, created_at FROM users WHERE id = ?', [uid])
      stats.role = r[0]?.values?.[0]?.[0] || 'teacher'
      stats.joinDate = r[0]?.values?.[0]?.[1] || ''
    } catch { stats.role = 'teacher'; stats.joinDate = '' }

    // 会员订阅状态
    try {
      const sub = db.exec(
        `SELECT plan_name, end_date, status FROM user_subscriptions
         WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now', 'localtime')
         ORDER BY end_date DESC LIMIT 1`,
        [uid]
      )
      if (sub.length > 0 && sub[0].values.length > 0) {
        stats.subscription = { plan_name: sub[0].values[0][0], end_date: sub[0].values[0][1], status: sub[0].values[0][2] }
      } else {
        const trialCheck = db.exec("SELECT id FROM user_subscriptions WHERE user_id = ? AND plan_name = '免费试用' AND status = 'expired'", [uid])
        stats.subscription = null
        stats.hasTrialed = !!(trialCheck.length > 0 && trialCheck[0].values.length > 0)
      }
    } catch { stats.subscription = null; stats.hasTrialed = false }

    res.json({ success: true, data: stats })
  } catch (err) {
    console.error('[Auth] 获取统计失败:', err.message)
    res.status(500).json({ success: false, error: '获取统计信息失败' })
  }
})

// ==================== OCR 百度接口 ====================
async function getBaiduAccessToken() {
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('缺少 BAIDU_API_KEY / BAIDU_SECRET_KEY')

  const url = new URL('https://aip.baidubce.com/oauth/2.0/token')
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', apiKey)
  url.searchParams.set('client_secret', secretKey)

  const resp = await fetchWithTimeout(url.toString(), { method: 'POST' }, 30000)
  const data = await resp.json()
  if (!resp.ok || !data.access_token) throw new Error(data.error_description || '获取百度 token 失败')
  return data.access_token
}

function normalizeBase64(img) {
  if (!img || typeof img !== 'string') return ''
  const idx = img.indexOf(',')
  return img.startsWith('data:') && idx !== -1 ? img.slice(idx + 1) : img.trim()
}

async function callBaiduOcr(token, image, endpoint) {
  const url = new URL(`https://aip.baidubce.com/rest/2.0/ocr/v1/${endpoint}`)
  url.searchParams.set('access_token', token)

  const resp = await fetchWithTimeout(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image }).toString(),
  }, 30000)
  const data = await resp.json()
  if (!resp.ok || data.error_code) throw new Error(data.error_msg || `${endpoint} 失败`)
  return (data.words_result || []).map((w) => w.words).filter(Boolean).join('\n')
}

app.post('/api/ocr', async (req, res) => {
  try {
    const image = normalizeBase64(req.body.image)
    if (!image) return res.status(400).json({ success: false, error: '请提供图片' })

    const token = await getBaiduAccessToken()
    const endpoints = ['handwriting', 'accurate_basic', 'general_basic']
    let text = ''
    let lastErr = null

    for (const ep of endpoints) {
      try {
        text = await callBaiduOcr(token, image, ep)
        if (text.trim()) break
      } catch (e) { lastErr = e }
    }

    if (!text.trim()) {
      const msg = lastErr ? `OCR 失败：${lastErr.message}` : 'OCR 结果为空'
      return res.json({ success: false, error: msg })
    }
    res.json({ success: true, data: { text } })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ==================== Vision OCR 阿里云 Qwen-VL ====================
app.post('/api/vision-ocr', async (req, res) => {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY
    if (!apiKey) return res.status(500).json({ success: false, error: '缺少 DASHSCOPE_API_KEY' })

    const image = normalizeBase64(req.body.image)
    if (!image) return res.status(400).json({ success: false, error: '请提供图片' })

    const resp = await fetchWithTimeout('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'qwen-vl-ocr',
        messages: [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
            { type: 'text', text: '请识别这张图片中的所有文字内容，包括数学题中的特殊符号。请只返回识别出的纯文本，不要添加额外说明。' },
          ],
        }],
      }),
    }, 60000)

    const data = await resp.json()
    if (!resp.ok) return res.status(500).json({ success: false, error: data.error?.message || '请求失败' })

    const text = data.choices?.[0]?.message?.content || ''
    if (!text.trim()) return res.json({ success: false, error: 'OCR 结果为空' })
    res.json({ success: true, data: { text } })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ==================== 学情诊断 ====================
const SYSTEM_PROMPT = `你是资深中小学教师，专门帮老师做两件事：诊断学情 + 生成家长沟通话术。

## 任务一：学情诊断

根据学生作业/试卷内容，从五维能力（计算、应用题、几何、逻辑、规律）诊断。返回：
- radarScores: 每维度 0-100 分
- weakPoints: 薄弱知识点列表，含 name/dimension/score/suggestion
- summary: 总体评价（50字内）

## 任务二：家长沟通话术

生成一份老师可以直接口述给家长的沟通脚本。老师拿到后可以直接照着念，不需要再"翻译"。
场景：老师给家长打电话/微信语音，聊孩子的学习情况。
目标：像朋友聊天一样自然，但又展现专业度。让家长觉得这个老师真的了解自家孩子。

语言风格要求（非常重要）：
- ✅ 用口语化短句，就像平时说话那样。多用"咱们""其实""举个例子"这类话
- ✅ 用生活化的比喻解释学习问题，让不懂教育的家长也能秒懂
- ✅ 自然使用学生名字（如提供），但要适度，每段用1-2次就够了
- ✅ 肯定孩子的努力，不制造焦虑。先夸优点再说问题
- ✅ 说到解决方案时，要能让家长觉得"这事老师能帮我搞定"，自然建立信任
- ❌ 绝对不出现清单式、提纲式的写法（比如"1... 2... 3..."）
- ❌ 避免术语堆砌，非用不可时要立刻用大白话解释
- ❌ 不可以说"根据AI分析"，要像老师自己观察到的
- ❌ 不要用公文腔、书面语、客套话

communicationScript 对象包含以下字段（每个字段返回一段自然的对话文本）：
- stageKnowledge: 用大白话告诉家长"这个阶段孩子应该会什么"。1-2句话，给家长一个参照系
- mastered: 孩子做得好的地方。要具体、真诚地夸，让家长听完心里踏实
- weaknesses: 孩子需要提升的地方。用"咱们一起看看"的口吻，解释问题在哪、为什么会出现
- solutions: 怎么帮孩子。给具体可行的建议，自然带出"如果老师一对一辅导，效果会好得多"这类表达
- talkingTips: 给老师的沟通小提示（如何开场、家长可能的顾虑怎么回应、什么话不能说）

返回 JSON 格式：
{
  grade: "年级",
  radarScores: { "计算": 分数, "应用题": 分数, "几何": 分数, "逻辑": 分数, "规律": 分数 },
  weakPoints: [{ name: "知识点名称", dimension: "所属维度", score: 分数, suggestion: "改进建议" }],
  summary: "总体评价",
  communicationScript: { stageKnowledge, mastered, weaknesses, solutions, talkingTips }
}
只返回合法 JSON，不要包含其他说明文字。`

function extractJsonFromContent(content) {
  if (!content) throw new Error('模型未返回内容')
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  try { return JSON.parse(candidate) } catch { /* fall through */ }
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1))
  throw new Error('无法解析模型返回的 JSON')
}

app.post('/api/diagnose', async (req, res) => {
  try {
    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.DEEPSEEK_API_KEY
    if (!apiKey) return res.status(500).json({ success: false, error: '缺少 API 密钥' })

    const description = req.body.description || req.body.text || req.body.content || req.body.message
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ success: false, error: '请提供学生描述字段' })
    }

    const studentName = req.body.studentName || ''
    const teacherName = req.body.teacherName || ''

    // 构建带姓名上下文的用户消息
    let userMessage = description
    if (studentName || teacherName) {
      const contextParts = []
      if (studentName) contextParts.push(`学生姓名：${studentName}`)
      if (teacherName) contextParts.push(`老师称呼：${teacherName}`)
      userMessage = `${contextParts.join('，')}\n\n${description}`
    }

    const resp = await fetchWithTimeout('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    }, 90000)

    const data = await resp.json()
    if (!resp.ok) return res.status(500).json({ success: false, error: data.error?.message || '请求失败' })

    const content = data.choices?.[0]?.message?.content
    const result = extractJsonFromContent(content)
    res.json({ success: true, data: result })
  } catch (e) {
    res.status(500).json({ success: false, error: e.message })
  }
})

// ==================== GitHub Webhook 自动部署 ====================

function verifyWebhookSignature(rawBody, signature) {
  const secret = process.env.WEBHOOK_SECRET
  if (!secret || !signature) return false
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
}

function runDeploy() {
  const log = []
  try {
    log.push(`[${new Date().toISOString()}] 开始部署...`)
    log.push(execSync('git pull origin main 2>&1', { cwd: ROOT_DIR, encoding: 'utf8' }).trim())
    log.push(execSync('npm install --silent 2>&1', { cwd: ROOT_DIR, encoding: 'utf8' }).trim())
    log.push(execSync('npm run build 2>&1', { cwd: ROOT_DIR, encoding: 'utf8' }).trim())
    log.push(execSync('cd server && npm install --silent 2>&1', { cwd: ROOT_DIR, encoding: 'utf8' }).trim())
    log.push(execSync('pm2 restart edu-ai-teacher 2>&1', { cwd: ROOT_DIR, encoding: 'utf8' }).trim())
    log.push(`[${new Date().toISOString()}] 部署完成`)
    return { success: true, log: log.filter(Boolean).join('\n') }
  } catch (e) {
    log.push(`部署失败: ${e.message}`)
    return { success: false, log: log.filter(Boolean).join('\n') }
  }
}

app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'] || ''
  const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body || {}))

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn('[Webhook] 签名验证失败')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  let payload
  try {
    payload = req.body instanceof Buffer ? JSON.parse(req.body.toString()) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const ref = payload?.ref || ''
  if (ref !== 'refs/heads/main') {
    console.log(`[Webhook] 忽略分支: ${ref}`)
    return res.json({ message: `Ignored branch: ${ref}` })
  }

  console.log('[Webhook] 收到 main 分支 push，开始部署...')
  const result = runDeploy()
  console.log(result.log)
  res.status(result.success ? 200 : 500).json({
    message: result.success ? '部署完成' : '部署失败',
    log: result.log,
  })
})

// ==================== PPT 生成 ====================
app.post('/api/generate-ppt', async (req, res) => {
  try {
    const data = req.body
    if (!data || !data.radarScores) {
      return res.status(400).json({ success: false, error: '缺少诊断数据' })
    }

    const tmpDir = join(ROOT_DIR, 'tmp')
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true })
    }
    const outputPath = join(tmpDir, `学习方案_${Date.now()}.pptx`)
    const scriptPath = join(ROOT_DIR, 'server', 'generate_ppt.py')
    const pythonPath = getPythonPath()
    const jsonStr = JSON.stringify(data)

    // 使用 spawn 避免 shell 转义问题
    await new Promise((resolve, reject) => {
      const proc = spawn(pythonPath, [scriptPath, outputPath], {
        cwd: ROOT_DIR,
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stderr = ''
      proc.stderr.on('data', (d) => { stderr += d.toString() })
      proc.stdout.on('data', () => {})
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr || `exit code ${code}`))
      })
      proc.on('error', reject)
      proc.stdin.write(jsonStr)
      proc.stdin.end()
    })

    res.download(outputPath, `学习方案_${data.studentName || '学生'}.pptx`, (downloadErr) => {
      try { unlinkSync(outputPath) } catch (_) {}
      if (downloadErr) console.error('PPT download error:', downloadErr)
    })
  } catch (err) {
    console.error('PPT generation error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==================== Word 生成 ====================
function runPythonScript(scriptName, outputPrefix, data) {
  return new Promise((resolve, reject) => {
    const tmpDir = join(ROOT_DIR, 'tmp')
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
    
    const ext = scriptName.includes('word') ? '.docx' : '.pptx'
    const outputPath = join(tmpDir, `${outputPrefix}_${Date.now()}${ext}`)
    const scriptPath = join(ROOT_DIR, 'server', scriptName)
    const pythonPath = getPythonPath()
    const jsonStr = JSON.stringify(data)

    const proc = spawn(pythonPath, [scriptPath, outputPath], {
      cwd: ROOT_DIR,
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.stdout.on('data', () => {})
    proc.on('close', (code) => {
      if (code === 0) resolve(outputPath)
      else reject(new Error(stderr || `exit code ${code}`))
    })
    proc.on('error', reject)
    proc.stdin.write(jsonStr)
    proc.stdin.end()
  })
}

app.post('/api/generate-word', async (req, res) => {
  try {
    const data = req.body
    const outputPath = await runPythonScript('generate_word.py', 'word', data)
    const student = data.studentName || '学生'
    const teacher = data.teacherName || '老师'
    const filename = `${student}-${data.docName || '文档'}-${teacher}.docx`
    
    res.download(outputPath, filename, (err) => {
      try { unlinkSync(outputPath) } catch (_) {}
      if (err) console.error('Word download error:', err)
    })
  } catch (err) {
    console.error('Word generation error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

app.post('/api/generate-practice', async (req, res) => {
  try {
    const { format, data: practiceData } = req.body
    if (!format || !practiceData) {
      return res.status(400).json({ success: false, error: '缺少 format 或 data 参数' })
    }

    let scriptName, outputPrefix, ext, filename
    const student = practiceData.studentName || '学生'
    const wpName = (practiceData.weakPoint || {}).name || '练习'

    if (format === 'ppt_4_3') {
      practiceData.aspect = '4:3'
      const outputPath = await runPythonScript('generate_practice.py', 'practice_4_3', practiceData)
      filename = `${student}-${wpName}练习-4比3.pptx`
      res.download(outputPath, filename, (err) => {
        try { unlinkSync(outputPath) } catch (_) {}
        if (err) console.error('Practice PPT download error:', err)
      })
    } else if (format === 'ppt_16_9') {
      practiceData.aspect = '16:9'
      const outputPath = await runPythonScript('generate_practice.py', 'practice_16_9', practiceData)
      filename = `${student}-${wpName}练习-16比9.pptx`
      res.download(outputPath, filename, (err) => {
        try { unlinkSync(outputPath) } catch (_) {}
        if (err) console.error('Practice PPT download error:', err)
      })
    } else if (format === 'word_student') {
      practiceData.type = 'practice_student'
      const outputPath = await runPythonScript('generate_word.py', 'practice_student', practiceData)
      filename = `${student}-${wpName}练习-学生版.docx`
      res.download(outputPath, filename, (err) => {
        try { unlinkSync(outputPath) } catch (_) {}
        if (err) console.error('Practice Word download error:', err)
      })
    } else if (format === 'word_teacher') {
      practiceData.type = 'practice_teacher'
      const outputPath = await runPythonScript('generate_word.py', 'practice_teacher', practiceData)
      filename = `${student}-${wpName}练习-教师版.docx`
      res.download(outputPath, filename, (err) => {
        try { unlinkSync(outputPath) } catch (_) {}
        if (err) console.error('Practice Word download error:', err)
      })
    } else {
      return res.status(400).json({ success: false, error: '不支持的格式: ' + format })
    }
  } catch (err) {
    console.error('Practice generation error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==================== 模板管理 ====================
const TEMPLATES_DIR = join(ROOT_DIR, 'server', 'templates')
if (!existsSync(TEMPLATES_DIR)) mkdirSync(TEMPLATES_DIR, { recursive: true })

// 获取模板列表
app.get('/api/templates', (req, res) => {
  try {
    if (!existsSync(TEMPLATES_DIR)) {
      return res.json({ success: true, data: [] })
    }
    const files = readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.pptx'))
    const templates = files.map(f => ({
      id: f,
      name: f.replace('.pptx', ''),
      path: join(TEMPLATES_DIR, f),
      isDefault: f.startsWith('_default_'),
    }))
    res.json({ success: true, data: templates })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 上传模板（需登录）
app.post('/api/templates/upload', requireAuth, async (req, res) => {
  try {
    const { name, fileData } = req.body  // fileData: base64 encoded pptx
    if (!name || !fileData) {
      return res.status(400).json({ success: false, error: '缺少模板名称或文件数据' })
    }
    
    const safeName = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_')
    const filePath = join(TEMPLATES_DIR, `${safeName}.pptx`)
    
    // Decode base64
    const buffer = Buffer.from(fileData, 'base64')
    writeFileSync(filePath, buffer)
    
    res.json({ success: true, data: { id: `${safeName}.pptx`, name: safeName } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==================== 用户反馈 ====================
const FEEDBACK_DIR = join(ROOT_DIR, 'feedback')
if (!existsSync(FEEDBACK_DIR)) mkdirSync(FEEDBACK_DIR, { recursive: true })

app.post('/api/feedback', requireAuth, (req, res) => {
  try {
    const { content, page, category, contact } = req.body
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: '请填写反馈内容' })
    }
    
    const feedback = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      content: content.trim(),
      page: page || '',
      category: category || 'general',
      contact: contact || '',
      time: new Date().toISOString(),
      status: 'new',
      userId: req.user.id,
      username: req.user.username,
    }
    
    const filePath = join(FEEDBACK_DIR, `${feedback.id}.json`)
    writeFileSync(filePath, JSON.stringify(feedback, null, 2), 'utf8')
    
    res.json({ success: true, data: { id: feedback.id } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

app.get('/api/feedback/report', (req, res) => {
  try {
    if (!existsSync(FEEDBACK_DIR)) {
      return res.json({ success: true, data: { items: [], summary: '暂无反馈' } })
    }
    
    const files = readdirSync(FEEDBACK_DIR).filter(f => f.endsWith('.json'))
    const items = files.map(f => {
      try {
        return JSON.parse(readFileSync(join(FEEDBACK_DIR, f), 'utf8'))
      } catch { return null }
    }).filter(Boolean).sort((a, b) => new Date(b.time) - new Date(a.time))

    // 按类别分组
    const byCategory = {}
    items.forEach(item => {
      const cat = item.category || 'general'
      if (!byCategory[cat]) byCategory[cat] = []
      byCategory[cat].push(item)
    })

    // 简单优先级：按类别数量排序
    const priority = Object.entries(byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([cat, list]) => ({
        category: cat,
        count: list.length,
        priority: list.length >= 3 ? '高' : list.length >= 2 ? '中' : '低',
        latest: list[0],
      }))

    const summary = priority.length > 0
      ? `共 ${items.length} 条反馈，${priority.filter(p => p.priority === '高').length} 个高优先级类别`
      : '暂无反馈'

    res.json({ success: true, data: { items, priority, summary, total: items.length } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==================== 题库系统 ====================

// --- 知识树 ---
let cachedKnowledgeTree = null
function getKnowledgeTree() {
  if (cachedKnowledgeTree) return cachedKnowledgeTree
  const treePath = join(ROOT_DIR, 'server', 'data', 'knowledge_tree.json')
  if (existsSync(treePath)) {
    cachedKnowledgeTree = JSON.parse(readFileSync(treePath, 'utf8'))
  }
  return cachedKnowledgeTree
}

app.get('/api/question-bank/knowledge-tree', (req, res) => {
  try {
    const tree = getKnowledgeTree()
    if (!tree) return res.status(404).json({ success: false, error: '知识树数据未找到' })
    res.json({ success: true, data: tree })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- 题型列表 ---
app.get('/api/question-bank/types', (req, res) => {
  try {
    const tree = getKnowledgeTree()
    const dim2 = tree?.dimensions?.dim2?.categories
    // 从 question_types.json 获取子类型（如果可用）
    const typesPath = join(ROOT_DIR, 'server', 'data', 'question_types_math.json')
    let subtypes = {}
    if (existsSync(typesPath)) {
      subtypes = JSON.parse(readFileSync(typesPath, 'utf8')).subtypes || {}
    }
    res.json({ success: true, data: { categories: dim2 || {}, subtypes } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- 题库统计 ---
app.get('/api/question-bank/stats', async (req, res) => {
  try {
    const db = await getDB()
    const total = db.exec('SELECT COUNT(*) FROM question_bank')[0].values[0][0]
    const byGrade = db.exec('SELECT grade, COUNT(*) as cnt FROM question_bank GROUP BY grade ORDER BY grade')
    const byType = db.exec('SELECT question_type, COUNT(*) as cnt FROM question_bank GROUP BY question_type')
    const byCognitive = db.exec('SELECT cognitive_level, COUNT(*) as cnt FROM question_bank GROUP BY cognitive_level')
    const byDomain = db.exec('SELECT knowledge_points, COUNT(*) as cnt FROM question_bank')

    const formatRows = (result) => {
      if (result.length === 0) return []
      return result[0].values.map(row => ({ key: row[0], count: row[1] }))
    }

    // 统计知识域分布
    const domainCount = { 'D1': 0, 'D2': 0, 'D3': 0, 'D4': 0 }
    if (byDomain.length > 0) {
      byDomain[0].values.forEach(row => {
        try {
          const kps = JSON.parse(row[0])
          if (Array.isArray(kps)) {
            kps.forEach(kp => {
              if (kp.startsWith('leaf-')) {
                const tree = getKnowledgeTree()
                const info = tree?.leafIndex?.[kp]
                if (info?.domain) domainCount[info.domain] = (domainCount[info.domain] || 0) + 1
              }
            })
          }
        } catch {}
      })
    }

    res.json({
      success: true,
      data: {
        total,
        byGrade: formatRows(byGrade),
        byType: formatRows(byType),
        byCognitive: formatRows(byCognitive),
        byDomain: Object.entries(domainCount).map(([k, v]) => ({ key: k, count: v })),
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- 搜索题目 ---
app.get('/api/question-bank/questions', async (req, res) => {
  try {
    const db = await getDB()
    const {
      keyword, grade, knowledge_point: kp,
      type, difficulty_min: dMin, difficulty_max: dMax,
      cognitive, context, page = 1, page_size: ps = 20,
    } = req.query

    const conditions = []
    const params = []

    if (keyword) {
      conditions.push('(stem LIKE ? OR answer LIKE ? OR tags LIKE ?)')
      const kw = `%${keyword}%`
      params.push(kw, kw, kw)
    }
    if (grade) {
      conditions.push('grade = ?')
      params.push(Number(grade))
    }
    if (kp) {
      conditions.push('knowledge_points LIKE ?')
      params.push(`%"${kp}"%`)
    }
    if (type) {
      conditions.push('question_type = ?')
      params.push(type)
    }
    if (dMin !== undefined) {
      conditions.push('difficulty >= ?')
      params.push(Number(dMin))
    }
    if (dMax !== undefined) {
      conditions.push('difficulty <= ?')
      params.push(Number(dMax))
    }
    if (cognitive) {
      conditions.push('cognitive_level = ?')
      params.push(cognitive)
    }
    if (context) {
      conditions.push('context_type = ?')
      params.push(context)
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const pageNum = Math.max(1, Number(page))
    const pageSize = Math.min(50, Math.max(1, Number(ps) || 20))
    const offset = (pageNum - 1) * pageSize

    // 获取总数
    const countResult = db.exec(`SELECT COUNT(*) FROM question_bank ${where}`, params)
    const total = countResult[0].values[0][0]

    // 获取数据
    const dataResult = db.exec(
      `SELECT id, subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags, created_at FROM question_bank ${where} ORDER BY difficulty ASC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    )

    const items = dataResult.length > 0 ? dataResult[0].values.map(row => ({
      id: row[0], subject: row[1], grade: row[2],
      knowledgePoints: safeJsonParse(row[3]),
      questionType: row[4], subtype: row[5],
      difficulty: row[6], cognitiveLevel: row[7],
      stepLevel: row[8], direction: row[9],
      contextType: row[10], stem: row[11],
      options: safeJsonParse(row[12]),
      answer: row[13], solution: row[14],
      source: row[15], tags: safeJsonParse(row[16]),
      createdAt: row[17],
    })) : []

    res.json({
      success: true,
      data: { items, total, page: pageNum, pageSize, totalPages: Math.ceil(total / pageSize) },
    })
  } catch (err) {
    console.error('[题库] 搜索失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- 获取单个题目 ---
app.get('/api/question-bank/questions/:id', async (req, res) => {
  try {
    const db = await getDB()
    const result = db.exec(
      'SELECT id, subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags, created_at FROM question_bank WHERE id = ?',
      [Number(req.params.id)]
    )
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '题目不存在' })
    }
    const row = result[0].values[0]
    res.json({
      success: true,
      data: {
        id: row[0], subject: row[1], grade: row[2],
        knowledgePoints: safeJsonParse(row[3]),
        questionType: row[4], subtype: row[5],
        difficulty: row[6], cognitiveLevel: row[7],
        stepLevel: row[8], direction: row[9],
        contextType: row[10], stem: row[11],
        options: safeJsonParse(row[12]),
        answer: row[13], solution: row[14],
        source: row[15], tags: safeJsonParse(row[16]),
        createdAt: row[17],
      },
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- 相似题检索（核心算法）---
app.get('/api/question-bank/similar/:id', async (req, res) => {
  try {
    const db = await getDB()
    const targetId = Number(req.params.id)
    const topK = Math.min(50, Math.max(1, Number(req.query.top_k) || 10))
    const sameType = req.query.same_type !== 'false'  // 默认同题型
    const sameGrade = req.query.same_grade === 'true'
    const minScore = Number(req.query.min_score) || 0

    // 获取目标题目
    const targetResult = db.exec(
      'SELECT id, grade, knowledge_points, question_type, difficulty, cognitive_level, step_level, direction, context_type FROM question_bank WHERE id = ?',
      [targetId]
    )
    if (targetResult.length === 0 || targetResult[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '题目不存在' })
    }
    const target = targetResult[0].values[0]
    const targetKps = safeJsonParse(target[2])
    const targetType = target[3]

    // 构建过滤条件
    const conditions = ['id != ?']
    const params = [targetId]
    if (sameType) {
      conditions.push('question_type = ?')
      params.push(targetType)
    }
    if (sameGrade) {
      conditions.push('grade = ?')
      params.push(target[1])
    }

    // 获取候选题目
    const candidates = db.exec(
      `SELECT id, grade, knowledge_points, question_type, difficulty, cognitive_level, step_level, direction, context_type FROM question_bank WHERE ${conditions.join(' AND ')}`,
      params
    )

    if (candidates.length === 0 || candidates[0].values.length === 0) {
      return res.json({ success: true, data: { items: [], targetId } })
    }

    // ===== 多维度加权相似度计算 =====
    const weights = {
      knowledgePoints: 0.40,   // 知识点 Jaccard 相似度（最重要）
      difficulty: 0.20,          // 难度接近度
      cognitive: 0.15,           // 认知层级匹配
      stepLevel: 0.10,           // 步骤层级匹配
      contextType: 0.10,         // 情境匹配
      direction: 0.05,           // 考察方向匹配
    }

    const scored = candidates[0].values.map(row => {
      const cand = {
        id: row[0], grade: row[1],
        kps: safeJsonParse(row[2]),
        questionType: row[3], difficulty: row[4],
        cognitiveLevel: row[5], stepLevel: row[6],
        direction: row[7], contextType: row[8],
      }

      // 知识点 Jaccard 相似度
      let kpScore = 0
      if (Array.isArray(targetKps) && Array.isArray(cand.kps) && targetKps.length > 0) {
        const intersection = targetKps.filter(k => cand.kps.includes(k)).length
        const union = new Set([...targetKps, ...cand.kps]).size
        kpScore = union > 0 ? intersection / union : 0
      }

      // 难度接近度 (0-1, 越近越高)
      const diffDelta = Math.abs(target[4] - cand.difficulty)
      const diffScore = Math.max(0, 1 - diffDelta / 0.5)

      // 认知层级匹配
      const cogScore = target[5] === cand.cognitiveLevel ? 1 : 0

      // 步骤层级匹配
      const stepScore = target[6] === cand.stepLevel ? 1 : 
        (['step1', 'step2', 'step3', 'step4'].indexOf(target[6]) !== -1 && 
         ['step1', 'step2', 'step3', 'step4'].indexOf(cand.stepLevel) !== -1 &&
         Math.abs(['step1', 'step2', 'step3', 'step4'].indexOf(target[6]) - 
                  ['step1', 'step2', 'step3', 'step4'].indexOf(cand.stepLevel)) === 1) ? 0.5 : 0

      // 情境匹配
      const ctxScore = target[8] === cand.contextType ? 1 : 0

      // 考察方向匹配
      const dirScore = target[7] === cand.direction ? 1 : 0

      const totalScore = 
        kpScore * weights.knowledgePoints +
        diffScore * weights.difficulty +
        cogScore * weights.cognitive +
        stepScore * weights.stepLevel +
        ctxScore * weights.contextType +
        dirScore * weights.direction

      return { id: cand.id, score: Math.round(totalScore * 1000) / 1000, details: { kpScore, diffScore, cogScore, stepScore, ctxScore, dirScore } }
    })

    // 排序并取 topK
    scored.sort((a, b) => b.score - a.score)
    const filtered = scored.filter(s => s.score >= minScore)
    const topItems = filtered.slice(0, topK)

    // 获取题目详情
    if (topItems.length > 0) {
      const ids = topItems.map(item => item.id)
      const placeholders = ids.map(() => '?').join(',')
      const detailResult = db.exec(
        `SELECT id, subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags, created_at FROM question_bank WHERE id IN (${placeholders})`,
        ids
      )
      if (detailResult.length > 0) {
        const detailMap = {}
        detailResult[0].values.forEach(row => {
          detailMap[row[0]] = {
            id: row[0], subject: row[1], grade: row[2],
            knowledgePoints: safeJsonParse(row[3]),
            questionType: row[4], subtype: row[5],
            difficulty: row[6], cognitiveLevel: row[7],
            stepLevel: row[8], direction: row[9],
            contextType: row[10], stem: row[11],
            options: safeJsonParse(row[12]),
            answer: row[13], solution: row[14],
            source: row[15], tags: safeJsonParse(row[16]),
            createdAt: row[17],
          }
        })
        topItems.forEach(item => {
          item.question = detailMap[item.id] || null
        })
      }
    }

    res.json({ success: true, data: { items: topItems, targetId, weights } })
  } catch (err) {
    console.error('[题库] 相似题检索失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// --- 添加题目 ---
app.post('/api/question-bank/questions', async (req, res) => {
  try {
    const db = await getDB()
    const {
      subject, grade, knowledgePoints, questionType, subtype,
      difficulty, cognitiveLevel, stepLevel, direction, contextType,
      stem, options, answer, solution, source, tags,
    } = req.body

    if (!stem || !answer || !questionType || !knowledgePoints || !grade) {
      return res.status(400).json({ success: false, error: '缺少必填字段：stem, answer, questionType, knowledgePoints, grade' })
    }

    db.run(
      `INSERT INTO question_bank (subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subject || '数学',
        grade,
        JSON.stringify(knowledgePoints),
        questionType,
        subtype || '',
        difficulty || 0.5,
        cognitiveLevel || 'B',
        stepLevel || 'step1',
        direction || 'A',
        contextType || 'pure',
        stem,
        JSON.stringify(options || []),
        answer,
        solution || '',
        source || '',
        JSON.stringify(tags || []),
      ]
    )
    saveDB()

    const idResult = db.exec('SELECT last_insert_rowid()')
    const newId = idResult[0].values[0][0]

    res.status(201).json({ success: true, data: { id: newId } })
  } catch (err) {
    console.error('[题库] 添加题目失败:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// ==================== 工具函数 ====================
function safeJsonParse(str) {
  if (!str) return []
  try { return JSON.parse(str) } catch { return [] }
}

// ==================== 会员系统 API ====================

// 会员订阅中间件
async function requireActiveSubscription(req, res, next) {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ success: false, error: '请先登录' })
  }
  const db = await getDB()
  const sub = db.exec(
    `SELECT id, plan_name, end_date, status FROM user_subscriptions
     WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now', 'localtime')
     ORDER BY end_date DESC LIMIT 1`,
    [req.user.id]
  )
  if (sub.length === 0 || sub[0].values.length === 0) {
    return res.status(402).json({ success: false, error: '请先开通会员', code: 'NO_SUBSCRIPTION' })
  }
  req.subscription = {
    id: sub[0].values[0][0],
    planName: sub[0].values[0][1],
    endDate: sub[0].values[0][2],
  }
  next()
}

// GET /api/membership/plans — 获取套餐列表
app.get('/api/membership/plans', async (req, res) => {
  try {
    const db = await getDB()
    const plans = db.exec(
      'SELECT id, name, price, duration_days, features, sort_order FROM membership_plans WHERE is_active = 1 ORDER BY sort_order'
    )
    const result = plans.length > 0 ? plans[0].values.map(row => ({
      id: row[0], name: row[1], price: row[2], duration_days: row[3],
      features: JSON.parse(row[4] || '[]'), sort_order: row[5],
    })) : []
    res.json({ success: true, plans: result })
  } catch (e) {
    console.error('[Plans]', e.message)
    res.status(500).json({ success: false, error: '获取套餐列表失败' })
  }
})

// GET /api/membership/my-subscription — 当前订阅状态
app.get('/api/membership/my-subscription', requireAuth, async (req, res) => {
  try {
    const db = await getDB()
    const sub = db.exec(
      `SELECT id, plan_id, plan_name, start_date, end_date, status, payment_order_id, created_at
       FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now', 'localtime')
       ORDER BY end_date DESC LIMIT 1`,
      [req.user.id]
    )

    if (sub.length === 0 || sub[0].values.length === 0) {
      const expired = db.exec(
        `SELECT plan_name FROM user_subscriptions
         WHERE user_id = ? AND plan_name = '免费试用' AND status = 'expired'
         ORDER BY end_date DESC LIMIT 1`,
        [req.user.id]
      )
      return res.json({
        success: true,
        subscription: null,
        hasTrialed: !!(expired.length > 0 && expired[0].values.length > 0),
      })
    }

    const s = sub[0].values[0]
    res.json({
      success: true,
      subscription: { id: s[0], plan_id: s[1], plan_name: s[2], start_date: s[3], end_date: s[4], status: s[5], payment_order_id: s[6], created_at: s[7] },
    })
  } catch (e) {
    console.error('[MySub]', e.message)
    res.status(500).json({ success: false, error: '获取订阅信息失败' })
  }
})

// POST /api/membership/create-order — 创建支付订单
app.post('/api/membership/create-order', requireAuth, async (req, res) => {
  try {
    const { plan_id } = req.body
    if (!plan_id) return res.status(400).json({ success: false, error: '请选择套餐' })

    const db = await getDB()
    const plan = db.exec(
      'SELECT id, name, price, duration_days FROM membership_plans WHERE id = ? AND is_active = 1',
      [plan_id]
    )
    if (plan.length === 0 || plan[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '套餐不存在' })
    }
    const p = plan[0].values[0]

    // Check existing active subscription
    if (p[1] !== '免费试用') {
      const existing = db.exec(
        `SELECT id FROM user_subscriptions WHERE user_id = ? AND plan_id = ? AND status = 'active' AND end_date >= datetime('now', 'localtime')`,
        [req.user.id, plan_id]
      )
      if (existing.length > 0 && existing[0].values.length > 0) {
        return res.status(400).json({ success: false, error: `您已有生效中的${p[1]}` })
      }
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    db.run(
      'INSERT INTO payment_orders (id, user_id, plan_id, amount, status) VALUES (?, ?, ?, ?, ?)',
      [orderId, req.user.id, plan_id, p[2], 'pending']
    )
    saveDB()

    res.json({ success: true, order: { id: orderId, plan_name: p[1], amount: p[2], status: 'pending' } })
  } catch (e) {
    console.error('[CreateOrder]', e.message)
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

// POST /api/membership/confirm-payment — 管理员确认支付
app.post('/api/membership/confirm-payment', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '仅管理员可确认支付' })
    }

    const { order_id } = req.body
    if (!order_id) return res.status(400).json({ success: false, error: '缺少订单ID' })

    const db = await getDB()
    const order = db.exec('SELECT user_id, plan_id, amount, status FROM payment_orders WHERE id = ?', [order_id])
    if (order.length === 0 || order[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '订单不存在' })
    }
    const o = order[0].values[0]
    if (o[3] !== 'pending') {
      return res.status(400).json({ success: false, error: `订单状态为${o[3]}，无法确认` })
    }

    const plan = db.exec('SELECT name, duration_days FROM membership_plans WHERE id = ?', [o[1]])
    const pl = plan[0].values[0]

    // Update order
    db.run("UPDATE payment_orders SET status = 'paid', paid_at = datetime('now', 'localtime') WHERE id = ?", [order_id])

    // Create subscription
    const now = new Date().toISOString()
    const endDate = new Date(Date.now() + pl[1] * 86400000).toISOString()
    db.run(
      'INSERT INTO user_subscriptions (user_id, plan_id, plan_name, start_date, end_date, status, payment_order_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [o[0], o[1], pl[0], now, endDate, 'active', order_id]
    )
    saveDB()

    res.json({ success: true, message: `已确认支付，${pl[0]}已生效`, subscription: { plan_name: pl[0], start_date: now, end_date: endDate } })
  } catch (e) {
    console.error('[ConfirmPay]', e.message)
    res.status(500).json({ success: false, error: '确认支付失败' })
  }
})

// GET /api/membership/orders — 订单历史
app.get('/api/membership/orders', requireAuth, async (req, res) => {
  try {
    const db = await getDB()
    const orders = db.exec(
      `SELECT o.id, o.plan_id, o.amount, o.status, o.payment_method, o.paid_at, o.created_at, p.name as plan_name
       FROM payment_orders o
       LEFT JOIN membership_plans p ON o.plan_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [req.user.id]
    )
    const result = orders.length > 0 ? orders[0].values.map(row => ({
      id: row[0], plan_id: row[1], amount: row[2], status: row[3],
      payment_method: row[4], paid_at: row[5], created_at: row[6], plan_name: row[7],
    })) : []
    res.json({ success: true, orders: result })
  } catch (e) {
    console.error('[Orders]', e.message)
    res.status(500).json({ success: false, error: '获取订单历史失败' })
  }
})

// ==================== 模板课件 API ====================

// GET /api/courseware/templates — 获取模板列表
app.get('/api/courseware/templates', async (req, res) => {
  try {
    const systemTemplates = [
      { id: 'default', name: '默认简洁风格', type: 'system', description: '蓝色专业风格，适合日常教学' },
      { id: 'green', name: '清新绿风格', type: 'system', description: '绿色护眼风格，适合长时间展示' },
      { id: 'warm', name: '温馨橙风格', type: 'system', description: '暖色调风格，适合低年级教学' },
    ]

    const templatesDir = join(ROOT_DIR, 'uploads', 'templates')
    let userTemplates = []
    if (existsSync(templatesDir)) {
      try {
        const files = readdirSync(templatesDir).filter(f => f.endsWith('.pptx') || f.endsWith('.ppt'))
        userTemplates = files.map(f => ({
          id: f, name: f.replace(/\.(pptx?)$/i, ''), type: 'user', description: `教师自传模板 (${f})`,
        }))
      } catch (_) { /* ignore */ }
    }

    res.json({ success: true, templates: { system: systemTemplates, user: userTemplates } })
  } catch (e) {
    console.error('[Templates]', e.message)
    res.status(500).json({ success: false, error: '获取模板列表失败' })
  }
})

// POST /api/courseware/templates/upload — 上传教师模板
app.post('/api/courseware/templates/upload', requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const { file, filename } = req.body
    if (!file || !filename) return res.status(400).json({ success: false, error: '请选择PPT文件' })

    const templatesDir = join(ROOT_DIR, 'uploads', 'templates')
    if (!existsSync(templatesDir)) {
      mkdirSync(templatesDir, { recursive: true })
    }

    if (!/\.(pptx?)$/i.test(filename)) {
      return res.status(400).json({ success: false, error: '仅支持 .ppt 或 .pptx 格式' })
    }

    const safeName = filename.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5.]/g, '_')
    const filePath = join(templatesDir, safeName)
    const buffer = file.includes(',') ? file.split(',')[1] : file
    writeFileSync(filePath, Buffer.from(buffer, 'base64'))

    res.json({ success: true, template: { id: safeName, name: safeName.replace(/\.(pptx?)$/i, ''), type: 'user', description: '教师自传模板' } })
  } catch (e) {
    console.error('[UploadTemplate]', e.message)
    res.status(500).json({ success: false, error: '上传失败，请稍后重试' })
  }
})

// POST /api/courseware/generate-with-template — 使用模板生成课件
app.post('/api/courseware/generate-with-template', requireAuth, requireActiveSubscription, async (req, res) => {
  try {
    const data = req.body
    if (!data) return res.status(400).json({ success: false, error: '缺少课件数据' })

    const tmpDir = join(ROOT_DIR, 'tmp')
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

    const outputPath = join(tmpDir, `课件_${Date.now()}.pptx`)
    const scriptPath = join(ROOT_DIR, 'server', 'generate_courseware_template.py')
    const pyPath = getPythonPath()
    const jsonStr = JSON.stringify(data)

    await new Promise((resolve, reject) => {
      const proc = spawn(pyPath, [scriptPath, outputPath], {
        cwd: ROOT_DIR, timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      let stderr = ''
      proc.stderr.on('data', (d) => { stderr += d.toString() })
      proc.stdout.on('data', () => {})
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(stderr || `exit code ${code}`))
      })
      proc.on('error', reject)
      proc.stdin.write(jsonStr)
      proc.stdin.end()
    })

    res.download(outputPath, `课件_${data.studentName || '学生'}.pptx`, (downloadErr) => {
      try { unlinkSync(outputPath) } catch (_) {}
      if (downloadErr) console.error('Courseware download error:', downloadErr)
    })
  } catch (err) {
    console.error('Courseware generation error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// SPA fallback：非 API 请求返回 dist/index.html
const distPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
app.use(express.static(distPath))
app.get('/{*path}', (req, res) => {
  const indexPath = join(distPath, 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send('Edu AI Teacher API is running. Run `npm run build` to generate frontend.')
  }
})

// ==================== 种子数据导入 ====================
async function seedQuestionBank() {
  try {
    const db = await getDB()
    const count = db.exec('SELECT COUNT(*) FROM question_bank')[0].values[0][0]

    // 导入手写种子数据（仅在题库为空时）
    const seedPath = join(ROOT_DIR, 'server', 'data', 'seed_questions.json')
    const genPath = join(ROOT_DIR, 'server', 'data', 'seed_questions_generated.json')

    let totalImported = 0

    if (count === 0 && existsSync(seedPath)) {
      const questions = JSON.parse(readFileSync(seedPath, 'utf8'))
      totalImported += await batchImportQuestions(db, questions)
    }

    // 导入 AI 生成的题目（去重：跳过 stem 已存在的）
    if (existsSync(genPath)) {
      const genQuestions = JSON.parse(readFileSync(genPath, 'utf8'))
      const existingStems = new Set()
      const allRows = db.exec('SELECT stem FROM question_bank')
      if (allRows.length > 0) {
        for (const row of allRows[0].values) existingStems.add(row[0])
      }
      const newQs = genQuestions.filter(q => !existingStems.has(q.stem))
      if (newQs.length > 0) {
        const imported = await batchImportQuestions(db, newQs)
        totalImported += imported
        console.log(`[题库] 从 AI 生成数据导入 ${imported} 道新题（跳过 ${genQuestions.length - imported} 道重复）`)
      } else {
        console.log(`[题库] AI 生成数据中无新题可导入（全部 ${genQuestions.length} 道已存在）`)
      }
    }

    if (totalImported > 0) {
      console.log(`[题库] 本次共导入 ${totalImported} 道题目`)
    }
  } catch (err) {
    console.error('[题库] 种子导入失败:', err.message)
  }
}

async function batchImportQuestions(db, questions) {
  const stmt = db.prepare(
    `INSERT INTO question_bank (subject, grade, knowledge_points, question_type, subtype, difficulty, cognitive_level, step_level, direction, context_type, stem, options, answer, solution, source, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  let count = 0
  for (const q of questions) {
    try {
      stmt.run([
        q.subject || '数学', q.grade || 3,
        JSON.stringify(q.knowledgePoints || []),
        q.questionType || 'T02', q.subtype || '',
        q.difficulty || 0.5, q.cognitiveLevel || 'B',
        q.stepLevel || 'step1', q.direction || 'A', q.contextType || 'life',
        q.stem, JSON.stringify(q.options || []),
        q.answer, q.solution || '', q.source || 'AI自动生成',
        JSON.stringify(q.tags || []),
      ])
      count++
    } catch (e) {
      // 跳过单个错误
    }
  }
  stmt.free()
  if (count > 0) saveDB()
  return count
}

app.listen(PORT, async () => {
  console.log(`Edu AI Teacher server running on http://localhost:${PORT}`)
  // 自动导入种子题库
  await seedQuestionBank()
})
