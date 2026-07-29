<template>
  <div class="membership-page page-container">
    <div class="page-header">
      <h1 class="page-title">会员中心</h1>
      <p class="page-subtitle">选择适合您的会员方案，畅享全部教学功能</p>
    </div>

    <!-- Current subscription status -->
    <div v-if="auth.isLoggedIn && subscription" class="sub-status-card card-section">
      <div class="sub-status-header">
        <el-icon :size="24" color="#409EFF"><CircleCheckFilled /></el-icon>
        <span>当前会员：<strong>{{ subscription.plan_name }}</strong></span>
        <el-tag :type="subscription.plan_name === '免费试用' ? 'warning' : 'success'" size="small">
          {{ subscription.status === 'active' ? '生效中' : subscription.status }}
        </el-tag>
      </div>
      <div class="sub-status-detail" v-if="subscription.end_date">
        有效期至：{{ formatDate(subscription.end_date) }}
      </div>
    </div>

    <div v-else-if="auth.isLoggedIn && hasTrialed" class="sub-status-card card-section sub-expired">
      <div class="sub-status-header">
        <el-icon :size="24" color="#F56C6C"><WarningFilled /></el-icon>
        <span>试用已过期，请开通会员继续使用全部功能</span>
      </div>
    </div>

    <!-- Plans grid -->
    <div class="plans-grid">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-card"
        :class="{
          'plan-card--popular': plan.name === '年度会员',
          'plan-card--trial': plan.price === 0,
        }"
      >
        <div v-if="plan.name === '年度会员'" class="plan-badge">推荐</div>

        <h3 class="plan-name">{{ plan.name }}</h3>

        <div class="plan-price">
          <span v-if="plan.price === 0" class="price-free">免费</span>
          <template v-else>
            <span class="price-symbol">¥</span>
            <span class="price-value">{{ plan.price }}</span>
            <span class="price-unit">/ {{ getDurationText(plan.duration_days) }}</span>
          </template>
        </div>

        <ul class="plan-features">
          <li v-for="(feat, idx) in (plan.features || [])" :key="idx">
            <el-icon :size="14" color="#67C23A"><Check /></el-icon>
            <span>{{ feat }}</span>
          </li>
        </ul>

        <el-button
          v-if="plan.price === 0 && auth.isLoggedIn && subscription"
          type="info"
          disabled
          size="large"
          class="plan-btn"
        >
          {{ subscription.plan_name === '免费试用' ? '使用中' : '已体验过' }}
        </el-button>
        <el-button
          v-else-if="plan.price === 0"
          type="primary"
          size="large"
          class="plan-btn"
          plain
          @click="$router.push('/')"
        >
          立即体验
        </el-button>
        <el-button
          v-else
          :type="plan.name === '年度会员' ? 'primary' : 'default'"
          size="large"
          class="plan-btn"
          @click="showPayDialog(plan)"
        >
          {{ plan.price === 0 ? '开始试用' : '立即订购' }}
        </el-button>
      </div>
    </div>

    <!-- Payment collection guide -->
    <div class="card-section payment-guide">
      <h3 class="section-heading">收款方式说明（管理员配置）</h3>
      <p class="guide-intro">您可以选择以下任一方式完成付款，付款后联系管理员确认开通：</p>

      <el-row :gutter="24">
        <el-col :xs="24" :md="8">
          <div class="guide-item">
            <div class="guide-icon" style="background: #07C160;">
              <el-icon :size="24" color="#fff"><ChatDotRound /></el-icon>
            </div>
            <h4>微信收款码</h4>
            <p>扫描管理员提供的微信收款码付款，备注用户名后联系管理员确认</p>
            <div class="qr-placeholder">
              <el-icon :size="48" color="#C0C4CC"><Picture /></el-icon>
              <span>收款码占位</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :md="8">
          <div class="guide-item">
            <div class="guide-icon" style="background: #1677FF;">
              <el-icon :size="24" color="#fff"><Wallet /></el-icon>
            </div>
            <h4>支付宝收款码</h4>
            <p>扫描管理员提供的支付宝收款码付款，备注用户名后联系管理员确认</p>
            <div class="qr-placeholder">
              <el-icon :size="48" color="#C0C4CC"><Picture /></el-icon>
              <span>收款码占位</span>
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :md="8">
          <div class="guide-item">
            <div class="guide-icon" style="background: #409EFF;">
              <el-icon :size="24" color="#fff"><Connection /></el-icon>
            </div>
            <h4>第三方支付平台</h4>
            <p>可通过码支付、易支付等第三方平台接入，实现自动回调确认。如需协助配置请联系技术支持</p>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- Pay dialog -->
    <el-dialog
      v-model="payDialogVisible"
      :title="`订购 ${selectedPlan?.name || ''}`"
      width="420px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="pay-dialog-body" v-if="selectedPlan">
        <div class="pay-order-info">
          <p><strong>套餐：</strong>{{ selectedPlan.name }}</p>
          <p><strong>金额：</strong><span class="pay-amount">¥{{ selectedPlan.price }}</span></p>
          <p><strong>有效期：</strong>{{ getDurationText(selectedPlan.duration_days) }}</p>
        </div>

        <el-divider />

        <div class="pay-steps">
          <h4>付款步骤</h4>
          <ol>
            <li>联系管理员获取收款码（微信/支付宝）</li>
            <li>扫描二维码完成付款，付款时备注您的用户名</li>
            <li>将付款截图发送给管理员进行确认</li>
            <li>管理员确认后，会员自动生效</li>
          </ol>
        </div>

        <div v-if="currentOrder" class="pay-order-id">
          订单编号：<code>{{ currentOrder.id }}</code>
        </div>

        <div v-if="payError" class="pay-error">{{ payError }}</div>
      </div>

      <template #footer>
        <el-button @click="payDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="paying" @click="handleCreateOrder">
          确认下单
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  CircleCheckFilled,
  WarningFilled,
  Check,
  ChatDotRound,
  Wallet,
  Connection,
  Picture,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const plans = ref([])
