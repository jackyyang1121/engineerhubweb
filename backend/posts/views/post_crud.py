"""
貼文 CRUD 視圖模塊

功能：專職處理貼文的基本 CRUD 操作
原則：
- Narrowly focused: 只負責基本的增刪改查操作
- Flexible: 通過依賴注入支援不同的權限和序列化器
- Loosely coupled: 最小化對其他模塊的依賴
"""

import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from ..models import Post
from ..serializers import PostSerializer
from core.permissions import IsAuthorOrReadOnly

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts.crud')


class PostCRUDViewSet(viewsets.ModelViewSet):
    """
    貼文 CRUD 視圖集 - 專職處理基本的增刪改查操作
    
    職責範圍：
    - 創建、查詢、更新、刪除貼文
    - 基本的權限檢查
    - 基本的查詢過濾
    
    不包含：
    - 互動功能（點讚、收藏、分享）
    - 推薦算法
    - 複雜的分析功能
    """
    
    serializer_class = PostSerializer
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'likes_count', 'comments_count']
    ordering = ['-created_at']
    search_fields = ['content', 'code_snippet']
    
    def get_permissions(self):
        """
        根據操作類型設置相應的權限
        
        權限策略：
        - 查看：需要身份驗證
        - 創建：需要身份驗證  
        - 更新/刪除：需要身份驗證且為作者
        """
        if self.action in ['list', 'retrieve']:
            # 查看操作：只需要身份驗證
            permission_classes = [permissions.IsAuthenticated]
        elif self.action == 'create':
            # 創建操作：需要身份驗證
            permission_classes = [permissions.IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            # 更新和刪除操作：需要身份驗證且為作者
            permission_classes = [permissions.IsAuthenticated, IsAuthorOrReadOnly]
        else:
            # 其他操作：默認需要身份驗證
            permission_classes = [permissions.IsAuthenticated]
            
        return [permission() for permission in permission_classes]
    
    def get_queryset(self):
        """
        獲取貼文查詢集，支援基本的過濾功能
        
        支援的過濾參數：
        - author: 按作者 ID 過濾
        - search: 按內容和程式碼片段搜尋
        """
        # 基礎查詢集：獲取所有已發布的貼文
        queryset = Post.objects.filter(is_published=True)
        
        # 按作者過濾
        author_id = self.request.query_params.get('author')
        if author_id:
            queryset = queryset.filter(author_id=author_id)
            logger.info(f"按作者過濾貼文 - 作者ID: {author_id}")
        
        # 關鍵字搜尋 - 在內容和程式碼片段中搜尋
        search_query = self.request.query_params.get('search')
        if search_query:
            queryset = queryset.filter(
                Q(content__icontains=search_query) |
                Q(code_snippet__icontains=search_query)
            )
            logger.info(f"搜尋貼文 - 關鍵字: {search_query}")
        
        # 根據發布狀態過濾（管理員可以查看未發布的貼文）
        if self.request.user.is_staff:
            # 管理員可以查看所有貼文
            show_unpublished = self.request.query_params.get('show_unpublished', 'false')
            if show_unpublished.lower() == 'true':
                queryset = Post.objects.all()
                logger.info(f"管理員查看所有貼文（包含未發布）")
        
        return queryset
    
    def perform_create(self, serializer):
        """
        創建貼文時的額外處理
        
        功能：
        - 設置作者為當前用戶
        - 記錄創建日誌
        - 處理事務安全
        """
        try:
            # 使用事務確保數據一致性
            with transaction.atomic():
                # 設置作者為當前用戶
                post = serializer.save(author=self.request.user)
                
                # 記錄創建日誌
                logger.info(
                    f"貼文創建成功 - "
                    f"用戶: {self.request.user.username} ({self.request.user.id}), "
                    f"貼文ID: {post.id}, "
                    f"內容長度: {len(post.content)}"
                )
                
                # 可以在這裡添加其他創建後的處理邏輯
                # 例如：通知關注者、更新統計等（通過信號或異步任務）
                
        except Exception as e:
            logger.error(
                f"貼文創建失敗 - "
                f"用戶: {self.request.user.username}, "
                f"錯誤: {str(e)}"
            )
            raise ValidationError(f"貼文創建失敗: {str(e)}")
    
    def perform_update(self, serializer):
        """
        更新貼文時的額外處理
        
        功能：
        - 記錄更新日誌
        - 驗證更新權限
        - 處理事務安全
        """
        try:
            with transaction.atomic():
                # 保存更新前的信息（用於日誌）
                original_post = self.get_object()
                
                # 執行更新
                updated_post = serializer.save()
                
                # 記錄更新日誌
                logger.info(
                    f"貼文更新成功 - "
                    f"用戶: {self.request.user.username}, "
                    f"貼文ID: {updated_post.id}, "
                    f"更新時間: {updated_post.updated_at}"
                )
                
        except Exception as e:
            logger.error(
                f"貼文更新失敗 - "
                f"用戶: {self.request.user.username}, "
                f"貼文ID: {self.kwargs.get('pk')}, "
                f"錯誤: {str(e)}"
            )
            raise ValidationError(f"貼文更新失敗: {str(e)}")
    
    def perform_destroy(self, instance):
        """
        刪除貼文時的額外處理
        
        功能：
        - 記錄刪除日誌
        - 處理相關數據清理
        - 確保權限檢查
        """
        try:
            with transaction.atomic():
                # 記錄刪除信息（在實際刪除前記錄）
                post_id = instance.id
                post_author = instance.author.username
                
                # 執行刪除
                instance.delete()
                
                # 記錄刪除日誌
                logger.info(
                    f"貼文刪除成功 - "
                    f"執行用戶: {self.request.user.username}, "
                    f"原作者: {post_author}, "
                    f"貼文ID: {post_id}"
                )
                
                # 這裡可以添加刪除後的清理邏輯
                # 例如：清理相關通知、更新統計等
                
        except Exception as e:
            logger.error(
                f"貼文刪除失敗 - "
                f"用戶: {self.request.user.username}, "
                f"貼文ID: {instance.id}, "
                f"錯誤: {str(e)}"
            )
            raise ValidationError(f"貼文刪除失敗: {str(e)}")
    
    def create(self, request, *args, **kwargs):
        """
        重寫創建方法，添加額外的驗證和處理
        """
        # 檢查用戶是否有權限創建貼文
        if not request.user.is_active:
            logger.warning(f"非活躍用戶嘗試創建貼文: {request.user.username}")
            return Response(
                {"detail": "您的帳號已被暫停，無法創建貼文"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 調用父類的創建方法
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        重寫更新方法，添加額外的驗證
        """
        instance = self.get_object()
        
        # 檢查是否為草稿模式更新
        partial = kwargs.pop('partial', False)
        
        # 調用父類的更新方法
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        重寫刪除方法，添加額外的安全檢查
        """
        instance = self.get_object()
        
        # 額外的安全檢查：確保用戶有權限刪除
        if not (instance.author == request.user or request.user.is_staff):
            logger.warning(
                f"無權限的刪除嘗試 - "
                f"用戶: {request.user.username}, "
                f"目標貼文作者: {instance.author.username}"
            )
            return Response(
                {"detail": "您沒有權限刪除此貼文"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # 調用父類的刪除方法
        return super().destroy(request, *args, **kwargs)
    
    def list(self, request, *args, **kwargs):
        """
        重寫列表方法，添加分頁優化
        """
        # 記錄查詢日誌
        logger.debug(
            f"貼文列表查詢 - "
            f"用戶: {request.user.username}, "
            f"查詢參數: {dict(request.query_params)}"
        )
        
        # 調用父類的列表方法
        return super().list(request, *args, **kwargs)
    
    def retrieve(self, request, *args, **kwargs):
        """
        重寫詳情方法，添加查看次數統計
        """
        instance = self.get_object()
        
        # 增加查看次數（異步處理避免影響響應速度）
        # 這裡可以使用 Celery 任務或者簡單的異步更新
        try:
            from django.db import models
            Post.objects.filter(id=instance.id).update(
                views_count=models.F('views_count') + 1
            )
        except Exception as e:
            # 查看次數更新失敗不應該影響正常的查詢
            logger.warning(f"更新查看次數失敗: {e}")
        
        # 調用父類的詳情方法
        return super().retrieve(request, *args, **kwargs) 