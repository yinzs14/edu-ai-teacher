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
            multiple
          >
            <el-icon class="upload-icon-mini"><UploadFilled /></el-icon>
            <span class="upload-text-mini">点击或拖拽上传图片（支持多张）</span>
          </el-upload>

          <!-- 图片缩略图预览 -->
          <div v-if="images.length > 0" class="screenshot-area">
            <div class="screenshot-hint">
              📷 已上传 {{ images.length }} 张图片，点击缩略图切换当前图片，在弹出的大图中框选错题区域
            </div>

            <!-- 图片缩略图切换栏 -->
            <div class="image-thumbnails">
              <div
                v-for="(img, index) in images"
                :key="img.id"
                class="image-thumb-item"
                :class="{ active: currentImageIndex === index }"
                @click="switchImage(index)"
              >
                <img :src="img.url" class="image-thumb-preview" />
                <div class="image-thumb-label">图{{ index + 1 }}</div>
                <el-button
                  class="image-thumb-remove"
                  size="small"
                  type="danger"
                  circle
                  :icon="Delete"
                  @click.stop="removeImage(index)"
                />
              </div>
            </div>

            <!-- 当前图片操作 -->
            <div v-if="currentImage" class="current-image-area">
              <div class="thumbnail-wrapper" @click="openCropDialog">
                <img :src="currentImage.url" class="thumbnail-img" alt="作业预览" />
                <div class="thumbnail-overlay">
                  <el-icon><ZoomIn /></el-icon>
                  <span>点击放大框选</span>
                </div>
              </div>

              <!-- 已框选区域列表 -->
              <div v-if="currentImage.selectionBoxes.length > 0" class="selected-regions">
                <div class="selected-header">
                  <span>图{{ currentImageIndex + 1 }}：已框选 {{ currentImage.selectionBoxes.length }} 个区域</span>
                  <el-button type="primary" size="small" @click="recognizeAllSelections">
                    识别所有区域
                  </el-button>
                </div>
                <div class="region-list">
                  <div v-for="(box, index) in currentImage.selectionBoxes" :key="box.id" class="region-item">
                    <el-tag type="primary">区域 {{ index + 1 }}</el-tag>
                    <el-button type="danger" size="small" @click="removeSelection(index)">删除</el-button>
                  </div>
                </div>
              </div>
            </div>

            <div class="screenshot-actions">
              <el-button type="danger" size="small" :disabled="images.length <= 0" @click="removeImage(currentImageIndex)">
                <el-icon><Delete /></el-icon> 移除当前图片
              </el-button>
              <el-button size="small" @click="removeAllImages" v-if="images.length > 1">
                清空全部
              </el-button>
            </div>
          </div>

          <!-- 大图框选弹窗 -->
          <el-dialog
            v-model="cropDialogVisible"
            title="框选错题区域"
            width="fit-content"
            top="5vh"
            :close-on-click-modal="false"
            class="crop-dialog"
            destroy-on-close
          >
            <div class="dialog-body">
              <div class="dialog-hint">
                🖱️ 在图片上拖动鼠标框选错题区域，支持框选多处
              </div>
              <div class="dialog-canvas-wrapper" ref="dialogCanvasWrapper">
                <canvas
                  ref="dialogCanvas"
                  class="dialog-canvas"
                  @mousedown="startDraw"
                  @mousemove="draw"
                  @mouseup="endDraw"
                  @mouseleave="endDraw"
                ></canvas>
                <!-- 已框选区域 overlay（固定在 canvas 上方） -->
                <div
                  v-for="(box, index) in tempSelectionBoxes"
                  :key="box.id"
                  class="selection-overlay"
                  :style="getOverlayStyle(box)"
                >
                  <div class="overlay-label">
                    <span>区域 {{ index + 1 }}</span>
                    <el-button type="danger" size="small" @click="removeTempSelection(index)">删除</el-button>
                  </div>
                </div>
              </div>
            </div>
            <template #footer>
              <el-button @click="cropDialogVisible = false">取消</el-button>
              <el-button type="primary" @click="confirmSelections">确定并识别</el-button>
            </template>
          </el-dialog>

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

        <div v-if="analyzed && communicationScript" class="card-section">
          <h3 class="card-title">
            <el-icon><ChatDotRound /></el-icon>
            家长沟通话术
            <el-button type="primary" size="small" class="copy-script-btn" @click="copyScript">
              <el-icon><CopyDocument /></el-icon> 一键复制
            </el-button>
          </h3>

          <div class="script-content">
            <div class="script-block">
              <h4>本阶段应掌握的知识</h4>
              <p>{{ communicationScript.stageKnowledge }}</p>
            </div>
            <div class="script-block positive">
              <h4>已掌握的部分</h4>
              <p>{{ communicationScript.mastered }}</p>
            </div>
            <div class="script-block warning">
              <h4>有待提升的部分</h4>
              <p>{{ communicationScript.weaknesses }}</p>
            </div>
            <div class="script-block solution">
              <h4>解决建议</h4>
              <p>{{ communicationScript.solutions }}</p>
            </div>
            <div class="script-block tip">
              <h4>沟通要点提示</h4>
              <p>{{ communicationScript.talkingTips }}</p>
            </div>
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
import { Upload, UploadFilled, DataAnalysis, Warning, Delete, ZoomIn, ChatDotRound, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const radarDimensions = ['计算', '应用题', '几何', '逻辑', '规律']

const router = useRouter()
const chartRef = ref(null)
const chartInstance = shallowRef(null)

// 多图支持
const images = ref([])  // [{ id, url, file, original, originalSize, selectionBoxes: [], ocrText: null }]
const currentImageIndex = ref(0)
const currentImage = computed(() => images.value[currentImageIndex.value] || null)
const ocrText = ref(null)

// 弹窗相关
const cropDialogVisible = ref(false)
const dialogCanvas = ref(null)
const dialogCanvasWrapper = ref(null)
const displayScale = ref(1)

// 框选状态（弹窗内临时）
const isDrawing = ref(false)
const drawStart = ref({ x: 0, y: 0 })
const tempSelectionBoxes = ref([])

const analyzing = ref(false)
const analyzed = ref(false)
const radarScores = ref([0, 0, 0, 0, 0])
const weakPoints = ref([])
const communicationScript = ref(null)

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

// ==================== 上传处理 ====================

function handleUpload(file) {
  const raw = file.raw
  if (!raw?.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return
  }

  const id = Date.now() + Math.random()
  const url = URL.createObjectURL(raw)

  const imgData = {
    id,
    url,
    file: raw,
    original: null,
    originalSize: { width: 0, height: 0 },
    selectionBoxes: [],
    ocrText: null,
  }

  images.value.push(imgData)
  currentImageIndex.value = images.value.length - 1

  // 预加载图片，获取原始尺寸
  const img = new Image()
  img.onload = () => {
    imgData.original = img
    imgData.originalSize = { width: img.width, height: img.height }
  }
  img.src = url

  ocrText.value = null
  analyzed.value = false
  communicationScript.value = null
  ElMessage.success(`已添加第 ${images.value.length} 张图片`)
}

function switchImage(index) {
  currentImageIndex.value = index
  ocrText.value = null
}

// ==================== 弹窗框选 ====================

function openCropDialog() {
  const img = currentImage.value
  if (!img) return

  // 将已有的框选同步到临时列表
  tempSelectionBoxes.value = img.selectionBoxes.map(b => ({
    ...b,
    displayX: b.x * displayScale.value,
    displayY: b.y * displayScale.value,
    displayWidth: b.width * displayScale.value,
    displayHeight: b.height * displayScale.value,
  }))
  cropDialogVisible.value = true
  nextTick(() => {
    initDialogCanvas()
  })
}

function initDialogCanvas() {
  const canvas = dialogCanvas.value
  const img = currentImage.value
  if (!canvas || !img?.original) return

  const image = img.original
  // 计算显示尺寸：最大占屏幕 85% 宽度、70% 高度
  const maxWidth = window.innerWidth * 0.85
  const maxHeight = window.innerHeight * 0.7

  let scale = 1
  if (image.width > maxWidth || image.height > maxHeight) {
    scale = Math.min(maxWidth / image.width, maxHeight / image.height)
  }
  displayScale.value = scale

  const canvasWidth = Math.round(image.width * scale)
  const canvasHeight = Math.round(image.height * scale)

  canvas.width = canvasWidth
  canvas.height = canvasHeight
  canvas.style.width = canvasWidth + 'px'
  canvas.style.height = canvasHeight + 'px'

  const ctx = canvas.getContext('2d')
  ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight)

  // 重画已有框选
  redrawDialogCanvas()
}

