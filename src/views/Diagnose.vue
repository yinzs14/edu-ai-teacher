<template>
  <div class="page-container diagnose-page">
    <h1 class="page-title">学情诊断</h1>
    <p class="page-subtitle">上传学生作业或试卷照片，AI 将分析五维学情并标注薄弱知识点</p>

    <el-row :gutter="24">
      <el-col :xs="24" :md="10">
        <div class="card-section upload-section">
          <h3 class="card-title">
            <el-icon><Upload /></el-icon>
            上传作业图片
          </h3>

          <el-upload
            class="upload-dragger"
            drag
            :auto-upload="false"
            accept="image/*"
            :show-file-list="true"
            :on-change="handleUpload"
            :file-list="fileList"
            multiple
          >
            <div class="upload-placeholder">
              <el-icon class="upload-icon" :size="64"><UploadFilled /></el-icon>
              <p class="upload-text">将图片拖到此处，或<em>点击上传</em></p>
              <p class="upload-hint">支持 JPG、PNG 格式，单张不超过 10MB，可上传多张</p>
            </div>
          </el-upload>

          <div v-if="fileList.length > 0" class="image-preview-section">
            <h4 class="edit-title">📷 上传的作业图片</h4>
            <p class="edit-tip">请查看图片，在下方输入或编辑错题内容</p>
            <div class="preview-grid">
              <div v-for="(item, index) in fileList" :key="index" class="preview-item">
                <img :src="getPreviewUrl(item.raw)" alt="作业预览" class="preview-img" />
                <el-button type="danger" size="small" plain @click="removeFile(index)" class="remove-img-btn">
                  移除
                </el-button>
              </div>
            </div>
          </div>

          <div v-if="ocrText !== null" class="ocr-edit-section">
            <h4 class="edit-title">📝 错题内容（请编辑或输入）</h4>
            <p class="edit-tip">OCR 已自动识别参考文本，老师可删除对的题目、修改错字，或直接输入错题内容</p>
            <el-input
              v-model="ocrText"
              type="textarea"
              :rows="10"
              resize="vertical"
              placeholder="请在此输入或编辑错题内容。可以删除做对的题目，只保留需要分析的错题..."
            />
          </div>

          <el-button
            type="primary"
            class="analyze-btn"
            :loading="analyzing"
            :disabled="fileList.length === 0 && ocrText === null"
            @click="runAnalyze"
          >
            {{ ocrText !== null ? '分析错题' : '识别文字' }}
          </el-button>
        </div>
      </el-col>

      <el-col :xs="24" :md="14">
        <div class="card-section">
          <h3 class="card-title">
            <el-icon><DataAnalysis /></el-icon>
            学情雷达图
          </h3>
          <div ref="chartRef" class="radar-chart"></div>
          <p v-if="!analyzed" class="chart-tip">上传图片并点击「开始 AI 诊断」后显示结果</p>
        </div>

        <div class="card-section">
          <h3 class="card-title">
            <el-icon><Warning /></el-icon>
            薄弱知识点
            <el-tag v-if="analyzed" type="danger" size="small" class="weak-count">
              {{ weakPoints.length }} 项
            </el-tag>
          </h3>

          <el-empty v-if="!analyzed" description="暂无诊断结果" />
          <div v-else class="weak-list">
            <div v-for="item in weakPoints" :key="item.id" class="weak-item">
              <div class="weak-header">
                <span class="weak-name">{{ item.name }}</span>
                <el-tag size="small" type="info">{{ item.dimension }}</el-tag>
                <el-progress
                  :percentage="item.score"
                  :color="getScoreColor(item.score)"
                  :stroke-width="8"
                  class="weak-progress"
                />
              </div>
              <p class="weak-suggestion">{{ item.suggestion }}</p>
            </div>
          </div>

          <div v-if="analyzed" class="action-row">
            <el-button type="primary" @click="goCourseware">
              根据诊断生成课件
            </el-button>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, shallowRef, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Upload, UploadFilled, DataAnalysis, Warning } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const radarDimensions = ['计算', '应用题', '几何', '逻辑', '规律']

const router = useRouter()
const chartRef = ref(null)
const chartInstance = shallowRef(null)
const fileList = ref([])
const previewUrls = ref([])
const ocrText = ref(null)
const analyzing = ref(false)
const analyzed = ref(false)
const radarScores = ref([0, 0, 0, 0, 0])
const weakPoints = ref([])

function getPreviewUrl(file) {
  return URL.createObjectURL(file)
}

function getScoreColor(score) {
  if (score >= 70) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

function initChart() {
  if (!chartRef.value) return
  chartInstance.value = echarts.init(chartRef.value)
  updateChart()
  window.addEventListener('resize', handleResize)
}

function updateChart() {
  if (!chartInstance.value) return
  chartInstance.value.setOption({
    color: ['#409EFF'],
    tooltip: {},
    radar: {
      indicator: radarDimensions.map((name) => ({ name, max: 100 })),
      radius: '65%',
      splitArea: {
        areaStyle: {
          color: ['rgba(64, 158, 255, 0.05)', 'rgba(64, 158, 255, 0.1)'],
        },
      },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      splitLine: { lineStyle: { color: '#dcdfe6' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: analyzed.value ? radarScores.value : [0, 0, 0, 0, 0],
            name: '学情得分',
            areaStyle: { color: 'rgba(64, 158, 255, 0.35)' },
            lineStyle: { width: 2 },
          },
        ],
      },
    ],
  })
}

