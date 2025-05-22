import logging
from datetime import datetime, timedelta
from django.db import transaction
from django.db.models import Q, Count, Case, When, IntegerField
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from django_filters.rest_framework import DjangoFilterBackend

from .models import Notification, NotificationSettings, NotificationTemplate, NotificationType
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer, NotificationSettingsSerializer,
    NotificationTemplateSerializer, BulkNotificationMarkSerializer, NotificationStatsSerializer
)
from core.permissions import IsOwnerOrReadOnly
from core.pagination import CustomPageNumberPagination

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')


class NotificationViewSet(viewsets.ModelViewSet):
    """
    通知視圖集
    
    提供通知的CRUD操作和相關功能
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ['type', 'is_read', 'is_sent']
    ordering_fields = ['created_at', 'read_at']
    ordering = ['-created_at']
    search_fields = ['title', 'message']
    pagination_class = CustomPageNumberPagination
    
    def get_serializer_class(self):
        """
        根據動作選擇序列化器
        """
        if self.action == 'create':
            return NotificationCreateSerializer
        return NotificationSerializer
    
    def get_queryset(self):
        """
        獲取當前用戶的通知
        """
        user = self.request.user
        queryset = Notification.objects.filter(recipient=user).select_related('actor', 'content_type')
        
        # 過濾過期通知
        queryset = queryset.filter(
            Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now())
        )
        
        return queryset
    
    def perform_create(self, serializer):
        """
        創建通知（僅管理員可用）
        """
        if not self.request.user.is_staff:
            raise PermissionDenied("僅管理員可以創建通知")
        
        try:
            notification = serializer.save()
            logger.info(f"管理員 {self.request.user.username} 創建了通知: {notification.id}")
        except Exception as e:
            logger.error(f"通知創建失敗: {str(e)}")
            raise ValidationError(f"通知創建失敗: {str(e)}")
    
    @action(detail=True, methods=['post'], url_path='mark-read')
    def mark_as_read(self, request, pk=None):
        """
        標記單個通知為已讀
        """
        try:
            notification = self.get_object()
            notification.mark_as_read()
            
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"標記通知已讀失敗: {str(e)}")
            return Response(
                {"detail": f"標記通知已讀失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='mark-unread')
    def mark_as_unread(self, request, pk=None):
        """
        標記單個通知為未讀
        """
        try:
            notification = self.get_object()
            notification.mark_as_unread()
            
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"標記通知未讀失敗: {str(e)}")
            return Response(
                {"detail": f"標記通知未讀失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='bulk-action')
    def bulk_action(self, request):
        """
        批量操作通知
        """
        serializer = BulkNotificationMarkSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        notification_ids = serializer.validated_data['notification_ids']
        action_type = serializer.validated_data['action']
        
        try:
            with transaction.atomic():
                # 獲取用戶的通知
                notifications = self.get_queryset().filter(id__in=notification_ids)
                
                if not notifications.exists():
                    return Response(
                        {"detail": "沒有找到匹配的通知"},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                if action_type == 'read':
                    # 批量標記為已讀
                    notifications.filter(is_read=False).update(
                        is_read=True,
                        read_at=timezone.now()
                    )
                    message = f"已標記 {notifications.count()} 條通知為已讀"
                    
                elif action_type == 'unread':
                    # 批量標記為未讀
                    notifications.filter(is_read=True).update(
                        is_read=False,
                        read_at=None
                    )
                    message = f"已標記 {notifications.count()} 條通知為未讀"
                    
                elif action_type == 'delete':
                    # 批量刪除
                    count = notifications.count()
                    notifications.delete()
                    message = f"已刪除 {count} 條通知"
                
                logger.info(f"用戶 {request.user.username} 執行批量操作: {action_type}")
                return Response({"detail": message})
                
        except Exception as e:
            logger.error(f"批量操作失敗: {str(e)}")
            return Response(
                {"detail": f"批量操作失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_as_read(self, request):
        """
        標記所有通知為已讀
        """
        try:
            with transaction.atomic():
                unread_notifications = self.get_queryset().filter(is_read=False)
                count = unread_notifications.update(
                    is_read=True,
                    read_at=timezone.now()
                )
                
                logger.info(f"用戶 {request.user.username} 標記所有通知為已讀")
                return Response({"detail": f"已標記 {count} 條通知為已讀"})
                
        except Exception as e:
            logger.error(f"標記所有通知已讀失敗: {str(e)}")
            return Response(
                {"detail": f"標記所有通知已讀失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='stats')
    def get_stats(self, request):
        """
        獲取通知統計信息
        """
        try:
            user = request.user
            now = timezone.now()
            today = now.date()
            week_ago = now - timedelta(days=7)
            month_ago = now - timedelta(days=30)
            
            # 基礎統計
            notifications = self.get_queryset()
            total_count = notifications.count()
            unread_count = notifications.filter(is_read=False).count()
            
            # 按類型統計
            type_stats = notifications.values('type').annotate(
                count=Count('id')
            )
            
            # 按時間統計
            today_count = notifications.filter(created_at__date=today).count()
            week_count = notifications.filter(created_at__gte=week_ago).count()
            month_count = notifications.filter(created_at__gte=month_ago).count()
            
            stats_data = {
                'total_count': total_count,
                'unread_count': unread_count,
                'today_count': today_count,
                'week_count': week_count,
                'month_count': month_count,
            }
            
            # 填充各類型統計
            for choice in NotificationType.choices:
                type_key = f"{choice[0]}_count"
                stats_data[type_key] = 0
            
            for stat in type_stats:
                type_key = f"{stat['type']}_count"
                stats_data[type_key] = stat['count']
            
            serializer = NotificationStatsSerializer(data=stats_data)
            serializer.is_valid()
            
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"獲取通知統計失敗: {str(e)}")
            return Response(
                {"detail": f"獲取通知統計失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='unread')
    def get_unread(self, request):
        """
        獲取未讀通知
        """
        try:
            unread_notifications = self.get_queryset().filter(is_read=False)
            
            page = self.paginate_queryset(unread_notifications)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(unread_notifications, many=True)
            return Response(serializer.data)
            
        except Exception as e:
            logger.error(f"獲取未讀通知失敗: {str(e)}")
            return Response(
                {"detail": f"獲取未讀通知失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NotificationSettingsViewSet(viewsets.ModelViewSet):
    """
    通知設置視圖集
    """
    serializer_class = NotificationSettingsSerializer
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]
    
    def get_queryset(self):
        """
        獲取當前用戶的通知設置
        """
        return NotificationSettings.objects.filter(user=self.request.user)
    
    def get_object(self):
        """
        獲取或創建用戶的通知設置
        """
        try:
            settings, created = NotificationSettings.objects.get_or_create(
                user=self.request.user
            )
            if created:
                logger.info(f"為用戶 {self.request.user.username} 創建了默認通知設置")
            return settings
        except Exception as e:
            logger.error(f"獲取通知設置失敗: {str(e)}")
            raise ValidationError(f"獲取通知設置失敗: {str(e)}")
    
    def list(self, request, *args, **kwargs):
        """
        獲取通知設置（返回單個對象而不是列表）
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
    
    def update(self, request, *args, **kwargs):
        """
        更新通知設置
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response(serializer.data)


class NotificationTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """
    通知模板視圖集（僅讀取）
    """
    queryset = NotificationTemplate.objects.filter(is_active=True)
    serializer_class = NotificationTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type']
    
    @action(detail=True, methods=['post'], url_path='preview')
    def preview_template(self, request, pk=None):
        """
        預覽通知模板
        """
        template = self.get_object()
        
        # 示例上下文數據
        context = {
            'actor_name': request.user.username,
            'target_name': '示例內容',
            'action': '示例動作',
        }
        
        try:
            rendered_content = template.render_content(context)
            return Response(rendered_content)
        except Exception as e:
            logger.error(f"通知模板預覽失敗: {str(e)}")
            return Response(
                {"detail": f"通知模板預覽失敗: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 