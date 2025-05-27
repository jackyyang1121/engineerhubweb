# 🚀 EngineerHub 完整安裝設置指南

> **從零開始到本地運行的完整步驟指南**

## 📋 一、前置準備 (Prerequisites)

### 1.1 系統與工具需求
- **作業系統**：Windows 10/11, macOS, Linux
- **Node.js**：版本 18.0 或以上
- **Python**：版本 3.9-3.11（推薦 3.11）
- **Docker Desktop**：版本 4.0 或以上（用於 PostgreSQL 和 Redis）
- **代碼編輯器**：VS Code（推薦）
- **Git**：版本控制
- **Anaconda/Miniconda**：Python 環境管理 (推薦)

### 1.2 獲取必要的 API 金鑰
*請預先註冊並獲取以下服務的 API 金鑰，並記錄下來，後續步驟會用到。*

#### 1.2.1 Algolia 搜尋服務
1. 前往 [Algolia 官網](https://www.algolia.com/) 並註冊/登入。
2. 創建一個新的應用程式 (Application)。
3. 在您的應用程式的 API Keys 部分，找到並記錄以下資訊：
   - **`Application ID`**
   - **`Search-Only API Key`** (用於前端)
   - **`Admin API Key`** (也稱為 Write API Key，用於後端索引數據)
   *注意：在後端 `.env` 文件中，`ALGOLIA_API_KEY` 應設為 `Admin API Key`( Write API Key)。在前端 `.env.local` 文件中，`VITE_ALGOLIA_SEARCH_KEY` 應設為 `Search-Only API Key`。*

#### 1.2.2 Google OAuth 認證
1. 前往 [Google Cloud Console](https://console.cloud.google.com/) 並登入。
2. 創建一個新專案或選擇一個現有專案。
3. 導航到 "API 和服務" > "憑證"。
4. 點擊 "建立憑證" > "OAuth 用戶端 ID"。
5. 如果尚未設定，可能需要先設定 "OAuth 同意畫面"。
   - User Type: 外部 (External)
   - 填寫應用程式名稱 (例如 `EngineerHub Local Dev`)、使用者支援電子郵件、開發人員聯絡資訊。
   - 範圍 (Scopes): 通常保持默認或根據需要添加 (例如 email, profile, openid)。
   - 測試使用者: 開發階段可以添加自己的 Google 帳號。
6. 設定應用程式類型為 "網頁應用程式"。
7. 設定 "已授權的 JavaScript 來源": `http://localhost:3000` 和 `http://localhost:5173` (如果前端可能跑在這兩個端口)
8. 設定 "已授權的重新導向 URI": `http://localhost:8000/accounts/google/login/callback/` (這是後端處理回調的地址)
9. 創建後，記錄以下資訊：
   - **`用戶端 ID (Client ID)`**
   - **`用戶端密鑰 (Client Secret)`**
*注意：您可能還需要在 Google Cloud Console 中啟用 "Google People API" 或類似的 API，以允許獲取用戶基本資料。*

#### 1.2.3 GitHub OAuth 認證
1. 前往 [GitHub Developer Settings](https://github.com/settings/developers) > "OAuth Apps"。
2. 點擊 "New OAuth App" (或 "Register a new application")。
3. 填寫應用程式資訊：
   - **Application name**: 例如 `EngineerHub Local Dev`
   - **Homepage URL**: `http://localhost:3000` (或前端運行的主要 URL)
   - **Authorization callback URL**: `http://localhost:8000/accounts/github/login/callback/` (後端處理回調)
4. 點擊 "Register application"。
5. 在應用程式頁面，記錄以下資訊：
   - **`Client ID`**
6. 點擊 "Generate a new client secret" 並記錄：
   - **`Client Secret`**

### 1.3 Docker Desktop 安裝
*請確保 Docker Desktop 已成功安裝並正在運行。*

#### Windows
1. 前往 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. 下載並安裝 Docker Desktop
3. 重新啟動電腦
4. 打開終端 (如 PowerShell 或 CMD) 確認安裝：
   ```bash
   docker --version
   docker-compose --version # 較新版 Docker Desktop 自帶 compose
   ```

#### macOS
1. 前往 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. 下載並安裝 Docker Desktop
3. 從應用程式資料夾啟動 Docker Desktop
4. 打開終端確認安裝：
   ```bash
   docker --version
   docker-compose --version
   ```

#### Linux (Ubuntu/Debian 示例)
```bash
# 安裝 Docker 引擎
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# 將用戶添加到 docker 群組 (避免每次使用 sudo)
sudo usermod -aG docker $USER
# 需要重新登錄或執行以下命令使群組變更生效：
newgrp docker 
# 確認安裝
docker --version
docker compose version # 注意: 新版是 `docker compose` 而非 `docker-compose`
```

---

## 🚀 二、主流程：從零到完整啟動 EngineerHub

*本節將引導您完成從克隆專案到啟動所有服務的完整流程。建議嚴格按照步驟順序執行。*
***Windows 用戶注意***：執行 Python 或 Django 相關命令時，建議使用 **PowerShell** 或 **CMD**，避免 Git Bash 的兼容性問題。對於資料庫遷移等 `manage.py` 命令，強烈推薦使用 Docker 方式執行，如下文所述。*

### 2.1 克隆專案
```bash
git clone <repository-url> # 請替換為實際的倉庫 URL
cd engineerhubweb
```

### 2.2 準備 `docker-compose.dev.yml`
在專案根目錄 (`engineerhubweb`) 的 `docker-compose.dev.yml` 文件應包含以下內容。此文件定義了 PostgreSQL、Redis、Django (用於執行管理命令或運行開發服務器) 和 Adminer（可選的資料庫管理工具）服務。
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: engineerhub_postgres
    environment:
      POSTGRES_DB: engineerhub
      POSTGRES_USER: engineerhub_user
      POSTGRES_PASSWORD: your_POSTGRES_PASSWORD
      POSTGRES_HOST_AUTH_METHOD: trust # 簡化本地開發連接，生產環境請勿使用 trust
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql # 如果有初始化 SQL 腳本，取消此行註釋並確保文件存在
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U engineerhub_user -d engineerhub"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - engineerhub_network

  redis:
    image: redis:7-alpine
    container_name: engineerhub_redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - engineerhub_network

  django:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev # 使用 backend 目錄下的 Dockerfile.dev
    container_name: engineerhub_django
    ports:
      - "8000:8000" # 映射 Django 開發服務器端口
    volumes:
      - ./backend:/app # 掛載本地 backend 目錄到容器的 /app 目錄，方便代碼熱重載
    environment:
      - DJANGO_SETTINGS_MODULE=engineerhub.settings.development
      - DB_HOST=postgres # Django 容器內通過服務名 'postgres' 連接數據庫
      - REDIS_URL=redis://redis:6379/0 # Django 容器內通過服務名 'redis' 連接 Redis
      # 注意：此處的環境變數會覆蓋 backend/.env 文件中的同名變數 (當在 Docker 中運行 Django 時)
      # 其他如 API 金鑰等敏感配置仍建議放在 backend/.env 中，並確保 Dockerfile 或啟動腳本能正確加載它們
      # 或者，您可以將所有環境變數都定義在此處或通過 env_file 加載
    depends_on:
      postgres:
        condition: service_healthy # 確保 postgres 健康後再啟動 django
      redis:
        condition: service_healthy # 確保 redis 健康後再啟動 django
    networks:
      - engineerhub_network
    command: python manage.py runserver 0.0.0.0:8000 # 容器啟動時運行的默認命令

  adminer: # 資料庫 Web 管理工具 (可選，但推薦用於開發)
    image: adminer:latest
    container_name: engineerhub_adminer
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: postgres # 默認連接到此 compose 文件中的 postgres 服務
      ADMINER_DESIGN: hydra # 設置 Adminer 佈景主題
      ADMINER_PLUGINS: tables-filter tinymce # 啟用插件
    depends_on:
      postgres:
        condition: service_healthy # 確保 postgres 啟動並健康後再啟動 adminer
    networks:
      - engineerhub_network

volumes:
  postgres_data: # 用於持久化 PostgreSQL 數據
    driver: local
  redis_data:    # 用於持久化 Redis 數據
    driver: local

networks:
  engineerhub_network: # 定義自定義橋接網絡
    driver: bridge
```
*上述 `django` 服務配置了 `build` 指令，它會使用您 `backend` 目錄下的 `Dockerfile.dev` 文件來構建 Django 應用鏡像。它還掛載了 `backend` 目錄到容器的 `/app`，方便本地代碼更改能即時反映到容器中（如果您的 Django 開發服務器支持熱重載）。此服務既可以用於通過 `docker compose -f docker-compose.dev.yml run --rm django python manage.py <command>` 執行一次性的管理命令（如遷移、創建超級用戶），也可以通過 `docker compose -f docker-compose.dev.yml up django` 來運行開發服務器（儘管指南主要推薦在本地直接運行 Django 開發服務器，並使用 Docker 運行 `postgres` 和 `redis` 等依賴）。*

*以下是 `backend/Dockerfile.dev` 的一個示例 (請確保它與您專案中的實際文件一致)：*
```Dockerfile
# backend/Dockerfile.dev 示例
FROM python:3.11-slim

WORKDIR /app

# 安裝系統依賴
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# 複製requirements文件
COPY requirements.txt .

# 安裝Python依賴
RUN pip install --no-cache-dir -r requirements.txt

# 複製應用代碼
COPY . .

# 設置環境變數
ENV DJANGO_SETTINGS_MODULE=engineerhub.settings.development

# 暴露端口
EXPOSE 8000

# 默認命令 (在 docker-compose.yml 中可以被覆寫)
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

### 2.3 啟動核心基礎服務 (PostgreSQL & Redis)
```bash
# 確保在專案根目錄 (engineerhubweb)
docker compose -f docker-compose.dev.yml up -d postgres redis adminer # 使用 `docker compose` (新版) 或 `docker-compose` (舊版)

# 驗證服務是否成功啟動
docker compose -f docker-compose.dev.yml ps
# 應能看到 engineerhub_postgres, engineerhub_redis, engineerhub_adminer 狀態為 'Up' 或 'running'
```

### 2.4 後端設置
#### 2.4.1 創建並激活 Python 虛擬環境 (用於本地開發和運行 Django 伺服器)
```bash
# 推薦使用 Anaconda/Miniconda
conda create -n engineerhubweb python=3.11 # 根據專案推薦的 Python 版本
conda activate engineerhubweb

# 或者使用 Python 內建 venv
# python -m venv venv_engineerhub
# source venv_engineerhub/bin/activate  # Linux/macOS
# .\venv_engineerhub\Scripts\activate  # Windows PowerShell/CMD
```

#### 2.4.2 安裝後端依賴 (到您的本地虛擬環境)
```bash
cd backend
pip install -r requirements.txt
```

#### 2.4.3 配置後端環境變數 (`.env`)
```bash
# 仍在 backend 目錄下
cp env_template.txt .env # 假設您的專案有 env_template.txt
```
編輯 `backend/.env` 文件，填入您在【1.2 節】獲取的 API 金鑰，並確保以下配置正確：
```env
# Django 設置
SECRET_KEY=your-super-secret-key-here # 請生成一個隨機強密鑰
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 資料庫設置 (對應 docker-compose.dev.yml 中的 postgres 服務)
DB_NAME=engineerhub
DB_USER=engineerhub_user
DB_PASSWORD=your_strong_password_here # 必須與 docker-compose.dev.yml 中 POSTGRES_PASSWORD 一致
DB_HOST=localhost # Docker 端口映射到本地
DB_PORT=5432

# Redis 設置 (對應 docker-compose.dev.yml 中的 redis 服務)
REDIS_URL=redis://localhost:6379/0 # Docker 端口映射到本地

# Algolia 設置
ALGOLIA_APPLICATION_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_admin_api_key # 這是 Admin API Key (Write API Key)
ALGOLIA_INDEX_PREFIX=engineerhub_dev # 或根據您的偏好設置

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 郵件設置 (開發時使用控制台輸出)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# CORS 設置 (根據您的前端訪問地址調整)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173

# 可選：加速開發時啟動 (參考原文件建議)
SKIP_STARTUP_CHECKS=true
CHECK_SERVICES=false
# USE_DUMMY_CACHE=true # 如果 Redis 連接在 Git Bash 有問題，可臨時用此項
```

#### 2.4.4 資料庫遷移與初始化 (推薦使用 Docker 執行)
*這些命令將會初始化資料庫結構、創建超級管理員帳號，並建立 Algolia 搜尋索引。*
```bash
# 回到專案根目錄 (engineerhubweb)
cd .. # 如果當前在 backend 目錄

# 執行資料庫遷移
docker compose -f docker-compose.dev.yml run --rm django python manage.py makemigrations
docker compose -f docker-compose.dev.yml run --rm django python manage.py migrate

# 創建超級用戶 (按照提示輸入用戶名、郵箱和密碼)
docker compose -f docker-compose.dev.yml run --rm django python manage.py createsuperuser

# 重建 Algolia 搜尋索引
docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex --batchsize 500
```

### 2.5 前端設置
#### 2.5.1 安裝 Node.js 依賴
```bash
cd frontend # 確保從專案根目錄進入 frontend
npm install
```

#### 2.5.2 配置前端環境變數 (`.env.local`)
```bash
# 仍在 frontend 目錄下
cp .env.example .env.local # 假設您的專案有 .env.example
```
編輯 `frontend/.env.local` 文件，填入 Algolia 的 **Search-Only API Key**：
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws

# Algolia (前端使用 Search-Only Key)
VITE_ALGOLIA_APP_ID=your_algolia_app_id          # 與後端 .env 中的 ALGOLIA_APPLICATION_ID 相同
VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_only_key # 這是 Search API Key
```

### 2.6 啟動應用程式開發伺服器
*你需要開啟兩個獨立的終端來分別運行後端和前端服務。*

#### 2.6.1 啟動後端 Django 開發伺服器 (本地環境)
* **重要提示**：如果在 Windows Git Bash 中運行遇到問題，請切換到 PowerShell 或 CMD。*
```bash
# 開啟一個新終端
# 導航到後端目錄: cd path/to/your/engineerhubweb/backend

# 激活之前創建的 Python 虛擬環境
# conda activate engineerhubweb
# 或 source venv_engineerhub/bin/activate / .\venv_engineerhub\Scripts\activate

# 啟動 Django 伺服器 (確保在 backend 目錄下)
python manage.py runserver

# 後端服務將運行在 http://localhost:8000
```

#### 2.6.2 啟動前端 Vite 開發伺服器
```bash
# 開啟另一個新終端
# 導航到前端目錄: cd path/to/your/engineerhubweb/frontend

# 啟動前端開發伺服器 (確保在 frontend 目錄下)
npm run dev

# 前端應用將運行在 http://localhost:5173 (或您前端配置的端口，如 3000)
```

### 2.7 驗證安裝
成功啟動所有服務後，您可以通過以下地址訪問應用：
- **前端應用**: http://localhost:5173 (或您前端配置的端口)
- **後端 API 根目錄**: http://localhost:8000/api/
- **後端 API 文檔 (Swagger/OpenAPI)**: http://localhost:8000/api/docs/ (通常位於此路徑，具體看專案配置)
- **資料庫管理 (Adminer)**: http://localhost:8080
  - 系統: PostgreSQL
  - 伺服器: `postgres` (或 `engineerhub_postgres`，這是 `docker-compose.dev.yml` 中定義的服務名)
  - 用戶名: `engineerhub_user`
  - 密碼: `your_strong_password_here` (您在 `docker-compose.dev.yml` 和後端 `.env` 中設置的密碼)
  - 資料庫: `engineerhub`

---

## 🔧 四、Django Admin 與其他管理功能

*本節內容假設您已成功啟動後端服務。*

### 4.1 Django Admin 管理介面

#### 4.1.1 訪問 Admin
- **URL**: http://localhost:8000/admin/
- **用戶名/密碼**: 您在執行 `docker compose -f docker-compose.dev.yml run --rm django python manage.py createsuperuser` (或本地 `python manage.py createsuperuser`) 時所創建的超級用戶帳號。
- **說明**：使用超級用戶帳號登入後台，管理應用數據。

> **💡 提示**：如需創建更多管理員用戶，可重複執行創建超級用戶的命令：
> ```bash
> # Docker 方式 (推薦)
> docker compose -f docker-compose.dev.yml run --rm django python manage.py createsuperuser
> 
> # 本地方式 (需在已激活 Python 環境的 backend 目錄下，並確保終端兼容)
> # python manage.py createsuperuser
> ```

#### 4.1.2 主要管理功能示例
*(具體功能取決於您的 Django 專案配置)*
1.  **用戶管理**：查看/編輯用戶資料、管理用戶權限等。
2.  **內容管理**：管理貼文、留言、標籤等 (如果您的應用有這些模型)。
3.  **其他應用模型管理**：根據您在 `admin.py` 中註冊的模型而定。

### 4.2 搜尋索引管理 (Algolia)
*這些命令用於管理與 Algolia 的數據同步。推薦使用 Docker 執行。*

#### 4.2.1 重建索引
```bash
# (確保在專案根目錄 engineerhubweb)

# 重建所有已註冊模型的索引
docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex

# 只重建特定模型的索引 (例如 Post 模型)
# docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex --model Post

# 清除 Algolia 上的現有索引後再重建 (謹慎使用)
# docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex --clear

# 批次處理 (如果數據量大，可調整 batchsize，默認值通常在 algolia 設置中)
docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex --batchsize 500 # 示例 batchsize

# 顯示更詳細的輸出信息
docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex -v 2
```

#### 4.2.2 Algolia Dashboard
- 登入 [Algolia Dashboard](https://www.algolia.com/dashboard) 查看您的應用。
- **功能**：查看索引數據、監控搜尋分析、調整搜尋排名和相關性設置、管理 API 金鑰等。

---

## 🎛️ 五、Windows Git Bash 兼容性問題與建議

### 5.1 問題描述
在 **Windows Git Bash** (MSYS2) 環境中，直接運行某些 Python 命令 (特別是涉及 C 擴展的包，如 `psycopg2-binary`, `redis`, `grpcio` 等) 時，可能會遇到：
1.  **錯誤訊息**：如 `TP_NUM_C_BUFS too small: 50` 或 `Internal error: TP_NUM_C_BUFS too small: 50`。
2.  **症狀**：Django 服務 (`python manage.py runserver`) 啟動後可能很快異常終止，或者 `manage.py` 命令 (如 `migrate`, `shell`) 執行到一半卡住或失敗。

### 5.2 推薦解決方案

#### 5.2.1 方案一：使用 Docker 執行 Django 管理命令 (強烈推薦)
*這是最可靠的方法，可以完全避免本地環境的兼容性問題。*
```bash
# 所有 Django manage.py 命令都通過 Docker 容器執行
# 確保在專案根目錄 (engineerhubweb)
docker compose -f docker-compose.dev.yml run --rm django python manage.py <your_command_here>

# 示例:
docker compose -f docker-compose.dev.yml run --rm django python manage.py migrate
docker compose -f docker-compose.dev.yml run --rm django python manage.py createsuperuser
docker compose -f docker-compose.dev.yml run --rm django python manage.py shell
docker compose -f docker-compose.dev.yml run --rm django python manage.py collectstatic --noinput
```
對於本地開發伺服器 (`runserver`)，如果仍想在 Git Bash 中運行，而僅將其他管理命令通過 Docker 執行，這也是一種策略。但如果 `runserver` 本身也出問題，則需考慮方案二。

#### 5.2.2 方案二：切換終端環境 (用於本地 Python 命令)
對於需要在本地直接運行的 Python/Django 命令 (例如 `python manage.py runserver` 或您不想通過 Docker 執行的其他命令)：
- **使用 Windows PowerShell**
- **使用 Windows 命令提示字元 (CMD)**
- **在 VS Code 中使用集成終端**：確保選擇 PowerShell 或 CMD 作為默認終端配置，而不是 Git Bash。

```powershell
# 示例：在 PowerShell 中運行
# 1. 導航到專案的 backend 目錄
cd C:\path\to\your\engineerhubweb\backend
# 2. 激活 Python 虛擬環境
# conda activate engineerhubweb  (如果使用 Conda)
# .\venv_engineerhub\Scripts\activate (如果使用 venv)
# 3. 運行 Django 命令
python manage.py runserver
```

#### 5.2.3 方案三：修改 `.env` 文件中的配置 (作為輔助手段)
在 `backend/.env` 文件中，可以嘗試以下配置，有時能緩解部分問題，但**不能完全取代方案一或方案二**：
```env
# backend/.env
# ... 其他設置 ...

# 跳過一些啟動檢查，可能減少與 C 擴展相關的早期調用
SKIP_STARTUP_CHECKS=True
CHECK_SERVICES=False

# 如果 Redis 連接在 Git Bash 中特別不穩定，可以臨時使用虛擬緩存進行開發 (功能會受限)
# USE_DUMMY_CACHE=True 
```
*`USE_DUMMY_CACHE=True` 會導致 Redis 的功能 (如緩存、Celery 消息隊列等) 失效，僅適用於非常有限的調試場景。*

### 5.3 推薦的開發工作流 (綜合考慮)
請參考文檔末尾的「開發工作流總結」部分，其中會根據不同操作系統和偏好給出建議。

---

## 🐛 六、常見問題 (FAQ) 與解決方案

### 6.1 Docker 相關問題

#### Docker Desktop 無法啟動或運行異常
- **Windows**: 
    - 嘗試重新啟動 Docker Desktop 應用。
    - 在任務管理器中檢查 Docker Desktop Service (`com.docker.service`) 是否正在運行，嘗試手動停止後再啟動。
    - 確保您的 Windows 操作系統已啟用虛擬化功能 (通常在 BIOS/UEFI 中設置)。
    - 如果使用 WSL2 後端，確保 WSL2 已正確安裝和更新 (`wsl --update`，然後 `wsl --shutdown` 再重啟 Docker Desktop)。
- **macOS**: 
    - 嘗試從應用程式文件夾退出並重新啟動 Docker Desktop。
    - 檢查系統資源是否充足。
- **通用**: 
    - 嘗試執行 `docker system df` 查看磁盤使用情況，並使用 `docker system prune -a` 清理未使用的 Docker 資源 (容器、鏡像、網絡、數據卷 - **謹慎使用 `-a` 和 `--volumes` 標誌**)。
    - 檢查 Docker Desktop 的日誌文件獲取更詳細的錯誤信息。

#### 容器啟動失敗 (例如 `postgres` 或 `redis`)
- **查看日誌**: 這是首要步驟。
  ```bash
  docker compose -f docker-compose.dev.yml logs <service_name> # 例如: postgres
  ```
- **端口衝突**: 檢查是否有其他應用佔用了容器試圖綁定的端口 (例如 5432 for PostgreSQL, 6379 for Redis, 8080 for Adminer)。
  ```bash
  # Linux/macOS
  # sudo lsof -i :5432
  # Windows (PowerShell/CMD)
  # netstat -ano | findstr ":5432"
  ```
  如果端口被佔用，停止佔用端口的應用，或者修改 `docker-compose.dev.yml` 中容器的端口映射 (例如 `"5433:5432"`) 並更新您的應用配置。
- **數據卷權限問題**: 較少見，但如果 Docker 無法寫入掛載的數據卷，可能會失敗。檢查 Docker 日誌。
- **資源不足**: 確保您的系統有足夠的內存和磁盤空間分配給 Docker。
- **強制重新創建容器**: 有時鏡像或容器狀態損壞，可以嘗試強制重新創建。
  ```bash
  docker compose -f docker-compose.dev.yml up -d --force-recreate <service_name>
  ```

### 6.2 資料庫連接問題 (PostgreSQL/Redis)

#### Django 應用無法連接到 PostgreSQL
- **確認 PostgreSQL 容器正在運行且健康**:
  ```bash
  docker compose -f docker-compose.dev.yml ps # 檢查 postgres 服務狀態
  docker compose -f docker-compose.dev.yml exec postgres pg_isready -U engineerhub_user -d engineerhub # 應返回 "accepting connections"
  ```
- **檢查後端 `.env` 配置**: 
    - `DB_HOST`: 應為 `localhost` (因為 Docker 端口已映射到主機)。
    - `DB_PORT`: 應為 `5432` (或您在 `docker-compose.dev.yml` 中映射的主機端口)。
    - `DB_NAME`, `DB_USER`, `DB_PASSWORD`: 必須與 `docker-compose.dev.yml` 中 `postgres` 服務的 `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` 環境變數完全一致。
- **網絡問題**: 
    - 如果您在 Docker 容器內運行 Django (例如通過 `docker compose up django`)，則 `DB_HOST` 應為 Docker Compose 網絡中的服務名，即 `postgres`，而不是 `localhost`。
    - 但按照本文檔的推薦流程 (本地運行 Django，Docker 運行數據庫)，`DB_HOST` 應為 `localhost`。
- **防火牆**: 確保防火牆沒有阻止本地應用訪問 `localhost` 上的端口。

#### Django 應用無法連接到 Redis
- **確認 Redis 容器正在運行且健康**:
  ```bash
  docker compose -f docker-compose.dev.yml ps # 檢查 redis 服務狀態
  docker compose -f docker-compose.dev.yml exec redis redis-cli PING # 應返回 PONG
  ```
- **檢查後端 `.env` 配置**: 
    - `REDIS_URL`: 應為 `redis://localhost:6379/0` (或您在 `docker-compose.dev.yml` 中映射的主機端口，以及您想使用的 Redis 資料庫編號)。
- **網絡和防火牆**: 同 PostgreSQL 的檢查點。

### 6.3 Python 依賴與環境問題

#### `psycopg2` (PostgreSQL 驅動) 安裝失敗
- **確保已安裝編譯依賴**: `psycopg2` 有時需要編譯。在某些系統上，可能需要安裝 `postgresql-devel` (Linux) 或類似的開發包。
- **使用預編譯的二進制包**: 這是更簡單的方法。
  ```bash
  pip install psycopg2-binary
  ```
  如果使用 `conda` 環境，可以嘗試：
  ```bash
  conda install psycopg2
  ```
  確保您的 `requirements.txt` 指定的是 `psycopg2-binary` 而不是 `psycopg2`，除非您有特定原因需要從源碼編譯。

#### 虛擬環境問題
- **確認已激活**: 每次打開新的終端準備運行 Python/Django 命令時，都要確保正確的虛擬環境已被激活。
- **依賴未安裝到正確環境**: 如果您有多個 Python 環境，確保 `pip install -r requirements.txt` 是在激活的目標虛擬環境中執行的。

### 6.4 前端問題

#### 前端無法連接到後端 API (`VITE_API_URL`)
- **確認後端 Django 伺服器正在運行**: 在瀏覽器中直接訪問 `http://localhost:8000/api/` (或您的 API 根路徑) 看看是否有響應。
- **檢查前端 `.env.local` 中的 `VITE_API_URL`**: 確保它指向後端正在運行的正確地址和端口 (通常是 `http://localhost:8000/api`)。
- **CORS (跨域資源共享) 問題**: 
    - 在瀏覽器的開發者工具 (通常按 F12，查看 Console 和 Network 標籤) 中檢查是否有 CORS 相關的錯誤。
    - 確保後端 Django 專案的 `settings.py` (或 `.env` 文件中的 `CORS_ALLOWED_ORIGINS`) 正確配置，允許來自前端源 (例如 `http://localhost:5173`) 的請求。
- **防火牆**: 檢查是否有防火牆阻止了前端應用訪問後端 API 端口。

#### Algolia 搜索在前端不工作
- **檢查前端 `.env.local` 配置**: 
    - `VITE_ALGOLIA_APP_ID`: 必須正確。
    - `VITE_ALGOLIA_SEARCH_KEY`: 必須是 Algolia 的 **Search-Only API Key**。
- **檢查 Algolia 索引**: 確保數據已通過後端 `manage.py algolia_reindex` 命令成功索引到 Algolia。
- **網絡問題**: 確保客戶端可以訪問 Algolia 的服務器 (`*.algolia.net`, `*.algolianet.com`)。
- **瀏覽器控制台錯誤**: 查看是否有與 Algolia SDK 相關的錯誤信息。

---

## 🔄 七、更新與維護

### 7.1 更新 Docker 鏡像
*定期更新您在 `docker-compose.dev.yml` 中使用的基礎鏡像 (如 `postgres:15-alpine`, `redis:7-alpine`) 是個好習慣，以獲取安全補丁和新功能。*
```bash
# 1. 拉取最新的鏡像版本 (根據您 docker-compose.dev.yml 中指定的標籤)
docker compose -f docker-compose.dev.yml pull postgres redis adminer

# 2. 停止並重新創建使用新鏡像的容器
docker compose -f docker-compose.dev.yml up -d --force-recreate postgres redis adminer

# (可選) 清理舊的、未被使用的鏡像
docker image prune
```

### 7.2 更新項目依賴

#### 後端 Python 依賴
```bash
# 1. (可選) 查看過時的包
# cd backend
# conda activate engineerhubweb # 或其他虛擬環境激活命令
# pip list --outdated

# 2. 更新 requirements.txt 文件 (如果依賴有版本範圍，直接安裝可能不會升級到最新，除非手動修改文件或使用工具)
#    或者，如果您想升級單個包:
#    pip install -U package_name

# 3. 根據更新後的 requirements.txt 重新安裝/升級
cd backend
# 確保虛擬環境已激活
pip install -r requirements.txt

# 4. 如果後端服務是通過 Docker 鏡像運行的 (例如您有一個生產環境的 Dockerfile)
#    則需要重建 Docker 鏡像以包含更新的依賴。
#    docker compose -f docker-compose.prod.yml build django # 假設服務名是 django
```

#### 前端 Node.js 依賴
```bash
cd frontend

# 1. (可選) 查看過時的包
npm outdated

# 2. 交互式更新 (推薦)
npm update
# 或者，對於主要版本更新，可能需要使用 `npm install package_name@latest` 並測試兼容性。
# 有些專案可能使用 `npx npm-check-updates -u` 來升級 package.json，然後再 `npm install`。

# 3. 更新後，重新運行 npm install 以確保 lock 文件同步
npm install
```
*更新依賴後，務必進行充分測試以確保沒有引入兼容性問題。*

### 7.3 定期維護任務

#### 清理 Docker 系統
*定期清理未使用的 Docker 資源可以釋放磁盤空間。*
```bash
# 清理已停止的容器、未使用的網絡、懸空的鏡像和構建緩存
docker system prune -f

# 如果想更徹底地清理，包括未被任何容器使用的鏡像 (謹慎！)
# docker system prune -a -f

# 如果想清理未使用的數據卷 (極度謹慎！確保沒有重要數據在未掛載的數據卷中)
# docker volume prune -f
```

#### 資料庫備份
*定期備份您的數據非常重要。請參考【3.4 資料庫備份與還原】部分的詳細指令。*
```bash
# 示例：PostgreSQL 備份
docker compose -f docker-compose.dev.yml exec -T postgres pg_dump -U engineerhub_user -d engineerhub > engineerhub_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 重建搜尋索引
*如果數據模型或索引邏輯有變更，或者懷疑索引不同步，可以重建 Algolia 索引。*
```bash
docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex
```

---

## 🎉 八、開發工作流總結與完成

如果所有步驟都成功完成，您現在應該有一個本地運行的 EngineerHub 開發環境。

- ✅ **前端訪問**: 通常在 http://localhost:5173 (或您在 `frontend/package.json` 或 `.env.local` 中配置的端口)
- ✅ **後端 API**: 通常在 http://localhost:8000
- ✅ **Django Admin 管理後台**: http://localhost:8000/admin/
- ✅ **API 文檔 (如有配置)**: 例如 http://localhost:8000/api/docs/
- ✅ **資料庫 Web 管理 (Adminer)**: http://localhost:8080
- ✅ **PostgreSQL 數據庫**: 通過 Docker 運行，由 `docker-compose.dev.yml` 管理。
- ✅ **Redis 緩存/消息隊列**: 通過 Docker 運行，由 `docker-compose.dev.yml` 管理。
- ✅ **搜尋功能**: 集成 Algolia，數據通過後端命令同步。
- ✅ **OAuth 認證**: Google/GitHub 登入應可配置並測試。

### 8.1 推薦的開發工作流

#### 方式一：混合模式 (本地運行應用 + Docker 運行依賴服務) - 適用於所有操作系統
*這是本文檔主要引導的流程，兼顧開發效率和環境一致性。*

1.  **啟動基礎設施服務 (一次性，除非重啟電腦或手動停止)**:
    ```bash
    # 在專案根目錄 (engineerhubweb)
    docker compose -f docker-compose.dev.yml up -d postgres redis adminer
    ```

2.  **後端開發 (在一個終端中)**:
    ```bash
    cd backend
    # 激活 Python 虛擬環境 (例如: conda activate engineerhubweb)
    python manage.py runserver
    ```
    *Windows Git Bash 用戶注意：如果 `runserver` 不穩定，請使用 PowerShell 或 CMD 運行此命令。*

3.  **前端開發 (在另一個終端中)**:
    ```bash
    cd frontend
    npm run dev
    ```

4.  **執行 Django 管理命令 (例如 `migrate`, `createsuperuser`)**:
    *強烈推薦使用 Docker 執行，以避免兼容性問題，特別是在 Windows Git Bash 上。*
    ```bash
    # 在專案根目錄 (engineerhubweb) 的新終端中執行
    docker compose -f docker-compose.dev.yml run --rm django python manage.py <your_command>
    # 例如:
    # docker compose -f docker-compose.dev.yml run --rm django python manage.py migrate
    ```

5.  **結束開發**:
    - 在運行 `runserver` 和 `npm run dev` 的終端中按 `Ctrl+C` 停止服務。
    - Docker 中的 `postgres`, `redis`, `adminer` 服務會繼續在後台運行。如果您想停止它們：
      ```bash
      docker compose -f docker-compose.dev.yml stop # 只停止，不移除
      # 或
      # docker compose -f docker-compose.dev.yml down # 停止並移除容器 (數據卷默認保留)
      ```

#### 方式二：完全 Docker 化開發 (進階，需要為前後端都配置好 Dockerfile)
*此方式將前後端應用本身也容器化運行。需要更完善的 Docker 配置，但能提供最佳的環境一致性。*

1.  **準備 `docker-compose.dev.yml`**: 
    除了 `postgres` 和 `redis`，還需要為 `django` (後端) 和 `frontend` (前端) 定義服務，使其能夠通過 `docker compose up` 啟動。這通常意味著 `django` 服務的 `Dockerfile` 會使用 `CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]`，前端服務的 `Dockerfile` 會構建並服務前端靜態文件或啟動開發伺服器。

2.  **啟動所有服務**:
    ```bash
    # 在專案根目錄
    docker compose -f docker-compose.dev.yml up --build # --build 會在啟動前重新構建鏡像
    ```
    *日誌會混合輸出。可以通過 `docker compose logs -f <service_name>` 查看特定服務日誌。*

3.  **執行 Django 管理命令**:
    ```bash
    docker compose -f docker-compose.dev.yml run --rm django python manage.py <your_command>
    # 或者，如果 django 服務設計為長時間運行，可以使用 exec:
    # docker compose -f docker-compose.dev.yml exec django python manage.py <your_command>
    ```

4.  **結束開發**:
    ```bash
    docker compose -f docker-compose.dev.yml down
    ```
*這種方式需要對 Docker 有更深入的理解，並妥善處理代碼熱重載、調試等開發體驗問題。*

### 8.2 最終提示

- **Git Bash 用戶 (Windows)**: 盡可能使用【方式一】中的 Docker 方式執行 `manage.py` 命令。對於本地 `runserver`，如果 Git Bash 不行，換 PowerShell/CMD。
- **PowerShell/CMD 用戶 (Windows)**: 【方式一】通常能很好地工作。
- **Linux/macOS 用戶**: 【方式一】通常能很好地工作。也可以更容易地嘗試【方式二】。

### 🔧 常用 Docker Compose 命令速查 (使用 `docker-compose.dev.yml`)
*以下命令均假設在專案根目錄執行，並使用 `-f docker-compose.dev.yml` 指定配置文件。*

- **啟動所有服務 (後台)**: `docker compose up -d`
- **啟動特定服務 (後台)**: `docker compose up -d <service_name_1> <service_name_2>`
- **查看服務狀態**: `docker compose ps`
- **查看所有服務日誌 (追蹤)**: `docker compose logs -f`
- **查看特定服務日誌 (追蹤)**: `docker compose logs -f <service_name>`
- **停止所有服務**: `docker compose stop`
- **停止並移除容器**: `docker compose down`
- **停止並移除容器和數據卷 (危險!)**: `docker compose down -v`
- **執行一次性命令 (如 Django 管理命令)**: `docker compose run --rm <service_name_for_command_runner> <command_and_args>`
  (例如: `docker compose run --rm django python manage.py migrate`)
- **在運行中的容器內執行命令**: `docker compose exec <running_service_name> <command_and_args>`
  (例如: `docker compose exec postgres psql -U engineerhub_user -d engineerhub`)
- **重建服務鏡像**: `docker compose build <service_name>`
- **拉取最新鏡像**: `docker compose pull <service_name>`

---

## 📞 需要幫助？

如果在本指南執行過程中遇到任何問題：
1.  **仔細閱讀錯誤訊息**：它們通常包含解決問題的關鍵線索。
2.  **檢查相關日誌**：
    - Docker 容器日誌: `docker compose -f docker-compose.dev.yml logs <service_name>`
    - 瀏覽器開發者控制台日誌。
    - 後端 Django 伺服器終端輸出。
    - 前端 Vite 開發伺服器終端輸出。
3.  **回顧本文檔相關章節**：特別是「常見問題解決」和「Windows Git Bash 兼容性問題」。
4.  **檢查專案的 `README.md` 文件**：可能包含特定於該專案的額外提示或最新更改。
5.  **查閱官方文檔**：Django、React (或您使用的前端框架)、Docker、PostgreSQL、Redis、Algolia 等都有詳盡的官方文檔。
6.  **搜索引擎是您的朋友**：將錯誤訊息或問題描述輸入搜索引擎，很可能找到有相同經歷的人和解決方案。

**祝你開發愉快！** 🚀 