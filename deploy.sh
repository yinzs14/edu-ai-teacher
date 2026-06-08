#!/bin/bash
# ============================================
# Edu AI Teacher 一键部署脚本
# 用法：在服务器上执行 bash deploy.sh
# ============================================
set -e

echo "========================================"
echo "  Edu AI Teacher 部署脚本"
echo "========================================"

# ---- 1. 环境检查 ----
echo ""
echo "[1/6] 检查环境..."

if ! command -v node &> /dev/null; then
    echo "  → 安装 Node.js 22.x..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v nginx &> /dev/null; then
    echo "  → 安装 Nginx..."
    sudo apt-get update -qq && sudo apt-get install -y nginx
fi

if ! command -v pm2 &> /dev/null; then
    echo "  → 安装 PM2..."
    sudo npm install -g pm2
fi

echo "  ✓ Node: $(node -v)"
echo "  ✓ NPM:  $(npm -v)"
echo "  ✓ PM2:  $(pm2 -v 2>/dev/null || echo 'installed')"

# ---- 2. 配置环境变量 ----
echo ""
echo "[2/6] 配置环境变量..."

if [ ! -f .env ]; then
    cp .env.example .env
    echo "  → 已创建 .env 文件，请编辑填写 API 密钥："
    echo "    nano .env"
    echo ""
    echo "  填好后按 Enter 继续..."
    read -r
fi

# ---- 3. 安装依赖 ----
echo ""
echo "[3/6] 安装前端依赖 + 构建..."
npm install --silent
npm run build

echo ""
echo "[4/6] 安装服务端依赖..."
cd server && npm install --silent && cd ..

# ---- 4. 启动服务 ----
echo ""
echo "[5/6] 启动 PM2 服务..."
mkdir -p logs
pm2 delete edu-ai-teacher 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save

# ---- 5. 配置 Nginx ----
echo ""
echo "[6/6] 配置 Nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/edu-ai-teacher
sudo ln -sf /etc/nginx/sites-available/edu-ai-teacher /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo nginx -s reload

# ---- 完成 ----
echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "  访问地址: http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_IP')"
echo ""
echo "  常用命令:"
echo "    pm2 status           # 查看服务状态"
echo "    pm2 logs edu-ai-teacher  # 查看日志"
echo "    pm2 restart edu-ai-teacher # 重启服务"
echo "    bash deploy.sh       # 更新后重新部署"
echo ""
