import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import { execSync, spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from 'fs'
import db from './db.js'
import { signToken, verifyToken, authMiddleware } from './middleware/auth.js'
import './seed_admin.js' // Seed admin account + membership plans on startup

dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') })

const app = express()
const PORT = process.env.PORT || 3001
const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

// ==================== 请求体验证（Webhook 需要 raw body） ====================
app.use(cors())

// Webhook 路由需要原始请求体（验证 HMAC 签名），必须在 express.json() 之前注册
app.use('/api/webhook', express.raw({ type: 'application/json' }))

app.use(express.json({ limit: '50mb' }))

app.use(cors())
app.use(express.json({ limit: '50mb' }))

// ==================== OCR 百度接口 ====================
async function getBaiduAccessToken() {
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY
  if (!apiKey || !secretKey) throw new Error('系统配置缺失：未设置百度OCR接口密钥，请联系管理员')

  const url = new URL('https://aip.baidubce.com/oauth/2.0/token')
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', apiKey)
  url.searchParams.set('client_secret', secretKey)

  const resp = await fetch(url.toString(), { method: 'POST' })
  const data = await resp.json()
  if (!resp.ok || !data.access_token) throw new Error('系统错误：无法连接百度OCR服务，请稍后重试或联系管理员')
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

  const resp = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image }).toString(),
  })
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
    if (!apiKey) return res.status(500).json({ success: false, error: '系统配置缺失：未设置AI识别接口密钥，请联系管理员' })

    const image = normalizeBase64(req.body.image)
    if (!image) return res.status(400).json({ success: false, error: '请提供图片' })

    const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
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
    })

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
    if (!apiKey) return res.status(500).json({ success: false, error: '系统配置缺失：未设置AI诊断服务密钥，请联系管理员' })

    const description = req.body.description || req.body.text || req.body.content || req.body.message
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ success: false, error: '请先上传作业图片或输入题目内容' })
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

    const resp = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
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
    })

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
      execSync(`mkdir -p "${tmpDir}"`)
    }
    const outputPath = join(tmpDir, `学习方案_${Date.now()}.pptx`)
    const scriptPath = join(ROOT_DIR, 'server', 'generate_ppt.py')
    const pythonPath = process.env.PYTHON_PATH || 'python3'
    const jsonStr = JSON.stringify(data)

    // 使用 spawn 避免 shell 转义问题
    await new Promise((resolve, reject) => {
      const proc = spawn(pythonPath, [scriptPath, outputPath], {
        cwd: ROOT_DIR,
        timeout: 30000,
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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// ==================== 密码工具函数 ====================
function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.pbkdf2(password, salt, 310000, 32, 'sha256', (err, key) => {
      if (err) reject(err)
      else resolve(`${salt}:${key.toString('hex')}`)
    })
  })
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, 310000, 32, 'sha256', (err, key) => {
      if (err) resolve(false)
      else resolve(key.toString('hex') === hash)
    })
  })
}

// ==================== 登录速率限制 ====================
function checkRateLimit(identifier, maxAttempts = 5, windowMinutes = 15) {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString()
  // Count failed attempts within window
  const row = db.prepare(
    `SELECT COUNT(*) as count FROM login_attempts
     WHERE identifier = ? AND attempted_at > ? AND success = 0`
  ).get(identifier, cutoff)

  return { allowed: row.count < maxAttempts, remaining: maxAttempts - row.count }
}

function recordLoginAttempt(identifier, ip, success) {
  db.prepare(
    'INSERT INTO login_attempts (identifier, ip_address, success) VALUES (?, ?, ?)'
  ).run(identifier, ip, success)
}

// ==================== 用户认证 API ====================

