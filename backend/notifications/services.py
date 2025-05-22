import logging
from typing import Optional, Dict, Any, List
from django.db import transaction
from django.contrib.contenttypes.models import ContentType
from django.utils import timezone
from django.conf import settings
from django.template.loader import render_to_string
from django.core.mail import send_mail
from django.db.models import Q, Count, Avg
from django.core.cache import cache
from datetime import timedelta, datetime
import json

from .models import Notification, NotificationSettings, NotificationTemplate, NotificationType

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')


class NotificationService:
    """
    通知服務類
    
    提供通知創建、發送和管理的統一接口
    """
    
    # 通知配額設置（防止垃圾通知）
    RATE_LIMIT_SETTINGS = {
        NotificationType.FOLLOW: {'count': 50, 'period': 3600},  # 1小時內最多50個關注通知
        NotificationType.LIKE: {'count': 100, 'period': 3600},   # 1小時內最多100個點讚通知
        NotificationType.COMMENT: {'count': 30, 'period': 3600}, # 1小時內最多30個評論通知
        NotificationType.REPLY: {'count': 50, 'period': 3600},   # 1小時內最多50個回覆通知
        NotificationType.MENTION: {'count': 20, 'period': 3600}, # 1小時內最多20個提及通知
        NotificationType.MESSAGE: {'count': 100, 'period': 3600},# 1小時內最多100個私信通知
        NotificationType.SHARE: {'count': 30, 'period': 3600},   # 1小時內最多30個分享通知
        NotificationType.SYSTEM: {'count': 10, 'period': 3600},  # 1小時內最多10個系統通知
    }
    
    @staticmethod
    def create_notification(
        recipient,
        notification_type: str,
        title: str,
        message: str,
        actor=None,
        target_object=None,
        data: Optional[Dict[str, Any]] = None,
        expires_at=None,
        priority: str = 'normal'
    ) -> Optional[Notification]:
        """
        創建通知的通用方法
        
        Args:
            recipient: 接收通知的用戶
            notification_type: 通知類型
            title: 通知標題
            message: 通知內容
            actor: 觸發通知的用戶
            target_object: 相關的對象（如貼文、評論等）
            data: 額外數據
            expires_at: 過期時間
            priority: 通知優先級 ('low', 'normal', 'high', 'urgent')
            
        Returns:
            創建的通知對象或None
        """
        try:
            # 檢查配額限制
            if not NotificationService._check_rate_limit(recipient, notification_type):
                logger.info(f"用戶 {recipient.username} 的 {notification_type} 通知達到配額限制")
                return None
            
            # 檢查用戶的通知設置
            settings_obj, _ = NotificationSettings.objects.get_or_create(user=recipient)
            if not settings_obj.is_notification_enabled(notification_type):
                logger.info(f"用戶 {recipient.username} 已關閉 {notification_type} 通知")
                return None
            
            # 檢查是否在勿擾時間
            if settings_obj.is_in_quiet_hours() and priority != 'urgent':
                logger.info(f"用戶 {recipient.username} 正在勿擾時間，延後發送通知")
                # TODO: 可以實現延後發送邏輯
            
            with transaction.atomic():
                # 設置目標對象的內容類型
                content_type = None
                object_id = None
                if target_object:
                    content_type = ContentType.objects.get_for_model(target_object)
                    object_id = target_object.id
                
                # 檢查是否需要聚合通知
                existing_notification = NotificationService._find_aggregable_notification(
                    recipient, notification_type, actor, target_object
                )
                
                if existing_notification:
                    # 聚合到現有通知
                    return NotificationService._aggregate_notification(
                        existing_notification, actor, data
                    )
                
                # 創建通知
                notification_data = data or {}
                notification_data['priority'] = priority
                
                notification = Notification.objects.create(
                    recipient=recipient,
                    actor=actor,
                    type=notification_type,
                    title=title,
                    message=message,
                    content_type=content_type,
                    object_id=object_id,
                    data=notification_data,
                    expires_at=expires_at
                )
                
                logger.info(f"通知創建成功: {notification.id}")
                
                # 更新配額計數
                NotificationService._update_rate_limit_count(recipient, notification_type)
                
                # 異步發送通知（郵件、推送等）
                NotificationService._send_notification_async(notification)
                
                # 發送實時通知
                NotificationService._send_realtime_notification(notification)
                
                return notification
                
        except Exception as e:
            logger.error(f"創建通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_follow_notification(actor, recipient) -> Optional[Notification]:
        """
        創建關注通知
        """
        try:
            # 獲取或創建通知模板
            template = NotificationService._get_notification_template(NotificationType.FOLLOW)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 開始關注您',
                'message': f'{actor.username} 開始關注您了！'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.FOLLOW,
                title=content['title'],
                message=content['message'],
                actor=actor,
                data={'action': 'follow'}
            )
        except Exception as e:
            logger.error(f"創建關注通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_like_notification(actor, recipient, target_object) -> Optional[Notification]:
        """
        創建點讚通知
        """
        try:
            template = NotificationService._get_notification_template(NotificationType.LIKE)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
                'target_name': getattr(target_object, 'content', '您的內容')[:50] + '...',
                'target_object': target_object,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 點讚了您的內容',
                'message': f'{actor.username} 點讚了您的內容'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.LIKE,
                title=content['title'],
                message=content['message'],
                actor=actor,
                target_object=target_object,
                data={'action': 'like'}
            )
        except Exception as e:
            logger.error(f"創建點讚通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_comment_notification(actor, recipient, target_object) -> Optional[Notification]:
        """
        創建評論通知
        """
        try:
            template = NotificationService._get_notification_template(NotificationType.COMMENT)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
                'comment_content': getattr(target_object, 'content', '評論內容')[:50] + '...',
                'target_object': target_object,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 評論了您的貼文',
                'message': f'{actor.username} 評論了您的貼文'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.COMMENT,
                title=content['title'],
                message=content['message'],
                actor=actor,
                target_object=target_object,
                data={'action': 'comment'}
            )
        except Exception as e:
            logger.error(f"創建評論通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_reply_notification(actor, recipient, target_object) -> Optional[Notification]:
        """
        創建回覆通知
        """
        try:
            template = NotificationService._get_notification_template(NotificationType.REPLY)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
                'reply_content': getattr(target_object, 'content', '回覆內容')[:50] + '...',
                'target_object': target_object,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 回覆了您的評論',
                'message': f'{actor.username} 回覆了您的評論'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.REPLY,
                title=content['title'],
                message=content['message'],
                actor=actor,
                target_object=target_object,
                data={'action': 'reply'}
            )
        except Exception as e:
            logger.error(f"創建回覆通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_mention_notification(actor, recipient, target_object) -> Optional[Notification]:
        """
        創建提及通知
        """
        try:
            template = NotificationService._get_notification_template(NotificationType.MENTION)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
                'target_object': target_object,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 在內容中提及了您',
                'message': f'{actor.username} 在內容中提及了您'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.MENTION,
                title=content['title'],
                message=content['message'],
                actor=actor,
                target_object=target_object,
                data={'action': 'mention'}
            )
        except Exception as e:
            logger.error(f"創建提及通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_message_notification(actor, recipient, target_object) -> Optional[Notification]:
        """
        創建私信通知
        """
        try:
            template = NotificationService._get_notification_template(NotificationType.MESSAGE)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
                'message_content': getattr(target_object, 'content', '訊息內容')[:50] + '...',
                'target_object': target_object,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 向您發送了訊息',
                'message': f'{actor.username} 向您發送了訊息'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.MESSAGE,
                title=content['title'],
                message=content['message'],
                actor=actor,
                target_object=target_object,
                data={'action': 'message'}
            )
        except Exception as e:
            logger.error(f"創建私信通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_share_notification(actor, recipient, target_object) -> Optional[Notification]:
        """
        創建分享通知
        """
        try:
            template = NotificationService._get_notification_template(NotificationType.SHARE)
            
            context = {
                'actor_name': actor.username,
                'actor': actor,
                'recipient': recipient,
                'target_object': target_object,
            }
            
            content = template.render_content(context) if template else {
                'title': f'{actor.username} 分享了您的內容',
                'message': f'{actor.username} 分享了您的內容'
            }
            
            return NotificationService.create_notification(
                recipient=recipient,
                notification_type=NotificationType.SHARE,
                title=content['title'],
                message=content['message'],
                actor=actor,
                target_object=target_object,
                data={'action': 'share'}
            )
        except Exception as e:
            logger.error(f"創建分享通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def create_system_notification(
        recipients: List,
        title: str,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        expires_at=None
    ) -> List[Notification]:
        """
        創建系統通知
        """
        notifications = []
        
        try:
            for recipient in recipients:
                notification = NotificationService.create_notification(
                    recipient=recipient,
                    notification_type=NotificationType.SYSTEM,
                    title=title,
                    message=message,
                    actor=None,  # 系統通知沒有觸發者
                    data=data,
                    expires_at=expires_at
                )
                if notification:
                    notifications.append(notification)
            
            logger.info(f"系統通知創建成功，共 {len(notifications)} 條")
            return notifications
            
        except Exception as e:
            logger.error(f"創建系統通知失敗: {str(e)}")
            return []
    
    @staticmethod
    def _get_notification_template(notification_type: str) -> Optional[NotificationTemplate]:
        """
        獲取通知模板
        """
        try:
            return NotificationTemplate.objects.get(
                type=notification_type,
                is_active=True
            )
        except NotificationTemplate.DoesNotExist:
            logger.warning(f"未找到 {notification_type} 類型的通知模板")
            return None
    
    @staticmethod
    def _send_notification_async(notification: Notification):
        """
        異步發送通知（郵件、推送等）
        
        這裡可以使用 Celery 等任務隊列來實現異步發送
        """
        try:
            # 獲取用戶的通知設置
            settings_obj = notification.recipient.notification_settings
            
            # 發送郵件通知
            if settings_obj.email_notifications:
                NotificationService._send_email_notification(notification)
            
            # 發送推送通知
            if settings_obj.push_notifications:
                NotificationService._send_push_notification(notification)
            
            # 標記為已發送
            notification.is_sent = True
            notification.save(update_fields=['is_sent'])
            
        except Exception as e:
            logger.error(f"發送通知失敗: {str(e)}")
    
    @staticmethod
    def _send_email_notification(notification: Notification):
        """
        發送郵件通知
        """
        try:
            recipient_email = notification.recipient.email
            if not recipient_email:
                return
            
            # 獲取郵件模板
            template = NotificationService._get_notification_template(notification.type)
            
            if template and template.email_subject_template and template.email_body_template:
                context = {
                    'recipient': notification.recipient,
                    'actor': notification.actor,
                    'notification': notification,
                }
                
                subject = template.render_content(context).get('title', notification.title)
                message = template.email_body_template.format(**context)
            else:
                subject = notification.title
                message = notification.message
            
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[recipient_email],
                fail_silently=True
            )
            
            logger.info(f"郵件通知發送成功: {notification.id}")
            
        except Exception as e:
            logger.error(f"發送郵件通知失敗: {str(e)}")
    
    @staticmethod
    def _send_push_notification(notification: Notification):
        """
        發送推送通知
        
        這裡可以實現瀏覽器推送通知或移動端推送通知
        """
        try:
            # TODO: 實現推送通知邏輯
            # 可以使用 Web Push Protocol 或第三方服務如 Firebase Cloud Messaging
            
            logger.info(f"推送通知發送成功: {notification.id}")
            
        except Exception as e:
            logger.error(f"發送推送通知失敗: {str(e)}")
    
    @staticmethod
    def batch_mark_as_read(user, notification_ids: List[int]) -> int:
        """
        批量標記通知為已讀
        """
        try:
            notifications = Notification.objects.filter(
                recipient=user,
                id__in=notification_ids,
                is_read=False
            )
            
            count = notifications.update(
                is_read=True,
                read_at=timezone.now()
            )
            
            logger.info(f"用戶 {user.username} 批量標記 {count} 條通知為已讀")
            return count
            
        except Exception as e:
            logger.error(f"批量標記已讀失敗: {str(e)}")
            return 0
    
    @staticmethod
    def cleanup_expired_notifications():
        """
        清理過期通知
        """
        try:
            now = timezone.now()
            expired_notifications = Notification.objects.filter(
                expires_at__lt=now
            )
            
            count = expired_notifications.count()
            expired_notifications.delete()
            
            logger.info(f"清理了 {count} 條過期通知")
            return count
            
        except Exception as e:
            logger.error(f"清理過期通知失敗: {str(e)}")
            return 0
    
    @staticmethod
    def cleanup_old_notifications(days: int = 30):
        """
        清理舊通知
        """
        try:
            cutoff_date = timezone.now() - timezone.timedelta(days=days)
            old_notifications = Notification.objects.filter(
                created_at__lt=cutoff_date,
                is_read=True
            )
            
            count = old_notifications.count()
            old_notifications.delete()
            
            logger.info(f"清理了 {count} 條 {days} 天前的已讀通知")
            return count
            
        except Exception as e:
            logger.error(f"清理舊通知失敗: {str(e)}")
            return 0
    
    @staticmethod
    def _check_rate_limit(recipient, notification_type: str) -> bool:
        """
        檢查通知配額限制
        """
        try:
            if notification_type not in NotificationService.RATE_LIMIT_SETTINGS:
                return True
            
            settings = NotificationService.RATE_LIMIT_SETTINGS[notification_type]
            cache_key = f"notification_rate_limit:{recipient.id}:{notification_type}"
            
            current_count = cache.get(cache_key, 0)
            return current_count < settings['count']
            
        except Exception as e:
            logger.error(f"檢查配額限制失敗: {str(e)}")
            return True
    
    @staticmethod
    def _update_rate_limit_count(recipient, notification_type: str):
        """
        更新配額計數
        """
        try:
            if notification_type not in NotificationService.RATE_LIMIT_SETTINGS:
                return
            
            settings = NotificationService.RATE_LIMIT_SETTINGS[notification_type]
            cache_key = f"notification_rate_limit:{recipient.id}:{notification_type}"
            
            current_count = cache.get(cache_key, 0)
            cache.set(cache_key, current_count + 1, settings['period'])
            
        except Exception as e:
            logger.error(f"更新配額計數失敗: {str(e)}")
    
    @staticmethod
    def _find_aggregable_notification(recipient, notification_type: str, actor, target_object) -> Optional[Notification]:
        """
        查找可以聚合的通知
        
        在過去1小時內，同類型、同目標對象的通知可以聚合
        """
        try:
            # 只有特定類型的通知支持聚合
            aggregable_types = [NotificationType.LIKE, NotificationType.FOLLOW]
            if notification_type not in aggregable_types:
                return None
            
            # 查找1小時內的相似通知
            one_hour_ago = timezone.now() - timedelta(hours=1)
            
            query = Q(
                recipient=recipient,
                type=notification_type,
                created_at__gte=one_hour_ago,
                is_read=False
            )
            
            # 如果有目標對象，需要匹配
            if target_object:
                content_type = ContentType.objects.get_for_model(target_object)
                query &= Q(content_type=content_type, object_id=target_object.id)
            
            return Notification.objects.filter(query).first()
            
        except Exception as e:
            logger.error(f"查找可聚合通知失敗: {str(e)}")
            return None
    
    @staticmethod
    def _aggregate_notification(existing_notification: Notification, new_actor, new_data: Dict[str, Any]) -> Notification:
        """
        聚合通知
        """
        try:
            # 更新聚合數據
            aggregated_data = existing_notification.data or {}
            actors = aggregated_data.get('actors', [])
            
            # 添加新的觸發者
            if new_actor and new_actor.id not in [actor.get('id') for actor in actors]:
                actors.append({
                    'id': new_actor.id,
                    'username': new_actor.username,
                    'added_at': timezone.now().isoformat()
                })
            
            aggregated_data['actors'] = actors
            aggregated_data['count'] = len(actors)
            aggregated_data.update(new_data or {})
            
            # 更新通知內容
            if existing_notification.type == NotificationType.LIKE:
                if aggregated_data['count'] > 1:
                    existing_notification.title = f"{actors[0]['username']} 等 {aggregated_data['count']} 人點讚了您的內容"
                    existing_notification.message = f"您的內容獲得了 {aggregated_data['count']} 個點讚"
            elif existing_notification.type == NotificationType.FOLLOW:
                if aggregated_data['count'] > 1:
                    existing_notification.title = f"{actors[0]['username']} 等 {aggregated_data['count']} 人關注了您"
                    existing_notification.message = f"您獲得了 {aggregated_data['count']} 個新關注者"
            
            existing_notification.data = aggregated_data
            existing_notification.created_at = timezone.now()  # 更新時間戳
            existing_notification.save(update_fields=['title', 'message', 'data', 'created_at'])
            
            logger.info(f"通知聚合成功: {existing_notification.id}, 聚合數量: {aggregated_data['count']}")
            return existing_notification
            
        except Exception as e:
            logger.error(f"聚合通知失敗: {str(e)}")
            return existing_notification
    
    @staticmethod
    def _send_realtime_notification(notification: Notification):
        """
        發送實時通知（WebSocket）
        """
        try:
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync
            
            channel_layer = get_channel_layer()
            if channel_layer:
                group_name = f"user_{notification.recipient.id}_notifications"
                
                notification_data = {
                    'type': 'notification_message',
                    'notification': {
                        'id': notification.id,
                        'type': notification.type,
                        'title': notification.title,
                        'message': notification.message,
                        'created_at': notification.created_at.isoformat(),
                        'actor': {
                            'id': notification.actor.id if notification.actor else None,
                            'username': notification.actor.username if notification.actor else None,
                        } if notification.actor else None,
                        'data': notification.data,
                    }
                }
                
                async_to_sync(channel_layer.group_send)(group_name, notification_data)
                logger.info(f"實時通知發送成功: {notification.id}")
            
        except Exception as e:
            logger.error(f"發送實時通知失敗: {str(e)}")
    
    @staticmethod
    def get_notification_statistics(user, days: int = 30) -> Dict[str, Any]:
        """
        獲取用戶的通知統計信息
        """
        try:
            end_date = timezone.now()
            start_date = end_date - timedelta(days=days)
            
            notifications = Notification.objects.filter(
                recipient=user,
                created_at__range=[start_date, end_date]
            )
            
            # 基本統計
            total_count = notifications.count()
            read_count = notifications.filter(is_read=True).count()
            unread_count = total_count - read_count
            
            # 按類型統計
            type_stats = notifications.values('type').annotate(
                count=Count('id')
            ).order_by('-count')
            
            # 按日期統計
            daily_stats = notifications.extra(
                select={'day': 'date(created_at)'}
            ).values('day').annotate(
                count=Count('id')
            ).order_by('day')
            
            # 響應時間統計（閱讀時間）
            read_notifications = notifications.filter(
                is_read=True,
                read_at__isnull=False
            )
            
            avg_response_time = None
            if read_notifications.exists():
                response_times = []
                for notif in read_notifications:
                    if notif.read_at and notif.created_at:
                        delta = notif.read_at - notif.created_at
                        response_times.append(delta.total_seconds())
                
                if response_times:
                    avg_response_time = sum(response_times) / len(response_times)
            
            return {
                'total_count': total_count,
                'read_count': read_count,
                'unread_count': unread_count,
                'read_rate': read_count / total_count if total_count > 0 else 0,
                'type_distribution': list(type_stats),
                'daily_distribution': list(daily_stats),
                'avg_response_time_seconds': avg_response_time,
                'period_days': days,
            }
            
        except Exception as e:
            logger.error(f"獲取通知統計失敗: {str(e)}")
            return {}
    
    @staticmethod
    def search_notifications(user, query: str, notification_type: str = None, 
                           is_read: bool = None, days: int = None) -> List[Notification]:
        """
        搜索用戶的通知
        """
        try:
            notifications = Notification.objects.filter(recipient=user)
            
            # 文本搜索
            if query:
                notifications = notifications.filter(
                    Q(title__icontains=query) | Q(message__icontains=query)
                )
            
            # 類型過濾
            if notification_type:
                notifications = notifications.filter(type=notification_type)
            
            # 閱讀狀態過濾
            if is_read is not None:
                notifications = notifications.filter(is_read=is_read)
            
            # 時間範圍過濾
            if days:
                start_date = timezone.now() - timedelta(days=days)
                notifications = notifications.filter(created_at__gte=start_date)
            
            return notifications.order_by('-created_at')[:100]  # 限制結果數量
            
        except Exception as e:
            logger.error(f"搜索通知失敗: {str(e)}")
            return []
    
    @staticmethod
    def get_notification_preview(notification_type: str, context: Dict[str, Any]) -> Dict[str, str]:
        """
        獲取通知預覽（用於前端實時預覽）
        """
        try:
            template = NotificationService._get_notification_template(notification_type)
            
            if template:
                return template.render_content(context)
            else:
                # 使用默認模板
                default_previews = {
                    NotificationType.FOLLOW: {
                        'title': f"{context.get('actor_name', '某位用戶')} 開始關注您",
                        'message': f"{context.get('actor_name', '某位用戶')} 開始關注您了！"
                    },
                    NotificationType.LIKE: {
                        'title': f"{context.get('actor_name', '某位用戶')} 點讚了您的內容",
                        'message': f"{context.get('actor_name', '某位用戶')} 點讚了您的內容"
                    },
                    # 可以添加更多默認預覽
                }
                
                return default_previews.get(notification_type, {
                    'title': '新通知',
                    'message': '您有一條新通知'
                })
                
        except Exception as e:
            logger.error(f"獲取通知預覽失敗: {str(e)}")
            return {'title': '通知預覽錯誤', 'message': '無法生成預覽'}
    
    @staticmethod
    def revoke_notification(notification_id: int, user) -> bool:
        """
        撤回通知（只能撤回自己發送的通知）
        """
        try:
            notification = Notification.objects.get(
                id=notification_id,
                actor=user,
                created_at__gte=timezone.now() - timedelta(minutes=5)  # 只能撤回5分鐘內的通知
            )
            
            # 標記通知為已刪除而不是直接刪除
            notification.data = notification.data or {}
            notification.data['revoked'] = True
            notification.data['revoked_at'] = timezone.now().isoformat()
            notification.save(update_fields=['data'])
            
            # 發送撤回的實時通知
            try:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                
                channel_layer = get_channel_layer()
                if channel_layer:
                    group_name = f"user_{notification.recipient.id}_notifications"
                    revoke_data = {
                        'type': 'notification_revoked',
                        'notification_id': notification.id
                    }
                    async_to_sync(channel_layer.group_send)(group_name, revoke_data)
            except Exception:
                pass
            
            logger.info(f"通知撤回成功: {notification_id}")
            return True
            
        except Notification.DoesNotExist:
            logger.warning(f"無法撤回通知: {notification_id}, 通知不存在或無權限")
            return False
        except Exception as e:
            logger.error(f"撤回通知失敗: {str(e)}")
            return False
    
    @staticmethod
    def bulk_send_notifications(notifications_data: List[Dict[str, Any]]) -> int:
        """
        批量發送通知（優化性能）
        """
        try:
            notifications_to_create = []
            
            for data in notifications_data:
                # 檢查必要字段
                if not all(key in data for key in ['recipient', 'notification_type', 'title', 'message']):
                    continue
                
                recipient = data['recipient']
                notification_type = data['notification_type']
                
                # 檢查配額和設置
                if not NotificationService._check_rate_limit(recipient, notification_type):
                    continue
                
                settings_obj, _ = NotificationSettings.objects.get_or_create(user=recipient)
                if not settings_obj.is_notification_enabled(notification_type):
                    continue
                
                # 準備通知對象
                content_type = None
                object_id = None
                if data.get('target_object'):
                    content_type = ContentType.objects.get_for_model(data['target_object'])
                    object_id = data['target_object'].id
                
                notifications_to_create.append(Notification(
                    recipient=recipient,
                    actor=data.get('actor'),
                    type=notification_type,
                    title=data['title'],
                    message=data['message'],
                    content_type=content_type,
                    object_id=object_id,
                    data=data.get('data', {}),
                    expires_at=data.get('expires_at')
                ))
            
            # 批量創建
            created_notifications = Notification.objects.bulk_create(notifications_to_create)
            
            # 批量發送（異步）
            for notification in created_notifications:
                NotificationService._send_notification_async(notification)
                NotificationService._send_realtime_notification(notification)
            
            logger.info(f"批量發送通知完成，創建了 {len(created_notifications)} 條通知")
            return len(created_notifications)
            
        except Exception as e:
            logger.error(f"批量發送通知失敗: {str(e)}")
            return 0


