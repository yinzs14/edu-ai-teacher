<template>
  <el-dialog
    v-model="visible"
    :title="null"
    width="420px"
    :class="{ 'auth-dialog--mobile': isMobile }"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
    :show-close="true"
    class="auth-dialog"
    destroy-on-close
    @opened="onOpened"
    @closed="onClosed"
  >
    <div class="auth-dialog__body">
      <!-- Logo / Brand -->
      <div class="auth-brand">
        <el-icon :size="32" color="#409EFF"><Reading /></el-icon>
        <h2 class="auth-brand__title">教育AI备课助手</h2>
        <p class="auth-brand__subtitle">{{ isLogin ? '欢迎回来' : '创建账号' }}</p>
      </div>

      <!-- Tabs -->
      <div class="auth-tabs" role="tablist" aria-label="登录/注册切换">
        <button
          role="tab"
          :aria-selected="isLogin"
          :class="['auth-tab', { active: isLogin }]"
          @click="switchTab(true)"
          ref="loginTabRef"
        >登录</button>
        <button
          role="tab"
          :aria-selected="!isLogin"
          :class="['auth-tab', { active: !isLogin }]"
          @click="switchTab(false)"
          ref="registerTabRef"
        >注册</button>
      </div>

      <!-- Error Alert -->
      <el-alert
        v-if="errorMsg"
        :title="errorMsg"
        type="error"
        show-icon
        :closable="true"
        @close="errorMsg = ''"
        class="auth-error"
      />

      <!-- Login Form -->
      <form
        v-if="isLogin"
        class="auth-form"
        @submit.prevent="handleLogin"
        novalidate
        aria-label="登录表单"
      >
        <div class="form-group">
          <label for="login-username" class="form-label">
            <el-icon><User /></el-icon> 用户名
          </label>
          <el-input
            id="login-username"
            ref="loginInputRef"
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
            clearable
            autocomplete="username"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="login-password" class="form-label">
            <el-icon><Lock /></el-icon> 密码
          </label>
          <el-input
            id="login-password"
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
            :disabled="loading"
            @keyup.enter="handleLogin"
          />
        </div>

        <div class="form-options">
          <el-checkbox v-model="loginForm.remember" :disabled="loading">
            记住我
          </el-checkbox>
          <a href="javascript:void(0)" class="forgot-link" @click.stop="handleForgotPassword">
            忘记密码？
          </a>
        </div>

        <el-button
          type="primary"
          size="large"
          class="auth-submit"
          :loading="loading"
          native-type="submit"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </form>

      <!-- Register Form -->
      <form
        v-else
        class="auth-form"
        @submit.prevent="handleRegister"
        novalidate
        aria-label="注册表单"
      >
        <div class="form-group">
          <label for="reg-username" class="form-label">
            <el-icon><User /></el-icon> 用户名
          </label>
          <el-input
            id="reg-username"
            ref="regInputRef"
            v-model="registerForm.username"
            placeholder="3-20位字母、数字或下划线"
            size="large"
            :prefix-icon="User"
            clearable
            autocomplete="username"
            :disabled="loading"
            maxlength="20"
          />
        </div>

        <div class="form-group">
          <label for="reg-email" class="form-label">
            <el-icon><Message /></el-icon> 邮箱
          </label>
          <el-input
            id="reg-email"
            v-model="registerForm.email"
            placeholder="用于找回密码和通知"
            size="large"
            :prefix-icon="Message"
            clearable
            autocomplete="email"
            type="email"
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="reg-password" class="form-label">
            <el-icon><Lock /></el-icon> 密码
          </label>
          <el-input
            id="reg-password"
            v-model="registerForm.password"
            type="password"
            placeholder="至少6位，包含字母和数字"
            size="large"
            :prefix-icon="Lock"
            show-password
            autocomplete="new-password"
            :disabled="loading"
            maxlength="32"
          />
        </div>

        <div class="form-group">
          <label for="reg-confirm" class="form-label">
            <el-icon><Lock /></el-icon> 确认密码
          </label>
          <el-input
            id="reg-confirm"
            v-model="registerForm.confirmPassword"
            type="password"
            placeholder="再次输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            autocomplete="new-password"
            :disabled="loading"
            maxlength="32"
            @keyup.enter="handleRegister"
          />
        </div>

        <el-button
          type="primary"
          size="large"
          class="auth-submit"
          :loading="loading"
          native-type="submit"
        >
          {{ loading ? '注册中...' : '注 册' }}
        </el-button>

        <div class="form-agreement">
          <el-checkbox v-model="registerForm.agreed" :disabled="loading">
            我已阅读并同意
            <a href="javascript:void(0)" class="agreement-link" @click.stop>《服务条款》</a>
            和
            <a href="javascript:void(0)" class="agreement-link" @click.stop>《隐私政策》</a>
          </el-checkbox>
        </div>
      </form>

      <!-- Footer tip -->
      <p class="auth-footer-tip">
        {{ isLogin ? '还没有账号？' : '已有账号？' }}
        <a
          href="javascript:void(0)"
          class="auth-switch-link"
          @click="switchTab(!isLogin)"
          @keydown.enter.space.prevent="switchTab(!isLogin)"
        >
          {{ isLogin ? '立即注册' : '去登录' }}
        </a>
      </p>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { Reading, User, Lock, Message } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['success'])

const auth = useAuthStore()

const visible = defineModel({ type: Boolean, default: false })
const isLogin = ref(true)
const loading = ref(false)
const errorMsg = ref('')
const isMobile = computed(() => window.innerWidth <= 480)

// Refs for focus management
const loginTabRef = ref(null)
const registerTabRef = ref(null)
const loginInputRef = ref(null)
const regInputRef = ref(null)

