import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger('engineerhub.notifications')


class Command(BaseCommand):
    """
    通知系統管理命令
    
    提供通知系統的各種管理功能
    """
    
    help = '通知系統管理工具'
    
    def add_arguments(self, parser):
        """
        添加命令參數
        """
        parser.add_argument(
            'action',
            choices=[
                'cleanup',
                'stats',
                'test_notification',
                'aggregate',
                'health_check',
                'user_engagement',
                'send_digest'
            ],
            help='要執行的操作'
        )
        
        parser.add_argument(
            '--user-id',
            type=int,
            help='用戶ID（用於特定用戶操作）'
        )
        
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='天數（用於統計和清理操作）'
        )
        
        parser.add_argument(
            '--notification-type',
            choices=['follow', 'like', 'comment', 'reply', 'mention', 'message', 'share', 'system'],
            help='通知類型'
        )
        
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='只顯示將要執行的操作，不實際執行'
        )
    
    def handle(self, *args, **options):
        """
        命令主處理函數
        """
        action = options['action']
        
        try:
            if action == 'cleanup':
                self.cleanup_notifications(options)
            elif action == 'stats':
                self.show_statistics(options)
            elif action == 'test_notification':
                self.test_notification(options)
            elif action == 'aggregate':
                self.aggregate_notifications(options)
            elif action == 'health_check':
                self.health_check()
            elif action == 'user_engagement':
                self.analyze_user_engagement(options)
            elif action == 'send_digest':
                self.send_digest(options)
            else:
                self.stdout.write(
                    self.style.ERROR(f'未知的操作: {action}')
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'執行操作失敗: {str(e)}')
            )
            logger.error(f'通知管理命令執行失敗: {str(e)}')
    
    def cleanup_notifications(self, options):
        """
        清理通知
        """
        from notifications.services import NotificationService
        
        days = options['days']
        dry_run = options['dry_run']
        
        self.stdout.write(f'開始清理 {days} 天前的通知...')
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - 只顯示操作，不實際執行')
            )
        
        # 清理過期通知
        if not dry_run:
            expired_count = NotificationService.cleanup_expired_notifications()
            self.stdout.write(
                self.style.SUCCESS(f'清理了 {expired_count} 條過期通知')
            )
        
        # 清理舊通知
        if not dry_run:
            old_count = NotificationService.cleanup_old_notifications(days)
            self.stdout.write(
                self.style.SUCCESS(f'清理了 {old_count} 條舊通知')
            )
        
        self.stdout.write(
            self.style.SUCCESS('通知清理完成')
        )
    
    def show_statistics(self, options):
        """
        顯示通知統計信息
        """
        from notifications.services import NotificationService, NotificationAnalyzer
        from notifications.models import Notification, NotificationType
        from django.contrib.auth import get_user_model
        
        days = options['days']
        user_id = options.get('user_id')
        notification_type = options.get('notification_type')
        
        self.stdout.write(f'=== 通知統計報告 (過去 {days} 天) ===')
        
        if user_id:
            # 特定用戶統計
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                stats = NotificationService.get_notification_statistics(user, days)
                engagement_score = NotificationAnalyzer.get_user_engagement_score(user, days)
                
                self.stdout.write(f'\n用戶: {user.username}')
                self.stdout.write(f'總通知數: {stats.get("total_count", 0)}')
                self.stdout.write(f'已讀通知: {stats.get("read_count", 0)}')
                self.stdout.write(f'未讀通知: {stats.get("unread_count", 0)}')
                self.stdout.write(f'閱讀率: {stats.get("read_rate", 0):.2%}')
                self.stdout.write(f'參與度評分: {engagement_score:.2f}')
                
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'用戶 ID {user_id} 不存在')
                )
                return
                
        elif notification_type:
            # 特定類型統計
            effectiveness = NotificationAnalyzer.get_notification_effectiveness(
                notification_type, days
            )
            
            self.stdout.write(f'\n通知類型: {notification_type}')
            self.stdout.write(f'總數: {effectiveness.get("total_count", 0)}')
            self.stdout.write(f'已讀數: {effectiveness.get("read_count", 0)}')
            self.stdout.write(f'閱讀率: {effectiveness.get("read_rate", 0):.2%}')
            self.stdout.write(f'有效性評分: {effectiveness.get("effectiveness_score", 0):.2f}')
            
        else:
            # 全局統計
            start_date = timezone.now() - timedelta(days=days)
            total_notifications = Notification.objects.filter(
                created_at__gte=start_date
            )
            
            total_count = total_notifications.count()
            read_count = total_notifications.filter(is_read=True).count()
            read_rate = read_count / total_count if total_count > 0 else 0
            
            self.stdout.write(f'\n全局統計:')
            self.stdout.write(f'總通知數: {total_count}')
            self.stdout.write(f'已讀通知: {read_count}')
            self.stdout.write(f'未讀通知: {total_count - read_count}')
            self.stdout.write(f'總體閱讀率: {read_rate:.2%}')
            
            # 按類型統計
            self.stdout.write(f'\n按類型統計:')
            for notification_type in NotificationType.choices:
                type_notifications = total_notifications.filter(type=notification_type[0])
                type_count = type_notifications.count()
                type_read_count = type_notifications.filter(is_read=True).count()
                type_read_rate = type_read_count / type_count if type_count > 0 else 0
                
                self.stdout.write(
                    f'  {notification_type[1]}: {type_count} 條 (閱讀率: {type_read_rate:.2%})'
                )
    
    def test_notification(self, options):
        """
        測試通知發送
        """
        from notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        
        user_id = options.get('user_id')
        notification_type = options.get('notification_type', 'system')
        
        if not user_id:
            self.stdout.write(
                self.style.ERROR('測試通知需要指定 --user-id')
            )
            return
        
        User = get_user_model()
        try:
            user = User.objects.get(id=user_id)
            
            notification = NotificationService.create_notification(
                recipient=user,
                notification_type=notification_type,
                title='測試通知',
                message=f'這是一條測試通知，發送時間: {timezone.now()}',
                data={'test': True}
            )
            
            if notification:
                self.stdout.write(
                    self.style.SUCCESS(f'測試通知發送成功，通知ID: {notification.id}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('測試通知發送失敗')
                )
                
        except User.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'用戶 ID {user_id} 不存在')
            )
    
    def aggregate_notifications(self, options):
        """
        聚合通知
        """
        from notifications.services import NotificationAggregator
        from notifications.models import NotificationType
        from django.contrib.auth import get_user_model
        
        user_id = options.get('user_id')
        notification_type = options.get('notification_type')
        hours = 24  # 聚合過去24小時的通知
        
        if user_id:
            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                
                if notification_type:
                    # 聚合特定類型
                    aggregations = NotificationAggregator.aggregate_notifications_by_type(
                        user, notification_type, hours
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'用戶 {user.username} 的 {notification_type} 通知聚合完成，'
                            f'聚合了 {len(aggregations)} 組通知'
                        )
                    )
                else:
                    # 聚合所有支持的類型
                    total_aggregations = 0
                    for ntype in [NotificationType.LIKE, NotificationType.FOLLOW]:
                        aggregations = NotificationAggregator.aggregate_notifications_by_type(
                            user, ntype, hours
                        )
                        total_aggregations += len(aggregations)
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'用戶 {user.username} 的通知聚合完成，'
                            f'聚合了 {total_aggregations} 組通知'
                        )
                    )
                    
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'用戶 ID {user_id} 不存在')
                )
        else:
            self.stdout.write(
                self.style.ERROR('聚合通知需要指定 --user-id')
            )
    
    def health_check(self):
        """
        健康檢查
        """
        from notifications.services import NotificationMetrics
        
        self.stdout.write('=== 通知系統健康檢查 ===')
        
        metrics = NotificationMetrics.get_system_health_metrics()
        
        self.stdout.write(f'過去1小時通知數: {metrics.get("hourly_notification_count", 0)}')
        self.stdout.write(f'過去1小時閱讀率: {metrics.get("hourly_read_rate", 0):.2%}')
        self.stdout.write(f'過去24小時通知數: {metrics.get("daily_notification_count", 0)}')
        self.stdout.write(f'過去24小時閱讀率: {metrics.get("daily_read_rate", 0):.2%}')
        self.stdout.write(f'未讀通知積壓: {metrics.get("total_unread_notifications", 0)}')
        
        # 健康評估
        hourly_read_rate = metrics.get("hourly_read_rate", 0)
        daily_read_rate = metrics.get("daily_read_rate", 0)
        unread_backlog = metrics.get("total_unread_notifications", 0)
        
        if daily_read_rate > 0.7 and unread_backlog < 1000:
            status = self.style.SUCCESS('健康')
        elif daily_read_rate > 0.5 and unread_backlog < 5000:
            status = self.style.WARNING('良好')
        else:
            status = self.style.ERROR('需要關注')
        
        self.stdout.write(f'系統狀態: {status}')
    
    def analyze_user_engagement(self, options):
        """
        分析用戶參與度
        """
        from notifications.services import NotificationAnalyzer
        from django.contrib.auth import get_user_model
        
        days = options['days']
        
        self.stdout.write(f'=== 用戶參與度分析 (過去 {days} 天) ===')
        
        User = get_user_model()
        active_users = User.objects.filter(
            is_active=True,
            last_login__gte=timezone.now() - timedelta(days=days)
        )
        
        engagement_scores = []
        low_engagement_users = []
        
        for user in active_users:
            score = NotificationAnalyzer.get_user_engagement_score(user, days)
            engagement_scores.append(score)
            
            if score < 0.3:
                low_engagement_users.append((user, score))
        
        if engagement_scores:
            avg_engagement = sum(engagement_scores) / len(engagement_scores)
            self.stdout.write(f'分析用戶數: {len(engagement_scores)}')
            self.stdout.write(f'平均參與度: {avg_engagement:.2f}')
            self.stdout.write(f'低參與度用戶數: {len(low_engagement_users)}')
            
            if low_engagement_users:
                self.stdout.write('\n低參與度用戶:')
                for user, score in low_engagement_users[:10]:  # 只顯示前10個
                    self.stdout.write(f'  {user.username}: {score:.2f}')
        else:
            self.stdout.write('沒有找到活躍用戶')
    
    def send_digest(self, options):
        """
        發送摘要通知
        """
        from notifications.tasks import send_personalized_digest
        
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING('DRY RUN - 只顯示操作，不實際執行')
            )
            return
        
        # 異步發送摘要
        task = send_personalized_digest.delay()
        
        self.stdout.write(
            self.style.SUCCESS(f'摘要通知發送任務已提交，任務ID: {task.id}')
        ) 