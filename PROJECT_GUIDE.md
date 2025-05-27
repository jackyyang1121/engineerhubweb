# 🚀 EngineerHub 學習指南：從零到一打造全端技術社群

> **專為初學者設計的企業級專案深度學習手冊**

## 📖 第一部分：啟程 EngineerHub

### 1.1 歡迎來到 EngineerHub！

親愛的開發者：

歡迎踏上 EngineerHub 的學習之旅！EngineerHub 不僅僅是一個專案範例，它更是一座橋樑，旨在引導您從初學者的行列邁向能夠理解和構建現代化、企業級全端應用的開發者。

本專案模擬了一個為工程師打造的技術社群平台，採用了業界流行的前後端分離架構。透過學習 EngineerHub，您將深入接觸到：

*   **前端技術**：React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Query
*   **後端技術**：Django 4.2, Django REST Framework, PostgreSQL, Redis, Celery, Channels
*   **第三方服務整合**：Algolia 企業級搜尋、Google/GitHub OAuth 認證
*   **現代開發實踐**：API 設計、JWT 認證、WebSocket 即時通訊、非同步任務處理、單元測試、Docker 容器化等。

**本指南的目標讀者**：
本指南特別為希望從實際專案中學習的 **App 開發初學者** 設計。如果您具備 HTML, CSS, JavaScript, Python 的基礎知識，並對 React 和 Django 有初步了解，那麼本指南將是您絕佳的進階材料。

**學習前提**：
*   熟悉基本的命令列操作。
*   已安裝如 `SETUP_GUIDE.md` 中所述的開發環境（Node.js, Python, Docker Desktop）。
*   對 Git 版本控制有基本認識。

讓我們一起探索 EngineerHub 的奧秘，解鎖全端開發的技能樹！

### 1.2 快速開始與環境設置

在深入專案細節之前，確保您的開發環境已經準備就緒。

**最重要的第一步**：請務必遵循 `SETUP_GUIDE.md` 文件中的指示，完成所有環境配置、API 金鑰獲取、Docker 容器啟動以及初始資料庫設置。該指南提供了從零開始到成功運行本地開發環境的完整步驟。

**核心啟動流程回顧** (詳細步驟請參閱 `SETUP_GUIDE.md`)：

1.  **前置準備** (`SETUP_GUIDE.md` 第一章)：
    *   安裝系統與工具 (Node.js, Python, Docker Desktop, Git)。
    *   獲取必要的 API 金鑰 (Algolia, Google OAuth, GitHub OAuth)。
    *   安裝並運行 Docker Desktop。

2.  **主流程：從零到完整啟動 EngineerHub** (`SETUP_GUIDE.md` 第二章)：
    *   **克隆專案**：`git clone <repository-url>`
    *   **準備 `docker-compose.dev.yml`**：用於管理 PostgreSQL, Redis, Adminer 等服務。
    *   **啟動核心基礎服務**：`docker compose -f docker-compose.dev.yml up -d postgres redis adminer`
    *   **後端設置**：
        *   創建並激活 Python 虛擬環境。
        *   安裝後端依賴 (`pip install -r backend/requirements.txt`)。
        *   配置後端環境變數 (`backend/.env`)，填入 API 金鑰和資料庫密碼。
        *   **資料庫遷移與初始化 (推薦使用 Docker 執行)**：
            ```bash
            # 確保在專案根目錄
            docker compose -f docker-compose.dev.yml run --rm django python manage.py makemigrations
            docker compose -f docker-compose.dev.yml run --rm django python manage.py migrate
            docker compose -f docker-compose.dev.yml run --rm django python manage.py createsuperuser
            docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex
            ```
    *   **前端設置**：
        *   安裝 Node.js 依賴 (`cd frontend && npm install`)。
        *   配置前端環境變數 (`frontend/.env.local`)，填入 Algolia App ID 和 Search-Only API Key。
    *   **啟動應用程式開發伺服器**：
        *   **後端 (本地)**：`cd backend && python manage.py runserver` (建議使用 PowerShell/CMD)
        *   **前端 (本地)**：`cd frontend && npm run dev`

3.  **驗證安裝**：
    *   前端應用: `http://localhost:5173` (或您配置的端口)
    *   後端 API: `http://localhost:8000/api/`
    *   Adminer (資料庫管理): `http://localhost:8080`

> **⚠️ Windows Git Bash 用戶特別注意**：
> 執行 Python 或 Django 相關命令 (`manage.py`) 時，強烈建議使用 **PowerShell**、**CMD**，或者通過 **Docker 執行**（如 `docker compose ... run --rm django python manage.py ...`）。這可以避免 Git Bash 環境下潛在的兼容性問題。詳細說明請參考 `SETUP_GUIDE.md` 中關於 Git Bash 兼容性的章節。

### 1.3 專案總體架構

EngineerHub 採用了經典的**前後端分離架構**。這種架構模式將用戶界面（前端）的邏輯與業務處理和數據存儲（後端）的邏輯清晰地分開，帶來了諸多優勢，如獨立開發、獨立部署、更易於擴展等。

```
                                     +------------------------+
                                     |       用戶瀏覽器       |
                                     +------------------------+
                                                | ▲
                                                | | HTTP/HTTPS (API 請求)
                                                | | WebSocket (即時通訊)
                                                ▼ |
      +--------------------------------------------------------------------------+
      |                                   Web 伺服器                               |
      +--------------------------------------------------------------------------+
         |                                      ▲                                |
   (靜態文件: HTML, CSS, JS)                  (API 請求)                         |
         |                                      |                                |
         ▼                                      |                                |
+---------------------+                +---------------------+                +----------------------+
|    🎨 前端應用     |                 |    🔧 後端 API      |                 |   🔄 第三方服務       |
| (React + TypeScript)|                | (Django REST API)   |                +----------------------+
| - UI 渲染           |                +---------------------+                | - Algolia (搜尋)      |
| - 用戶互動          |                         | ▲                            | - Google/GitHub OAuth|
| - API 請求          |                         | | DB Queries, Cache, Tasks   | - ...                |
+---------------------+                         | |                            +----------------------+
                                                ▼ |
                                     +------------------------+
                                     |    💾 資料層           |
                                     +------------------------+
                                     | - PostgreSQL (主數據庫) |
                                     | - Redis (快取, 訊息隊列)|
                                     +------------------------+
```

**主要組成部分**：

1.  **🎨 前端 (Frontend)**：
    *   **技術棧**：React (使用 TypeScript)
    *   **職責**：負責用戶界面的展示和用戶互動。它是一個單頁應用 (SPA)，通過瀏覽器運行。前端通過向後端發送 API 請求來獲取數據或觸發操作。對於即時聊天等功能，前端會與後端建立 WebSocket 連接。
    *   **目錄**：`engineerhubweb/frontend/`

2.  **🔧 後端 (Backend)**：
    *   **技術棧**：Django (使用 Django REST Framework 構建 API)
    *   **職責**：處理業務邏輯、數據驗證、用戶認證、與資料庫交互、提供 RESTful API 接口給前端，並與第三方服務（如 Algolia）集成。同時，通過 Django Channels 支持 WebSocket 即時通訊，通過 Celery 處理非同步任務。
    *   **目錄**：`engineerhubweb/backend/`

3.  **💾 資料層 (Data Layer)**：
    *   **PostgreSQL**：作為主要的關係型資料庫，存儲用戶資訊、貼文、留言等持久化數據。
    *   **Redis**：作為高效能的鍵值資料庫，用於數據快取 (caching) 以提升 API 響應速度，同時也作為 Celery 的訊息代理 (message broker) 和 Django Channels 的頻道層後端 (channel layer backend)。
    *   **管理**：這兩者都通過 Docker 容器運行，由 `docker-compose.dev.yml` 文件統一配置和管理。

4.  **🔄 第三方服務 (Third-Party Services)**：
    *   **Algolia**：提供強大的即時搜尋功能。後端負責將數據索引到 Algolia，前端直接查詢 Algolia 以獲得快速的搜尋結果。
    *   **Google/GitHub OAuth**：用於實現第三方帳號登入，簡化用戶註冊和登入流程。

**專案目錄結構概覽**：

```
engineerhubweb/
├── 🎨 frontend/                    # React + TypeScript 前端應用 (詳見第三部分)
│   ├── src/
│   ├── public/
│   └── 📖 FRONTEND_GUIDE.md        # (本指南將取代此文件)
├── 🔧 backend/                     # Django REST API 後端 (詳見第二部分)
│   ├── accounts/                   # 用戶認證與基礎用戶模型
│   ├── users/                      # 用戶詳細資料 (與 profile 可能有重疊，需確認)
│   ├── profiles/                   # 用戶個人檔案 (技能、作品集等)
│   ├── posts/                      # 貼文功能模組
│   ├── comments/                   # 留言功能模組
│   ├── notifications/              # 通知系統模組
│   ├── chat/                       # 即時聊天模組
│   ├── core/                       # 核心共享功能 (搜尋服務接口, 自定義權限, 分頁等)
│   └── 📖 BACKEND_GUIDE.md         # (本指南將取代此文件)
├── 🐳 docker-compose.dev.yml       # 開發環境 Docker Compose 配置
├── 🚀 SETUP_GUIDE.md               # 完整環境安裝指南
├── 📖 PROJECT_GUIDE.md             # 本學習指南 (您正在閱讀的文件)
└──  기타...                       # (如 .gitignore, requirements.txt for backend, etc.)
```

---

## 📖 第二部分：後端深度解析 (Django REST Framework)

後端是 EngineerHub 的大腦，負責處理所有核心業務邏輯、數據存儲和 API 服務。本專案的後端採用 Python 語言和 Django 框架，並利用 Django REST Framework (DRF) 快速構建強大的 RESTful API。

### 2.1 後端核心概念

#### Django MVT 架構
Django 遵循 MVT (Model-View-Template) 設計模式，這與常見的 MVC (Model-View-Controller) 模式略有不同：
*   **Model (模型)**：數據的抽象層，直接與資料庫交互。定義數據結構、欄位類型、驗證規則以及數據之間的關係。通常位於各個 app 的 `models.py` 文件中。
*   **View (視圖)**：處理用戶請求並返回響應。在 Django 中，視圖函數或類接收 HTTP 請求，執行業務邏輯（可能涉及操作 Model），然後返回 HTTP 響應。對於 DRF 來說，視圖通常會決定使用哪個序列化器 (Serializer) 來處理數據的輸入和輸出。位於各 app 的 `views.py`。
*   **Template (模板)**：負責展示數據。在傳統 Django Web 應用中，模板是 HTML 文件。但在前後端分離的架構中，後端主要提供 API，前端負責渲染，因此後端的 "Template" 概念更多地體現在 DRF 的 Serializer 如何格式化輸出數據（通常是 JSON）。

#### Django REST Framework (DRF)
DRF 是一個建立在 Django 之上的強大工具包，專為構建 Web API 設計。其核心組件包括：
*   **Serializers (序列化器)**：轉換複雜數據類型（如 Django 模型實例）為 Python 原生數據類型，然後可以輕鬆渲染成 JSON, XML 或其他內容類型。反之，它們也進行反序列化，即將接收到的數據轉換回複雜類型。
*   **ViewSets (視圖集)**：一組處理標準 HTTP 方法（GET, POST, PUT, DELETE 等）的視圖邏輯，通常與一個模型相關聯。DRF 提供了如 `ModelViewSet` 這樣的通用視圖集，可以極大地簡化 CRUD 操作的 API 實現。
*   **Routers (路由器)**：自動將 ViewSet 映射到 URL 配置，減少了手動編寫 URL 模式的需要。
*   **Permissions (權限)**：控制誰可以訪問 API 的哪些部分，以及可以執行哪些操作。
*   **Authentication (認證)**：驗證請求者的身份。本專案使用 JWT (JSON Web Tokens)。

### 2.2 `backend/` 目錄結構與模組職責

讓我們深入 `engineerhubweb/backend/` 目錄，了解各個應用 (app) 和模組的功能：

```
backend/
├── 📁 engineerhub/                  # Django 主項目配置目錄
│   ├── __init__.py
│   ├── settings/                  # 設置文件夾 (base.py, development.py, production.py)
│   │   ├── base.py                # 基礎設置，所有環境共享
│   │   ├── development.py         # 開發環境特定設置
│   │   └── production.py          # 生產環境特定設置
│   ├── urls.py                      # 主 URL 路由配置，包含所有 app 的路由
│   ├── wsgi.py                      # WSGI 部署配置 (用於同步 Web 伺服器)
│   └── asgi.py                      # ASGI 部署配置 (用於異步功能，如 Channels)
├── 📁 accounts/                     # 處理用戶註冊、登入、登出、密碼管理等基礎認證功能
│   ├── models.py                    # 可能包含擴展的 User 模型 (AbstractUser)
│   ├── serializers.py               # 用於用戶註冊、登入數據的序列化
│   ├── views.py                     # 處理認證相關的 API 端點 (如 /api/auth/register, /api/auth/login)
│   ├── urls.py                      # 該 app 的 URL 路由
│   └── admin.py                     # 在 Django Admin 中註冊 User 模型
├── 📁 users/                        # (似乎與 profiles 功能相似或有細分，需根據實際代碼判斷)
│   │                                # 可能負責用戶列表、用戶搜索等非檔案編輯功能
│   └── ...
├── 📁 profiles/                     # 負責用戶的詳細個人檔案資訊
│   ├── models.py                    # Profile 模型，通常與 User 模型一對一關聯，存儲如簡介、頭像、技能、社交連結等
│   ├── serializers.py               # Profile 數據的序列化
│   ├── views.py                     # 處理 Profile 的 CRUD 操作 API
│   └── urls.py
├── 📁 posts/                        # 貼文系統模組
│   ├── models.py                    # Post 模型 (內容、作者、圖片、程式碼片段、標籤、點讚等), Tag 模型, CodeBlock 模型
│   ├── serializers.py               # Post, Tag, CodeBlock 等模型的序列化器
│   ├── views.py                     # 處理貼文的 CRUD, 點讚, 搜尋等 API
│   ├── urls.py
│   └── search_indexes.py            # (若使用 django-haystack 或類似工具與 Algolia/Elasticsearch 集成時定義索引)
├── 📁 comments/                     # 留言系統模組
│   ├── models.py                    # Comment 模型 (關聯貼文、作者、內容、時間等)
│   ├── serializers.py               # Comment 序列化器
│   ├── views.py                     # Comment CRUD API
│   └── urls.py
├── 📁 notifications/                # 通知系統模組
│   ├── models.py                    # Notification 模型 (接收者、觸發者、類型、內容、已讀狀態等)
│   ├── serializers.py               # Notification 序列化器
│   ├── views.py                     # 獲取通知列表、標記已讀等 API
│   ├── consumers.py                 # (若使用 WebSocket) 處理即時通知的消費者
│   └── urls.py
├── 📁 chat/                         # 即時聊天系統模組
│   ├── models.py                    # ChatRoom 模型, Message 模型
│   ├── serializers.py               # ChatRoom, Message 序列化器
│   ├── views.py                     # 管理聊天室、獲取歷史訊息的 API
│   ├── consumers.py                 # 處理聊天 WebSocket 連接和訊息的消費者
│   └── urls.py
├── 📁 core/                         # 核心共享功能與工具
│   ├── models.py                    # 可能包含一些基礎模型或抽象模型
│   ├── serializers.py               # 基礎或通用的序列化器
│   ├── permissions.py               # 自定義權限類 (如 IsOwnerOrReadOnly)
│   ├── pagination.py                # 自定義 API 分頁配置
│   ├── exceptions.py                # 自定義異常處理
│   ├── utils.py                     # 通用工具函數
│   └── search.py                    # (重要) 封裝與 Algolia 交互的搜尋服務邏輯
├── 🐳 Dockerfile                    # 用於構建後端服務的 Docker 鏡像
├── 🔧 manage.py                     # Django 的命令列管理工具
├── 📋 requirements.txt              # Python 依賴列表
└── ...
```

