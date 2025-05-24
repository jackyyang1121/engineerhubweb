@echo off
chcp 65001 >nul
echo.
echo 🚀 正在啟動 EngineerHub 開發環境...
echo.

REM 檢查是否在專案根目錄
if not exist "backend" (
    echo ❌ 錯誤：未找到 backend 目錄
    echo 請在專案根目錄執行此腳本
    pause
    exit /b 1
)

if not exist "frontend" (
    echo ❌ 錯誤：未找到 frontend 目錄
    echo 請在專案根目錄執行此腳本
    pause
    exit /b 1
)

REM 檢查 conda 是否可用
where conda >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 conda
    echo 請先安裝 Anaconda 或 Miniconda
    pause
    exit /b 1
)

REM 檢查 node 是否可用
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤：未找到 Node.js
    echo 請先安裝 Node.js
    pause
    exit /b 1
)

echo 📦 檢查後端環境...

REM 檢查 conda 環境是否存在
conda env list | findstr "engineerhubweb" >nul
if %errorlevel% neq 0 (
    echo ⚠️  未找到 engineerhubweb 環境，正在創建...
    conda create -n engineerhubweb python=3.11 -y
    if %errorlevel% neq 0 (
        echo ❌ 創建 conda 環境失敗
        pause
        exit /b 1
    )
    
    echo 📦 安裝後端依賴...
    call conda activate engineerhubweb
    cd backend
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ❌ 安裝後端依賴失敗
        pause
        exit /b 1
    )
    cd ..
) else (
    echo ✅ 找到 engineerhubweb 環境
)

REM 檢查環境變數文件
if not exist "backend\.env" (
    echo ⚠️  未找到環境變數文件，正在創建...
    if exist "backend\env_template.txt" (
        copy "backend\env_template.txt" "backend\.env" >nul
        echo 📝 已創建 backend\.env 文件，請編輯並填入實際的 API 金鑰
    ) else (
        echo ❌ 錯誤：未找到環境變數範本文件
        pause
        exit /b 1
    )
)

echo 📦 檢查前端依賴...

REM 檢查前端依賴
if not exist "frontend\node_modules" (
    echo 📦 安裝前端依賴...
    cd frontend
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 安裝前端依賴失敗
        pause
        exit /b 1
    )
    cd ..
) else (
    echo ✅ 前端依賴已安裝
)

REM 檢查前端環境變數
if not exist "frontend\.env.local" (
    echo ⚠️  創建前端環境變數文件...
    (
        echo VITE_API_URL=http://localhost:8000/api
        echo VITE_WS_URL=ws://localhost:8000/ws
        echo VITE_ALGOLIA_APP_ID=your_algolia_app_id
        echo VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_only_key
    ) > "frontend\.env.local"
    echo 📝 已創建 frontend\.env.local 文件，請編輯並填入實際的 API 金鑰
)

echo.
echo 🎉 環境檢查完成！
echo.
echo 📖 接下來的步驟：
echo 1. 編輯 backend\.env 文件，填入實際的 API 金鑰
echo 2. 編輯 frontend\.env.local 文件，填入前端配置
echo 3. 確保 PostgreSQL 和 Redis 服務已啟動
echo 4. 開啟三個命令提示字元分別執行：
echo.
echo    終端機 1 - 後端：
echo    cd backend
echo    conda activate engineerhubweb
echo    python manage.py migrate
echo    python manage.py createsuperuser
echo    python manage.py runserver
echo.
echo    終端機 2 - 前端：
echo    cd frontend
echo    npm run dev
echo.
echo    終端機 3 - Redis ^(如果尚未啟動^)：
echo    redis-server
echo.
echo 🌐 訪問地址：
echo    前端: http://localhost:5173
echo    後端: http://localhost:8000
echo    API 文檔: http://localhost:8000/api/docs/
echo    Admin: http://localhost:8000/admin/
echo.
echo 📚 詳細說明請參考 SETUP_GUIDE.md
echo.
pause 