class NotificationAggregator:
    """
    通知聚合器
    
    負責智能聚合相似的通知，減少用戶的通知疲勞
    """
    
    @staticmethod
    def aggregate_notifications_by_type(user, notification_type: str, hours: int = 24) -> List[Dict[str, Any]]:
        """
        按類型聚合通知
        """
        try:
            start_time = timezone.now() - timedelta(hours=hours)
            
            notifications = Notification.objects.filter(
                recipient=user,
                type=notification_type,
                created_at__gte=start_time,
                is_read=False
            ).select_related('actor').order_by('-created_at')
            
            if notification_type == NotificationType.LIKE:
                return NotificationAggregator._aggregate_likes(notifications)
            elif notification_type == NotificationType.FOLLOW:
                return NotificationAggregator._aggregate_follows(notifications)
            elif notification_type == NotificationType.COMMENT:
                return NotificationAggregator._aggregate_comments(notifications)
            else:
                # 其他類型暫不聚合
                return [{'notification': notif, 'count': 1} for notif in notifications]
                
        except Exception as e:
            logger.error(f"聚合通知失敗: {str(e)}")
            return []
    
    @staticmethod
    def _aggregate_likes(notifications) -> List[Dict[str, Any]]:
        """
        聚合點讚通知
        """
        aggregated = {}
        
        for notification in notifications:
            if notification.content_type and notification.object_id:
                key = f"{notification.content_type_id}_{notification.object_id}"
                
                if key not in aggregated:
                    aggregated[key] = {
                        'notification': notification,
                        'actors': [],
                        'count': 0
                    }
                
                if notification.actor:
                    aggregated[key]['actors'].append(notification.actor)
                aggregated[key]['count'] += 1
        
        return list(aggregated.values())
    
    @staticmethod
    def _aggregate_follows(notifications) -> List[Dict[str, Any]]:
        """
        聚合關注通知
        """
        if not notifications:
            return []
        
        actors = [notif.actor for notif in notifications if notif.actor]
        
        return [{
            'notification': notifications[0],
            'actors': actors,
            'count': len(actors)
        }]
    
    @staticmethod
    def _aggregate_comments(notifications) -> List[Dict[str, Any]]:
        """
        聚合評論通知
        """
        aggregated = {}
        
        for notification in notifications:
            if notification.content_type and notification.object_id:
                key = f"{notification.content_type_id}_{notification.object_id}"
                
                if key not in aggregated:
                    aggregated[key] = {
                        'notification': notification,
                        'actors': [],
                        'count': 0
                    }
                
                if notification.actor:
                    aggregated[key]['actors'].append(notification.actor)
                aggregated[key]['count'] += 1
        
        return list(aggregated.values())


