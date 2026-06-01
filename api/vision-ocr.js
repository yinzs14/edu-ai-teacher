function normalizeBase64Image(image) {
  if (!image || typeof image !== 'string') return ''
  const commaIndex = image.indexOf(',')
  if (image.startsWith('data:') && commaIndex !== -1) {
    return image.slice(commaIndex + 1)
  }
  return image.trim()
}

export default async function handler(request, context) {
  // 处理 CORS 预检请求
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
    const apiKey = process.env.DASHSCOPE_API_KEY

    if (!apiKey) {
      return new Response(JSON.stringify({ success: false, error: '缺少 DASHSCOPE_API_KEY 配置' }), {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
      })
    }

    const image = normalizeBase64Image(body.image)

    if (!image) {
      return new Response(JSON.stringify({ success: false, error: '请提供 base64 图片字段 image' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
      })
    }

    // 调用阿里云百炼 Qwen-VL-OCR 模型
    const response = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen-vl-ocr',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${image}`,
                },
              },
              {
                type: 'text',
                text: '请识别这张图片中的所有文字内容，包括数学题中的特殊符号（如面积符号、角度符号等）。如果有几何图形，请描述图形的类型和特征。请只返回识别出的纯文本，不要添加额外说明。',
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: data.error?.message || 'Qwen-VL-OCR 请求失败',
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

    const text = data.choices?.[0]?.message?.content || ''

    if (!text.trim()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'OCR 识别结果为空，请检查图片是否包含清晰的文字内容',
      }), {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
      })
    }

    return new Response(JSON.stringify({ success: true, data: { text } }), {
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
