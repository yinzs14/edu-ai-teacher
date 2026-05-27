<template>
  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <el-icon :size="22" color="#409EFF"><Reading /></el-icon>
        <span>教育AI备课助手</span>
      </div>
      <p class="footer-desc">拍照诊断学情 · 智能生成课件 · 知识树精准备课</p>
      <p class="footer-copy">© {{ year }} 教育AI备课助手 · 演示版本（模拟数据）</p>
    </div>
  </footer>
</template>

<script setup>
import { Reading } from '@element-plus/icons-vue'

const year = new Date().getFullYear()
</script>

<style scoped>
.site-footer {
  background: #fff;
  border-top: 1px solid #ebeef5;
  margin-top: auto;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 16px;
  text-align: center;
}

.footer-brand {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--primary);
  margin-bottom: 8px;
}

.footer-desc {
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 12px;
}

.footer-copy {
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