const subscription = ref(null)
const hasTrialed = ref(false)

const payDialogVisible = ref(false)
const selectedPlan = ref(null)
const currentOrder = ref(null)
const paying = ref(false)
const payError = ref('')

function getDurationText(days) {
  if (days === 3) return '3天'
  if (days === 30) return '30天'
  if (days === 90) return '季度'
  if (days === 365) return '年度'
  if (days >= 9999) return '永久'
  return `${days}天`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function showPayDialog(plan) {
  selectedPlan.value = plan
  currentOrder.value = null
  payError.value = ''
  payDialogVisible.value = true
}

async function handleCreateOrder() {
  if (!auth.state?.token) {
    ElMessage.warning('请先登录')
    payDialogVisible.value = false
    return
  }

  paying.value = true
  payError.value = ''

  try {
    const resp = await fetch('/api/membership/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.state.token}`,
      },
      body: JSON.stringify({ plan_id: selectedPlan.value.id }),
    })

    const data = await resp.json()

    if (!resp.ok || !data.success) {
      throw new Error(data.error || '下单失败')
    }

    currentOrder.value = data.order
    ElMessage.success('订单已创建，请按指引完成付款')
  } catch (e) {
    payError.value = e.message
  } finally {
    paying.value = false
  }
}

async function loadData() {
  try {
    // Load plans
    const plansResp = await fetch('/api/membership/plans')
    const plansData = await plansResp.json()
    if (plansData.success) {
      plansData.plans.forEach(p => {
        try { p.features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features } catch { p.features = [] }
      })
      plans.value = plansData.plans
    }

    // Load subscription if logged in
    if (auth.state?.token) {
      const subResp = await fetch('/api/membership/my-subscription', {
        headers: { Authorization: `Bearer ${auth.state.token}` },
      })
      const subData = await subResp.json()
      if (subData.success) {
        subscription.value = subData.subscription
        hasTrialed.value = subData.hasTrialed
      }
    }
  } catch (e) {
    console.error('Load membership data error:', e)
  }
}

onMounted(loadData)
</script>

<style scoped>
.membership-page {
  padding-top: 32px;
  max-width: 1200px;
}

/* Subscription status */
.sub-status-card {
  margin-bottom: 28px;
  padding: 16px 24px;
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9ff 100%);
  border: 1px solid #d9ecff;
  border-radius: 10px;
}

.sub-expired {
  background: linear-gradient(135deg, #fef0f0 0%, #fff5f5 100%);
  border-color: #fde2e2;
}

.sub-status-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: var(--text-primary);
}

.sub-status-detail {
  margin-top: 8px;
  padding-left: 34px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* Plans grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 20px;
  margin-bottom: 36px;
}

.plan-card {
  position: relative;
  background: #fff;
  border: 2px solid #e8e8e8;
  border-radius: 14px;
  padding: 28px 20px 24px;
  text-align: center;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  border-color: #409EFF;
  box-shadow: 0 8px 24px rgba(64, 158, 255, 0.12);
  transform: translateY(-4px);
}

.plan-card--popular {
  border-color: #409EFF;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.plan-card--trial {
  border-color: #E6A23C;
  background: linear-gradient(180deg, #fdf6ec 0%, #fff 30%);
}

.plan-badge {
  position: absolute;
  top: -1px;
  right: 20px;
  background: linear-gradient(135deg, #409EFF, #66b1ff);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 16px;
  border-radius: 0 0 8px 8px;
}

.plan-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.plan-price {
  margin-bottom: 20px;
  min-height: 48px;
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.price-free {
  font-size: 32px;
  font-weight: 800;
  color: #E6A23C;
}

.price-symbol {
  font-size: 20px;
  font-weight: 600;
  color: #F56C6C;
}

.price-value {
  font-size: 36px;
  font-weight: 800;
  color: #F56C6C;
  line-height: 1;
}

.price-unit {
  font-size: 13px;
  color: var(--text-secondary);
  margin-left: 4px;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px;
  text-align: left;
  flex: 1;
}

.plan-features li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-regular);
  line-height: 1.4;
}

.plan-features li .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.plan-btn {
  width: 100%;
  margin-top: auto;
}

/* Payment guide */
.payment-guide {
  margin-bottom: 40px;
}

.guide-intro {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.guide-item {
  text-align: center;
  padding: 24px 16px;
}

.guide-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.guide-item h4 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.guide-item p {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.qr-placeholder {
  width: 140px;
  height: 140px;
  margin: 16px auto 0;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #C0C4CC;
  font-size: 12px;
}

/* Pay dialog */
.pay-order-info p {
  margin: 8px 0;
  font-size: 15px;
}

.pay-amount {
  font-size: 22px;
  font-weight: 700;
  color: #F56C6C;
}

.pay-steps h4 {
  font-size: 15px;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.pay-steps ol {
  padding-left: 20px;
  margin: 0;
}

.pay-steps li {
  font-size: 14px;
  color: var(--text-regular);
  line-height: 2;
}

.pay-order-id {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
}

.pay-order-id code {
  background: #f5f5f5;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.pay-error {
  margin-top: 12px;
  color: #F56C6C;
  font-size: 13px;
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
