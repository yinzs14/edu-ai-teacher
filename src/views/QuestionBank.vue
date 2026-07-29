<template>
  <div class="question-bank-page">
    <!-- 顶部搜索栏 -->
    <div class="top-bar">
      <h2 class="page-title">
        <el-icon :size="24"><Collection /></el-icon>
        错题库 · 组卷练习
      </h2>
      <div class="search-row">
        <el-input
          v-model="searchKeyword"
          placeholder="输入关键字搜索题目（题干/答案/标签）..."
          clearable
          class="search-input"
          @keyup.enter="doSearch"
          @clear="doSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="doSearch">
          <el-icon><Search /></el-icon> 搜索
        </el-button>
      </div>
    </div>

    <div class="main-layout">
      <!-- 左侧筛选面板 -->
      <aside class="filter-panel">
        <!-- 知识树 -->
        <div class="filter-section">
          <h4 class="filter-title">
            <el-icon><FolderOpened /></el-icon> 知识树
          </h4>
          <div class="knowledge-tree">
            <div v-for="domain in knowledgeTree?.dimensions?.dim1?.domains || []" :key="domain.id" class="domain-node">
              <div class="domain-header" @click="toggleDomain(domain.id)">
                <el-icon>
                  <CaretRight v-if="!expandedDomains[domain.id]" />
                  <CaretBottom v-else />
                </el-icon>
                <span class="domain-name">{{ domain.name }}</span>
                <el-tag size="small" type="info">{{ countDomain(domain) }}</el-tag>
              </div>
              <div v-show="expandedDomains[domain.id]" class="module-list">
                <div v-for="mod in domain.modules" :key="mod.id" class="module-node">
                  <div class="module-header" @click="toggleModule(mod.id)">
                    <el-icon :size="14">
                      <CaretRight v-if="!expandedModules[mod.id]" />
                      <CaretBottom v-else />
                    </el-icon>
                    <span class="module-name">{{ mod.name }}</span>
                  </div>
                  <div v-show="expandedModules[mod.id]" class="leaf-list">
                    <el-checkbox
                      v-for="leaf in mod.leaves"
                      :key="leaf.id"
                      :model-value="selectedLeaves.includes(leaf.id)"
                      size="small"
                      :label="leaf.name"
                      @change="(val) => toggleLeaf(leaf.id, val)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 年级 -->
        <div class="filter-section">
          <h4 class="filter-title">
            <el-icon><School /></el-icon> 年级
          </h4>
          <el-select v-model="filterGrade" placeholder="全部年级" clearable style="width:100%" @change="doSearch">
            <el-option v-for="g in [1,2,3,4,5,6]" :key="g" :label="g+'年级'" :value="g" />
          </el-select>
        </div>

        <!-- 题型 -->
        <div class="filter-section">
          <h4 class="filter-title">
            <el-icon><Document /></el-icon> 题型
          </h4>
          <el-select v-model="filterType" placeholder="全部题型" clearable style="width:100%" @change="doSearch">
            <el-option
              v-for="(info, code) in questionTypes || {}"
              :key="code"
              :label="info.name"
              :value="code"
            />
          </el-select>
        </div>

        <!-- 难度 -->
        <div class="filter-section">
          <h4 class="filter-title">
            <el-icon><DataLine /></el-icon> 难度
          </h4>
          <el-slider
            v-model="filterDifficulty"
            range
            :min="0"
            :max="1"
            :step="0.1"
            :marks="{0:'易', 0.5:'中', 1:'难'}"
            @change="debouncedSearch"
          />
        </div>

        <!-- 认知层级 -->
        <div class="filter-section">
          <h4 class="filter-title">
            <el-icon><Connection /></el-icon> 认知层级
          </h4>
          <el-radio-group v-model="filterCognitive" size="small" @change="doSearch">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="A">识记</el-radio-button>
            <el-radio-button value="B">理解</el-radio-button>
            <el-radio-button value="C">应用</el-radio-button>
            <el-radio-button value="D">综合</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 情境 -->
        <div class="filter-section">
          <h4 class="filter-title">
            <el-icon><Position /></el-icon> 情境类型
          </h4>
          <el-radio-group v-model="filterContext" size="small" @change="doSearch">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="pure">纯数学</el-radio-button>
            <el-radio-button value="life">生活</el-radio-button>
            <el-radio-button value="school">校园</el-radio-button>
            <el-radio-button value="cross">跨学科</el-radio-button>
          </el-radio-group>
        </div>

        <el-button @click="resetFilters" plain size="small" style="width:100%">
          <el-icon><RefreshRight /></el-icon> 重置筛选
        </el-button>
      </aside>

      <!-- 主内容区 -->
      <main class="content-area">
        <!-- 统计摘要 -->
        <div class="stats-bar" v-if="stats">
          <span>共 <b>{{ stats.total }}</b> 道题目</span>
          <el-tag v-for="s in stats.byDomain" :key="s.key" size="small">
            {{ domainNameOf(s.key) }}: {{ s.count }}
          </el-tag>
        </div>

        <!-- 加载状态 -->
        <el-skeleton v-if="loading" :rows="5" animated />

        <!-- 题目列表 -->
        <template v-else-if="questions.length > 0">
          <div class="question-cards">
            <div
              v-for="q in questions"
              :key="q.id"
              class="question-card"
              :class="{ expanded: expandedCard === q.id }"
            >
              <div class="card-header" @click="toggleCard(q.id)">
                <div class="card-meta">
                  <el-tag :type="difficultyColor(q.difficulty)" size="small" effect="dark">
                    {{ difficultyLabel(q.difficulty) }}
                  </el-tag>
                  <el-tag size="small">{{ q.grade }}年级</el-tag>
                  <el-tag size="small" type="warning">{{ questionTypes?.[q.questionType]?.name || q.questionType }}</el-tag>
                  <el-tag size="small" type="info">{{ cogLabel(q.cognitiveLevel) }}</el-tag>
                  <span class="card-id">#{{ q.id }}</span>
                </div>
                <div class="card-actions" @click.stop>
                  <el-button size="small" circle @click="searchSimilar(q)">
                    <el-icon><Connection /></el-icon>
                  </el-button>
                  <el-icon :size="18" class="expand-icon">
                    <ArrowDown v-if="expandedCard !== q.id" />
                    <ArrowUp v-else />
                  </el-icon>
                </div>
              </div>
              <div class="card-body">
                <div class="stem-content" v-html="renderMath(q.stem)"></div>
                <div v-if="q.options && q.options.length > 0" class="options-list">
                  <span v-for="(opt, i) in q.options" :key="i" class="option-item">
                    {{ String.fromCharCode(65+i) }}. {{ opt }}
                  </span>
                </div>
              </div>
              <el-collapse-transition>
                <div v-show="expandedCard === q.id" class="card-detail">
                  <div class="detail-section">
                    <h5>答案</h5>
                    <div class="answer-content">{{ q.answer }}</div>
                  </div>
                  <div class="detail-section" v-if="q.solution">
                    <h5>解题思路</h5>
                    <div class="solution-content">{{ q.solution }}</div>
                  </div>
                  <div class="detail-tags">
                    <el-tag v-for="leafId in (q.knowledgePoints || [])" :key="leafId" size="small" type="success">
                      {{ leafNameOf(leafId) }}
                    </el-tag>
                    <el-tag v-for="tag in (q.tags || [])" :key="tag" size="small" type="info">
                      {{ tag }}
                    </el-tag>
                  </div>
                </div>
              </el-collapse-transition>
            </div>
          </div>

          <!-- 分页 -->
          <div class="pagination-wrap" v-if="totalPages > 1">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              layout="prev, pager, next, total"
              @current-change="doSearch"
            />
          </div>
        </template>

        <!-- 空状态 -->
        <el-empty v-else description="没有找到匹配的题目，试试调整筛选条件" />
      </main>
    </div>

    <!-- 同类题抽屉 -->
    <el-drawer
      v-model="similarDrawer"
      title="相似题目推荐"
      size="480px"
      direction="rtl"
    >
      <template v-if="similarSource">
        <div class="similar-source">
          <el-tag type="primary">原始题目 #{{ similarSource.id }}</el-tag>
          <div class="similar-stem">{{ similarSource.stem?.substring(0, 60) }}{{ (similarSource.stem?.length || 0) > 60 ? '...' : '' }}</div>
        </div>
      </template>

      <el-skeleton v-if="similarLoading" :rows="5" animated />

      <template v-else-if="similarResults.length > 0">
        <div class="similar-info">
          共找到 <b>{{ similarResults.length }}</b> 道相似题目（按综合相似度排序）
        </div>
        <div
          v-for="item in similarResults"
          :key="item.id"
          class="similar-item"
          @click="viewSimilarQuestion(item)"
        >
          <div class="similar-score">
            <div class="score-ring" :style="{ '--score': item.score }">
              {{ Math.round(item.score * 100) }}%
            </div>
          </div>
          <div class="similar-content">
            <div class="similar-stem">{{ item.question?.stem?.substring(0, 80) }}{{ (item.question?.stem?.length || 0) > 80 ? '...' : '' }}</div>
            <div class="similar-meta">
              <el-tag size="small">{{ item.question?.grade }}年级</el-tag>
              <el-tag size="small" type="warning">{{ difficultyLabel(item.question?.difficulty) }}</el-tag>
              <el-tag size="small" type="info">{{ cogLabel(item.question?.cognitiveLevel) }}</el-tag>
            </div>
            <div class="score-detail" v-if="item.details">
              <span>知识点 {{ Math.round(item.details.kpScore*100) }}%</span>
              <span>难度 {{ Math.round(item.details.diffScore*100) }}%</span>
              <span>认知 {{ Math.round(item.details.cogScore*100) }}%</span>
            </div>
          </div>
        </div>
      </template>
      <el-empty v-else description="没有找到相似题目" />
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import {
  Collection, Search, FolderOpened, CaretRight, CaretBottom,
  School, Document, DataLine, Connection, Position,
  RefreshRight, ArrowDown, ArrowUp, Right,
} from '@element-plus/icons-vue'

