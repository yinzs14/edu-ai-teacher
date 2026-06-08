import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import crypto from 'crypto'
import { execSync } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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
  if (!apiKey || !secretKey) throw new Error('缺少 BAIDU_API_KEY / BAIDU_SECRET_KEY')

  const url = new URL('https://aip.baidubce.com/oauth/2.0/token')
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', apiKey)
  url.searchParams.set('client_secret', secretKey)

  const resp = await fetch(url.toString(), { method: 'POST' })
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
    if (!apiKey) return res.status(500).json({ success: false, error: '缺少 DASHSCOPE_API_KEY' })

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

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// SPA fallback：非 API 请求返回 dist/index.html
import { existsSync } from 'fs'
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
