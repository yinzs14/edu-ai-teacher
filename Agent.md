# 教育AI备课助手 - Agent 项目文档

> 更新日期：2026-06-08
> 线上地址：https://preeminent-maamoul-90e7ba.netlify.app
> 本地路径：D:\AI备课助手\edu-ai-teacher

---

## 1. 项目概览

| 项目 | 说明 |
|------|------|
| 项目名称 | 教育AI备课助手网站 |
| 技术栈 | Vue 3 + Vite + Express.js（后端） |
| 部署平台 | 腾讯云轻量应用服务器（国内） / Netlify（备用） |
| Git 仓库 | github.com/yinzs14/edu-ai-teacher |
| 本地开发 | localhost:5173（前端） + localhost:3001（后端） |
| 自动部署 | git push → 服务器执行 `bash deploy.sh` |

---

## 2. 页面结构

| 页面 | 功能 | 文件 |
|------|------|------|
| 首页 | 教育AI备课助手入口 | `src/views/Home.vue` |
| 学情诊断 | 拍照/文本输入 → AI 分析 → 输出①家长沟通话术文档 + ②定制学习方案（PPT+PDF） | `src/views/Diagnose.vue` |
| 课件生成 | 根据诊断结果生成 PPT | `src/views/Courseware.vue` |
| 知识树 | 校内+校外双维度知识图谱 | `src/views/Knowledge.vue` |

---

## 2.1 学情诊断双输出方案（核心产品逻辑）

> 本平台专为**老师**使用。学情诊断是整个产品的核心入口，老师上传学生作业 → AI 分析错题 → 输出两部分内容。

### 输出一：家长沟通话术文档

**用途**：老师在语音场景下（电话/微信语音/面谈）与家长沟通学情时使用。

**核心目标**：用家长能听懂的话，树立专业形象，建立信任，引导家长认可老师辅导的必要性。

**内容结构**：
1. **本阶段应掌握的知识**：列出孩子当前年级/学期应该掌握的核心知识点
2. **已掌握的部分**：从诊断结果中提取掌握良好的内容，给予正面反馈
3. **有待提升的部分**：明确指出薄弱环节，用通俗语言解释问题原因
4. **解决方案**：给出具体可行的提升路径，自然过渡到"老师辅导"这个角色
5. **沟通要点提示**：给老师的话术建议，如何在对话中自然引导

**设计要求**：
- 语言通俗，避免过多专业术语，但要有"老师专业感"
- 结构化呈现，方便老师在通话中快速定位段落
- 可一键复制，或导出为单页文档发送

### 输出二：定制版学习方案（PPT + PDF）

**用途**：针对孩子当前学情生成的个性化学习计划。

**输出两份**：
| 格式 | 用途 | 特点 |
|------|------|------|
| **PPT** | 老师上课时使用 | 每页"备注"区域给出参考讲法/教学建议 |
| **PDF** | PPT 场景无法实现时，直接发给家长 | 排版美观专业，家长可自行阅读 |

**内容板块参考**（对标《数学冲刺学习计划》模板）：

| 页码 | 板块 | 说明 |
|------|------|------|
| 1 | 封面 | 学生姓名、科目、教师姓名、日期 |
| 2 | 目标制定 | 根据诊断结果设定可达成的提分目标，按题型拆分得分策略 |
| 3 | 得分知识树 | 按"绝对送分 / 重点攻坚 / 只学皮毛"三梯队排列知识点 |
| 4 | 高频考点清单 | 从诊断数据中筛选出需重点攻克的考点，每个考点配简单说明 |
| 5 | 得分策略 | 针对不同题型给出具体目标和策略 |
| 6 | 三阶段学习计划 | 开卷熟悉 → 闭卷巩固 → 总复习，每个阶段有目标、方法、时长 |
| 7-9 | 各阶段详情 | 每阶段展开：阶段目标、核心方法、时间规划 |
| 10 | 学习工具建议 | 如"如何整理公式本""错题本使用建议"等 |
| 11 | 详细学习安排 | 日历式排课表，标注每节课内容 |
| 12 | 寄语 | 鼓励性结语 |

**PPT 备注要求**：每页幻灯片备注区写入"参考讲法"——老师讲解该页时可以怎么说。例如：
- 目标页备注：「先问孩子觉得自己哪里最弱，再展示这个数据，形成对比」
- 知识树页备注：「逐项和孩子确认"这个知识点你有信心吗？"」

