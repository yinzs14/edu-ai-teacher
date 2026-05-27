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
            :show-file-list="false"
            :on-change="handleUpload"
          >
            <div v-if="!previewUrl" class="upload-placeholder">
              <el-icon class="upload-icon" :size="64"><UploadFilled /></el-icon>
              <p class="upload-text">将图片拖到此处，或<em>点击上传</em></p>
              <p class="upload-hint">支持 JPG、PNG 格式，单张不超过 10MB</p>
            </div>
            <div v-else class="preview-wrap">
              <img :src="previewUrl" alt="作业预览" class="preview-img" />
              <el-button type="danger" size="small" plain class="clear-btn" @click.stop="clearImage">
                移除图片
              </el-button>
            </div>
          </el-upload>

          <el-button
            type="primary"
            class="analyze-btn"
            :loading="analyzing"
            :disabled="!previewUrl"
            @click="runAnalyze"
          >
            {{ analyzed ? '重新分析' : '开始 AI 诊断' }}
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
import {
  radarDimensions,
  defaultRadarScores,
  weakKnowledgePoints,
} from '@/data/mockDiagnose.js'

const router = useRouter()
const chartRef = ref(null)
const chartInstance = shallowRef(null)
const previewUrl = ref('')
const analyzing = ref(false)
const analyzed = ref(false)
const radarScores = ref([...defaultRadarScores])
const weakPoints = ref([])

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
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(raw)
  analyzed.value = false
}

function clearImage() {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  analyzed.value = false
  updateChart()
}

function runAnalyze() {
  if (!previewUrl.value) return
  analyzing.value = true
  setTimeout(() => {
    radarScores.value = defaultRadarScores.map((s) =>
      Math.max(40, Math.min(95, s + Math.floor(Math.random() * 10 - 5)))
    )
    weakPoints.value = [...weakKnowledgePoints]
    analyzed.value = true
    analyzing.value = false
    updateChart()
    ElMessage.success('学情诊断完成（模拟数据）')
  }, 1500)
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
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
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
}
</style>
