# edu-ai-teacher 项目规范

## 本地记忆文件同步规则
- `.workbuddy/memory/` 目录下的每日日志和项目笔记均纳入 Git 版本管理
- 每次完成实质性改动后，自动：写日志 → git add .workbuddy/memory/ → commit → push
- 其他设备 clone 仓库后可直接读取完整项目进展

## 服务器部署
- IP: 82.156.239.239
- 访问: http://82.156.239.239（Nginx 80 → Node 3001）
- SSH: `ssh edu-ai-server`
- 部署命令: `ssh edu-ai-server "cd ~/edu-ai-teacher && git pull && npm run build && pm2 restart edu-ai-teacher"`
- 已在 GitHub 配置 Deploy Key（RSA），服务器可直接 git pull

## 技术栈
- 前端: Vue 3 + Vite + Element Plus
- 后端: Express (server/index.js, port 3001)
- AI: DeepSeek API (诊断) + 阿里云百炼 Qwen-VL-OCR
- 服务器: 腾讯云 Lighthouse, Ubuntu 22.04, PM2 管理

## 关键文件速查
| 文件 | 用途 |
|------|------|
| `src/views/Diagnose.vue` | 学情诊断页（核心页面） |
| `src/views/Courseware.vue` | 课件生成页 |
| `src/utils/generatePPT.js` | PPT 导出（pptxgenjs） |
| `server/index.js` | Express 后端（OCR + 诊断 + webhook） |
| `src/views/Diagnose.vue.backup` | 回滚用备份文件 |
