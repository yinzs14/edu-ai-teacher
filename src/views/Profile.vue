<template>
  <div class="profile-page page-container">
    <!-- Not logged in state -->
    <div v-if="!auth.isLoggedIn" class="empty-state">
      <el-icon :size="64" color="#c0c4cc"><UserFilled /></el-icon>
      <h2>请先登录</h2>
      <p>登录后可查看和管理您的个人资料</p>
      <el-button type="primary" size="large" @click="$router.push('/')">
        返回首页
      </el-button>
    </div>

    <template v-else>
    <!-- Page header -->
    <div class="page-header">
      <h1 class="page-title">个人中心</h1>
      <p class="page-subtitle">管理您的账户信息和个人偏好</p>
    </div>

    <el-row :gutter="24">
      <!-- Left: Profile card + avatar -->
      <el-col :xs="24" :lg="8">
        <div class="card-section profile-card">
          <div class="profile-avatar-wrap">
            <div class="profile-avatar" :class="{ 'profile-avatar--empty': !auth.userAvatar }">
              <img
                v-if="auth.userAvatar"
                :src="auth.userAvatar"
                :alt="auth.userName"
                class="avatar-img"
              />
              <el-icon v-else :size="48"><UserFilled /></el-icon>
            </div>
            <button
              class="avatar-edit-btn"
              aria-label="更换头像"
              @click="triggerAvatarUpload"
            >
              <el-icon :size="14"><Camera /></el-icon>
            </button>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              class="sr-only"
              @change="handleAvatarChange"
            />
          </div>

          <h2 class="profile-name">{{ auth.userName || '未设置' }}</h2>
          <el-tag size="small" type="primary" effect="plain" class="profile-role">
            {{ roleLabel }}
          </el-tag>
          <p v-if="auth.state?.user?.email" class="profile-email">
            {{ auth.state.user.email }}
          </p>

          <el-divider style="margin: 20px 0;" />

          <!-- Subscription status -->
          <div v-if="subscription" class="sub-status-card">
            <div class="sub-status-header">
              <el-icon :size="18" :color="subscription.plan_name === '免费试用' ? '#E6A23C' : '#67C23A'">
                <CircleCheckFilled />
              </el-icon>
              <span>{{ subscription.plan_name }}</span>
              <el-tag
                :type="subscription.plan_name === '免费试用' ? 'warning' : 'success'"
                size="small"
              >生效中</el-tag>
            </div>
            <div class="sub-status-date" v-if="subscription.end_date">
              到期：{{ formatSubDate(subscription.end_date) }}
            </div>
            <el-button
              v-if="subscription.plan_name === '免费试用'"
              type="primary"
              size="small"
              text
              class="sub-renew-btn"
              @click="$router.push('/membership')"
            >
              升级会员 →
            </el-button>
          </div>
          <div v-else-if="hasTrialed" class="sub-status-card sub-expired">
            <div class="sub-status-header">
              <el-icon :size="18" color="#F56C6C"><WarningFilled /></el-icon>
              <span>试用已过期</span>
            </div>
            <el-button type="primary" size="small" text class="sub-renew-btn" @click="$router.push('/membership')">
              立即开通 →
            </el-button>
          </div>

          <el-divider style="margin: 20px 0;" />

          <div class="profile-stats">
            <div class="stat-item">
              <span class="stat-value">12</span>
              <span class="stat-label">备课次数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">3</span>
              <span class="stat-label">诊断报告</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">7</span>
              <span class="stat-label">课件生成</span>
            </div>
          </div>
        </div>
      </el-col>

      <!-- Right: Settings form -->
      <el-col :xs="24" :lg="16">
        <div id="settings" class="card-section settings-section">
          <h3 class="section-heading">基本信息</h3>

          <el-form
            ref="profileFormRef"
            :model="form"
            :rules="formRules"
            label-position="top"
            size="large"
            class="settings-form"
          >
            <el-form-item label="用户名" prop="username">
              <el-input
                v-model="form.username"
                placeholder="3-20位字母、数字或下划线"
                maxlength="20"
                show-word-limit
                clearable
              />
            </el-form-item>

            <el-form-item label="显示名称" prop="name">
              <el-input
                v-model="form.name"
                placeholder="显示给其他用户的名字"
                maxlength="20"
                show-word-limit
                clearable
              />
            </el-form-item>

            <el-form-item label="邮箱" prop="email">
              <el-input
                v-model="form.email"
                placeholder="用于接收通知和找回密码"
                type="email"
                clearable
              />
            </el-form-item>

            <el-form-item label="手机号" prop="phone">
              <el-input
                v-model="form.phone"
                placeholder="选填，用于安全验证"
                maxlength="11"
                clearable
              />
            </el-form-item>

            <el-form-item label="所在学校" prop="school">
              <el-input
                v-model="form.school"
                placeholder="选填"
                clearable
              />
            </el-form-item>

            <div class="form-actions">
              <el-button
                type="primary"
                :loading="saving"
                @click="handleSave"
              >
                保存修改
              </el-button>
              <el-button @click="resetForm">重置</el-button>
            </div>
          </el-form>
        </div>

        <!-- Security section -->
        <div class="card-section security-section" style="margin-top: 24px;">
          <h3 class="section-heading">账户安全</h3>

          <div class="security-list">
            <div class="security-item">
              <div class="security-info">
                <div class="security-icon">
                  <el-icon :size="20"><Lock /></el-icon>
                </div>
                <div class="security-detail">
                  <span class="security-label">登录密码</span>
                  <span class="security-desc">定期更改密码以保护账户安全</span>
                </div>
              </div>
              <el-button text type="primary" @click="showPasswordDialog = true">
                修改密码
              </el-button>
            </div>

            <el-divider style="margin: 16px 0;" />

            <div class="security-item">
              <div class="security-info">
                <div class="security-icon security-icon--warn">
                  <el-icon :size="20"><Warning /></el-icon>
                </div>
                <div class="security-detail">
                  <span class="security-label">注销账户</span>
                  <span class="security-desc">永久删除您的所有数据，此操作不可撤销</span>
                </div>
              </div>
              <el-button text type="danger" @click="handleDeleteAccount">
                注销账户
              </el-button>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    </template>
    <!-- Change Password Dialog -->
    <el-dialog
      v-model="showPasswordDialog"
      title="修改密码"
      width="400px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="pwdFormRef"
        :model="pwdForm"
        :rules="pwdRules"
        label-position="top"
        size="large"
      >
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input
            v-model="pwdForm.oldPassword"
            type="password"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="pwdForm.newPassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="至少6位，包含字母和数字"
          />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input
            v-model="pwdForm.confirmPassword"
            type="password"
            show-password
            autocomplete="new-password"
            placeholder="再次输入新密码"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPasswordDialog = false">取消</el-button>
        <el-button type="primary" :loading="changingPwd" @click="handleChangePassword">
          确认修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserFilled,
  Camera,
  Lock,
  Warning,
  CircleCheckFilled,
  WarningFilled,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const roleLabel = computed(() => {
  const map = { teacher: '教师', student: '学生', admin: '管理员' }
  return map[auth.userRole] || '用户'
})