**學習建議**：
*   從 `engineerhub/settings/base.py` 開始，了解專案的基礎配置，特別是 `INSTALLED_APPS`，它列出了所有啟用的 Django 應用。
*   接著查看 `engineerhub/urls.py`，了解主路由如何分發到各個 app。
*   然後，逐個 app 深入：先看 `models.py` 了解數據結構，再看 `serializers.py` 和 `views.py` 了解 API 如何處理這些數據，最後看 `urls.py` 該 app 的具體路由。

### 2.3 後端關鍵技術詳解

#### 2.3.1 資料庫：PostgreSQL 與 Redis

*   **PostgreSQL**：
    *   **角色**：作為專案的主力關係型資料庫。
    *   **優勢**：功能強大，支援複雜查詢、事務、JSONB 欄位（方便存儲半結構化數據如貼文中的圖片列表或程式碼塊），可靠性高。
    *   **在本專案中的應用**：所有核心業務數據，如用戶帳號、個人檔案、貼文、留言、通知、聊天記錄等，都存儲在 PostgreSQL 中。Django 的 ORM (Object-Relational Mapper) 使得 Python 開發者可以用物件導向的方式操作資料庫，而無需直接編寫 SQL (大部分情況下)。
    *   **學習點**：理解 Django Models 如何映射到資料庫表；學習常用的 ORM 查詢方法 (`.filter()`, `.get()`, `.create()`, `.all()`, `select_related()`, `prefetch_related()` 等)。

*   **Redis**：
    *   **角色**：高效能的記憶體內鍵值存儲。
    *   **優勢**：讀寫速度極快。
    *   **在本專案中的應用**：
        1.  **快取 (Caching)**：將頻繁訪問但不經常變動的數據（如熱門貼文列表、用戶個人檔案）或計算成本高的查詢結果快取到 Redis 中，減輕資料庫壓力，加速 API 響應。DRF 通常可以與 Django 的快取框架集成。
        2.  **Celery 訊息代理 (Message Broker)**：當使用 Celery 處理非同步任務時，Redis 可以作為任務隊列的存儲和中轉站。
        3.  **Django Channels 頻道層 (Channel Layer)**：在實現 WebSocket 即時通訊時，Django Channels 需要一個頻道層後端來跨多個消費者實例廣播訊息，Redis 是常用的選擇。
    *   **學習點**：了解 Redis 的基本數據類型；探索 Django 如何配置和使用 Redis 進行快取 (`django-redis`)；如果專案使用了 Celery 或 Channels，理解 Redis 在其中的角色。

#### 2.3.2 用戶認證：JWT 與 Django AllAuth

*   **JSON Web Tokens (JWT)**：
    *   **角色**：一種開放標準 (RFC 7519)，用於在各方之間安全地傳輸資訊（通常是 JSON 物件），這些資訊是經過數位簽章的，因此可以被驗證和信任。
    *   **在本專案中的應用**：作為主要的 API 認證機制。用戶使用帳號密碼登入後，後端會生成一個 JWT (通常是 Access Token 和 Refresh Token)，並返回給前端。前端在後續的 API 請求中，需要在請求頭 (Header) 的 `Authorization` 欄位中攜帶這個 Access Token (通常使用 `Bearer <token>` 格式)。後端會驗證此 Token 的有效性來識別用戶身份。
    *   **優勢**：
        *   **無狀態 (Stateless)**：伺服器不需要存儲 Session 資訊，每次請求都帶有完整的認證信息，易於水平擴展。
        *   **跨域友好**：適用於前後端分離架構和微服務。
    *   **實現庫**：通常使用 `djangorestframework-simplejwt`。
    *   **學習點**：理解 JWT 的結構 (Header, Payload, Signature)；登入時如何獲取 Token；後續請求如何攜帶和驗證 Token；Access Token 和 Refresh Token 的區別與用途；Token 的過期與刷新機制。

*   **Django AllAuth**：
    *   **角色**：一個可重用的 Django 應用，處理用戶註冊、登入、登出、密碼重設以及第三方 OAuth 認證 (如 Google, GitHub)。
    *   **在本專案中的應用**：簡化了本地帳號註冊流程，並提供了與 Google 和 GitHub 等社交帳號集成的能力，允許用戶使用他們已有的第三方帳號快速登入或註冊 EngineerHub。
    *   **學習點**：如何在 Django 專案中配置 `django-allauth`；設置 Google/GitHub OAuth 應用並獲取 Client ID 和 Client Secret (參考 `SETUP_GUIDE.md`)；理解 AllAuth 提供的 URL 和視圖如何處理認證流程。

#### 2.3.3 即時通訊：Django Channels 與 WebSockets

*   **WebSockets**：
    *   **角色**：一種網路通訊協定，允許在單一 TCP 連接上進行全雙工通訊。這意味著客戶端和伺服器可以同時互相發送訊息，非常適合需要即時數據更新的應用。
    *   **在本專案中的應用**：主要用於實現即時聊天 (Chat) 和即時通知 (Notifications) 功能。

*   **Django Channels**：
    *   **角色**：擴展 Django 的能力，使其能夠處理 HTTP 請求之外的協議，特別是 WebSockets。它將 Django 的同步核心與異步處理能力結合起來。
    *   **核心概念**：
        *   **Consumers (消費者)**：類似於 Django 的視圖，但用於處理 WebSocket 連接的生命週期 (連接、接收訊息、斷開連接) 和訊息。通常是異步的 (`AsyncWebsocketConsumer`)。
        *   **Routing (路由)**：定義 WebSocket URL 如何映射到特定的 Consumer。
        *   **Channel Layers (頻道層)**：允許不同的 Consumer 實例之間以及 Django 的其他部分（如普通視圖或 Celery 任務）與 Consumer 進行通訊。通常使用 Redis 作為後端。
    *   **在本專案中的應用**：
        *   `chat/consumers.py`：處理聊天室的 WebSocket 連接，接收和廣播聊天訊息。
        *   `notifications/consumers.py`：可能用於將新的通知即時推送給相關用戶的前端。
    *   **學習點**：理解 Channels 的基本架構；如何編寫 Consumer 來處理 WebSocket 事件；如何配置路由；頻道層的作用和用法。

#### 2.3.4 非同步任務：Celery 與 Redis

*   **Celery**：
    *   **角色**：一個強大的分散式任務隊列系統，用於處理耗時的或可以非同步執行的操作，避免阻塞主 Web 請求的處理流程。
    *   **在本專案中的潛在應用** (需根據實際程式碼確認，但這些是常見場景)：
        *   **發送郵件**：用戶註冊後的歡迎郵件、密碼重設郵件等。
        *   **圖片/影片處理**：用戶上傳圖片後的縮圖生成、影片轉碼等。
        *   **數據分析與報告生成**：定期的統計任務。
        *   **長時間運行的 API 調用**：與外部服務的慢速交互。
        *   **通知聚合與推送**。
    *   **核心組件**：
        *   **Task (任務)**：一個可以被 Celery執行的 Python 函數。
        *   **Broker (訊息代理)**：用於存儲任務隊列，Celery Worker 從中獲取任務。Redis 或 RabbitMQ 是常用的 Broker。本專案中，如果使用 Celery，Redis 很可能同時作為 Broker。
        *   **Worker (工作進程)**：執行任務的進程。
        *   **Result Backend (結果後端)**：可選，用於存儲任務的執行狀態和結果。Redis 也可作為結果後端。
    *   **學習點**：如何在 Django 中定義 Celery 任務；如何配置 Celery (Broker URL, Result Backend URL)；如何調用任務 (`.delay()` 或 `.apply_async()`)；監控 Celery 任務。

#### 2.3.5 搜尋系統：Algolia

*   **Algolia**：
    *   **角色**：一個功能強大、速度極快的「搜尋即服務」(Search-as-a-Service) 平台。它允許開發者輕鬆地為應用添加高品質的搜尋體驗。
    *   **優勢**：
        *   **即時性**：數據索引後幾乎可以立即被搜尋到。
        *   **速度快**：毫秒級的搜尋響應。
        *   **容錯性**：支援拼寫錯誤糾正、同義詞等。
        *   **相關性調整**：可以通過儀表板配置搜尋結果的排名和相關性。
        *   **易於集成**：提供多種語言的 SDK。
    *   **在本專案中的應用**：
        *   **後端** (`core/search.py` 或類似模組)：
            *   負責將需要被搜尋的數據（如貼文內容、用戶名、技能標籤）從 PostgreSQL 同步並索引到 Algolia。這通常在數據創建或更新時觸發（例如，使用 Django Signals）。
            *   提供管理命令（如 `python manage.py algolia_reindex`）來批量重建索引。
            *   Algolia 的配置（Application ID, Admin API Key, Index Prefix）通常在 `settings/base.py` 或 `.env` 文件中。
        *   **前端**：
            *   直接使用 Algolia 的 Search-Only API Key 和 Application ID 來查詢 Algolia 的索引，獲取搜尋結果。這樣可以繞過後端，實現更快的搜尋響應。
            *   實現搜尋框、即時建議、過濾器和搜尋結果展示。
    *   **`settings/base.py` 中的 Algolia 配置示例**：
      ```python
      # settings/base.py (或從 .env 加載)
      ALGOLIA = {
          'APPLICATION_ID': 'YOUR_ALGOLIA_APP_ID',
          'API_KEY': 'YOUR_ALGOLIA_ADMIN_API_KEY', # 這是後端用的 Admin Key
          'INDEX_PREFIX': 'engineerhub_dev',      # 索引前綴，用於區分不同環境
          'AUTO_INDEXING': True, # 是否在模型保存時自動更新索引 (需配合 signals)
      }
      ```
    *   **學習點**：理解 Algolia 的基本概念（Index, Record, Search Parameters）；如何在 Algolia Dashboard 創建和管理索引；後端如何使用 Algolia SDK 推送數據；前端如何使用 Algolia SDK 或直接 API 進行查詢；如何設計可搜尋的數據結構。

### 2.4 核心模組設計範例 (教學式)

為了讓您更直觀地理解後端是如何構建的，我們將選取一些核心模組的設計進行簡化和教學式的展示。這裡的程式碼片段會經過篩選，突出核心邏輯。

#### 2.4.1 用戶與個人檔案系統 (`accounts`, `profiles`)

**目標**：管理用戶帳號 (註冊、登入) 和用戶的詳細個人資料 (簡介、頭像、技能等)。

**模型設計 (`models.py`)**：

*   `accounts/models.py`: 通常會擴展 Django 內建的 `User` 模型，例如使用 `AbstractUser` 添加額外欄位或更改認證方式。
    ```python
    # accounts/models.py
    from django.contrib.auth.models import AbstractUser
    from django.db import models

    class User(AbstractUser):
        """擴展用戶模型，使用 email 作為主要登入識別符"""
        email = models.EmailField(unique=True, verbose_name='電子郵件地址')
        # username 仍然保留，但 email 是登入用的
        # 可以添加其他通用於所有用戶的欄位，如 is_email_verified

        USERNAME_FIELD = 'email' # 使用 email 登入
        REQUIRED_FIELDS = ['username'] # 創建超級用戶時，除了 email 和 password，還需要 username

        def __str__(self):
            return self.email
    ```
    *   **教學**：這裡我們繼承 `AbstractUser`，將 `email` 設為 `unique` 且是 `USERNAME_FIELD`，意味著用戶將使用電子郵件登入。`REQUIRED_FIELDS` 用於 `createsuperuser` 命令。

*   `profiles/models.py`: 存儲用戶的詳細檔案資訊，通常與 `User` 模型是一對一關係。
    ```python
    # profiles/models.py
    from django.db import models
    from django.conf import settings # 用於引用 settings.AUTH_USER_MODEL

    # 假設有一個 Skill 模型
    class Skill(models.Model):
        name = models.CharField(max_length=50, unique=True)
        def __str__(self):
            return self.name

    class Profile(models.Model):
        """用戶個人檔案模型"""
        user = models.OneToOneField(
            settings.AUTH_USER_MODEL, # 引用 settings 中定義的用戶模型
            on_delete=models.CASCADE,
            related_name='profile' # 允許從 User 物件反向查詢: user.profile
        )
        bio = models.TextField(max_length=500, blank=True, verbose_name='個人簡介')
        avatar = models.ImageField(upload_to='avatars/', null=True, blank=True, verbose_name='頭像')
        website = models.URLField(blank=True, verbose_name='個人網站')
        location = models.CharField(max_length=100, blank=True, verbose_name='所在地')
        skills = models.ManyToManyField(Skill, blank=True, verbose_name='技能標籤')
        # 可以添加更多欄位，如 followers, reputation_score 等

        def __str__(self):
            return f"{self.user.email}'s Profile"
    ```
    *   **教學**：`OneToOneField` 確保每個 `User` 只有一個 `Profile`。`settings.AUTH_USER_MODEL` 是引用用戶模型的最佳實踐。`blank=True` 表示該欄位在表單中可以為空，`null=True` 表示資料庫中可以為 NULL (通常用於非字串欄位)。`upload_to` 指定圖片上傳路徑。`ManyToManyField` 用於多對多關係 (一個 Profile 可以有多個 Skill，一個 Skill 也可以被多個 Profile 擁有)。

**序列化器設計 (`serializers.py`)**：

*   `accounts/serializers.py`: 用於用戶註冊。
    ```python
    # accounts/serializers.py
    from rest_framework import serializers
    from django.contrib.auth import get_user_model
    from django.contrib.auth.password_validation import validate_password

    User = get_user_model() # 獲取當前專案使用的 User 模型

    class UserRegistrationSerializer(serializers.ModelSerializer):
        password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
        password2 = serializers.CharField(write_only=True, required=True, label="確認密碼")

        class Meta:
            model = User
            fields = ('username', 'email', 'password', 'password2') # 註冊時需要的欄位

        def validate(self, attrs):
            if attrs['password'] != attrs['password2']:
                raise serializers.ValidationError({"password": "兩個密碼欄位不匹配。"})
            return attrs

        def create(self, validated_data):
            user = User.objects.create_user( # 使用 create_user 處理密碼哈希
                username=validated_data['username'],
                email=validated_data['email'],
                password=validated_data['password']
            )
            # Profile.objects.create(user=user) # 可以在此處自動創建關聯的 Profile
            return user
    ```
    *   **教學**：`write_only=True` 表示該欄位只在反序列化（創建/更新）時使用，不會在序列化（讀取）時返回。`validators=[validate_password]` 使用 Django 內建的密碼強度驗證。`validate()` 方法用於多欄位聯合驗證。`create()` 方法被重寫以正確處理密碼哈希（使用 `create_user` 而不是 `create`）。

