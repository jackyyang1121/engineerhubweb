"""
Posts 應用的 URL 配置 - 重構後的模組化路由設計

設計原則：
- Narrowly focused: 每個路由專注於特定的功能域
- Flexible: 支援嵌套路由和靈活的API設計
- Loosely coupled: 通過清晰的路由結構實現前後端解耦

重構改進：
- 修復了導入錯誤，使用正確的模組路徑
- 分離了CRUD和互動功能的路由
- 保持向後兼容性，確保前端API調用不受影響
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

# 修復後的正確導入 - 使用重構後的模組化視圖
from .views.post_crud import PostCRUDViewSet
from .views.post_interactions import PostInteractionViewSet
from .views.comments import CommentViewSet
from .views.post_views import PostFeedAPIView, PostRecommendationsAPIView

# 創建DRF路由器 - 遵循 Flexible 原則，支援自動路由生成
router = DefaultRouter()

# 註冊評論路由 - 遵循 Narrowly focused 原則
# 評論功能現在由專門的CommentViewSet處理
router.register(r'comments', CommentViewSet, basename='comment')

# 註冊貼文CRUD路由 - 使用空路徑保持原有的URL結構
# 這確保了 Loosely coupled 原則：前端代碼無需修改
router.register(r'', PostCRUDViewSet, basename='post')

# 註冊貼文互動路由 - 作為嵌套路由
# 這樣的設計遵循了 Narrowly focused 原則：互動功能獨立處理
# URL格式：/posts/{id}/interactions/{action}/
router.register(r'(?P<post_pk>\d+)/interactions', PostInteractionViewSet, basename='post-interactions')

# URL模式配置
urlpatterns = [
    # 新增的 Feed 和 Recommendations 路由
    path('feed/', PostFeedAPIView.as_view(), name='post-feed'),
    path('recommendations/', PostRecommendationsAPIView.as_view(), name='post-recommendations'),
    
    # 包含所有由路由器註冊的URL
    # 這裡使用include()遵循了 Loosely coupled 原則
    path('', include(router.urls)),
    
    # 如果需要額外的自定義路由，可以在這裡添加
    # 例如：批量操作、特殊查詢、統計接口等
    # path('analytics/', AnalyticsViewSet.as_view(), name='post-analytics'),
    # path('bulk-operations/', BulkOperationsView.as_view(), name='bulk-operations'),
]

"""
重構後的 API 端點結構說明：

設計原則體現：
- Narrowly focused: 每類端點專注於特定功能
- Flexible: 支援不同類型的操作和查詢
- Loosely coupled: 清晰的API結構，易於前端整合

貼文 CRUD 端點（PostCRUDViewSet 負責）：
- GET    /posts/                    # 獲取貼文列表，支援分頁和過濾
- POST   /posts/                    # 創建新貼文，需要認證
- GET    /posts/{id}/               # 獲取單個貼文詳情
- PUT    /posts/{id}/               # 完整更新貼文，需要作者權限
- PATCH  /posts/{id}/               # 部分更新貼文，需要作者權限
- DELETE /posts/{id}/               # 刪除貼文，需要作者權限

貼文互動端點（PostInteractionViewSet 負責）：
- POST   /posts/{id}/interactions/like/       # 點讚操作
- POST   /posts/{id}/interactions/unlike/     # 取消點讚
- POST   /posts/{id}/interactions/save/       # 收藏貼文
- POST   /posts/{id}/interactions/unsave/     # 取消收藏
- POST   /posts/{id}/interactions/share/      # 分享貼文
- POST   /posts/{id}/interactions/unshare/    # 取消分享
- POST   /posts/{id}/interactions/report/     # 檢舉貼文
- GET    /posts/{id}/interactions/status/     # 獲取用戶對該貼文的互動狀態

評論系統端點（CommentViewSet 負責）：
- GET    /posts/comments/                     # 獲取評論列表
- POST   /posts/comments/                     # 創建新評論
- GET    /posts/comments/{id}/                # 獲取單個評論
- PUT    /posts/comments/{id}/                # 更新評論，需要作者權限
- DELETE /posts/comments/{id}/                # 刪除評論，需要作者權限
- GET    /posts/comments/post_comments/?post_id={id}  # 獲取特定貼文的評論
- GET    /posts/comments/{id}/replies/        # 獲取評論的回覆

查詢參數說明：
- page: 分頁頁碼（所有列表端點）
- page_size: 每頁數量（所有列表端點）
- ordering: 排序字段（貼文列表支援：created_at, likes_count, comments_count）
- search: 搜尋關鍵字（貼文列表）
- author: 按作者過濾（貼文列表）
- post_id: 貼文ID（評論查詢）

認證要求：
- 所有端點都需要用戶認證（除了某些只讀端點可能支援匿名訪問）
- 修改操作需要資源擁有者權限或管理員權限
- 互動操作需要活躍的用戶帳號

錯誤處理：
- 400: 請求參數錯誤
- 401: 未認證
- 403: 權限不足
- 404: 資源不存在
- 500: 服務器內部錯誤

響應格式：
- 所有響應都使用JSON格式
- 列表端點支援分頁，包含count, next, previous, results字段
- 錯誤響應包含detail字段說明錯誤原因
""" 