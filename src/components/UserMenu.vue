<template>
  <el-dropdown
    ref="dropdown"
    trigger="click"
    placement="bottom-end"
    class="user-menu"
    @command="handleCommand"
  >
    <div
      class="user-menu__trigger"
      tabindex="0"
      role="button"
      aria-label="用户菜单"
      @keydown.enter.space.prevent="openDropdown()"
      ref="triggerRef"
    >
      <div class="user-avatar" :class="{ 'user-avatar--empty': !auth.userAvatar }">
        <img
          v-if="auth.userAvatar"
          :src="auth.userAvatar"
          :alt="auth.userName"
          class="avatar-img"
        />
        <el-icon v-else :size="18"><UserFilled /></el-icon>
      </div>
      <span class="user-name">{{ displayName }}</span>
      <el-icon class="user-arrow" :size="12"><ArrowDown /></el-icon>
    </div>

    <template #dropdown>
      <el-dropdown-menu class="user-menu__dropdown">
        <!-- User info header -->
        <div class="dropdown-header">
          <div class="dropdown-avatar">
            <img
              v-if="auth.userAvatar"
              :src="auth.userAvatar"
              :alt="auth.userName"
              class="avatar-img"
            />
            <el-icon v-else :size="22"><UserFilled /></el-icon>
          </div>
          <div class="dropdown-info">
            <span class="dropdown-name">{{ auth.userName }}</span>
            <el-tag size="small" type="info" effect="plain" class="dropdown-role">
              {{ roleLabel }}
            </el-tag>
          </div>
        </div>

        <el-divider style="margin: 8px 0;" />

        <el-dropdown-item command="profile" :icon="User">
          个人中心
        </el-dropdown-item>
        <el-dropdown-item command="settings" :icon="Setting">
          账户设置
        </el-dropdown-item>

        <el-divider style="margin: 8px 0;" />

        <el-dropdown-item command="logout" divided :icon="SwitchButton" class="logout-item">
          退出登录
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserFilled,
  ArrowDown,
  User,
  Setting,
  SwitchButton,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const dropdown = ref(null)
const triggerRef = ref(null)

const displayName = computed(() => {
  const name = auth.userName
  return name.length > 10 ? name.slice(0, 10) + '...' : name
})

const roleLabel = computed(() => {
  const map = { teacher: '教师', student: '学生', admin: '管理员' }
  return map[auth.userRole] || '用户'
})

function handleCommand(cmd) {
  switch (cmd) {
    case 'profile':
      router.push('/profile')
      break
    case 'settings':
      router.push('/profile#settings')
      break
    case 'logout':
      handleLogout()
      break
  }
}

function openDropdown() {
  // Use click to toggle dropdown (same as mouse behavior)
  triggerRef.value?.click?.()
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '退出确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    auth.logout()
    ElMessage.success('已安全退出')
    if (router.currentRoute.value.path === '/profile') {
      router.push('/')
    }
  } catch {
    // cancelled
  }
}
</script>

<style scoped>
/* Trigger */
.user-menu {
  margin-left: auto;
}

.user-menu__trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: 24px;
  cursor: pointer;
  transition: background-color 0.2s;
  outline: none;
  border: none;
  background: transparent;
}

.user-menu__trigger:hover {
  background: #f5f7fa;
}

.user-menu__trigger:focus-visible {
  box-shadow: 0 0 0 2px var(--primary);
  border-radius: 24px;
}

/* Avatar */
.user-avatar {
  width: 34px;
  height: 34px;
  min-width: 34px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, #66b1ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar--empty {
  background: linear-gradient(135deg, var(--primary) 0%, #66b1ff 100%);
}

/* Name */
.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Arrow */
.user-arrow {
  color: var(--text-secondary);
  transition: transform 0.2s;
}

/* Dropdown header */
.dropdown-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px 12px;
}

.dropdown-avatar {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, #66b1ff 100%);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.dropdown-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.dropdown-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 160px;
}

.dropdown-role {
  align-self: flex-start;
  font-size: 11px;
}

/* Logout item */
.logout-item {
  color: #f56c6c;
}

/* Mobile responsive */
@media (max-width: 480px) {
  .user-name {
    display: none;
  }

  .user-avatar {
    width: 30px;
    height: 30px;
    min-width: 30px;
  }
}
</style>

<style>
/* Global (unscoped) for el-dropdown inner styling */
.user-menu__dropdown {
  min-width: 220px;
}

.user-menu__dropdown .el-dropdown-menu__item {
  padding: 10px 20px;
  font-size: 14px;
}

.logout-item.el-dropdown-menu__item:hover {
  color: #f56c6c;
  background: #fef0f0;
}
</style>
