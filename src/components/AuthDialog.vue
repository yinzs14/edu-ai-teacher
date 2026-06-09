<template>
  <el-dialog
    v-model="visible"
    :title="isLogin ? '登录' : '注册'"
    width="420px"
    :close-on-click-modal="false"
    :lock-scroll="true"
    class="auth-dialog"
    @closed="resetForm"
  >
    <!-- Tab 切换 -->
    <div class="auth-tabs" role="tablist">
      <button
        role="tab"
        :aria-selected="isLogin"
        :class="['auth-tab', { active: isLogin }]"
        @click="isLogin = true"
      >登录</button>
      <button
        role="tab"
        :aria-selected="!isLogin"
        :class="['auth-tab', { active: !isLogin }]"
        @click="isLogin = false"
      >注册</button>
    </div>

    <!-- 登录表单 -->
    <el-form
      v-if="isLogin"
      ref="loginFormRef"
      :model="loginForm"
      :rules="loginRules"
      label-position="top"
      @submit.prevent="handleLogin"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="loginForm.username"
          placeholder="请输入用户名"
          :prefix-icon="User"
          size="large"
          @keyup.enter="handleLogin"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="loginForm.password"
          type="password"
          placeholder="请输入密码"
          :prefix-icon="Lock"
          size="large"
          show-password
          @keyup.enter="handleLogin"
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="submit-btn"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 注册表单 -->
    <el-form
      v-else
      ref="registerFormRef"
      :model="registerForm"
      :rules="registerRules"
      label-position="top"
      @submit.prevent="handleRegister"
    >
      <el-form-item label="用户名" prop="username">
        <el-input
          v-model="registerForm.username"
          placeholder="2-20个字符"
          :prefix-icon="User"
          size="large"
        />
      </el-form-item>
      <el-form-item label="昵称" prop="nickname">
        <el-input
          v-model="registerForm.nickname"
          placeholder="可选，默认为用户名"
          :prefix-icon="Sunny"
          size="large"
        />
      </el-form-item>
      <el-form-item label="密码" prop="password">
        <el-input
          v-model="registerForm.password"
          type="password"
          placeholder="至少6个字符"
          :prefix-icon="Lock"
          size="large"
          show-password
        />
      </el-form-item>
      <el-form-item label="确认密码" prop="confirmPassword">
        <el-input
          v-model="registerForm.confirmPassword"
          type="password"
          placeholder="再次输入密码"
          :prefix-icon="Lock"
          size="large"
          show-password
        />
      </el-form-item>
      <el-form-item>
        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="submit-btn"
          @click="handleRegister"
        >
          {{ loading ? '注册中...' : '注册' }}
        </el-button>
      </el-form-item>
    </el-form>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="auth-error">
      <el-icon><WarningFilled /></el-icon>
      {{ errorMsg }}
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { User, Lock, Sunny, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUser } from '@/composables/useUser'

const { login: saveLogin, authFetch } = useUser()

const visible = defineModel('visible', { default: false })

const isLogin = ref(true)
const loading = ref(false)
const errorMsg = ref('')
const loginFormRef = ref(null)
const registerFormRef = ref(null)

const loginForm = reactive({ username: '', password: '' })
const registerForm = reactive({ username: '', nickname: '', password: '', confirmPassword: '' })

const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const validateConfirmPassword = (rule, value, callback) => {
  if (!value) callback(new Error('请再次输入密码'))
  else if (value !== registerForm.password) callback(new Error('两次密码不一致'))
  else callback()
}

const registerRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度需在 2-20 个字符之间', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度需在 6-50 个字符之间', trigger: 'blur' },
  ],
  confirmPassword: [{ validator: validateConfirmPassword, trigger: 'blur' }],
}

function resetForm() {
  errorMsg.value = ''
  loginForm.username = ''
  loginForm.password = ''
  registerForm.username = ''
  registerForm.nickname = ''
  registerForm.password = ''
  registerForm.confirmPassword = ''
  loginFormRef.value?.resetFields()
  registerFormRef.value?.resetFields()
}

async function handleLogin() {
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''

  try {
    const { ok, data } = await authFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: loginForm.username, password: loginForm.password }),
    })

    if (ok && data.success) {
      saveLogin(data.data.token, data.data.user)
      ElMessage.success(`欢迎回来，${data.data.user.nickname || data.data.user.username}`)
      visible.value = false
    } else {
      errorMsg.value = data.error || '登录失败'
    }
  } catch (e) {
    errorMsg.value = '网络错误，请检查网络连接后重试'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''

  try {
    const { ok, data } = await authFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: registerForm.username,
        password: registerForm.password,
        nickname: registerForm.nickname || registerForm.username,
      }),
    })

    if (ok && data.success) {
      saveLogin(data.data.token, data.data.user)
      ElMessage.success('注册成功，欢迎加入！')
      visible.value = false
    } else {
      errorMsg.value = data.error || '注册失败'
    }
  } catch (e) {
    errorMsg.value = '网络错误，请检查网络连接后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-dialog :deep(.el-dialog__header) {
  border-bottom: none;
  padding-bottom: 0;
}
.auth-dialog :deep(.el-dialog__body) {
  padding-top: 8px;
}
.auth-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-bottom: 2px solid #e4e7ed;
}
.auth-tab {
  flex: 1;
  padding: 10px 0;
  border: none;
  background: none;
  font-size: 16px;
  color: #909399;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}
.auth-tab:hover { color: #606266; }
.auth-tab.active {
  color: var(--primary, #409eff);
  font-weight: 600;
}
.auth-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--primary, #409eff);
}
.submit-btn {
  width: 100%;
}
.auth-error {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 6px;
  color: #f56c6c;
  font-size: 13px;
  margin-top: -8px;
}
</style>
