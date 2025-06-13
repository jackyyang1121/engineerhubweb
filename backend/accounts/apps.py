"""
EngineerHub - Accounts 應用配置
"""

from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """
    Accounts 應用配置類
    
    功能：
    - 設置應用的默認字段類型
    - 加載信號處理器
    - 執行應用初始化邏輯
    """
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    verbose_name = '用戶管理'
    
    def ready(self):
        """
        應用準備完成時執行的邏輯
        
        注意：此方法會在 Django 啟動時自動調用
        用於導入信號處理器等需要在應用啟動時執行的代碼
        """
        try:
            # 導入信號處理器，確保它們被註冊
            import accounts.signals
        except ImportError:
            pass 