"""
EngineerHub - 用戶相關信號處理器

自動為新用戶創建必要的關聯記錄
"""

import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from .models import UserSettings

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.accounts')

User = get_user_model()


@receiver(post_save, sender=User)
def create_user_settings(sender, instance, created, **kwargs):
    """
    為新用戶創建默認設置記錄
    
    Args:
        sender: 發送信號的模型類 (User)
        instance: 用戶實例
        created: 是否為新創建的用戶
        **kwargs: 額外參數
    """
    if created:
        try:
            # 為新用戶創建默認的用戶設置
            UserSettings.objects.create(user=instance)
            logger.info(f"為新用戶 {instance.username} 創建了默認設置")
        except Exception as e:
            logger.error(f"創建用戶設置失敗: {instance.username} - {str(e)}") 