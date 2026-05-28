# 教育AI备课助手 - Agent 项目文档

> 更新日期：2026-05-28
> 线上地址：https://preeminent-maamoul-90e7ba.netlify.app

---

## 1. 项目概览

| 项目 | 说明 |
|------|------|
| 项目名称 | 教育AI备课助手网站 |
| 技术栈 | Vue 3 + Vite + Netlify Functions |
| 部署平台 | Netlify（国内访问优于 Vercel） |
| Git 仓库 | github.com/yinzs14/edu-ai-teacher |
| 本地开发 | localhost:5173 |
| 自动部署 | git push → Netlify 自动构建 |

---

## 2. 页面结构

| 页面 | 功能 | 文件 |
|------|------|------|
| 首页 | 教育AI备课助手入口 | `src/views/Home.vue` |
| 学情诊断 | 拍照/文本输入 → AI 分析 | `src/views/Diagnose.vue` |
| 课件生成 | 根据诊断结果生成 PPT | `src/views/Courseware.vue` |
| 知识树 | 校内+校外双维度知识图谱 | `src/views/Knowledge.vue` |

---

## 3. 后端 API（Netlify Functions）

| 文件 | 功能 | 调用路径 |
|------|------|----------|
| `api/ocr.js` | 百度 OCR 识别图片文字 | `POST /.netlify/functions/ocr` |
| `api/diagnose.js` | DeepSeek 分析学情 | `POST /.netlify/functions/diagnose` |

### Cursor AI 提示词模板（Netlify Functions 规范）

```
我在用 Netlify Functions（AWS Lambda 兼容格式）部署后端 API。
环境：Node.js 18+（原生 fetch，不需要 node-fetch），functions 目录 = api，访问路径 = /.netlify/functions/xxx
代码规范：
- 导出：export default async function handler(event, context)
- 解析请求体：JSON.parse(event.body)
- 返回：{ statusCode, headers: {'Content-Type':'application/json', CORS头}, body: JSON.stringify(data) }
- OPTIONS 请求直接返回 statusCode: 200
- 不要用 Express 风格（res.status().json()），不要用 jsonResponse()
```

---

## 4. 配置文件

| 文件 | 用途 |
|------|------|
| `netlify.toml` | 构建命令、发布目录、Functions 配置、路由重定向 |
| `.env` | API Key（已加入 `.gitignore`） |
| `public/_redirects` | Vue Router history 模式兼容 |

---

## 5. API Key（已配置在 .env）

```
DEEPSEEK_API_KEY=sk-22007a4cb25341b4a78bb5066a5804d9
BAIDU_API_KEY=o5GKXPUt5B22sWpY5iRzaEbk
BAIDU_SECRET_KEY=yPIF5Qi74qrCel7LfaqVfr8WvZABwFAQ
```

---

## 6. 待完成任务（按优先级）

### 🔴 高优先级

| 任务 | 状态 | 说明 | 目标文件 |
|------|------|------|----------|
| 前端对接真实 API | ❌ 未开始 | 学情诊断页面目前用模拟数据，需改成调用 `/.netlify/functions/ocr` 和 `/.netlify/functions/diagnose`，移除"模拟数据"提示 | `src/views/Diagnose.vue` |
| 课件生成 PPT 导出 | ❌ 未开始 | 点击"根据诊断生成课件"后，需生成可下载的 `.pptx` 文件。调研 PPT 生成方案（前端库如 pptxgenjs，或后端生成），根据诊断结果自动填充内容 | `src/views/Courseware.vue` |
| 知识树交互优化 | ❌ 未开始 | 点击知识点展开/收起，配示例题。用 Kimi Claw 采集各版本教材目录，每条知识点配一道示例题 | `src/views/Knowledge.vue` |

### 🟡 中优先级

| 任务 | 状态 | 说明 |
|------|------|------|
| 响应式适配 | ❌ 未开始 | 手机/平板访问优化 |
| 自定义域名 | ❌ 未开始 | 购买域名绑定 Netlify（长期） |

---

## 7. 工具分工

| 工具 | 角色 | 使用方式 |
|------|------|----------|
| Kimi（我） | 技术顾问 | 出方案、诊断问题、提供完整代码 |
| Cursor AI | 代码执行 | 按提示词自动改文件（需包含完整前置信息：Netlify Lambda 格式、Node 18+、返回 {statusCode, headers, body}） |
| Kimi Code | 备用代码生成 | 和 Cursor 能力重叠，二选一即可 |

---

## 8. 项目文件结构

```
edu-ai-teacher/
├── api/                          # Netlify Functions
│   ├── ocr.js                    # 百度 OCR 接口
│   └── diagnose.js               # DeepSeek 分析接口
├── public/
│   └── _redirects                # 路由重定向
├── src/
│   ├── views/
│   │   ├── Home.vue              # 首页
│   │   ├── Diagnose.vue          # ← 需修改：对接真实 API
│   │   ├── Courseware.vue        # ← 需开发：PPT 生成
│   │   └── Knowledge.vue         # ← 需优化：交互+示例题
│   └── ...
├── .env                          # API Key（不提交 Git）
├── .gitignore
├── netlify.toml                  # Netlify 配置
├── package.json
└── vite.config.js
```

---

## 9. 下一步建议（按优先级）

1. **前端对接真实 API（学情诊断页面）**
   - 添加 `analyzeHomework()` 方法调用 `/.netlify/functions/ocr` 和 `/.netlify/functions/diagnose`
   - 移除"模拟数据"提示

2. **课件生成 PPT 导出**
   - 调研 PPT 生成方案（前端库如 pptxgenjs，或后端生成）
   - 根据诊断结果自动填充内容

3. **知识树完善**
   - 用 Kimi Claw 采集各版本教材目录
   - 每条知识点配一道示例题
