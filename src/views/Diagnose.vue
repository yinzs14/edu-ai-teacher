<template>
  <div class="page-container diagnose-page">
    <h1 class="page-title">学情诊断</h1>
    <p class="page-subtitle">上传学生作业，框选错题区域，AI 将分析五维学情并标注薄弱知识点</p>

    <el-row :gutter="24">
      <el-col :xs="24" :md="10">
        <div class="card-section upload-section">
          <h3 class="card-title">
            <el-icon><Upload /></el-icon>
            上传作业图片
          </h3>

          <!-- 迷你上传框 -->
          <el-upload
            class="upload-mini"
            drag
            :auto-upload="false"
            accept="image/*"
            :show-file-list="false"
            :on-change="handleUpload"
          >
            <el-icon class="upload-icon-mini"><UploadFilled /></el-icon>
            <span class="upload-text-mini">点击或拖拽上传图片</span>
          </el-upload>

          <!-- 截图区域 -->
          <div v-if="currentImage" class="screenshot-area">
            <div class="screenshot-hint">
              📷 <strong>请用鼠标框选错题区域</strong> — 只框选你想分析的错题部分即可
            </div>
            <div class="canvas-wrapper" ref="canvasWrapperRef">
              <canvas
                ref="canvasRef"
                class="screenshot-canvas"
                @mousedown="startDraw"
                @mousemove="draw"
                @mouseup="endDraw"
                @mouseleave="endDraw"
              ></canvas>
              <div v-if="selectionBox" class="selection-overlay" :style="selectionStyle">
                <div class="selection-label">
                  已框选区域
                  <el-button type="primary" size="small" @click="recognizeSelection">
                    识别此区域
                  </el-button>
                </div>
              </div>
            </div>
            <div class="screenshot-actions">
              <el-button size="small" @click="clearSelection">
                <el-icon><Delete /></el-icon> 清除框选
              </el-button>
              <el-button type="danger" size="small" @click="removeImage">
                <el-icon><Delete /></el-icon> 移除图片
              </el-button>
            </div>
          </div>

          <!-- 识别结果 -->
          <div v-if="ocrText !== null" class="ocr-result">
            <h4 class="edit-title">📝 识别出的错题内容</h4>
            <p class="edit-tip">如需修改，请直接编辑下方文本</p>
            <el-input
              v-model="ocrText"
              type="textarea"
              :rows="6"
              resize="vertical"
              placeholder="识别出的文本..."
            />
          </div>

          <el-button
            type="primary"
            class="analyze-btn"
            :loading="analyzing"
            :disabled="!ocrText?.trim()"
            @click="runAnalyze"
          >
            分析错题
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
          <p v-if="!analyzed" class="chart-tip">上传图片并框选错题后显示结果</p>
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
import { ref, shallowRef, onMounted, onUnmounted, nextTick, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { Upload, UploadFilled, DataAnalysis, Warning, Delete } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const radarDimensions = ['计算', '应用题', '几何', '逻辑', '规律']

const router = useRouter()
const chartRef = ref(null)
const chartInstance = shallowRef(null)

// 图片和截图
const canvasRef = ref(null)
const canvasWrapperRef = ref(null)
const currentImage = ref(null)
const currentImageFile = ref(null)
const ocrText = ref(null)

// 框选状态
const isDrawing = ref(false)
const startPoint = ref({ x: 0, y: 0 })
const endPoint = ref({ x: 0, y: 0 })
const selectionBox = ref(null)

const analyzing = ref(false)
const analyzed = ref(false)
const radarScores = ref([0, 0, 0, 0, 0])
const weakPoints = ref([])

const selectionStyle = computed(() => {
  if (!selectionBox.value) return {}
  const { x, y, width, height } = selectionBox.value
  return {
    left: x + 'px',
    top: y + 'px',
    width: width + 'px',
    height: height + 'px',
  }
})

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

// 处理上传
function handleUpload(file) {
  const raw = file.raw
  if (!raw?.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return
  }
  currentImageFile.value = raw
  loadImageToCanvas(raw)
  ocrText.value = null
  analyzed.value = false
  selectionBox.value = null
}

function loadImageToCanvas(file) {
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    currentImage.value = img
    const canvas = canvasRef.value
    if (!canvas) return

    const wrapper = canvasWrapperRef.value
    const maxWidth = wrapper.clientWidth - 4
    const scale = maxWidth / img.width
    const canvasWidth = maxWidth
    const canvasHeight = img.height * scale

    canvas.width = canvasWidth
    canvas.height = canvasHeight
    canvas.style.width = canvasWidth + 'px'
    canvas.style.height = canvasHeight + 'px'

    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight)
  }
  img.src = url
}

