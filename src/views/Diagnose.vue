<template>
  <div class="page-container diagnose-page">
    <h1 class="page-title">学情诊断</h1>
    <p class="page-subtitle">上传学生作业，框选错题区域，AI 自动识别并诊断薄弱知识点，生成沟通话术与学习方案</p>

    <div class="diagnose-layout">
      <!-- ==================== 左栏：上传与框选 ==================== -->
      <div class="left-panel" :class="{ 'is-analyzed': analyzed }">
        <!-- 师生姓名（填完自动折叠，释放预览空间） -->
        <div v-if="!nameCollapsed" class="name-inputs">
          <div class="name-row">
            <label class="name-label">🧑‍🏫 老师花名</label>
            <el-input
              v-model="teacherName"
              placeholder="如：张老师"
              size="default"
              class="name-input"
              maxlength="12"
              clearable
            />
          </div>
          <div class="name-row">
            <label class="name-label">👦 学生姓名</label>
            <el-input
              v-model="studentName"
              placeholder="如：小明"
              size="default"
              class="name-input"
              maxlength="10"
              clearable
            />
          </div>
          <p class="name-hint">花名展现在PPT课件首页和PDF报告中；学生姓名用于个性化沟通话术，让家长感受到关注</p>
          <el-button v-if="teacherName.trim() && studentName.trim()" type="primary" link size="small" class="name-done-btn" @click="nameCollapsed = true">
            确认 ✓
          </el-button>
        </div>

        <!-- 姓名折叠态 -->
        <div v-else class="name-collapsed" @click="nameCollapsed = false">
          <span class="nc-label">🧑‍🏫 {{ teacherName || '老师' }}</span>
          <span class="nc-sep">|</span>
          <span class="nc-label">👦 {{ studentName || '学生' }}</span>
          <el-button type="primary" link size="small" class="nc-edit" @click.stop="nameCollapsed = false">编辑</el-button>
        </div>

        <!-- 上传区（紧凑） -->
        <el-upload
          class="upload-compact"
          drag
          :auto-upload="false"
          accept="image/*"
          :show-file-list="false"
          :on-change="handleUpload"
          multiple
        >
          <el-icon class="upload-icon"><UploadFilled /></el-icon>
          <span>点击或拖拽上传（支持多张）</span>
        </el-upload>

        <!-- 缩略图栏 -->
        <div v-if="images.length > 0" class="thumb-bar">
          <div
            v-for="(img, index) in images"
            :key="img.id"
            class="thumb-item"
            :class="{ active: currentImageIndex === index }"
            @click="switchImage(index)"
          >
            <img :src="img.url" class="thumb-img" />
            <span class="thumb-badge">{{ index + 1 }}</span>
            <el-button
              class="thumb-del"
              size="small"
              type="danger"
              circle
              :icon="Delete"
              @click.stop="removeImage(index)"
            />
          </div>
        </div>

        <!-- 当前图片预览 + 框选引导 -->
        <div v-if="currentImage" class="current-preview" @click="openCropDialog">
          <img :src="currentImage.url" class="preview-img" alt="当前作业" />
          <div class="preview-overlay">
            <el-icon><ZoomIn /></el-icon>
            <span>点击放大，框选错题</span>
          </div>
          <!-- 永久可见引导条（不依赖 hover） -->
          <div class="preview-guide-bar">
            <span>👆 点击图片开始框选错题区域</span>
          </div>
          <el-tag v-if="currentImage.selectionBoxes.length > 0" type="primary" size="small" class="selection-count-tag">
            {{ currentImage.selectionBoxes.length }} 个框选
          </el-tag>
          <!-- 首次提示箭头 -->
          <div v-if="images.length > 0 && totalSelections === 0 && !analyzed" class="preview-first-hint">
            ← 点击这里框选
          </div>
        </div>

        <!-- 全部图片框选汇总 -->
        <div v-if="totalSelections > 0" class="all-selections">
          <div class="all-sel-header">
            <span>📐 已框选 {{ totalSelections }} 个区域（{{ imagesWithSelections }} 张图）</span>
            <el-button size="small" type="danger" text @click="clearAllSelections">清空全部</el-button>
          </div>
          <div class="all-sel-list">
            <template v-for="(img, imgIdx) in images" :key="img.id">
              <div v-if="img.selectionBoxes.length > 0" class="sel-group">
                <span class="sel-group-label">图{{ imgIdx + 1 }}：</span>
                <el-tag
                  v-for="(box, boxIdx) in img.selectionBoxes"
                  :key="box.id"
                  size="small"
                  type="primary"
                  class="sel-tag"
                  closable
                  @close="removeSelectionFromImage(imgIdx, boxIdx)"
                >
                  区域{{ boxIdx + 1 }}
                </el-tag>
              </div>
            </template>
          </div>
        </div>

        <!-- 教师补充题目 -->
        <div class="supplement-area">
          <el-input
            v-model="teacherSupplement"
            type="textarea"
            :rows="2"
            resize="none"
            placeholder="💡 补充其他题目（打字/粘贴，可选）。如：小明有道乘法题不会..."
            class="supplement-input"
          />
        </div>

        <!-- 分析按钮 -->
        <el-button
          type="primary"
          class="analyze-btn"
          :loading="analyzing"
          :disabled="!canAnalyze"
          @click="runFullAnalysis"
        >
          <template v-if="analyzing">
            <el-icon class="is-loading"><Loading /></el-icon>
            {{ analysisStatus }}
          </template>
          <template v-else-if="analyzed">
            🔄 重新分析
          </template>
          <template v-else>
            分析错题
          </template>
        </el-button>

        <!-- 分析完成后显示提示 -->
        <div v-if="analyzed" class="analyzed-hint">
          ✅ 分析完成 — 查看右侧结果。修改框选或补充内容后可点击「重新分析」
        </div>
      </div>

      <!-- ==================== 右栏：诊断结果 ==================== -->
      <div class="right-panel" ref="rightPanelRef">
        <!-- 未分析时 -->
        <div v-if="!analyzed" class="right-placeholder">
          <el-empty description="上传作业图片，框选错题区域后点击「分析错题」" :image-size="120" />
          <div class="quick-tips">
            <h4>📋 操作提示</h4>
            <ul>
              <li>支持上传多张作业图片（如多页试卷）</li>
              <li>点击图片放大后，拖动鼠标框选错题区域</li>
              <li>框选后可直接点「分析错题」，无需额外操作</li>
              <li>也可在下方补充框中打字/粘贴额外题目</li>
            </ul>
          </div>
        </div>

        <!-- 已分析时 -->
        <template v-else>
          <!-- 1️⃣ 家长沟通话术（最重要） -->
          <div class="result-section script-section">
            <div class="section-header" @click="toggleSection('script')">
              <div class="section-header-left">
                <h3>
                  <el-icon><ChatDotRound /></el-icon>
                  家长沟通话术
                  <el-tag type="danger" size="small">核心</el-tag>
                </h3>
                <p v-if="!expandedSections.has('script')" class="section-preview-text">
                  {{ scriptBlocks[0]?.preview || '点击展开查看完整沟通话术' }}
                </p>
              </div>
              <div class="section-actions">
                <el-button type="primary" size="small" @click.stop="copyScript">
                  <el-icon><CopyDocument /></el-icon> 一键复制
                </el-button>
                <el-icon class="expand-icon" :class="{ rotated: expandedSections.has('script') }">
                  <ArrowDown />
                </el-icon>
              </div>
            </div>
            <div v-show="expandedSections.has('script')" class="section-body">
              <div v-if="communicationScript" class="script-cards">
                <div
                  v-for="block in scriptBlocks"
                  :key="block.key"
                  class="script-card"
                  :class="block.style"
                  @click="block.expanded = !block.expanded"
                >
                  <div class="sc-header">
                    <span class="sc-title">{{ block.icon }} {{ block.label }}</span>
                    <el-icon class="sc-expand" :class="{ rotated: block.expanded }"><ArrowDown /></el-icon>
                  </div>
                  <div v-show="block.expanded" class="sc-body">
                    <p>{{ block.content }}</p>
                  </div>
                  <p v-show="!block.expanded" class="sc-preview">{{ block.preview }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 2️⃣ 个性化学习方案 -->
          <div class="result-section plan-section">
            <div class="section-header" @click="toggleSection('plan')">
              <div class="section-header-left">
                <h3>
                  <el-icon><Notebook /></el-icon>
                  个性化学习方案
                </h3>
                <p v-if="!expandedSections.has('plan')" class="section-preview-text">
                  {{ learningPhases[0]?.preview || '点击展开查看学习方案' }}
                </p>
              </div>
              <div class="section-actions">
                <el-icon class="expand-icon" :class="{ rotated: expandedSections.has('plan') }">
                  <ArrowDown />
                </el-icon>
              </div>
            </div>
            <div v-show="expandedSections.has('plan')" class="section-body">
              <div class="phase-cards">
                <div
                  v-for="(phase, idx) in learningPhases"
                  :key="idx"
                  class="phase-card"
                  :class="`phase-${idx + 1}`"
                  @click="phase.expanded = !phase.expanded"
                >
                  <div class="ph-header">
                    <span class="ph-num">{{ idx + 1 }}</span>
                    <div class="ph-info">
                      <span class="ph-title">{{ phase.title }}</span>
                      <span class="ph-time">{{ phase.time }}</span>
                    </div>
                    <el-icon class="ph-expand" :class="{ rotated: phase.expanded }"><ArrowDown /></el-icon>
                  </div>
                  <div v-show="phase.expanded" class="ph-body">
                    <div class="ph-targets">
                      <span class="ph-label">目标知识点：</span>
                      <el-tag v-for="t in phase.targets" :key="t" size="small" type="info" class="ph-tag">{{ t }}</el-tag>
                      <span v-if="phase.targets.length === 0" class="ph-none">综合复习</span>
                    </div>
                    <p class="ph-desc">{{ phase.desc }}</p>
                    <p class="ph-tip">{{ phase.tip }}</p>
                  </div>
                  <p v-show="!phase.expanded" class="ph-preview">{{ phase.preview }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- 3️⃣ 薄弱知识点 -->
          <div class="result-section weak-section">
            <div class="section-header" @click="toggleSection('weak')">
              <div class="section-header-left">
                <h3>
                  <el-icon><Warning /></el-icon>
                  薄弱知识点
                  <el-tag type="danger" size="small">{{ weakPoints.length }} 项</el-tag>
                </h3>
                <p v-if="!expandedSections.has('weak')" class="section-preview-text">
                  {{ weakPoints.slice(0, 3).map(w => w.name).join('、') || '点击展开查看薄弱知识点详情' }}
                </p>
              </div>
              <div class="section-actions">
                <el-icon class="expand-icon" :class="{ rotated: expandedSections.has('weak') }">
                  <ArrowDown />
                </el-icon>
              </div>
            </div>
            <div v-show="expandedSections.has('weak')" class="section-body">
              <div class="weak-compact">
                <div
                  v-for="item in displayedWeakPoints"
                  :key="item.id"
                  class="weak-row"
                  :class="{ expanded: item.expanded }"
                  @click="item.expanded = !item.expanded"
                >
                  <div class="weak-row-header">
                    <span class="weak-dot" :style="{ background: getScoreColor(item.score) }"></span>
                    <span class="weak-row-name">{{ item.name }}</span>
                    <el-tag size="small" type="info">{{ item.dimension }}</el-tag>
                    <el-progress
                      :percentage="item.score"
                      :color="getScoreColor(item.score)"
                      :stroke-width="6"
                      class="weak-row-progress"
                    />
                    <el-icon class="weak-row-expand" :class="{ rotated: item.expanded }"><ArrowDown /></el-icon>
                  </div>
                  <div v-show="item.expanded" class="weak-row-detail">
                    <p>{{ item.suggestion }}</p>
                  </div>
                </div>
              </div>
              <el-button
                v-if="weakPoints.length > 3"
                type="primary"
                link
                size="small"
                class="show-all-btn"
                @click="showAllWeak = !showAllWeak"
              >
                {{ showAllWeak ? '收起' : `展开全部 ${weakPoints.length} 项` }}
              </el-button>
            </div>
          </div>

          <!-- 生成课件 -->
          <el-button type="primary" size="large" class="courseware-btn" @click="goCourseware">
            <el-icon><Document /></el-icon>
            生成课件（PPT / PDF）
          </el-button>
        </template>
      </div>
    </div>

    <!-- ==================== 框选弹窗（不变） ==================== -->
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
        <el-button type="primary" @click="confirmSelections">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { UploadFilled, Warning, Delete, ZoomIn, ChatDotRound, CopyDocument, ArrowDown, Notebook, Loading, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const radarDimensions = ['计算', '应用题', '几何', '逻辑', '规律']
const router = useRouter()

// ==================== 多图支持 ====================
const images = ref([])
const currentImageIndex = ref(0)
const currentImage = computed(() => images.value[currentImageIndex.value] || null)

// 所有图片框选总数
const totalSelections = computed(() =>
  images.value.reduce((sum, img) => sum + img.selectionBoxes.length, 0)
)
const imagesWithSelections = computed(() =>
  images.value.filter(img => img.selectionBoxes.length > 0).length
)

// 教师补充
const teacherSupplement = ref('')

// 师生姓名
const teacherName = ref('')
const studentName = ref('')
const nameCollapsed = ref(false)

// 是否可以分析：已有分析结果（允许重新分析）、有框选区域 或 有补充文字
const canAnalyze = computed(() => {
  if (analyzed.value) return true // 允许重新分析
  if (teacherSupplement.value.trim()) return true
  return images.value.some(img => img.selectionBoxes.length > 0)
})

// ==================== 弹窗框选 ====================
const cropDialogVisible = ref(false)
const dialogCanvas = ref(null)
const dialogCanvasWrapper = ref(null)
const rightPanelRef = ref(null)
const displayScale = ref(1)
const isDrawing = ref(false)
const drawStart = ref({ x: 0, y: 0 })
const tempSelectionBoxes = ref([])

// ==================== 分析状态 ====================
const analyzing = ref(false)
const analysisStatus = ref('')
const analyzed = ref(false)
const radarScores = ref([0, 0, 0, 0, 0])
const weakPoints = ref([])
const communicationScript = ref(null)

// ==================== 折叠控制 ====================
const expandedSections = reactive(new Set())
function toggleSection(key) {
  if (expandedSections.has(key)) {
    expandedSections.delete(key)
  } else {
    expandedSections.add(key)
  }
}

const showAllWeak = ref(false)
const displayedWeakPoints = computed(() => {
  if (showAllWeak.value) return weakPoints.value
  return weakPoints.value.slice(0, 3)
})

// ==================== 分数颜色 ====================
function getScoreColor(score) {
  if (score >= 70) return '#67c23a'
  if (score >= 60) return '#e6a23c'
  return '#f56c6c'
}

// ==================== 沟通话术卡片 ====================
const scriptBlocks = computed(() => {
  if (!communicationScript.value) return []
  const defaultExpanded = ['weaknesses', 'solutions'] // 首次沟通时家长最关心的：问题在哪、怎么办
  const blocks = [
    { key: 'stageKnowledge', label: '本阶段知识', icon: '📖', style: 'sc-default', content: communicationScript.value.stageKnowledge },
    { key: 'mastered', label: '已掌握部分', icon: '✅', style: 'sc-positive', content: communicationScript.value.mastered },
    { key: 'weaknesses', label: '有待提升', icon: '⚠️', style: 'sc-warning', content: communicationScript.value.weaknesses },
    { key: 'solutions', label: '解决建议', icon: '💡', style: 'sc-solution', content: communicationScript.value.solutions },
    { key: 'talkingTips', label: '沟通要点', icon: '💬', style: 'sc-tip', content: communicationScript.value.talkingTips },
  ]
  return blocks.map(b => ({
    ...b,
    expanded: defaultExpanded.includes(b.key),
    preview: (b.content || '').slice(0, 80) + ((b.content || '').length > 80 ? '… 点击展开' : ''),
  }))
})

// ==================== 学习方案阶段 ====================
const learningPhases = computed(() => {
  const sorted = [...weakPoints.value].sort((a, b) => (a.score || 50) - (b.score || 50))
  const len = sorted.length

  if (len === 0) {
    return [
      { title: '巩固基础', time: '第1-2周', targets: [], desc: '根据错题类型，从最基础的概念开始梳理。', tip: '不要求速度，确保理解每个概念。', preview: '从基础概念开始梳理…', expanded: true },
      { title: '专项突破', time: '第3-4周', targets: [], desc: '针对薄弱题型进行集中训练，限时完成。', tip: '整理错题本，归纳解题模板。', preview: '针对薄弱题型集中训练…', expanded: false },
      { title: '综合提升', time: '后续', targets: [], desc: '真题套练，模拟考试环境，查漏补缺。', tip: '每周至少完成一套完整试卷。', preview: '真题套练，模拟考试…', expanded: false },
    ]
  }

  const third = Math.max(1, Math.ceil(len / 3))
  const p1 = sorted.slice(0, third)
  const p2 = sorted.slice(third, third * 2)
  const p3 = sorted.slice(third * 2)

  return [
    {
      title: '巩固基础',
      time: '第1-2周',
      targets: p1.map(w => w.name),
      desc: p1.length > 0
        ? `重点攻克：${p1.map(w => w.name).join('、')}。从基本概念入手，通过例题讲解建立正确解题思路。${p1[0]?.suggestion || ''}`
        : '从最基础的错题类型开始，确保理解核心概念。',
      tip: '此阶段不要求速度，重点是建立信心、理清思路。可使用教材和笔记辅助。',
      preview: `重点攻克 ${p1.map(w => w.name).join('、')}…`,
      expanded: true,
    },
    {
      title: '专项突破',
      time: '第3-4周',
      targets: p2.map(w => w.name),
      desc: p2.length > 0
        ? `针对：${p2.map(w => w.name).join('、')} 进行限时强化训练。脱离教材独立完成，归纳解题模板。${p2[0]?.suggestion || ''}`
        : '对中等难度题型进行限时训练，培养解题节奏。',
      tip: '脱离教材独立完成，做完后再对答案。建立个人错题本和公式卡片。',
      preview: `针对 ${p2.map(w => w.name).join('、')} 限时训练…`,
      expanded: false,
    },
    {
      title: '综合提升',
      time: '后续',
      targets: p3.map(w => w.name),
      desc: p3.length > 0
        ? `综合复习：${p3.map(w => w.name).join('、')}。真题套练，模拟真实考试环境。`
        : '真题套练，模拟真实考试环境，查漏补缺。',
      tip: '每周至少一套完整试卷，严格计时。重点分析错题原因，而非只看分数。',
      preview: '真题套练 + 综合复习…',
      expanded: false,
    },
  ]
})

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

  // 新上传图片时重置分析状态
  if (analyzed.value) {
    analyzed.value = false
    communicationScript.value = null
    weakPoints.value = []
  }

  const img = new Image()
  img.onload = () => {
    imgData.original = img
    imgData.originalSize = { width: img.width, height: img.height }
  }
  img.src = url

  ElMessage.success(`已添加第 ${images.value.length} 张图片`)
}

function switchImage(index) {
  currentImageIndex.value = index
  // 切换图片时不再清除状态，保留所有图片的框选
}

// ==================== 弹窗框选 ====================
function openCropDialog() {
  const img = currentImage.value
  if (!img) return

  tempSelectionBoxes.value = img.selectionBoxes.map(b => ({
    ...b,
    displayX: b.x * displayScale.value,
    displayY: b.y * displayScale.value,
    displayWidth: b.width * displayScale.value,
    displayHeight: b.height * displayScale.value,
  }))
  cropDialogVisible.value = true
  nextTick(() => initDialogCanvas())
}

function initDialogCanvas() {
  const canvas = dialogCanvas.value
  const img = currentImage.value
  if (!canvas || !img?.original) return

  const image = img.original
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
  redrawDialogCanvas()
}

function getCanvasCoordinates(e) {
  const canvas = dialogCanvas.value
  const rect = canvas.getBoundingClientRect()
  return { x: e.clientX - rect.left, y: e.clientY - rect.top }
}

function startDraw(e) {
  isDrawing.value = true
  drawStart.value = getCanvasCoordinates(e)
}

function draw(e) {
  if (!isDrawing.value) return
  const coords = getCanvasCoordinates(e)
  redrawDialogCanvas()

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

  ctx.drawImage(img.original, 0, 0, canvas.width, canvas.height)

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

  img.selectionBoxes = tempSelectionBoxes.value.map(b => ({
    id: b.id,
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
  }))
  cropDialogVisible.value = false
  ElMessage.success(`图${currentImageIndex.value + 1}：已保存 ${img.selectionBoxes.length} 个框选区域`)
}

function removeSelectionFromImage(imgIdx, boxIdx) {
  images.value[imgIdx].selectionBoxes.splice(boxIdx, 1)
  ElMessage.info('已删除该区域')
}

function removeImage(index) {
  const img = images.value[index]
  if (img?.url) URL.revokeObjectURL(img.url)

  images.value.splice(index, 1)

  if (images.value.length === 0) {
    currentImageIndex.value = 0
    analyzed.value = false
    communicationScript.value = null
    weakPoints.value = []
    tempSelectionBoxes.value = []
  } else if (currentImageIndex.value >= images.value.length) {
    currentImageIndex.value = images.value.length - 1
  }
}

function clearAllSelections() {
  images.value.forEach(img => {
    img.selectionBoxes = []
    img.ocrText = null
  })
  analyzed.value = false
  communicationScript.value = null
  weakPoints.value = []
  ElMessage.info('已清空所有框选，可重新框选后分析')
}

// ==================== 完整分析流程（OCR + 诊断一体化） ====================
async function runFullAnalysis() {
  // 收集所有需要 OCR 的图片
  const imgsToOcr = images.value.filter(img => img.selectionBoxes.length > 0)

  if (imgsToOcr.length === 0 && !teacherSupplement.value.trim()) {
    ElMessage.warning('请先框选错题区域，或在补充框中输入题目')
    return
  }

  analyzing.value = true
  const allTexts = []

  // 阶段1：OCR 所有图片的框选区域
  if (imgsToOcr.length > 0) {
    analysisStatus.value = '正在识别错题内容…'
    let totalBoxes = 0
    let processedBoxes = 0
    imgsToOcr.forEach(img => { totalBoxes += img.selectionBoxes.length })

    for (const img of imgsToOcr) {
      const texts = []
      for (const box of img.selectionBoxes) {
        const text = await recognizeSingleBox(box, img)
        if (text) texts.push(text)
        processedBoxes++
        analysisStatus.value = `正在识别错题内容 (${processedBoxes}/${totalBoxes})…`
      }
      if (texts.length > 0) {
        img.ocrText = texts.join('\n')
        allTexts.push(img.ocrText)
      }
    }

    if (allTexts.length === 0 && !teacherSupplement.value.trim()) {
      analyzing.value = false
      ElMessage.warning('未能识别到文字内容，请检查框选区域是否包含文字，或手动补充题目')
      return
    }
  }

  // 加上教师补充
  const supplement = teacherSupplement.value.trim()
  if (supplement) {
    allTexts.push(supplement)
  }

  const finalText = allTexts.filter(Boolean).join('\n\n')
  if (!finalText) {
    analyzing.value = false
    ElMessage.warning('没有可分析的内容')
    return
  }

  // 阶段2：AI 诊断
  analysisStatus.value = '正在 AI 诊断分析…'
  try {
    const diagnoseRes = await fetch('/api/diagnose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: finalText, studentName: studentName.value.trim(), teacherName: teacherName.value.trim() }),
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
      expanded: false,
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
    ElMessage.success('学情诊断完成')
    // 自动滚动到结果区
    nextTick(() => {
      rightPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  } catch (error) {
    console.error(error)
    ElMessage.error(error.message || '诊断失败')
  } finally {
    analyzing.value = false
  }
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

// ==================== 课件跳转 ====================
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
    studentName: studentName.value.trim(),
    teacherName: teacherName.value.trim(),
    timestamp: Date.now(),
  }))
  router.push({ path: '/courseware', query: { from: 'diagnose' } })
}

function copyScript() {
  if (!communicationScript.value) return
  const student = studentName.value.trim() || '同学'
  const lines = [
    `【${student}家长沟通话术】`,
    '',
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

onMounted(() => {})
onUnmounted(() => {})
</script>

<style scoped>
/* ==================== 整体布局 ==================== */
.diagnose-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  max-height: calc(100vh - 160px);
}

.left-panel {
  width: 350px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
  transition: width 0.35s ease, opacity 0.35s ease, filter 0.35s ease;
}

/* 分析后：收窄 + 变灰 */
.left-panel.is-analyzed {
  width: 280px;
  filter: grayscale(0.3) opacity(0.75);
}

.left-panel.is-analyzed:hover {
  filter: grayscale(0) opacity(1);
}

/* 分析后隐藏预览 */
.left-panel.is-analyzed .current-preview {
  display: none;
}

/* 分析后缩略图变小 */
.left-panel.is-analyzed .thumb-item {
  width: 48px;
  height: 48px;
}

.left-panel.is-analyzed .upload-compact :deep(.el-upload-dragger) {
  min-height: 44px;
  padding: 6px;
  font-size: 12px;
}

.right-panel {
  flex: 1;
  min-width: 0;
  max-height: calc(100vh - 160px);
  overflow-y: auto;
}

/* ==================== 左栏：姓名输入 ==================== */
.name-inputs {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
  min-width: 72px;
}

.name-input {
  flex: 1;
}

.name-hint {
  margin: 0;
  font-size: 11px;
  color: #909399;
  line-height: 1.5;
  text-align: center;
  padding-top: 2px;
  border-top: 1px dashed #ebeef5;
}

.name-done-btn {
  align-self: center;
  font-size: 13px;
}

/* 姓名折叠态 */
.name-collapsed {
  background: #f0f7ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: background 0.15s;
}

.name-collapsed:hover {
  background: #d9ecff;
}

.nc-label {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.nc-sep {
  color: #c0c4cc;
  font-size: 12px;
}

.nc-edit {
  margin-left: auto;
  font-size: 12px;
}

/* ==================== 左栏：上传与框选 ==================== */

/* 紧凑上传区 */
.upload-compact :deep(.el-upload-dragger) {
  width: 100%;
  min-height: 60px;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-color: #409eff;
  background: #ecf5ff;
}

.upload-icon {
  color: #409eff;
  font-size: 18px;
}

.upload-compact span {
  font-size: 13px;
  color: #606266;
}

/* 缩略图栏 */
.thumb-bar {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 2px 0;
}

.thumb-item {
  position: relative;
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  border: 2px solid #dcdfe6;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s;
}

.thumb-item.active {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.25);
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.5);
  color: white;
  font-size: 10px;
  text-align: center;
  padding: 1px 0;
}

.thumb-del {
  position: absolute;
  top: 1px;
  right: 1px;
  width: 16px;
  height: 16px;
  font-size: 8px;
  padding: 0;
}

/* 当前预览 */
.current-preview {
  position: relative;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 220px;
  min-height: 100px;
}

.preview-img {
  display: block;
  max-width: 100%;
  max-height: 220px;
  object-fit: contain;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.15);
  color: white;
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 13px;
  pointer-events: none;
}

.current-preview:hover .preview-overlay {
  opacity: 1;
}

.preview-overlay .el-icon {
  font-size: 28px;
}

/* 永久可见引导条 */
.preview-guide-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(64, 158, 255, 0.85), rgba(64, 158, 255, 0.6));
  color: white;
  text-align: center;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  z-index: 5;
}