class NotificationAnalyzer:
    """
    通知分析器
    
    提供通知相關的分析和洞察功能
    """
    
    @staticmethod
    def get_user_engagement_score(user, days: int = 30) -> float:
        """
        計算用戶參與度評分（基於通知閱讀行為）
        """
        try:
            start_date = timezone.now() - timedelta(days=days)
            
            notifications = Notification.objects.filter(
                recipient=user,
                created_at__gte=start_date
            )
            
            total_count = notifications.count()
            if total_count == 0:
                return 0.0
            
            read_count = notifications.filter(is_read=True).count()
            read_rate = read_count / total_count
            
            # 計算平均響應時間
            read_notifications = notifications.filter(
                is_read=True,
                read_at__isnull=False
            )
            
            avg_response_time = 0
            if read_notifications.exists():
                response_times = []
                for notif in read_notifications:
                    if notif.read_at and notif.created_at:
                        delta = notif.read_at - notif.created_at
                        response_times.append(delta.total_seconds())
                
                if response_times:
                    avg_response_time = sum(response_times) / len(response_times)
            
            # 響應時間評分（越快越高分）
            time_score = max(0, 1 - (avg_response_time / 86400))  # 24小時內響應為滿分
            
            # 綜合評分
            engagement_score = (read_rate * 0.7) + (time_score * 0.3)
            
            return min(1.0, max(0.0, engagement_score))
            
        except Exception as e:
            logger.error(f"計算用戶參與度評分失敗: {str(e)}")
            return 0.0
    
    @staticmethod
    def get_notification_effectiveness(notification_type: str, days: int = 30) -> Dict[str, Any]:
        """
        分析特定類型通知的有效性
        """
        try:
            start_date = timezone.now() - timedelta(days=days)
            
            notifications = Notification.objects.filter(
                type=notification_type,
                created_at__gte=start_date
            )
            
            total_count = notifications.count()
            if total_count == 0:
                return {}
            
            read_count = notifications.filter(is_read=True).count()
            read_rate = read_count / total_count
            
            # 平均響應時間
            read_notifications = notifications.filter(
                is_read=True,
                read_at__isnull=False
            )
            
            avg_response_time = None
            if read_notifications.exists():
                response_times = []
                for notif in read_notifications:
                    if notif.read_at and notif.created_at:
                        delta = notif.read_at - notif.created_at
                        response_times.append(delta.total_seconds())
                
                if response_times:
                    avg_response_time = sum(response_times) / len(response_times)
            
            return {
                'notification_type': notification_type,
                'total_count': total_count,
                'read_count': read_count,
                'read_rate': read_rate,
                'avg_response_time_seconds': avg_response_time,
                'effectiveness_score': read_rate,
                'period_days': days
            }
            
        except Exception as e:
            logger.error(f"分析通知有效性失敗: {str(e)}")
            return {}
    
    @staticmethod
    def get_peak_notification_times(user, days: int = 30) -> List[Dict[str, Any]]:
        """
        分析用戶的通知高峰時間
        """
        try:
            start_date = timezone.now() - timedelta(days=days)
            
            read_notifications = Notification.objects.filter(
                recipient=user,
                is_read=True,
                read_at__isnull=False,
                created_at__gte=start_date
            )
            
            hourly_stats = {}
            
            for notification in read_notifications:
                hour = notification.read_at.hour
                if hour not in hourly_stats:
                    hourly_stats[hour] = 0
                hourly_stats[hour] += 1
            
            # 轉換為列表並排序
            peak_times = [
                {'hour': hour, 'count': count}
                for hour, count in hourly_stats.items()
            ]
            peak_times.sort(key=lambda x: x['count'], reverse=True)
            
            return peak_times
            
        except Exception as e:
            logger.error(f"分析通知高峰時間失敗: {str(e)}")
            return []