// ========== 状态 ==========
const searchKeyword = ref('')
const filterGrade = ref(null)
const filterType = ref('')
const filterDifficulty = ref([0, 1])
const filterCognitive = ref('')
const filterContext = ref('')
const selectedLeaves = ref([])

const knowledgeTree = ref(null)
const questionTypes = ref({})
const stats = ref(null)
const questions = ref([])
const loading = ref(false)
const total = ref(0)
const totalPages = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)
const expandedCard = ref(null)
const expandedDomains = ref({ D1: true })
const expandedModules = ref({})

// 相似题状态
const similarDrawer = ref(false)
const similarLoading = ref(false)
const similarResults = ref([])
const similarSource = ref(null)

// ========== 方法 ==========

// 清除知识树勾选
function clearLeafSelection() {
  selectedLeaves.value = []
}

async function loadKnowledgeTree() {
  try {
    const resp = await fetch('/api/question-bank/knowledge-tree')
    const data = await resp.json()
    if (data.success) knowledgeTree.value = data.data
  } catch {}
}

async function loadQuestionTypes() {
  try {
    const resp = await fetch('/api/question-bank/types')
    const data = await resp.json()
    if (data.success) questionTypes.value = data.data.categories || {}
  } catch {}
}

async function loadStats() {
  try {
    const resp = await fetch('/api/question-bank/stats')
    const data = await resp.json()
    if (data.success) stats.value = data.data
  } catch {}
}

