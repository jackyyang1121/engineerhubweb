import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

from .models import Notification, NotificationSettings
from .services import NotificationService

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')


@shared_task(bind=True, retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_notification_email(self, notification_id):
    """
    異步發送郵件通知
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        NotificationService._send_email_notification(notification)
        logger.info(f"郵件通知發送成功: {notification_id}")
    except Notification.DoesNotExist:
        logger.error(f"通知不存在: {notification_id}")
    except Exception as e:
        logger.error(f"發送郵件通知失敗: {notification_id}, 錯誤: {str(e)}")
        raise self.retry(exc=e)


@shared_task(bind=True, retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_notification_push(self, notification_id):
    """
    異步發送推送通知
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        NotificationService._send_push_notification(notification)
        logger.info(f"推送通知發送成功: {notification_id}")
    except Notification.DoesNotExist:
        logger.error(f"通知不存在: {notification_id}")
    except Exception as e:
        logger.error(f"發送推送通知失敗: {notification_id}, 錯誤: {str(e)}")
        raise self.retry(exc=e)


@shared_task
def cleanup_expired_notifications():
    """
    定期清理過期通知
    """
    try:
        count = NotificationService.cleanup_expired_notifications()
        logger.info(f"定期清理過期通知完成，清理了 {count} 條通知")
        return count
    except Exception as e:
        logger.error(f"定期清理過期通知失敗: {str(e)}")
        return 0


@shared_task
def cleanup_old_read_notifications():
    """
    定期清理舊的已讀通知（保留30天）
    """
    try:
        count = NotificationService.cleanup_old_notifications(days=30)
        logger.info(f"定期清理舊通知完成，清理了 {count} 條通知")
        return count
    except Exception as e:
        logger.error(f"定期清理舊通知失敗: {str(e)}")
        return 0


@shared_task
def batch_create_system_notification(recipient_ids, title, message, data=None, expires_at=None):
    """
    批量創建系統通知
    """
    try:
        from users.models import CustomUser
        
        recipients = CustomUser.objects.filter(id__in=recipient_ids)
        notifications = NotificationService.create_system_notification(
            recipients=recipients,
            title=title,
            message=message,
            data=data,
            expires_at=expires_at
        )
        
        logger.info(f"批量創建系統通知完成，創建了 {len(notifications)} 條通知")
        return len(notifications)
        
    except Exception as e:
        logger.error(f"批量創建系統通知失敗: {str(e)}")
        return 0


@shared_task
def send_weekly_digest():
    """
    發送每週摘要通知
    """
    try:
        from users.models import CustomUser
        from posts.models import Post
        from comments.models import Comment
        
        # 獲取過去一週的活動數據
        week_ago = timezone.now() - timedelta(days=7)
        
        # 活躍用戶
        active_users = CustomUser.objects.filter(
            last_login__gte=week_ago
        ).count()
        
        # 新貼文
        new_posts = Post.objects.filter(
            created_at__gte=week_ago
        ).count()
        
        # 新評論
        new_comments = Comment.objects.filter(
            created_at__gte=week_ago
        ).count()
        
        # 給所有啟用週摘要的用戶發送通知
        users = CustomUser.objects.filter(
            notification_settings__system_notifications=True,
            is_active=True
        )
        
        title = "工程師聚集地週報"
        message = f"本週平台活動摘要：{active_users} 位工程師活躍，發布了 {new_posts} 篇貼文，產生了 {new_comments} 條評論。"
        
        notifications = NotificationService.create_system_notification(
            recipients=list(users),
            title=title,
            message=message,
            data={
                'type': 'weekly_digest',
                'active_users': active_users,
                'new_posts': new_posts,
                'new_comments': new_comments,
            }
        )
        
        logger.info(f"週摘要通知發送完成，發送了 {len(notifications)} 條通知")
        return len(notifications)
        
    except Exception as e:
        logger.error(f"發送週摘要通知失敗: {str(e)}")
        return 0


@shared_task
def process_delayed_notifications():
    """
    處理延遲發送的通知（勿擾時間結束後）
    """
    try:
        from django.db.models import Q
        
        # 獲取所有未發送的通知
        unsent_notifications = Notification.objects.filter(
            is_sent=False,
            created_at__lt=timezone.now() - timedelta(hours=1)  # 至少1小時前創建的
        ).select_related('recipient__notification_settings')
        
        processed_count = 0
        
        for notification in unsent_notifications:
            settings_obj = notification.recipient.notification_settings
            
            # 檢查是否仍在勿擾時間
            if not settings_obj.is_in_quiet_hours():
                # 發送通知
                if settings_obj.email_notifications:
                    send_notification_email.delay(notification.id)
                
                if settings_obj.push_notifications:
                    send_notification_push.delay(notification.id)
                
                # 標記為已發送
                notification.is_sent = True
                notification.save(update_fields=['is_sent'])
                processed_count += 1
        
        logger.info(f"處理延遲通知完成，處理了 {processed_count} 條通知")
        return processed_count
        
    except Exception as e:
        logger.error(f"處理延遲通知失敗: {str(e)}")
        return 0


@shared_task
def aggregate_similar_notifications():
    """
    聚合相似的通知（如多個點讚合併為一條）
    """
    try:
        # 查找同一天內相同類型、相同目標對象的通知
        today = timezone.now().date()
        tomorrow = today + timedelta(days=1)
        
        from django.db.models import Count
        
        # 查找重複的點讚通知
        like_notifications = Notification.objects.filter(
            type='like',
            created_at__date=today,
            is_read=False
        ).values(
            'recipient', 'content_type', 'object_id'
        ).annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        aggregated_count = 0
        
        for item in like_notifications:
            if item['count'] > 3:  # 超過3個相同通知才聚合
                # 獲取這些通知
                notifications = Notification.objects.filter(
                    recipient_id=item['recipient'],
                    content_type_id=item['content_type'],
                    object_id=item['object_id'],
                    type='like',
                    created_at__date=today,
                    is_read=False
                ).order_by('-created_at')
                
                if notifications.count() > 3:
                    # 保留最新的一條，修改其內容
                    latest = notifications.first()
                    actors = notifications.exclude(id=latest.id).values_list('actor__username', flat=True)
                    
                    if len(actors) > 0:
                        if len(actors) == 1:
                            latest.title = f"{actors[0]} 和 {latest.actor.username} 點讚了您的內容"
                        elif len(actors) == 2:
                            latest.title = f"{actors[0]}、{actors[1]} 和 {latest.actor.username} 點讚了您的內容"
                        else:
                            latest.title = f"{actors[0]} 等 {len(actors) + 1} 人點讚了您的內容"
                        
                        latest.data.update({
                            'aggregated': True,
                            'total_count': len(actors) + 1,
                            'actors': list(actors) + [latest.actor.username]
                        })
                        latest.save()
                        
                        # 刪除其他通知
                        notifications.exclude(id=latest.id).delete()
                        aggregated_count += 1
        
        logger.info(f"聚合相似通知完成，聚合了 {aggregated_count} 組通知")
        return aggregated_count
        
    except Exception as e:
        logger.error(f"聚合相似通知失敗: {str(e)}")
        return 0


@shared_task
def generate_notification_statistics():
    """
    生成通知統計報告
    """
    try:
        from django.db.models import Count, Avg
        from collections import defaultdict
        
        # 統計過去30天的數據
        thirty_days_ago = timezone.now() - timedelta(days=30)
        
        # 按類型統計
        type_stats = Notification.objects.filter(
            created_at__gte=thirty_days_ago
        ).values('type').annotate(
            total=Count('id'),
            unread=Count('id', filter={'is_read': False}),
        )
        
        # 按天統計
        daily_stats = defaultdict(int)
        notifications = Notification.objects.filter(
            created_at__gte=thirty_days_ago
        ).values('created_at__date').annotate(
            count=Count('id')
        )
        
        for stat in notifications:
            daily_stats[stat['created_at__date']] = stat['count']
        
        # 用戶參與度統計
        user_engagement = Notification.objects.filter(
            created_at__gte=thirty_days_ago,
            is_read=True
        ).values('recipient').annotate(
            read_count=Count('id')
        ).aggregate(
            avg_read=Avg('read_count')
        )
        
        stats = {
            'period': '30天',
            'type_stats': list(type_stats),
            'daily_stats': dict(daily_stats),
            'user_engagement': user_engagement,
            'generated_at': timezone.now().isoformat()
        }
        
        logger.info("通知統計報告生成完成")
        return stats
        
    except Exception as e:
        logger.error(f"生成通知統計報告失敗: {str(e)}")
        return {}


@shared_task
def send_scheduled_notification(user_id, notification_type, title, message, extra_data=None):
    """
    發送排程通知
    """
    try:
        from users.models import CustomUser
        from .services import NotificationService
        
        user = CustomUser.objects.get(id=user_id)
        
        NotificationService.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            data=extra_data or {}
        )
        
        logger.info(f"排程通知發送成功: 用戶 {user.username}, 類型 {notification_type}")
        return True
        
    except CustomUser.DoesNotExist:
        logger.error(f"排程通知發送失敗: 用戶 {user_id} 不存在")
        return False
    except Exception as e:
        logger.error(f"排程通知發送失敗: {str(e)}")
        return False