*   `profiles/serializers.py`: 用於展示和更新 Profile。
    ```python
    # profiles/serializers.py
    from rest_framework import serializers
    from .models import Profile, Skill
    from accounts.serializers import UserRegistrationSerializer # 假設有一個簡單的 UserSerializer

    class SkillSerializer(serializers.ModelSerializer):
        class Meta:
            model = Skill
            fields = ['id', 'name']

    class ProfileSerializer(serializers.ModelSerializer):
        # user = UserRegistrationSerializer(read_only=True) # 顯示用戶的詳細信息，但設為 read_only
        username = serializers.CharField(source='user.username', read_only=True)
        email = serializers.EmailField(source='user.email', read_only=True)
        skills = SkillSerializer(many=True, read_only=False, queryset=Skill.objects.all()) # 嵌套序列化器

        class Meta:
            model = Profile
            fields = [
                'id', 'username', 'email', 'bio', 'avatar',
                'website', 'location', 'skills'
            ]
            # read_only_fields = ['user'] # 通常 user 欄位在 Profile 更新時不應直接修改

        def update(self, instance, validated_data):
            # 特殊處理 ManyToManyField (skills)
            skills_data = validated_data.pop('skills', None)
            instance = super().update(instance, validated_data) # 先更新其他欄位

            if skills_data is not None: # 如果請求中傳入了 skills
                instance.skills.set(skills_data) # 使用 set() 更新多對多關係
            return instance
    ```
    *   **教學**：`source='user.username'` 允許我們將關聯模型的欄位展平到當前序列化器中。嵌套 `SkillSerializer` 來處理 `skills` 欄位；`many=True` 表示它是一個列表。在 `update` 方法中，對於多對多欄位，通常需要先 `pop` 出來，然後在父實例更新後再用 `.set()` 或 `.add()` / `.remove()` 來處理。

**視圖設計 (`views.py`)**：

*   `accounts/views.py`: 處理用戶註冊。
    ```python
    # accounts/views.py
    from rest_framework import generics, permissions
    from rest_framework.response import Response
    from rest_framework_simplejwt.tokens import RefreshToken
    from .serializers import UserRegistrationSerializer
    from django.contrib.auth import get_user_model

    User = get_user_model()

    class UserRegistrationView(generics.CreateAPIView):
        queryset = User.objects.all()
        permission_classes = (permissions.AllowAny,) # 任何人都可以註冊
        serializer_class = UserRegistrationSerializer

        # def create(self, request, *args, **kwargs):
        #     serializer = self.get_serializer(data=request.data)
        #     serializer.is_valid(raise_exception=True)
        #     user = serializer.save()
        #     refresh = RefreshToken.for_user(user) # 註冊成功後可以選擇立即返回 token
        #     return Response({
        #         "user": serializer.data, # 或者一個更簡潔的 User 信息序列化器
        #         "refresh": str(refresh),
        #         "access": str(refresh.access_token),
        #     }, status=status.HTTP_201_CREATED)
    ```
    *   **教學**：使用 DRF 的通用視圖 `generics.CreateAPIView` 可以快速實現創建資源的 API。`permission_classes = (permissions.AllowAny,)` 表示此 API 不需要認證即可訪問。可以重寫 `create` 方法來自定義註冊成功後的回應，例如直接返回 JWT。

*   `profiles/views.py`: 處理 Profile 的檢視和更新。
    ```python
    # profiles/views.py
    from rest_framework import generics, permissions, viewsets
    from .models import Profile
    from .serializers import ProfileSerializer
    from core.permissions import IsOwnerOrReadOnly # 假設有一個自定義權限

    class ProfileViewSet(viewsets.ModelViewSet):
        """
        允許用戶查看和編輯他們的個人檔案。
        """
        queryset = Profile.objects.select_related('user').prefetch_related('skills').all()
        serializer_class = ProfileSerializer
        # permission_classes = [permissions.IsAuthenticated, IsProfileOwnerOrReadOnly] # 確保用戶已登入且只能修改自己的 Profile

        def get_queryset(self):
            # 根據需求可以過濾，例如只顯示公開的 Profile 給未登入用戶
            return super().get_queryset()

        def perform_create(self, serializer):
            # 如果 Profile 不是在 User 註冊時自動創建的，則需要此處關聯
            # serializer.save(user=self.request.user)
            pass # 通常 Profile 是在 User 註冊時通過 Signal 或在 UserSerializer 中創建的

        # 可以添加 @action 來自定義操作，如關注用戶等
    ```
    *   **教學**：`viewsets.ModelViewSet` 提供了一整套 CRUD 操作的實現 (`list`, `create`, `retrieve`, `update`, `partial_update`, `destroy`)。`select_related('user')` 和 `prefetch_related('skills')` 用於優化資料庫查詢，減少查詢次數。`permission_classes` 控制訪問權限。`perform_create` 方法可以在創建對象時自動添加一些數據 (如將當前請求的用戶設為 `user` 欄位，但對於 `OneToOneField` 的 Profile，通常是在 User 創建時一起創建)。

#### 2.4.2 貼文系統 (`posts`)

**目標**：允許用戶發佈內容（文字、圖片、程式碼）、查看貼文、點讚、留言等。

**模型設計 (`posts/models.py`)**：
```python
# posts/models.py
from django.db import models
from django.conf import settings

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    def __str__(self): return self.name

class Post(models.Model):
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=255, default="Untitled Post")
    content = models.TextField(verbose_name='主要內容')
    # 簡化：圖片和程式碼塊可以作為 content 的一部分 (Markdown) 或單獨模型
    # images = models.JSONField(default=list, blank=True) # 存儲圖片 URL 列表
    # code_blocks = models.JSONField(default=list, blank=True) # 存儲程式碼對象列表
    tags = models.ManyToManyField(Tag, blank=True, related_name='posts')
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_posts', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def likes_count(self):
        return self.likes.count()

# (Comment 模型通常在 comments app 中，但為簡化此處提及)
class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    parent_comment = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')

    class Meta:
        ordering = ['created_at']
```
*   **教學**：`ForeignKey` 用於一對多關係 (一個作者可以有多篇貼文)。`ManyToManyField` 用於標籤和點讚。`auto_now_add=True` 在創建時自動設置時間，`auto_now=True` 在每次保存時更新時間。`ordering` 指定預設排序。`@property` 可以將一個方法變成像屬性一樣調用。`Comment` 模型中的 `parent_comment` 實現了巢狀留言。

**序列化器與視圖**：
與 Profile 系統類似，`PostSerializer` 會處理 Post 數據的轉換，可能嵌套 `TagSerializer` 和 `UserSerializer` (用於作者)。`PostViewSet` 會提供貼文的 CRUD API，並可能通過 `@action` 裝飾器添加 `like`、`unlike` 等自定義操作。
```python
# posts/serializers.py (簡化示例)
from rest_framework import serializers
from .models import Post, Tag
# from accounts.serializers import MinimalUserSerializer # 假設有一個只含基本用戶信息的序列化器

class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'name']

class PostSerializer(serializers.ModelSerializer):
    # author = MinimalUserSerializer(read_only=True)
    author_username = serializers.CharField(source='author.username', read_only=True)
    tags = TagSerializer(many=True, required=False) # 寫入時可以通過 tag 名稱或 id
    likes_count = serializers.IntegerField(read_only=True) # 從模型屬性獲取
    # is_liked_by_requester = serializers.SerializerMethodField() # 判斷當前用戶是否點讚

    class Meta:
        model = Post
        fields = [
            'id', 'title', 'content', 'author_username', 'tags', 'created_at',
            'likes_count', #'is_liked_by_requester',
            'is_published'
        ]
        read_only_fields = ['author_username', 'created_at', 'likes_count']

    # def get_is_liked_by_requester(self, obj):
    //     user = self.context['request'].user
    //     return obj.likes.filter(id=user.id).exists() if user.is_authenticated else False

    def create(self, validated_data):
        tags_data = validated_data.pop('tags', [])
        post = Post.objects.create(**validated_data, author=self.context['request'].user)
        for tag_info in tags_data: # 假設傳入的是 {'name': 'tagName'} 或已存在的 Tag 實例
            tag, created = Tag.objects.get_or_create(name=tag_info.get('name'))
            post.tags.add(tag)
        return post

    def update(self, instance, validated_data):
        tags_data = validated_data.pop('tags', None)
        instance = super().update(instance, validated_data)
        if tags_data is not None:
            tag_list = []
            for tag_info in tags_data:
                tag, created = Tag.objects.get_or_create(name=tag_info.get('name'))
                tag_list.append(tag)
            instance.tags.set(tag_list)
        return instance

# posts/views.py (簡化 ModelViewSet 示例)
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Post
from .serializers import PostSerializer
from core.permissions import IsOwnerOrReadOnly # 創建自己的權限或使用 DRF 內建

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.filter(is_published=True).select_related('author').prefetch_related('tags', 'likes')
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly] # 登入用戶可讀，作者可修改

    def perform_create(self, serializer):
        serializer.save(author=self.request.user) # 自動將當前用戶設為作者

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user
        if user in post.likes.all():
            post.likes.remove(user)
            liked = False
        else:
            post.likes.add(user)
            liked = True
        return Response({'status': 'ok', 'liked': liked, 'likes_count': post.likes_count})

    # 可以添加更多 action, 如 'unlike', 'share', 'report' 等
    # 也可以添加 filter_backends 和 search_fields 來支持列表篩選和搜尋
```

### 2.5 API 設計哲學與實踐

*   **RESTful 原則**：
    *   使用標準 HTTP 方法 (GET, POST, PUT, PATCH, DELETE)。
    *   資源導向的 URL (例如 `/api/posts/`, `/api/posts/<id>/`)。
    *   使用 HTTP 狀態碼表示操作結果 (200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found)。
    *   無狀態：每個請求都應包含所有必要的信息。
*   **版本控制**：(可選，但推薦) 在 URL 中加入版本號，如 `/api/v1/posts/`。
*   **清晰的請求與響應格式**：主要使用 JSON。響應中應包含足夠的訊息，錯誤響應應提供清晰的錯誤原因。
*   **適當的權限控制**：確保只有授權用戶才能執行特定操作。
*   **分頁**：對於返回列表的 API，應實現分頁以避免一次返回過多數據。`core/pagination.py` 中可能定義了自定義分頁類。
*   **過濾與排序**：提供參數允許客戶端對列表結果進行過濾和排序。DRF 的 `filter_backends` 可以幫助實現。
*   **文件化**：使用 `drf-spectacular` (或類似工具) 自動生成 OpenAPI/Swagger API 文件，方便前端或其他消費者理解和使用 API。訪問 `/api/docs/` (或 `/api/schema/swagger-ui/`) 可以查看。

## 🎯 學習重點

本專案特別適合學習現代化的搜尋技術實現，從基礎的全文搜尋到企業級的 Algolia 整合，涵蓋了完整的搜尋系統開發流程。

---

## 📖 第三部分：前端深度解析 (React + TypeScript)

前端是 EngineerHub 與用戶直接互動的門戶，負責提供流暢、直觀且功能豐富的用戶體驗。本專案的前端採用了現代 Web 開發中廣受歡迎的技術棧：React (版本18) 結合 TypeScript，並利用 Vite 作為快速的建構工具。

### 3.1 前端核心概念與技術棧

#### 3.1.1 React 18：現代UI框架
React 是一個由 Facebook 開發的 JavaScript 函式庫，用於建構用戶界面，特別是單頁應用程式 (SPA)。它的核心思想是將 UI 拆分成獨立、可重用的**組件 (Components)**。

*   **組件化開發**：
    *   **函數組件 (Functional Components)**：現代 React 開發的主流，使用 JavaScript 函數來定義組件。
    *   **Hooks**：如 `useState`, `useEffect`, `useContext` 等，讓函數組件也能擁有狀態管理、生命週期處理等能力。
    *   **JSX (JavaScript XML)**：一種 JavaScript 的語法擴展，讓我們可以在 JavaScript 程式碼中編寫類似 HTML 的結構，使組件的結構更直觀。
*   **虛擬 DOM (Virtual DOM)**：React 在記憶體中維護一個輕量級的 DOM 表示。當組件狀態改變時，React 會計算出最小的變更，然後才更新實際的瀏覽器 DOM，從而提升渲染效能。
*   **單向數據流**：數據在 React 應用中通常是自頂向下流動的（父組件到子組件），這使得數據流動更可預測，易於追蹤和偵錯。
*   **React 18 新特性**：
    *   **併發特性 (Concurrent Features)**：允許 React 同時處理多個狀態更新，改善了在高負載情況下的用戶體驗，使應用保持響應。
    *   **自動批次處理 (Automatic Batching)**：在事件處理函數、Promise、setTimeout 等異步操作中，自動將多次狀態更新合併為一次渲染，提升效能。
    *   **Transitions**：用於標記非緊急的狀態更新，讓 React 優先處理更重要的更新（如用戶輸入）。

**學習重點**：
*   理解 JSX 語法和組件的定義方式。
*   熟練使用核心 Hooks (`useState`, `useEffect`, `useContext`, `useRef`, `useMemo`, `useCallback`)。
*   掌握組件間的數據傳遞 (props) 和狀態提升。
*   了解 React 組件的生命週期概念（雖然在 Hooks 中不直接體現，但其思想很重要）。

#### 3.1.2 TypeScript：JavaScript 的超集
TypeScript 為 JavaScript 添加了**靜態類型系統**。這意味著我們可以在開發階段就定義變數、函數參數、物件屬性的類型，並在編譯時期進行檢查。

*   **優勢**：
    *   **早期錯誤檢測**：在編譯時期就能發現許多潛在的類型錯誤，減少運行時 Bug。
    *   **提升程式碼可讀性與可維護性**：類型標註使程式碼意圖更清晰，方便團隊協作和長期維護。
    *   **更好的開發工具支援**：IDE (如 VS Code) 可以利用類型資訊提供更智能的自動完成、重構和錯誤提示。
    *   **平滑過渡**：TypeScript 是 JavaScript 的超集，任何合法的 JavaScript 程式碼也是合法的 TypeScript 程式碼，可以逐步引入到現有專案。
*   **核心概念**：
    *   **基本類型**：`string`, `number`, `boolean`, `array`, `object`, `null`, `undefined`, `any`, `void`, `never`, `unknown`。
    *   **介面 (Interfaces)**：定義物件的結構和契約。
    *   **類型別名 (Type Aliases)**：為類型創建新的名稱。
    *   **泛型 (Generics)**：編寫可重用的、適用於多種數據類型的程式碼。
    *   **聯合類型 (Union Types)` 與 **交叉類型 (Intersection Types)</span>`。
    *   **枚舉 (Enums)**。