async function doSearch() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (searchKeyword.value) params.set('keyword', searchKeyword.value)
    if (filterGrade.value) params.set('grade', filterGrade.value)
    if (filterType.value) params.set('type', filterType.value)
    if (filterDifficulty.value[0] > 0) params.set('difficulty_min', filterDifficulty.value[0])
    if (filterDifficulty.value[1] < 1) params.set('difficulty_max', filterDifficulty.value[1])
    if (filterCognitive.value) params.set('cognitive', filterCognitive.value)
    if (filterContext.value) params.set('context', filterContext.value)
    if (selectedLeaves.value.length === 1) params.set('knowledge_point', selectedLeaves.value[0])
    params.set('page', currentPage.value)
    params.set('page_size', pageSize.value)

    const resp = await fetch('/api/question-bank/questions?' + params.toString())
    const data = await resp.json()
    if (data.success) {
      questions.value = data.data.items || []
      total.value = data.data.total
      totalPages.value = data.data.totalPages
    }
  } catch (err) {
    console.error('搜索失败:', err)
  } finally {
    loading.value = false
  }
}

async function searchSimilar(q) {
  similarSource.value = { id: q.id, stem: q.stem }
  similarDrawer.value = true
  similarLoading.value = true
  similarResults.value = []
  try {
    const resp = await fetch(`/api/question-bank/similar/${q.id}?top_k=12&same_type=true`)
    const data = await resp.json()
    if (data.success) similarResults.value = data.data.items || []
  } catch (err) {
    console.error('相似题检索失败:', err)
  } finally {
    similarLoading.value = false
  }
}

function viewSimilarQuestion(item) {
  similarDrawer.value = false
  expandedCard.value = item.question?.id || null
  if (item.question) {
    // 滚动到对应题目
    setTimeout(() => {
      document.querySelector(`#q-${item.question.id}`)?.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }
}

function toggleCard(id) {
  expandedCard.value = expandedCard.value === id ? null : id
}

function toggleDomain(id) {
  expandedDomains.value[id] = !expandedDomains.value[id]
}

function toggleModule(id) {
  expandedModules.value[id] = !expandedModules.value[id]
}

function toggleLeaf(leafId, checked) {
  if (checked) {
    if (!selectedLeaves.value.includes(leafId)) {
      selectedLeaves.value.push(leafId)
    }
  } else {
    selectedLeaves.value = selectedLeaves.value.filter(l => l !== leafId)
  }
  doSearch()
}

function resetFilters() {
  searchKeyword.value = ''
  filterGrade.value = null
  filterType.value = ''
  filterDifficulty.value = [0, 1]
  filterCognitive.value = ''
  filterContext.value = ''
  selectedLeaves.value = []
  currentPage.value = 1
  doSearch()
}

// ========== 辅助函数 ==========
function difficultyColor(d) {
  if (d <= 0.3) return 'success'
  if (d <= 0.55) return 'warning'
  return 'danger'
}

function difficultyLabel(d) {
  if (d <= 0.3) return '简单'
  if (d <= 0.55) return '中等'
  return '偏难'
}

function cogLabel(l) {
  const map = { A: '识记', B: '理解', C: '应用', D: '综合' }
  return map[l] || l
}

function domainNameOf(key) {
  const map = { D1: '数与代数', D2: '图形与几何', D3: '统计与概率', D4: '综合与实践' }
  return map[key] || key
}

function countDomain(domain) {
  let count = 0
  domain.modules?.forEach(m => { count += m.leaves?.length || 0 })
  return count
}

function leafNameOf(leafId) {
  return knowledgeTree.value?.leafIndex?.[leafId]?.name || leafId
}

function renderMath(text) {
  if (!text) return ''
  return text
    .replace(/\^(\d+)/g, '<sup>$1</sup>')
    .replace(/π/g, '<i>π</i>')
}

// 防抖搜索
let debounceTimer
function debouncedSearch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doSearch, 400)
}