@shared_task
def generate_user_engagement_report():
    """
    生成用戶參與度報告
    """
    try:
        from users.models import CustomUser
        from .services import NotificationAnalyzer, NotificationService
        
        # 獲取活躍用戶
        active_users = CustomUser.objects.filter(
            is_active=True,
            last_login__gte=timezone.now() - timedelta(days=30)
        )
        
        low_engagement_users = []
        
        for user in active_users:
            engagement_score = NotificationAnalyzer.get_user_engagement_score(user)
            
            # 標記低參與度用戶
            if engagement_score < 0.3:
                low_engagement_users.append({
                    'user': user,
                    'score': engagement_score
                })
        
        # 向管理員發送報告
        if low_engagement_users:
            admin_users = CustomUser.objects.filter(is_staff=True)
            
            report_message = f"發現 {len(low_engagement_users)} 位用戶參與度較低，建議優化通知策略。"
            
            for admin in admin_users:
                NotificationService.create_notification(
                    recipient=admin,
                    notification_type='system',
                    title="用戶參與度報告",
                    message=report_message,
                    data={
                        'type': 'engagement_report',
                        'low_engagement_count': len(low_engagement_users),
                        'total_users': active_users.count()
                    }
                )
        
        logger.info(f"用戶參與度報告生成完成，發現 {len(low_engagement_users)} 位低參與度用戶")
        return len(low_engagement_users)
        
    except Exception as e:
        logger.error(f"生成用戶參與度報告失敗: {str(e)}")
        return 0


