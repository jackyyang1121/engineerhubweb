# 🚀 EngineerHub 專案總導覽

> **適合新手開發者的企業級專案學習指南**

## 📖 專案概述

EngineerHub 是一個專為工程師打造的技術社群平台，採用現代化的前後端分離架構。本專案旨在提供一個完整的企業級開發範例，適合新手開發者學習現代Web應用開發的最佳實踐。

## 🏗️ 專案架構

```
engineerhubweb/
├── 🎨 frontend/                    # React + TypeScript 前端應用
│   ├── src/                        # 源代碼目錄
│   ├── public/                     # 靜態資源
│   └── 📖 FRONTEND_GUIDE.md        # 前端專案導覽
├── 🔧 backend/                     # Django REST API 後端
│   ├── accounts/                   # 用戶認證模組
│   ├── posts/                      # 貼文功能模組
│   ├── chat/                       # 聊天功能模組
│   ├── core/                       # 核心功能模組（搜尋、通知等）
│   └── 📖 BACKEND_GUIDE.md         # 後端專案導覽
├── 📋 requirements.txt             # Python 依賴
├── 📖 README.md                    # 專案說明文檔
└── 📖 PROJECT_GUIDE.md             # 本導覽文件
```

## 🎯 核心功能模組

### 🔐 用戶系統
- **註冊/登入**：支援傳統註冊和第三方登入(Google, GitHub)
- **個人檔案**：用戶資料管理、技能標籤、作品集展示
- **認證授權**：JWT令牌認證、權限控制

### 📝 內容發佈
- **貼文系統**：支援文字、圖片、影片、程式碼分享
- **程式碼高亮**：自動語言檢測、語法高亮顯示
- **互動功能**：點讚、留言、轉發、儲存

### 🔍 搜索與發現 (Algolia 驅動)
- **智能搜索**：用戶搜索、內容搜索、程式碼片段搜索
- **即時建議**：搜尋時的自動完成和建議
- **高級過濾**：按程式語言、技能標籤、地點等過濾
- **搜尋分析**：搜尋歷史、熱門搜尋、搜尋統計
- **語法高亮**：搜尋結果中的關鍵字高亮顯示
- **容錯搜尋**：拼字錯誤容忍、同義詞支援

### 💬 社交功能
- **即時聊天**：WebSocket實現的即時通訊
- **關注系統**：用戶關注、粉絲管理
- **通知系統**：實時消息推送

## 🛠️ 技術棧總覽

### 前端技術
- **框架**：React 18 + TypeScript
- **狀態管理**：Zustand (輕量級狀態管理)
- **UI框架**：Tailwind CSS + Headless UI
- **路由**：React Router v6
- **API請求**：Axios + React Query
- **構建工具**：Vite

### 後端技術
- **框架**：Django 4.2 + Django REST Framework
- **數據庫**：PostgreSQL + Redis
- **認證**：JWT + Django AllAuth
- **即時通訊**：Django Channels + WebSocket
- **任務隊列**：Celery + Redis
- **搜索引擎**：Algolia (企業級搜尋即服務)

### 開發工具
- **版本控制**：Git
- **代碼格式化**：Black, ESLint, Prettier
- **測試框架**：Pytest (後端) + Jest (前端)
- **API文檔**：DRF Spectacular

## 🔍 Algolia 搜尋系統特色

### 🚀 核心優勢
- **毫秒級響應**：極快的搜尋速度
- **智能排序**：基於相關性和用戶行為的智能排序
- **容錯能力**：拼字錯誤自動糾正
- **多語言支援**：支援中文、英文等多種語言
- **即時索引**：內容更新後立即可搜尋

### 📊 搜尋功能
- **用戶搜尋**：按用戶名、技能、地點等搜尋
- **貼文搜尋**：內容、程式碼片段、作者等全文搜尋
- **過濾功能**：程式語言、技能標籤、發布時間等
- **即時建議**：輸入時的自動完成建議
- **搜尋歷史**：個人搜尋記錄管理
- **熱門搜尋**：平台熱門搜尋關鍵字

### 🎯 技術實現
```python
# 搜尋貼文示例
search_service.search_posts(
    query="python tutorial",
    filters={'code_language': ['python', 'javascript']},
    facets=['code_language', 'tags']
)
```

## 🚀 快速開始

### 📋 環境要求

- **Node.js** >= 18.0
- **Python** >= 3.9
- **PostgreSQL** >= 13
- **Redis** >= 6.0
- **Algolia 帳號**：需要 APPLICATION_ID 和 API_KEY

### 🔧 安裝步驟

1. **克隆專案**
   ```bash
   git clone <repository-url>
   cd engineerhubweb
   ```

2. **後端設置**
   ```bash
   cd backend
   conda create -n engineerhubweb 
   conda activate engineerhubweb
   pip install -r requirements.txt
   
   # 配置環境變數
   cp .env.example .env
   # 編輯 .env 文件，添加 Algolia 配置：
   # ALGOLIA_APPLICATION_ID=your_app_id
   # ALGOLIA_API_KEY=your_admin_api_key
   
   python manage.py makemigrations
   python manage.py migrate
   python manage.py algolia_reindex --verbose  # 建立搜尋索引
   python manage.py runserver
   ```

3. **前端設置**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **訪問應用**
   - 前端：http://localhost:5173
   - 後端API：http://localhost:8000
   - API文檔：http://localhost:8000/api/docs/

## 🔍 搜尋系統管理

### 🛠️ 索引管理命令

