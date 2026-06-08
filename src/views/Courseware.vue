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
import { generatePPT } from '@/utils/generatePPT.js'

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
  ElMessage.info('正在生成 PPT...')
  try {
    const data = {
      studentName: '',
      subject: '数学',
      teacherName: '',
      date: new Date().toLocaleDateString('zh-CN'),
      radarScores: diagnosisData?.radarScores || {},
      weakPoints: diagnosisData?.weakPoints || [],
      summary: diagnosisData ? '基于学情诊断生成的个性化学习方案' : '',
      grade: diagnosisData?.grade || courseware.grade,
    }
    const pptx = generatePPT(data)
    await pptx.writeFile({ fileName: `${courseware.title.replace(/[\\/:*?"<>|]/g, '_')}.pptx` })
    ElMessage.success('PPT 已下载')
  } catch (error) {
    console.error('PPT 生成失败:', error)
    ElMessage.error('PPT 生成失败，请重试')
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
    }

    const weakPointsHTML = (data.weakPoints || []).map(wp => `
      <div style="margin-bottom:16px;padding:12px;background:#fef0f0;border-left:3px solid #dc2626;border-radius:4px;">
        <p style="font-weight:bold;margin:0 0 4px;">${wp.name} <span style="color:#6b7280;font-weight:normal;">[${wp.dimension}] 掌握度：${wp.score}分</span></p>
        <p style="margin:0;color:#374151;">${wp.suggestion}</p>
      </div>
    `).join('')

    const scoresHTML = Object.entries(data.radarScores || {}).map(([dim, score]) => {
      const color = score >= 70 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626'
      return `<div style="margin-bottom:8px;">
        <span style="display:inline-block;width:100px;font-weight:bold;">${dim}</span>
        <span style="display:inline-block;width:${Math.max(score, 5)}%;background:${color};height:20px;border-radius:4px;vertical-align:middle;"></span>
        <span style="margin-left:8px;color:#6b7280;">${score}分</span>
      </div>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 28px; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 12px; }
        h2 { font-size: 20px; color: #1d4ed8; margin-top: 32px; }
        .date { color: #6b7280; font-size: 14px; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>${courseware.title}</h1>
      <p class="date">生成日期：${new Date().toLocaleDateString('zh-CN')} | ${courseware.grade} | ${courseware.unit}</p>
      <h2>学情雷达图</h2>
      ${scoresHTML || '<p>暂无数据</p>'}
      <h2>薄弱知识点</h2>
      ${weakPointsHTML || '<p>暂无薄弱知识点数据</p>'}
      <h2>例题</h2>
      <p style="background:#f3f4f6;padding:16px;border-radius:8px;white-space:pre-wrap;">${courseware.example.question}</p>
      <h2>解析</h2>
      <p style="background:#ecf5ff;padding:16px;border-radius:8px;white-space:pre-wrap;">${courseware.example.analysis}</p>
      <h2>练习题</h2>
      ${courseware.exercises.map((ex, i) => `
        <div style="margin-bottom:16px;padding:16px;background:#fafafa;border:1px solid #e5e7eb;border-radius:8px;">
          <p style="font-weight:bold;color:#2563eb;">第 ${i + 1} 题</p>
          <p>${ex.question}</p>
          <p style="color:#059669;">参考答案：${ex.answer}</p>
        </div>
      `).join('')}
    </body></html>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const win = window.open(url, '_blank')
    if (win) {
      win.onload = () => {
        win.print()
        URL.revokeObjectURL(url)
      }
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = `${courseware.title.replace(/[\\/:*?"<>|]/g, '_')}.html`
      a.click()
      URL.revokeObjectURL(url)
      ElMessage.success('HTML 已下载，请在浏览器中打开后按 Ctrl+P 打印为 PDF')
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
