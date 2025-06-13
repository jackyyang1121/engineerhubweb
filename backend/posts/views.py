"""
Posts 應用的共用視圖組件 - 重構後的精簡版本

設計原則：
- Narrowly focused: 只包含共用的權限類和基礎組件
- Flexible: 權限類設計為可重用，支援不同視圖的需求
- Loosely coupled: 通過權限類提供解耦的安全檢查機制

重構說明：
- 原本629行的巨型文件已被拆分為專門的模塊
- PostViewSet -> views/post_crud.py (PostCRUDViewSet)
- 互動功能 -> views/post_interactions.py (PostInteractionViewSet)  
- CommentViewSet -> views/comments.py (CommentViewSet)
- 只保留共用的權限類和工具函數
"""

import logging
from rest_framework import permissions

# 設置日誌記錄器 - 用於共用組件的日誌記錄
logger = logging.getLogger('engineerhub.posts.shared')


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    自定義權限類 - 只有作者可以編輯，其他用戶只能讀取
    
    設計原則：
    - Narrowly focused: 專門處理作者權限檢查邏輯
    - Flexible: 可被不同的ViewSet重用，支援各種資源類型
    - Loosely coupled: 通過標準DRF權限介面實現，不依賴特定視圖
    
    適用範圍：
    - 貼文的編輯和刪除權限
    - 評論的編輯和刪除權限
    - 任何需要"作者才能編輯"邏輯的資源
    """
    
    def has_object_permission(self, request, view, obj):
        """
        檢查用戶是否有權限對特定對象執行操作
        
        設計說明：
        - Narrowly focused: 只檢查對象級別的權限，不處理其他邏輯
        - Flexible: 支援任何有author屬性的模型
        - Loosely coupled: 使用標準的DRF權限檢查流程
        
        Args:
            request: HTTP請求對象，包含用戶信息
            view: 視圖實例，提供上下文信息
            obj: 要檢查權限的對象實例
            
        Returns:
            bool: True表示有權限，False表示無權限
        """
        # 詳細的權限檢查日誌 - 便於調試和審計
        logger.info(f"🔐 權限檢查開始 - 請求方法: {request.method}")
        logger.info(f"🔐 當前用戶: {request.user.username} (ID: {request.user.id})")
        
        # 檢查對象是否有author屬性 - 確保權限檢查的適用性
        if not hasattr(obj, 'author'):
            logger.warning(f"⚠️ 對象 {obj} 沒有author屬性，無法進行權限檢查")
            return False
            
        logger.info(f"🔐 對象作者: {obj.author.username} (ID: {obj.author.id})")
        
        # 允許所有用戶進行讀取操作 - 遵循 Flexible 原則
        if request.method in permissions.SAFE_METHODS:
            logger.info(f"✅ 讀取權限通過 - 安全方法: {request.method}")
            return True
        
        # 檢查是否為作者 - 核心的權限邏輯
        is_author = obj.author == request.user
        logger.info(f"🔐 作者權限檢查結果: {is_author}")
        
        # 記錄權限檢查結果
        if not is_author:
            logger.warning(
                f"❌ 權限拒絕 - 用戶 {request.user.username} "
                f"試圖對不屬於自己的對象執行 {request.method} 操作"
            )
        else:
            logger.info(
                f"✅ 作者權限通過 - 用戶 {request.user.username} "
                f"可以執行 {request.method} 操作"
            )
            
        return is_author


# 重構後的模組導入說明
"""
重構後的視圖模組結構：

1. views/post_crud.py - PostCRUDViewSet
   職責：貼文的基本CRUD操作
   - 創建貼文 (POST /posts/)
   - 查詢貼文 (GET /posts/, GET /posts/{id}/)
   - 更新貼文 (PUT/PATCH /posts/{id}/)
   - 刪除貼文 (DELETE /posts/{id}/)
   - 特殊查詢 (following_posts, trending, recommendations, saved)

2. views/post_interactions.py - PostInteractionViewSet  
   職責：貼文的互動功能
   - 點讚/取消點讚 (like/unlike)
   - 收藏/取消收藏 (save/unsave)
   - 分享/取消分享 (share/unshare)
   - 檢舉 (report)
   - 互動狀態查詢 (status)

3. views/comments.py - CommentViewSet
   職責：評論系統的完整功能
   - 評論CRUD操作
   - 回覆功能
   - 貼文評論查詢

使用方式：
```python
# 在需要的地方導入對應的視圖
from .views.post_crud import PostCRUDViewSet
from .views.post_interactions import PostInteractionViewSet  
from .views.comments import CommentViewSet

# 權限類可以在各個視圖中重用
from .views import IsAuthorOrReadOnly
```

重構帶來的好處：
1. 代碼職責清晰 - 每個模塊專注於特定功能
2. 維護成本降低 - 問題定位更精確
3. 測試更容易 - 可以針對特定功能進行單元測試
4. 擴展性更好 - 新功能可以獨立添加模塊
5. 代碼重用 - 權限類等共用組件可以跨模塊使用
""" 