// --- 注册 ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // 前端已校验，后端做防御性校验
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: '用户名、邮箱和密码不能为空' })
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ success: false, error: '用户名为3-20位字母、数字或下划线' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, error: '请输入有效的邮箱地址' })
    }
    if (password.length < 6 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ success: false, error: '密码至少6位，且需包含字母和数字' })
    }

    // 检查用户名是否已被占用
    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existingUser) {
      return res.status(409).json({ success: false, error: '该用户名已被注册，请换一个试试' })
    }

    // 检查邮箱是否已被占用
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existingEmail) {
      return res.status(409).json({ success: false, error: '该邮箱已被注册，请直接登录' })
    }

    // 创建用户
    const passwordHash = await hashPassword(password)
    const result = db.prepare(
      `INSERT INTO users (username, email, password_hash, name, role)
       VALUES (?, ?, ?, ?, 'teacher')`
    ).run(username, email, passwordHash, username)

    const user = db.prepare(
      `SELECT id, username, email, name, role, avatar, created_at
       FROM users WHERE id = ?`
    ).get(result.lastInsertRowid)

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    // Auto-create 3-day free trial subscription
    try {
      const trialPlan = db.prepare(
        'SELECT id, duration_days FROM membership_plans WHERE name = ? AND is_active = 1'
      ).get('免费试用')
      if (trialPlan) {
        const now = new Date()
        const endDate = new Date(now)
        endDate.setDate(endDate.getDate() + trialPlan.duration_days)
        db.prepare(
          `INSERT INTO user_subscriptions (user_id, plan_id, plan_name, start_date, end_date, status)
           VALUES (?, ?, ?, ?, ?, 'active')`
        ).run(user.id, trialPlan.id, '免费试用', now.toISOString(), endDate.toISOString())
      }
    } catch (e) {
      console.error('[Register trial]', e.message)
      // Don't fail registration if trial creation fails
    }

    res.json({ success: true, user, token })
  } catch (e) {
    console.error('[Register]', e.message)
    res.status(500).json({ success: false, error: '注册失败，请稍后重试' })
  }
})

// --- 登录 ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown'

    if (!username || !password) {
      return res.status(400).json({ success: false, error: '请输入用户名和密码' })
    }

    // 速率限制检查
    const rateCheck = checkRateLimit(username)
    if (!rateCheck.allowed) {
      recordLoginAttempt(username, clientIp, 0)
      return res.status(429).json({
        success: false,
        error: '登录尝试次数过多，请15分钟后再试',
        code: 'RATE_LIMITED',
        retryAfter: 900,
      })
    }

    // 查找用户（支持用户名或邮箱登录）
    const user = db.prepare(
      `SELECT * FROM users WHERE username = ? OR email = ?`
    ).get(username, username)

    if (!user) {
      recordLoginAttempt(username, clientIp, 0)
      return res.status(401).json({ success: false, error: '用户名或密码错误' })
    }

    // 验证密码
    const valid = await verifyPassword(password, user.password_hash)
    if (!valid) {
      recordLoginAttempt(username, clientIp, 0)
      return res.status(401).json({ success: false, error: '用户名或密码错误' })
    }

    // 记录成功登录
    recordLoginAttempt(username, clientIp, 1)

    // 更新最后登录时间
    db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(user.id)

    // 签发 token
    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    })

    const { password_hash: _, ...safeUser } = user

    res.json({ success: true, user: safeUser, token })
  } catch (e) {
    console.error('[Login]', e.message)
    res.status(500).json({ success: false, error: '登录失败，请稍后重试' })
  }
})

