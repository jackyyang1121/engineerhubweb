# EngineerHub - 工程師社群平台

EngineerHub 是一個專為工程師打造的討論社群平台，提供科技消息、程式碼分享、技術討論與觀點交流。

## 專案背景

本平台旨在打造一個充滿科技消息、程式碼分享、技術討論與觀點交流的社群。用戶可以發表文字、圖片、影片與程式碼片段（支援程式碼高亮），互動功能包括點讚、留言、轉發、私訊即時聊天。系統有搜尋功能，也支援 Google 和 GitHub 登入，並用 JWT + OAuth2 做認證授權。UI 簡約且響應式。

## 技術棧

### 後端
- Python + Django REST Framework，提供 REST API
- PostgreSQL 資料庫
- Django Channels + WebSocket + Redis 實現即時聊天
- Algolia 搜尋功能
- JWT + OAuth2 (Google, GitHub登入) 認證授權
- Pygments 處理程式碼語法高亮

### 前端
- React + Vite + TypeScript
- Tailwind CSS 設計響應式 UI

## 功能特色

- 使用者系統：註冊、第三方登入、JWT認證
- 首頁資訊流：追蹤與熱門貼文、多媒體支援、程式碼高亮
- 貼文互動：點讚、留言、轉發、分享、儲存
- 即時聊天：私訊功能、已讀/未讀狀態
- 搜尋功能：用戶搜尋、貼文關鍵字搜尋
- 個人檔案頁：用戶資訊、作品集展示

## 開始使用

### 後端設置
```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 前端設置
```bash
cd frontend
npm install
npm run dev
```