**學習重點**：
*   掌握 TypeScript 的基本類型和如何定義它們。
*   學會使用 `interface` 和 `type` 來定義複雜的數據結構。
*   理解泛型的概念和應用場景。
*   在 React 組件的 props 和 state 中使用 TypeScript 進行類型约束。

#### 3.1.3 Vite：下一代前端建構工具
Vite 是一個現代化的前端建構工具，旨在提供極致的開發體驗。

*   **優勢**：
    *   **極速的冷啟動**：利用瀏覽器原生的 ES Modules 支持，無需像 Webpack 那樣在開發時打包整個應用，開發伺服器啟動速度非常快。
    *   **即時的熱模組替換 (HMR)**：當程式碼變更時，HMR 速度極快，且能保持應用狀態。
    *   **優化的建構**：生產環境打包時，使用 Rollup 進行優化，輸出高效的靜態資源。
    *   **開箱即用**：對 TypeScript, JSX, CSS 等有良好的內建支援，配置簡潔。
*   **核心原理**：
    *   **開發環境**：Vite 以原生 ESM 方式提供源碼，瀏覽器按需請求模組，Vite 進行即時編譯和轉換。
    *   **生產環境**：Vite 使用 Rollup 進行打包，可以進行 Tree-shaking、代碼壓縮、代碼分割等優化。

**學習重點**：
*   了解 Vite 的基本命令 (`npm run dev`, `npm run build`, `npm run preview`)。
*   熟悉 `vite.config.ts` 的基本配置選項。
*   理解 Vite 與傳統打包工具 (如 Webpack) 在開發模式下的主要區別。

#### 3.1.4 Tailwind CSS：實用優先的 CSS 框架
Tailwind CSS 是一個**實用優先 (Utility-First)** 的 CSS 框架。它提供了一系列原子化的 CSS 類，可以直接在 HTML/JSX 中組合使用來建構界面，而不是編寫自定義的 CSS。

*   **優勢**：
    *   **快速開發**：無需在 CSS 和 HTML/JSX 之間頻繁切換，直接在標記中應用樣式。
    *   **高度可定制**：可以通過 `tailwind.config.ts` 文件輕鬆自定義設計系統（顏色、間距、字體等）。
    *   **響應式設計友好**：內建直觀的響應式修飾符 (如 `sm:`, `md:`, `lg:`)。
    *   **一致性**：由於使用的是預定義的工具類，更容易在整個專案中保持視覺風格的一致性。
    *   **按需打包**：生產環境中，Tailwind CSS 會移除所有未使用的 CSS 類，使最終的 CSS 文件非常小。
*   **核心思想**：
    *   不編寫 CSS，而是組合工具類。例如，`text-blue-500` (文字顏色), `bg-gray-100` (背景色), `p-4` (內邊距), `flex items-center` (Flexbox 佈局)。
    *   當需要重複的樣式組合時，可以通過 `@apply` 指令在 CSS 文件中創建組件類，或在前端組件中封裝。

**學習重點**：
*   熟悉 Tailwind CSS 的常用工具類命名規則（佈局、間距、顏色、排版、邊框等）。
*   學會在 `tailwind.config.ts` 中進行基本配置和擴展。
*   掌握響應式設計和狀態修飾符 (如 `hover:`, `focus:`) 的使用。

#### 3.1.5 Zustand：輕量級狀態管理
Zustand 是一個小巧、快速、可擴展的狀態管理解決方案，基於簡化的 Flux 原則和 Hooks 實現。

*   **優勢**：
    *   **API 簡單直觀**：學習曲緩，易於上手。
    *   **程式碼量少**：通常比 Redux 或其他複雜狀態管理庫需要更少的樣板程式碼。
    *   **React Hooks 友好**：與 React Hooks 完美集成。
    *   **TypeScript 支援良好**。
    *   **可選的 Redux DevTools 整合**。
*   **核心概念**：
    *   **Store (存儲)**：一個包含狀態和更新狀態方法的物件。
    *   **`create` 函數**：用於創建 store。
    *   **Hooks**：在組件中通過 `useStore()` (或自定義的 selector hook) 來訂閱和使用 store 中的狀態。
    *   **Actions (動作)**：在 store 中定義的用於修改狀態的函數。

**`src/store/authStore.ts` 範例 (概念性)**：
```typescript
import { create } from 'zustand';

interface User { // 假設 User 類型定義在其他地方
  id: string;
  username: string;
  email: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  // 可以添加其他如 isLoading, error 等狀態
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('authToken'), // 可以從 localStorage 初始化 token
  isLoggedIn: !!localStorage.getItem('authToken'),
  login: (userData, userToken) => {
    localStorage.setItem('authToken', userToken);
    set({ user: userData, token: userToken, isLoggedIn: true });
  },
  logout: () => {
    localStorage.removeItem('authToken');
    set({ user: null, token: null, isLoggedIn: false });
  },
}));
```
*   **教學**：上面是一個簡化的 `authStore` 範例。它定義了用戶訊息 (`user`)、認證令牌 (`token`) 和登入狀態 (`isLoggedIn`)。`login` 和 `logout` 是修改這些狀態的 actions。`create` 函數接收一個回調函數，該函數返回 store 的初始狀態和 actions。`set` 函數用於更新 store 的狀態。我們還演示了如何與 `localStorage` 交互以持久化登入狀態。

**學習重點**：
*   如何使用 `create` 創建一個 store。
*   如何在 store 中定義 state 和 actions。
*   如何在 React 組件中使用 store 中的 state 和調用 actions。
*   理解 selector 的概念，用於優化組件的重渲染。

#### 3.1.6 React Query (TanStack Query)：伺服器狀態管理
React Query 是一個強大的非同步狀態管理庫，專門用於處理、快取和同步來自伺服器的數據。它極大地簡化了數據獲取、加載狀態、錯誤處理和數據更新的邏輯。

*   **優勢**：
    *   **自動快取與背景更新**：獲取的數據會被快取，並能在背景自動更新，保持數據新鮮。
    *   **簡化加載與錯誤狀態處理**：提供了 `isLoading`, `isError`, `error`, `isFetching` 等方便的狀態。
    *   **分頁與無限滾動**：內建對分頁和無限滾動數據的強大支援。
    *   **樂觀更新 (Optimistic Updates)**：在服務端確認前，UI 可以立即響應某些操作，提升用戶體驗。
    *   **Devtools**：提供強大的開發者工具，方便查看快取狀態和查詢行為。
*   **核心概念**：
    *   **Queries (查詢)**：用於獲取數據。每個查詢都需要一個唯一的 `queryKey` 和一個返回 Promise 的 `queryFn` (通常是 API 請求)。
        *   `useQuery({ queryKey: ['todos'], queryFn: fetchTodos })`
    *   **Mutations (變更)**：用於創建、更新或刪除數據。
        *   `useMutation({ mutationFn: addTodo })`
    *   **QueryClient**：用於管理所有查詢的快取和配置。需要在應用程式的頂層提供。

**使用範例 (概念性)**：
```typescript
// 在某個 API 服務文件中 (例如 src/api/posts.ts)
import axiosInstance from './axiosConfig'; // 假設有一個配置好的 axios 實例

interface Post {
  id: number;
  title: string;
  content: string;
}

export const fetchPosts = async (): Promise<Post[]> => {
  const response = await axiosInstance.get('/posts');
  return response.data;
};

export const createPost = async (newPost: { title: string; content: string }): Promise<Post> => {
  const response = await axiosInstance.post('/posts', newPost);
  return response.data;
};

// 在 React 組件中使用
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPosts, createPost } from '../api/posts'; // 引入 API 函數

function PostsPage() {
  const queryClient = useQueryClient();

  const { data: paginatedResponse, isLoading, isError, error } = useQuery<Post[], Error>({
    queryKey: ['posts', { page: 1, limit: 10 }], // 查詢鍵可以包含參數
    queryFn: () => fetchPosts(1, 10),
  });

  const createPostMutation = useMutation<Post, Error, { title: string; content: string }>({
    mutationFn: createPost,
    onSuccess: (createdPost) => {
      // 貼文創建成功
      queryClient.invalidateQueries({ queryKey: ['posts'] }); // 使貼文列表查詢失效以重新獲取
      console.log('貼文已成功發布！');
    },
    onError: (err) => {
      console.error('創建貼文失敗:', err.message);
    }
  });

  const handleSubmit = (data: { title: string; content: string }) => {
    createPostMutation.mutate(data);
  };

  if (isLoading) return <p>載入貼文列表...</p>;
  if (isError) return <p>無法載入貼文: {error.message}</p>;

  return (
    <div>
      <h1>貼文列表</h1>
      <button onClick={handleSubmit} disabled={createPostMutation.isPending}>
        {createPostMutation.isPending ? "發布中..." : "發布貼文"}
      </button>
      <ul>
        {paginatedResponse?.results.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  );
}
```
*   **教學**：`useQuery` 用於獲取貼文列表，`queryKey` 是 `'posts'`，`queryFn` 是 `fetchPosts`。它會自動管理加載狀態 (`isLoading`) 和錯誤狀態 (`isError`, `error`)。`useMutation` 用於創建新貼文，`mutationFn` 是 `createPost`。在 `onSuccess` 回調中，我們使用 `queryClient.invalidateQueries` 來使貼文列表查詢失效以重新獲取。

**學習重點**：
*   理解 `queryKey` 的重要性和設計原則。
*   掌握 `useQuery` 的基本用法和常用配置項 (`enabled`, `staleTime`, `cacheTime`, `refetchOnWindowFocus` 等)。
*   學會使用 `useMutation` 處理數據的創建、更新和刪除操作，以及如何處理成功和失敗的回調。
*   了解如何使用 `QueryClient` 與快取交互 (如 `invalidateQueries`, `setQueryData`)。

### 3.2 `frontend/` 目錄結構與模組職責

一個良好組織的目錄結構對於大型前端專案至關重要。EngineerHub 的前端目錄結構旨在實現高內聚、低耦合，方便查找和維護程式碼。

```
frontend/
├── 📁 public/                      # 靜態資源目錄 (如 index.html, favicons)
│   ├── vite.svg                    # Vite 預設圖標 (可替換)
│   └── index.html                  # 應用程式的 HTML 入口文件
├── 📁 src/                         # 主要源代碼目錄
│   ├── 📁 api/                     # API 請求服務層
│   │   ├── axiosConfig.ts          # Axios 實例配置 (攔截器等)
│   │   ├── auth.ts                 # 認證相關 API 請求
│   │   ├── posts.ts                # 貼文相關 API 請求
│   │   ├── users.ts                # 用戶相關 API 請求
│   │   └── ...                     # 其他模組的 API 請求
│   ├── 📁 assets/                  # 靜態資源 (圖片、字體、圖標等)
│   │   ├── images/
│   │   └── icons/
│   ├── 📁 components/              # 可重用的 UI 組件
│   │   ├── 📁 common/              # 通用基礎組件 (按鈕、輸入框、模態框等)
│   │   │   ├── Button.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── Alert.tsx
│   │   ├── 📁 layout/              # 頁面佈局組件 (導航欄、側邊欄、頁腳)
│   │   │   ├── Navbar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── PageLayout.tsx      # 組合 Navbar, Sidebar, Content, Footer 的整體佈局
│   │   └── 📁 features/            # 特定功能模組的組件 (與業務邏輯緊密相關)
│   │       ├── 📁 posts/           # 貼文相關組件
│   │       │   ├── PostCard.tsx    # 貼文卡片展示
│   │       │   ├── PostForm.tsx    # 創建/編輯貼文表單
│   │       │   └── PostList.tsx    # 貼文列表
│   │       ├── 📁 user/            # 用戶相關組件
│   │       │   ├── UserProfileCard.tsx
│   │       │   └── UserAvatar.tsx
│   │       ├── 📁 comments/
│   │       │   ├── CommentItem.tsx
│   │       │   └── CommentForm.tsx
│   │       └── CodeBlock.tsx       # 程式碼區塊高亮組件
│   ├── 📁 config/                  # 專案配置 (環境變數、路由配置等)
│   │   └── index.ts                # 導出配置變數
│   │   └── routes.tsx              # 路由定義 (如果集中的話)
│   ├── 📁 hooks/                   # 自定義 React Hooks (封裝可重用邏輯)
│   │   ├── useAuth.ts              # 封裝認證相關邏輯
│   │   ├── useClickOutside.ts      # 點擊元素外部觸發事件的 Hook
│   │   ├── useDebounce.ts          # 防抖 Hook
│   │   └── useTheme.ts             # 主題切換 Hook
│   ├── 📁 pages/                   # 頁面級組件 (通常對應一個路由)
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ProfilePage.tsx         # 用戶個人資料頁
│   │   ├── PostDetailPage.tsx      # 貼文詳情頁
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx        # 404 頁面
│   ├── 📁 providers/               # React Context Providers (用於全局狀態或配置)
│   │   ├── AuthProvider.tsx        # (如果不用 Zustand 或需要額外 Context)
│   │   ├── ThemeProvider.tsx
│   │   └── QueryProvider.tsx       # React Query 的 QueryClientProvider
│   ├── 📁 store/                   # 狀態管理 (Zustand stores)
│   │   ├── authStore.ts            # 認證狀態
│   │   ├── uiStore.ts              # 全局 UI 狀態 (如主題、模態框開關)
│   │   └── postStore.ts            # (如果某些貼文相關狀態適合全局管理)
│   ├── 📁 styles/                  # 全局樣式與 Tailwind CSS 基礎配置
│   │   ├── index.css               # 主要 CSS 入口 (Tailwind 指令、全局樣式)
│   │   └── theme.ts                # (如果 Tailwind 配置中有 JS 變數)
│   ├── 📁 types/                   # TypeScript 類型定義
│   │   ├── index.ts                # 導出所有類型，方便引入
│   │   ├── api.ts                  # API 請求/響應相關類型
│   │   ├── auth.ts
│   │   ├── post.ts
│   │   ├── user.ts
│   │   └── common.ts               # 通用類型
│   ├── 📁 utils/                   # 通用工具函數
│   │   ├── helpers.ts              # 通用輔助函數 (日期格式化、字串處理等)
│   │   ├── validators.ts           # 表單驗證函數
│   │   └── constants.ts            # 專案常量 (如 API 基本路徑、事件名稱)
│   ├── App.tsx                     # 應用程式根組件 (設置路由、全局 Provider)
│   ├── main.tsx                    # 應用程式入口文件 (渲染 App 組件到 DOM)
│   └── vite-env.d.ts               # Vite 環境變數的 TypeScript 類型聲明
├── .env.local                      # 本地開發環境變數 (不會提交到 Git)
├── .env.example                    # 環境變數範例文件
├── .eslintrc.cjs                   # ESLint 配置文件
├── .gitignore                      # Git 忽略文件配置
├── .prettierrc.json                # Prettier 配置文件
├── index.html                      # (Vite 專案中，此文件在根目錄，作為入口)
├── package.json                    # NPM 套件依賴與腳本配置
├── postcss.config.js               # PostCSS 配置文件 (Tailwind CSS 需要)
├── tailwind.config.ts              # Tailwind CSS 配置文件
├── tsconfig.json                   # TypeScript 編譯器配置文件
├── tsconfig.node.json              # TypeScript 針對 Node 環境的配置 (如 Vite 配置)
└── vite.config.ts                  # Vite 建構工具配置文件
```

