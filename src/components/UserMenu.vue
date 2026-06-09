<template>
  <div class="user-menu-wrapper">
    <!-- 未登录 -->
    <template v-if="!user.state.isLoggedIn">
      <el-button class="auth-btn" type="primary" size="small" @click="$emit('openAuth')">
        登录
      </el-button>
      <el-button class="auth-btn" size="small" @click="$emit('openAuth')">
        注册
      </el-button>
    </template>

    <!-- 已登录 -->
    <el-dropdown v-else trigger="click" :hide-on-click="false" class="user-dropdown">
      <span class="user-trigger">
        <el-avatar :size="32" icon="UserFilled" class="user-avatar" />
        <span class="user-name">{{ user.state.user?.nickname || user.state.user?.username }}</span>
        <el-icon class="arrow-icon"><ArrowDown /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item>
            <div class="user-info-header">
              <el-avatar :size="40" icon="UserFilled" />
              <div class="user-info-text">
                <div class="user-info-name">{{ user.state.user?.nickname }}</div>
                <div class="user-info-role">{{ roleLabel }}</div>
              </div>
            </div>
          </el-dropdown-item>
          <el-dropdown-item divided @click="$router.push('/profile')">
            <el-icon><User /></el-icon> 个人中心
          </el-dropdown-item>
          <el-dropdown-item divided @click="handleLogout">
            <el-icon><SwitchButton /></el-icon> 退出登录
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ArrowDown, User, SwitchButton } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useUser } from '@/composables/useUser'

defineEmits(['openAuth'])

const user = useUser()

const roleLabel = computed(() => {
  return user.state.user?.role === 'teacher' ? '教师' : '普通用户'
})

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '退出',
      cancelButtonText: '取消',
      type: 'warning',
    })
    user.logout()
  } catch {
    // 取消
  }
}
</script>

<style scoped>
.user-menu-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
.auth-btn {
  font-size: 13px;
}
.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.2s;
}
.user-trigger:hover {
  background: #f5f7fa;
}
.user-avatar {
  flex-shrink: 0;
}
.user-name {
  font-size: 14px;
  color: #303133;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arrow-icon {
  font-size: 12px;
  color: #909399;
  transition: transform 0.2s;
}
.user-info-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  min-width: 160px;
}
.user-info-text {
  line-height: 1.4;
}
.user-info-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.user-info-role {
  font-size: 12px;
  color: #909399;
}
</style>