```bash
# 重新建立所有索引
python manage.py algolia_reindex

# 只重新索引貼文
python manage.py algolia_reindex --model Post

# 只重新索引用戶
python manage.py algolia_reindex --model User

# 清除現有索引後重建
python manage.py algolia_reindex --clear

# 批次處理（預設1000筆）
python manage.py algolia_reindex --batch-size 500

# 顯示詳細過程
python manage.py algolia_reindex --verbose
```

### 📊 搜尋 API 端點

- **統一搜尋**：`GET /api/core/search/?q=python&type=all`
- **貼文搜尋**：`GET /api/core/search/?q=react&type=posts&code_language=javascript`
- **用戶搜尋**：`GET /api/core/search/?q=john&type=users&skills=python`
- **搜尋建議**：`GET /api/core/search/suggestions/?q=py`
- **搜尋歷史**：`GET /api/core/search/history/`

### 🎛️ 搜尋配置

```python
# settings/base.py
ALGOLIA = {
    'APPLICATION_ID': 'your_app_id',
    'API_KEY': 'your_admin_api_key',
    'INDEX_PREFIX': 'engineerhub',
    'AUTO_INDEXING': True,
}

# 搜尋相關設置
SEARCH_RESULTS_PER_PAGE = 20
MAX_SEARCH_QUERY_LENGTH = 200
SEARCH_CACHE_TIMEOUT = 300  # 5分鐘
```

## 📚 學習路徑

### 🎯 新手開發者建議學習順序

1. **📖 閱讀文檔**
   - 先閱讀 `README.md` 了解專案理念
   - 查看前端導覽 `frontend/FRONTEND_GUIDE.md`
   - 查看後端導覽 `backend/BACKEND_GUIDE.md`

2. **🔍 探索代碼結構**
   - 從簡單的組件開始（如 Button, Card）
   - 理解頁面組件的組織方式
   - 學習API的設計模式
   - **重點學習**：搜尋功能實現 (`backend/core/search.py`)

3. **🛠️ 實踐開發**
   - 嘗試修改搜尋界面
   - 添加新的搜尋過濾條件
   - 實現搜尋結果頁面
   - 體驗 Algolia 的即時搜尋效果

4. **🧪 測試與調試**
   - 學習使用 Algolia Dashboard
   - 測試不同的搜尋查詢
   - 分析搜尋性能和用戶行為

## 🎨 設計模式與最佳實踐

### 前端設計模式
- **組件化開發**：可重用的搜尋組件
- **狀態管理**：搜尋狀態的集中管理
- **錯誤處理**：搜尋錯誤的優雅處理
- **性能優化**：搜尋結果的防抖和緩存

### 後端設計模式
- **服務層架構**：搜尋服務的抽象層
- **索引管理**：自動化的索引更新
- **緩存策略**：多層級搜尋結果緩存
- **監控記錄**：詳細的搜尋行為記錄

## 🔧 開發工具配置

### VS Code 推薦插件
- ES7+ React/Redux/React-Native snippets
- Python
- Tailwind CSS IntelliSense
- GitLens
- Thunder Client
- **Algolia Search**：用於管理 Algolia 索引

### 程式碼規範
- **前端**：ESLint + Prettier
- **後端**：Black + isort + flake8
- **搜尋相關**：遵循 Algolia 最佳實踐
- **提交規範**：Conventional Commits

## 📖 文檔結構

- **總導覽**：`PROJECT_GUIDE.md` (本文件)
- **專案說明**：`README.md`
- **前端導覽**：`frontend/FRONTEND_GUIDE.md`
- **後端導覽**：`backend/BACKEND_GUIDE.md`
- **API文檔**：自動生成於 `/api/docs/`
- **搜尋索引配置**：`backend/posts/search_indexes.py`

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-search-feature`)
3. 提交更改 (`git commit -m 'Add amazing search feature'`)
4. 推送分支 (`git push origin feature/amazing-search-feature`)
5. 創建 Pull Request

## 🆘 常見問題

### Q: 如何重置搜尋索引？
```bash
cd backend
python manage.py algolia_reindex --clear --verbose
```

### Q: 搜尋功能不工作？
檢查：
1. Algolia 配置是否正確
2. 索引是否已建立
3. API 金鑰權限是否足夠
```bash
# 測試 Algolia 連接
python manage.py shell
>>> from core.search import search_service
>>> search_service.posts_index.search('test')
```

### Q: 如何監控搜尋性能？
1. 查看 Algolia Dashboard 的分析頁面
2. 檢查 Django 日誌中的搜尋記錄
3. 使用 `SearchHistory` 模型分析用戶搜尋行為

### Q: 如何添加新的搜尋欄位？
1. 更新模型的搜尋索引配置 (`posts/search_indexes.py`)
2. 重新建立索引 (`python manage.py algolia_reindex`)
3. 更新前端搜尋界面

## 💡 進階功能

### 🔮 搜尋優化建議
- **個性化搜尋**：基於用戶歷史的個性化排序
- **A/B 測試**：測試不同的搜尋演算法
- **搜尋分析**：深度分析用戶搜尋行為
- **智能建議**：機器學習驅動的搜尋建議

### 🚀 效能監控
- **響應時間**：監控搜尋 API 響應時間
- **錯誤率**：追蹤搜尋錯誤和失敗率
- **用戶滿意度**：基於用戶行為的搜尋品質評估
- **索引健康度**：監控索引大小和更新頻率

---

**🎯 學習重點**：本專案特別適合學習現代化的搜尋技術實現，從基礎的全文搜尋到企業級的 Algolia 整合，涵蓋了完整的搜尋系統開發流程。 