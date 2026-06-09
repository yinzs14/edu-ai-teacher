// ==================== 用户状态管理（轻量 Composable，无需 Pinia）====================
import { reactive, readonly, computed } from 'vue'

const TOKEN_KEY = 'edu_ai_token'
const USER_KEY = 'edu_ai_user'

// 从 localStorage 恢复登录状态
function loadState() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const userStr = localStorage.getItem(USER_KEY)
    if (token && userStr) {
      const user = JSON.parse(userStr)
      return { token, user, isLoggedIn: true }
    }
  } catch (e) {
    // 数据损坏，清除
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }
  return { token: null, user: null, isLoggedIn: false }
}

const state = reactive(loadState())

// 单例引用
let instance = null

export function useUser() {
  if (instance) return instance

  /** 登录成功后保存状态 */
  function login(token, user) {
    state.token = token
    state.user = user
    state.isLoggedIn = true
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  }

  /** 登出，清除所有状态 */
  function logout() {
    state.token = null
    state.user = null
    state.isLoggedIn = false
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  /** 刷新用户信息（如修改昵称后） */
  function updateUser(user) {
    state.user = { ...state.user, ...user }
    localStorage.setItem(USER_KEY, JSON.stringify(state.user))
  }

  /** 获取 Authorization header */
  const authHeader = computed(() => {
    return state.token ? { Authorization: `Bearer ${state.token}` } : {}
  })

  /** API 封装：自动附带 token */
  async function authFetch(url, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...authHeader.value,
      ...options.headers,
    }
    const resp = await fetch(url, { ...options, headers })
    const data = await resp.json()

    // 如果 token 过期，自动登出
    if (resp.status === 401) {
      logout()
    }

    return { ok: resp.ok, status: resp.status, data }
  }

  instance = {
    state: readonly(state),
    login,
    logout,
    updateUser,
    authHeader,
    authFetch,
  }

  return instance
}
