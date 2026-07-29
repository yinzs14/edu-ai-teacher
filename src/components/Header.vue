<template>
  <header class="site-header">
    <div class="header-inner">
      <router-link to="/" class="logo">
        <el-icon :size="28"><Reading /></el-icon>
        <span class="logo-text">教育AI备课助手</span>
      </router-link>

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

        <!-- Mobile-only login entry when not logged in -->
        <a
          v-if="!auth.isLoggedIn"
          href="javascript:void(0)"
          class="nav-link nav-login-entry"
          @click="menuOpen = false; showAuthDialog = true"
        >
          <el-icon><UserFilled /></el-icon>
          登录 / 注册
        </a>
      </nav>

      <!-- Auth area -->
      <div class="header-auth">
        <!-- Logged in: UserMenu -->
        <UserMenu v-if="auth.isLoggedIn" />

        <!-- Not logged in: Login button -->
        <el-button
          v-else
          type="primary"
          round
          class="login-btn"
          @click="showAuthDialog = true"
        >
          登录 / 注册
        </el-button>
      </div>

      <!-- Mobile menu toggle (only when not logged in on mobile) -->
      <el-button
        v-if="!auth.isLoggedIn || isMobile"
        class="menu-toggle"
        :icon="menuOpen ? Close : Menu"
        circle
        size="small"
        @click="menuOpen = !menuOpen"
      />
    </div>

    <!-- Auth Dialog -->
    <AuthDialog v-model="showAuthDialog" @success="onAuthSuccess" />
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  Menu,
  Close,
  Reading,
  HomeFilled,
  Camera,
  Document,
  Share,
  UserFilled,
  Star,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import AuthDialog from './AuthDialog.vue'
import UserMenu from './UserMenu.vue'

const auth = useAuthStore()

const menuOpen = ref(false)
const showAuthDialog = ref(false)
const windowWidth = ref(window.innerWidth)
const isMobile = computed(() => windowWidth.value <= 768)

const navItems = [
  { path: '/', label: '首页', icon: HomeFilled },
  { path: '/diagnose', label: '学情诊断', icon: Camera },
  { path: '/courseware', label: '课件生成', icon: Document },
  { path: '/knowledge', label: '知识树', icon: Share },
  { path: '/membership', label: '会员', icon: Star },
]

function onResize() {
  windowWidth.value = window.innerWidth
  if (!isMobile.value) menuOpen.value = false
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

function onAuthSuccess(data) {
  menuOpen.value = false
}
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
  gap: 12px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--primary);
  font-weight: 600;
  font-size: 18px;
  flex-shrink: 0;
}

.logo-text {
  white-space: nowrap;
}

/* Nav */
.nav {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
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
  white-space: nowrap;
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

/* Auth area */
.header-auth {
  display: flex;
  align-items: center;
  margin-left: auto;
  flex-shrink: 0;
}

.login-btn {
  font-weight: 500;
  letter-spacing: 1px;
  padding: 8px 20px;
}

/* Mobile toggle */
.menu-toggle {
  display: none;
  flex-shrink: 0;
}

/* ===== Desktop ===== */
@media (min-width: 769px) {
  .menu-toggle {
    display: none !important;
  }
}

/* ===== Mobile ===== */
@media (max-width: 768px) {
  .header-inner {
    position: relative;
    height: 56px;
  }

  .logo-text {
    font-size: 15px;
  }

  .menu-toggle {
    display: inline-flex;
  }

  .nav {
    position: absolute;
    top: 56px;
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
    border-radius: 0 0 12px 12px;
    z-index: 99;
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

  /* Hide login button on mobile — rely on nav or user-menu */
  .login-btn {
    display: none;
  }

  /* Mobile-only login entry inside nav */
  .nav-login-entry {
    color: var(--primary) !important;
    font-weight: 600;
    background: var(--primary-light) !important;
  }

  /* Show a compact login link inside the mobile nav when not logged in */
}
</style>