**技术要求**：
- 前端生成：使用 [pptxgenjs](https://github.com/gitbrent/PptxGenJS) 在浏览器端生成 `.pptx` 文件
- PDF 导出：使用 pptxgenjs 生成后转 PDF（或直接用 jsPDF 单独排版）
- 模板样式：参考用户提供的 12 页 PPT 模板结构和设计风格，后续需设计一套品牌化视觉模板

### 数据流

```
学生作业图片 → OCR 识别 → 老师编辑确认 → DeepSeek 分析
                                                ↓
                           ┌──────────────────────┴──────────────────────┐
                           ↓                                              ↓
                    诊断结果 JSON                                   诊断结果 JSON
                    (雷达图+薄弱知识点)                              (完整学情数据)
                           ↓                                              ↓
                    前端渲染雷达图                               ① 生成话术文档
                    展示薄弱知识点                               ② 生成 PPT (老师用)
                           ↓                                     ③ 生成 PDF (家长用)
                    "根据诊断生成课件"
                           ↓
                    Courseware.vue
```

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

---

## 5. API Key（已从代码中移除，仅通过 Netlify 环境变量注入）

密钥已从代码中移除，仅通过 Netlify 环境变量注入：

```
DEEPSEEK_API_KEY    → 从 Netlify 环境变量获取
BAIDU_API_KEY       → 从 Netlify 环境变量获取
BAIDU_SECRET_KEY    → 从 Netlify 环境变量获取
```

---

## 6. 待完成任务（按优先级）

### 🔴 高优先级

| 任务 | 状态 | 说明 | 目标文件 |
|------|------|------|----------|
| 家长沟通话术文档生成 | ✅ 已完成 | 诊断完成后 DeepSeek 返回 communicationScript（五段式），前端展示 + 一键复制。后端 `api/diagnose.js` 已更新 prompt，前端 `Diagnose.vue` 已添加话术卡片 | `api/diagnose.js`、`src/views/Diagnose.vue` |
| 诊断→课件数据打通 | ✅ 已完成 | Diagnose.vue 通过 localStorage 传递完整诊断数据（radarScores + weakPoints + communicationScript + timestamp），Courseware.vue 根据诊断结果动态生成课件内容 | `src/views/Diagnose.vue`、`src/views/Courseware.vue` |
| 课件 PPT 导出 | ✅ 已完成（初版） | pptxgenjs 生成 6 页 PPT：封面、学情诊断（分数条）、薄弱知识点、三阶段学习计划、课表、寄语。每页带备注讲法 | `src/utils/generatePPT.js`、`src/views/Courseware.vue` |
| 课件 PDF 导出 | ✅ 已完成（初版） | 基于诊断数据生成格式化 HTML，支持浏览器打印为 PDF | `src/views/Courseware.vue` |
| 知识树真实数据填充 | ❌ 未开始 | 扩充 mock 数据到小学全年级，每条知识点配 1-2 道典型例题。对标人教版教材目录 | `src/data/mockKnowledgeTree.js` |

### 🟡 中优先级

| 任务 | 状态 | 说明 |
|------|------|------|
| 诊断→课件数据打通 | ❌ 未开始 | 目前 Courseware 从 mock 数据加载，需改为接收 Diagnose 的诊断结果（通过 router state / localStorage），实现真正的数据驱动 |
| 响应式适配 | ❌ 未开始 | 手机/平板访问优化 |
| 自定义域名 | ❌ 未开始 | 购买域名绑定 Netlify（长期） |
| 学习方案视觉模板设计 | ❌ 未开始 | 设计 PPT/PDF 的品牌视觉体系（配色、字体、封面、版式），参考用户提供的 12 页模板风格

---

## 7. 工具分工

| 工具 | 角色 | 使用方式 |
|------|------|----------|
| Kimi Claw | 技术顾问 + 代码执行 | 出方案、诊断问题、编写代码、部署 |

---

## 8. 项目文件结构

```
edu-ai-teacher/
├── api/                          # Netlify Functions
│   ├── ocr.js                    # 百度 OCR 接口（多接口降级：handwriting → accurate_basic → general_basic）
│   ├── vision-ocr.js             # 阿里云 Qwen-VL-OCR 多模态识别（当前主用方案）
│   ├── diagnose.js               # DeepSeek 分析学情（输出雷达图+薄弱知识点）
│   └── communication.js          # ← 待建：生成家长沟通话术文档
├── src/
│   ├── views/
│   │   ├── Home.vue              # 首页
│   │   ├── Diagnose.vue          # 学情诊断：上传/框选/OCR/分析 → 输出话术文档 + 学习方案
│   │   ├── Courseware.vue        # 课件生成：编辑 + PPT/PDF 导出
│   │   └── Knowledge.vue         # 知识树：年级/单元/知识点/例题
│   │   └── Communication.vue     # ← 待建：家长沟通话术页面
│   ├── data/
│   │   ├── mockKnowledgeTree.js  # 知识树 mock 数据
│   │   └── mockCourseware.js     # 课件 mock 数据
│   └── ...
├── .env                          # API Key（不提交 Git）
├── .gitignore
├── netlify.toml                  # Netlify 配置
├── package.json
└── vite.config.js
```

---

## 9. OCR 演进历史

| 阶段 | 方案 | 状态 |
|------|------|------|
| v1 | 百度 OCR handwriting 接口 | ❌ error_code:6 权限未生效 |
| v2 | 百度 OCR accurate_basic / general_basic | ✅ 降级可用 |
| v3 | 阿里云 Qwen-VL-OCR 多模态识别 | ✅ 当前主用方案 `api/vision-ocr.js` |

### 测试方法
```bash
cd "D:\AI备课助手\edu-ai-teacher"
node test-ocr.cjs "图片路径.jpg"
```

---

## 10. 参考模板

### 学习方案 PPT 参考模板

文件：`C:\Users\63435\Desktop\数学冲刺学习计划.pptx`

| 页码 | 内容 | 用途参考 |
|------|------|----------|
| 1 | 封面（科目 + 教师 + 日期） | 品牌展示 |
| 2 | 目标制定（按题型拆目标分 + 策略） | 与家长/学生对标 |
| 3 | 得分知识树（三梯队：送分/攻坚/皮毛） | 建立全局框架 |
| 4 | 高频考点清单（8 个考点卡片式） | 明确攻克重点 |
| 5 | 得分策略（选择/填空/解答的目标） | 量化可执行 |
| 6 | 三阶段冲刺计划（开卷→闭卷→总复习） | 方法论 | 
| 7-9 | 各阶段展开（目标/方法/时长） | 具体落地 |
| 10 | 学习工具（如何整理公式本） | 实操建议 |
| 11 | 详细课表（日期+内容+方法） | 可执行到天 |
| 12 | 寄语 | 情绪价值 |

### 待定字段映射

诊断结果 JSON → PPT 各页的填充字段，待具体定义。

| PPT 页面 | 数据来源 |
|----------|----------|
| 封面 | `studentName`, `subject`, `grade`, `teacherName`, `date` |
| 目标制定 | `dimensionScores[]`（五维分数 → 各题型目标分） |
| 知识树 | `weakPoints[]`（薄弱知识点按维度归类） |
| 考点清单 | `weakPoints[].name` + AI 补充的考点说明 |
| 科目适应性 | math 为第一版，后续扩展到其他学科（语文作文/英语/物理等） |

---

## 11. 部署指南（腾讯云轻量应用服务器）

### 服务器选购

| 项目 | 推荐 |
|------|------|
| 平台 | [腾讯云轻量应用服务器](https://cloud.tencent.com/product/lighthouse) |
| 镜像 | Ubuntu 22.04 |
| 套餐 | 2核2G（¥50/月起） |
| 地域 | 就近选择（上海/广州） |

### 部署步骤

**第一步**：购买服务器，记下公网 IP

**第二步**：SSH 登录服务器
```bash
ssh ubuntu@你的服务器IP
```

**第三步**：克隆项目并部署
```bash
git clone git@github.com:yinzs14/edu-ai-teacher.git
cd edu-ai-teacher
bash deploy.sh
```

**第四步**：配置 API 密钥
```bash
nano .env
# 填写：DASHSCOPE_API_KEY、BAIDU_API_KEY、BAIDU_SECRET_KEY
bash deploy.sh   # 重新部署使配置生效
```

**第五步**：访问 `http://你的服务器IP`

### 后续更新

代码推送后，在服务器上执行：
```bash
cd ~/edu-ai-teacher
git pull
bash deploy.sh
```

### 常用运维命令

| 命令 | 说明 |
|------|------|
| `pm2 status` | 查看服务运行状态 |
| `pm2 logs edu-ai-teacher` | 查看实时日志 |
| `pm2 restart edu-ai-teacher` | 重启服务 |
| `sudo nginx -t` | 测试 Nginx 配置 |
| `sudo nginx -s reload` | 重载 Nginx |

### 本地开发

```bash
# 终端 1：启动前端
npm run dev          # localhost:5173

# 终端 2：启动后端（需要先创建 .env 并填写密钥）
cp .env.example .env
npm run server       # localhost:3001
```

前端 Vite 已配置代理，`/api/*` 请求自动转发到后端 3001 端口。

### 域名备案（可选）

如需绑定自定义域名：
1. 在腾讯云完成 ICP 备案（约 2 周）
2. 修改 `nginx.conf` 中的 `server_name` 为你的域名
3. 配置 SSL 证书（腾讯云免费 SSL）
4. 重新执行 `bash deploy.sh`
