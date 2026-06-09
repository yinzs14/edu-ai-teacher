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
    db.exec('INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)', [username, passwordHash, nickname || username])
    saveDB()
    const userId = db.exec('SELECT last_insert_rowid()')[0].values[0][0]
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
    res.json({ success: true, data: { id: row[0], username: row[1], nickname: row[2], role: row[3], avatar: row[4], email: row[5], createdAt: row[6] } })
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

app.listen(PORT, () => {
  console.log(`Edu AI Teacher server running on http://localhost:${PORT}`)
})
