async function getBaiduAccessToken() {
  const apiKey = process.env.BAIDU_API_KEY
  const secretKey = process.env.BAIDU_SECRET_KEY

  if (!apiKey || !secretKey) {
    throw new Error('缺少百度 API 密钥配置')
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
    const ocrUrl = new URL('https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic')
    ocrUrl.searchParams.set('access_token', accessToken)

    const ocrResponse = await fetch(ocrUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image }).toString(),
    })

    const ocrData = await ocrResponse.json()

    if (!ocrResponse.ok || ocrData.error_code) {
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
          error: ocrData.error_msg || 'OCR 识别失败',
        }),
      }
    }

    const text = (ocrData.words_result || [])
      .map((item) => item.words)
      .filter(Boolean)
      .join('\n')

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
