const fs = require('fs');
const path = require('path');

// 读取 .env
const envContent = fs.readFileSync('.env', 'utf8');
const lines = envContent.split('\n');
for (const line of lines) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) process.env[key] = value;
  }
}

async function getAccessToken() {
  const apiKey = process.env.BAIDU_API_KEY;
  const secretKey = process.env.BAIDU_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    throw new Error('Missing Baidu API credentials in .env');
  }
  
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  
  if (!data.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(data));
  }
  
  console.log('✅ Access token obtained');
  return data.access_token;
}

async function callOCR(imagePath, endpoint, accessToken) {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/${endpoint}?access_token=${accessToken}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ image: base64 }).toString(),
  });
  
  const data = await res.json();
  const text = (data.words_result || []).map(item => item.words).filter(Boolean).join('\n');
  return { text, data };
}

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.log('Usage: node test-ocr.js <image-path>');
    console.log('Example: node test-ocr.js "C:\\Users\\63435\\.openclaw\\workspace\\downloads\\19e72dfd-3262-8934-8000-0000c609d696_image.png"');
    return;
  }
  
  try {
    const token = await getAccessToken();
    
    // 测试三个接口
    for (const endpoint of ['handwriting', 'accurate_basic', 'general_basic']) {
      try {
        console.log(`\n--- Testing ${endpoint} ---`);
        const result = await callOCR(imagePath, endpoint, token);
        console.log('Text:', result.text || '(empty)');
        console.log('Raw response:', JSON.stringify(result.data).slice(0, 500));
      } catch (err) {
        console.log(`\n--- ${endpoint} FAILED ---`);
        console.log('Error:', err.message);
      }
    }
  } catch (err) {
    console.error('Test failed:', err.message);
    process.exit(1);
  }
}

main();
