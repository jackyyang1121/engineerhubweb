"""
EngineerHub - 用戶模型
定義平台的用戶系統，包含基本資料、社交功能、作品集等
"""

import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.core.validators import RegexValidator, URLValidator
from PIL import Image



class User(AbstractUser):
    """
    自定義用戶模型
    擴展Django默認用戶模型，添加工程師社群平台所需的功能
    """
    
    # 基本資料
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="用戶唯一標識符"
    )
    
    # 覆蓋默認字段以支持郵箱登入
    email = models.EmailField(
        unique=True,
        help_text="用戶郵箱地址，用於登入"
    )
    
    username = models.CharField(
        max_length=30,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z0-9_]+$',
                message='用戶名只能包含字母、數字和下劃線'
            )
        ],
        help_text="用戶名，用於@提及和URL"
    )
    
    following = models.ManyToManyField(
        'self',
        through='Follow',
        related_name='followers',
        symmetrical=False,
        help_text="用戶關注的其他用戶"
    )
    
    # 個人資料
    bio = models.TextField(
        max_length=500,
        blank=True,
        help_text="個人簡介"
    )
    
    avatar = models.ImageField(
        upload_to='avatars/%Y/%m/',
        blank=True,
        null=True,
        help_text="用戶頭像"
    )
    
    location = models.CharField(
        max_length=100,
        blank=True,
        help_text="所在地"
    )
    
    website = models.URLField(
        blank=True,
        help_text="個人網站"
    )
    
    github_url = models.URLField(
        blank=True,
        help_text="GitHub 個人頁面"
    )
    
    # 技能標籤
    skill_tags = models.JSONField(
        default=list,
        blank=True,
        help_text="技能標籤列表，如 ['Python', 'Django', 'React']"
    )
    
    # 狀態相關
    is_online = models.BooleanField(
        default=False,
        help_text="是否在線"
    )
    
    last_online = models.DateTimeField(
        auto_now=True,
        help_text="最後在線時間"
    )
    
    is_verified = models.BooleanField(
        default=False,
        help_text="是否已驗證用戶"
    )
    
    # 隱私設置
    is_private = models.BooleanField(
        default=False,
        help_text="是否為私人帳戶"
    )
    
    hide_online_status = models.BooleanField(
        default=False,
        help_text="是否隱藏在線狀態"
    )
    
    # 統計數據（非規範化，用於提高查詢性能）
    followers_count = models.PositiveIntegerField(
        default=0,
        help_text="關注者數量"
    )
    
    following_count = models.PositiveIntegerField(
        default=0,
        help_text="關注數量"
    )
    
    posts_count = models.PositiveIntegerField(
        default=0,
        help_text="貼文數量"
    )
    
    likes_received_count = models.PositiveIntegerField(
        default=0,
        help_text="收到的點讚數量"
    )
    
    # 時間戳
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="創建時間"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="更新時間"
    )
    
    class Meta:
        db_table = 'accounts_user'
        verbose_name = '用戶'
        verbose_name_plural = '用戶'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['username']),
            models.Index(fields=['is_online']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return self.username
    
    def save(self, *args, **kwargs):
        """覆蓋保存方法，處理頭像壓縮等邏輯"""
        super().save(*args, **kwargs)
        
        # 壓縮頭像
        if self.avatar:
            self.compress_avatar()
    
    def compress_avatar(self):
        """壓縮用戶頭像至合適大小"""
        if not self.avatar:
            return
            
        try:
            img = Image.open(self.avatar.path)
            
            # 設置最大尺寸
            max_size = (400, 400)
            
            # 如果圖片需要壓縮
            if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                img.save(self.avatar.path, optimize=True, quality=85)
                
        except Exception as e:
            # 記錄錯誤但不中斷流程
            print(f"頭像壓縮失敗: {e}")
    
    @property
    def display_name(self):
        """顯示名稱，優先使用真實姓名，否則使用用戶名"""
        return self.get_full_name() or self.username
    
    @property
    def avatar_url(self):
        """頭像URL"""
        if self.avatar:
            return self.avatar.url
        return f"https://ui-avatars.com/api/?name={self.username}&background=random&size=400"
    
    def update_online_status(self, is_online=True):
        """更新在線狀態"""
        self.is_online = is_online
        self.last_online = timezone.now()
        self.save(update_fields=['is_online', 'last_online'])


class Follow(models.Model):
    """
    關注關係模型
    管理用戶之間的關注關係
    """
    
    follower = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='following_set',
        help_text="關注者"
    )
    
    following = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='followers_set',
        help_text="被關注者"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="關注時間"
    )
    
    class Meta:
        db_table = 'accounts_follow'
        verbose_name = '關注關係'
        verbose_name_plural = '關注關係'
        unique_together = ('follower', 'following')
        indexes = [
            models.Index(fields=['follower', 'created_at']),
            models.Index(fields=['following', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.follower.username} -> {self.following.username}"
    
    def save(self, *args, **kwargs):
        """創建關注關係時更新計數器"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # 更新關注者的關注數量
            User.objects.filter(id=self.follower.id).update(
                following_count=models.F('following_count') + 1
            )
            
            # 更新被關注者的關注者數量
            User.objects.filter(id=self.following.id).update(
                followers_count=models.F('followers_count') + 1
            )
    
    def delete(self, *args, **kwargs):
        """刪除關注關係時更新計數器"""
        follower_id = self.follower.id
        following_id = self.following.id
        
        super().delete(*args, **kwargs)
        
        # 安全地更新關注者的關注數量，确保不会变成负数
        User.objects.filter(id=follower_id, following_count__gt=0).update(
            following_count=models.F('following_count') - 1
        )
        
        # 安全地更新被關注者的關注者數量，确保不会变成负数
        User.objects.filter(id=following_id, followers_count__gt=0).update(
            followers_count=models.F('followers_count') - 1
        )


class PortfolioProject(models.Model):
    """
    作品集項目模型
    用戶可以展示自己的項目作品
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='portfolio_projects',
        help_text="作品所有者"
    )
    
    title = models.CharField(
        max_length=200,
        help_text="項目標題"
    )
    
    description = models.TextField(
        help_text="項目描述"
    )
    
    image = models.ImageField(
        upload_to='portfolio/%Y/%m/',
        blank=True,
        null=True,
        help_text="項目封面圖片"
    )
    
    project_url = models.URLField(
        blank=True,
        help_text="項目演示網址"
    )
    
    github_url = models.URLField(
        blank=True,
        help_text="GitHub 倉庫地址"
    )
    
    youtube_url = models.URLField(
        blank=True,
        help_text="YouTube 演示視頻"
    )
    
    technologies = models.JSONField(
        default=list,
        help_text="使用的技術棧，如 ['React', 'Node.js', 'MongoDB']"
    )
    
    is_featured = models.BooleanField(
        default=False,
        help_text="是否為精選項目"
    )
    
    order = models.PositiveIntegerField(
        default=0,
        help_text="顯示順序"
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
        db_table = 'accounts_portfolio_project'
        verbose_name = '作品集項目'
        verbose_name_plural = '作品集項目'
        ordering = ['-is_featured', 'order', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_featured']),
            models.Index(fields=['user', 'order']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"


class UserSettings(models.Model):
    """
    用戶設置模型
    管理用戶的各種偏好設置
    """
    
    user = models.OneToOneField(
# OneToOneField 是 Django ORM（物件關聯映射）提供的一種模型字段，用於定義兩個模型之間的一對一關係。這意味著：
# 一個模型實例對應另一個模型的唯一實例。
# 例如，在你的例子中，每個 UserSettings 實例只對應一個 User 實例，且每個 User 實例也只對應一個 UserSettings 實例。
# 這與 ForeignKey（一對多關係）或 ManyToManyField（多對多關係）不同，OneToOneField 確保關係是唯一的。
        User,  
# 關聯的模型：User
        on_delete=models.CASCADE,
# on_delete=models.CASCADE:
# 作用：定義當關聯的 User 實例被刪除時，UserSettings 實例的行為。
# models.CASCADE：如果關聯的 User 被刪除，對應的 UserSettings 實例也會自動被刪除。
        related_name='settings',
# related_name='settings'
# 作用：定義從 User 模型反向訪問 UserSettings 的名稱。
        help_text="設置所有者"
# 作用：為字段提供一個人類可讀的描述，通常在 Django 管理後台（Admin）或自動生成的表單中顯示。
    )
    
    # 通知設置
    email_notifications = models.BooleanField(
        default=True,
        help_text="是否接收郵件通知"
    )
    
    push_notifications = models.BooleanField(
        default=True,
        help_text="是否接收推送通知"
    )
    
    notification_new_follower = models.BooleanField(
        default=True,
        help_text="新關注者通知"
    )
    
    notification_post_like = models.BooleanField(
        default=True,
        help_text="貼文點讚通知"
    )
    
    notification_post_comment = models.BooleanField(
        default=True,
        help_text="貼文評論通知"
    )
    
    notification_comment_reply = models.BooleanField(
        default=True,
        help_text="評論回覆通知"
    )
    
    notification_mention = models.BooleanField(
        default=True,
        help_text="提及通知"
    )
    
    notification_new_message = models.BooleanField(
        default=True,
        help_text="新私信通知"
    )
    
    # 隱私設置
    profile_visibility = models.CharField(
        max_length=20,
        choices=[
            ('public', '公開'),
            ('followers', '僅關注者'),
            ('private', '私人'),
        ],
        default='public',
        help_text="個人資料可見性"
    )
    
    show_online_status = models.BooleanField(
        default=True,
        help_text="是否顯示在線狀態"
    )
    
    allow_mentions = models.BooleanField(
        default=True,
        help_text="是否允許被提及"
    )
    
    # UI 偏好
    theme = models.CharField(
        max_length=10,
        choices=[
            ('light', '淺色主題'),
            ('dark', '深色主題'),
            ('auto', '跟隨系統'),
        ],
        default='auto',
        help_text="主題偏好"
    )
    
    language = models.CharField(
        max_length=10,
        choices=[
            ('zh-hant', '繁體中文'),
            ('zh-hans', '簡體中文'),
            ('en', 'English'),
        ],
        default='zh-hant',
        help_text="語言偏好"
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
        db_table = 'accounts_user_settings'
        verbose_name = '用戶設置'
        verbose_name_plural = '用戶設置'
    
    def __str__(self):
        return f"{self.user.username} 的設置"


class BlockedUser(models.Model):
    """
    黑名單模型
    管理用戶的黑名單功能
    """
    
    blocker = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocking',
        help_text="拉黑者"
    )
    
    blocked = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='blocked_by',
        help_text="被拉黑者"
    )
    
    reason = models.CharField(
        max_length=200,
        blank=True,
        help_text="拉黑原因"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="拉黑時間"
    )
    
    class Meta:
        db_table = 'accounts_blocked_user'
        verbose_name = '黑名單'
        verbose_name_plural = '黑名單'
        unique_together = ('blocker', 'blocked')
        indexes = [
            models.Index(fields=['blocker']),
            models.Index(fields=['blocked']),
        ]
    
    def __str__(self):
        return f"{self.blocker.username} 拉黑了 {self.blocked.username}" 