// --- 获取当前用户信息 ---
app.get('/api/auth/me', authMiddleware, (req, res) => {
  try {
    const user = db.prepare(
      `SELECT id, username, email, name, role, avatar, phone, school,
              email_verified, created_at, last_login_at
       FROM users WHERE id = ?`
    ).get(req.user.userId)

    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }

    // Get subscription status
    const sub = db.prepare(
      `SELECT plan_name, end_date, status FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now')
       ORDER BY end_date DESC LIMIT 1`
    ).get(req.user.userId)

    res.json({ success: true, user, subscription: sub || null })
  } catch (e) {
    console.error('[GetMe]', e.message)
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

// --- 更新个人信息 ---
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, phone, school } = req.body
    const userId = req.user.userId

    // 如果修改邮箱，检查唯一性
    if (email && email !== req.user.email) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, userId)
      if (existing) {
        return res.status(409).json({ success: false, error: '该邮箱已被其他账号使用' })
      }
    }

    db.prepare(
      `UPDATE users SET name = COALESCE(name, ?), email = COALESCE(?, email),
                      phone = COALESCE(phone, ?), school = COALESCE(school, ?),
                      updated_at = datetime('now')
       WHERE id = ?`
    ).run(name || null, email || null, phone || null, school || null, userId)

    const updated = db.prepare(
      `SELECT id, username, email, name, role, avatar, phone, school FROM users WHERE id = ?`
    ).get(userId)

    res.json({ success: true, user: updated })
  } catch (e) {
    console.error('[UpdateProfile]', e.message)
    res.status(500).json({ success: false, error: '保存失败，请稍后重试' })
  }
})

// --- 修改密码 ---
app.put('/api/auth/password', authMiddleware, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body
    const userId = req.user.userId

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '请填写完整信息' })
    }
    if (newPassword.length < 6 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({ success: false, error: '新密码至少6位，且需包含字母和数字' })
    }

    // 获取当前密码哈希
    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId)
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' })
    }

    // 验证旧密码
    const valid = await verifyPassword(oldPassword, user.password_hash)
    if (!valid) {
      return res.status(401).json({ success: false, error: '当前密码错误' })
    }

    // 设置新密码
    const newPasswordHash = await hashPassword(newPassword)
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?")
      .run(newPasswordHash, userId)

    res.json({ success: true, message: '密码修改成功' })
  } catch (e) {
    console.error('[ChangePassword]', e.message)
    res.status(500).json({ success: false, error: '密码修改失败，请稍后重试' })
  }
})

// ==================== 会员订阅中间件 ====================
function requireActiveSubscription(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: '请先登录' })
  }
  const sub = db.prepare(
    `SELECT id, plan_name, end_date, status FROM user_subscriptions
     WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now')
     ORDER BY end_date DESC LIMIT 1`
  ).get(req.user.userId)

  if (!sub) {
    return res.status(402).json({ success: false, error: '请先开通会员', code: 'NO_SUBSCRIPTION' })
  }

  req.subscription = {
    id: sub.id,
    planName: sub.plan_name,
    endDate: sub.end_date,
  }
  next()
}

// --- 获取会员套餐列表 ---
app.get('/api/membership/plans', (req, res) => {
  try {
    const plans = db.prepare(
      'SELECT id, name, price, duration_days, features, sort_order FROM membership_plans WHERE is_active = 1 ORDER BY sort_order'
    ).all()
    const result = plans.map(p => ({
      ...p,
      features: JSON.parse(p.features || '[]'),
    }))
    res.json({ success: true, plans: result })
  } catch (e) {
    console.error('[Plans]', e.message)
    res.status(500).json({ success: false, error: '获取套餐列表失败' })
  }
})

// --- 获取当前用户订阅状态 ---
app.get('/api/membership/my-subscription', authMiddleware, (req, res) => {
  try {
    const sub = db.prepare(
      `SELECT id, plan_id, plan_name, start_date, end_date, status, payment_order_id, created_at
       FROM user_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= datetime('now')
       ORDER BY end_date DESC LIMIT 1`
    ).get(req.user.userId)

    if (!sub) {
      // Check if user had a trial that expired
      const expired = db.prepare(
        `SELECT plan_name FROM user_subscriptions
         WHERE user_id = ? AND plan_name = '免费试用' AND status = 'expired'
         ORDER BY end_date DESC LIMIT 1`
      ).get(req.user.userId)

      return res.json({
        success: true,
        subscription: null,
        hasTrialed: !!expired,
      })
    }

    res.json({ success: true, subscription: sub })
  } catch (e) {
    console.error('[MySub]', e.message)
    res.status(500).json({ success: false, error: '获取订阅信息失败' })
  }
})

