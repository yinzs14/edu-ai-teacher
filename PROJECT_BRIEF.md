# 教育 AI 备课助手 — 项目交接文档
> 生成日期：2026-06-08
> 交接目标：供 WorkBuddy 快速理解项目上下文并继续开发

---

## 1. 项目一句话定位
面向中小学教师的全流程 AI 备课助手：拍照/框选上传错题 → AI 识别学情 → 生成课件/PPT → 知识图谱管理。

---

## 2. 技术栈 & 部署

| 维度 | 详情 |
|------|------|
| 前端 | Vue 3 + Vite + Element Plus + ECharts |
| 后端 | Netlify Functions (Node.js 18+, AWS Lambda 兼容格式) |
| 部署 | Netlify (自动构建，`git push` 即部署) |
| 线上地址 | https://preeminent-maamoul-90e7ba.netlify.app |
| 本地路径 | `D:&#127;&#92;AI备课助手&#92;edu-ai-teacher` |
| Git 仓库 | https://github.com/yinzs14/edu-ai-teacher |
| 本地开发 | `npm run dev` → http://localhost:5173 |

---

## 3. 项目结构（关键文件）

```
edu-ai-teacher/
├── api/                          # Netlify Functions（后端 API）
│   ├── ocr.js                    # 图片 OCR 识别（多接口降级策略）
│   ├── diagnose.js               # DeepSeek 学情分析
│   └── vision-ocr.js             # Qwen-VL-OCR 多模态识别（最新接入）
├── src/
│   ├── views/
│   │   ├── Home.vue              # 首页：产品价值展示、三步流程动画
│   │   ├── Diagnose.vue          # 学情诊断：多图上传 + 框选 + 编辑 + AI 分析
│   │   ├── Courseware.vue        # 课件生成：预览 + 在线编辑 + 文本下载 ← 待开发 PPT 导出
│   │   └── KnowledgeTree.vue     # 知识树：年级/单元浏览 + 知识点 ← 待优化交互+示例题
│   ├── data/                     # 模拟数据（mockDiagnose.js / mockCourseware.js / mockKnowledgeTree.js）
│   ├── router/index.js           # Vue Router 路由
│   └── App.vue / main.js         # 入口
├── netlify.toml                  # 构建命令 + 路由重定向 + Functions 配置
├── .env                          # API Key（已加入 .gitignore，不提交 Git）
├── test-ocr.cjs / test-ocr.js   # OCR 本地测试脚本
└── vite.config.js                # Vite 配置
```

---

## 4. 已完成的核心功能

### ✅ 学情诊断页 (Diagnose.vue) — 当前最完整的模块
- 支持多图上传（拖拽/点击）
- **图片框选**：截图框选只识别框选区域，减少老师操作成本
- **OCR 识别**：调用后端 `/api/ocr` 或 `/api/vision-ocr`
- **文本可编辑**：OCR 结果展示后，老师可手动编辑修正
- **AI 分析**：编辑后发送给 DeepSeek，返回五维学情雷达图 + 薄弱知识点列表
- 调用链：`前端上传图片 → Netlify Function OCR → 老师编辑 → Netlify Function diagnose → 展示结果`

### ⚠️ OCR 后端演进历史（重要上下文）
1. **v1**：百度 OCR（handwriting → accurate_basic → general_basic 降级）
2. **v2**：百度手写识别有 `error_code:6` 权限问题，改为 accurate_basic / general_basic
3. **v3**：最新接入 **阿里云 Qwen-VL-OCR 多模态识别**（`api/vision-ocr.js`）

---

## 5. 待开发任务（按优先级）

### 🔴 高优先级

| 任务 | 状态 | 说明 | 目标文件 |
|------|------|------|----------|
| 课件生成 PPT 导出 | ❌ 未开始 | 点击"根据诊断生成课件"后，需生成可下载的 `.pptx` 文件。调研方案：前端库（如 pptxgenjs）或后端生成。根据诊断结果自动填充内容。 | `src/views/Courseware.vue` |
| 知识树交互优化 | ❌ 未开始 | 点击知识点展开/收起，配示例题。需要采集各版本教材目录，每条知识点配一道示例题 | `src/views/KnowledgeTree.vue` |

