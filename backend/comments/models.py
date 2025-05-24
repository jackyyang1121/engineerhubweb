"""
EngineerHub - 評論模型
定義平台的評論系統，支援多層級回覆
"""

import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Comment(models.Model):
    """
    評論模型
    支援對貼文的評論和對評論的回覆
    """
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        help_text="評論唯一標識符"
    )
    
    # 關聯關係
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='user_comments',
        help_text="評論作者"
    )
    
    post = models.ForeignKey(
        'posts.Post',
        on_delete=models.CASCADE,
        related_name='post_comments',
        help_text="所屬貼文"
    )
    
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        related_name='replies',
        null=True,
        blank=True,
        help_text="父評論（用於回覆功能）"
    )
    
    # 內容
    content = models.TextField(
        help_text="評論內容"
    )
    
    # 互動數據
    likes_count = models.PositiveIntegerField(
        default=0,
        help_text="點讚數量"
    )
    
    replies_count = models.PositiveIntegerField(
        default=0,
        help_text="回覆數量"
    )
    
    # 狀態
    is_deleted = models.BooleanField(
        default=False,
        help_text="是否已刪除（軟刪除）"
    )
    
    is_edited = models.BooleanField(
        default=False,
        help_text="是否已編輯"
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
        db_table = 'comments_comment'
        verbose_name = '評論'
        verbose_name_plural = '評論'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['post', 'parent', 'created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['post', '-created_at']),
            models.Index(fields=['parent', 'created_at']),
        ]
    
    def __str__(self):
        comment_type = "回覆" if self.parent else "評論"
        return f"{self.user.username} 的{comment_type} - {self.content[:30]}..."
    
    def save(self, *args, **kwargs):
        """保存時更新計數器"""
        is_new = self.pk is None
        
        # 檢查是否編輯
        if not is_new and self.pk:
            original = Comment.objects.get(pk=self.pk)
            if original.content != self.content:
                self.is_edited = True
        
        super().save(*args, **kwargs)
        
        if is_new:
            # 更新貼文評論數（只計算頂層評論）
            if not self.parent:
                from posts.models import Post
                Post.objects.filter(id=self.post.id).update(
                    comments_count=models.F('comments_count') + 1
                )
            else:
                # 更新父評論的回覆數
                Comment.objects.filter(id=self.parent.id).update(
                    replies_count=models.F('replies_count') + 1
                )
    
    def delete(self, using=None, keep_parents=False):
        """軟刪除評論"""
        self.is_deleted = True
        self.content = "[此評論已被刪除]"
        self.save(update_fields=['is_deleted', 'content'])
        
        # 更新計數器
        if not self.parent:
            # 頂層評論
            from posts.models import Post
            Post.objects.filter(id=self.post.id).update(
                comments_count=models.F('comments_count') - 1
            )
        else:
            # 回覆評論
            Comment.objects.filter(id=self.parent.id).update(
                replies_count=models.F('replies_count') - 1
            )
    
    def hard_delete(self):
        """硬刪除評論"""
        post_id = self.post.id
        parent_id = self.parent.id if self.parent else None
        
        super().delete()
        
        # 更新計數器
        if not parent_id:
            from posts.models import Post
            Post.objects.filter(id=post_id).update(
                comments_count=models.F('comments_count') - 1
            )
        else:
            Comment.objects.filter(id=parent_id).update(
                replies_count=models.F('replies_count') - 1
            )
    
    @property
    def is_reply(self):
        """是否為回覆"""
        return self.parent is not None
    
    @property
    def depth(self):
        """評論深度（0為頂層評論）"""
        if not self.parent:
            return 0
        return self.parent.depth + 1
    
    def get_thread_root(self):
        """獲取討論串的根評論"""
        if not self.parent:
            return self
        return self.parent.get_thread_root()


class CommentLike(models.Model):
    """
    評論點讚模型
    記錄用戶對評論的點讚
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='comment_likes',
        help_text="點讚用戶"
    )
    
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='likes',
        help_text="被點讚的評論"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="點讚時間"
    )
    
    class Meta:
        db_table = 'comments_comment_like'
        verbose_name = '評論點讚'
        verbose_name_plural = '評論點讚'
        unique_together = ('user', 'comment')
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['comment', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 點讚了 {self.comment.user.username} 的評論"
    
    def save(self, *args, **kwargs):
        """創建點讚時更新計數器"""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            Comment.objects.filter(id=self.comment.id).update(
                likes_count=models.F('likes_count') + 1
            )
    
    def delete(self, *args, **kwargs):
        """刪除點讚時更新計數器"""
        comment_id = self.comment.id
        super().delete(*args, **kwargs)
        
        Comment.objects.filter(id=comment_id).update(
            likes_count=models.F('likes_count') - 1
        )


class CommentReport(models.Model):
    """
    評論舉報模型
    記錄用戶對評論的舉報
    """
    
    REPORT_REASONS = [
        ('spam', '垃圾內容'),
        ('harassment', '騷擾'),
        ('hate_speech', '仇恨言論'),
        ('inappropriate', '不當內容'),
        ('off_topic', '偏離主題'),
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
        related_name='comment_reports_made',
        help_text="舉報者"
    )
    
    comment = models.ForeignKey(
        Comment,
        on_delete=models.CASCADE,
        related_name='reports',
        help_text="被舉報的評論"
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
        related_name='comment_reports_reviewed',
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
        db_table = 'comments_comment_report'
        verbose_name = '評論舉報'
        verbose_name_plural = '評論舉報'
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['reporter', '-created_at']),
            models.Index(fields=['comment', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.reporter.username} 舉報了 {self.comment.user.username} 的評論" 