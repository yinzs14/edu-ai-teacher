import pptxgen from 'pptxgenjs'

const COLOR = {
  primary: '2563EB',
  primaryDark: '1D4ED8',
  white: 'FFFFFF',
  black: '1A1A2E',
  gray: '6B7280',
  lightGray: 'F3F4F6',
  green: '059669',
  amber: 'D97706',
  red: 'DC2626',
  blue: '2563EB',
}

function addFooter(slide, pageNum, totalPages) {
  slide.addText(`${pageNum} / ${totalPages}`, {
    x: 0, y: 5.3, w: '100%', h: 0.3,
    align: 'center', fontSize: 9, color: COLOR.gray,
  })
}

function coverSlide(pptx, data) {
  const slide = pptx.addSlide()
  slide.background = { fill: COLOR.primary }
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '100%',
    fill: { type: 'solid', color: COLOR.primary },
  })
  slide.addText('个性化学习方案', {
    x: 0.8, y: 1.2, w: 8.4, h: 1,
    fontSize: 36, bold: true, color: COLOR.white, align: 'center',
  })
  slide.addText(data.subject || '数学', {
    x: 0.8, y: 2.2, w: 8.4, h: 0.8,
    fontSize: 24, color: COLOR.white, align: 'center',
  })
  if (data.studentName) {
    slide.addText(`学生：${data.studentName}`, {
      x: 0.8, y: 3.2, w: 8.4, h: 0.5,
      fontSize: 16, color: COLOR.white, align: 'center',
    })
  }
  slide.addText(`授课教师：${data.teacherName || '老师'}`, {
    x: 0.8, y: 3.7, w: 8.4, h: 0.5,
    fontSize: 14, color: COLOR.white, align: 'center',
  })
  slide.addText(data.date || new Date().toLocaleDateString('zh-CN'), {
    x: 0.8, y: 4.3, w: 8.4, h: 0.5,
    fontSize: 12, color: COLOR.white, align: 'center',
  })
  return slide
}

function diagnosisSlide(pptx, data) {
  const slide = pptx.addSlide()
  slide.addText('学情诊断结果', {
    x: 0.8, y: 0.4, w: 8.4, h: 0.6,
    fontSize: 24, bold: true, color: COLOR.black,
  })

  const scores = data.radarScores || {}
  const dims = Object.keys(scores)
  const startY = 1.4
  const barW = 6
  const barH = 0.28
  const gap = 0.44

  dims.forEach((dim, i) => {
    const score = scores[dim] || 0
    const y = startY + i * gap
    slide.addText(dim, {
      x: 0.8, y: y, w: 1.4, h: barH,
      fontSize: 13, color: COLOR.black, bold: true,
    })
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.3, y: y + 0.02, w: barW, h: barH - 0.04,
      fill: { color: COLOR.lightGray },
    })
    const fillColor = score >= 70 ? COLOR.green : score >= 50 ? COLOR.amber : COLOR.red
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.3, y: y + 0.02, w: barW * (score / 100), h: barH - 0.04,
      fill: { color: fillColor },
    })
    slide.addText(`${score}分`, {
      x: 8.4, y: y, w: 0.8, h: barH,
      fontSize: 12, color: COLOR.gray,
    })
  })

  if (data.summary) {
    slide.addText(data.summary, {
      x: 0.8, y: startY + dims.length * gap + 0.2,
      w: 8.4, h: 0.8, fontSize: 13, color: COLOR.gray,
    })
  }

  if (data.pptNotes) {
    slide.addNotes(data.pptNotes)
  }
  return slide
}

function weakPointsSlide(pptx, data) {
  const slide = pptx.addSlide()
  slide.addText('薄弱知识点分析', {
    x: 0.8, y: 0.4, w: 8.4, h: 0.6,
    fontSize: 24, bold: true, color: COLOR.black,
  })

  const points = data.weakPoints || []
  const maxItems = 6
  const display = points.slice(0, maxItems)
  const startY = 1.3

  display.forEach((wp, i) => {
    const y = startY + i * 0.7
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: y, w: 0.06, h: 0.5,
      fill: { color: COLOR.red },
    })
    slide.addText(wp.name || '未知知识点', {
      x: 1.1, y: y, w: 3, h: 0.28,
      fontSize: 14, bold: true, color: COLOR.black,
    })
    slide.addText(`[${wp.dimension || ''}]  掌握度：${wp.score || 0}分`, {
      x: 1.1, y: y + 0.26, w: 3, h: 0.24,
      fontSize: 11, color: COLOR.gray,
    })
    slide.addText(wp.suggestion || '', {
      x: 4.5, y: y, w: 4.5, h: 0.5,
      fontSize: 12, color: COLOR.black, valign: 'middle',
    })
  })

  slide.addNotes('逐项和孩子确认每个知识点的掌握程度，用问句引导孩子自己发现问题。例如："你觉得这个类型的题目做起来顺手吗？"')
  return slide
}

