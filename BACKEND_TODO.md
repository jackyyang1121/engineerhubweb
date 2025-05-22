# 後端開發待辦事項 (Backend TODO)

這個文件記錄了前端實現中需要後端API支持的所有功能。請按優先級實現這些API端點。

## 🔥 高優先級 - 核心功能

### 用戶認證系統
- [ ] `POST /auth/registration/` - 用戶註冊
- [ ] `POST /auth/login/` - 用戶登入
- [ ] `POST /auth/logout/` - 用戶登出
- [ ] `POST /auth/token/refresh/` - 刷新JWT令牌
- [ ] `POST /auth/password/reset/` - 忘記密碼
- [ ] `POST /auth/password/reset/confirm/` - 重置密碼確認
- [ ] `POST /auth/password/change/` - 修改密碼
- [ ] `POST /auth/google/` - Google OAuth登入
- [ ] `POST /auth/github/` - GitHub OAuth登入

### 用戶管理
- [ ] `GET /users/me/` - 獲取當前用戶信息
- [ ] `PATCH /users/me/` - 更新用戶資料
- [ ] `POST /users/{id}/follow/` - 關注用戶
- [ ] `DELETE /users/{id}/follow/` - 取消關注用戶
- [ ] `GET /users/{id}/followers/` - 獲取用戶關注者列表
- [ ] `GET /users/{id}/following/` - 獲取用戶關注列表
- [ ] `DELETE /users/me/` - 刪除帳號

### 貼文系統
- [ ] `GET /posts/` - 獲取貼文列表（支持分頁）
- [ ] `POST /posts/` - 創建新貼文（支持文件上傳）
- [ ] `GET /posts/{id}/` - 獲取單個貼文詳情
- [ ] `PATCH /posts/{id}/` - 更新貼文
- [ ] `DELETE /posts/{id}/` - 刪除貼文
- [ ] `POST /posts/{id}/like/` - 點讚貼文
- [ ] `POST /posts/{id}/unlike/` - 取消點讚貼文
- [ ] `POST /posts/{id}/save/` - 收藏貼文
- [ ] `POST /posts/{id}/unsave/` - 取消收藏貼文
- [ ] `GET /posts/following_posts/` - 獲取關注用戶的貼文
- [ ] `GET /posts/trending/` - 獲取熱門貼文
- [ ] `GET /posts/saved/` - 獲取用戶收藏的貼文

## 🔷 中等優先級 - 互動功能

### 評論系統
- [ ] `GET /posts/{id}/comments/` - 獲取貼文評論
- [ ] `POST /posts/comments/` - 創建評論
- [ ] `PATCH /posts/comments/{id}/` - 更新評論
- [ ] `DELETE /posts/comments/{id}/` - 刪除評論
- [ ] `GET /posts/comments/{id}/replies/` - 獲取評論回覆
- [ ] `POST /comments/{id}/like/` - 點讚評論
- [ ] `DELETE /comments/{id}/like/` - 取消點讚評論

### 搜索功能
- [ ] `GET /search?q={query}` - 搜索全部內容（用戶+貼文）
- [ ] `GET /search/posts?q={query}` - 只搜索貼文
- [ ] `GET /search/users?q={query}` - 只搜索用戶
- [ ] 需要集成Algolia或Elasticsearch進行高效搜索

### 舉報系統
- [ ] `POST /posts/{id}/report/` - 舉報貼文
- [ ] `POST /comments/{id}/report/` - 舉報評論
- [ ] `POST /users/{id}/report/` - 舉報用戶

## 🔸 低優先級 - 進階功能

### 聊天系統
- [ ] `GET /conversations/` - 獲取對話列表
- [ ] `GET /conversations/{id}/messages/` - 獲取對話消息
- [ ] `POST /conversations/{id}/messages/` - 發送消息
- [ ] `PATCH /messages/{id}/read/` - 標記消息為已讀
- [ ] WebSocket實現即時聊天功能

