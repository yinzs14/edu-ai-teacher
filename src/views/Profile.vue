<template>
  <div class="profile-page">
    <div class="profile-container">
      <!-- 未登录状态 -->
      <div v-if="!user.state.isLoggedIn" class="profile-empty">
        <el-icon class="empty-icon" :size="64"><UserFilled /></el-icon>
        <h2>您还未登录</h2>
        <p>登录后可查看个人中心、管理模板、查看反馈历史</p>
        <el-button type="primary" size="large" @click="showAuthDialog = true">
          立即登录
        </el-button>
        <AuthDialog v-model:visible="showAuthDialog" />
      </div>

      <!-- 已登录 — 个人中心 -->
      <template v-else>
        <!-- 用户信息卡片 -->
        <div class="profile-card">
          <el-avatar :size="72" icon="UserFilled" class="profile-avatar" />
          <div class="profile-info">
            <h2>{{ editable.nickname || user.state.user?.nickname }}</h2>
            <p class="profile-username">@{{ user.state.user?.username }}</p>
            <p class="profile-meta">
              <el-tag size="small">{{ user.state.user?.role === 'teacher' ? '教师' : '普通用户' }}</el-tag>
              <span v-if="user.state.user?.email" class="profile-email">{{ user.state.user.email }}</span>
            </p>
          </div>
        </div>

        <!-- 编辑信息表单 -->
        <div class="profile-section">
          <h3 class="section-title">编辑个人信息</h3>
          <el-form
            ref="profileFormRef"
            :model="editable"
            label-width="80px"
            label-position="left"
            class="profile-form"
          >
            <el-form-item label="昵称">
              <el-input v-model="editable.nickname" placeholder="设置昵称" maxlength="20" show-word-limit />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="editable.email" placeholder="可选，用于找回密码" type="email" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleSave">
                {{ saving ? '保存中...' : '保存修改' }}
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 统计概览 -->
        <div class="profile-section">
          <h3 class="section-title">使用统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">—</span>
              <span class="stat-label">诊断次数</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">—</span>
              <span class="stat-label">课件生成</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">—</span>
              <span class="stat-label">模板上传</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">—</span>
              <span class="stat-label">反馈建议</span>
            </div>
          </div>
          <p class="stats-hint">详细统计将在后续版本中完善</p>
        </div>

        <!-- 退出登录 -->
        <div class="profile-section profile-danger">
          <el-button type="danger" plain @click="handleLogout">退出登录</el-button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { UserFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUser } from '@/composables/useUser'
import AuthDialog from '@/components/AuthDialog.vue'

const user = useUser()
const showAuthDialog = ref(false)
const saving = ref(false)

const editable = reactive({
  nickname: user.state.user?.nickname || '',
  email: user.state.user?.email || '',
})

async function handleSave() {
  saving.value = true
  try {
    const { ok, data } = await user.authFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ nickname: editable.nickname, email: editable.email }),
    })

    if (ok && data.success) {
      user.updateUser(data.data)
      ElMessage.success('个人信息已更新')
    } else {
      ElMessage.error(data.error || '保存失败')
    }
  } catch {
    ElMessage.error('网络错误，保存失败')
  } finally {
    saving.value = false
  }
}

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
.profile-page {
  min-height: calc(100vh - 64px - 60px);
  background: #f5f7fa;
  padding: 32px 16px;
}
.profile-container {
  max-width: 640px;
  margin: 0 auto;
}
/* 未登录 */
.profile-empty {
  text-align: center;
  padding: 80px 20px;
}
.empty-icon {
  color: #c0c4cc;
  margin-bottom: 16px;
}
.profile-empty h2 {
  font-size: 20px;
  color: #303133;
  margin-bottom: 8px;
}
.profile-empty p {
  color: #909399;
  margin-bottom: 24px;
}
/* 个人信息卡片 */
.profile-card {
  display: flex;
  align-items: center;
  gap: 20px;
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  margin-bottom: 20px;
}
.profile-avatar {
  flex-shrink: 0;
}
.profile-info h2 {
  font-size: 22px;
  color: #303133;
  margin: 0 0 4px;
}
.profile-username {
  color: #909399;
  font-size: 14px;
  margin: 0 0 6px;
}
.profile-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}
.profile-email {
  font-size: 13px;
  color: #606266;
}
/* 表单区域 */
.profile-section {
  background: #fff;
  border-radius: 12px;
  padding: 24px 32px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  margin-bottom: 20px;
}
.section-title {
  font-size: 16px;
  color: #303133;
  margin: 0 0 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}
.profile-form {
  max-width: 400px;
}
/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-item {
  text-align: center;
  padding: 16px 8px;
  background: #f5f7fa;
  border-radius: 8px;
}
.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: var(--primary, #409eff);
}
.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.stats-hint {
  font-size: 12px;
  color: #c0c4cc;
  margin: 12px 0 0;
}
/* 退出 */
.profile-danger {
  text-align: center;
}
@media (max-width: 768px) {
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .profile-container {
    max-width: 100%;
  }
}
</style>
