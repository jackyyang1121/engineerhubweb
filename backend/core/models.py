"""
EngineerHub 核心模型

包含平台的核心數據模型：
1. 搜尋歷史
2. 用戶活動記錄
3. 系統配置
4. 平台統計
"""

import logging
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.core')

User = get_user_model()


class SearchHistory(models.Model):
    """
    搜尋歷史模型
    記錄用戶的搜尋行為，用於分析和改進搜尋體驗
    """
    
    SEARCH_TYPES = [
        ('user', '用戶搜尋'),
        ('post', '貼文搜尋'),
        ('mixed', '混合搜尋'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="搜尋記錄唯一標識符"
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='search_history',
        help_text="搜尋用戶"
    )
    
    query = models.CharField(
        max_length=200,
        help_text="搜尋關鍵字"
    )
    
    search_type = models.CharField(
        max_length=10,
        choices=SEARCH_TYPES,
        help_text="搜尋類型"
    )
    
    results_count = models.PositiveIntegerField(
        default=0,
        help_text="搜尋結果數量"
    )
    
    # 搜尋元數據
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="搜尋來源IP"
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="用戶代理字符串"
    )
    
    response_time = models.FloatField(
        null=True,
        blank=True,
        help_text="搜尋響應時間（毫秒）"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="搜尋時間"
    )
    
    class Meta:
        db_table = 'core_search_history'
        verbose_name = '搜尋歷史'
        verbose_name_plural = '搜尋歷史'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['query']),
            models.Index(fields=['search_type']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 搜尋: {self.query}"


class UserActivity(models.Model):
    """
    用戶活動模型
    記錄用戶在平台上的各種活動
    """
    
    ACTIVITY_TYPES = [
        ('login', '登入'),
        ('logout', '登出'),
        ('post_create', '發布貼文'),
        ('post_like', '點讚貼文'),
        ('post_comment', '評論貼文'),
        ('post_share', '分享貼文'),
        ('post_save', '收藏貼文'),
        ('user_follow', '關注用戶'),
        ('user_unfollow', '取消關注'),
        ('profile_update', '更新個人資料'),
        ('message_send', '發送訊息'),
        ('search', '搜尋'),
        ('page_view', '頁面瀏覽'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="活動用戶"
    )
    
    activity_type = models.CharField(
        max_length=20,
        choices=ACTIVITY_TYPES,
        help_text="活動類型"
    )
    
    # 活動目標（可選）
    target_content_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="目標內容類型"
    )
    
    target_object_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="目標對象ID"
    )
    
    # 活動詳細信息
    details = models.JSONField(
        default=dict,
        blank=True,
        help_text="活動詳細數據"
    )
    
    # 環境信息
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="活動來源IP"
    )
    
    user_agent = models.TextField(
        blank=True,
        help_text="用戶代理字符串"
    )
    
    session_key = models.CharField(
        max_length=40,
        blank=True,
        help_text="會話標識"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="活動時間"
    )
    
    class Meta:
        db_table = 'core_user_activity'
        verbose_name = '用戶活動'
        verbose_name_plural = '用戶活動'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['activity_type']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['target_content_type', 'target_object_id']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.get_activity_type_display()}"


class SystemConfiguration(models.Model):
    """
    系統配置模型
    存儲平台的各種配置選項
    """
    
    CONFIG_TYPES = [
        ('general', '一般設置'),
        ('feature', '功能開關'),
        ('limit', '限制設置'),
        ('ui', '界面設置'),
        ('notification', '通知設置'),
        ('security', '安全設置'),
    ]
    
    key = models.CharField(
        max_length=100,
        unique=True,
        help_text="配置鍵"
    )
    
    value = models.JSONField(
        help_text="配置值"
    )
    
    config_type = models.CharField(
        max_length=20,
        choices=CONFIG_TYPES,
        default='general',
        help_text="配置類型"
    )
    
    description = models.TextField(
        blank=True,
        help_text="配置描述"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="是否啟用"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="創建時間"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="更新時間"
    )
    
    class Meta:
        db_table = 'core_system_configuration'
        verbose_name = '系統配置'
        verbose_name_plural = '系統配置'
        ordering = ['config_type', 'key']
    
    def __str__(self):
        return f"{self.key}: {self.value}"