### 通知系統
- [ ] `GET /notifications/` - 獲取通知列表
- [ ] `PATCH /notifications/{id}/read/` - 標記通知為已讀
- [ ] `PATCH /notifications/read_all/` - 標記所有通知為已讀
- [ ] `GET /notifications/unread_count/` - 獲取未讀通知數量

### 作品集系統
- [ ] `GET /users/{id}/portfolio/` - 獲取用戶作品集
- [ ] `POST /users/me/portfolio/` - 添加作品集項目
- [ ] `PATCH /portfolio/{id}/` - 更新作品集項目
- [ ] `DELETE /portfolio/{id}/` - 刪除作品集項目

### 設置系統
- [ ] `GET /users/me/settings/` - 獲取用戶設置
- [ ] `PATCH /users/me/settings/notifications/` - 更新通知設置
- [ ] `PATCH /users/me/settings/privacy/` - 更新隱私設置

## 📋 技術實現要求

### 文件上傳
- [ ] 支持圖片上傳（JPG, PNG, GIF, WebP）
- [ ] 支持視頻上傳（MP4, WebM）
- [ ] 文件大小限制：圖片10MB，視頻100MB
- [ ] 自動生成縮略圖
- [ ] 支持CDN存儲（建議使用AWS S3或類似服務）

### 程式碼高亮
- [ ] 集成Pygments進行程式碼語法高亮
- [ ] 自動檢測程式語言
- [ ] 支持100多種程式語言
- [ ] 返回HTML格式的高亮代碼

### 安全性
- [ ] JWT token認證
- [ ] CORS設置
- [ ] 文件上傳安全檢查
- [ ] 輸入驗證和SQL注入防護
- [ ] 敏感信息過濾

### 性能優化
- [ ] 分頁查詢支持
- [ ] 數據庫索引優化
- [ ] Redis緩存熱門數據
- [ ] API響應時間監控

### WebSocket功能
- [ ] 即時聊天消息
- [ ] 實時通知推送
- [ ] 在線狀態更新
- [ ] 貼文實時點讚/評論通知

## 🗃️ 數據庫模型

### 核心模型
- [ ] User (用戶模型)
- [ ] Post (貼文模型)
- [ ] PostMedia (貼文媒體模型)
- [ ] Comment (評論模型)
- [ ] Follow (關注關係模型)
- [ ] Like (點讚模型)
- [ ] Save (收藏模型)

### 進階模型
- [ ] PortfolioProject (作品集項目模型)
- [ ] Conversation (對話模型)
- [ ] Message (消息模型)
- [ ] Notification (通知模型)
- [ ] Report (舉報模型)
- [ ] UserSettings (用戶設置模型)

## 🔧 部署和配置

### 環境設置
- [ ] Django設置和配置
- [ ] PostgreSQL數據庫設置
- [ ] Redis設置（緩存和會話）
- [ ] Celery設置（異步任務）
- [ ] WebSocket服務器設置

### 第三方服務集成
- [ ] OAuth2設置（Google, GitHub）
- [ ] 郵件服務設置（用於密碼重置）
- [ ] 文件存儲服務設置
- [ ] 推送通知服務設置

---

## ⚠️ 注意事項

1. 所有API都需要適當的錯誤處理和返回統一的錯誤格式
2. 需要實現適當的權限控制（例如：只能刪除自己的貼文）
3. 所有涉及用戶生成內容的API都需要內容過濾
4. 需要實現適當的速率限制防止API濫用
5. 所有敏感操作需要額外的身份驗證

## 📝 API響應格式示例

### 成功響應
```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

### 錯誤響應
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "輸入數據無效",
    "details": {
      "field_name": ["錯誤信息"]
    }
  }
}
```

### 分頁響應
```json
{
  "count": 100,
  "next": "http://api.example.com/posts/?page=3",
  "previous": "http://api.example.com/posts/?page=1",
  "results": [ ... ]
}
``` 