@shared_task
def optimize_notification_delivery():
    """
    優化通知投遞時間
    """
    try:
        from users.models import CustomUser
        from .services import NotificationScheduler, NotificationAnalyzer
        
        # 分析所有用戶的最佳通知時間
        users = CustomUser.objects.filter(is_active=True)
        optimization_data = {}
        
        for user in users:
            peak_times = NotificationAnalyzer.get_peak_notification_times(user)
            optimal_time = NotificationScheduler.get_optimal_send_time(user)
            
            optimization_data[user.id] = {
                'peak_times': peak_times,
                'optimal_hour': optimal_time.hour,
                'engagement_score': NotificationAnalyzer.get_user_engagement_score(user)
            }
        
        # 這裡可以將優化數據存儲到Redis或數據庫中
        # 供實時通知系統使用
        
        logger.info(f"通知投遞優化完成，處理了 {len(optimization_data)} 位用戶")
        return len(optimization_data)
        
    except Exception as e:
        logger.error(f"優化通知投遞失敗: {str(e)}")
        return 0


@shared_task
def aggregate_daily_notifications():
    """
    每日聚合相似通知
    """
    try:
        from users.models import CustomUser
        from .services import NotificationAggregator
        from .models import NotificationType
        
        aggregation_count = 0
        
        # 對所有活躍用戶進行通知聚合
        active_users = CustomUser.objects.filter(is_active=True)
        
        for user in active_users:
            # 聚合點讚通知
            like_aggregations = NotificationAggregator.aggregate_notifications_by_type(
                user, NotificationType.LIKE, hours=24
            )
            
            # 聚合關注通知
            follow_aggregations = NotificationAggregator.aggregate_notifications_by_type(
                user, NotificationType.FOLLOW, hours=24
            )
            
            aggregation_count += len(like_aggregations) + len(follow_aggregations)
        
        logger.info(f"每日通知聚合完成，處理了 {aggregation_count} 組聚合")
        return aggregation_count
        
    except Exception as e:
        logger.error(f"每日通知聚合失敗: {str(e)}")
        return 0


