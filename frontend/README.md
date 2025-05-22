# EngineerHub 前端

EngineerHub 是一個專為工程師打造的社群平台，用戶可以分享技術經驗、程式碼片段、作品集，並與其他工程師交流互動。

## 技術棧

- React + TypeScript
- Vite
- Tailwind CSS
- Zustand (狀態管理)
- React Query (數據獲取)
- React Router (路由管理)
- Axios (API請求)
- React Hook Form (表單處理)

## 功能特點

- 用戶認證 (登錄、註冊、忘記密碼)
- 發布貼文 (文字、圖片、影片、程式碼)
- 個人資料頁
- 作品集展示
- 關注用戶
- 互動功能 (點讚、評論、收藏)
- 即時聊天 (WebSocket)

## 快速開始

### 安裝依賴

```bash
npm install
```

### 開發環境運行

```bash
npm run dev
```

### 構建生產版本

```bash
npm run build
```

### 本地預覽生產版本

```bash
npm run preview
```

## 目錄結構

```
src/
├── api/             # API 接口封裝
├── components/      # 可復用組件
├── layouts/         # 頁面布局
├── pages/           # 頁面組件
├── store/           # 全局狀態
├── hooks/           # 自定義鉤子
├── utils/           # 工具函數
├── App.tsx          # 應用入口
└── main.tsx         # 渲染入口
```

## 環境變量

創建 `.env.local` 文件並添加以下內容：

```
VITE_API_BASE_URL=http://localhost:8000/api
```

## 注意事項

- 後端API需要運行才能使前端完整運作
- 部分功能使用模擬數據，待後端API完成後需替換為實際API調用