// --- 创建支付订单 ---
app.post('/api/membership/create-order', authMiddleware, (req, res) => {
  try {
    const { plan_id } = req.body
    if (!plan_id) {
      return res.status(400).json({ success: false, error: '请选择套餐' })
    }

    const plan = db.prepare(
      'SELECT id, name, price, duration_days FROM membership_plans WHERE id = ? AND is_active = 1'
    ).get(plan_id)

    if (!plan) {
      return res.status(404).json({ success: false, error: '套餐不存在' })
    }

    // Check if user already has an active subscription of this plan
    const existingSub = db.prepare(
      `SELECT id FROM user_subscriptions
       WHERE user_id = ? AND plan_id = ? AND status = 'active' AND end_date >= datetime('now')`
    ).get(req.user.userId, plan_id)

    if (existingSub && plan.name !== '免费试用') {
      return res.status(400).json({ success: false, error: `您已有生效中的${plan.name}` })
    }

    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    db.prepare(
      `INSERT INTO payment_orders (id, user_id, plan_id, amount, status)
       VALUES (?, ?, ?, ?, 'pending')`
    ).run(orderId, req.user.userId, plan_id, plan.price)

    res.json({
      success: true,
      order: {
        id: orderId,
        plan_name: plan.name,
        amount: plan.price,
        status: 'pending',
      },
    })
  } catch (e) {
    console.error('[CreateOrder]', e.message)
    res.status(500).json({ success: false, error: '创建订单失败' })
  }
})

// --- 管理员确认支付 ---
app.post('/api/membership/confirm-payment', authMiddleware, (req, res) => {
  try {
    // Only admin can confirm
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '仅管理员可确认支付' })
    }

    const { order_id } = req.body
    if (!order_id) {
      return res.status(400).json({ success: false, error: '缺少订单ID' })
    }

    const order = db.prepare(
      'SELECT user_id, plan_id, amount, status FROM payment_orders WHERE id = ?'
    ).get(order_id)

    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' })
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ success: false, error: `订单状态为${order.status}，无法确认` })
    }

    const plan = db.prepare(
      'SELECT name, duration_days FROM membership_plans WHERE id = ?'
    ).get(order.plan_id)

    // Update order status
    db.prepare(
      "UPDATE payment_orders SET status = 'paid', paid_at = datetime('now') WHERE id = ?"
    ).run(order_id)

    // Calculate subscription period
    const now = new Date()
    const endDate = new Date(now)
    endDate.setDate(endDate.getDate() + plan.duration_days)

    // Create subscription
    db.prepare(
      `INSERT INTO user_subscriptions (user_id, plan_id, plan_name, start_date, end_date, status, payment_order_id)
       VALUES (?, ?, ?, ?, ?, 'active', ?)`
    ).run(
      order.user_id,
      order.plan_id,
      plan.name,
      now.toISOString(),
      endDate.toISOString(),
      order_id,
    )

    res.json({
      success: true,
      message: `已确认支付，${plan.name}已生效`,
      subscription: {
        plan_name: plan.name,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      },
    })
  } catch (e) {
    console.error('[ConfirmPay]', e.message)
    res.status(500).json({ success: false, error: '确认支付失败' })
  }
})

// --- 订单历史 ---
app.get('/api/membership/orders', authMiddleware, (req, res) => {
  try {
    const orders = db.prepare(
      `SELECT o.id, o.plan_id, o.amount, o.status, o.payment_method, o.paid_at, o.created_at,
              p.name as plan_name
       FROM payment_orders o
       LEFT JOIN membership_plans p ON o.plan_id = p.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`
    ).all(req.user.userId)

    res.json({ success: true, orders })
  } catch (e) {
    console.error('[Orders]', e.message)
    res.status(500).json({ success: false, error: '获取订单历史失败' })
  }
})

// ==================== 模板课件 API ====================

