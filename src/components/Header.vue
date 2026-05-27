<template>
  <header class="site-header">
    <div class="header-inner">
      <router-link to="/" class="logo">
        <el-icon :size="28"><Reading /></el-icon>
        <span class="logo-text">教育AI备课助手</span>
      </router-link>

      <el-button
        class="menu-toggle"
        :icon="menuOpen ? Close : Menu"
        circle
        @click="menuOpen = !menuOpen"
      />

      <nav class="nav" :class="{ open: menuOpen }">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-link"
          @click="menuOpen = false"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          {{ item.label }}
        </router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { Menu, Close, Reading, HomeFilled, Camera, Document, Share } from '@element-plus/icons-vue'

const menuOpen = ref(false)

const navItems = [
  { path: '/', label: '首页', icon: HomeFilled },
  { path: '/diagnose', label: '学情诊断', icon: Camera },
  { path: '/courseware', label: '课件生成', icon: Document },
  { path: '/knowledge', label: '知识树', icon: Share },
]
</script>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 16px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
  font-weight: 600;
  font-size: 18px;
}

.logo-text {
  white-space: nowrap;
}

.menu-toggle {
  display: none;
}

.nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 8px;
  color: var(--text-regular);
  font-size: 15px;
  transition: all 0.2s;
}

.nav-link:hover {
  color: var(--primary);
  background: var(--primary-light);
}

.nav-link.router-link-active {
  color: var(--primary);
  background: var(--primary-light);
  font-weight: 500;
}

@media (max-width: 768px) {
  .menu-toggle {
    display: inline-flex;
  }

  .nav {
    position: absolute;
    top: 64px;
    left: 0;
    right: 0;
    flex-direction: column;
    background: #fff;
    padding: 12px 16px 20px;
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08);
    transform: translateY(-10px);
    opacity: 0;
    pointer-events: none;
    transition: all 0.25s;
  }

  .nav.open {
    transform: translateY(0);
    opacity: 1;
    pointer-events: auto;
  }

  .nav-link {
    width: 100%;
    padding: 12px 16px;
  }

  .logo-text {
    font-size: 16px;
  }
}
</style>