/* 首次提示箭头 */
.preview-first-hint {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translate(100%, -50%);
  background: #f56c6c;
  color: white;
  padding: 3px 8px;
  border-radius: 0 4px 4px 0;
  font-size: 11px;
  white-space: nowrap;
  z-index: 10;
  animation: hint-pulse 2s infinite;
}

@keyframes hint-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.selection-count-tag {
  position: absolute;
  top: 6px;
  right: 6px;
}

/* 全部框选汇总 */
.all-selections {
  background: #f0f7ff;
  border: 1px solid #d9ecff;
  border-radius: 6px;
  padding: 8px 10px;
}

.all-sel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  color: #409eff;
  margin-bottom: 6px;
}

.all-sel-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sel-group {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.sel-group-label {
  font-size: 11px;
  color: #909399;
  white-space: nowrap;
}

.sel-tag {
  font-size: 11px;
}

/* 补充区 */
.supplement-area {
  margin: 0;
}

.supplement-input :deep(.el-textarea__inner) {
  font-size: 13px;
  border-radius: 6px;
}

/* 分析按钮 */
.analyze-btn {
  width: 100%;
  height: 40px;
  font-size: 15px;
  font-weight: 600;
}

.analyzed-hint {
  text-align: center;
  font-size: 12px;
  color: #67c23a;
  padding: 4px 0;
}

/* ==================== 右栏：结果区 ==================== */
.right-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0;
}

