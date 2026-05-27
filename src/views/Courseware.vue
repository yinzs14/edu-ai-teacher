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
      <el-button type="success" :icon="Download" @click="downloadCourseware">下载课件</el-button>
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
import { Edit, Download, Refresh, Notebook, EditPen, List } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { defaultCourseware } from '@/data/mockCourseware.js'

const route = useRoute()
const fromDiagnose = computed(() => route.query.from === 'diagnose')
const editMode = ref(false)

const courseware = reactive({
  title: '',
  grade: '',
  unit: '',
  example: { question: '', analysis: '' },
  exercises: [],
})

let exerciseId = 10

function loadCourseware() {
  const data = JSON.parse(JSON.stringify(defaultCourseware))
  if (fromDiagnose.value) {
    data.title = '【针对性】' + data.title
  }
  Object.assign(courseware, data)
  exerciseId = Math.max(...data.exercises.map((e) => e.id), 0) + 1
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

function downloadCourseware() {
  const lines = [
    courseware.title,
    `年级：${courseware.grade}`,
    `单元：${courseware.unit}`,
    '',
    '【例题】',
    courseware.example.question,
    '',
    '【解析】',
    courseware.example.analysis,
    '',
    '【练习题】',
    ...courseware.exercises.map(
      (ex, i) => `${i + 1}. ${ex.question}\n   答案：${ex.answer}`
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${courseware.title.replace(/[\\/:*?"<>|]/g, '_')}.txt`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('课件已下载为文本文件')
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
