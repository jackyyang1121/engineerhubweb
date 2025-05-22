import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404

from .models import Portfolio, PortfolioMedia
from .serializers import PortfolioSerializer, PortfolioMediaSerializer

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.profiles')

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    自定義權限：只有作者可以編輯，其他用戶只能讀取
    """
    def has_object_permission(self, request, view, obj):
        # 允許所有用戶讀取
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # 只有作者可以編輯
        return obj.user == request.user


class PortfolioViewSet(viewsets.ModelViewSet):
    """
    作品集視圖集，提供作品集相關操作的 API 端點
    
    提供作品集創建、查詢、更新、刪除等功能
    """
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """
        獲取作品集列表，根據不同的查詢參數過濾
        """
        queryset = Portfolio.objects.all()
        
        # 根據用戶過濾
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
            logger.info(f"按用戶過濾作品集: {user_id}")
        
        return queryset
    
    def perform_create(self, serializer):
        """
        創建作品集時設置用戶為當前用戶
        """
        try:
            serializer.save(user=self.request.user)
            logger.info(f"用戶 {self.request.user.username} 創建了新作品集")
        except Exception as e:
            logger.error(f"作品集創建失敗: {str(e)}")
            raise ValidationError(f"作品集創建失敗: {str(e)}")
    
    def perform_update(self, serializer):
        """
        更新作品集
        """
        try:
            serializer.save()
            logger.info(f"用戶 {self.request.user.username} 更新了作品集 {serializer.instance.id}")
        except Exception as e:
            logger.error(f"作品集更新失敗: {str(e)}")
            raise ValidationError(f"作品集更新失敗: {str(e)}")
    
    def perform_destroy(self, instance):
        """
        刪除作品集
        """
        try:
            instance.delete()
            logger.info(f"用戶 {self.request.user.username} 刪除了作品集 {instance.id}")
        except Exception as e:
            logger.error(f"作品集刪除失敗: {str(e)}")
            raise ValidationError(f"作品集刪除失敗: {str(e)}")
    
    @action(detail=True, methods=['delete'])
    def remove_media(self, request, pk=None):
        """
        刪除作品集媒體
        """
        portfolio = self.get_object()
        media_id = request.data.get('media_id')
        
        if not media_id:
            logger.warning("未提供媒體ID")
            return Response(
                {"detail": "未提供媒體ID"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 獲取媒體
            media = get_object_or_404(PortfolioMedia, id=media_id, portfolio=portfolio)
            
            # 刪除媒體
            media.delete()
            
            # 重新排序媒體
            with transaction.atomic():
                for i, media_item in enumerate(portfolio.media.all().order_by('order')):
                    if media_item.order != i:
                        media_item.order = i
                        media_item.save(update_fields=['order'])
            
            logger.info(f"用戶 {self.request.user.username} 刪除了作品集 {portfolio.id} 的媒體 {media_id}")
            return Response({"detail": "媒體已刪除"})
        except Exception as e:
            logger.error(f"刪除媒體失敗: {str(e)}")
            return Response(
                {"detail": f"刪除媒體失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def reorder_media(self, request, pk=None):
        """
        重新排序作品集媒體
        """
        portfolio = self.get_object()
        media_orders = request.data.get('media_orders', [])
        
        if not media_orders:
            logger.warning("未提供媒體排序")
            return Response(
                {"detail": "未提供媒體排序"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # 重新排序媒體
            with transaction.atomic():
                for media_order in media_orders:
                    media_id = media_order.get('id')
                    order = media_order.get('order')
                    
                    if media_id and order is not None:
                        media = get_object_or_404(PortfolioMedia, id=media_id, portfolio=portfolio)
                        media.order = order
                        media.save(update_fields=['order'])
            
            logger.info(f"用戶 {self.request.user.username} 重新排序了作品集 {portfolio.id} 的媒體")
            return Response({"detail": "媒體已重新排序"})
        except Exception as e:
            logger.error(f"重新排序媒體失敗: {str(e)}")
            return Response(
                {"detail": f"重新排序媒體失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 