function getCanvasCoordinates(e) {
  const canvas = dialogCanvas.value
  const rect = canvas.getBoundingClientRect()
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  }
}

function startDraw(e) {
  isDrawing.value = true
  drawStart.value = getCanvasCoordinates(e)
}

function draw(e) {
  if (!isDrawing.value) return
  const coords = getCanvasCoordinates(e)

  // 重画基础图片和所有已保存的框选
  redrawDialogCanvas()

  // 画当前正在拖动的临时框选
  const x = Math.min(drawStart.value.x, coords.x)
  const y = Math.min(drawStart.value.y, coords.y)
  const width = Math.abs(coords.x - drawStart.value.x)
  const height = Math.abs(coords.y - drawStart.value.y)

  const ctx = dialogCanvas.value.getContext('2d')
  ctx.strokeStyle = '#409EFF'
  ctx.lineWidth = 2
  ctx.setLineDash([5, 3])
  ctx.strokeRect(x, y, width, height)
  ctx.setLineDash([])
  ctx.fillStyle = 'rgba(64, 158, 255, 0.15)'
  ctx.fillRect(x, y, width, height)
}

function endDraw(e) {
  if (!isDrawing.value) return
  isDrawing.value = false
  const coords = getCanvasCoordinates(e)

  const x = Math.min(drawStart.value.x, coords.x)
  const y = Math.min(drawStart.value.y, coords.y)
  const width = Math.abs(coords.x - drawStart.value.x)
  const height = Math.abs(coords.y - drawStart.value.y)

  if (width < 20 || height < 20) {
    redrawDialogCanvas()
    return
  }

  // 保存到临时列表（同时记录原始坐标和显示坐标）
  tempSelectionBoxes.value.push({
    id: Date.now(),
    x: x / displayScale.value,
    y: y / displayScale.value,
    width: width / displayScale.value,
    height: height / displayScale.value,
    displayX: x,
    displayY: y,
    displayWidth: width,
    displayHeight: height,
  })

  redrawDialogCanvas()
}

