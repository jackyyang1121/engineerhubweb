"""
EngineerHub - 貼文模型
定義平台的貼文系統，包含文字內容、媒體文件、程式碼片段等
"""

import logging
import uuid
import os
from django.db import models
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
from PIL import Image
from pygments import highlight
from pygments.lexers import get_lexer_by_name, guess_lexer
from pygments.formatters import HtmlFormatter
from pygments.util import ClassNotFound

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts')

User = get_user_model()


def get_post_media_path(instance, filename):
    """生成貼文媒體文件的存儲路徑"""
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    return f"posts/{instance.post.created_at.strftime('%Y/%m')}/{filename}"


class Post(models.Model):
    """
    貼文模型
    支援文字內容、媒體文件（圖片/影片）、程式碼片段
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="貼文唯一標識符"
    )
    
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='posts',
        help_text="貼文作者"
    )
    
    content = models.TextField(
        help_text="貼文內容"
    )
    
    # 程式碼相關
    code_snippet = models.TextField(
        blank=True,
        help_text="程式碼片段（最多100行）"
    )
    
    code_language = models.CharField(
        max_length=50,
        blank=True,
        help_text="程式語言（自動檢測）"
    )
    
    code_highlighted = models.TextField(
        blank=True,
        help_text="高亮後的HTML代碼"
    )
    
    # 互動數據（非規範化）
    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="點讚數量"
    )
    
    comments_count = models.PositiveIntegerField(
        default=0,
        help_text="評論數量"
    )
    
    shares_count = models.PositiveIntegerField(
        default=0,
        help_text="分享數量"
    )
    
    views_count = models.PositiveIntegerField(
        default=0,
        help_text="瀏覽數量"
    )
    
    # 狀態
    is_published = models.BooleanField(
        default=True,
        help_text="是否已發布"
    )
    
    is_featured = models.BooleanField(
        default=False,
        help_text="是否為精選貼文"
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
        db_table = 'posts_post'
        verbose_name = '貼文'
        verbose_name_plural = '貼文'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['is_published', '-created_at']),
            models.Index(fields=['is_featured', '-created_at']),
            models.Index(fields=['likes_count']),
            models.Index(fields=['comments_count']),
        ]
    
    def __str__(self):
        return f"{self.author.username} - {self.content[:50]}..."
    
    def save(self, *args, **kwargs):
        """保存時處理程式碼高亮"""
        if self.code_snippet:
            self.highlight_code()
        
        # 更新用戶貼文數量
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            User.objects.filter(id=self.author.id).update(
                posts_count=models.F('posts_count') + 1
            )
    
    def delete(self, *args, **kwargs):
        """刪除時更新用戶貼文數量"""
        author_id = self.author.id
        super().delete(*args, **kwargs)
        
        User.objects.filter(id=author_id).update(
            posts_count=models.F('posts_count') - 1
        )
    
    def highlight_code(self):
        """程式碼語法高亮處理"""
        if not self.code_snippet:
            return
        
        try:
            # 限制代碼行數
            lines = self.code_snippet.split('\n')
            if len(lines) > 100:
                self.code_snippet = '\n'.join(lines[:100])
            
            # 自動檢測語言
            try:
                lexer = guess_lexer(self.code_snippet)
                self.code_language = lexer.aliases[0] if lexer.aliases else 'text'
            except ClassNotFound:
                # 如果檢測失敗，嘗試一些常見語言
                common_keywords = {
                    'python': ['def ', 'import ', 'from ', 'class ', 'if __name__'],
                    'javascript': ['function ', 'const ', 'let ', 'var ', '=>', 'console.log'],
                    'java': ['public class', 'public static', 'System.out'],
                    'cpp': ['#include', 'using namespace', 'int main'],
                    'html': ['<html>', '<div>', '<script>', '<!DOCTYPE'],
                    'css': ['{', '}', 'color:', 'background:']
                }
                
                detected_lang = 'text'
                for lang, keywords in common_keywords.items():
                    if any(keyword in self.code_snippet.lower() for keyword in keywords):
                        detected_lang = lang
                        break
                
                self.code_language = detected_lang
            
            # 生成高亮HTML
            try:
                lexer = get_lexer_by_name(self.code_language)
            except ClassNotFound:
                lexer = get_lexer_by_name('text')
            
            formatter = HtmlFormatter(
                style='github-dark',
                cssclass='highlight',
                linenos=True,
                linenostart=1
            )
            
            self.code_highlighted = highlight(self.code_snippet, lexer, formatter)
            
        except Exception as e:
            # 如果高亮失敗，記錄錯誤但不中斷
            logger.error(f"程式碼高亮失敗: {e}")
            self.code_language = 'text'
            self.code_highlighted = f"<pre><code>{self.code_snippet}</code></pre>"
    
    @property
    def excerpt(self):
        """貼文摘要（前150個字符）"""
        if len(self.content) <= 150:
            return self.content
        return self.content[:150] + "..."
    
    @property
    def has_media(self):
        """是否包含媒體文件"""
        return self.media.exists()
    
    @property
    def has_code(self):
        """是否包含程式碼"""
        return bool(self.code_snippet)
    
    def increment_views(self):
        """增加瀏覽數"""
        Post.objects.filter(id=self.id).update(
            views_count=models.F('views_count') + 1
        )


class PostMedia(models.Model):
    """
    貼文媒體模型
    支援圖片和影片，最多10個文件
    """
    
    MEDIA_TYPES = [
        ('image', '圖片'),
        ('video', '影片'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='media',
        help_text="所屬貼文"
    )
    
    media_type = models.CharField(
        max_length=10,
        choices=MEDIA_TYPES,
        help_text="媒體類型"
    )
    
    file = models.FileField(
        upload_to=get_post_media_path,
        validators=[
            FileExtensionValidator(
                allowed_extensions=['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'avi']
            )
        ],
        help_text="媒體文件"
    )
    
    alt_text = models.CharField(
        max_length=200,
        blank=True,
        help_text="替代文字（用於無障礙）"
    )
    
    thumbnail = models.ImageField(
        upload_to='thumbnails/',
        blank=True,
        null=True,
        help_text="縮略圖（影片使用）"
    )
    
    order = models.PositiveIntegerField(
        default=0,
        help_text="顯示順序"
    )
    
    file_size = models.PositiveIntegerField(
        default=0,
        help_text="文件大小（字節）"
    )
    
    width = models.PositiveIntegerField(
        default=0,
        help_text="寬度（像素）"
    )
    
    height = models.PositiveIntegerField(
        default=0,
        help_text="高度（像素）"
    )
    
    duration = models.FloatField(
        null=True,
        blank=True,
        help_text="持續時間（秒，僅影片）"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="創建時間"
    )
    
    class Meta:
        db_table = 'posts_post_media'
        verbose_name = '貼文媒體'
        verbose_name_plural = '貼文媒體'
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['post', 'order']),
            models.Index(fields=['media_type']),
        ]
    
    def __str__(self):
        return f"{self.post.author.username} - {self.media_type} - {self.order}"
    
    def save(self, *args, **kwargs):
        """保存時處理圖片壓縮和縮略圖生成"""
        # 設置文件大小
        if self.file:
            self.file_size = self.file.size
        
        super().save(*args, **kwargs)
        
        # 處理圖片
        if self.media_type == 'image' and self.file:
            self.process_image()
        
        # 處理影片縮略圖
        elif self.media_type == 'video' and self.file:
            self.generate_video_thumbnail()
    
    def process_image(self):
        """處理圖片：壓縮、獲取尺寸"""
        try:
            with Image.open(self.file.path) as img:
                # 獲取原始尺寸
                self.width, self.height = img.size
                
                # 壓縮大圖片
                max_size = (1920, 1920)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                    img.save(self.file.path, optimize=True, quality=85)
                    self.width, self.height = img.size
                
                # 更新文件大小
                self.file_size = os.path.getsize(self.file.path)
                
                # 保存更新（避免無限遞歸）
                PostMedia.objects.filter(id=self.id).update(
                    width=self.width,
                    height=self.height,
                    file_size=self.file_size
                )
                
        except Exception as e:
            logger.error(f"圖片處理失敗: {e}")
    
    def generate_video_thumbnail(self):
        """生成影片縮略圖"""
        try:
            # 這裡可以使用 ffmpeg 或其他工具生成縮略圖
            # 目前只是佔位符實現
            pass
        except Exception as e:
            logger.error(f"影片縮略圖生成失敗: {e}")



class Like(models.Model):
    """
    點讚模型
    記錄用戶對貼文的點讚
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='likes',
        help_text="點讚用戶"
    )
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='likes',
        help_text="被點讚的貼文"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="點讚時間"
    )
    
    class Meta:
        db_table = 'posts_like'
        verbose_name = '點讚'
        verbose_name_plural = '點讚'
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['post', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 點讚了 {self.post.author.username} 的貼文"
    
    def save(self, *args, **kwargs):
        """創建點讚時更新計數器"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # 更新貼文點讚數
            Post.objects.filter(id=self.post.id).update(
                likes_count=models.F('likes_count') + 1
            )
    
    def delete(self, *args, **kwargs):
        """刪除點讚時更新計數器"""
        post_id = self.post.id
        super().delete(*args, **kwargs)
        
        # 更新貼文點讚數
        Post.objects.filter(id=post_id).update(
            likes_count=models.F('likes_count') - 1
        )


class Save(models.Model):
    """
    收藏模型
    記錄用戶收藏的貼文
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='saved_posts',
        help_text="收藏用戶"
    )
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='saved_by',
        help_text="被收藏的貼文"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="收藏時間"
    )
    
    class Meta:
        db_table = 'posts_save'
        verbose_name = '收藏'
        verbose_name_plural = '收藏'
        unique_together = ('user', 'post')
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['post', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 收藏了 {self.post.author.username} 的貼文"


class Report(models.Model):
    """
    舉報模型
    記錄用戶對貼文的舉報
    """
    
    REPORT_REASONS = [
        ('spam', '垃圾內容'),
        ('harassment', '騷擾'),
        ('hate_speech', '仇恨言論'),
        ('violence', '暴力內容'),
        ('inappropriate', '不當內容'),
        ('copyright', '版權侵犯'),
        ('false_info', '虛假信息'),
        ('other', '其他'),
    ]
    
    REPORT_STATUS = [
        ('pending', '待處理'),
        ('reviewed', '已審核'),
        ('resolved', '已解決'),
        ('dismissed', '已駁回'),
    ]
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    
    reporter = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='post_reports_made',
        help_text="舉報者"
    )
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='reports',
        help_text="被舉報的貼文"
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
        related_name='post_reports_reviewed',
        help_text="審核者"
    )
    
    reviewer_notes = models.TextField(
        blank=True,
        help_text="審核備註"
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
    
    class Meta:
        db_table = 'posts_report'
        verbose_name = '舉報'
        verbose_name_plural = '舉報'
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['reporter', '-created_at']),
            models.Index(fields=['post', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.reporter.username} 舉報了 {self.post.author.username} 的貼文"


class PostView(models.Model):
    """
    貼文瀏覽記錄模型
    用於記錄用戶瀏覽貼文的行為，支援推薦系統分析
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="瀏覽記錄唯一標識符"
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='post_views',
        help_text="瀏覽用戶"
    )
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='view_records',
        help_text="被瀏覽的貼文"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="瀏覽時間"
    )
    
    # 瀏覽時長（秒數），可用於分析用戶興趣度
    duration = models.PositiveIntegerField(
        default=0,
        help_text="瀏覽時長（秒）"
    )
    
    # 瀏覽來源（推薦、搜尋、直接訪問等）
    source = models.CharField(
        max_length=50,
        choices=[
            ('recommendation', '推薦'),
            ('search', '搜尋'),
            ('following', '關注'),
            ('trending', '熱門'),
            ('direct', '直接訪問'),
            ('profile', '個人頁面'),
        ],
        default='direct',
        help_text="瀏覽來源"
    )
    
    class Meta:
        db_table = 'posts_postview'
        verbose_name = '貼文瀏覽記錄'
        verbose_name_plural = '貼文瀏覽記錄'
        unique_together = ['user', 'post']  # 每個用戶對每篇貼文只記錄一次瀏覽
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['post', '-created_at']),
            models.Index(fields=['source', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 瀏覽 {self.post.id}"


class PostShare(models.Model):
    """
    貼文轉發模型
    記錄用戶轉發貼文的行為
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="轉發記錄唯一標識符"
    )
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='shared_posts',
        help_text="轉發用戶"
    )
    
    post = models.ForeignKey(
        Post,
        on_delete=models.CASCADE,
        related_name='shares',
        help_text="被轉發的貼文"
    )
    
    comment = models.TextField(
        blank=True,
        help_text="轉發時的評論"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="轉發時間"
    )
    
    class Meta:
        db_table = 'posts_postshare'
        verbose_name = '貼文轉發'
        verbose_name_plural = '貼文轉發'
        unique_together = ('user', 'post')  # 防止重複轉發
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['post', '-created_at']),
            models.Index(fields=['-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 轉發了 {self.post.author.username} 的貼文"
    
    def save(self, *args, **kwargs):
        """保存時更新貼文轉發數量"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # 增加貼文轉發數量
            Post.objects.filter(id=self.post.id).update(
                shares_count=models.F('shares_count') + 1
            )
            logger.info(f"用戶 {self.user.username} 轉發了貼文 {self.post.id}")
    
    def delete(self, *args, **kwargs):
        """刪除時更新貼文轉發數量"""
        post_id = self.post.id
        super().delete(*args, **kwargs)
        
        Post.objects.filter(id=post_id).update(
            shares_count=models.F('shares_count') - 1
        )
        logger.info(f"用戶 {self.user.username} 取消轉發貼文 {post_id}") 