function handleResize() {
  chartInstance.value?.resize()
}

function handleUpload(file) {
  const raw = file.raw
  if (!raw?.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return
  }
  fileList.value.push({ name: raw.name, raw })
  ocrText.value = null
  analyzed.value = false
}

function removeFile(index) {
  const removed = fileList.value.splice(index, 1)
  if (removed[0]?.raw) {
    URL.revokeObjectURL(getPreviewUrl(removed[0].raw))
  }
  if (fileList.value.length === 0) {
    ocrText.value = null
    analyzed.value = false
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function runOcrForAllImages() {
  const texts = []
  for (const item of fileList.value) {
    const base64 = await fileToBase64(item.raw)
    const ocrRes = await fetch('/.netlify/functions/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    })
    const ocrData = await ocrRes.json()

    if (ocrData.success && ocrData.data?.text) {
      texts.push(ocrData.data.text)
    } else {
      console.warn(`图片 ${item.name} OCR 失败:`, ocrData.error)
    }
  }
  return texts.join('\n\n')
}

async function runAnalyze() {
  analyzing.value = true

  try {
    // 第一步：如果还没有 OCR 文本，先识别所有图片
    if (ocrText.value === null) {
      if (fileList.value.length === 0) {
        ElMessage.warning('请先上传图片')
        analyzing.value = false
        return
      }

      ElMessage.info('正在识别图片文字，请稍候...')
      const combinedText = await runOcrForAllImages()

      if (!combinedText.trim()) {
        throw new Error('OCR 识别结果为空，请检查图片是否包含清晰的文字内容，或尝试上传更清晰的图片')
      }

      ocrText.value = combinedText
      ElMessage.success('文字识别完成！请编辑保留错题，然后点击「分析错题」')
      analyzing.value = false
      return
    }

    // 第二步：分析错题（老师编辑后的文本）
    const textToAnalyze = ocrText.value.trim()
    if (!textToAnalyze) {
      ElMessage.warning('请保留至少一道错题内容')
      analyzing.value = false
      return
    }

    ElMessage.info('正在分析错题，请稍候...')
    const diagnoseRes = await fetch('/.netlify/functions/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: textToAnalyze }),
    })
    const diagnoseData = await diagnoseRes.json()

    if (!diagnoseData.success || !diagnoseData.data) {
      throw new Error(diagnoseData.error || '诊断分析失败')
    }

    const result = diagnoseData.data

    radarScores.value = radarDimensions.map((dim) => {
      const score = result.radarScores?.[dim]
      return typeof score === 'number' ? Math.max(0, Math.min(100, score)) : 50
    })

    weakPoints.value = (result.weakPoints || []).map((item, index) => ({
      id: index + 1,
      name: item.name || '未知知识点',
      dimension: item.dimension || '综合',
      score: typeof item.score === 'number' ? Math.max(0, Math.min(100, item.score)) : 50,
      suggestion: item.suggestion || '建议针对性练习',
    }))

    analyzed.value = true
    updateChart()
    ElMessage.success('学情诊断完成')
  } catch (error) {
    console.error(error)
    ElMessage.error(error.message || '诊断失败，请稍后重试')
  } finally {
    analyzing.value = false
  }
}

function goCourseware() {
  router.push({ path: '/courseware', query: { from: 'diagnose' } })
}

onMounted(() => {
  nextTick(initChart)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance.value?.dispose()
})
</script>

<style scoped>
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.upload-dragger :deep(.el-upload-dragger) {
  width: 100%;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-color: var(--primary);
  background: var(--primary-light);
}

.upload-placeholder {
  padding: 24px;
}

.upload-icon {
  color: var(--primary);
  margin-bottom: 12px;
}

.upload-text {
  font-size: 15px;
  color: var(--text-regular);
}

.upload-text em {
  color: var(--primary);
  font-style: normal;
}

.upload-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.preview-wrap {
  position: relative;
  width: 100%;
  padding: 12px;
}

.preview-img {
  max-width: 100%;
  max-height: 280px;
  border-radius: 8px;
  object-fit: contain;
}

.clear-btn {
  margin-top: 12px;
}

.analyze-btn {
  width: 100%;
  margin-top: 20px;
}

.radar-chart {
  width: 100%;
  height: 360px;
}

.chart-tip {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  margin-top: -20px;
}

.weak-count {
  margin-left: 8px;
}

.weak-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.weak-item {
  padding: 16px;
  background: #fef0f0;
  border-radius: 8px;
  border-left: 4px solid #f56c6c;
}

.weak-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.weak-name {
  font-weight: 600;
  flex: 1;
  min-width: 140px;
}

.weak-progress {
  width: 100%;
  max-width: 200px;
}

.weak-suggestion {
  font-size: 14px;
  color: var(--text-regular);
  line-height: 1.6;
}

.image-preview-section {
  margin-top: 16px;
}

.preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.preview-item {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  padding: 4px;
}

.preview-img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: transform 0.2s;
}

.preview-img:hover {
  transform: scale(1.05);
}

.remove-img-btn {
  margin-top: 4px;
  width: 100%;
}

.ocr-edit-section {
  margin-top: 16px;
}

.edit-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.edit-tip {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.action-row {
  margin-top: 20px;
  text-align: center;
}

@media (max-width: 768px) {
  .radar-chart {
    height: 300px;
  }

  .weak-progress {
    max-width: 100%;
  }

  .preview-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
