#!/bin/bash

# ====================================
# EngineerHub 開發環境啟動腳本
# 適用於 Windows 10/11 和 Linux 系統
# ====================================

echo "🚀 正在啟動 EngineerHub 開發環境..."

# 檢查是否在專案根目錄
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ 錯誤：請在專案根目錄執行此腳本"
    exit 1
fi

# 檢查 conda 是否可用
if ! command -v conda &> /dev/null; then
    echo "❌ 錯誤：未找到 conda，請先安裝 Anaconda 或 Miniconda"
    exit 1
fi

# 檢查 node 是否可用
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤：未找到 Node.js，請先安裝 Node.js"
    exit 1
fi

echo "📦 檢查後端環境..."

# 激活 conda 環境
if conda env list | grep -q "engineerhubweb"; then
    echo "✅ 找到 engineerhubweb 環境"
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate engineerhubweb
else
    echo "⚠️  未找到 engineerhubweb 環境，正在創建..."
    conda create -n engineerhubweb python=3.11 -y
    source $(conda info --base)/etc/profile.d/conda.sh
    conda activate engineerhubweb
    
    echo "📦 安裝後端依賴..."
    cd backend
    pip install -r requirements.txt
    cd ..
fi

# 檢查環境變數文件
if [ ! -f "backend/.env" ]; then
    echo "⚠️  未找到環境變數文件，正在創建..."
    if [ -f "backend/env_template.txt" ]; then
        cp backend/env_template.txt backend/.env
        echo "📝 已創建 backend/.env 文件，請編輯並填入實際的 API 金鑰"
    else
        echo "❌ 錯誤：未找到環境變數範本文件"
        exit 1
    fi
fi

echo "📦 檢查前端依賴..."

# 檢查前端依賴
if [ ! -d "frontend/node_modules" ]; then
    echo "📦 安裝前端依賴..."
    cd frontend
    npm install
    cd ..
else
    echo "✅ 前端依賴已安裝"
fi

# 檢查前端環境變數
if [ ! -f "frontend/.env.local" ]; then
    echo "⚠️  創建前端環境變數文件..."
    cat > frontend/.env.local << EOF
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_only_key
EOF
    echo "📝 已創建 frontend/.env.local 文件，請編輯並填入實際的 API 金鑰"
fi

echo "🗄️  檢查資料庫..."

# 檢查 PostgreSQL 連接
cd backend
if python -c "
import os
import django
from django.conf import settings
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'engineerhub.settings.development')
django.setup()

try:
    with connection.cursor() as cursor:
        cursor.execute('SELECT 1')
    print('✅ 資料庫連接成功')
except Exception as e:
    print(f'❌ 資料庫連接失敗: {e}')
    print('請確保：')
    print('1. PostgreSQL 服務已啟動')
    print('2. 資料庫和用戶已創建')
    print('3. .env 文件中的資料庫配置正確')
    exit(1)
" 2>/dev/null; then
    echo "資料庫檢查完成"
else
    echo "⚠️  無法檢查資料庫連接，請確保 Django 設置正確"
fi

# 執行資料庫遷移
echo "🔄 執行資料庫遷移..."
python manage.py migrate --no-input

cd ..

echo ""
echo "🎉 環境檢查完成！"
echo ""
echo "📖 接下來的步驟："
echo "1. 編輯 backend/.env 文件，填入實際的 API 金鑰"
echo "2. 編輯 frontend/.env.local 文件，填入前端配置"
echo "3. 開啟三個終端機分別執行："
echo ""
echo "   終端機 1 - 後端："
echo "   cd backend"
echo "   conda activate engineerhubweb"
echo "   python manage.py runserver"
echo ""
echo "   終端機 2 - 前端："
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "   終端機 3 - Redis (如果尚未啟動)："
echo "   redis-server"
echo ""
echo "🌐 訪問地址："
echo "   前端: http://localhost:5173"
echo "   後端: http://localhost:8000"
echo "   API 文檔: http://localhost:8000/api/docs/"
echo "   Admin: http://localhost:8000/admin/"
echo ""
echo "📚 詳細說明請參考 SETUP_GUIDE.md" 