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
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  document.title = to.meta.title
    ? `${to.meta.title} - 教育AI备课助手`
    : '教育AI备课助手'
})

export default router