function redrawDialogCanvas() {
  const canvas = dialogCanvas.value
  const img = currentImage.value
  if (!canvas || !img?.original) return
  const ctx = canvas.getContext('2d')

  // 重画图片
  ctx.drawImage(img.original, 0, 0, canvas.width, canvas.height)

  // 画所有已保存的框选
  tempSelectionBoxes.value.forEach((box) => {
    ctx.strokeStyle = '#409EFF'
    ctx.lineWidth = 2
    ctx.strokeRect(box.displayX, box.displayY, box.displayWidth, box.displayHeight)
    ctx.fillStyle = 'rgba(64, 158, 255, 0.15)'
    ctx.fillRect(box.displayX, box.displayY, box.displayWidth, box.displayHeight)
  })
}

function getOverlayStyle(box) {
  return {
    left: box.displayX + 'px',
    top: box.displayY + 'px',
    width: box.displayWidth + 'px',
    height: box.displayHeight + 'px',
  }
}

function removeTempSelection(index) {
  tempSelectionBoxes.value.splice(index, 1)
  redrawDialogCanvas()
}

function confirmSelections() {
  const img = currentImage.value
  if (!img) return

  if (tempSelectionBoxes.value.length === 0) {
    ElMessage.warning('请先框选至少一个区域')
    return
  }
  // 同步到当前图片的 selectionBoxes
  img.selectionBoxes = tempSelectionBoxes.value.map(b => ({
    id: b.id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
  }))
  cropDialogVisible.value = false
  recognizeAllSelections()
}

