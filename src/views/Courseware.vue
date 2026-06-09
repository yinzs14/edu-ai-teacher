<template>
  <div class="page-container courseware-page">
    <div class="page-top-bar">
      <el-button :icon="ArrowLeft" @click="goBack" class="back-btn">返回诊断页</el-button>
      <div>
        <h1 class="page-title">定制化学情分析/学习方案</h1>
        <p class="page-subtitle">
          {{ fromDiagnose ? '已根据学情诊断结果生成定制的学情分析报告与学习方案' : '预览、编辑并下载定制的学情分析与学习方案' }}
        </p>
      </div>
    </div>

    <el-alert
      v-if="fromDiagnose && hasDiagnosisData"
      type="success"
      :closable="false"
      show-icon
      class="diagnose-alert"
      title="已从学情诊断页导入薄弱知识点，方案内容已做针对性调整"
    />

    <el-alert
      v-if="fromDiagnose && !hasDiagnosisData"
      type="warning"
      :closable="false"
      show-icon
      class="diagnose-alert"
      title="未找到学情诊断数据（可能已过期），使用默认课件模板"
    />

    <div class="toolbar card-section">
      <el-button type="primary" :icon="Edit" @click="editMode = !editMode">
        {{ editMode ? '完成编辑' : '编辑内容' }}
      </el-button>
      <el-button :icon="Refresh" @click="resetCourseware">重置</el-button>
      <el-tooltip :content="!hasDiagnosisData ? '请先在学情诊断页完成分析' : ''" :disabled="hasDiagnosisData">
        <el-button type="success" :icon="Download" :loading="pptGenerating" :disabled="!hasDiagnosisData" @click="downloadPPT">
          下载 PPT（学情分析 + 学习方案）
        </el-button>
      </el-tooltip>
      <el-tooltip :content="!hasDiagnosisData ? '请先在学情诊断页完成分析' : ''" :disabled="hasDiagnosisData">
        <el-button type="warning" :icon="Printer" :loading="pdfGenerating" :disabled="!hasDiagnosisData" @click="downloadPDF">
          下载 PDF（学情分析 + 学习方案）
        </el-button>
      </el-tooltip>
    </div>

    <div class="card-section preview-card">
      <div class="preview-header">
        <el-input
          v-if="editMode"
          v-model="courseware.title"
          class="title-input"
          placeholder="课件标题"
        />
        <h2 v-else class="preview-title">{{ courseware.title }}</h2>
        <div class="meta-tags">
          <el-tag type="primary">{{ courseware.grade }}</el-tag>
          <el-tag type="info">{{ courseware.unit }}</el-tag>
        </div>
      </div>

      <el-divider />

      <section class="preview-block">
        <h3>
          <el-icon><Notebook /></el-icon>
          例题
        </h3>
        <el-input
          v-if="editMode"
          v-model="courseware.example.question"
          type="textarea"
          :rows="3"
          placeholder="例题题干"
        />
        <p v-else class="content-text">{{ courseware.example.question }}</p>
      </section>

      <section class="preview-block">
        <h3>
          <el-icon><EditPen /></el-icon>
          解析
        </h3>
        <el-input
          v-if="editMode"
          v-model="courseware.example.analysis"
          type="textarea"
          :rows="6"
          placeholder="解题解析"
        />
        <pre v-else class="content-text analysis">{{ courseware.example.analysis }}</pre>
      </section>

      <section class="preview-block">
        <h3>
          <el-icon><List /></el-icon>
          练习题
          <el-button
            v-if="editMode"
            type="primary"
            link
            size="small"
            @click="addExercise"
          >
            + 添加题目
          </el-button>
        </h3>

        <div
          v-for="(ex, index) in courseware.exercises"
          :key="ex.id"
          class="exercise-item"
        >
          <div class="exercise-header">
            <span class="exercise-num">第 {{ index + 1 }} 题</span>
            <el-button
              v-if="editMode"
              type="danger"
              link
              size="small"
              @click="removeExercise(index)"
            >
              删除
            </el-button>
          </div>
          <el-input
            v-if="editMode"
            v-model="ex.question"
            type="textarea"
            :rows="2"
            placeholder="题目内容"
            class="exercise-input"
          />
          <p v-else class="content-text">{{ ex.question }}</p>
          <div class="answer-row">
            <span class="answer-label">参考答案：</span>
            <el-input
              v-if="editMode"
              v-model="ex.answer"
              size="small"
              placeholder="答案"
              class="answer-input"
            />
            <span v-else class="answer-text">{{ ex.answer }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Edit, Download, Refresh, Notebook, EditPen, List, Printer, ArrowLeft } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { defaultCourseware } from '@/data/mockCourseware.js'