// --- 获取模板列表 ---
app.get('/api/courseware/templates', authMiddleware, (req, res) => {
  try {
    // System templates (pre-defined)
    const systemTemplates = [
      { id: 'default', name: '默认简洁风格', type: 'system', description: '蓝色专业风格，适合日常教学' },
      { id: 'green', name: '清新绿风格', type: 'system', description: '绿色护眼风格，适合长时间展示' },
      { id: 'warm', name: '温馨橙风格', type: 'system', description: '暖色调风格，适合低年级教学' },
    ]

    // User-uploaded templates (stored in uploads/templates/)
    const templatesDir = join(ROOT_DIR, 'uploads', 'templates')
    let userTemplates = []
    if (existsSync(templatesDir)) {
      const files = readdirSync(templatesDir).filter(f => f.endsWith('.pptx') || f.endsWith('.ppt'))
      userTemplates = files.map(f => ({
          id: f,
          name: f.replace(/\.(pptx?)$/i, ''),
          type: 'user',
          description: `教师自传模板 (${f})`,
        }))
      } catch (_) { /* ignore */ }
    }

    res.json({ success: true, templates: { system: systemTemplates, user: userTemplates } })
  } catch (e) {
    console.error('[Templates]', e.message)
    res.status(500).json({ success: false, error: '获取模板列表失败' })
  }
})

// --- 上传教师模板 ---
app.post('/api/courseware/templates/upload', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const { file, filename } = req.body
    if (!file || !filename) {
      return res.status(400).json({ success: false, error: '请选择PPT文件' })
    }

    const templatesDir = join(ROOT_DIR, 'uploads', 'templates')
    if (!existsSync(templatesDir)) {
      mkdirSync(templatesDir, { recursive: true })
    }

    // Validate file extension
    if (!/\.(pptx?)$/i.test(filename)) {
      return res.status(400).json({ success: false, error: '仅支持 .ppt 或 .pptx 格式' })
    }

    // Sanitize filename
    const safeName = filename.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5.]/g, '_')
    const filePath = join(templatesDir, safeName)

    // Write base64 file
    const buffer = file.includes(',') ? file.split(',')[1] : file
    writeFileSync(filePath, Buffer.from(buffer, 'base64'))

    res.json({
      success: true,
      template: {
        id: safeName,
        name: safeName.replace(/\.(pptx?)$/i, ''),
        type: 'user',
        description: '教师自传模板',
      },
    })
  } catch (e) {
    console.error('[UploadTemplate]', e.message)
    res.status(500).json({ success: false, error: '上传失败，请稍后重试' })
  }
})

// --- 使用模板生成课件 ---
app.post('/api/courseware/generate-with-template', authMiddleware, requireActiveSubscription, async (req, res) => {
  try {
    const data = req.body
    if (!data) {
      return res.status(400).json({ success: false, error: '缺少课件数据' })
    }

    const tmpDir = join(ROOT_DIR, 'tmp')
    if (!existsSync(tmpDir)) {
      mkdirSync(tmpDir, { recursive: true })
    }

    const outputPath = join(tmpDir, `课件_${Date.now()}.pptx`)
    const scriptPath = join(ROOT_DIR, 'server', 'generate_courseware_template.py')
    const pythonPath = process.env.PYTHON_PATH || 'python3'

    // Pass template path if available
    let templatePath = null
    if (data.templateId && data.templateId !== 'default') {
      // Check user templates
      const userTemplatePath = join(ROOT_DIR, 'uploads', 'templates', data.templateId)
      if (existsSync(userTemplatePath)) {
        templatePath = userTemplatePath
      }
    }

    const jsonStr = JSON.stringify(data)

    await new Promise((resolve, reject) => {
      const args = [scriptPath, outputPath]
      const proc = spawn(pythonPath, args, {
        cwd: ROOT_DIR,
        timeout: 30000,
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

// SPA fallback：非 API 请求返回 dist/index.html
const distPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  const indexPath = join(distPath, 'index.html')
  if (existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send('Edu AI Teacher API is running. Run `npm run build` to generate frontend.')
  }
})

app.listen(PORT, () => {
  console.log(`Edu AI Teacher server running on http://localhost:${PORT}`)
})
