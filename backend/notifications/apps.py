from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """
    通知系統應用配置
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications'
    verbose_name = '通知系統'
    
    def ready(self):
        """
        應用準備就緒時導入信號
        """
        import notifications.signals 