const route = useRoute()
const router = useRouter()
const fromDiagnose = computed(() => route.query.from === 'diagnose')
const hasDiagnosisData = computed(() => !!diagnosisData && (diagnosisData.weakPoints?.length > 0 || Object.keys(diagnosisData.radarScores || {}).length > 0))
const editMode = ref(false)
const pptGenerating = ref(false)
const pdfGenerating = ref(false)
const pdfCleanupTimers = ref([])

const courseware = reactive({
  title: '',
  grade: '',
  unit: '',
  example: { question: '', analysis: '' },
  exercises: [],
})

let exerciseId = 10
let diagnosisData = null

function goBack() {
  router.push('/diagnose')
}

function loadDiagnosisData() {
  try {
    const raw = localStorage.getItem('diagnosisData')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Date.now() - parsed.timestamp < 3600000) {
        return parsed
      }
    }
  } catch {}
  return null
}

function buildCoursewareFromDiagnosis(data) {
  const weakPoints = data.weakPoints || []
  const scores = data.radarScores || {}

  const dimLabels = {
    '计算': '计算能力',
    '应用题': '应用题分析',
    '几何': '几何思维',
    '逻辑': '逻辑推理',
    '规律': '规律识别',
  }

  const sorted = [...weakPoints].sort((a, b) => (a.score || 0) - (b.score || 0))
  const lowestDims = Object.entries(scores)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([k]) => dimLabels[k] || k)
    .join('、')

  return {
    title: `针对性训练 · ${lowestDims || '综合提升'}`,
    grade: data.grade || '',
    unit: `基于学情诊断的定制训练`,
    example: {
      question: sorted[0]
        ? `知识点：${sorted[0].name}（掌握度：${sorted[0].score}分）\n请结合该知识点完成一道典型题目，关注：${sorted[0].suggestion || ''}`
        : '根据诊断结果生成针对性例题',
      analysis: sorted[0]
        ? `聚焦「${sorted[0].name}」，通过讲练结合的方式，帮助学生建立完整的解题思路。\n${sorted[0].suggestion || ''}`
        : '请根据实际情况编写解析',
    },
    exercises: sorted.slice(0, 5).map((wp, i) => ({
      id: i + 1,
      question: `【${wp.dimension || '综合'}·${wp.name}】请完成针对「${wp.name}」的练习题`,
      answer: `参考思路：${wp.suggestion || '逐步分析，规范作答'}`,
    })),
  }
}

function loadCourseware() {
  diagnosisData = null
  if (fromDiagnose.value) {
    diagnosisData = loadDiagnosisData()
  }

  if (diagnosisData) {
    const data = buildCoursewareFromDiagnosis(diagnosisData)
    Object.assign(courseware, data)
    exerciseId = Math.max(...data.exercises.map((e) => e.id), 0) + 1
  } else {
    const data = JSON.parse(JSON.stringify(defaultCourseware))
    if (fromDiagnose.value) {
      data.title = '【针对性】' + data.title
    }
    Object.assign(courseware, data)
    exerciseId = Math.max(...data.exercises.map((e) => e.id), 0) + 1
  }
}

function resetCourseware() {
  loadCourseware()
  editMode.value = false
  ElMessage.info('已恢复默认课件')
}