class PlatformStatistics(models.Model):
    """
    平台統計模型
    記錄平台的各種統計數據
    """
    
    STAT_TYPES = [
        ('daily', '日統計'),
        ('weekly', '週統計'),
        ('monthly', '月統計'),
        ('yearly', '年統計'),
    ]
    
    stat_type = models.CharField(
        max_length=10,
        choices=STAT_TYPES,
        help_text="統計類型"
    )
    
    date = models.DateField(
        help_text="統計日期"
    )
    
    # 用戶統計
    total_users = models.PositiveIntegerField(
        default=0,
        help_text="總用戶數"
    )
    
    new_users = models.PositiveIntegerField(
        default=0,
        help_text="新增用戶數"
    )
    
    active_users = models.PositiveIntegerField(
        default=0,
        help_text="活躍用戶數"
    )
    
    # 內容統計
    total_posts = models.PositiveIntegerField(
        default=0,
        help_text="總貼文數"
    )
    
    new_posts = models.PositiveIntegerField(
        default=0,
        help_text="新增貼文數"
    )
    
    total_comments = models.PositiveIntegerField(
        default=0,
        help_text="總評論數"
    )
    
    new_comments = models.PositiveIntegerField(
        default=0,
        help_text="新增評論數"
    )
    
    # 互動統計
    total_likes = models.PositiveIntegerField(
        default=0,
        help_text="總點讚數"
    )
    
    total_shares = models.PositiveIntegerField(
        default=0,
        help_text="總分享數"
    )
    
    total_messages = models.PositiveIntegerField(
        default=0,
        help_text="總私訊數"
    )
    
    # 搜尋統計
    total_searches = models.PositiveIntegerField(
        default=0,
        help_text="總搜尋次數"
    )
    
    # 其他統計數據
    additional_stats = models.JSONField(
        default=dict,
        blank=True,
        help_text="其他統計數據"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="記錄時間"
    )
    
    class Meta:
        db_table = 'core_platform_statistics'
        verbose_name = '平台統計'
        verbose_name_plural = '平台統計'
        unique_together = ['stat_type', 'date']
        ordering = ['-date', 'stat_type']
        indexes = [
            models.Index(fields=['stat_type', '-date']),
            models.Index(fields=['-date']),
        ]
    
    def __str__(self):
        return f"{self.get_stat_type_display()} - {self.date}"


class Notification(models.Model):
    """
    通知模型
    處理平台內的各種通知
    """
    
    NOTIFICATION_TYPES = [
        ('like', '點讚'),
        ('comment', '評論'),
        ('follow', '關注'),
        ('mention', '提及'),
        ('message', '私訊'),
        ('system', '系統通知'),
        ('post', '貼文相關'),
        ('achievement', '成就解鎖'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    recipient = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications_received',
        help_text="通知接收者"
    )
    
    sender = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications_sent',
        help_text="通知發送者"
    )
    
    notification_type = models.CharField(
        max_length=20,
        choices=NOTIFICATION_TYPES,
        help_text="通知類型"
    )
    
    title = models.CharField(
        max_length=200,
        help_text="通知標題"
    )
    
    content = models.TextField(
        help_text="通知內容"
    )
    
    # 目標內容（可選）
    target_content_type = models.CharField(
        max_length=50,
        blank=True,
        help_text="目標內容類型"
    )
    
    target_object_id = models.CharField(
        max_length=50,
        blank=True,
        help_text="目標對象ID"
    )
    
    # 通知數據
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="通知附加數據"
    )
    
    is_read = models.BooleanField(
        default=False,
        help_text="是否已讀"
    )
    
    read_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="閱讀時間"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="創建時間"
    )
    
    class Meta:
        db_table = 'core_notification'
        verbose_name = '通知'
        verbose_name_plural = '通知'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['notification_type']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"通知給 {self.recipient.username}: {self.title}"
    
    def mark_as_read(self):
        """標記通知為已讀"""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class ReportedContent(models.Model):
    """
    舉報內容模型
    處理用戶舉報的內容
    """
    
    CONTENT_TYPES = [
        ('post', '貼文'),
        ('comment', '評論'),
        ('user', '用戶'),
        ('message', '私訊'),
    ]
    
    REPORT_REASONS = [
        ('spam', '垃圾訊息'),
        ('harassment', '騷擾'),
        ('hate_speech', '仇恨言論'),
        ('violence', '暴力內容'),
        ('inappropriate', '不當內容'),
        ('copyright', '版權侵犯'),
        ('false_info', '虛假資訊'),
        ('privacy', '隱私侵犯'),
        ('other', '其他'),
    ]
    
    REPORT_STATUS = [
        ('pending', '待處理'),
        ('reviewing', '審核中'),
        ('resolved', '已解決'),
        ('dismissed', '已駁回'),
        ('escalated', '已升級'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='core_reports_made',
        help_text="舉報者"
    )
    
    content_type = models.CharField(
        max_length=20,
        choices=CONTENT_TYPES,
        help_text="舉報內容類型"
    )
    
    content_id = models.CharField(
        max_length=50,
        help_text="舉報內容ID"
    )
    
    reason = models.CharField(
        max_length=20,
        choices=REPORT_REASONS,
        help_text="舉報原因"
    )
    
    description = models.TextField(
        blank=True,
        help_text="詳細描述"
    )
    
    status = models.CharField(
        max_length=20,
        choices=REPORT_STATUS,
        default='pending',
        help_text="處理狀態"
    )
    
    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='core_reports_reviewed',
        help_text="審核者"
    )
    
    reviewer_notes = models.TextField(
        blank=True,
        help_text="審核備註"
    )
    
    action_taken = models.CharField(
        max_length=100,
        blank=True,
        help_text="採取的行動"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="舉報時間"
    )
    
    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="審核時間"
    )
    
    resolved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="解決時間"
    )
    
    class Meta:
        db_table = 'core_reported_content'
        verbose_name = '舉報內容'
        verbose_name_plural = '舉報內容'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['content_type', 'content_id']),
            models.Index(fields=['reporter']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"舉報 {self.content_type} by {self.reporter.username}" 