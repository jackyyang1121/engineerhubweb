"""
Posts 視圖模塊

重構後的模塊化視圖架構：
- post_crud.py: 貼文基本 CRUD 操作
- post_interactions.py: 貼文互動功能（點讚、收藏、分享、檢舉）

原則：
- 每個模塊職責單一
- 模塊間鬆耦合
- 統一的導入接口
"""

# 導入重構後的視圖類
from .post_crud import PostCRUDViewSet
from .post_interactions import PostInteractionViewSet

# 為了保持向後兼容，導出所有視圖類
__all__ = [
    'PostCRUDViewSet',
    'PostInteractionViewSet',
]

# 可選：創建視圖類的別名以保持兼容性
PostViewSet = PostCRUDViewSet  # 主要的 CRUD 視圖保持原名 