**各目錄職責解說**：

*   **`public/`**：存放不會被建構過程處理的靜態資源。`index.html` 是 SPA 的主入口。
*   **`src/api/`**：專門負責與後端 API 交互。每個模組的 API 請求封裝在單獨的文件中，便於管理。`axiosConfig.ts` 可以統一配置 Axios 實例，例如添加請求/響應攔截器來處理 token 或全局錯誤。
*   **`src/assets/`**：存放圖片、圖標、字體等本地靜態資源。
*   **`src/components/`**：這是 UI 組件的核心目錄。
    *   **`common/`**：存放與具體業務無關、可在多處重用的基礎 UI 組件，如按鈕、輸入框、加載動畫、警告提示等。這些組件應具備良好的可配置性和通用性。
    *   **`layout/`**：負責頁面的整體結構佈局，如導航欄、側邊欄、頁腳，以及將它們組合起來的 `PageLayout.tsx`。
    *   **`features/`**：存放與特定業務功能緊密耦合的組件。通常按功能模組劃分子目錄，如 `posts/`、`user/`。例如，`PostCard.tsx` 就是一個專門用於展示貼文信息的組件。
*   **`src/config/`**：存放專案級別的配置，如環境變數的讀取與導出、應用路由配置（如果選擇集中管理）。
*   **`src/hooks/`**：自定義 React Hooks，用於封裝可重用邏輯。
*   **`src/pages/`**：頁面級組件，通常直接對應一個路由。它們負責組織該頁面所需的各類組件（來自 `components/features/` 或 `components/common/`），處理頁面級的數據獲取和狀態管理。
*   **`src/providers/`**：如果使用 React Context 進行狀態管理或提供全局配置，相關的 Provider 組件會放在這裡。例如，`QueryClientProvider`。
*   **`src/store/`**：使用 Zustand 進行全局狀態管理。每個 store 通常對應一個特定的狀態領域（如 `authStore` 管理認證狀態，`uiStore` 管理全局 UI 狀態）。
*   **`src/styles/`**：全局 CSS 樣式和 Tailwind CSS 的入口配置。`index.css` (或 `main.css`) 通常包含 Tailwind 的 `@tailwind base; @tailwind components; @tailwind utilities;` 指令，以及任何必要的全局自定義樣式。
*   **`src/types/`**：存放所有的 TypeScript 類型定義和介面。按模組或領域劃分文件，並通過 `index.ts` 統一導出，方便在專案中引入。
*   **`src/utils/`**：存放通用的、無副作用的工具函數，如日期格式化、字串處理、表單驗證邏輯、專案常量等。
*   **`src/App.tsx`**：應用程式根組件。通常在這裡配置 React Router、包裹全局 Context Providers (如 `QueryClientProvider`, `ThemeProvider`)，並渲染頂層佈局。
*   **`src/main.tsx`**：應用程式入口文件。它負責將 `App` 組件渲染到 `public/index.html` 中的根 DOM 元素上。
*   **根目錄下的配置文件**：
    *   `.env.*`: 環境變數文件。
    *   `.eslintrc.cjs`: ESLint 用於程式碼風格檢查和錯誤檢測。
    *   `.prettierrc.json`: Prettier 用於程式碼格式化。
    *   `package.json`: 管理專案依賴和 NPM 腳本。
    *   `postcss.config.js`: PostCSS 配置，Tailwind CSS 作為其插件運行。
    *   `tailwind.config.ts`: Tailwind CSS 配置文件。
    *   `tsconfig.json`: TypeScript 編譯器配置文件。
    *   `vite.config.ts`: Vite 建構工具配置文件。

**學習建議**：
*   花時間理解每個目錄的用途，這有助於快速定位和添加新程式碼。
*   在添加新功能或組件時，思考它應該屬於哪個目錄，遵循「高內聚、低耦合」的原則。
*   特別關注 `components/` 和 `pages/` 的區別：`components/` 更側重於可重用性，而 `pages/` 側重於特定頁面的業務邏輯和組件編排。

### 3.3 組件設計與開發模式

前端開發的核心是組件。良好的組件設計能帶來可維護性、可重用性和可測試性。

#### 3.3.1 組件分類與職責

如前所述，我們將組件主要分為三類：

1.  **通用/基礎組件 (`components/common/`)**：
    *   **職責**：提供最基礎的 UI 元素，不包含任何業務邏輯。
    *   **特點**：高度可重用，通過 props 接收數據和回調函數，樣式可定制。
    *   **範例**：`Button.tsx`, `InputField.tsx`, `Modal.tsx`, `Icon.tsx`。
    *   **設計原則**：
        *   保持 API 簡潔和直觀。
        *   充分考慮無障礙性 (Accessibility, a11y)。
        *   樣式應易於覆蓋或通過 props 控制 (例如，`variant`, `size` props)。

    ```typescript
    // src/components/common/Button.tsx 範例
    import React from 'react';

    interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
      variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
      size?: 'sm' | 'md' | 'lg';
      isLoading?: boolean;
      leftIcon?: React.ReactElement;
      rightIcon?: React.ReactElement;
    }

    export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
      (
        {
          variant = 'primary',
          size = 'md',
          isLoading = false,
          leftIcon,
          rightIcon,
          children,
          className = '',
          disabled,
          ...props
        },
        ref
      ) => {
        const baseStyle = "font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center transition-colors";
        // 根據 variant 和 size 應用不同的 Tailwind 類
        // 例如: const primaryStyle = "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300";
        // ... 其他樣式變體

        // 這裡簡化，實際應有更詳細的樣式定義
        const variantStyles = {
          primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
          secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100",
          danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
          ghost: "bg-transparent text-blue-600 hover:bg-blue-100 disabled:text-gray-400",
        };
        const sizeStyles = {
          sm: "px-3 py-1.5 text-sm",
          md: "px-4 py-2 text-base",
          lg: "px-6 py-3 text-lg",
        };

        return (
          <button
            ref={ref}
            className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
          >
            {isLoading && (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}
            {children}
            {rightIcon && !isLoading && <span className="ml-2">{rightIcon}</span>}
          </button>
        );
      }
    );

    Button.displayName = 'Button';
    ```

2.  **佈局組件 (`components/layout/`)**：
    *   **職責**：定義應用程式或頁面的整體視覺結構。
    *   **特點**：通常包含插槽 (slots) 或 `children` prop 來容納內容。
    *   **範例**：`Navbar.tsx`, `Sidebar.tsx`, `Footer.tsx`, `PageLayout.tsx` (組合前三者並提供內容區域)。
    *   **設計原則**：
        *   考慮響應式設計，確保在不同屏幕尺寸下佈局合理。
        *   提供清晰的區域劃分。

3.  **功能/業務組件 (`components/features/`)**：
    *   **職責**：實現特定的業務功能，通常會包含一些業務邏輯和狀態。
    *   **特點**：與應用程式的特定領域緊密相關，可重用性可能局限於該功能模組內部。可能會調用 API、使用 store。
    *   **範例**：`PostCard.tsx` (展示貼文摘要), `CreatePostForm.tsx` (創建新貼文的表單), `UserFollowButton.tsx` (用戶關注按鈕)。
    *   **設計原則**：
        *   將 UI 展示與數據獲取/操作邏輯適當分離（例如，展示型組件 + 容器型組件模式，或使用 Hooks 封裝邏輯）。
        *   依賴注入或 props 傳遞服務/actions。

#### 3.3.2 狀態管理策略

*   **本地組件狀態 (Local Component State - `useState`, `useReducer`)**：
    *   適用於僅與單個組件相關的 UI 狀態（如表單輸入值、開關狀態、下拉菜單是否打開等）。
    *   保持狀態盡可能地本地化，避免不必要的全局狀態。
*   **全局狀態 (Global State - Zustand)**：
    *   適用於需要在多個組件之間共享的狀態，或者跨頁面持久化的狀態。
    *   例如：用戶認證信息 (`authStore`)、應用主題 (`uiStore`)、購物車內容等。
    *   避免將所有狀態都放入全局 store，只放真正需要全局共享的。
*   **伺服器狀態 (Server Cache State - React Query)**：
    *   專門用於管理從後端 API 獲取的數據。React Query 會處理快取、加載狀態、錯誤狀態等。
    *   不要將伺服器數據複製到 Zustand 或本地狀態中（除非有特殊轉換需求），直接讓組件從 React Query 獲取數據。

#### 3.3.3 數據流動

*   **Props 向下傳遞**：父組件通過 props 將數據和回調函數傳遞給子組件。這是 React 的標準數據流。
*   **事件/回調向上冒泡**：子組件通過調用從父組件傳遞下來的回調函數來通知父組件發生了某個事件或需要更改狀態。
*   **Context API (謹慎使用)**：用於深層次的 props 穿透。`ThemeProvider` 或 `QueryClientProvider` 就是例子。對於應用級別的全局狀態，優先考慮 Zustand 或 React Query。
*   **通過 Store 共享**：不直接相關的組件可以通過 Zustand store 訂閱和更新共享狀態。

#### 3.3.4 組件開發建議

