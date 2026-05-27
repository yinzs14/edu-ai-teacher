<template>
  <div class="page-container knowledge-page">
    <h1 class="page-title">知识树</h1>
    <p class="page-subtitle">按年级与单元浏览知识点，每个知识点配有典型例题</p>

    <div class="filter-bar card-section">
      <span class="filter-label">选择年级：</span>
      <el-radio-group v-model="selectedGrade" size="default" @change="onGradeChange">
        <el-radio-button
          v-for="g in grades"
          :key="g"
          :value="g"
          :disabled="!hasGradeData(g)"
        >
          {{ g }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <el-empty
      v-if="!currentUnits.length"
      description="该年级暂无知识树数据，请选择三年级或四年级"
    />

    <el-collapse v-else v-model="activeUnits" class="unit-collapse">
      <el-collapse-item
        v-for="(unit, index) in currentUnits"
        :key="unit.unit"
        :name="index"
      >
        <template #title>
          <div class="unit-title">
            <el-icon><FolderOpened /></el-icon>
            <span>{{ unit.unit }}</span>
            <el-tag size="small" type="primary">{{ unit.points.length }} 个知识点</el-tag>
          </div>
        </template>

        <div class="points-grid">
          <div
            v-for="point in unit.points"
            :key="point.id"
            class="point-card"
            :class="{ expanded: expandedId === point.id }"
            @click="togglePoint(point.id)"
          >
            <div class="point-header">
              <el-icon class="point-icon"><Document /></el-icon>
              <h4>{{ point.name }}</h4>
              <el-icon class="expand-icon">
                <ArrowDown v-if="expandedId !== point.id" />
                <ArrowUp v-else />
              </el-icon>
            </div>
            <el-collapse-transition>
              <div v-show="expandedId === point.id" class="point-example">
                <p class="example-label">典型例题</p>
                <p class="example-content">{{ point.example }}</p>
                <el-button
                  type="primary"
                  link
                  size="small"
                  @click.stop="useInCourseware(point)"
                >
                  用于生成课件
                </el-button>
              </div>
            </el-collapse-transition>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FolderOpened, Document, ArrowDown, ArrowUp } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { grades, knowledgeTreeData } from '@/data/mockKnowledgeTree.js'

const router = useRouter()
const selectedGrade = ref('三年级')
const activeUnits = ref([0])
const expandedId = ref(null)

const currentUnits = computed(() => knowledgeTreeData[selectedGrade.value] || [])

function hasGradeData(grade) {
  return !!knowledgeTreeData[grade]?.length
}

function onGradeChange() {
  activeUnits.value = [0]
  expandedId.value = null
}

function togglePoint(id) {
  expandedId.value = expandedId.value === id ? null : id
}

function useInCourseware(point) {
  ElMessage.success(`已将「${point.name}」加入课件生成队列（模拟）`)
  router.push({
    path: '/courseware',
    query: { knowledge: point.name },
  })
}

onMounted(() => {
  if (!hasGradeData(selectedGrade.value)) {
    selectedGrade.value = '三年级'
  }
})
</script>

<style scoped>
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.filter-label {
  font-weight: 500;
  color: var(--text-regular);
  flex-shrink: 0;
}

.filter-bar :deep(.el-radio-group) {
  flex-wrap: wrap;
}

.unit-collapse {
  border: none;
}

.unit-collapse :deep(.el-collapse-item) {
  margin-bottom: 16px;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  background: #fff;
}

.unit-collapse :deep(.el-collapse-item__header) {
  padding: 0 20px;
  height: 56px;
  font-size: 16px;
  border: none;
}

.unit-collapse :deep(.el-collapse-item__wrap) {
  border: none;
}

.unit-collapse :deep(.el-collapse-item__content) {
  padding: 0 20px 20px;
}

.unit-title {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.points-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.point-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fafafa;
}

.point-card:hover,
.point-card.expanded {
  border-color: var(--primary);
  background: var(--primary-light);
}

.point-header {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.point-icon {
  color: var(--primary);
  margin-top: 2px;
  flex-shrink: 0;
}

.point-header h4 {
  flex: 1;
  font-size: 15px;
  line-height: 1.5;
}

.expand-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.point-example {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed #dcdfe6;
}

.example-label {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  margin-bottom: 8px;
}

.example-content {
  font-size: 14px;
  color: var(--text-regular);
  line-height: 1.7;
  margin-bottom: 10px;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .points-grid {
    grid-template-columns: 1fr;
  }
}
</style>
