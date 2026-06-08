module.exports = {
  apps: [
    {
      name: 'edu-ai-teacher',
      script: 'server/index.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
      },
      // 自动重启
      autorestart: true,
      max_restarts: 10,
      // 日志
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
