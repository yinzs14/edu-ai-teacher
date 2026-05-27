<template>
  <div class="home-page">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <el-tag type="primary" effect="plain" size="large" class="hero-tag">
          智能备课 · 因材施教
        </el-tag>
        <h1 class="hero-title">教育 AI 备课助手</h1>
        <p class="hero-desc">
          拍照即可诊断学生学情，自动生成针对性课件与练习。
          让备课从数小时缩短到几分钟，助力教师精准教学。
        </p>
        <div class="hero-actions">
          <el-button type="primary" size="large" :icon="Camera" @click="$router.push('/diagnose')">
            拍照诊断
          </el-button>
          <el-button size="large" :icon="Document" @click="$router.push('/courseware')">
            直接生成课件
          </el-button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="hero-circle"></div>
        <el-icon class="hero-icon" :size="120"><Reading /></el-icon>
      </div>
    </section>

    <!-- 三步流程动画 -->
    <section class="flow-section page-container">
      <h2 class="section-title">三步完成智能备课</h2>
      <p class="section-subtitle">拍照 → 诊断 → 课件，全流程 AI 辅助</p>

      <div class="flow-steps">
        <div
          v-for="(step, index) in flowSteps"
          :key="step.key"
          class="flow-step"
          :class="{ active: activeStep === index, done: activeStep > index }"
        >
          <div class="step-icon-wrap">
            <el-icon :size="36"><component :is="step.icon" /></el-icon>
            <span class="step-num">{{ index + 1 }}</span>
          </div>
          <h3>{{ step.title }}</h3>
          <p>{{ step.desc }}</p>
        </div>

        <div class="flow-arrows">
          <div
            v-for="i in 2"
            :key="i"
            class="flow-arrow"
            :class="{ active: activeStep >= i }"
          >
            <el-icon><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </section>

    <!-- 产品价值 -->
    <section class="value-section page-container">
      <h2 class="section-title">为什么选择我们</h2>
      <el-row :gutter="24">
        <el-col v-for="item in values" :key="item.title" :xs="24" :sm="12" :md="8">
          <div class="value-card">
            <div class="value-icon">
              <el-icon :size="32"><component :is="item.icon" /></el-icon>
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>
        </el-col>
      </el-row>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="cta-inner">
        <h2>立即开始智能备课</h2>
        <p>上传作业照片，获取学情报告与个性化课件</p>
        <el-button type="primary" size="large" round @click="$router.push('/diagnose')">
          免费体验
        </el-button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import {
  Camera,
  Document,
  Reading,
  ArrowRight,
  DataAnalysis,
  Timer,
  Medal,
} from '@element-plus/icons-vue'

const flowSteps = [
  {
    key: 'photo',
    title: '拍照',
    desc: '拍摄或上传学生作业、试卷照片',
    icon: Camera,
  },
  {
    key: 'diagnose',
    title: '诊断',
    desc: 'AI 分析五维学情，定位薄弱知识点',
    icon: DataAnalysis,
  },
  {
    key: 'courseware',
    title: '课件',
    desc: '一键生成例题、解析与配套练习',
    icon: Document,
  },
]

const values = [
  {
    title: '精准学情诊断',
    desc: '五维雷达图直观展示计算、应用、几何等能力分布，薄弱点一目了然。',
    icon: DataAnalysis,
  },
  {
    title: '高效备课',
    desc: '自动生成课件结构与练习题，支持在线编辑与下载，节省 80% 备课时间。',
    icon: Timer,
  },
  {
    title: '知识体系完备',
    desc: '按年级单元组织知识点，每点配有典型例题，方便对照教学大纲。',
    icon: Medal,
  },
]

const activeStep = ref(0)
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    activeStep.value = (activeStep.value + 1) % 3
  }, 2500)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.home-page {
  overflow-x: hidden;
}

.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
  padding: 48px 16px 64px;
  gap: 40px;
}

.hero-tag {
  margin-bottom: 16px;
}

.hero-title {
  font-size: 42px;
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 17px;
  color: var(--text-regular);
  line-height: 1.8;
  max-width: 520px;
  margin-bottom: 32px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.hero-visual {
  position: relative;
  flex-shrink: 0;
  width: 280px;
  height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-circle {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary-light) 0%, #d9ecff 100%);
  animation: pulse 3s ease-in-out infinite;
}

.hero-icon {
  position: relative;
  color: var(--primary);
  z-index: 1;
}

@keyframes pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.85;
  }
}

.section-title {
  text-align: center;
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.section-subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 48px;
}

.flow-section {
  padding-top: 24px;
  padding-bottom: 64px;
}

.flow-steps {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.flow-step {
  text-align: center;
  padding: 32px 20px;
  background: #fff;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: all 0.4s ease;
  border: 2px solid transparent;
  z-index: 1;
}

.flow-step.active {
  border-color: var(--primary);
  transform: translateY(-8px);
  box-shadow: 0 12px 32px rgba(64, 158, 255, 0.2);
}

.flow-step.done .step-icon-wrap {
  background: var(--primary);
  color: #fff;
}

.step-icon-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  margin: 0 auto 16px;
  border-radius: 50%;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s;
}

.step-num {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 22px;
  height: 22px;
  background: var(--primary);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  line-height: 22px;
  font-weight: 600;
}

.flow-step h3 {
  font-size: 20px;
  margin-bottom: 8px;
}

.flow-step p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.flow-arrows {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  display: flex;
  justify-content: space-around;
  padding: 0 28%;
  pointer-events: none;
  z-index: 0;
}

.flow-arrow {
  color: #dcdfe6;
  font-size: 28px;
  transition: color 0.4s;
}

.flow-arrow.active {
  color: var(--primary);
}

.value-section {
  padding-bottom: 64px;
}

.value-card {
  background: #fff;
  border-radius: var(--radius);
  padding: 28px 24px;
  box-shadow: var(--shadow);
  height: 100%;
  margin-bottom: 24px;
  transition: transform 0.2s;
}

.value-card:hover {
  transform: translateY(-4px);
}

.value-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.value-card h3 {
  font-size: 18px;
  margin-bottom: 10px;
}

.value-card p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.cta-section {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  padding: 56px 16px;
}

.cta-inner {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
  color: #fff;
}

.cta-inner h2 {
  font-size: 28px;
  margin-bottom: 12px;
}

.cta-inner p {
  opacity: 0.9;
  margin-bottom: 28px;
  font-size: 16px;
}

@media (max-width: 992px) {
  .hero {
    flex-direction: column;
    text-align: center;
    padding: 32px 16px 48px;
  }

  .hero-desc {
    margin-left: auto;
    margin-right: auto;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-visual {
    width: 200px;
    height: 200px;
  }

  .hero-icon {
    font-size: 80px !important;
  }
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 28px;
  }

  .flow-steps {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .flow-arrows {
    display: none;
  }

  .flow-step.active {
    transform: none;
  }
}
</style>
