import logging
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.users')

class CustomUser(AbstractUser):
    """
    自定義用戶模型，擴展 Django 的內建用戶模型
    
    增加了手機號碼、頭像、用戶簡介和最後一次上線時間等欄位
    """
    email = models.EmailField(_('電子郵件'), unique=True)
    phone_number = models.CharField(_('手機號碼'), max_length=15, blank=True, null=True)
    avatar = models.ImageField(_('頭像'), upload_to='avatars/', blank=True, null=True)
    bio = models.TextField(_('自我介紹'), blank=True, null=True)
    skills = models.JSONField(_('技能標籤'), default=list, blank=True, null=True)
    last_online = models.DateTimeField(_('最後上線時間'), default=timezone.now)
    
    # 使用者相關狀態
    is_online = models.BooleanField(_('在線狀態'), default=False)
    notification_enabled = models.BooleanField(_('啟用通知'), default=True)
    
    class Meta:
        verbose_name = _('用戶')
        verbose_name_plural = _('用戶')
    
    def __str__(self):
        return self.username
    
    def save(self, *args, **kwargs):
        """
        重寫保存方法，添加日誌記錄
        """
        is_new = self.pk is None
        try:
            super().save(*args, **kwargs)
            if is_new:
                logger.info(f"新用戶創建成功: {self.username}")
            else:
                logger.info(f"用戶資料更新成功: {self.username}")
        except Exception as e:
            logger.error(f"用戶保存錯誤: {str(e)}")
            raise

class UserFollowing(models.Model):
    """
    用戶關注關係模型
    
    記錄哪些用戶關注了哪些用戶
    """
    user = models.ForeignKey(
        CustomUser, 
        related_name='following', 
        on_delete=models.CASCADE,
        verbose_name=_('關注者')
    )
    following_user = models.ForeignKey(
        CustomUser, 
        related_name='followers', 
        on_delete=models.CASCADE,
        verbose_name=_('被關注者')
    )
    created_at = models.DateTimeField(_('關注時間'), auto_now_add=True)
    
    class Meta:
        unique_together = ('user', 'following_user')
        verbose_name = _('用戶關注')
        verbose_name_plural = _('用戶關注')
    
    def __str__(self):
        return f"{self.user.username} 關注 {self.following_user.username}"
    
    def save(self, *args, **kwargs):
        """
        重寫保存方法，添加日誌記錄與防止自己關注自己
        """
        if self.user == self.following_user:
            logger.warning(f"用戶 {self.user.username} 嘗試關注自己")
            raise ValueError("用戶不能關注自己")
        
        try:
            super().save(*args, **kwargs)
            logger.info(f"用戶關注記錄創建: {self.user.username} -> {self.following_user.username}")
        except Exception as e:
            logger.error(f"用戶關注記錄創建錯誤: {str(e)}")
            raise 