function removeSelection(index) {
  const img = currentImage.value
  if (!img) return
  img.selectionBoxes.splice(index, 1)
  ocrText.value = null
  ElMessage.info('已删除该区域')
}

function removeImage(index) {
  // 释放 URL
  const img = images.value[index]
  if (img?.url) URL.revokeObjectURL(img.url)

  images.value.splice(index, 1)

  if (images.value.length === 0) {
    currentImageIndex.value = 0
    ocrText.value = null
    analyzed.value = false
    communicationScript.value = null
    tempSelectionBoxes.value = []
  } else if (currentImageIndex.value >= images.value.length) {
    currentImageIndex.value = images.value.length - 1
  }
  ocrText.value = null
}

function removeAllImages() {
  images.value.forEach(img => {
    if (img?.url) URL.revokeObjectURL(img.url)
  })
  images.value = []
  currentImageIndex.value = 0
  ocrText.value = null
  analyzed.value = false
  communicationScript.value = null
  tempSelectionBoxes.value = []
}

// ==================== 识别 ====================

async function recognizeAllSelections() {
  const img = currentImage.value
  if (!img || img.selectionBoxes.length === 0) {
    ElMessage.warning('请先框选区域')
    return
  }

  analyzing.value = true
  ElMessage.info('正在识别框选区域...')

  const texts = []
  for (const box of img.selectionBoxes) {
    const text = await recognizeSingleBox(box, img)
    if (text) texts.push(text)
  }

  // 收集所有图片已识别的文本
  const allTexts = [texts.join('\n\n')]
  for (let i = 0; i < images.value.length; i++) {
    if (i !== currentImageIndex.value && images.value[i].ocrText) {
      allTexts.push(images.value[i].ocrText)
    }
  }

  ocrText.value = allTexts.filter(Boolean).join('\n\n')
  img.ocrText = texts.join('\n\n')
  analyzing.value = false
  ElMessage.success('识别完成！点击「分析错题」进行诊断')
}

async function recognizeSingleBox(box, img) {
  const { x, y, width, height } = box
  if (width < 20 || height < 20) return null

  return new Promise((resolve) => {
    const image = img?.original
    if (!image) {
      resolve(null)
      return
    }

    const cropCanvas = document.createElement('canvas')
    cropCanvas.width = Math.round(width)
    cropCanvas.height = Math.round(height)
    const cropCtx = cropCanvas.getContext('2d')

    cropCtx.drawImage(image, x, y, width, height, 0, 0, width, height)
    const base64 = cropCanvas.toDataURL('image/jpeg', 0.9)

    fetch('/api/vision-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.text) {
          resolve(data.data.text)
        } else {
          resolve(null)
        }
      })
      .catch(() => resolve(null))
  })
}

// ==================== 分析 ====================