.quick-tips {
  margin-top: 16px;
  padding: 16px 20px;
  background: #f5f7fa;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
}

.quick-tips h4 {
  font-size: 14px;
  margin-bottom: 8px;
  color: #303133;
}

.quick-tips ul {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

/* 结果区块 */
.result-section {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  margin-bottom: 12px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.section-header:hover {
  background: #fafafa;
}

.section-header-left {
  flex: 1;
  min-width: 0;
}

.section-header-left h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.section-preview-text {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  padding-top: 2px;
}

.expand-icon {
  transition: transform 0.2s;
  font-size: 14px;
  color: #909399;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.section-body {
  padding: 0 16px 12px;
}

/* ==================== 沟通话术卡片 ==================== */
.script-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.script-card {
  border-radius: 6px;
  border-left: 3px solid #909399;
  background: #f5f7fa;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.script-card:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.script-card.sc-positive {
  border-left-color: #67c23a;
  background: #f0f9eb;
}

.script-card.sc-warning {
  border-left-color: #e6a23c;
  background: #fdf6ec;
}

.script-card.sc-solution {
  border-left-color: #409eff;
  background: #ecf5ff;
}

.script-card.sc-tip {
  border-left-color: #909399;
  background: #f4f4f5;
}

.sc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sc-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.sc-expand {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s;
}

.sc-expand.rotated {
  transform: rotate(180deg);
}

.sc-body p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
  max-height: 200px;
  overflow-y: auto;
}

.sc-preview {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

/* ==================== 学习方案阶段卡片 ==================== */
.phase-cards {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.phase-card {
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s;
}

.phase-card:hover {
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.phase-card.phase-1 {
  background: #ecf5ff;
  border: 1px solid #d9ecff;
}

.phase-card.phase-2 {
  background: #f0f9eb;
  border: 1px solid #e1f3d8;
}

.phase-card.phase-3 {
  background: #fdf6ec;
  border: 1px solid #faecd8;
}

.ph-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ph-num {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
}

.phase-2 .ph-num {
  background: #67c23a;
}

.phase-3 .ph-num {
  background: #e6a23c;
}

.ph-info {
  flex: 1;
  min-width: 0;
}

.ph-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  display: block;
}

.ph-time {
  font-size: 11px;
  color: #909399;
}

.ph-expand {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s;
}

.ph-expand.rotated {
  transform: rotate(180deg);
}

.ph-body {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #dcdfe6;
  max-height: 250px;
  overflow-y: auto;
}

.ph-targets {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 6px;
}

.ph-label {
  font-size: 11px;
  color: #909399;
}

.ph-tag {
  font-size: 11px;
}

.ph-none {
  font-size: 12px;
  color: #909399;
}

.ph-desc {
  margin: 4px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.ph-tip {
  margin: 4px 0 0;
  font-size: 11px;
  color: #909399;
  font-style: italic;
}

.ph-preview {
  margin: 4px 0 0;
  font-size: 12px;
  color: #909399;
}

/* ==================== 薄弱知识点 ==================== */
.weak-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.weak-row {
  padding: 8px 10px;
  border-radius: 6px;
  background: #fef0f0;
  border-left: 3px solid #f56c6c;
  cursor: pointer;
  transition: all 0.15s;
}

.weak-row:hover {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.weak-row-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.weak-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.weak-row-name {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weak-row-progress {
  width: 100px;
  flex-shrink: 0;
}

.weak-row-expand {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s;
}

.weak-row-expand.rotated {
  transform: rotate(180deg);
}

.weak-row-detail {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #fbc4c4;
}

.weak-row-detail p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.show-all-btn {
  margin-top: 8px;
}

/* 生成课件按钮 */
.courseware-btn {
  width: 100%;
  height: 42px;
  font-size: 15px;
  font-weight: 600;
  margin-top: 4px;
}

/* ==================== 弹窗（不变） ==================== */
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

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .diagnose-layout {
    flex-direction: column;
    max-height: none;
  }

  .left-panel {
    width: 100%;
    max-height: none;
  }

  .right-panel {
    max-height: none;
  }

  .weak-row-progress {
    width: 60px;
  }
}
</style>