// Avatar upload
const avatarInputRef = ref(null)

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

function handleAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请选择图片文件')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return
  }

  const reader = new FileReader()
  reader.onload = (ev) => {
    auth.updateProfile({ avatar: ev.target.result })
    ElMessage.success('头像已更新')
  }
  reader.readAsDataURL(file)
  e.target.value = ''
}

// Subscription
const subscription = ref(null)
const hasTrialed = ref(false)

function formatSubDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function loadSubscription() {
  if (!auth.state?.token) return
  try {
    const resp = await fetch('/api/membership/my-subscription', {
      headers: { Authorization: `Bearer ${auth.state.token}` },
    })
    const data = await resp.json()
    if (data.success) {
      subscription.value = data.subscription
      hasTrialed.value = data.hasTrialed
    }
  } catch (e) {
    console.error('Load subscription error:', e)
  }
}

// Profile form
const profileFormRef = ref(null)
const saving = ref(false)

const form = reactive({
  username: '',
  name: '',
  email: '',
  phone: '',
  school: '',
})

const formRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,20}$/, message: '3-20位字母、数字或下划线', trigger: 'blur' },
  ],
  name: [
    { max: 20, message: '最多20个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号', trigger: 'blur' },
  ],
}

function loadFormData() {
  const u = auth.state?.user || {}
  form.username = u.username || ''
  form.name = u.name || ''
  form.email = u.email || ''
  form.phone = u.phone || ''
  form.school = u.school || ''
}

function resetForm() {
  loadFormData()
  ElMessage.info('已重置为当前信息')
}

