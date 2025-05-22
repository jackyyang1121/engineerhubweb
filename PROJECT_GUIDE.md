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

### 🔍 搜索與發現
- **智能搜索**：用戶搜索、內容搜索、標籤搜索
- **推薦系統**：基於用戶行為的內容推薦
- **探索頁面**：熱門話題、推薦用戶、精選項目

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
- **搜索引擎**：Elasticsearch

### 開發工具
- **版本控制**：Git
- **代碼格式化**：Black, ESLint, Prettier
- **測試框架**：Pytest (後端) + Jest (前端)
- **API文檔**：DRF Spectacular

## 🚀 快速開始

### 📋 環境要求

- **Node.js** >= 18.0
- **Python** >= 3.9
- **PostgreSQL** >= 13
- **Redis** >= 6.0

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
   python manage.py migrate
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

3. **🛠️ 實踐開發**
   - 嘗試修改UI組件
   - 添加新的API端點
   - 實現小功能

4. **🧪 測試與調試**
   - 學習使用開發者工具
   - 編寫簡單的測試用例
   - 理解錯誤處理機制

## 🎨 設計模式與最佳實踐

### 前端設計模式
- **組件化開發**：可重用的UI組件
- **自定義Hook**：業務邏輯複用
- **狀態管理**：集中式狀態管理
- **錯誤邊界**：優雅的錯誤處理

### 後端設計模式
- **MVT架構**：Model-View-Template分離
- **序列化器**：數據序列化和驗證
- **權限系統**：細粒度權限控制
- **中間件**：請求處理管道

## 🔧 開發工具配置

### VS Code 推薦插件
- ES7+ React/Redux/React-Native snippets
- Python
- Tailwind CSS IntelliSense
- GitLens
- Thunder Client

### 程式碼規範
- **前端**：ESLint + Prettier
- **後端**：Black + isort + flake8
- **提交規範**：Conventional Commits

## 📖 文檔結構

- **總導覽**：`PROJECT_GUIDE.md` (本文件)
- **專案說明**：`README.md`
- **前端導覽**：`frontend/FRONTEND_GUIDE.md`
- **後端導覽**：`backend/BACKEND_GUIDE.md`
- **API文檔**：自動生成於 `/api/docs/`

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 創建 Pull Request

## 🆘 常見問題

### Q: 如何重置數據庫？
```bash
cd backend
python manage.py flush
python manage.py migrate
```

### Q: 前端熱重載不工作？
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Q: API 請求失敗？
檢查：
1. 後端服務是否運行
2. CORS 設置是否正確
3. API 端點是否正確

## 📞 技術支持

- **問題回報**：GitHub Issues
- **功能建議**：GitHub Discussions
- **文檔問題**：提交 PR 修正

---

**🎉 開始你的學習之旅吧！記住，最好的學習方式就是動手實踐。** 