import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.core.serializers.json import DjangoJSONEncoder

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    實時通知WebSocket消費者
    
    處理用戶的實時通知連接和消息推送
    """
    
    async def connect(self):
        """
        處理WebSocket連接
        """
        try:
            # 獲取用戶信息
            self.user = self.scope["user"]
            
            if self.user.is_anonymous:
                # 拒絕匿名用戶連接
                await self.close()
                return
            
            # 設置群組名稱
            self.group_name = f"user_{self.user.id}_notifications"
            
            # 加入通知群組
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            
            # 接受連接
            await self.accept()
            
            # 發送連接成功消息
            await self.send(text_data=json.dumps({
                'type': 'connection_established',
                'message': '實時通知連接已建立',
                'user_id': self.user.id
            }, cls=DjangoJSONEncoder))
            
            # 發送未讀通知數量
            unread_count = await self.get_unread_notification_count()
            await self.send(text_data=json.dumps({
                'type': 'unread_count',
                'count': unread_count
            }, cls=DjangoJSONEncoder))
            
            logger.info(f"用戶 {self.user.username} 連接到實時通知")
            
        except Exception as e:
            logger.error(f"WebSocket連接失敗: {str(e)}")
            await self.close()
    
    async def disconnect(self, close_code):
        """
        處理WebSocket斷開連接
        """
        try:
            if hasattr(self, 'group_name'):
                # 離開通知群組
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name
                )
            
            logger.info(f"用戶 {self.user.username if hasattr(self, 'user') else '未知'} 斷開實時通知連接")
            
        except Exception as e:
            logger.error(f"WebSocket斷開連接處理失敗: {str(e)}")
    
    async def receive(self, text_data):
        """
        處理客戶端發送的消息
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'mark_as_read':
                # 標記通知為已讀
                notification_ids = data.get('notification_ids', [])
                await self.mark_notifications_as_read(notification_ids)
                
            elif message_type == 'get_notifications':
                # 獲取通知列表
                page = data.get('page', 1)
                await self.send_notification_list(page)
                
            elif message_type == 'ping':
                # 心跳檢測
                await self.send(text_data=json.dumps({
                    'type': 'pong',
                    'timestamp': data.get('timestamp')
                }, cls=DjangoJSONEncoder))
                
            else:
                logger.warning(f"未知的消息類型: {message_type}")
                
        except json.JSONDecodeError:
            logger.error("接收到無效的JSON數據")
        except Exception as e:
            logger.error(f"處理WebSocket消息失敗: {str(e)}")
    
    async def notification_message(self, event):
        """
        處理新通知消息
        """
        try:
            # 發送通知到客戶端
            await self.send(text_data=json.dumps({
                'type': 'new_notification',
                'notification': event['notification']
            }, cls=DjangoJSONEncoder))
            
        except Exception as e:
            logger.error(f"發送通知消息失敗: {str(e)}")
    
    async def notification_revoked(self, event):
        """
        處理通知撤回消息
        """
        try:
            # 通知客戶端撤回通知
            await self.send(text_data=json.dumps({
                'type': 'notification_revoked',
                'notification_id': event['notification_id']
            }, cls=DjangoJSONEncoder))
            
        except Exception as e:
            logger.error(f"發送撤回通知消息失敗: {str(e)}")
    
    async def unread_count_update(self, event):
        """
        處理未讀數量更新
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'unread_count_update',
                'count': event['count']
            }, cls=DjangoJSONEncoder))
            
        except Exception as e:
            logger.error(f"發送未讀數量更新失敗: {str(e)}")
    
    @database_sync_to_async
    def get_unread_notification_count(self):
        """
        獲取用戶未讀通知數量
        """
        try:
            from .models import Notification
            return Notification.objects.filter(
                recipient=self.user,
                is_read=False
            ).count()
        except Exception as e:
            logger.error(f"獲取未讀通知數量失敗: {str(e)}")
            return 0
    
    @database_sync_to_async
    def mark_notifications_as_read(self, notification_ids):
        """
        標記通知為已讀
        """
        try:
            from .services import NotificationService
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            count = NotificationService.batch_mark_as_read(self.user, notification_ids)
            
            # 發送未讀數量更新
            unread_count = self.get_unread_notification_count()
            
            # 通過群組發送未讀數量更新
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                self.group_name,
                {
                    'type': 'unread_count_update',
                    'count': unread_count
                }
            )
            
            return count
            
        except Exception as e:
            logger.error(f"標記通知已讀失敗: {str(e)}")
            return 0
    
    @database_sync_to_async
    def send_notification_list(self, page=1, page_size=20):
        """
        發送通知列表
        """
        try:
            from .models import Notification
            from django.core.paginator import Paginator
            
            notifications = Notification.objects.filter(
                recipient=self.user
            ).select_related('actor').order_by('-created_at')
            
            paginator = Paginator(notifications, page_size)
            page_obj = paginator.get_page(page)
            
            notification_data = []
            for notification in page_obj:
                notification_data.append({
                    'id': notification.id,
                    'type': notification.type,
                    'title': notification.title,
                    'message': notification.message,
                    'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat(),
                    'actor': {
                        'id': notification.actor.id if notification.actor else None,
                        'username': notification.actor.username if notification.actor else None,
                    } if notification.actor else None,
                    'data': notification.data,
                })
            
            # 異步發送數據
            import asyncio
            asyncio.create_task(self.send(text_data=json.dumps({
                'type': 'notification_list',
                'notifications': notification_data,
                'page': page,
                'total_pages': paginator.num_pages,
                'total_count': paginator.count
            }, cls=DjangoJSONEncoder)))
            
        except Exception as e:
            logger.error(f"發送通知列表失敗: {str(e)}")


class NotificationAdminConsumer(AsyncWebsocketConsumer):
    """
    管理員通知監控WebSocket消費者
    
    用於管理員實時監控通知系統狀態
    """
    
    async def connect(self):
        """
        處理管理員連接
        """
        try:
            self.user = self.scope["user"]
            
            # 檢查是否為管理員
            if self.user.is_anonymous or not self.user.is_staff:
                await self.close()
                return
            
            # 加入管理員群組
            self.group_name = "notification_admin"
            await self.channel_layer.group_add(
                self.group_name,
                self.channel_name
            )
            
            await self.accept()
            
            # 發送系統狀態
            await self.send_system_metrics()
            
            logger.info(f"管理員 {self.user.username} 連接到通知監控")
            
        except Exception as e:
            logger.error(f"管理員WebSocket連接失敗: {str(e)}")
            await self.close()
    
    async def disconnect(self, close_code):
        """
        處理管理員斷開連接
        """
        try:
            if hasattr(self, 'group_name'):
                await self.channel_layer.group_discard(
                    self.group_name,
                    self.channel_name
                )
            
            logger.info(f"管理員 {self.user.username if hasattr(self, 'user') else '未知'} 斷開監控連接")
            
        except Exception as e:
            logger.error(f"管理員WebSocket斷開處理失敗: {str(e)}")
    
    async def receive(self, text_data):
        """
        處理管理員消息
        """
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            if message_type == 'get_metrics':
                await self.send_system_metrics()
            elif message_type == 'get_user_stats':
                user_id = data.get('user_id')
                await self.send_user_statistics(user_id)
            
        except Exception as e:
            logger.error(f"處理管理員消息失敗: {str(e)}")
    
    async def system_metrics_update(self, event):
        """
        處理系統指標更新
        """
        try:
            await self.send(text_data=json.dumps({
                'type': 'system_metrics',
                'metrics': event['metrics']
            }, cls=DjangoJSONEncoder))
            
        except Exception as e:
            logger.error(f"發送系統指標更新失敗: {str(e)}")
    
    @database_sync_to_async
    def send_system_metrics(self):
        """
        發送系統指標
        """
        try:
            from .services import NotificationMetrics
            
            metrics = NotificationMetrics.get_system_health_metrics()
            
            import asyncio
            asyncio.create_task(self.send(text_data=json.dumps({
                'type': 'system_metrics',
                'metrics': metrics
            }, cls=DjangoJSONEncoder)))
            
        except Exception as e:
            logger.error(f"發送系統指標失敗: {str(e)}")
    
    @database_sync_to_async
    def send_user_statistics(self, user_id):
        """
        發送用戶統計信息
        """
        try:
            from .services import NotificationService, NotificationAnalyzer
            from django.contrib.auth import get_user_model
            
            User = get_user_model()
            user = User.objects.get(id=user_id)
            
            stats = NotificationService.get_notification_statistics(user)
            engagement_score = NotificationAnalyzer.get_user_engagement_score(user)
            
            import asyncio
            asyncio.create_task(self.send(text_data=json.dumps({
                'type': 'user_statistics',
                'user_id': user_id,
                'username': user.username,
                'statistics': stats,
                'engagement_score': engagement_score
            }, cls=DjangoJSONEncoder)))
            
        except Exception as e:
            logger.error(f"發送用戶統計失敗: {str(e)}") 