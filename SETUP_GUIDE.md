# 🚀 EngineerHub 完整安裝設置指南

> **從零開始到本地運行的完整步驟指南**

## 📋 環境需求

### 系統要求
- **作業系統**：Windows 10/11, macOS, Linux
- **Node.js**：版本 18.0 或以上
- **Python**：版本 3.9-3.11（推薦 3.11）
- **Docker Desktop**：版本 4.0 或以上（用於 PostgreSQL 和 Redis）

### 開發工具
- **代碼編輯器**：VS Code（推薦）
- **Git**：版本控制
- **Anaconda/Miniconda**：Python 環境管理
- **Docker Desktop**：容器化管理

---

## 🔑 必要的 API 金鑰

### 1. Algolia 搜尋服務
1. 前往 [Algolia 官網](https://www.algolia.com/)
2. 註冊免費帳號
3. 創建新的應用程式
4. 記錄以下資訊：
   - `Application ID`
   - `Admin API Key`

### 2. Google OAuth 認證
1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新專案或選擇現有專案
3. 啟用 Google+ API
4. 創建 OAuth 2.0 憑證
5. 設置重定向 URI：`http://localhost:8000/accounts/google/login/callback/`
6. 記錄：
   - `Client ID`
   - `Client Secret`

### 3. GitHub OAuth 認證
1. 前往 [GitHub Developer Settings](https://github.com/settings/developers)
2. 點擊 "New OAuth App"
3. 填寫應用程式資訊：
   - Application name: `EngineerHub Local`
   - Homepage URL: `http://localhost:3000`
   - Authorization callback URL: `http://localhost:8000/accounts/github/login/callback/`
4. 記錄：
   - `Client ID`
   - `Client Secret`

---

## 🐳 Docker Desktop 安裝與設置

### Docker Desktop 安裝

#### Windows
1. 前往 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. 下載並安裝 Docker Desktop
3. 重新啟動電腦
4. 確認安裝：
   ```bash
   docker --version
   docker-compose --version
   ```

#### macOS
1. 前往 [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. 下載並安裝 Docker Desktop
3. 從應用程式資料夾啟動 Docker Desktop
4. 確認安裝：
   ```bash
   docker --version
   docker-compose --version
   ```

#### Linux (Ubuntu/Debian)
```bash
# 安裝 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安裝 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.21.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 將用戶添加到 docker 群組
sudo usermod -aG docker $USER
newgrp docker
```

### 啟動 PostgreSQL 和 Redis 容器

#### 方案一：使用 Docker Compose（推薦）

創建 `docker-compose.dev.yml` 文件：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: engineerhub_postgres
    environment:
      POSTGRES_DB: engineerhub
      POSTGRES_USER: engineerhub_user
      POSTGRES_PASSWORD: your_password_here
      POSTGRES_HOST_AUTH_METHOD: trust
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U engineerhub_user -d engineerhub"]
      interval: 10s
      timeout: 5s
      retries: 5

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

  adminer:
    image: adminer:latest
    container_name: engineerhub_adminer
    ports:
      - "8080:8080"
    environment:
      ADMINER_DEFAULT_SERVER: postgres
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

**啟動服務**：
```bash
# 在專案根目錄執行
docker-compose -f docker-compose.dev.yml up -d

# 查看服務狀態
docker-compose -f docker-compose.dev.yml ps

# 查看日誌
docker-compose -f docker-compose.dev.yml logs postgres redis
```

#### 方案二：使用個別 Docker 命令

**啟動 PostgreSQL**：
```bash
# 創建 PostgreSQL 容器
docker run -d \
  --name engineerhub_postgres \
  -e POSTGRES_DB=engineerhub \
  -e POSTGRES_USER=engineerhub_user \
  -e POSTGRES_PASSWORD=your_password_here \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  postgres:15-alpine

# 檢查容器狀態
docker ps | grep postgres
```

**啟動 Redis**：
```bash
# 創建 Redis 容器
docker run -d \
  --name engineerhub_redis \
  -p 6379:6379 \
  -v redis_data:/data \
  redis:7-alpine

# 檢查容器狀態
docker ps | grep redis
```

### 資料庫管理工具

#### 使用 Adminer（Web 界面）
- URL：http://localhost:8080
- 伺服器：postgres
- 用戶名：engineerhub_user
- 密碼：your_password_here
- 資料庫：engineerhub

#### 使用命令行連接
```bash
# 連接到 PostgreSQL
docker exec -it engineerhub_postgres psql -U engineerhub_user -d engineerhub

# 連接到 Redis
docker exec -it engineerhub_redis redis-cli
```

---

## 🛠️ 專案設置步驟

### 步驟 1：克隆專案
```bash
git clone <repository-url>
cd engineerhubweb
```

### 步驟 2：啟動資料庫服務
```bash
# 使用 Docker Compose 啟動（推薦）
docker-compose -f docker-compose.dev.yml up -d

# 確認服務運行
docker-compose -f docker-compose.dev.yml ps
```

### 步驟 3：後端設置

#### 3.1 創建 Python 環境
```bash
# 創建虛擬環境
conda create -n engineerhubweb 
conda activate engineerhubweb

# 或使用 venv
python -m venv engineerhubweb
# Windows
engineerhubweb\Scripts\activate
# macOS/Linux
source engineerhubweb/bin/activate
```

#### 3.2 安裝後端依賴
```bash
cd backend
pip install -r requirements.txt
```

#### 3.3 環境變數設置
```bash
# 複製環境變數範本
cp env_template.txt .env

# 編輯 .env 文件
nano .env  # 或使用你喜歡的編輯器
```

**`.env` 文件內容**（已針對 Docker 優化）：
```env
# Django 設置
SECRET_KEY=your-super-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# 資料庫設置（Docker 配置）
DB_NAME=engineerhub
DB_USER=engineerhub_user
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432

# Redis 設置（Docker 配置）
REDIS_URL=redis://localhost:6379/0

# Algolia 設置
ALGOLIA_APPLICATION_ID=your_algolia_app_id
ALGOLIA_API_KEY=your_algolia_admin_api_key
ALGOLIA_INDEX_PREFIX=engineerhub_dev

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# 郵件設置（開發用）
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# CORS 設置
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
```

#### 3.4 資料庫遷移
```bash
# 測試資料庫連接
python manage.py dbshell --version

# 執行資料庫遷移
python manage.py makemigrations
python manage.py migrate

# 創建超級用戶
python manage.py createsuperuser

# 建立搜尋索引
python manage.py algolia_reindex --verbose
```

### 步驟 4：前端設置

#### 4.1 安裝 Node.js 依賴
```bash
cd ../frontend
npm install
```

#### 4.2 前端環境變數
```bash
# 創建前端環境變數文件
cp .env.example .env.local

# 編輯環境變數
nano .env.local
```

**`.env.local` 文件內容**：
```env
VITE_API_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8000/ws
VITE_ALGOLIA_APP_ID=your_algolia_app_id
VITE_ALGOLIA_SEARCH_KEY=your_algolia_search_only_key
```

---

## 🚀 啟動應用程式

### 服務啟動順序

#### 1. 啟動資料庫服務（如果尚未啟動）
```bash
# 確保在專案根目錄
docker-compose -f docker-compose.dev.yml up -d

# 等待服務就緒
docker-compose -f docker-compose.dev.yml logs -f postgres redis
```

#### 2. 後端啟動
```bash
cd backend

# 確保環境已激活
conda activate engineerhubweb

# 啟動 Django 開發伺服器
python manage.py runserver

# 後端將運行在：http://localhost:8000
```

#### 3. 前端啟動
```bash
# 開啟新終端機
cd frontend

# 啟動前端開發伺服器
npm run dev

# 前端將運行在：http://localhost:5173
```

---

## 🎯 驗證安裝

### 1. 基本功能測試
- **前端**：http://localhost:5173
- **後端 API**：http://localhost:8000/api/
- **API 文檔**：http://localhost:8000/api/docs/
- **資料庫管理**：http://localhost:8080（Adminer）

### 2. 資料庫連接測試
```bash
# 測試 PostgreSQL 連接
docker exec -it engineerhub_postgres psql -U engineerhub_user -d engineerhub -c "SELECT version();"

# 測試 Redis 連接
docker exec -it engineerhub_redis redis-cli ping
```

### 3. 搜尋功能測試
```bash
# 測試 Algolia 連接
cd backend
python manage.py shell

# 在 Django shell 中測試
>>> from core.search import search_service
>>> search_service.posts_index.search('test')
```

### 4. 認證功能測試
- 註冊新用戶
- Google 登入
- GitHub 登入

---

## 🔧 Docker 容器管理

### 常用 Docker 命令

#### 檢查服務狀態
```bash
# 查看容器狀態
docker-compose -f docker-compose.dev.yml ps

# 查看服務日誌
docker-compose -f docker-compose.dev.yml logs postgres
docker-compose -f docker-compose.dev.yml logs redis

# 即時查看日誌
docker-compose -f docker-compose.dev.yml logs -f
```

#### 重啟服務
```bash
# 重啟所有服務
docker-compose -f docker-compose.dev.yml restart

# 重啟特定服務
docker-compose -f docker-compose.dev.yml restart postgres
docker-compose -f docker-compose.dev.yml restart redis
```

#### 停止服務
```bash
# 停止所有服務
docker-compose -f docker-compose.dev.yml stop

# 停止並移除容器
docker-compose -f docker-compose.dev.yml down

# 停止並移除容器和資料卷（危險操作！）
docker-compose -f docker-compose.dev.yml down -v
```

### 資料備份與還原

#### 備份資料庫
```bash
# 備份 PostgreSQL
docker exec engineerhub_postgres pg_dump -U engineerhub_user engineerhub > backup_$(date +%Y%m%d_%H%M%S).sql

# 備份 Redis
docker exec engineerhub_redis redis-cli SAVE
docker cp engineerhub_redis:/data/dump.rdb redis_backup_$(date +%Y%m%d_%H%M%S).rdb
```

#### 還原資料庫
```bash
# 還原 PostgreSQL
docker exec -i engineerhub_postgres psql -U engineerhub_user engineerhub < backup_file.sql

# 還原 Redis
docker cp redis_backup.rdb engineerhub_redis:/data/dump.rdb
docker-compose -f docker-compose.dev.yml restart redis
```

---

## 🔧 額外功能與管理

### Django Admin 管理介面

#### 訪問 Admin
- URL：http://localhost:8000/admin/
- 使用之前創建的超級用戶帳號登入

#### 主要管理功能
1. **用戶管理**
   - 查看/編輯用戶資料
   - 管理用戶權限
   - 查看用戶活動

2. **內容管理**
   - 貼文管理（發布/取消發布）
   - 留言管理
   - 標籤管理

3. **搜尋管理**
   - 查看搜尋歷史
   - 管理熱門搜尋
   - 重建搜尋索引

### 資料庫管理

#### 使用 Adminer Web 界面
- **URL**：http://localhost:8080
- **伺服器**：postgres（容器名稱）
- **用戶名**：engineerhub_user
- **密碼**：your_password_here
- **資料庫**：engineerhub

#### 使用命令行操作
```bash
# 進入 PostgreSQL 容器
docker exec -it engineerhub_postgres psql -U engineerhub_user -d engineerhub

# 常用 SQL 命令
\dt          # 列出所有資料表
\d+ 表名     # 查看資料表結構
SELECT * FROM 表名 LIMIT 10;  # 查看資料
```

### 搜尋索引管理

#### 重建索引
```bash
# 重建所有索引
python manage.py algolia_reindex

# 只重建貼文索引
python manage.py algolia_reindex --model Post

# 只重建用戶索引
python manage.py algolia_reindex --model User

# 清除現有索引後重建
python manage.py algolia_reindex --clear

# 批次處理
python manage.py algolia_reindex --batch-size 500 --verbose
```

#### Algolia Dashboard
- 登入 [Algolia Dashboard](https://www.algolia.com/dashboard)
- 查看搜尋分析
- 調整搜尋設置
- 監控搜尋性能

---

## 🐛 常見問題解決

### 1. Docker 相關問題

#### Docker Desktop 無法啟動
```bash
# Windows: 重新啟動 Docker Desktop 服務
net stop com.docker.service
net start com.docker.service

# 檢查 WSL2 更新（Windows）
wsl --update

# 檢查系統資源
docker system df
docker system prune  # 清理未使用的資源
```

#### 容器啟動失敗
```bash
# 查看容器日誌
docker-compose -f docker-compose.dev.yml logs postgres

# 檢查端口佔用
netstat -tulpn | grep :5432
netstat -tulpn | grep :6379

# 強制重新創建容器
docker-compose -f docker-compose.dev.yml up --force-recreate
```

### 2. 資料庫連接問題

#### PostgreSQL 連接失敗
```bash
# 檢查容器狀態
docker ps | grep postgres

# 測試連接
docker exec -it engineerhub_postgres pg_isready -U engineerhub_user

# 檢查 Django 連接
cd backend
python manage.py dbshell
```

#### Redis 連接失敗
```bash
# 檢查 Redis 狀態
docker exec -it engineerhub_redis redis-cli ping

# 查看 Redis 日誌
docker logs engineerhub_redis
```

### 3. Python 依賴問題

#### psycopg2 安裝失敗
```bash
# 使用 conda 安裝（推薦）
conda install psycopg2-binary

# 或使用預編譯版本
pip install --only-binary=:all: psycopg2-binary
```

### 4. 前端問題

#### 前端無法連接後端
- 檢查 CORS 設置
- 確認後端伺服器運行中
- 檢查防火牆設置
- 驗證環境變數配置

---

## 🔄 更新與維護

### Docker 容器更新
```bash
# 更新 Docker 映像
docker-compose -f docker-compose.dev.yml pull

# 重新啟動服務
docker-compose -f docker-compose.dev.yml up -d
```

### 依賴更新
```bash
# 後端依賴更新
cd backend
pip list --outdated
pip install -U package_name

# 前端依賴更新
cd frontend
npm outdated
npm update
```

### 定期維護任務
```bash
# 清理 Docker 系統
docker system prune -f

# 備份資料庫
docker exec engineerhub_postgres pg_dump -U engineerhub_user engineerhub > backup.sql

# 重建搜尋索引
python manage.py algolia_reindex
```

---

## 🎉 完成！

如果所有步驟都成功完成，你現在應該有一個完全運行的 EngineerHub 開發環境：

- ✅ **前端**：http://localhost:5173
- ✅ **後端 API**：http://localhost:8000
- ✅ **Admin 管理**：http://localhost:8000/admin
- ✅ **API 文檔**：http://localhost:8000/api/docs
- ✅ **資料庫管理**：http://localhost:8080 (Adminer)
- ✅ **PostgreSQL**：透過 Docker 運行
- ✅ **Redis**：透過 Docker 運行
- ✅ **搜尋功能**：已集成 Algolia
- ✅ **認證功能**：支援 Google/GitHub 登入

### 🎯 開發工作流

1. **開始開發**：
   ```bash
   docker-compose -f docker-compose.dev.yml up -d  # 啟動資料庫
   conda activate engineerhubweb                   # 激活 Python 環境
   cd backend && python manage.py runserver        # 啟動後端
   cd frontend && npm run dev                       # 啟動前端
   ```

2. **結束開發**：
   ```bash
   # 停止前後端服務（Ctrl+C）
   docker-compose -f docker-compose.dev.yml stop   # 停止資料庫（可選）
   ```

3. **清理環境**（需要時）：
   ```bash
   docker-compose -f docker-compose.dev.yml down   # 停止並移除容器
   ```

開始享受開發吧！🚀

---

## 📞 需要幫助？

如果遇到任何問題：
1. 檢查上述常見問題解決方案
2. 查看容器日誌：`docker-compose -f docker-compose.dev.yml logs`
3. 查看專案的 `README.md` 文件
4. 查看 Django 和 React 的官方文檔
5. 檢查 Docker 和 Algolia 文檔

**祝你開發愉快！** 🎊 