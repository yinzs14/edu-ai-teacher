<template>
  <div class="page-container courseware-page">
    <h1 class="page-title">课件生成</h1>
    <p class="page-subtitle">
      {{ fromDiagnose ? '已根据学情诊断结果生成针对性课件（模拟）' : '预览、编辑并下载智能生成的课件' }}
    </p>

    <el-alert
      v-if="fromDiagnose"
      type="success"
      :closable="false"
      show-icon
      class="diagnose-alert"
      title="已从学情诊断页导入薄弱知识点，课件内容已做针对性调整"
    />

    <div class="toolbar card-section">
      <el-button type="primary" :icon="Edit" @click="editMode = !editMode">
        {{ editMode ? '完成编辑' : '编辑课件' }}
      </el-button>
      <el-button :icon="Refresh" @click="resetCourseware">重置</el-button>
      <el-button type="success" :icon="Download" :loading="pptGenerating" @click="downloadPPT">
        下载 PPT
      </el-button>
      <el-button type="warning" :icon="Printer" :loading="pdfGenerating" @click="downloadPDF">
        下载 PDF
      </el-button>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Edit, Download, Refresh, Notebook, EditPen, List, Printer } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { defaultCourseware } from '@/data/mockCourseware.js'

const route = useRoute()
const fromDiagnose = computed(() => route.query.from === 'diagnose')
const editMode = ref(false)
const pptGenerating = ref(false)
const pdfGenerating = ref(false)

const courseware = reactive({
  title: '',
  grade: '',
  unit: '',
  example: { question: '', analysis: '' },
  exercises: [],
})

