import logging
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.chat')

class Conversation(models.Model):
    """
    對話模型
    
    存儲用戶之間的聊天對話
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='conversations',
        verbose_name=_('參與者')
    )
    created_at = models.DateTimeField(_('創建時間'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新時間'), auto_now=True)
    
    class Meta:
        verbose_name = _('對話')
        verbose_name_plural = _('對話')
        ordering = ['-updated_at']
    
    def __str__(self):
        participants_str = ", ".join([user.username for user in self.participants.all()])
        return f"對話 {self.id}: {participants_str}"
    
    def save(self, *args, **kwargs):
        """
        重寫 save 方法，添加日誌記錄
        """
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(f"新對話創建: {self.id}")
        else:
            logger.info(f"對話更新: {self.id}")


class Message(models.Model):
    """
    訊息模型
    
    存儲對話中的聊天訊息
    """
    class MessageType(models.TextChoices):
        TEXT = 'text', _('文字')
        IMAGE = 'image', _('圖片')
        VIDEO = 'video', _('影片')
        FILE = 'file', _('文件')
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_('對話')
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name=_('發送者')
    )
    content = models.TextField(_('內容'))
    message_type = models.CharField(
        _('訊息類型'),
        max_length=10,
        choices=MessageType.choices,
        default=MessageType.TEXT
    )
    file = models.FileField(
        _('文件'),
        upload_to='chat_files/',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(_('發送時間'), auto_now_add=True)
    
    # 訊息狀態
    is_read = models.BooleanField(_('已讀'), default=False)
    read_at = models.DateTimeField(_('閱讀時間'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('訊息')
        verbose_name_plural = _('訊息')
        ordering = ['created_at']
    
    def __str__(self):
        return f"{self.sender.username} 在 {self.conversation.id} 發送的訊息"
    
    def save(self, *args, **kwargs):
        """
        重寫 save 方法，添加日誌記錄
        """
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(f"新訊息發送: {self.id} 由 {self.sender.username} 在對話 {self.conversation.id}")
        else:
            logger.info(f"訊息更新: {self.id}")
    
    def mark_as_read(self, reader):
        """
        將訊息標記為已讀
        """
        from django.utils import timezone
        
        # 只有非發送者才能標記為已讀
        if self.sender != reader:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
            logger.info(f"訊息 {self.id} 被標記為已讀 由 {reader.username}")


class UserConversationState(models.Model):
    """
    用戶對話狀態模型
    
    記錄用戶在對話中的狀態，例如是否已關閉對話，最後一次讀取時間等
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversation_states',
        verbose_name=_('用戶')
    )
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='user_states',
        verbose_name=_('對話')
    )
    is_archived = models.BooleanField(_('已封存'), default=False)
    unread_count = models.PositiveIntegerField(_('未讀消息數'), default=0)
    last_read_at = models.DateTimeField(_('最後讀取時間'), null=True, blank=True)
    
    class Meta:
        verbose_name = _('用戶對話狀態')
        verbose_name_plural = _('用戶對話狀態')
        unique_together = ['user', 'conversation']
    
    def __str__(self):
        return f"{self.user.username} 在對話 {self.conversation.id} 的狀態"
    
    def update_unread_count(self):
        """
        更新未讀消息數
        """
        from django.utils import timezone
        
        # 計算未讀消息數
        unread_messages = Message.objects.filter(
            conversation=self.conversation,
            sender__is_not=self.user,
            is_read=False
        ).count()
        
        # 更新未讀消息數和最後讀取時間
        self.unread_count = unread_messages
        if unread_messages == 0:
            self.last_read_at = timezone.now()
        
        self.save(update_fields=['unread_count', 'last_read_at'])
        logger.info(f"用戶 {self.user.username} 在對話 {self.conversation.id} 的未讀消息數更新為 {unread_messages}") 