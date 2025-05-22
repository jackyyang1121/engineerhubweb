import logging
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from django.conf import settings

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')

class NotificationType(models.TextChoices):
    """
    通知類型枚舉
    """
    FOLLOW = 'follow', _('關注')
    LIKE = 'like', _('點讚')
    COMMENT = 'comment', _('評論')
    REPLY = 'reply', _('回覆')
    MENTION = 'mention', _('提及')
    MESSAGE = 'message', _('私信')
    SHARE = 'share', _('分享')
    SYSTEM = 'system', _('系統通知')


class Notification(models.Model):
    """
    通知模型
    
    處理平台內的所有通知類型，包括關注、點讚、評論、私信等
    """
    
    # 接收通知的用戶
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('接收者'),
        help_text="接收通知的用戶"
    )
    
    # 觸發通知的用戶
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_notifications',
        verbose_name=_('觸發者'),
        null=True,
        blank=True,
        help_text="觸發通知的用戶（系統通知可為空）"
    )
    
    # 通知類型
    type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        verbose_name=_('通知類型'),
        help_text="通知的類型分類"
    )
    
    # 通知標題
    title = models.CharField(
        max_length=200,
        verbose_name=_('通知標題'),
        help_text="通知的標題"
    )
    
    # 通知內容
    message = models.TextField(
        verbose_name=_('通知內容'),
        help_text="通知的詳細內容"
    )
    
    # 通用外鍵，用於關聯相關的對象（如貼文、評論等）
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_('內容類型')
    )
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name=_('對象ID')
    )
    target_object = GenericForeignKey('content_type', 'object_id')
    
    # 額外數據（JSON格式）
    data = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_('額外數據'),
        help_text="通知相關的額外數據"
    )
    
    # 通知狀態
    is_read = models.BooleanField(
        default=False,
        verbose_name=_('已讀狀態'),
        help_text="通知是否已被閱讀"
    )
    
    is_sent = models.BooleanField(
        default=False,
        verbose_name=_('已發送狀態'),
        help_text="通知是否已通過其他管道發送（如郵件、推送）"
    )
    
    # 時間戳
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_('創建時間')
    )
    
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('閱讀時間')
    )
    
    # 有效期（系統通知可設置過期時間）
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_('過期時間'),
        help_text="通知的過期時間，過期後自動清理"
    )
    
    class Meta:
        verbose_name = _('通知')
        verbose_name_plural = _('通知')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['type', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.recipient.username} - {self.get_type_display()}: {self.title}"
    
    def mark_as_read(self):
        """
        標記通知為已讀
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
            logger.info(f"通知 {self.id} 已標記為已讀")
    
    def mark_as_unread(self):
        """
        標記通知為未讀
        """
        if self.is_read:
            self.is_read = False
            self.read_at = None
            self.save(update_fields=['is_read', 'read_at'])
            logger.info(f"通知 {self.id} 已標記為未讀")
    
    @property
    def is_expired(self):
        """
        檢查通知是否已過期
        """
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def save(self, *args, **kwargs):
        """
        重寫保存方法，添加日誌記錄
        """
        is_new = self.pk is None
        try:
            super().save(*args, **kwargs)
            if is_new:
                logger.info(f"新通知創建: {self.recipient.username} - {self.get_type_display()}")
        except Exception as e:
            logger.error(f"通知保存錯誤: {str(e)}")
            raise


class NotificationSettings(models.Model):
    """
    用戶通知設置模型
    
    管理用戶的通知偏好設置
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings',
        verbose_name=_('用戶')
    )
    
    # 通知類型開關
    follow_notifications = models.BooleanField(
        default=True,
        verbose_name=_('關注通知'),
        help_text="有人關注你時接收通知"
    )
    
    like_notifications = models.BooleanField(
        default=True,
        verbose_name=_('點讚通知'),
        help_text="有人點讚你的內容時接收通知"
    )
    
    comment_notifications = models.BooleanField(
        default=True,
        verbose_name=_('評論通知'),
        help_text="有人評論你的內容時接收通知"
    )
    
    reply_notifications = models.BooleanField(
        default=True,
        verbose_name=_('回覆通知'),
        help_text="有人回覆你的評論時接收通知"
    )
    
    mention_notifications = models.BooleanField(
        default=True,
        verbose_name=_('提及通知'),
        help_text="有人在內容中提及你時接收通知"
    )
    
    message_notifications = models.BooleanField(
        default=True,
        verbose_name=_('私信通知'),
        help_text="收到私信時接收通知"
    )
    
    share_notifications = models.BooleanField(
        default=True,
        verbose_name=_('分享通知'),
        help_text="有人分享你的內容時接收通知"
    )
    
    system_notifications = models.BooleanField(
        default=True,
        verbose_name=_('系統通知'),
        help_text="接收系統更新、新功能通知"
    )
    
    # 通知管道設置
    email_notifications = models.BooleanField(
        default=True,
        verbose_name=_('郵件通知'),
        help_text="通過郵件接收通知"
    )
    
    push_notifications = models.BooleanField(
        default=True,
        verbose_name=_('推送通知'),
        help_text="通過瀏覽器推送接收通知"
    )
    
    # 通知時間設置
    quiet_hours_start = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_('勿擾時間開始'),
        help_text="勿擾時間段開始時間"
    )
    
    quiet_hours_end = models.TimeField(
        null=True,
        blank=True,
        verbose_name=_('勿擾時間結束'),
        help_text="勿擾時間段結束時間"
    )
    
    # 時間戳
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('通知設置')
        verbose_name_plural = _('通知設置')
    
    def __str__(self):
        return f"{self.user.username} 的通知設置"
    
    def is_notification_enabled(self, notification_type):
        """
        檢查特定類型的通知是否啟用
        """
        type_mapping = {
            NotificationType.FOLLOW: self.follow_notifications,
            NotificationType.LIKE: self.like_notifications,
            NotificationType.COMMENT: self.comment_notifications,
            NotificationType.REPLY: self.reply_notifications,
            NotificationType.MENTION: self.mention_notifications,
            NotificationType.MESSAGE: self.message_notifications,
            NotificationType.SHARE: self.share_notifications,
            NotificationType.SYSTEM: self.system_notifications,
        }
        return type_mapping.get(notification_type, True)
    
    def is_in_quiet_hours(self):
        """
        檢查當前時間是否在勿擾時間段內
        """
        if not (self.quiet_hours_start and self.quiet_hours_end):
            return False
        
        current_time = timezone.localtime().time()
        
        # 處理跨日的勿擾時間段
        if self.quiet_hours_start <= self.quiet_hours_end:
            return self.quiet_hours_start <= current_time <= self.quiet_hours_end
        else:
            return current_time >= self.quiet_hours_start or current_time <= self.quiet_hours_end