function studyPlanSlide(pptx, data) {
  const slide = pptx.addSlide()
  slide.addText('三阶段学习计划', {
    x: 0.8, y: 0.4, w: 8.4, h: 0.6,
    fontSize: 24, bold: true, color: COLOR.black,
  })
  slide.addText('循序渐进 · 从开卷到闭卷 · 从模块到综合', {
    x: 0.8, y: 0.95, w: 8.4, h: 0.4,
    fontSize: 13, color: COLOR.gray,
  })

  const stages = [
    { title: '第一阶段：开卷熟悉', sub: '识别与应用', desc: '认识题型，知道用什么知识。允许查公式、看笔记，独立思考完成。', time: '约 1-2 周', color: COLOR.blue },
    { title: '第二阶段：闭卷巩固', sub: '背诵与记忆', desc: '脱离资料，检验记忆，整理公式。限时完成，整理错题和必背公式。', time: '约 1 周', color: COLOR.green },
    { title: '第三阶段：总复习', sub: '综合与提升', desc: '适应考试节奏，查漏补缺。真题套练，模块复习，错题复盘。', time: '剩余时间', color: COLOR.primaryDark },
  ]

  stages.forEach((s, i) => {
    const y = 1.6 + i * 1.2
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.8, y: y, w: 0.5, h: 0.5,
      fill: { color: s.color }, rectRadius: 0.1,
    })
    slide.addText(`${i + 1}`, {
      x: 0.8, y: y, w: 0.5, h: 0.5,
      fontSize: 18, bold: true, color: COLOR.white, align: 'center', valign: 'middle',
    })
    slide.addText(`${s.title} · ${s.sub}`, {
      x: 1.5, y: y, w: 6, h: 0.3,
      fontSize: 14, bold: true, color: COLOR.black,
    })
    slide.addText(s.desc, {
      x: 1.5, y: y + 0.28, w: 6, h: 0.3,
      fontSize: 12, color: COLOR.gray,
    })
    slide.addText(s.time, {
      x: 1.5, y: y + 0.58, w: 2, h: 0.25,
      fontSize: 11, color: s.color, bold: true,
    })
  })

  slide.addNotes('用三阶段法帮孩子建立信心：第一阶段不要求速度，第二阶段不要求全对，第三阶段才是真正的冲刺。')
  return slide
}

function scheduleSlide(pptx, data) {
  const slide = pptx.addSlide()
  slide.addText('学习安排建议', {
    x: 0.8, y: 0.4, w: 8.4, h: 0.6,
    fontSize: 24, bold: true, color: COLOR.black,
  })

  const points = data.weakPoints || []
  const items = []
  points.slice(0, 8).forEach((wp, i) => {
    items.push(`第 ${i + 1} 课：${wp.name}（${wp.dimension || ''}）`)
  })

  if (items.length === 0) {
    items.push('根据诊断结果安排针对性练习')
    items.push('每周 2-3 次，每次 1-2 小时')
  }

  const rows = []
  const cols = [[], []]
  items.forEach((item, i) => {
    cols[i % 2].push(item)
  })
  const maxLen = Math.max(cols[0].length, cols[1].length)
  for (let i = 0; i < maxLen; i++) {
    rows.push([cols[0][i] || '', cols[1][i] || ''])
  }

  const tableRows = [
    [
      { text: '课程内容', options: { bold: true, color: COLOR.white, fill: { color: COLOR.primary }, align: 'center' } },
      { text: '课程内容', options: { bold: true, color: COLOR.white, fill: { color: COLOR.primary }, align: 'center' } },
    ],
    ...rows.map(r => r.map(c => ({ text: c, options: { fontSize: 12 } }))),
  ]

  slide.addTable(tableRows, {
    x: 0.8, y: 1.3, w: 8.4,
    colW: [4.2, 4.2],
    border: { type: 'solid', pt: 0.5, color: COLOR.lightGray },
    rowH: 0.42,
  })

  slide.addNotes('课表可根据实际情况灵活调整。进度根据个人掌握情况，稳扎稳打最重要。')
  return slide
}

function closingSlide(pptx, data) {
  const slide = pptx.addSlide()
  slide.background = { fill: COLOR.primary }
  slide.addText('你的坚持，终将美好', {
    x: 0.8, y: 1.8, w: 8.4, h: 1,
    fontSize: 32, bold: true, color: COLOR.white, align: 'center',
  })
  slide.addText('每一步都算数', {
    x: 0.8, y: 2.8, w: 8.4, h: 0.6,
    fontSize: 18, color: COLOR.white, align: 'center',
  })
  slide.addText('我们的目标不是成为天才，而是成为一个高效的得分手。', {
    x: 0.8, y: 3.6, w: 8.4, h: 0.6,
    fontSize: 14, color: COLOR.white, align: 'center', italic: true,
  })
  return slide
}

export function generatePPT(data) {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = data.teacherName || 'AI备课助手'
  pptx.title = `${data.studentName || '学生'} ${data.subject || '数学'} 学习方案`

  const slides = [
    () => coverSlide(pptx, data),
    () => diagnosisSlide(pptx, { ...data, pptNotes: '先问孩子觉得自己哪里最弱，再展示这个数据，形成对比。每个维度用简单语言解释"这个分数代表什么"。' }),
    () => weakPointsSlide(pptx, data),
    () => studyPlanSlide(pptx, data),
    () => scheduleSlide(pptx, data),
    () => closingSlide(pptx, data),
  ]

  slides.forEach(fn => fn())

  return pptx
}

export async function downloadPPT(data, filename) {
  const pptx = generatePPT(data)
  await pptx.writeFile({ fileName: filename || '学习方案.pptx' })
}