async function handleSave() {
  try {
    await profileFormRef.value.validate()
  } catch {
    return
  }

  saving.value = true

  try {
    const resp = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.state.token}`,
      },
      body: JSON.stringify({
        username: form.username,
        name: form.name || form.username,
        email: form.email,
        phone: form.phone,
        school: form.school,
      }),
    })

    const data = await resp.json()

    if (!resp.ok || !data.success) {
      throw new Error(data.error || '保存失败，请稍后重试')
    }

    auth.updateProfile({
      username: form.username,
      name: form.name || form.username,
      email: form.email,
      phone: form.phone,
      school: form.school,
    })

    ElMessage.success('个人信息已保存')
  } catch (err) {
    ElMessage.error(err.message || '保存失败，请检查网络连接')
  } finally {
    saving.value = false
  }
}

// Password change
const showPasswordDialog = ref(false)
const pwdFormRef = ref(null)
const changingPwd = ref(false)

const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const validateConfirm = (_rule, value, callback) => {
  if (value !== pwdForm.newPassword) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const pwdRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
    { pattern: /(?=.*[a-zA-Z])(?=.*\d)/, message: '需包含字母和数字', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirm, trigger: 'blur' },
  ],
}

async function handleChangePassword() {
  try {
    await pwdFormRef.value.validate()
  } catch {
    return
  }

  changingPwd.value = true
  try {
    const resp = await fetch('/api/auth/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.state.token}`,
      },
      body: JSON.stringify({
        oldPassword: pwdForm.oldPassword,
        newPassword: pwdForm.newPassword,
      }),
    })

    const data = await resp.json()

    if (!resp.ok || !data.success) {
      throw new Error(data.error || '密码修改失败，请稍后重试')
    }

    showPasswordDialog.value = false
    ElMessage.success('密码修改成功，请重新登录')
    auth.logout()
    router.push('/')
  } catch (err) {
    ElMessage.error(err.message || '密码修改失败，请检查网络连接')
  } finally {
    changingPwd.value = false
  }
  auth.logout()
  router.push('/')
}

async function handleDeleteAccount() {
  try {
    await ElMessageBox.confirm(
      '注销后将永久删除所有数据（诊断记录、课件等），此操作不可撤销。确定要继续吗？',
      '危险操作',
      {
        confirmButtonText: '确定注销',
        cancelButtonText: '取消',
        type: 'error',
        confirmButtonClass: 'el-button--danger',
      }
    )
    // In real app this would call an API
    ElMessage.warning('演示模式：账户未实际删除')
  } catch {
    // cancelled
  }
}

onMounted(() => {
  loadFormData()
  loadSubscription()
})
</script>

<style scoped>
.profile-page {
  padding-top: 32px;
}

/* Empty / not-logged-in state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 80px 20px;
  gap: 12px;
}

.empty-state h2 {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 16px;
}

.empty-state p {
  font-size: 15px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

/* Page header */
.page-header {
  margin-bottom: 28px;
}

/* Profile card (left column) */
.profile-card {
  text-align: center;
  position: sticky;
  top: 80px;
}

.profile-avatar-wrap {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.profile-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, #66b1ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 4px solid #fff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.25);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-edit-btn {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  border: 2px solid #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.avatar-edit-btn:hover {
  background: var(--primary-dark);
  transform: scale(1.1);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* User info in card */
.profile-name {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.profile-role {
  font-size: 13px;
}

.profile-email {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 8px;
}

/* Stats */
.profile-stats {
  display: flex;
  justify-content: space-around;
  padding-top: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 12px;
  color: var(--text-secondary);
}

/* Section heading */
.section-heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

/* Form actions */
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

/* Security section */
.security-list {
  padding-top: 4px;
}

.security-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
}

.security-info {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.security-icon {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 10px;
  background: var(--primary-light);
  color: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.security-icon--warn {
  background: #fef0f0;
  color: #f56c6c;
}

.security-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.security-label {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary);
}

.security-desc {
  font-size: 13px;
  color: var(--text-secondary);
}

/* Subscription status in profile card */
.sub-status-card {
  padding: 12px 0;
}

.sub-status-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.sub-status-date {
  text-align: center;
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.sub-renew-btn {
  display: block;
  margin: 8px auto 0;
  font-size: 13px;
}

.sub-expired .sub-status-header {
  color: #F56C6C;
}

/* ===== Mobile responsive ===== */
@media (max-width: 992px) {
  .profile-card {
    position: static;
    margin-bottom: 20px;
  }
}
</style>
