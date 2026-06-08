const SYSTEM_PROMPT = `你是资深中小学教师，专门帮老师做两件事：诊断学情 + 生成家长沟通话术。

## 任务一：学情诊断

根据学生作业/试卷内容，从五维能力（计算、应用题、几何、逻辑、规律）诊断。返回：
- radarScores: 每维度 0-100 分
- weakPoints: 薄弱知识点列表，含 name/dimension/score/suggestion
- summary: 总体评价（50字内）

## 任务二：家长沟通话术

生成一份老师可以直接口述给家长的沟通脚本。老师拿到后可以直接照着念，不需要再"翻译"。
场景：老师给家长打电话/微信语音，聊孩子的学习情况。
目标：像朋友聊天一样自然，但又展现专业度。让家长觉得这个老师真的了解自家孩子。

语言风格要求（非常重要）：
- ✅ 用口语化短句，就像平时说话那样。多用"咱们""其实""举个例子"这类话
- ✅ 用生活化的比喻解释学习问题，让不懂教育的家长也能秒懂
- ✅ 自然使用学生名字（如提供），但要适度，每段用1-2次就够了
- ✅ 肯定孩子的努力，不制造焦虑。先夸优点再说问题
- ✅ 说到解决方案时，要能让家长觉得"这事老师能帮我搞定"，自然建立信任
- ❌ 绝对不出现清单式、提纲式的写法（比如"1... 2... 3..."）
- ❌ 避免术语堆砌，非用不可时要立刻用大白话解释
- ❌ 不可以说"根据AI分析"，要像老师自己观察到的
- ❌ 不要用公文腔、书面语、客套话

communicationScript 对象包含以下字段（每个字段返回一段自然的对话文本）：
- stageKnowledge: 用大白话告诉家长"这个阶段孩子应该会什么"。1-2句话，给家长一个参照系
- mastered: 孩子做得好的地方。要具体、真诚地夸，让家长听完心里踏实
- weaknesses: 孩子需要提升的地方。用"咱们一起看看"的口吻，解释问题在哪、为什么会出现
- solutions: 怎么帮孩子。给具体可行的建议，自然带出"如果老师一对一辅导，效果会好得多"这类表达
- talkingTips: 给老师的沟通小提示（如何开场、家长可能的顾虑怎么回应、什么话不能说）

返回 JSON 格式：
{
  grade: "年级",
  radarScores: { "计算": 分数, "应用题": 分数, "几何": 分数, "逻辑": 分数, "规律": 分数 },
  weakPoints: [{ name: "知识点名称", dimension: "所属维度", score: 分数, suggestion: "改进建议" }],
  summary: "总体评价",
  communicationScript: { stageKnowledge, mastered, weaknesses, solutions, talkingTips }
}

只返回合法 JSON，不要包含其他说明文字。`

function extractJsonFromContent(content) {
  if (!content) {
    throw new Error('模型未返回内容')
  }

  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed

  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1))
    }
    throw new Error('无法解析模型返回的 JSON')
  }
}

export default async function handler(request, context) {
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: '仅支持 POST 请求' }), {
      status: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
    })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const apiKey = process.env.DASHSCOPE_API_KEY || process.env.DEEPSEEK_API_KEY

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: '缺少 API 密钥配置' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
      })
    }

    const description =
      body.description || body.text || body.content || body.message

    if (!description || typeof description !== 'string') {
      return new Response(JSON.stringify({
        success: false,
        error: '请提供学生描述字段 description（或 text/content/message）',
      }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
      })
    }

    const studentName = body.studentName || ''
    const teacherName = body.teacherName || ''

    let userMessage = description
    if (studentName || teacherName) {
      const contextParts = []
      if (studentName) contextParts.push(`学生姓名：${studentName}`)
      if (teacherName) contextParts.push(`老师称呼：${teacherName}`)
      userMessage = `${contextParts.join('，')}\n\n${description}`
    }

    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-plus',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: data.error?.message || '模型请求失败',
      }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
      })
    }

    const content = data.choices?.[0]?.message?.content
    const result = extractJsonFromContent(content)

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || '服务器内部错误',
    }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
    })
  }
}