const loginForm = reactive({
  username: '',
  password: '',
  remember: true,
})

const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreed: false,
})

function switchTab(toLogin) {
  if (toLogin === isLogin.value) return
  isLogin.value = toLogin
  errorMsg.value = ''
  nextTick(() => {
    focusFirstInput()
  })
}

function focusFirstInput() {
  nextTick(() => {
    if (isLogin.value) {
      loginInputRef.value?.focus()
    } else {
      regInputRef.value?.focus()
    }
  })
}

function onOpened() {
  errorMsg.value = ''
  focusFirstInput()
}

function onClosed() {
  loginForm.username = ''
  loginForm.password = ''
  registerForm.username = ''
  registerForm.email = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
  registerForm.agreed = false
  errorMsg.value = ''
}

function handleForgotPassword() {
  // TODO: 实现忘记密码流程（邮箱验证码重置）
  errorMsg.value = '忘记密码功能即将上线，请联系管理员重置密码'
}

function validateLoginForm() {
  if (!loginForm.username.trim()) {
    errorMsg.value = '请输入用户名'
    return false
  }
  if (!loginForm.password) {
    errorMsg.value = '请输入密码'
    return false
  }
  if (loginForm.password.length < 4) {
    errorMsg.value = '密码至少4位'
    return false
  }
  return true
}

function validateRegisterForm() {
  if (!registerForm.username.trim()) {
    errorMsg.value = '请输入用户名'
    return false
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(registerForm.username)) {
    errorMsg.value = '用户名为3-20位字母、数字或下划线'
    return false
  }
  if (!registerForm.email.trim()) {
    errorMsg.value = '请输入邮箱'
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
    errorMsg.value = '请输入有效的邮箱地址'
    return false
  }
  if (!registerForm.password) {
    errorMsg.value = '请输入密码'
    return false
  }
  if (registerForm.password.length < 6) {
    errorMsg.value = '密码至少6位'
    return false
  }
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(registerForm.password)) {
    errorMsg.value = '密码需包含字母和数字'
    return false
  }
  if (registerForm.password !== registerForm.confirmPassword) {
    errorMsg.value = '两次输入的密码不一致'
    return false
  }
  if (!registerForm.agreed) {
    errorMsg.value = '请阅读并同意服务条款和隐私政策'
    return false
  }
  return true
}

async function handleLogin() {
  if (loading.value) return
  if (!validateLoginForm()) return

  loading.value = true
  errorMsg.value = ''

  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: loginForm.username,
        password: loginForm.password,
        remember: loginForm.remember,
      }),
    })

    const data = await resp.json()

    if (!resp.ok || !data.success) {
      throw new Error(data.error || '登录失败，请检查用户名和密码')
    }

    auth.setUser(data.user, data.token)
    visible.value = false
    emit('success', { action: 'login', user: data.user })
  } catch (err) {
    if (err.name === 'TypeError' && !err.message) {
      errorMsg.value = '网络连接失败，请检查网络后重试'
    } else {
      errorMsg.value = err.message || '登录失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (loading.value) return
  if (!validateRegisterForm()) return

  loading.value = true
  errorMsg.value = ''

  try {
    const resp = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
      }),
    })

    const data = await resp.json()

    if (!resp.ok || !data.success) {
      throw new Error(data.error || '注册失败，请稍后重试')
    }

    auth.setUser(data.user, data.token)
    visible.value = false
    emit('success', { action: 'register', user: data.user })
  } catch (err) {
    if (err.name === 'TypeError' && !err.message) {
      errorMsg.value = '网络连接失败，请检查网络后重试'
    } else {
      errorMsg.value = err.message || '注册失败，请稍后重试'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-dialog__body {
  padding: 8px 0;
}

/* Brand */
.auth-brand {
  text-align: center;
  margin-bottom: 24px;
}

.auth-brand__title {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  margin-top: 8px;
  letter-spacing: 1px;
}

.auth-brand__subtitle {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: #f5f7fa;
  border-radius: 10px;
  padding: 3px;
  margin-bottom: 24px;
}

.auth-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.25s ease;
  outline: none;
}

.auth-tab:hover:not(.active) {
  color: var(--text-primary);
}

.auth-tab.active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  font-weight: 600;
}

/* Error alert */
.auth-error {
  margin-bottom: 16px;
}

/* Form */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-regular);
}

.form-label .el-icon {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Options row */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.forgot-link {
  font-size: 13px;
  color: var(--primary);
  text-decoration: none;
  cursor: pointer;
}

.forgot-link:hover {
  text-decoration: underline;
}

/* Submit button */
.auth-submit {
  width: 100%;
  height: 44px !important;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  letter-spacing: 4px;
  margin-top: 4px;
}

/* Footer link */
.auth-footer-tip {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 20px;
}

.auth-switch-link {
  color: var(--primary);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  margin-left: 4px;
}

.auth-switch-link:hover {
  color: var(--primary-dark);
  text-decoration: underline;
}

.auth-switch-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Agreement checkbox */
.form-agreement {
  margin-top: 4px;
}

.form-agreement .el-checkbox__label {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.agreement-link {
  color: var(--primary);
  text-decoration: none;
}

.agreement-link:hover {
  text-decoration: underline;
}

/* ===== Mobile responsive ===== */
@media (max-width: 480px) {
  .auth-dialog__body {
    padding: 4px 0;
  }

  .auth-brand__title {
    font-size: 18px;
  }

  .auth-tab {
    font-size: 14px;
    padding: 9px 0;
  }
}

/* Dialog full-width on very small screens */
.auth-dialog--mobile :deep(.el-dialog) {
  width: 95% !important;
  max-width: 420px;
}
</style>