function addExercise() {
  courseware.exercises.push({
    id: exerciseId++,
    question: '请输入题目内容',
    answer: '请输入答案',
  })
}

function removeExercise(index) {
  if (courseware.exercises.length <= 1) {
    ElMessage.warning('至少保留一道练习题')
    return
  }
  courseware.exercises.splice(index, 1)
}

async function downloadPPT() {
  pptGenerating.value = true
  ElMessage.info('正在生成 PPT（调用模板引擎）...')
  try {
    const data = diagnosisData || {
      studentName: '',
      subject: courseware.grade || '学科',
      teacherName: '',
      radarScores: {},
      weakPoints: [],
      summary: '',
      communicationScript: {},
    }

    const resp = await fetch(`/api/generate-ppt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        title: `${data.subject || '学科'} · 定制化学情分析/学习方案`,
      }),
    })

    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}))
      throw new Error(errData.error || `HTTP ${resp.status}`)
    }

    const blob = await resp.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `学习方案_${data.studentName || '学生'}.pptx`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('PPT 已下载')
  } catch (error) {
    console.error('PPT 生成失败:', error)
    ElMessage.error(`PPT 生成失败：${error.message}`)
  } finally {
    pptGenerating.value = false
  }
}

async function downloadPDF() {
  pdfGenerating.value = true
  ElMessage.info('正在生成 PDF（含学情分析 + 学习方案）...')

  try {
    const data = diagnosisData || {
      radarScores: {},
      weakPoints: [],
      summary: '',
      studentName: '',
      teacherName: '',
      communicationScript: {},
    }

    const student = data.studentName || '同学'
    const teacher = data.teacherName || '老师'
    const scores = data.radarScores || {}
    const points = data.weakPoints || []
    const sorted = [...points].sort((a, b) => (a.score || 0) - (b.score || 0))
    const script = data.communicationScript || {}
    const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

    const scoresBars = Object.entries(scores).map(([dim, score]) => {
      const color = score >= 70 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444'
      return `<tr><td class="dim-label">${dim}</td>
        <td class="dim-bar"><div class="bar-track"><div class="bar-fill" style="width:${Math.max(score,5)}%;background:${color};"></div></div></td>
        <td class="dim-score">${score}分</td></tr>`
    }).join('')

    const weakCards = sorted.slice(0, 8).map((wp, i) => {
      const sc = wp.score || 0
      const barColor = sc < 50 ? '#ef4444' : '#f97316'
      return `<div class="wp-card">
        <div class="wp-bar" style="width:${Math.max(sc,5)}%;background:${barColor};"></div>
        <div class="wp-num">${i + 1}</div>
        <div class="wp-body">
          <p class="wp-name">${wp.name}</p>
          <p class="wp-meta">[${wp.dimension}] 掌握度：${sc}分</p>
          <p class="wp-sug">${wp.suggestion}</p>
        </div>
      </div>`
    }).join('')

    // 沟通话术
    const scriptSections = [
      { label: '本阶段应掌握的知识', key: 'stageKnowledge', color: '#6366f1' },
      { label: '已掌握的部分', key: 'mastered', color: '#10b981' },
      { label: '有待提升', key: 'weaknesses', color: '#f97316' },
      { label: '解决建议', key: 'solutions', color: '#3b82f6' },
      { label: '沟通要点', key: 'talkingTips', color: '#6b7280' },
    ]
    const hasScript = Object.values(script).some(v => v && v.trim())
    const scriptCards = scriptSections.filter(s => script[s.key]).map(s => 
      `<div class="script-block">
        <h3 style="color:${s.color};margin:0 0 8px;">${s.label}</h3>
        <p>${script[s.key]}</p>
      </div>`
    ).join('')

    const phases = [
      { name: '第一阶段：开卷熟悉', sub: '识别与应用', goal: '认识题型，知道用什么知识', method: '允许查公式、看笔记，独立思考完成', time: '约 1-2 周', color: '#f97316' },
      { name: '第二阶段：闭卷巩固', sub: '背诵与记忆', goal: '脱离资料，检验记忆，整理公式', method: '限时完成，整理错题和必背公式', time: '约 1 周', color: '#3b82f6' },
      { name: '第三阶段：总复习', sub: '综合与提升', goal: '适应考试节奏，查漏补缺', method: '真题套练，模块复习，错题复盘', time: '剩余时间', color: '#10b981' },
    ]

    const phaseCards = phases.map((ph, i) => `<div class="phase-card">
      <div class="phase-top" style="background:${ph.color};"></div>
      <p class="phase-title" style="color:${ph.color};">${ph.name}</p>
      <p class="phase-sub">${ph.sub}</p>
      <p class="phase-item">🎯 目标：${ph.goal}</p>
      <p class="phase-item">📝 方法：${ph.method}</p>
      <p class="phase-time" style="color:${ph.color};">⏱ ${ph.time}</p>
    </div>`).join('')

    const coursewareTitle = data.title || `${data.subject || '数学'}冲刺学习方案`

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${student} · ${coursewareTitle}</title>
      <style>
        @page { size: A4; margin: 18mm 15mm 20mm 15mm;
          @top-center { content: element(pageHeader); font-size: 9pt; color: #9ca3af; }
          @bottom-center { content: element(pageFooter); font-size: 8pt; color: #9ca3af; }
          @bottom-right { content: counter(page); font-size: 8pt; color: #9ca3af; }
        }
        @page cover { @top-center { content: none; } @bottom-center { content: none; } @bottom-right { content: none; } }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft YaHei', 'PingFang SC', 'Noto Sans SC', sans-serif; color: #1f2937; line-height: 1.7; }
        .page-header { position: running(pageHeader); text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 0; }
        .page-footer { position: running(pageFooter); text-align: center; border-top: 1px solid #e5e7eb; padding-top: 4px; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }

        .cover { page: cover; background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 60px 40px;
          display: flex; flex-direction: column; justify-content: center; min-height: 100vh; text-align: center;
          position: relative; overflow: hidden; }
        .cover::before { content: ''; position: absolute; top: -20%; right: -10%; width: 60%; height: 140%;
          background: linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(59,130,246,0.1) 100%); border-radius: 50%; }
        .cover h1 { font-size: 36px; margin: 0 0 16px; position: relative; z-index: 1; }
        .cover .sub { font-size: 15px; color: #d1d5db; margin: 8px 0; position: relative; z-index: 1; }
        .cover .student-name { font-size: 48px; font-weight: 700; color: #f97316; margin: 20px 0; position: relative; z-index: 1; }

        h2 { font-size: 22px; color: #1e293b; border-left: 4px solid #f97316; padding-left: 12px; margin: 0 0 16px; }
        h3 { font-size: 16px; color: #1e293b; margin: 14px 0 8px; }
        .meta { color: #6b7280; font-size: 13px; margin: 0 0 20px; }
        .section-subtitle { color: #f97316; font-size: 13px; margin: -12px 0 16px; }

        /* 学情诊断表格 */
        .score-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .score-table td { padding: 8px 0; }
        .dim-label { width: 80px; font-weight: 700; font-size: 14px; color: #1e293b; }
        .dim-bar { width: auto; }
        .bar-track { background: #f3f4f6; border-radius: 6px; height: 22px; overflow: hidden; }
        .bar-fill { height: 22px; border-radius: 6px; transition: width 0.3s; }
        .dim-score { width: 50px; text-align: right; color: #6b7280; font-size: 13px; }

        /* 薄弱知识点卡片 */
        .wp-card { position: relative; margin-bottom: 14px; padding: 16px 16px 16px 56px; background: #fff;
          border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .wp-bar { position: absolute; top: 0; left: 0; height: 4px; border-radius: 0 0 2px 0; }
        .wp-num { position: absolute; left: 14px; top: 16px; width: 28px; height: 28px; border-radius: 50%;
          background: #fef3c7; color: #f97316; display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; }
        .wp-body { margin-left: 0; }
        .wp-name { font-weight: 700; font-size: 15px; color: #1e293b; margin: 0 0 4px; }
        .wp-meta { font-size: 12px; color: #6b7280; margin: 0 0 8px; }
        .wp-sug { font-size: 13px; color: #4b5563; line-height: 1.6; margin: 0; }

        /* 三阶段卡片 */
        .phase-grid { display: flex; gap: 12px; margin: 16px 0; }
        .phase-card { flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
        .phase-top { height: 5px; }
        .phase-title { font-size: 15px; font-weight: 700; margin: 12px 12px 4px; }
        .phase-sub { font-size: 11px; color: #6b7280; margin: 0 12px 10px; }
        .phase-item { font-size: 12px; color: #4b5563; margin: 4px 12px; line-height: 1.5; }
        .phase-time { font-size: 14px; font-weight: 700; margin: 10px 12px 14px; }

        /* 沟通话术 */
        .script-block { margin-bottom: 14px; padding: 16px; background: #f9fafb; border-left: 3px solid #e5e7eb; border-radius: 0 6px 6px 0; }
        .script-block p { font-size: 13px; line-height: 1.8; color: #4b5563; margin: 0; }

        /* 概览卡片 */
        .overview-cards { display: flex; gap: 12px; margin: 16px 0; }
        .ov-card { flex: 1; text-align: center; padding: 14px; border-radius: 8px; }
        .ov-card p:first-child { font-weight: 700; font-size: 14px; color: #1e293b; margin: 0 0 4px; }
        .ov-card p:last-child { font-size: 12px; color: #6b7280; margin: 0; }

        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-header, .page-footer { display: block; }
        }
      </style></head><body>

    <div class="page-header">${student} · 定制化学情分析/学习方案  |  教师：${teacher}  |  ${today}</div>
    <div class="page-footer">AI备课助手 · 自动生成  |  ${today}</div>

    <!-- 封面 -->
    <div class="page cover">
      <h1>${(data.subject || '数学')} · 定制化学情分析 / 学习方案</h1>
      <div class="student-name">${student}</div>
      <p class="sub">教师：${teacher}</p>
      <p class="sub">${today}</p>
    </div>

    <!-- 学情诊断 -->
    <div class="page">
      <h2>一、学情诊断结果</h2>
      <p class="section-subtitle">根据${student}近期作业/试卷分析 · 明确薄弱方向</p>
      <table class="score-table">${scoresBars || '<tr><td colspan="3" style="color:#6b7280;">暂无数据</td></tr>'}</table>
      ${data.summary ? `<p style="font-size:14px;color:#6b7280;margin-top:20px;padding:12px;background:#f9fafb;border-radius:6px;">📊 ${data.summary}</p>` : ''}
    </div>

    <!-- 薄弱知识点 -->
    <div class="page">
      <h2>二、薄弱知识点分析</h2>
      <p class="section-subtitle">聚焦问题，精准提分</p>
      ${weakCards || '<p style="color:#6b7280;">请先完成学情诊断</p>'}
    </div>

    <!-- 三阶段学习方案 -->
    <div class="page">
      <h2>三、学习方案：三阶段冲刺计划</h2>
      <p class="section-subtitle">从开卷到闭卷，从模块到综合</p>
      <div class="overview-cards">
        <div class="ov-card" style="background:#fff7ed;border:1px solid #fed7aa;"><p>循序渐进</p><p>从开卷到闭卷</p></div>
        <div class="ov-card" style="background:#eff6ff;border:1px solid #bfdbfe;"><p>每周频次</p><p>3-5节，每节1-2h</p></div>
        <div class="ov-card" style="background:#ecfdf5;border:1px solid #a7f3d0;"><p>核心方法</p><p>真题导向，反复练习</p></div>
      </div>
      <div class="phase-grid">${phaseCards}</div>
    </div>

    ${hasScript ? `
    <!-- 家长沟通话术 -->
    <div class="page">
      <h2>四、家长沟通话术</h2>
      <p class="section-subtitle">可直接口述给家长的专业沟通脚本</p>
      ${scriptCards}
    </div>` : ''}

    <!-- 结尾 -->
    <div class="page" style="text-align:center;padding:80px 40px 0;">
      <div style="max-width:500px;margin:0 auto;">
        <h2 style="border:none;text-align:center;font-size:28px;">你的坚持，终将美好</h2>
        <p style="color:#6b7280;font-size:15px;margin:8px 0 20px;">Your Persistence Will Pay Off</p>
        <p style="color:#c2410c;font-weight:700;font-size:16px;margin:24px 0;">"我们的目标不是成为天才，<br>而是成为一个高效的得分手。"</p>
        <div style="display:flex;gap:16px;justify-content:center;margin-top:40px;">
          <div style="padding:14px 24px;background:#fff7ed;border-radius:8px;border:1px solid #fed7aa;">
            <p style="font-weight:700;margin:0;">相信自己</p>
            <p style="font-size:11px;color:#6b7280;margin:4px 0 0;">你比想象中更强大</p>
          </div>
          <div style="padding:14px 24px;background:#eff6ff;border-radius:8px;border:1px solid #bfdbfe;">
            <p style="font-weight:700;margin:0;">紧跟计划</p>
            <p style="font-size:11px;color:#6b7280;margin:4px 0 0;">每一步都算数</p>
          </div>
          <div style="padding:14px 24px;background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
            <p style="font-weight:700;margin:0;">永不言弃</p>
            <p style="font-size:11px;color:#6b7280;margin:4px 0 0;">坚持到最后一刻</p>
          </div>
        </div>
      </div>
    </div>

    </body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      const checkLoaded = setInterval(() => {
        try {
          if (win.document.readyState === 'complete') {
            clearInterval(checkLoaded)
            const printTimer = setTimeout(() => {
              win.print()
              URL.revokeObjectURL(url)
            }, 500)
            pdfCleanupTimers.value.push(printTimer)
          }
        } catch {}
      }, 200)
      const fallbackTimer = setTimeout(() => { clearInterval(checkLoaded) }, 15000)
      pdfCleanupTimers.value.push(checkLoaded, fallbackTimer)
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `学习方案_${student}.html`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.warning('弹窗被浏览器拦截，已下载 HTML 文件。请在浏览器中打开后 Ctrl+P 打印为 PDF')
    }
    pdfGenerating.value = false
  } catch (error) {
    console.error('PDF 生成失败:', error)
    ElMessage.error('PDF 生成失败，请重试')
    pdfGenerating.value = false
  }
}

onMounted(() => {
  loadCourseware()
})

onUnmounted(() => {
  pdfCleanupTimers.value.forEach(timer => {
    try { clearInterval(timer) } catch {}
    try { clearTimeout(timer) } catch {}
  })
  pdfCleanupTimers.value = []
})
</script>

<style scoped>
/* 顶部栏 */
.page-top-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.page-top-bar .back-btn {
  flex-shrink: 0;
}

.page-top-bar .page-title {
  margin-bottom: 0;
}

.diagnose-alert {
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.preview-header {
  margin-bottom: 8px;
}

.preview-title,
.title-input {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
}

.title-input :deep(.el-input__wrapper) {
  font-size: 20px;
}

.meta-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.preview-block {
  margin-bottom: 28px;
}

.preview-block h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  color: var(--primary);
  margin-bottom: 16px;
}

.content-text {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
}

.analysis {
  background: var(--primary-light);
  padding: 16px;
  border-radius: 8px;
  font-family: inherit;
}

.exercise-item {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #ebeef5;
}

.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.exercise-num {
  font-weight: 600;
  color: var(--primary);
}

.exercise-input {
  margin-bottom: 12px;
}

.answer-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 14px;
}

.answer-label {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.answer-text {
  color: #67c23a;
  font-weight: 500;
}

.answer-input {
  max-width: 400px;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
  }

  .toolbar .el-button {
    width: 100%;
  }
}
</style>