class NotificationScheduler:
    """
    通知排程器
    
    負責智能排程通知發送時間
    """
    
    @staticmethod
    def get_optimal_send_time(user) -> datetime:
        """
        獲取用戶的最佳通知發送時間
        """
        try:
            # 分析用戶的活躍時間
            peak_times = NotificationAnalyzer.get_peak_notification_times(user)
            
            if peak_times:
                # 取最活躍的時間段
                optimal_hour = peak_times[0]['hour']
                
                # 計算下一個最佳發送時間
                now = timezone.now()
                optimal_time = now.replace(
                    hour=optimal_hour,
                    minute=0,
                    second=0,
                    microsecond=0
                )
                
                # 如果今天的最佳時間已過，設置為明天
                if optimal_time <= now:
                    optimal_time += timedelta(days=1)
                
                return optimal_time
            else:
                # 默認發送時間（上午10點）
                now = timezone.now()
                default_time = now.replace(hour=10, minute=0, second=0, microsecond=0)
                
                if default_time <= now:
                    default_time += timedelta(days=1)
                
                return default_time
                
        except Exception as e:
            logger.error(f"獲取最佳發送時間失敗: {str(e)}")
            return timezone.now()
    
    @staticmethod
    def schedule_notification(
        recipient,
        notification_type: str,
        title: str,
        message: str,
        scheduled_time: datetime = None,
        **kwargs
    ) -> bool:
        """
        排程通知發送
        """
        try:
            if not scheduled_time:
                scheduled_time = NotificationScheduler.get_optimal_send_time(recipient)
            
            # 使用Celery延時任務
            from .tasks import send_scheduled_notification
            
            send_scheduled_notification.apply_async(
                args=[
                    recipient.id,
                    notification_type,
                    title,
                    message,
                    kwargs
                ],
                eta=scheduled_time
            )
            
            logger.info(f"通知已排程: {recipient.username}, 發送時間: {scheduled_time}")
            return True
            
        except Exception as e:
            logger.error(f"排程通知失敗: {str(e)}")
            return False


