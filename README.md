# 教育 AI 备课助手

基于 Vue 3 + Vite + Element Plus + ECharts 的教育备课演示网站，使用模拟数据，无需后端 API。

## 功能

- **首页**：产品价值展示、三步流程动画（拍照→诊断→课件）、快捷入口
- **学情诊断**：拖拽上传图片、五维学情雷达图、薄弱知识点列表
- **课件生成**：课件预览与在线编辑、文本下载
- **知识树**：按年级/单元浏览知识点及典型例题

## 技术栈

- Vue 3 + Vite
- Element Plus（中文界面）
- ECharts（雷达图）
- Vue Router

## 快速开始

```bash
npm install
npm run dev
```

浏览器访问 http://localhost:5173

## 构建

```bash
npm run build
npm run preview
```

## 项目结构

```
edu-ai-teacher/
├── index.html
├── package.json
├── vite.config.js
├── public/
└── src/
    ├── main.js
    ├── App.vue
    ├── assets/main.css
    ├── router/index.js
    ├── components/
    │   ├── Header.vue
    │   └── Footer.vue
    ├── views/
    │   ├── Home.vue
    │   ├── Diagnose.vue
    │   ├── Courseware.vue
    │   └── KnowledgeTree.vue
    └── data/
        ├── mockDiagnose.js
        ├── mockCourseware.js
        └── mockKnowledgeTree.js
```
