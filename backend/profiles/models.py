import logging
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.profiles')

class Portfolio(models.Model):
    """
    作品集模型
    
    用於存儲用戶的作品集項目
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='portfolio_items',
        verbose_name=_('用戶')
    )
    title = models.CharField(_('標題'), max_length=100)
    description = models.TextField(_('描述'))
    github_link = models.URLField(_('GitHub 連結'), blank=True, null=True)
    project_link = models.URLField(_('項目網址'), blank=True, null=True)
    youtube_link = models.URLField(_('YouTube 連結'), blank=True, null=True)
    created_at = models.DateTimeField(_('創建時間'), auto_now_add=True)
    updated_at = models.DateTimeField(_('更新時間'), auto_now=True)
    
    class Meta:
        verbose_name = _('作品集')
        verbose_name_plural = _('作品集')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} 的作品: {self.title}"
    
    def save(self, *args, **kwargs):
        """
        重寫 save 方法，添加日誌記錄
        """
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            logger.info(f"用戶 {self.user.username} 創建了新作品集項目: {self.title}")
        else:
            logger.info(f"用戶 {self.user.username} 更新了作品集項目: {self.title}")


class PortfolioMedia(models.Model):
    """
    作品集媒體模型
    
    用於存儲與作品集關聯的媒體文件
    """
    class MediaType(models.TextChoices):
        IMAGE = 'image', _('圖片')
        VIDEO = 'video', _('影片')
    
    portfolio = models.ForeignKey(
        Portfolio,
        on_delete=models.CASCADE,
        related_name='media',
        verbose_name=_('作品集')
    )
    file = models.FileField(_('檔案'), upload_to='portfolio_media/')
    media_type = models.CharField(
        _('媒體類型'),
        max_length=10,
        choices=MediaType.choices,
        default=MediaType.IMAGE
    )
    order = models.PositiveSmallIntegerField(_('順序'), default=0)
    created_at = models.DateTimeField(_('創建時間'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('作品集媒體')
        verbose_name_plural = _('作品集媒體')
        ordering = ['portfolio', 'order']
    
    def __str__(self):
        return f"{self.portfolio.title} 的媒體 {self.id}" 