*   **單一職責原則**：每個組件盡可能只做一件事情。如果一個組件過
```

---

## 📖 第四部分：核心功能演練

在了解了前後端的整體架構和關鍵技術之後，本部分將帶您深入 EngineerHub 的幾個核心功能，實際演練一個請求是如何從用戶界面發起，經過前端處理，傳遞到後端，再由後端與數據庫交互並返回響應的完整流程。這將幫助您將理論知識與實際應用結合起來。

### 4.1 功能一：用戶註冊與登入認證

用戶系統是任何社群平台的基石。我們來看看新用戶如何註冊並登入 EngineerHub。

#### 4.1.1 用戶註冊

**目標**：新用戶填寫註冊表單，提交後在後端創建新用戶帳號。

**流程概述**：

1.  **前端 (Frontend)**：
    *   用戶在註冊頁面 (`src/pages/RegisterPage.tsx`) 看到一個表單 (可能由 `src/components/features/auth/RegisterForm.tsx` 組件實現)。
    *   表單包含欄位如：用戶名 (`username`)、電子郵件 (`email`)、密碼 (`password`)、確認密碼 (`password2`)。
    *   用戶填寫表單，前端進行基本的輸入驗證 (例如，欄位是否為空、郵件格式是否正確、兩次密碼是否一致)。這通常由表單處理庫 (如 React Hook Form) 或自定義邏輯完成。
    *   用戶點擊「註冊」按鈕。
    *   觸發一個 API 請求，將表單數據 `POST` 到後端的 `/api/auth/register/` 端點。這個請求通常使用 `src/api/auth.ts` 中封裝的函數，內部可能調用 React Query 的 `useMutation` Hook 來處理異步操作、加載狀態和錯誤。

2.  **後端 (Backend)**：
    *   請求到達 Django 後端，由 URL 路由 (`engineerhub/urls.py` -> `accounts/urls.py`) 定位到 `accounts/views.py` 中的 `UserRegistrationView` (這是一個 `generics.CreateAPIView`)。
    *   `UserRegistrationView` 使用 `accounts/serializers.py` 中的 `UserRegistrationSerializer`。
    *   `UserRegistrationSerializer` 進行數據驗證：
        *   檢查 `email` 是否已存在。
        *   驗證密碼強度 (如果配置了 `django.contrib.auth.password_validation`)。
        *   驗證 `password` 和 `password2` 是否匹配。
    *   如果驗證通過，`UserRegistrationSerializer` 的 `create` 方法會被調用，使用 `User.objects.create_user()` 創建一個新的 `User` 實例 (密碼會被自動哈希存儲)。
    *   (可選) 註冊成功後，可以自動創建關聯的 `Profile` 物件，這可能通過 Django Signals 或在 `UserRegistrationSerializer` 的 `create` 方法中完成。
    *   後端返回一個成功的響應 (例如 HTTP 201 Created)，可能包含新創建的用戶信息 (不含密碼)。

3.  **前端 (Frontend) - 處理響應**：
    *   React Query `useMutation` 的 `onSuccess` 回調被觸發。
    *   前端可以提示用戶註冊成功，並引導他們前往登入頁面，或者 (根據設計) 直接為用戶生成 JWT 並自動登入。
    *   如果註冊失敗 (例如，電子郵件已被使用)，`onError` 回調被觸發，前端顯示相應的錯誤訊息給用戶。

**關鍵程式碼片段 (概念性)**：

*   **前端 - API 請求 (`src/api/auth.ts`)**：
    ```typescript
    // import type { UserRegistrationData, User } from '../types/auth';
    // import axiosInstance from './axiosConfig';

    // export const registerUser = async (data: UserRegistrationData): Promise<User> => {
    //   const response = await axiosInstance.post<User>('/auth/register/', data);
    //   return response.data;
    // };
    ```
*   **前端 - 組件調用 (`RegisterPage.tsx` 或 `RegisterForm.tsx`)**：
    ```typescript
    // import { useMutation } from '@tanstack/react-query';
    // import { registerUser } from '../../api/auth';
    // const registerMutation = useMutation({
    //   mutationFn: registerUser,
    //   onSuccess: (data) => { /* 導航到登入頁或顯示成功訊息 */ },
    //   onError: (error) => { /* 顯示錯誤訊息 */ },
    // });
    // const handleSubmit = (formData) => registerMutation.mutate(formData);
    ```
*   **後端 - 序列化器 (`accounts/serializers.py`)**：
    ```python
    # class UserRegistrationSerializer(serializers.ModelSerializer):
    #     # ... (fields as defined previously) ...
    #     def create(self, validated_data):
    #         user = User.objects.create_user(
    //             username=validated_data['username'],
    //             email=validated_data['email'],
    //             password=validated_data['password']
    //         )
    //         # Profile.objects.create(user=user) # 自動創建 Profile
    //         return user
    ```

#### 4.1.2 用戶登入

**目標**：已註冊用戶使用電子郵件和密碼登入，獲取 JWT 用於後續的身份驗證。

**流程概述**：

1.  **前端 (Frontend)**：
    *   用戶在登入頁面 (`src/pages/LoginPage.tsx`) 填寫電子郵件 (`email`) 和密碼 (`password`)。
    *   點擊「登入」按鈕。
    *   觸發 API 請求，將登入憑證 `POST` 到後端的 `/api/auth/login/` (或 `/api/token/`，如果使用 `djangorestframework-simplejwt` 的預設端點)。此請求同樣由 `src/api/auth.ts` 中的函數封裝，並使用 `useMutation`。

2.  **後端 (Backend)**：
    *   請求到達 `djangorestframework-simplejwt` 提供的 `TokenObtainPairView` (或其他自定義的登入視圖)。
    *   該視圖使用其內建的序列化器 (`TokenObtainPairSerializer`) 驗證用戶提供的 `email` 和 `password` 是否正確 (與數據庫中存儲的哈希密碼比對)。
    *   如果憑證有效，後端會生成一對 JWT：**Access Token** 和 **Refresh Token**。
    *   後端返回成功的響應 (HTTP 200 OK)，響應體中包含 `access` 和 `refresh` tokens。

3.  **前端 (Frontend) - 處理響應**：
    *   `useMutation` 的 `onSuccess` 回調觸發。
    *   前端將獲取到的 `access` 和 `refresh` tokens 存儲起來。常見的做法是：
        *   **Access Token**: 通常存儲在 JavaScript 的記憶體中 (例如 Zustand store `authStore` 的 `token` 狀態)。它有較短的過期時間 (例如 5-15 分鐘)。
        *   **Refresh Token**: 通常存儲在更持久的地方，如瀏覽器的 `localStorage` 或 `HttpOnly` Cookie (後者更安全，但前端 JS 無法直接讀取，需要後端配合設置)。它有較長的過期時間 (例如幾天或幾週)。
    *   更新全局認證狀態 (例如，`authStore` 中的 `isLoggedIn` 設為 `true`，`user` 訊息可以從 token 的 payload 解碼或通過另一個 API 請求獲取)。
    *   將用戶重定向到他們的主頁或之前嘗試訪問的受保護頁面。
    *   如果登入失敗，`onError` 回調觸發，顯示錯誤訊息。

**關鍵概念**：

*   **Access Token**：用於在每個需要認證的 API 請求的 `Authorization` 頭中發送 (通常是 `Bearer <access_token>`)。
*   **Refresh Token**：當 Access Token 過期時，前端可以使用 Refresh Token 向後端特定端點 (如 `/api/token/refresh/`) 請求一個新的 Access Token，而無需用戶重新登入。
*   **Axios 請求攔截器 (`src/api/axiosConfig.ts`)**：在每個發出的請求頭中自動附加 Access Token。
*   **後端認證類**：Django REST Framework 的認證類 (如 `JWTAuthentication` from `rest_framework_simplejwt.authentication`) 會在每個受保護的 API 請求到達視圖前，驗證請求頭中的 Access Token。

#### 4.1.3 登出

**目標**：用戶登出，清除前端存儲的認證信息。

**流程概述**：

1.  **前端 (Frontend)**：
    *   用戶點擊「登出」按鈕。
    *   (可選) 向後端發送一個請求，通知後端該 Refresh Token 失效 (如果後端實現了 Token 黑名單機制)。例如 `POST /api/auth/logout/`。
    *   清除前端存儲的 Access Token 和 Refresh Token (從 Zustand store 和 `localStorage`)。
    *   更新全局認證狀態 (`isLoggedIn` 設為 `false`, `user` 設為 `null`)。
    *   將用戶重定向到登入頁面或首頁。

2.  **後端 (Backend) - (如果實現了登出端點)**：
    *   接收到登出請求，可以將請求中的 Refresh Token 添加到黑名單中，使其不能再用於獲取新的 Access Token。

### 4.2 功能二：貼文的創建與瀏覽

貼文是社群的核心內容。我們來看看用戶如何發布新貼文以及如何瀏覽現有貼文。

#### 4.2.1 創建新貼文

**目標**：用戶填寫貼文內容 (標題、正文、標籤等)，提交後在後端創建新的貼文記錄，並使其在平台上可見。

**流程概述**：

1.  **前端 (Frontend)**：
    *   用戶導航到創建貼文的頁面 (例如，點擊「發布貼文」按鈕)。
    *   顯示一個貼文表單 (`src/components/features/posts/PostForm.tsx`)，可能包含欄位：標題 (`title`)、內容 (`content` - 可能使用富文本編輯器)、標籤 (`tags`)、圖片上傳等。
    *   用戶填寫表單。
    *   點擊「發布」按鈕。
    *   觸發 API 請求，將表單數據 `POST` 到後端的 `/api/posts/` 端點。使用 `useMutation` 處理。

2.  **後端 (Backend)**：
    *   請求到達 `posts/views.py` 中的 `PostViewSet` 的 `create` 方法。
    *   `PostViewSet` 使用 `posts/serializers.py` 中的 `PostSerializer`。
    *   `PostSerializer` 進行數據驗證 (例如，標題和內容是否為空)。
    *   如果驗證通過，`PostSerializer` 的 `perform_create` (在 ViewSet 中) 或 `create` (在 Serializer 中) 方法會被調用。
        *   `author` 欄位會自動設置為當前已認證的用戶 (`request.user`)。
        *   創建一個新的 `Post` 模型實例並保存到數據庫。
        *   如果涉及到標籤 (`Tag` 模型是多對多關係)，需要處理標籤的創建或關聯。
    *   (重要) **觸發 Algolia 索引更新**：
        *   如果專案配置了在模型保存時自動更新 Algolia 索引 (例如，通過 Django Signals 連接 `post_save` 信號，或者在 `PostSerializer` 的 `save` 方法中調用 `algolia_reindex` 相關邏輯)，新創建的貼文會被推送到 Algolia。
        *   或者，可以通過 Celery 異步任務來處理索引更新。
    *   後端返回一個成功的響應 (HTTP 201 Created)，包含新創建的貼文數據。

3.  **前端 (Frontend) - 處理響應**：
    *   `useMutation` 的 `onSuccess` 回調觸發。
    *   **更新 UI**：
        *   可以使 React Query 中與貼文列表相關的查詢失效 (`queryClient.invalidateQueries({ queryKey: ['posts'] })`)，這樣當用戶返回列表頁時會自動獲取最新數據。
        *   或者，可以直接將新創建的貼文添加到現有列表的快取中 (`queryClient.setQueryData(...)`)。
    *   提示用戶發布成功。
    *   將用戶重定向到新發布的貼文詳情頁，或貼文列表頁。
    *   如果發布失敗，`onError` 回調觸發，顯示錯誤訊息。

**關鍵程式碼片段 (概念性)**：

*   **前端 - `PostForm.tsx` 使用 `useMutation`**：
    ```typescript
    // const createPostMutation = useMutation({
    //   mutationFn: (newPostData: CreatePostData) => apiClient.createPost(newPostData), // apiClient.createPost 封裝了 API 請求
    //   onSuccess: (createdPost) => {
    //     queryClient.invalidateQueries({ queryKey: ['posts'] });
    //     navigate(`/posts/${createdPost.id}`);
    //   },
    //   onError: (error) => { /* ... */ }
    // });
    // const handleFormSubmit = (formData) => createPostMutation.mutate(formData);
    ```
*   **後端 - `PostViewSet` (`posts/views.py`)**：
    ```python
    # class PostViewSet(viewsets.ModelViewSet):
    #     # ... queryset, serializer_class ...
    #     permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly] # 發布需要登入
    #
    #     def perform_create(self, serializer):
    //         serializer.save(author=self.request.user) # 自動設置作者
    ```
*   **後端 - `PostSerializer` (`posts/serializers.py`)**：
    ```python
    # class PostSerializer(serializers.ModelSerializer):
    #     # ... author (read_only), tags (處理多對多) ...
    #     class Meta:
    #         model = Post
    #         fields = ['id', 'title', 'content', 'author_username', 'tags', 'created_at', ...]
    #         read_only_fields = ['author_username', 'created_at']
    #
    #     def create(self, validated_data):
    //         tags_data = validated_data.pop('tags', [])
    //         post = Post.objects.create(**validated_data) # author 在 ViewSet 中設置
    //         # 處理 tags_data
    //         return post
    ```

#### 4.2.2 瀏覽貼文列表

**目標**：用戶在首頁或探索頁面看到按時間倒序排列的貼文列表，支持分頁。

**流程概述**：

1.  **前端 (Frontend)**：
    *   當用戶訪問貼文列表頁面時 (例如 `HomePage.tsx` 或 `ExplorePage.tsx`)。
    *   該頁面組件使用 React Query 的 `useQuery` Hook 來獲取貼文數據。
        *   `queryKey`: 例如 `['posts', { page: currentPage, limit: 10 }]` (包含分頁參數)。
        *   `queryFn`: 調用 `src/api/posts.ts` 中封裝的 `getPosts(currentPage, 10)` 函數，該函數會向 `/api/posts/?page=<page_number>&limit=<limit_count>` 發送 `GET` 請求。
    *   `useQuery` 會返回 `data` (貼文數據)、`isLoading`、`isError`、`error` 等狀態。
    *   組件根據這些狀態渲染 UI：
        *   `isLoading` 為 `true` 時，顯示加載指示器 (例如 `LoadingSpinner.tsx`)。
        *   `isError` 為 `true` 時，顯示錯誤訊息。
        *   獲取到 `data` (通常是包含 `results` 列表和分頁信息的對象) 後，遍歷 `data.results`，使用 `PostCard.tsx` 組件渲染每個貼文的預覽。
    *   實現分頁控制邏輯，當用戶點擊「下一頁」或「上一頁」時，更新 `currentPage` 狀態，觸發 `useQuery` 使用新的 `queryKey` 重新獲取數據。

2.  **後端 (Backend)**：
    *   請求到達 `posts/views.py` 中的 `PostViewSet` 的 `list` 方法。
    *   `PostViewSet` 使用其配置的分頁類 (例如，在 `settings.py` 中全局配置的 `DEFAULT_PAGINATION_CLASS`，或在 ViewSet 中指定的 `pagination_class`) 來處理分頁參數 (`page`, `limit` 或 `page_size`)。
    *   從數據庫查詢 `Post` 物件 (通常是 `Post.objects.filter(is_published=True).order_by('-created_at')`)。
    *   `PostSerializer` 將查詢到的 `Post` 物件列表序列化為 JSON 數據。
    *   分頁類將序列化後的數據包裝成包含 `count` (總數)、`next` (下一頁鏈接)、`previous` (上一頁鏈接) 和 `results` (當前頁數據列表) 的標準格式。
    *   後端返回包含分頁數據的 JSON 響應 (HTTP 200 OK)。

**關鍵概念**：

*   **React Query 的查詢鍵 (`queryKey`)**：當查詢鍵變化時，React Query 會自動重新執行查詢。將分頁參數作為查詢鍵的一部分是實現分頁的關鍵。
*   **後端分頁**：DRF 提供了方便的分頁支持 (`PageNumberPagination`, `LimitOffsetPagination`)。
*   **前端狀態與 UI 同步**：`useQuery` 返回的狀態使得根據數據加載情況更新 UI 變得簡單。

#### 4.2.3 查看貼文詳情

與瀏覽列表類似，只是 API 端點變為 `/api/posts/<post_id>/`，`useQuery` 的 `queryKey` 通常為 `['post', postId]`，`queryFn` 為獲取單個貼文的 API 函數。後端 `PostViewSet` 的 `retrieve` 方法被調用。

### 4.3 功能三：用戶個人檔案管理

用戶可以查看自己和其他用戶的個人檔案，並編輯自己的檔案信息。

#### 4.3.1 查看個人檔案

**目標**：用戶訪問某個用戶的個人檔案頁面，看到該用戶的詳細信息 (簡介、頭像、技能、發布的貼文等)。

**流程概述**：

1.  **前端 (Frontend)**：
    *   用戶通過點擊用戶名、頭像或直接訪問 URL (例如 `/profile/<username>`) 進入個人檔案頁面 (`src/pages/ProfilePage.tsx`)。
    *   `ProfilePage.tsx` 從 URL 中獲取用戶標識 (例如 `username` 或 `userId`)。
    *   使用 `useQuery` 獲取該用戶的個人檔案數據。
        *   `queryKey`: 例如 `['profile', username]`。
        *   `queryFn`: 調用 `src/api/users.ts` (或 `profiles.ts`) 中封裝的 `getUserProfile(username)` 函數，該函數向 `/api/profiles/<username>/` (或類似端點) 發送 `GET` 請求。
    *   渲染用戶檔案信息，可能使用 `UserProfileCard.tsx` 等組件。
    *   (可選) 檔案頁面下方可以列出該用戶發布的貼文列表 (這可能是另一個 `useQuery` 調用，或者在獲取 Profile 時後端一併返回部分貼文數據)。

2.  **後端 (Backend)**：
    *   請求到達 `profiles/views.py` 中的 `ProfileViewSet` 的 `retrieve` 方法 (通常通過用戶名或用戶 ID 查找)。
    *   `ProfileViewSet` 獲取對應的 `Profile` (以及關聯的 `User`) 物件。
    *   `ProfileSerializer` 將 `Profile` 物件序列化為 JSON。
    *   後端返回用戶檔案數據 (HTTP 200 OK)。

#### 4.3.2 編輯個人檔案 (當前登入用戶)

**目標**：當前登入用戶可以修改自己的個人檔案信息 (簡介、網站、技能等)。

**流程概述**：

1.  **前端 (Frontend)**：
    *   用戶在自己的個人檔案頁面，點擊「編輯檔案」按鈕。
    *   顯示一個編輯表單，預填充用戶 Produktionsinformationen。
    *   用戶修改表單內容。
    *   點擊「保存更改」按鈕。
    *   觸發 API 請求，將更新後的檔案數據 `PUT` 或 `PATCH` 到 `/api/profiles/<username>/` (或一個指向當前用戶 profile 的特定端點，如 `/api/profile/me/`)。使用 `useMutation`。

2.  **後端 (Backend)**：
    *   請求到達 `ProfileViewSet` 的 `update` (對應 `PUT`) 或 `partial_update` (對應 `PATCH`) 方法。
    *   **權限檢查**：`ProfileViewSet` 會使用權限類 (例如 `core/permissions.py` 中的 `IsOwnerOrReadOnly` 或 `IsProfileOwnerOrReadOnly`) 確保只有檔案的擁有者 (即當前登入用戶 `request.user`) 才能修改該檔案。如果權限不足，返回 HTTP 403 Forbidden。
    *   如果權限通過，`ProfileSerializer` 用於驗證提交的數據，並更新對應的 `Profile` 物件。
    *   後端返回成功的響應 (HTTP 200 OK)，包含更新後的檔案數據。

3.  **前端 (Frontend) - 處理響應**：
    *   `useMutation` 的 `onSuccess` 回調觸發。
    *   **更新 UI**：
        *   使 React Query 中與該用戶檔案相關的查詢失效 (`queryClient.invalidateQueries({ queryKey: ['profile', username] })`)。
        *   或者直接用返回的更新後數據更新快取 (`queryClient.setQueryData(...)`)。
    *   提示用戶更新成功，並可能關閉編輯表單，顯示更新後的檔案視圖。
    *   如果更新失敗，`onError` 回調觸發，顯示錯誤訊息。

**關鍵概念**：

*   **權限控制 (`permissions.py`)**：後端必須嚴格控制誰可以修改哪些數據。`IsOwnerOrReadOnly` 是一個常見的權限類，允許任何人讀取，但只有對象的創建者/擁有者才能寫入。
*   **`PUT` vs `PATCH`**：
    *   `PUT`：通常用於完整替換資源。如果請求中缺少某些欄位，這些欄位可能會被設為空或預設值。
    *   `PATCH`：用於部分更新資源。只傳遞需要修改的欄位。`ProfileSerializer` 需要正確處理這種部分更新 (例如，設置 `partial=True`)。

這些核心功能的演練展示了 EngineerHub 中前後端如何協同工作。理解這些流程將有助於您在開發或學習過程中更好地定位問題和理解系統的行為。在實際的程式碼中，還會有更多的細節和邊界情況處理，但基本的數據流和交互模式是相似的。

---

## 📖 第五部分：開發實踐

一個成功的專案不僅僅依賴於優秀的技術選型和功能實現，更離不開良好的開發實踐。本部分將介紹在 EngineerHub 這樣的專案中推薦採用的一些開發工作流程、代碼規範、測試策略和部署理念，這些實踐有助於提升團隊協作效率、保證程式碼品質並實現快速迭代。

### 5.1 Git 工作流

選擇一個合適的 Git 工作流對於團隊協作至關重要。對於 EngineerHub 這樣的專案，可以考慮以下兩種流行且高效的工作流：

#### 5.1.1 GitHub Flow (推薦)

GitHub Flow 是一個輕量級、基於分支的工作流，特別適合經常部署的專案和小型團隊。

**核心原則**：

1.  **`main` (或 `master`) 分支是可部署的 (Always Deployable)**：`main` 分支上的任何提交都應該是穩定且可以隨時部署到生產環境的。
2.  **新工作在特性分支 (Feature Branch) 上進行**：
    *   當你要開始一個新功能、修復一個 Bug 或進行任何修改時，從最新的 `main` 分支創建一個描述性的特性分支 (例如 `feature/user-registration` 或 `fix/post-display-bug`)。
    *   命令: `git checkout -b feature/your-feature-name main`
3.  **本地提交，並定期推送到遠程特性分支**：
    *   在你的特性分支上進行開發和提交。
    *   定期將本地的特性分支推送到遠程倉庫，以便備份和協作。
    *   命令: `git push origin feature/your-feature-name`
4.  **創建拉取請求 (Pull Request, PR)**：
    *   當你認為特性開發完成，或者需要反饋時，在 GitHub (或類似平台) 上針對 `main` 分支創建一個拉取請求。
    *   PR 是進行程式碼審查 (Code Review) 和討論的地方。
5.  **程式碼審查與討論**：
    *   團隊其他成員審查你的程式碼，提出修改建議。
    *   CI (持續集成) 工具會自動運行測試，確保修改沒有破壞現有功能。
6.  **合併到 `main` 分支**：
    *   一旦 PR 通過審查且所有測試通過，就可以將特性分支合併到 `main` 分支。
    *   推薦使用 "Squash and Merge" 或 "Rebase and Merge" 來保持 `main` 分支的提交歷史清晰。
7.  **部署 `main` 分支**：
    *   合併到 `main` 分支後，可以立即觸發自動部署，或者手動部署到生產環境。

**優點**：簡單、快速、持續交付。
**缺點**：對於需要嚴格版本控制和多個環境（開發、測試、預發布、生產）並行管理的非常大型的專案，可能稍顯不足。

#### 5.1.2 Git Flow (適用於更複雜的發布週期)

Git Flow 是一個更結構化的工作流，定義了多種類型的分支，適合有明確發布週期的專案。

**主要分支**：

*   **`main` (或 `master`)**：始終代表生產就緒的狀態。只接受來自 `release` 分支或 `hotfix` 分支的合併。
*   **`develop`**：作為整合開發的最新交付分支。所有特性分支都從 `develop` 分叉，並合併回 `develop`。

**支持性分支**：

*   **特性分支 (Feature branches)**：
    *   命名: `feature/*` (例如 `feature/new-chat-module`)
    *   從 `develop` 分支出，完成後合併回 `develop`。
*   **發布分支 (Release branches)**：
    *   命名: `release/*` (例如 `release/v1.2.0`)
    *   當 `develop` 分支達到一個穩定狀態，準備發布新版本時，從 `develop` 分支出。
    *   在發布分支上只進行 Bug 修復、文檔生成等與發布相關的任務。
    *   完成後，必須同時合併回 `main` (並打上版本標籤) 和 `develop` (以確保 `develop` 也包含這些修復)。
*   **修復分支 (Hotfix branches)**：
    *   命名: `hotfix/*` (例如 `hotfix/critical-login-bug`)
    *   當生產環境的 `main` 分支出現緊急 Bug 需要立即修復時，從 `main` 分支出。
    *   完成後，必須同時合併回 `main` (並更新版本標籤) 和 `develop`。

**優點**：清晰的分支模型，適合管理多個版本和大型團隊。
**缺點**：相對複雜，流程較長，可能不適合需要快速迭代的小型專案。

**為 EngineerHub 選擇**：對於初學者和中小型團隊，**GitHub Flow** 通常更易於理解和實施，並且能夠很好地支持敏捷開發和持續部署。

### 5.2 代碼風格與質量

保持一致的代碼風格和高質量的程式碼對於專案的可維護性和團隊協作至關重要。使用自動化工具可以幫助強制執行這些標準。

#### 5.2.1 前端 (React + TypeScript)

*   **ESLint (`.eslintrc.cjs`)**：
    *   **作用**：JavaScript 和 TypeScript 的代碼檢查工具，用於發現潛在錯誤、強制執行代碼風格。
    *   **配置**：通常會配置推薦規則集 (如 `eslint:recommended`, `plugin:react/recommended`, `plugin:@typescript-eslint/recommended`)，並根據專案需求自定義規則。
    *   **集成**：可以集成到 IDE (如 VS Code) 中進行實時提示，並在 CI 流程中運行檢查。
*   **Prettier (`.prettierrc.json`)**：
    *   **作用**：一個「有主見」的代碼格式化工具，自動格式化代碼以符合一致的風格。
    *   **配置**：可配置項較少，主要關注代碼美觀和一致性。
    *   **集成**：通常與 ESLint 配合使用 (例如 `eslint-config-prettier` 關閉與 Prettier 衝突的 ESLint 規則)，並設置保存時自動格式化。
*   **TypeScript (`tsconfig.json`)**：
    *   **作用**：除了類型檢查，`tsconfig.json` 中的編譯器選項 (如 `strict: true`, `noImplicitAny: true`, `noUnusedLocals: true`) 也能幫助提升代碼質量。

#### 5.2.2 後端 (Django + Python)

*   **Black**：
    *   **作用**：一個「不妥協」的 Python 代碼格式化工具，類似於前端的 Prettier。它會將 Python 代碼格式化為一種統一的風格。
    *   **配置**：幾乎無配置，易於使用。
    *   **集成**：可以設置在提交前自動運行，或在 CI 中檢查格式。
*   **Flake8**：
    *   **作用**：一個 Python 的代碼檢查工具，整合了 PyFlakes (檢查語法錯誤)、pycodestyle (原 PEP 8，檢查風格) 和 McCabe (檢查複雜度)。
    *   **配置**：可以通過 `.flake8` 文件配置忽略特定錯誤或調整參數。
    *   **集成**：CI 流程中必不可少的一環。
*   **isort**：
    *   **作用**：自動對 Python import 語句進行排序和格式化，使其保持一致和易讀。
    *   **配置**：可以配置排序風格 (例如，與 Black 兼容)。

**實踐建議**：

*   **自動化**：將這些工具集成到開發流程中，例如使用 Git Hooks (如 Husky + lint-staged) 在提交前自動運行格式化和檢查，並在 CI 流程中強制執行。
*   **一致性**：團隊成員應遵循相同的配置和規則。
*   **IDE 集成**：在 IDE 中啟用這些工具的插件，以便在編寫代碼時獲得即時反饋。

### 5.3 測試策略

編寫測試是保證軟體質量的關鍵環節。一個全面的測試策略通常包括不同層次的測試。

#### 5.3.1 單元測試 (Unit Tests)

*   **目標**：測試程式碼中最小的可測試單元，通常是單個函數、方法或組件。
*   **前端**：
    *   **工具**：Jest, React Testing Library (RTL)。
    *   **內容**：測試 React 組件的渲染、用戶交互 (點擊、輸入)、props 傳遞、Hook 的行為等。RTL 強調測試用戶所見和所交互的內容，而不是組件的內部實現細節。
    *   **範例 (`src/components/common/Button.test.tsx`)**：測試按鈕是否正確渲染文本，點擊時是否觸發回調。
*   **後端**：
    *   **工具**：Django 的內建測試框架 (基於 Python 的 `unittest` 模組)，pytest (一個更靈活和 Pythonic 的測試框架)。
    *   **內容**：測試 Django 模型的方法、視圖函數的邏輯 (不涉及 HTTP 請求)、序列化器的驗證和轉換、工具函數等。
    *   **範例 (`backend/posts/tests/test_models.py`)**：測試 `Post` 模型創建後，`likes_count` 屬性是否正確。

#### 5.3.2 集成測試 (Integration Tests)

*   **目標**：測試多個單元 (模組、組件、服務) 協同工作時是否正確。
*   **前端**：
    *   **內容**：測試多個組件之間的交互，例如一個表單組件與提交按鈕組件、狀態管理 (Zustand) 與組件的集成等。
    *   **範例**：測試用戶在註冊表單中輸入信息並點擊提交後，全局認證狀態是否按預期更新。
*   **後端**：
    *   **內容**：測試 API 端點的行為。這通常涉及模擬 HTTP 請求到 Django 視圖，並檢查響應狀態碼、響應內容以及數據庫是否按預期更改。
    *   **工具**：Django Test Client (`django.test.Client`), DRF Test Utilities (`rest_framework.test.APIClient`)。
    *   **範例 (`backend/accounts/tests/test_views.py`)**：模擬 `POST` 請求到 `/api/auth/register/`，檢查是否成功創建用戶並返回 201 狀態碼。

#### 5.3.3 端到端測試 (End-to-End, E2E Tests) - (概念)

*   **目標**：從用戶的角度模擬完整的應用程式流程，測試整個系統 (前端、後端、數據庫、第三方服務) 是否按預期工作。
*   **工具**：Cypress, Playwright, Selenium。
*   **內容**：模擬用戶在瀏覽器中的操作，如訪問頁面、填寫表單、點擊按鈕、驗證頁面內容變化等。
*   **範例**：測試完整的用戶註冊流程：用戶訪問註冊頁 -> 填寫表單 -> 點擊註冊 -> 驗證是否跳轉到登入頁或顯示成功訊息。
*   **成本**：E2E 測試編寫和維護成本較高，運行速度較慢，但能提供最高的信心度。

**測試金字塔 (Testing Pyramid)**：
這是一個指導測試投入比例的模型：
*   **底部 (大量)**：單元測試 (快速、隔離、成本低)。
*   **中部 (適量)**：集成測試 (測試模組間交互)。
*   **頂部 (少量)**：E2E 測試 (覆蓋完整流程、成本高)。

對於 EngineerHub，應重點編寫健壯的單元測試和 API 層面的集成測試。隨著專案成熟，可以逐步引入關鍵流程的 E2E 測試。

### 5.4 持續集成與持續部署 (CI/CD)

CI/CD 是一套旨在縮短開發週期、提高軟體質量的實踐。

#### 5.4.1 持續集成 (Continuous Integration, CI)

*   **目標**：開發者頻繁地將程式碼變更合併到共享倉庫 (如 `main` 或 `develop` 分支)。每次合併都會自動觸發建構 (build) 和測試流程。
*   **流程**：
    1.  開發者提交程式碼到特性分支。
    2.  創建 Pull Request。
    3.  CI 伺服器 (如 GitHub Actions, GitLab CI, Jenkins) 自動拉取程式碼。
    4.  運行代碼風格檢查 (Linting)。
    5.  運行所有測試 (單元測試、集成測試)。
    6.  (可選) 生成建構產物 (如前端靜態文件、後端 Docker 鏡像)。
    7.  將結果反饋到 Pull Request。
*   **好處**：
    *   及早發現和修復集成錯誤。
    *   保證程式碼質量。
    *   提高開發效率。

**EngineerHub 中的 CI 實踐 (使用 GitHub Actions 為例)**：
可以在 `.github/workflows/ci.yml` 中定義工作流：
*   **觸發條件**：`push` 到 `main` 分支，或 `pull_request` 到 `main` 分支時。
*   **任務 (Jobs)**：
    *   **`lint_and_test_frontend`**：
        *   設置 Node.js 環境。
        *   安裝前端依賴 (`npm install`)。
        *   運行 ESLint 和 Prettier 檢查 (`npm run lint`)。
        *   運行 TypeScript 類型檢查 (`npm run type-check`)。
        *   運行前端單元測試 (`npm test`)。
    *   **`lint_and_test_backend`**：
        *   設置 Python 環境。
        *   安裝後端依賴 (`pip install -r backend/requirements.txt`)。
        *   運行 Black 和 Flake8 檢查。
        *   運行後端測試 (`python backend/manage.py test`)。

#### 5.4.2 持續部署 (Continuous Deployment, CD) - (概念)

*   **目標**：在 CI 成功通過後，自動將程式碼變更部署到一個或多個環境 (測試環境、預發布環境、生產環境)。
*   **流程**：
    1.  CI 流程成功完成。
    2.  CD 系統自動將建構產物部署到目標環境。
*   **好處**：
    *   快速交付價值給用戶。
    *   減少手動部署的錯誤和工作量。
    *   實現更頻繁、更可靠的發布。

**EngineerHub 的 CD 考慮**：
*   **前端部署**：可以將 `frontend/dist` 目錄下的靜態文件部署到 Vercel, Netlify, AWS S3 + CloudFront 等平台。
*   **後端部署**：可以將後端 Docker 鏡像部署到 Docker Hub，然後在伺服器 (如 AWS EC2, Google Cloud Run, Heroku) 上拉取並運行。使用 Docker Compose 或 Kubernetes 進行容器編排。
*   **資料庫部署**：通常使用雲服務商提供的託管資料庫 (如 AWS RDS for PostgreSQL, Google Cloud SQL)。

對於初學者，可以先專注於實現一個穩健的 CI 流程。隨著對部署流程的熟悉，再逐步探索和實現自動化部署 (CD)。

遵循這些開發實踐，即使是個人專案，也能帶來程式碼質量和開發效率的顯著提升。對於團隊協作而言，它們更是不可或缺的基礎。

---

## 📖 第六部分：常見問題與學習資源

在學習和探索 EngineerHub 專案的過程中，您可能會遇到一些疑問或挑戰。本部分旨在提供一個常見問題的解答集 (FAQ)，並推薦一些優質的學習資源，幫助您更順利地掌握相關技術，並深入拓展您的知識。

### 6.1 常見問題解答 (FAQ)

#### 環境設置與啟動

*   **Q1: `docker compose -f docker-compose.dev.yml up -d postgres redis adminer` 啟動失敗，提示端口已被佔用 (Port is already allocated)。**
    *   **A1**: 這意味著您本機上 PostgreSQL (預設 5432)、Redis (預設 6379) 或 Adminer (預設 8080) 所需的端口已經被其他程序佔用。
        *   **解決方案 1 (推薦)**：找出並停止正在使用這些端口的程序。您可以使用如 `netstat -ano | findstr <端口號>` (Windows) 或 `sudo lsof -i :<端口號>` (Linux/macOS) 來查找佔用端口的進程 ID，然後終止它。
        *   **解決方案 2**: 修改 `docker-compose.dev.yml` 文件，將衝突服務的 `ports` 映射更改為其他未被佔用的端口。例如，將 Adminer 的 `ports: "8080:8080"` 修改為 `ports: "8888:8080"`，然後通過 `http://localhost:8888` 訪問 Adminer。但請注意，如果修改了 `postgres` 或 `redis` 的對外映射端口，您可能需要相應更新後端 `.env` 文件中的 `DATABASE_URL` 或 Redis 連接配置 (儘管在本專案中，後端通常通過 Docker 網絡內部的主機名如 `postgres` 和 `redis` 連接，所以主要影響的是您從主機直接訪問這些服務)。

*   **Q2: 後端啟動時報錯，提示無法連接到數據庫 (e.g., `OperationalError: could not connect to server: Connection refused`)。**
    *   **A2**:
        1.  **確保 Docker 容器已啟動**：運行 `docker ps` 查看 `postgres` 和 `redis` 容器是否正在運行。如果沒有，請重新執行 `docker compose -f docker-compose.dev.yml up -d postgres redis adminer`。
        2.  **檢查後端 `.env` 文件**：確認 `backend/.env` 中的 `DATABASE_URL` (或 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`) 配置是否正確，尤其是密碼是否與您在 `SETUP_GUIDE.md` 中創建 PostgreSQL 時設置的或 `docker-compose.dev.yml` 中定義的 `POSTGRES_PASSWORD` 一致。後端連接 PostgreSQL 的主機名應為 `postgres` (因為它們在同一個 Docker 網絡中)。
        3.  **等待數據庫服務完全啟動**：有時數據庫容器雖然已啟動，但內部的 PostgreSQL 服務可能還需要幾秒鐘來完成初始化。稍等片刻再嘗試啟動後端。
        4.  **Docker 網絡問題**：極少數情況下，可能是 Docker 網絡配置問題。嘗試重啟 Docker Desktop。

*   **Q3: 前端或後端 `.env` (或 `.env.local`) 文件中的 API 金鑰配置不生效？**
    *   **A3**:
        1.  **文件名正確性**：確保後端環境變數文件是 `backend/.env`，前端是 `frontend/.env.local`。
        2.  **重啟開發伺服器**：修改 `.env` 文件後，您需要重新啟動後端開發伺服器 (`python manage.py runserver`) 和前端開發伺服器 (`npm run dev`) 才能使新的環境變數生效。
        3.  **變數名稱**：檢查您在 `.env` 文件中使用的變數名稱是否與程式碼 (例如 Django `settings.py` 或前端 `src/config/index.ts`) 中讀取的名稱完全一致 (包括大小寫)。前端 Vite 專案通常要求環境變數以 `VITE_` 開頭才能通過 `import.meta.env` 暴露給客戶端代碼。
        4.  **API 金鑰本身**：確認您從 Algolia, Google, GitHub 獲取的 API 金鑰是正確且有效的，並且具有所需的權限。

*   **Q4: Windows Git Bash 中運行 `python manage.py runserver` 失敗或行為異常。**
    *   **A4**: 正如 `SETUP_GUIDE.md` 和本指南多次強調的，Windows Git Bash 在處理 Python 虛擬環境和某些交互式命令時可能存在兼容性問題。
        *   **解決方案**：
            *   **強烈建議** 在 Windows 上使用 **PowerShell** 或 **CMD (命令提示符)** 來運行 Python 和 Django 相關命令。
            *   或者，通過 **Docker 執行 Django 命令**，例如 `docker compose -f docker-compose.dev.yml run --rm django python manage.py runserver 0.0.0.0:8000` (注意，在容器內運行 runserver 時，通常需要監聽 `0.0.0.0` 才能從主機訪問)。

#### 前後端交互

*   **Q5: 前端發送 API 請求時遇到 CORS (跨域資源共享) 錯誤。**
    *   **A5**: CORS 錯誤表示瀏覽器阻止了前端 (運行在例如 `http://localhost:5173`) 向不同源的後端 (例如 `http://localhost:8000`) 發送請求。
        *   **解決方案**：確保您的 Django 後端已經正確配置了 `django-cors-headers`。
            1.  檢查 `backend/engineerhub/settings/base.py` (或 `development.py`)：
                *   `INSTALLED_APPS` 中是否包含 `'corsheaders'`。
                *   `MIDDLEWARE` 中是否包含 `'corsheaders.middleware.CorsMiddleware'` (通常應放在靠近頂部，但在 `SessionMiddleware` 和 `CommonMiddleware` 之後可能較好)。
                *   是否設置了 `CORS_ALLOWED_ORIGINS` 或 `CORS_ALLOW_ALL_ORIGINS = True` (後者用於開發環境，更寬鬆)。對於開發環境，可以設置：
                    ```python
                    CORS_ALLOWED_ORIGINS = [
                        "http://localhost:5173", # 你的前端開發伺服器地址
                        "http://127.0.0.1:5173",
                    ]
                    ```
            2.  如果使用了 Nginx 等反向代理，也需要檢查其跨域配置。

*   **Q6: 前端 API 請求返回 404 Not Found。**
    *   **A6**:
        1.  **URL 拼寫**：仔細檢查前端發送請求的 URL 與後端 `urls.py` 中定義的路由是否完全匹配，包括末尾的斜杠 `/` (Django URL 路由通常對末尾斜杠敏感)。
        2.  **後端路由配置**：確認後端相關 app 的 `urls.py` 是否已正確包含在主項目的 `urls.py` (`backend/engineerhub/urls.py`) 中。
        3.  **後端伺服器運行狀態**：確保後端 Django 開發伺服器正在運行且沒有報錯。
        4.  **參數問題**：如果 URL 包含參數 (如 `/api/posts/<post_id>/`)，確保前端傳遞的參數值是有效的。

*   **Q7: 前端 API 請求返回 401 Unauthorized 或 403 Forbidden。**
    *   **A7**:
        *   **401 Unauthorized**: 表示請求未被認證，即用戶未登入或 JWT Token 無效/過期。
            *   **檢查點**：前端是否在請求頭的 `Authorization` 中正確攜帶了有效的 Access Token (格式通常為 `Bearer <token>`)？Access Token 是否已過期？如果過期，前端是否有刷新 Token 的邏輯？
        *   **403 Forbidden**: 表示用戶已認證，但沒有執行該操作的權限。
            *   **檢查點**：後端對應視圖的 `permission_classes` 是否設置正確？當前登入用戶是否滿足這些權限要求 (例如，是否是資源的擁有者 `IsOwnerOrReadOnly`)？

#### 數據庫與遷移

*   **Q8: 運行 `python manage.py makemigrations` 後沒有檢測到模型更改。**
    *   **A8**:
        1.  **App 是否在 `INSTALLED_APPS` 中**：確保包含已更改模型的 app 已被添加到 `backend/engineerhub/settings/base.py` 的 `INSTALLED_APPS` 列表中。
        2.  **模型文件是否已保存**：確認您對 `models.py` 文件的更改已保存。
        3.  **虛擬環境**：確保您在正確的 Python 虛擬環境中運行命令。
        4.  **針對特定 App**：如果只想為某個 app 創建遷移，可以運行 `python manage.py makemigrations <app_name>`。

*   **Q9: 運行 `python manage.py migrate` 時報錯。**
    *   **A9**: 遷移錯誤可能原因多樣。仔細閱讀錯誤訊息是關鍵。
        *   **常見原因**：
            *   **數據庫連接問題**：參考 Q2。
            *   **遷移文件衝突**：如果多人協作且合併了不同的遷移歷史，可能需要手動解決遷移文件衝突。
            *   **不兼容的模型更改**：例如，將一個非空欄位改為需要默認值但未提供，或更改欄位類型導致數據不兼容。Django 通常會在 `makemigrations` 時提示這類問題。
            *   **依賴問題**：某個遷移依賴於另一個尚未應用的遷移。
        *   **解決思路**：
            *   查看完整的錯誤追蹤訊息。
            *   如果是在開發環境且數據不重要，有時可以嘗試刪除數據庫，刪除所有 app 下的 `migrations` 文件夾 (除了 `__init__.py`)，然後重新運行 `makemigrations` 和 `migrate` 來創建一個乾淨的數據庫模式。**警告：這會清除所有數據，切勿在生產環境這樣做！**
            *   針對具體的錯誤訊息在網上搜索解決方案。

#### Algolia 搜索

*   **Q10: Algolia 搜索結果不正確或沒有更新。**
    *   **A10**:
        1.  **API 金鑰配置**：確保後端 `.env` 中的 `ALGOLIA['APPLICATION_ID']` 和 `ALGOLIA['API_KEY']` (Admin API Key) 以及前端 `.env.local` 中的 `VITE_ALGOLIA_APP_ID` 和 `VITE_ALGOLIA_SEARCH_ONLY_API_KEY` 都已正確配置。
        2.  **索引名稱**：確認程式碼中使用的索引名稱與您在 Algolia Dashboard 中看到的索引名稱一致 (包括 `INDEX_PREFIX`)。
        3.  **數據索引**：
            *   **手動重建索引**：運行 `docker compose -f docker-compose.dev.yml run --rm django python manage.py algolia_reindex` 來強制重新索引所有數據。
            *   **自動索引**：如果依賴於模型保存時自動更新索引 (例如通過 Django Signals)，請檢查相關信號處理函數是否正常工作，是否有錯誤被靜默忽略。
        4.  **Algolia Dashboard**：登入您的 Algolia Dashboard，檢查索引中是否有數據，數據結構是否符合預期。查看 Search API Logs 和 Indexing Tasks History อาจ有助於診斷問題。
        5.  **前端查詢邏輯**：檢查前端 Algolia 搜索客戶端的配置和查詢參數是否正確。

#### 其他

*   **Q11: 我應該如何向專案貢獻程式碼或報告 Bug？**
    *   **A11**: 通常開源專案會有 `CONTRIBUTING.md` 文件說明貢獻指南。如果沒有，一般的做法是：
        *   **報告 Bug**: 在專案的 Issues 區 (例如 GitHub Issues) 提交詳細的 Bug 報告，包括復現步驟、預期行為、實際行為、環境信息和任何錯誤訊息。
        *   **貢獻程式碼**:
            1.  Fork 該專案到您自己的 GitHub 帳戶。
            2.  Clone 您的 fork 到本地。
            3.  根據專案的 Git 工作流 (參考 5.1 節)，創建一個新的特性分支。
            4.  進行修改並提交。
            5.  確保您的修改符合專案的代碼風格，並已編寫必要的測試且測試通過。
            6.  將您的特性分支推送到您自己的 fork。
            7.  在原專案中創建一個 Pull Request (PR)，詳細描述您的修改內容和原因。
            8.  等待專案維護者審查您的 PR。

### 6.2 推薦學習資源

掌握 EngineerHub 專案所使用的技術棧需要持續學習。以下是一些高質量的學習資源，可以幫助您深入理解各個組件並提升您的開發技能：

#### 官方文檔 (永遠是第一選擇)

*   **Python**: [https://docs.python.org/3/](https://docs.python.org/3/)
*   **Django**: [https://docs.djangoproject.com/en/stable/](https://docs.djangoproject.com/en/stable/)
*   **Django REST Framework (DRF)**: [https://www.django-rest-framework.org/](https://www.django-rest-framework.org/)
*   **JavaScript (MDN)**: [https://developer.mozilla.org/en-US/docs/Web/JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
*   **React**: [https://react.dev/](https://react.dev/)
*   **TypeScript**: [https://www.typescriptlang.org/docs/](https://www.typescriptlang.org/docs/)
*   **Tailwind CSS**: [https://tailwindcss.com/docs/](https://tailwindcss.com/docs/)
*   **Vite**: [https://vitejs.dev/guide/](https://vitejs.dev/guide/)
*   **Zustand**: [https://github.com/pmndrs/zustand](https://github.com/pmndrs/zustand) (主要看 README 和範例)
*   **React Query (TanStack Query)**: [https://tanstack.com/query/latest/docs/react/overview](https://tanstack.com/query/latest/docs/react/overview)
*   **Algolia**: [https://www.algolia.com/doc/](https://www.algolia.com/doc/)
*   **PostgreSQL**: [https://www.postgresql.org/docs/](https://www.postgresql.org/docs/)
*   **Redis**: [https://redis.io/documentation](https://redis.io/documentation)
*   **Celery**: [https://docs.celeryq.dev/en/stable/](https://docs.celeryq.dev/en/stable/)
*   **Django Channels**: [https://channels.readthedocs.io/en/stable/](https://channels.readthedocs.io/en/stable/)
*   **Docker**: [https://docs.docker.com/](https://docs.docker.com/)

#### 教程與課程平台

*   **MDN Web Docs**: [https://developer.mozilla.org/](https://developer.mozilla.org/) (Web 技術的權威參考)
*   **freeCodeCamp**: [https://www.freecodecamp.org/](https://www.freecodecamp.org/) (大量免費編程課程和專案)
*   **W3Schools**: [https://www.w3schools.com/](https://www.w3schools.com/) (適合初學者的快速入門教程)
*   **Full Stack Open**: [https://fullstackopen.com/](https://fullstackopen.com/) (赫爾辛基大學的現代 Web 開發深度課程，強烈推薦)
*   **Udemy**: [https://www.udemy.com/](https://www.udemy.com/) (大量付費課程，質量不一，注意甄別評價)
*   **Coursera**: [https://www.coursera.org/](https://www.coursera.org/) (大學和機構提供的課程，部分免費)
*   **egghead.io**: [https://egghead.io/](https://egghead.io/) (高質量的簡短視頻課程，偏中高級)
*   **Scrimba**: [https://scrimba.com/](https://scrimba.com/) (交互式編程課程)

#### 社群與論壇

*   **Stack Overflow**: [https://stackoverflow.com/](https://stackoverflow.com/) (遇到具體編程問題時的首選)
*   **Reddit**:
    *   r/learnpython, r/django, r/reactjs, r/typescript, r/webdev 等子版塊。
*   **Dev.to**: [https://dev.to/](https://dev.to/) (開發者社群和博客平台)
*   **Hashnode**: [https://hashnode.com/](https://hashnode.com/) (開發者博客平台)
*   相關技術的官方或非官方 Discord/Slack 社群。

#### 工具特定資源

*   **Testing Playground**: [https://testing-playground.com/](https://testing-playground.com/) (輔助編寫 React Testing Library 測試)
*   **RegExr**: [https://regexr.com/](https://regexr.com/) (學習和測試正則表達式)

透過本指南的學習，結合這些優質資源，相信您能更全面地掌握 EngineerHub 專案所涉及的全端技術，並在您的開發之路上不斷進步。祝您學習愉快，編程順利！

---

希望這份《EngineerHub 學習指南》能夠成為您探索全端開發世界的一位得力助手！

</rewritten_file>