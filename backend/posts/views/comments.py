"""
評論視圖模塊 - 專職處理評論相關的HTTP請求

設計原則：
- Narrowly focused: 只負責評論相關的CRUD操作和業務邏輯
- Flexible: 通過依賴注入支援不同的權限和序列化器配置
- Loosely coupled: 最小化對其他模塊的直接依賴，通過介面解耦

職責範圍：
- 評論的增刪改查操作
- 回覆功能處理
- 評論權限控制
- 貼文評論查詢
"""

import logging
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.shortcuts import get_object_or_404

# 導入相關模型和序列化器
from comments.models import Comment
from comments.serializers import CommentSerializer, ReplySerializer
from posts.models import Post

# 設置專門的日誌記錄器 - 遵循 Narrowly focused 原則
logger = logging.getLogger('engineerhub.comments')


class CommentViewSet(viewsets.ModelViewSet):
    """
    評論視圖集 - 專職處理評論相關的API端點
    
    設計原則實現：
    - Narrowly focused: 只負責評論的CRUD操作，不處理貼文或用戶邏輯
    - Flexible: 通過查詢參數和動作支援多種使用場景
    - Loosely coupled: 通過REST API介面與前端解耦，通過外鍵與其他模型關聯
    
    主要功能：
    - 標準CRUD操作：創建、查詢、更新、刪除評論
    - 特殊查詢：獲取特定貼文的評論、獲取評論的回覆
    - 權限控制：確保只有評論作者能修改自己的評論
    """
    
    # 基礎配置 - 遵循 Loosely coupled 原則，通過配置而非硬編碼
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        獲取評論列表的查詢集
        
        設計說明：
        - Flexible: 支援基於不同條件的過濾
        - Narrowly focused: 只處理評論相關的查詢邏輯
        
        Returns:
            QuerySet: 評論對象的查詢集
        """
        # 記錄查詢操作 - 便於問題診斷和效能監控
        logger.info(f"📋 獲取評論列表 - 用戶: {self.request.user.username}")
        
        # 返回完整查詢集，具體過濾在各個動作中處理
        # 這樣設計遵循 Flexible 原則，允許不同動作有不同的過濾策略
        return Comment.objects.all()
    
    def perform_create(self, serializer):
        """
        創建評論時的處理邏輯
        
        設計說明：
        - Narrowly focused: 只處理評論創建相關的邏輯
        - Loosely coupled: 通過serializer參數接收數據，不直接操作request
        
        Args:
            serializer: 評論序列化器實例
        """
        # 詳細的操作日誌 - 便於追蹤和調試
        logger.info(f"🚀 創建評論請求 - 用戶: {self.request.user.username}")
        logger.info(f"📝 評論數據: {self.request.data}")
        
        # 設置評論的用戶為當前登入用戶 - 確保數據完整性
        serializer.save(user=self.request.user)
        
        # 成功操作日誌
        logger.info(f"✅ 評論創建成功 - 用戶: {self.request.user.username}")
    
    def perform_update(self, serializer):
        """
        更新評論時的處理邏輯
        
        設計說明：
        - Narrowly focused: 只處理評論更新邏輯，不涉及其他模型
        - Loosely coupled: 通過權限檢查保證安全性，不依賴外部驗證
        
        Args:
            serializer: 評論序列化器實例
            
        Raises:
            ValidationError: 當用戶嘗試更新非自己的評論時
        """
        try:
            # 獲取要更新的評論實例
            instance = serializer.instance
            
            # 權限檢查 - 只允許評論作者更新自己的評論
            # 這體現了 Loosely coupled 原則：在視圖層進行業務邏輯驗證
            if instance.user != self.request.user:
                logger.warning(
                    f"🚫 權限拒絕 - 用戶 {self.request.user.username} "
                    f"嘗試更新其他用戶的評論 {instance.id}"
                )
                raise ValidationError("無權限更新其他用戶的評論")
            
            # 執行更新操作
            serializer.save()
            
            # 記錄成功操作
            logger.info(
                f"✅ 評論更新成功 - 用戶: {self.request.user.username}, "
                f"評論ID: {instance.id}"
            )
            
        except ValidationError:
            # 重新拋出驗證錯誤，讓框架處理
            raise
        except Exception as e:
            # 記錄未預期的錯誤
            logger.error(f"❌ 評論更新失敗: {str(e)}")
            raise ValidationError(f"評論更新失敗: {str(e)}")
    
    def perform_destroy(self, instance):
        """
        刪除評論時的處理邏輯
        
        設計說明：
        - Narrowly focused: 只處理評論刪除邏輯
        - Loosely coupled: 通過實例參數接收要刪除的對象
        
        Args:
            instance: 要刪除的評論實例
            
        Raises:
            ValidationError: 當用戶嘗試刪除非自己的評論時
        """
        try:
            # 權限檢查 - 只允許評論作者刪除自己的評論
            if instance.user != self.request.user:
                logger.warning(
                    f"🚫 權限拒絕 - 用戶 {self.request.user.username} "
                    f"嘗試刪除其他用戶的評論 {instance.id}"
                )
                raise ValidationError("無權限刪除其他用戶的評論")
            
            # 記錄刪除操作
            logger.info(
                f"🗑️ 開始刪除評論 - 用戶: {self.request.user.username}, "
                f"評論ID: {instance.id}"
            )
            
            # 執行刪除操作
            instance.delete()
            
            # 記錄成功操作
            logger.info(
                f"✅ 評論刪除成功 - 用戶: {self.request.user.username}, "
                f"評論ID: {instance.id}"
            )
            
        except ValidationError:
            # 重新拋出驗證錯誤
            raise
        except Exception as e:
            # 記錄並包裝未預期的錯誤
            logger.error(f"❌ 評論刪除失敗: {str(e)}")
            raise ValidationError(f"評論刪除失敗: {str(e)}")
    
    @action(detail=False, methods=['get'])
    def post_comments(self, request):
        """
        獲取指定貼文的評論列表
        
        設計說明：
        - Narrowly focused: 專門處理貼文評論查詢，不涉及其他業務邏輯
        - Flexible: 通過查詢參數靈活指定要查詢的貼文
        - Loosely coupled: 通過貼文ID關聯，不直接依賴貼文對象
        
        查詢參數：
            post_id (str): 貼文的ID
            
        Returns:
            Response: 包含評論列表的響應，支援分頁
        """
        # 獲取查詢參數
        post_id = request.query_params.get('post_id')
        
        # 參數驗證 - 確保必要參數存在
        if not post_id:
            logger.warning(f"📋 查詢貼文評論失敗 - 未提供貼文ID")
            return Response(
                {"detail": "查詢貼文評論需要提供貼文ID參數"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 驗證貼文是否存在 - 遵循 Loosely coupled 原則
            post = get_object_or_404(Post, id=post_id)
            
            logger.info(
                f"📋 查詢貼文評論 - 用戶: {request.user.username}, "
                f"貼文ID: {post_id}"
            )
            
            # 獲取貼文的頂層評論 - 排除已刪除和回覆評論
            # 只返回直接評論，不包含回覆，這樣前端可以按需載入回覆
            comments = Comment.objects.filter(
                post=post,           # 屬於指定貼文
                parent=None,         # 頂層評論（非回覆）
                is_deleted=False     # 未被刪除
            ).order_by('created_at')  # 按創建時間排序
            
            # 分頁處理 - 遵循 Flexible 原則，支援大量數據的處理
            page = self.paginate_queryset(comments)
            if page is not None:
                # 使用分頁序列化
                serializer = self.get_serializer(page, many=True)
                response = self.get_paginated_response(serializer.data)
                logger.info(f"✅ 分頁評論查詢成功 - 貼文ID: {post_id}")
                return response
            
            # 無分頁序列化 - 當數據量較小時
            serializer = self.get_serializer(comments, many=True)
            logger.info(f"✅ 評論查詢成功 - 貼文ID: {post_id}")
            return Response(serializer.data)
            
        except Exception as e:
            # 錯誤處理和日誌記錄
            logger.error(f"❌ 獲取貼文評論失敗: {str(e)}")
            return Response(
                {"detail": f"獲取貼文評論失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def replies(self, request, pk=None):
        """
        獲取評論的回覆列表
        
        設計說明：
        - Narrowly focused: 專門處理回覆查詢，不涉及其他評論邏輯
        - Flexible: 支援分頁，可處理大量回覆
        - Loosely coupled: 通過評論ID關聯，使用統一的Comment模型
        
        URL參數：
            pk (str): 父評論的ID
            
        Returns:
            Response: 包含回覆列表的響應，支援分頁
        """
        try:
            # 獲取父評論對象
            comment = self.get_object()
            
            logger.info(
                f"📋 查詢評論回覆 - 用戶: {request.user.username}, "
                f"評論ID: {comment.id}"
            )
            
            # 獲取該評論的所有回覆 - 排除已刪除的回覆
            replies = comment.replies.filter(
                is_deleted=False
            ).order_by('created_at')  # 按時間順序排列回覆
            
            # 分頁處理 - 支援大量回覆的場景
            page = self.paginate_queryset(replies)
            if page is not None:
                # 使用回覆專門的序列化器 - 可能包含不同的字段
                serializer = ReplySerializer(page, many=True)
                response = self.get_paginated_response(serializer.data)
                logger.info(f"✅ 分頁回覆查詢成功 - 評論ID: {comment.id}")
                return response
            
            # 無分頁序列化
            serializer = ReplySerializer(replies, many=True)
            logger.info(f"✅ 回覆查詢成功 - 評論ID: {comment.id}")
            return Response(serializer.data)
            
        except Exception as e:
            # 錯誤處理和日誌記錄
            logger.error(f"❌ 獲取評論回覆失敗: {str(e)}")
            return Response(
                {"detail": f"獲取評論回覆失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 