// ========== 初始化 ==========
onMounted(async () => {
  await Promise.all([loadKnowledgeTree(), loadQuestionTypes(), loadStats()])
  doSearch()
})
</script>

<style scoped>
.question-bank-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px 16px;
  min-height: calc(100vh - 64px);
}

/* 顶部 */
.top-bar {
  margin-bottom: 20px;
  text-align: center;
}
.page-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 22px;
  color: var(--primary);
  margin-bottom: 16px;
}
.search-row {
  display: flex;
  gap: 10px;
  max-width: 700px;
  margin: 0 auto;
}
.search-input {
  flex: 1;
}

/* 主体布局 */
.main-layout {
  display: flex;
  gap: 20px;
}

/* 左侧筛选面板 */
.filter-panel {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  padding-right: 4px;
}
.filter-section {
  margin-bottom: 18px;
}
.filter-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

/* 知识树 */
.knowledge-tree {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
  max-height: 400px;
  overflow-y: auto;
}
.domain-node { margin-bottom: 4px; }
.domain-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
  cursor: pointer;
  border-radius: 4px;
  font-weight: 600;
  font-size: 14px;
  color: var(--primary);
}
.domain-header:hover { background: var(--primary-light); }
.domain-name { flex: 1; }
.module-node { margin-left: 12px; }
.module-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  color: #555;
}
.module-header:hover { background: #f5f7fa; }
.leaf-list {
  margin-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* 统计 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
}

/* 内容区 */
.content-area {
  flex: 1;
  min-width: 0;
}

/* 题目卡片 */
.question-cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.question-card {
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
  transition: all 0.2s;
  background: #fff;
}
.question-card:hover {
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.12);
}
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
}
.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.card-id {
  color: #aaa;
  font-size: 12px;
  font-family: monospace;
}
.card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.expand-icon {
  color: #999;
  transition: transform 0.2s;
}
.card-body {
  padding: 0 16px 12px;
}
.stem-content {
  font-size: 15px;
  line-height: 1.7;
  color: #333;
}
.options-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 8px;
}
.option-item {
  padding: 4px 10px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 13px;
  color: #555;
}
.card-detail {
  border-top: 1px dashed #ebeef5;
  padding: 12px 16px;
  background: #fafbfc;
}
.detail-section {
  margin-bottom: 10px;
}
.detail-section h5 {
  font-size: 13px;
  color: #888;
  margin-bottom: 4px;
  font-weight: 500;
}
.answer-content {
  font-size: 15px;
  color: var(--primary);
  font-weight: 600;
}
.solution-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
}
.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

/* 分页 */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 相似题抽屉 */
.similar-source {
  background: var(--primary-light);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.similar-info {
  margin-bottom: 12px;
  font-size: 13px;
  color: #888;
}
.similar-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.similar-item:hover {
  border-color: var(--primary);
  background: #f9fbff;
}
.similar-score {
  flex-shrink: 0;
}
.score-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: conic-gradient(
    var(--primary) calc(var(--score) * 360deg),
    #e8e8e8 0deg
  );
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  position: relative;
}
.score-ring::after {
  content: '';
  position: absolute;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #fff;
}
.score-ring {
  z-index: 1;
  position: relative;
}
.similar-content {
  flex: 1;
  min-width: 0;
}
.similar-stem {
  font-size: 14px;
  color: #333;
  margin-bottom: 6px;
  line-height: 1.5;
}
.similar-meta {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}
.score-detail {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #999;
}

/* 响应式 */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
  }
  .filter-panel {
    width: 100%;
    position: static;
    max-height: none;
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }
  .filter-section {
    flex: 1;
    min-width: 120px;
  }
}
</style>