class NotificationTemplate(models.Model):
    """
    通知模板模型
    
    管理不同類型通知的模板內容
    """
    
    type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        unique=True,
        verbose_name=_('通知類型')
    )
    
    title_template = models.CharField(
        max_length=200,
        verbose_name=_('標題模板'),
        help_text="支持變量替換，如 {actor_name}, {target_name} 等"
    )
    
    message_template = models.TextField(
        verbose_name=_('內容模板'),
        help_text="支持變量替換，如 {actor_name}, {target_name} 等"
    )
    
    email_subject_template = models.CharField(
        max_length=200,
        blank=True,
        verbose_name=_('郵件主題模板')
    )
    
    email_body_template = models.TextField(
        blank=True,
        verbose_name=_('郵件內容模板')
    )
    
    # 是否啟用該類型的通知
    is_active = models.BooleanField(
        default=True,
        verbose_name=_('是否啟用')
    )
    
    class Meta:
        verbose_name = _('通知模板')
        verbose_name_plural = _('通知模板')
    
    def __str__(self):
        return f"{self.get_type_display()} 通知模板"
    
    def render_content(self, context):
        """
        根據上下文渲染通知內容
        """
        from django.template import Template, Context
        
        try:
            title = Template(self.title_template).render(Context(context))
            message = Template(self.message_template).render(Context(context))
            
            return {
                'title': title,
                'message': message,
            }
        except Exception as e:
            logger.error(f"通知模板渲染錯誤: {str(e)}")
            return {
                'title': '通知',
                'message': '您有一條新通知',
            } 