async function runAnalyze() {
  const textToAnalyze = ocrText.value?.trim()
  if (!textToAnalyze) {
    ElMessage.warning('请识别或输入错题内容')
    return
  }

  analyzing.value = true
  ElMessage.info('正在分析错题...')

  try {
    const diagnoseRes = await fetch('/api/diagnose', {
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

    if (result.communicationScript) {
      communicationScript.value = {
        stageKnowledge: result.communicationScript.stageKnowledge || '',
        mastered: result.communicationScript.mastered || '',
        weaknesses: result.communicationScript.weaknesses || '',
        solutions: result.communicationScript.solutions || '',
        talkingTips: result.communicationScript.talkingTips || '',
      }
    } else {
      communicationScript.value = null
    }

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
  localStorage.setItem('diagnosisData', JSON.stringify({
    radarScores: radarScores.value.reduce((obj, score, i) => {
      obj[radarDimensions[i]] = score
      return obj
    }, {}),
    weakPoints: weakPoints.value.map(w => ({
      name: w.name,
      dimension: w.dimension,
      score: w.score,
      suggestion: w.suggestion,
    })),
    communicationScript: communicationScript.value,
    timestamp: Date.now(),
  }))
  router.push({ path: '/courseware', query: { from: 'diagnose' } })
}

function copyScript() {
  if (!communicationScript.value) return
  const lines = [
    '【本阶段应掌握的知识】',
    communicationScript.value.stageKnowledge,
    '',
    '【已掌握的部分】',
    communicationScript.value.mastered,
    '',
    '【有待提升的部分】',
    communicationScript.value.weaknesses,
    '',
    '【解决建议】',
    communicationScript.value.solutions,
    '',
    '【沟通要点提示】',
    communicationScript.value.talkingTips,
  ]
  navigator.clipboard.writeText(lines.join('\n')).then(() => {
    ElMessage.success('话术已复制到剪贴板')
  }).catch(() => {
    ElMessage.warning('复制失败，请手动选择文本')
  })
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

/* 缩略图 */
.thumbnail-wrapper {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #f5f7fa;
  max-width: 100%;
  display: inline-block;
}

.thumbnail-img {
  display: block;
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
}

.thumbnail-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 14px;
}

.thumbnail-wrapper:hover .thumbnail-overlay {
  opacity: 1;
}

.thumbnail-overlay .el-icon {
  font-size: 28px;
}

/* 已选区域 */
.selected-regions {
  margin-top: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.selected-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
}

.region-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.region-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.screenshot-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

/* 图片缩略图切换栏 */
.image-thumbnails {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  margin-bottom: 12px;
}

.image-thumb-item {
  position: relative;
  flex-shrink: 0;
  width: 80px;
  height: 80px;
  border: 2px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s;
}

.image-thumb-item.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3);
}

.image-thumb-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-thumb-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 11px;
  text-align: center;
  padding: 2px 0;
}

.image-thumb-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  font-size: 10px;
  opacity: 0.8;
}

.current-image-area {
  margin-bottom: 12px;
}

/* 弹窗 */
:deep(.crop-dialog) {
  max-width: 95vw;
}

:deep(.crop-dialog .el-dialog__body) {
  padding: 10px 20px;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.dialog-hint {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #409eff;
  width: 100%;
  text-align: center;
}

.dialog-canvas-wrapper {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  background: #f5f7fa;
  display: inline-block;
  max-width: 100%;
}

.dialog-canvas {
  display: block;
  cursor: crosshair;
  max-width: 100%;
}

/* 框选 overlay */
.selection-overlay {
  position: absolute;
  border: 2px solid #409eff;
  background: rgba(64, 158, 255, 0.1);
  pointer-events: none;
  z-index: 10;
}

.overlay-label {
  position: absolute;
  top: -36px;
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

.copy-script-btn {
  margin-left: auto;
}

.script-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.script-block {
  padding: 14px 16px;
  border-radius: 8px;
  background: #f5f7fa;
  border-left: 3px solid #909399;
}

.script-block h4 {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}

.script-block p {
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-regular);
  margin: 0;
}

.script-block.positive {
  border-left-color: #67c23a;
  background: #f0f9eb;
}

.script-block.warning {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.script-block.solution {
  border-left-color: #409eff;
  background: #ecf5ff;
}

.script-block.tip {
  border-left-color: #909399;
  background: #f4f4f5;
}

@media (max-width: 768px) {
  .radar-chart {
    height: 300px;
  }

  .weak-progress {
    max-width: 100%;
  }

  .overlay-label {
    font-size: 11px;
  }

  .thumbnail-overlay {
    opacity: 1;
    background: rgba(0, 0, 0, 0.2);
  }
}
</style>
