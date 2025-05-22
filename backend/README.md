# EngineerHub 後端

這是 EngineerHub 工程師社群平台的後端專案，使用 Django REST Framework 開發。

## 功能特點

- 用戶系統 (註冊、登入、個人資料)
- 貼文系統 (文字、圖片、影片、程式碼分享)
- 即時聊天 (WebSocket)
- 個人作品集
- OAuth 社交登入 (Google, GitHub)
- JWT 身份驗證
- API 文檔 (Swagger/ReDoc)

## 技術棧

- **Django & Django REST Framework**：Web框架與REST API
- **PostgreSQL**：資料庫
- **Channels & Redis**：WebSocket支持
- **Pygments**：程式碼語法高亮
- **JWT**：身份驗證
- **OAuth**：社交登入

## 專案結構

```
backend/
├── engineerhub/    # 主項目配置
├── users/          # 用戶管理應用
├── posts/          # 貼文系統應用
├── chat/           # 即時聊天應用
├── profiles/       # 個人檔案頁應用
└── media/          # 媒體文件存儲
```

## API 端點

主要API端點:

- `/api/users/` - 用戶相關操作
- `/api/posts/` - 貼文相關操作
- `/api/chat/` - 聊天相關操作
- `/api/profiles/` - 個人檔案頁相關操作
- `/api/auth/` - 身份驗證
- `/swagger/` - API文檔

## 開發環境設置

1. 安裝依賴:
   ```bash
   pip install -r requirements.txt
   ```

2. 創建並應用遷移:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

3. 創建管理員用戶:
   ```bash
   python manage.py createsuperuser
   ```

4. 啟動開發伺服器:
   ```bash
   python manage.py runserver
   ```

## WebSocket

聊天應用使用 WebSocket 實現即時通訊:

- 連接: `/ws/chat/<conversation_id>/`

## 環境變數

開發時可使用以下環境變數:

- `DJANGO_SECRET_KEY` - Django 密鑰
- `DJANGO_DEBUG` - 調試模式 (True/False)
- `DB_NAME` - 資料庫名稱
- `DB_USER` - 資料庫用戶
- `DB_PASSWORD` - 資料庫密碼
- `DB_HOST` - 資料庫主機
- `REDIS_HOST` - Redis 主機
- `GOOGLE_CLIENT_ID` - Google OAuth 客戶端 ID
- `GITHUB_CLIENT_ID` - GitHub OAuth 客戶端 ID

## 部署

使用 Gunicorn 和 Daphne 部署:

```bash
gunicorn engineerhub.wsgi:application --bind 0.0.0.0:8000
daphne -b 0.0.0.0 -p 8001 engineerhub.asgi:application
``` 