### 🟡 中优先级

| 任务 | 状态 | 说明 |
|------|------|------|
| 响应式适配 | ❌ 未开始 | 手机/平板访问优化（目前主要面向 PC） |
| 自定义域名 | ❌ 未开始 | 购买域名绑定 Netlify（长期） |

---

## 6. API 环境变量（敏感信息，不要泄露值）

以下密钥**已从代码中移除**，仅通过 `.env` 和 Netlify 环境变量注入：

```
DEEPSEEK_API_KEY      → 用于学情分析（DeepSeek API）
BAIDU_API_KEY         → 百度 OCR / 百度智能云
BAIDU_SECRET_KEY      → 百度 OCR 配套密钥
```

> ⚠️ **注意**：`.env` 文件已加入 `.gitignore`，不会提交到 GitHub。Netlify 部署时需在 Site settings → Environment variables 中手动配置。

---

## 7. Netlify Functions 开发规范

WorkBuddy 如要修改后端 API，请遵守此格式：

```javascript
export default async function handler(event, context) {
  // 解析请求体
  const body = JSON.parse(event.body || '{}');
  
  // 返回格式（不要用 Express 的 res.status().json()）
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: JSON.stringify({ data: 'xxx' })
  };
}
```

- 环境：Node.js 18+（原生 `fetch`，不需要 `node-fetch`）
- 路径：`api/xxx.js` → 访问路径 `/.netlify/functions/xxx`
- `OPTIONS` 请求直接返回 `statusCode: 200`

---

## 8. 已知问题 & 排查记录

### 问题 1：百度 OCR 手写接口权限
- `handwriting` 接口返回 `error_code:6`，百度控制台显示已开通但 API 实际未生效
- **解决**：已降级为 `accurate_basic` / `general_basic`，同时接入 Qwen-VL-OCR

### 问题 2：Netlify Functions 格式不兼容
- 早期使用 `jsonResponse()` 或 Express 风格导致部署失败
- **解决**：统一改为 Lambda 兼容格式（`statusCode + headers + body`），见提交 `01c2700`

### 问题 3：前端部署后 API 调用失败
- 最可能原因：Netlify 环境变量未正确配置到 Functions 中
- **排查**：检查 Netlify Dashboard → Site settings → Environment variables

---

## 9. 本地测试命令

```bash
# 进入项目目录
cd "D:&#127;&#92;AI备课助手&#92;edu-ai-teacher"

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建（Netlify 会自动执行）
npm run build

# OCR 本地测试（无需启动前端）
node test-ocr.cjs "图片路径.jpg"
```

---

## 10. 最近 Git 提交记录（上下文）

```
ab87f91  feat: 接入阿里云百炼 Qwen-VL-OCR 多模态识别
d8fcba6  feat(diagnose): 改进图片框选交互
da0ebf4  feat: 图片截图框选功能，只识别框选区域，减少老师操作成本
2fc86ae  feat: 图片预览 + 可编辑OCR文本框，让老师看图片自己编辑错题内容
01c2700  fix: Netlify Functions 改用 Response 对象格式（修复 unsupported value 错误）
```

---

## 11. 给 WorkBuddy 的下一步建议

根据当前状态，建议优先处理以下之一：

1. **PPT 导出功能**：调研 `pptxgenjs` 或类似库，在 `Courseware.vue` 中实现"生成并下载 .pptx"按钮，调用现有诊断数据填充模板。
2. **知识树数据填充**：通过网络搜索或 AI 生成，为 `src/data/mockKnowledgeTree.js` 补充真实教材知识点和示例题。
3. **响应式适配**：为 `Diagnose.vue` 的复杂交互（图片框选、多图上传）添加移动端适配。

---

> 📌 本项目的前端代码均为**纯静态 Vue 3**，所有 AI 能力通过 Netlify Functions 调用外部 API 实现，无需独立服务器。