let exerciseId = 10
let diagnosisData = null

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
    const apiHost = window.location.hostname === 'localhost' ? '/api' : '/api'
    const data = diagnosisData || {
      studentName: '',
      subject: '数学',
      teacherName: '',
      radarScores: {},
      weakPoints: [],
      summary: '',
      communicationScript: {},
    }

    const resp = await fetch(`${apiHost}/generate-ppt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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
  ElMessage.info('正在生成 PDF...')

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

    const scoresBars = Object.entries(scores).map(([dim, score]) => {
      const color = score >= 70 ? '#10b981' : score >= 50 ? '#f97316' : '#ef4444'
      return `<div style="margin-bottom:10px;display:flex;align-items:center;gap:10px;">
        <span style="width:80px;font-weight:700;color:#1f2937;font-size:14px;">${dim}</span>
        <div style="flex:1;background:#f3f4f6;border-radius:6px;height:22px;"><div style="width:${Math.max(score,5)}%;background:${color};height:22px;border-radius:6px;"></div></div>
        <span style="width:40px;color:#6b7280;font-size:13px;text-align:right;">${score}分</span>
      </div>`
    }).join('')

    const weakCards = sorted.slice(0, 6).map(wp => {
      const sc = wp.score || 0
      const barColor = sc < 50 ? '#ef4444' : '#f97316'
      return `<div style="margin-bottom:16px;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;position:relative;overflow:hidden;">
        <div style="position:absolute;top:0;left:0;width:${Math.max(sc,5)}%;height:4px;background:${barColor};"></div>
        <p style="font-weight:700;font-size:15px;color:#1f2937;margin:8px 0 4px;">${wp.name}</p>
        <p style="font-size:12px;color:#6b7280;margin:0 0 8px;">[${wp.dimension}] 掌握度：${sc}分</p>
        <p style="font-size:13px;color:#4b5563;margin:0;line-height:1.6;">${wp.suggestion}</p>
      </div>`
    }).join('')

    const phases = [
      { name: '第一阶段：开卷熟悉', sub: '识别与应用', goal: '认识题型，知道用什么知识', method: '允许查公式、看笔记，独立思考完成', time: '约 1-2 周', color: '#f97316' },
      { name: '第二阶段：闭卷巩固', sub: '背诵与记忆', goal: '脱离资料，检验记忆，整理公式', method: '限时完成，整理错题和必背公式', time: '约 1 周', color: '#3b82f6' },
      { name: '第三阶段：总复习', sub: '综合与提升', goal: '适应考试节奏，查漏补缺', method: '真题套练，模块复习，错题复盘', time: '剩余时间', color: '#10b981' },
    ]

    const phaseCards = phases.map((ph, i) => `<div style="margin-bottom:16px;padding:20px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;position:relative;">
      <div style="position:absolute;top:0;left:0;width:100%;height:5px;background:${ph.color};border-radius:8px 8px 0 0;"></div>
      <p style="font-size:18px;font-weight:700;color:${ph.color};margin:12px 0 4px;">${ph.name}</p>
      <p style="font-size:12px;color:#6b7280;margin:0 0 12px;">${ph.sub}</p>
      <p style="font-size:13px;color:#4b5563;margin:4px 0;">🎯 目标：${ph.goal}</p>
      <p style="font-size:13px;color:#4b5563;margin:4px 0;">📝 方法：${ph.method}</p>
      <p style="font-size:14px;font-weight:700;color:${ph.color};margin:8px 0 0;">⏱ ${ph.time}</p>
    </div>`).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${student}学习方案</title>
      <style>
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif; color: #1f2937; max-width: 1000px; margin: 0 auto; padding: 20px; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .cover { background: #1f2937; color: white; padding: 60px 40px; text-align: center; border-radius: 4px; margin-bottom: 30px; }
        .cover h1 { font-size: 36px; margin: 0 0 16px; }
        .cover .sub { font-size: 16px; color: #d1d5db; margin: 8px 0; }
        h2 { font-size: 24px; color: #1f2937; border-left: 4px solid #f97316; padding-left: 12px; margin: 30px 0 16px; }
        h3 { font-size: 18px; color: #f97316; margin: 16px 0 8px; }
        .meta { color: #6b7280; font-size: 13px; margin: 0 0 20px; }
        @media print { body { padding: 0; } }
      </style></head><body>

      <div class="page">
        <div class="cover">
          <h1>${data.subject || '数学'}冲刺学习计划</h1>
          <p class="sub">授课教师：${teacher}</p>
          <p class="sub">${new Date().toLocaleDateString('zh-CN')}</p>
          <p class="sub">学生：${student}</p>
        </div>

        <h2>学情诊断结果</h2>
        <p class="meta">根据${student}近期作业分析，明确薄弱方向</p>
        ${scoresBars || '<p style="color:#6b7280;">暂无数据</p>'}
        ${data.summary ? `<p style="font-size:14px;color:#6b7280;margin-top:16px;">📊 ${data.summary}</p>` : ''}
      </div>

      <div class="page">
        <h2>薄弱知识点分析</h2>
        <p class="meta">聚焦问题，精准提分</p>
        ${weakCards || '<p style="color:#6b7280;">请先完成学情诊断</p>'}
      </div>

      <div class="page">
        <h2>备课方案：三阶段冲刺计划</h2>
        <p class="meta">从开卷到闭卷，从模块到综合</p>
        <div style="display:flex;gap:12px;margin-top:16px;">
          <div style="flex:1;padding:12px;background:#fff7ed;border-radius:8px;text-align:center;border:1px solid #fed7aa;"><p style="font-weight:700;color:#1f2937;">循序渐进</p><p style="font-size:12px;color:#6b7280;">从开卷到闭卷</p></div>
          <div style="flex:1;padding:12px;background:#eff6ff;border-radius:8px;text-align:center;border:1px solid #bfdbfe;"><p style="font-weight:700;color:#1f2937;">每周频次</p><p style="font-size:12px;color:#6b7280;">3-5节，每节1-2h</p></div>
          <div style="flex:1;padding:12px;background:#ecfdf5;border-radius:8px;text-align:center;border:1px solid #a7f3d0;"><p style="font-weight:700;color:#1f2937;">核心方法</p><p style="font-size:12px;color:#6b7280;">真题导向，反复练习</p></div>
        </div>
        ${phaseCards}
      </div>

      <div class="page">
        <h2>例题与练习</h2>
        <p class="meta">${courseware.grade} | ${courseware.unit}</p>
        <h3>📖 例题</h3>
        <p style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px;">${courseware.example.question}</p>
        <h3>📝 解析</h3>
        <p style="background:#ecf5ff;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:14px;">${courseware.example.analysis}</p>
        <h3>✏️ 练习题</h3>
        ${courseware.exercises.map((ex, i) => `<div style="margin-bottom:12px;padding:14px;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;">
          <p style="font-weight:700;color:#2563eb;margin:0 0 6px;">第 ${i + 1} 题</p>
          <p style="margin:0 0 8px;font-size:14px;">${ex.question}</p>
          <p style="color:#059669;margin:0;font-size:13px;">💡 ${ex.answer}</p>
        </div>`).join('')}
      </div>

      <div class="page" style="text-align:center;padding:80px 40px;">
        <h2 style="border:none;text-align:center;font-size:32px;">你的坚持，终将美好</h2>
        <p style="color:#6b7280;font-size:16px;">Your Persistence Will Pay Off</p>
        <p style="color:#c2410c;font-weight:700;font-size:18px;margin:30px 0;">"我们的目标不是成为天才，而是成为一个高效的得分手。"</p>
        <div style="display:flex;gap:20px;justify-content:center;margin-top:40px;">
          <div style="padding:16px 32px;background:#fff7ed;border-radius:8px;">相信自己<br><span style="font-size:12px;color:#6b7280;">你比想象中更强大</span></div>
          <div style="padding:16px 32px;background:#eff6ff;border-radius:8px;">紧跟计划<br><span style="font-size:12px;color:#6b7280;">每一步都算数</span></div>
          <div style="padding:16px 32px;background:#ecfdf5;border-radius:8px;">永不言弃<br><span style="font-size:12px;color:#6b7280;">坚持到最后一刻</span></div>
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
            win.print()
            URL.revokeObjectURL(url)
          }
        } catch {}
      }, 200)
      setTimeout(() => { clearInterval(checkLoaded) }, 10000)
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `学习方案_${student}.html`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('HTML 已下载，在浏览器打开后 Ctrl+P 打印为 PDF')
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
</script>

<style scoped>
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
