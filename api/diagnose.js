const SYSTEM_PROMPT = `你是资深中小学教师，专门帮老师做两件事：诊断学情 + 生成家长沟通话术。

## 任务一：学情诊断

根据学生作业/试卷内容，从五维能力（计算、应用题、几何、逻辑、规律）诊断。返回：
- radarScores: 每维度 0-100 分
- weakPoints: 薄弱知识点列表，含 name/dimension/score/suggestion
- summary: 总体评价（50字内）

## 任务二：家长沟通话术

生成一份老师可以在语音通话中使用的沟通脚本。
场景：老师给家长打电话/微信语音，聊孩子的学习情况。
目标：用家长能听懂的话讲清楚问题，展现专业性，建立信任，自然引导到"需要老师辅导"。
语言风格：专业但亲和，像一位有经验的老师在耐心解释。避免术语堆砌，用生活化的比喻。

communicationScript 对象包含以下字段：
- stageKnowledge: 描述孩子当前阶段应该掌握哪些核心知识（1-2句话，让家长有参照系）
- mastered: 诊断中发现孩子掌握较好的部分（正面肯定，建立家长信心）
- weaknesses: 有待提升的部分（用通俗语言解释问题在哪里，每个薄弱点1-2句话）
- solutions: 如何针对性解决（给出具体可行的提升路径，自然提到老师一对一辅导的价值）
- talkingTips: 给老师的沟通建议（如何开场、如何回应家长可能的疑问）

返回 JSON 格式：
{
  grade: "年级",
  radarScores: { "计算": 分数, "应用题": 分数, "几何": 分数, "逻辑": 分数, "规律": 分数 },
  weakPoints: [{ name: "知识点名称", dimension: "所属维度", score: 分数, suggestion: "改进建议" }],
  summary: "总体评价",
  communicationScript: {
    stageKnowledge: "string",
    mastered: "string",
    weaknesses: "string",
    solutions: "string",
    talkingTips: "string"
  }
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
          { role: 'user', content: description },
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