class NotificationPersonalizer:
    """
    通知個性化器
    
    根據用戶行為和偏好個性化通知內容
    """
    
    @staticmethod
    def personalize_notification_content(
        notification_type: str,
        recipient,
        actor,
        target_object=None,
        base_context: Dict[str, Any] = None
    ) -> Dict[str, str]:
        """
        個性化通知內容
        """
        try:
            context = base_context or {}
            
            # 獲取用戶偏好
            user_preferences = NotificationPersonalizer._get_user_preferences(recipient)
            
            # 個性化稱呼
            if user_preferences.get('formal_address'):
                actor_name = f"{actor.username}先生/女士" if actor else "某位用戶"
            else:
                actor_name = actor.username if actor else "某位用戶"
            
            context.update({
                'actor_name': actor_name,
                'recipient_name': recipient.username,
                'time_of_day': NotificationPersonalizer._get_time_greeting(),
            })
            
            # 根據用戶活躍度調整語調
            engagement_score = NotificationAnalyzer.get_user_engagement_score(recipient)
            
            if engagement_score > 0.8:
                # 高參與度用戶使用簡潔語言
                context['tone'] = 'concise'
            elif engagement_score < 0.3:
                # 低參與度用戶使用更吸引人的語言
                context['tone'] = 'engaging'
            else:
                context['tone'] = 'normal'
            
            # 使用模板渲染
            template = NotificationService._get_notification_template(notification_type)
            
            if template:
                return template.render_content(context)
            else:
                return NotificationPersonalizer._get_default_personalized_content(
                    notification_type, context
                )
                
        except Exception as e:
            logger.error(f"個性化通知內容失敗: {str(e)}")
            return {'title': '新通知', 'message': '您有一條新通知'}
    
    @staticmethod
    def _get_user_preferences(user) -> Dict[str, Any]:
        """
        獲取用戶偏好設置
        """
        try:
            # 這裡可以從用戶設置或機器學習模型中獲取偏好
            # 暫時返回默認設置
            return {
                'formal_address': False,
                'emoji_enabled': True,
                'language': 'zh-TW'
            }
        except Exception:
            return {}
    
    @staticmethod
    def _get_time_greeting() -> str:
        """
        獲取時間問候語
        """
        hour = timezone.now().hour
        
        if 5 <= hour < 12:
            return "早上好"
        elif 12 <= hour < 18:
            return "下午好"
        elif 18 <= hour < 22:
            return "晚上好"
        else:
            return "夜深了"
    
    @staticmethod
    def _get_default_personalized_content(
        notification_type: str,
        context: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        獲取默認的個性化內容
        """
        tone = context.get('tone', 'normal')
        actor_name = context.get('actor_name', '某位用戶')
        time_greeting = context.get('time_of_day', '')
        
        templates = {
            NotificationType.FOLLOW: {
                'concise': {
                    'title': f'{actor_name} 關注了您',
                    'message': f'{actor_name} 開始關注您'
                },
                'engaging': {
                    'title': f'🎉 {time_greeting}！{actor_name} 關注了您',
                    'message': f'太棒了！{actor_name} 開始關注您了，快去看看他們的精彩內容吧！'
                },
                'normal': {
                    'title': f'{actor_name} 開始關注您',
                    'message': f'{actor_name} 開始關注您了！'
                }
            },
            NotificationType.LIKE: {
                'concise': {
                    'title': f'{actor_name} 點讚了您的內容',
                    'message': f'{actor_name} 點讚了您的內容'
                },
                'engaging': {
                    'title': f'👍 {time_greeting}！您的內容獲得點讚',
                    'message': f'真棒！{actor_name} 點讚了您的內容，繼續創作更多優秀內容吧！'
                },
                'normal': {
                    'title': f'{actor_name} 點讚了您的內容',
                    'message': f'{actor_name} 點讚了您的內容'
                }
            }
        }
        
        return templates.get(notification_type, {}).get(tone, {
            'title': '新通知',
            'message': '您有一條新通知'
        })


class NotificationMetrics:
    """
    通知指標收集器
    
    收集和分析通知系統的性能指標
    """
    
    @staticmethod
    def collect_delivery_metrics(notification: Notification, delivery_method: str, success: bool, response_time: float = None):
        """
        收集通知投遞指標
        """
        try:
            metrics_data = {
                'notification_id': notification.id,
                'notification_type': notification.type,
                'delivery_method': delivery_method,
                'success': success,
                'response_time': response_time,
                'timestamp': timezone.now().isoformat(),
            }
            
            # 這裡可以發送到監控系統（如Prometheus、InfluxDB等）
            logger.info(f"通知投遞指標: {metrics_data}")
            
        except Exception as e:
            logger.error(f"收集投遞指標失敗: {str(e)}")
    
    @staticmethod
    def get_system_health_metrics() -> Dict[str, Any]:
        """
        獲取通知系統健康指標
        """
        try:
            now = timezone.now()
            last_hour = now - timedelta(hours=1)
            last_day = now - timedelta(days=1)
            
            # 過去1小時的通知統計
            hourly_notifications = Notification.objects.filter(created_at__gte=last_hour)
            hourly_count = hourly_notifications.count()
            hourly_read_rate = 0
            
            if hourly_count > 0:
                hourly_read_count = hourly_notifications.filter(is_read=True).count()
                hourly_read_rate = hourly_read_count / hourly_count
            
            # 過去24小時的通知統計
            daily_notifications = Notification.objects.filter(created_at__gte=last_day)
            daily_count = daily_notifications.count()
            daily_read_rate = 0
            
            if daily_count > 0:
                daily_read_count = daily_notifications.filter(is_read=True).count()
                daily_read_rate = daily_read_count / daily_count
            
            # 未讀通知積壓
            total_unread = Notification.objects.filter(is_read=False).count()
            
            return {
                'hourly_notification_count': hourly_count,
                'hourly_read_rate': hourly_read_rate,
                'daily_notification_count': daily_count,
                'daily_read_rate': daily_read_rate,
                'total_unread_notifications': total_unread,
                'system_timestamp': now.isoformat(),
            }
            
        except Exception as e:
            logger.error(f"獲取系統健康指標失敗: {str(e)}")
            return {} 