@shared_task
def send_personalized_digest():
    """
    發送個性化摘要通知
    """
    try:
        from users.models import CustomUser
        from .services import NotificationService, NotificationPersonalizer, NotificationAnalyzer
        
        # 獲取啟用摘要通知的用戶
        users = CustomUser.objects.filter(
            notification_settings__system_notifications=True,
            is_active=True
        )
        
        sent_count = 0
        
        for user in users:
            # 獲取用戶的未讀通知統計
            stats = NotificationService.get_notification_statistics(user, days=7)
            
            if stats.get('unread_count', 0) > 0:
                # 個性化摘要內容
                context = {
                    'recipient_name': user.username,
                    'unread_count': stats['unread_count'],
                    'engagement_score': NotificationAnalyzer.get_user_engagement_score(user)
                }
                
                personalized_content = NotificationPersonalizer.personalize_notification_content(
                    'system',
                    user,
                    None,  # 系統通知沒有actor
                    base_context=context
                )
                
                # 創建摘要通知
                NotificationService.create_notification(
                    recipient=user,
                    notification_type='system',
                    title=f"您有 {stats['unread_count']} 條未讀通知",
                    message=f"本週您收到了 {stats.get('total_count', 0)} 條通知，其中 {stats['unread_count']} 條尚未閱讀。",
                    data={
                        'type': 'digest',
                        'stats': stats,
                        'personalized': True
                    }
                )
                
                sent_count += 1
        
        logger.info(f"個性化摘要通知發送完成，發送了 {sent_count} 條通知")
        return sent_count
        
    except Exception as e:
        logger.error(f"發送個性化摘要失敗: {str(e)}")
        return 0


@shared_task
def collect_notification_metrics():
    """
    收集通知系統指標
    """
    try:
        from .services import NotificationMetrics
        
        # 收集系統健康指標
        health_metrics = NotificationMetrics.get_system_health_metrics()
        
        # 這裡可以將指標發送到監控系統
        # 例如：Prometheus、InfluxDB、CloudWatch等
        
        logger.info(f"通知系統指標收集完成: {health_metrics}")
        return health_metrics
        
    except Exception as e:
        logger.error(f"收集通知系統指標失敗: {str(e)}")
        return {}


@shared_task
def cleanup_revoked_notifications():
    """
    清理被撤回的通知
    """
    try:
        from .models import Notification
        
        # 查找被撤回超過24小時的通知
        cutoff_time = timezone.now() - timedelta(hours=24)
        
        revoked_notifications = Notification.objects.filter(
            data__revoked=True,
            created_at__lt=cutoff_time
        )
        
        count = revoked_notifications.count()
        revoked_notifications.delete()
        
        logger.info(f"清理撤回通知完成，清理了 {count} 條通知")
        return count
        
    except Exception as e:
        logger.error(f"清理撤回通知失敗: {str(e)}")
        return 0


@shared_task
def send_notification_batch(notifications_data):
    """
    批量發送通知（Celery任務版本）
    """
    try:
        from .services import NotificationService
        
        result = NotificationService.bulk_send_notifications(notifications_data)
        
        logger.info(f"批量通知發送完成，發送了 {result} 條通知")
        return result
        
    except Exception as e:
        logger.error(f"批量發送通知任務失敗: {str(e)}")
        return 0 