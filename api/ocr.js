async function getBaiduAccessToken() {
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY

  if (!apiKey || !secretKey) {
    const missing = []
    if (!apiKey) missing.push('BAIDU_API_KEY')
    if (!secretKey) missing.push('BAIDU_SECRET_KEY')
    throw new Error(`Netlify 环境变量未配置：${missing.join('、')}。请在 Netlify 控制台 → Project configuration → Environment 中添加这些变量。`)
  }

  const url = new URL('https://aip.baidubce.com/oauth/2.0/token')
  url.searchParams.set('grant_type', 'client_credentials')
  url.searchParams.set('client_id', apiKey)
  url.searchParams.set('client_secret', secretKey)

  const response = await fetch(url.toString(), { method: 'POST' })
  const data = await response.json()

  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || '获取百度 access_token 失败')
  }

  return data.access_token
}

function normalizeBase64Image(image) {
  if (!image || typeof image !== 'string') return ''
  const commaIndex = image.indexOf(',')
  if (image.startsWith('data:') && commaIndex !== -1) {
    return image.slice(commaIndex + 1)
  }
  return image.trim()
}

async function callBaiduOcr(accessToken, image, endpoint) {
  const ocrUrl = new URL(`https://aip.baidubce.com/rest/2.0/ocr/v1/${endpoint}`)
  ocrUrl.searchParams.set('access_token', accessToken)

  const ocrResponse = await fetch(ocrUrl.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image }).toString(),
  })

  const ocrData = await ocrResponse.json()

  if (!ocrResponse.ok) {
    throw new Error(ocrData.error_msg || `百度 ${endpoint} 接口请求失败`)
  }
  if (ocrData.error_code) {
    throw new Error(ocrData.error_msg || `百度 ${endpoint} 接口错误: ${ocrData.error_code}`)
  }

  const text = (ocrData.words_result || [])
    .map((item) => item.words)
    .filter(Boolean)
    .join('\n')

  return text
}

export default async function handler(event, context) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: false, error: '仅支持 POST 请求' }),
    }
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {}
    const image = normalizeBase64Image(body.image)

    // 调试日志
    console.log('DEBUG: body.image length:', body.image?.length || 0)
    console.log('DEBUG: normalized image length:', image.length)
    console.log('DEBUG: image first 100 chars:', image.slice(0, 100))

    if (!image) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: false, error: '请提供 base64 图片字段 image' }),
      }
    }

    const accessToken = await getBaiduAccessToken()

    // 多接口自动降级：handwriting > accurate_basic > general_basic
    const endpoints = ['handwriting', 'accurate_basic', 'general_basic']
    let lastError = null
    let text = ''

    for (const endpoint of endpoints) {
      try {
        text = await callBaiduOcr(accessToken, image, endpoint)
        if (text.trim()) {
          break
        }
      } catch (err) {
        lastError = err
        // 继续尝试下一个接口
      }
    }

    if (!text.trim()) {
      const errorMsg = lastError
        ? `OCR 识别失败：${lastError.message}（已尝试手写识别、高精度识别、通用识别）`
        : 'OCR 识别结果为空，请检查图片是否包含清晰的文字内容'

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ success: false, error: errorMsg }),
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true, data: { text } }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message || '服务器内部错误',
      }),
    }
  }
}