// 截图交互
function getCanvasCoordinates(e) {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function startDraw(e) {
  isDrawing.value = true
  const coords = getCanvasCoordinates(e)
  startPoint.value = coords
  endPoint.value = coords
  selectionBox.value = null
}

function draw(e) {
  if (!isDrawing.value) return
  const coords = getCanvasCoordinates(e)
  endPoint.value = coords

  const x = Math.min(startPoint.value.x, endPoint.value.x)
  const y = Math.min(startPoint.value.y, endPoint.value.y)
  const width = Math.abs(endPoint.value.x - startPoint.value.x)
  const height = Math.abs(endPoint.value.y - startPoint.value.y)

  selectionBox.value = { x, y, width, height }

  // 重绘画布
  redrawCanvas()
}

function endDraw() {
  isDrawing.value = false
}

function redrawCanvas() {
  const canvas = canvasRef.value
  if (!canvas || !currentImage.value) return
  const ctx = canvas.getContext('2d')

  // 重画原图
  ctx.drawImage(currentImage.value, 0, 0, canvas.width, canvas.height)

  // 画框选区域
  if (selectionBox.value) {
    const { x, y, width, height } = selectionBox.value
    ctx.strokeStyle = '#409EFF'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
    ctx.fillStyle = 'rgba(64, 158, 255, 0.15)'
    ctx.fillRect(x, y, width, height)
  }
}

function clearSelection() {
  selectionBox.value = null
  redrawCanvas()
}

function removeImage() {
  currentImage.value = null
  currentImageFile.value = null
  ocrText.value = null
  analyzed.value = false
  selectionBox.value = null
}

// 截取选中区域并识别
async function recognizeSelection() {
  if (!selectionBox.value || !currentImage.value) {
    ElMessage.warning('请先框选区域')
    return
  }

  const { x, y, width, height } = selectionBox.value
  if (width < 20 || height < 20) {
    ElMessage.warning('框选区域太小，请重新框选')
    return
  }

  const canvas = canvasRef.value
  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = width
  cropCanvas.height = height
  const cropCtx = cropCanvas.getContext('2d')

  cropCtx.drawImage(canvas, x, y, width, height, 0, 0, width, height)
  const base64 = cropCanvas.toDataURL('image/jpeg', 0.9)

  analyzing.value = true
  ElMessage.info('正在识别框选区域...')

  try {
    const ocrRes = await fetch('/.netlify/functions/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    })
    const ocrData = await ocrRes.json()

    if (!ocrData.success || !ocrData.data?.text) {
      throw new Error(ocrData.error || 'OCR 识别失败')
    }

    ocrText.value = ocrData.data.text
    ElMessage.success('识别完成！点击「分析错题」进行诊断')
  } catch (error) {
    console.error(error)
    ElMessage.error(error.message || '识别失败')
  } finally {
    analyzing.value = false
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

async function runAnalyze() {
  const textToAnalyze = ocrText.value?.trim()
  if (!textToAnalyze) {
    ElMessage.warning('请识别或输入错题内容')
    return
  }

  analyzing.value = true
  ElMessage.info('正在分析错题...')

  try {
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
    ElMessage.error(error.message || '诊断失败')
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

/* 迷你上传框 */
.upload-mini :deep(.el-upload-dragger) {
  width: 100%;
  min-height: 80px;
  padding: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-color: var(--primary);
  background: var(--primary-light);
}

.upload-icon-mini {
  color: var(--primary);
  font-size: 20px;
}

.upload-text-mini {
  font-size: 14px;
  color: var(--text-regular);
}

/* 截图区域 */
.screenshot-area {
  margin-top: 16px;
}

.screenshot-hint {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #409eff;
}

.canvas-wrapper {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
  display: inline-block;
  max-width: 100%;
}

.screenshot-canvas {
  display: block;
  cursor: crosshair;
  max-width: 100%;
}

.selection-overlay {
  position: absolute;
  border: 2px solid #409eff;
  background: rgba(64, 158, 255, 0.1);
  pointer-events: none;
  z-index: 10;
}

.selection-label {
  position: absolute;
  top: -32px;
  left: 0;
  background: #409eff;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: auto;
}

.screenshot-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

/* OCR 结果 */
.ocr-result {
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

  .selection-label {
    font-size: 11px;
  }
}
</style>
