import { reactive, computed } from 'vue'

// Safely parse stored user data — clear corrupted state
function getStoredUser() {
  try {
    const raw = localStorage.getItem('edu_user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate minimum shape
    if (parsed && typeof parsed === 'object' && parsed.username) return parsed
    return null
  } catch {
    localStorage.removeItem('edu_user')
    return null
  }
}

const state = reactive({
  user: getStoredUser(),
  token: localStorage.getItem('edu_token') || null,
})

let _initialized = false

export function useAuthStore() {
  const isLoggedIn = computed(() => !!state.user)
  const userName = computed(() => state.user?.name || state.user?.username || '')
  const userAvatar = computed(() => state.user?.avatar || '')
  const userRole = computed(() => state.user?.role || 'teacher')

  function setUser(user, token) {
    state.user = user
    state.token = token
    localStorage.setItem('edu_user', JSON.stringify(user))
    if (token) localStorage.setItem('edu_token', token)
  }

  function logout() {
    state.user = null
    state.token = null
    localStorage.removeItem('edu_user')
    localStorage.removeItem('edu_token')
  }

  function updateProfile(updates) {
    if (state.user) {
      Object.assign(state.user, updates)
      localStorage.setItem('edu_user', JSON.stringify(state.user))
    }
  }

  /**
   * Authenticated fetch wrapper.
   * Auto-attaches Bearer token; on 401/TOKEN_EXPIRED, auto-logs out.
   * Returns { ok, data, status } for consistent error handling.
   */
  async function authFetch(url, options = {}) {
    const headers = {
      ...options.headers,
      'Content-Type': options.headers?.['Content-Type'] || 'application/json',
    }
    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`
    }

    try {
      const resp = await fetch(url, { ...options, headers })
      let data
      try { data = await resp.json() } catch { data = {} }

      // Handle token expiry / auth failure globally
      if ((resp.status === 401 || data?.code === 'TOKEN_EXPIRED') && _initialized) {
        logout()
        window.dispatchEvent(new CustomEvent('auth:expired'))
      }

      return { ok: resp.ok, data, status: resp.status }
    } catch (err) {
      return { ok: false, data: { error: err.message || '网络连接失败' }, status: 0 }
    }
  }

  /**
   * Initialize auth state (call once on app mount).
   * Validates stored credentials, clears invalid state.
   */
  async function init() {
    if (_initialized) return
    _initialized = true

    // If we have a token and user, verify with server
    if (state.token && state.user?.id) {
      try {
        const result = await authFetch('/api/auth/me')
        if (!result.ok || !result.data?.user) {
          // Token is invalid or server unreachable with valid token
          // Keep client-side state but don't force logout on network errors
          if (result.status === 401 || result.data?.code === 'TOKEN_EXPIRED' || result.data?.code === 'INVALID_TOKEN') {
            logout()
          }
        } else {
          // Sync latest user data from server
          Object.assign(state.user, result.data.user)
          localStorage.setItem('edu_user', JSON.stringify(state.user))
        }
      } catch {
        // Network error — keep existing state, user can still use app offline
      }
    }
  }

  return {
    state,
    isLoggedIn,
    userName,
    userAvatar,
    userRole,
    setUser,
    logout,
    updateProfile,
    authFetch,
    init,
  }
}
