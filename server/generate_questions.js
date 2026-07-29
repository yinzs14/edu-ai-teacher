// ==================== AI 批量生成数学题脚本 ====================
// 用法: node server/generate_questions.js [--dry]
// 读取 knowledge_tree.json，按模块分组调用 AI 批量生成题目
// 输出到 server/data/seed_questions_generated.json

import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const KNOWLEDGE_TREE_PATH = join(ROOT_DIR, 'server', 'data', 'knowledge_tree.json')
const OUTPUT_PATH = join(ROOT_DIR, 'server', 'data', 'seed_questions_generated.json')
const DRY_MODE = process.argv.includes('--dry')

// 读取 .env 中的 API key
function loadEnv() {
  try {
    const envPath = join(ROOT_DIR, '.env')
    const content = readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) process.env[m[1]] = (m[2] || '').replace(/^["']|["']$/g, '')
    }
  } catch { /* .env may not exist */ }
}

function getApiKey() {
  return process.env.DEEPSEEK_API_KEY || process.env.DASHSCOPE_API_KEY || ''
}

const QUESTION_TEMPLATE = {
  subject: '数学',
  grade: 3,
  knowledgePoints: [],
  questionType: 'T02',
  subtype: '',
  difficulty: 0.5,
  cognitiveLevel: 'B',
  stepLevel: 'step1',
  direction: 'A',
  contextType: 'life',
  stem: '',
  options: [],
  answer: '',
  solution: '',
  source: 'AI自动生成',
  tags: [],
}

// 简化的题型-认知-方向映射
const TYPE_COGNITIVE_MAP = {
  '数与代数': { types: ['T01', 'T02', 'T03', 'T05'], cognitive: ['A', 'B', 'C'], direction: ['K', 'A'] },
  '图形与几何': { types: ['T01', 'T02', 'T06', 'T05'], cognitive: ['A', 'B', 'C'], direction: ['K', 'U', 'A'] },
  '统计与概率': { types: ['T01', 'T02', 'T05', 'T06'], cognitive: ['A', 'B'], direction: ['K', 'A'] },
  '综合与实践': { types: ['T05', 'T08', 'T02'], cognitive: ['B', 'C', 'D'], direction: ['A', 'R'] },
}

async function callAI(messages) {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error('缺少 API 密钥')
  
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120000)
  
  try {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.5,
      }),
      signal: controller.signal,
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error?.message || `HTTP ${resp.status}`)
    return data.choices?.[0]?.message?.content || ''
  } finally {
    clearTimeout(timer)
  }
}

function extractJson(content) {
  if (!content) return null
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  try { return JSON.parse(candidate) } catch { /* fall through */ }
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1))
  return null
}

async function generateQuestionsForModule(moduleInfo) {
  const { domainName, moduleName, leaves } = moduleInfo
  const { types, cognitive, direction } = TYPE_COGNITIVE_MAP[domainName] || TYPE_COGNITIVE_MAP['数与代数']
  
  const leavesDesc = leaves.map(l => 
    `  - ${l.id} | ${l.name} | 年级${l.grades.join('/')} | ${l.description}`
  ).join('\n')

  const prompt = `你是小学数学教研员。请为下列知识点各生成 2-3 道数学题。

领域：${domainName}
模块：${moduleName}
知识点列表：
${leavesDesc}

要求：
1. 每道题包含：题干(stem)、正确答案(answer)、详细解题思路(solution)、选项(options,仅选择题需要)
2. 标注六维标签：
   - grade: 年级数字(1-6)
   - knowledgePoints: 使用的知识点ID数组
   - questionType: ${types.join('/')}
   - cognitiveLevel: ${cognitive.join('/')}
   - stepLevel: step1(单步)/step2(双步)/step3(多步)
   - direction: ${direction.join('/')} (K=知识再认, U=理解判断, A=应用解决)
   - contextType: pure(纯数学)/life(生活情境)
   - difficulty: 0.1-0.9 (难度系数)
3. 要覆盖不同年级、不同题型、不同难度
4. 题干贴近小学生生活，语言简洁
5. 题量：每个知识点至少2道

返回JSON数组格式：{"questions": [{...题目1}, {...题目2}, ...]}
只返回合法JSON，不要包含其他文字。`

  console.log(`  [生成] ${domainName} > ${moduleName} (${leaves.length}个知识点)...`)
  
  if (DRY_MODE) {
    console.log(`  [DRY] 将生成约 ${leaves.length * 2} 道题，跳过API调用`)
    return []
  }
  
  try {
    const content = await callAI([
      { role: 'system', content: '你是小学数学教材编写专家，要求返回合法JSON。' },
      { role: 'user', content: prompt },
    ])
    const result = extractJson(content)
    if (!result || !result.questions) {
      console.log(`  警告: 解析失败，返回空`)
      return []
    }
    console.log(`  生成 ${result.questions.length} 道题`)
    return result.questions.map(q => ({ ...QUESTION_TEMPLATE, ...q, source: 'AI自动生成' }))
  } catch (e) {
    console.log(`  错误: ${e.message}`)
    return []
  }
}

async function main() {
  loadEnv()
  
  console.log('=== AI 批量生成数学题 ===')
  if (DRY_MODE) console.log('  [DRY MODE] 不调用API，仅预览')
  
  const tree = JSON.parse(readFileSync(KNOWLEDGE_TREE_PATH, 'utf-8'))
  const domains = tree.dimensions.dim1.domains
  
  // 按模块分组
  const modules = []
  for (const domain of domains) {
    for (const mod of domain.modules) {
      modules.push({
        domainName: domain.name,
        moduleName: mod.name,
        leaves: mod.leaves,
      })
    }
  }
  
  console.log(`共 ${modules.length} 个模块，${modules.reduce((s, m) => s + m.leaves.length, 0)} 个知识点\n`)
  
  let allQuestions = []
  let totalModules = modules.length
  
  for (let i = 0; i < totalModules; i++) {
    const mod = modules[i]
    console.log(`[${i + 1}/${totalModules}] ${mod.domainName} > ${mod.moduleName}`)
    const qs = await generateQuestionsForModule(mod)
    allQuestions = allQuestions.concat(qs)
    
    // 每批次保存一次（防止中途失败丢失）
    if (allQuestions.length > 0 && !DRY_MODE) {
      writeFileSync(OUTPUT_PATH, JSON.stringify(allQuestions, null, 2), 'utf-8')
      console.log(`  [已保存] 累计 ${allQuestions.length} 道题\n`)
    }
  }
  
  if (!DRY_MODE) {
    writeFileSync(OUTPUT_PATH, JSON.stringify(allQuestions, null, 2), 'utf-8')
  }
  
  console.log(`\n=== 完成 ===`)
  console.log(`总计生成: ${allQuestions.length} 道题`)
  console.log(`输出文件: ${OUTPUT_PATH}`)
  
  // 统计分布
  const gradeDist = {}
  const typeDist = {}
  const domainDist = {}
  for (const q of allQuestions) {
    if (q.grade) gradeDist[q.grade] = (gradeDist[q.grade] || 0) + 1
    if (q.questionType) typeDist[q.questionType] = (typeDist[q.questionType] || 0) + 1
    for (const kp of (q.knowledgePoints || [])) {
      const leaf = tree.dimensions.dim1.leafIndex?.[kp]
      if (leaf) domainDist[leaf.domain] = (domainDist[leaf.domain] || 0) + 1
    }
  }
  console.log('年级分布:', JSON.stringify(gradeDist))
  console.log('题型分布:', JSON.stringify(typeDist))
  console.log('领域分布:', JSON.stringify(domainDist))
}

main().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
