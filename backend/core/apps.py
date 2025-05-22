from django.apps import AppConfig


class CoreConfig(AppConfig):
    """
    核心模塊應用配置
    """
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core'
    verbose_name = '核心模塊' 