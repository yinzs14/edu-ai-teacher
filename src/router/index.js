import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/diagnose',
    name: 'Diagnose',
    component: () => import('@/views/Diagnose.vue'),
    meta: { title: '学情诊断' },
  },
  {
    path: '/courseware',
    name: 'Courseware',
    component: () => import('@/views/Courseware.vue'),
    meta: { title: '课件生成' },
  },
  {
    path: '/knowledge',
    name: 'KnowledgeTree',
    component: () => import('@/views/KnowledgeTree.vue'),
    meta: { title: '知识树' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { title: '个人中心' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 全局路由守卫 — 验证 token 有效性（不拦截）
let tokenVerified = false
router.beforeEach(async (to) => {
  document.title = to.meta.title
    ? `${to.meta.title} - 教育AI备课助手`
    : '教育AI备课助手'

  // 首次加载时验证本地 token 是否仍然有效
  if (!tokenVerified) {
    tokenVerified = true
    const token = localStorage.getItem('edu_ai_token')
    if (token) {
      try {
        const resp = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) {
          // token 失效，清除本地状态
          localStorage.removeItem('edu_ai_token')
          localStorage.removeItem('edu_ai_user')
        }
        // 即使 token 有效，useUser() composable 也会在下次调用时从 localStorage 恢复
      } catch {
        // 网络错误，保留本地状态
      }
    }
  }
})

export default router
