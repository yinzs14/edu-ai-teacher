<template>
  <div class="app-layout">
    <AppHeader />
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <AppFooter />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import AppHeader from '@/components/Header.vue'
import AppFooter from '@/components/Footer.vue'

const router = useRouter()
const route = useRoute()

onMounted(() => {
  // Listen for token expiry events emitted by authFetch
  window.addEventListener('auth:expired', () => {
    ElMessage.warning('登录已过期，请重新登录')
    // Don't redirect if already on a public page
    if (route.path !== '/') {
      router.push({ path: '/', query: { redirect: route.fullPath } })
    }
  })
})
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-main {
  flex: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
