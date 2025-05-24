"""
EngineerHub 貼文分析系統

提供貼文相關的數據分析功能：
1. 用戶瀏覽行為分析
2. 用戶參與度計算
3. 推薦系統日誌
4. 內容偏好分析
"""

import logging
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.posts')

User = get_user_model()

# PostView 模型已在 posts.models 中定義，這裡直接導入使用
from .models import PostView


class UserEngagement(models.Model):
    """
    用戶參與度模型
    用於記錄和分析用戶在平台上的活躍度
    """
    
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='engagement_stats',
        help_text="用戶"
    )
    
    # 瀏覽統計
    total_views = models.PositiveIntegerField(
        default=0,
        help_text="總瀏覽數"
    )
    
    unique_posts_viewed = models.PositiveIntegerField(
        default=0,
        help_text="瀏覽的不重複貼文數"
    )
    
    avg_view_duration = models.FloatField(
        default=0.0,
        help_text="平均瀏覽時長（秒）"
    )
    
    # 互動統計
    likes_given = models.PositiveIntegerField(
        default=0,
        help_text="給出的點讚數"
    )
    
    comments_made = models.PositiveIntegerField(
        default=0,
        help_text="發表的評論數"
    )
    
    posts_shared = models.PositiveIntegerField(
        default=0,
        help_text="分享的貼文數"
    )
    
    # 內容偏好
    preferred_languages = models.JSONField(
        default=dict,
        help_text="偏好的程式語言統計"
    )
    
    preferred_topics = models.JSONField(
        default=dict,
        help_text="偏好的主題統計"
    )
    
    preferred_authors = models.JSONField(
        default=dict,
        help_text="偏好的作者統計"
    )
    
    # 活躍度分數
    engagement_score = models.FloatField(
        default=0.0,
        help_text="綜合參與度分數（0-100）"
    )
    
    last_active = models.DateTimeField(
        auto_now=True,
        help_text="最後活躍時間"
    )
    
    last_calculated = models.DateTimeField(
        auto_now=True,
        help_text="最後計算時間"
    )
    
    class Meta:
        db_table = 'posts_userengagement'
        verbose_name = '用戶參與度'
        verbose_name_plural = '用戶參與度'
        indexes = [
            models.Index(fields=['-engagement_score']),
            models.Index(fields=['-last_active']),
        ]
    
    def __str__(self):
        return f"{self.user.username} 參與度分數: {self.engagement_score}"
    
    def calculate_engagement_score(self):
        """
        計算用戶參與度分數
        
        基於多個維度計算：
        1. 瀏覽行為（20%）
        2. 互動行為（40%）
        3. 內容創建（30%）
        4. 活躍度（10%）
        """
        try:
            # 瀏覽行為分數（0-20）
            view_score = min(20, (self.unique_posts_viewed / 100) * 20)
            
            # 互動行為分數（0-40）
            interaction_score = min(40, (
                (self.likes_given / 50) * 15 +
                (self.comments_made / 20) * 20 +
                (self.posts_shared / 10) * 5
            ))
            
            # 內容創建分數（0-30）
            user_posts_count = self.user.posts.count()
            content_score = min(30, (user_posts_count / 10) * 30)
            
            # 活躍度分數（0-10）
            days_since_active = (timezone.now() - self.last_active).days
            activity_score = max(0, 10 - days_since_active)
            
            # 計算總分
            total_score = view_score + interaction_score + content_score + activity_score
            
            self.engagement_score = round(total_score, 2)
            self.last_calculated = timezone.now()
            self.save(update_fields=['engagement_score', 'last_calculated'])
            
            logger.info(f"用戶 {self.user.username} 參與度分數更新為: {self.engagement_score}")
            
        except Exception as e:
            logger.error(f"計算用戶參與度分數失敗: {str(e)}")
    
    def update_view_stats(self, duration: int = 0):
        """更新瀏覽統計"""
        self.total_views += 1
        
        # 更新平均瀏覽時長
        if self.total_views == 1:
            self.avg_view_duration = duration
        else:
            self.avg_view_duration = (
                (self.avg_view_duration * (self.total_views - 1) + duration) / self.total_views
            )
        
        self.save(update_fields=['total_views', 'avg_view_duration'])
    
    def update_preference(self, preference_type: str, item: str, weight: int = 1):
        """
        更新用戶偏好
        
        Args:
            preference_type: 偏好類型（languages, topics, authors）
            item: 偏好項目
            weight: 權重
        """
        try:
            preference_field = f"preferred_{preference_type}"
            preferences = getattr(self, preference_field, {})
            
            if item in preferences:
                preferences[item] += weight
            else:
                preferences[item] = weight
            
            setattr(self, preference_field, preferences)
            self.save(update_fields=[preference_field])
            
        except Exception as e:
            logger.error(f"更新用戶偏好失敗: {str(e)}")


class RecommendationLog(models.Model):
    """
    推薦日誌模型
    記錄推薦系統的行為，用於分析和優化
    """
    
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='recommendation_logs',
        help_text="目標用戶"
    )
    
    post = models.ForeignKey(
        'posts.Post',
        on_delete=models.CASCADE,
        related_name='recommendation_logs',
        help_text="推薦的貼文"
    )
    
    recommendation_type = models.CharField(
        max_length=50,
        choices=[
            ('following', '追蹤推薦'),
            ('trending', '熱門推薦'),
            ('personalized', '個性化推薦'),
        ],
        help_text="推薦類型"
    )
    
    recommendation_score = models.FloatField(
        help_text="推薦分數"
    )
    
    position = models.PositiveIntegerField(
        help_text="在推薦列表中的位置"
    )
    
    # 用戶行為反饋
    was_clicked = models.BooleanField(
        default=False,
        help_text="是否被點擊"
    )
    
    was_liked = models.BooleanField(
        default=False,
        help_text="是否被點讚"
    )
    
    was_commented = models.BooleanField(
        default=False,
        help_text="是否被評論"
    )
    
    was_shared = models.BooleanField(
        default=False,
        help_text="是否被分享"
    )
    
    view_duration = models.PositiveIntegerField(
        default=0,
        help_text="瀏覽時長（秒）"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="推薦時間"
    )
    
    class Meta:
        db_table = 'posts_recommendationlog'
        verbose_name = '推薦日誌'
        verbose_name_plural = '推薦日誌'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['recommendation_type', '-created_at']),
            models.Index(fields=['was_clicked', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.recommendation_type} - {self.post.id}"
    
    def record_interaction(self, interaction_type: str, duration: int = 0):
        """
        記錄用戶對推薦貼文的互動
        
        Args:
            interaction_type: 互動類型（click, like, comment, share）
            duration: 瀏覽時長
        """
        try:
            if interaction_type == 'click':
                self.was_clicked = True
            elif interaction_type == 'like':
                self.was_liked = True
            elif interaction_type == 'comment':
                self.was_commented = True
            elif interaction_type == 'share':
                self.was_shared = True
            
            if duration > 0:
                self.view_duration = max(self.view_duration, duration)
            
            self.save()
            
            logger.info(f"記錄推薦互動: {self.user.username} {interaction_type} {self.post.id}")
            
        except Exception as e:
            logger.error(f"記錄推薦互動失敗: {str(e)}")


# 添加信號處理器以自動創建和更新用戶參與度
@receiver(post_save, sender=User)
def create_user_engagement(sender, instance, created, **kwargs):
    """創建用戶時自動創建參與度記錄"""
    if created:
        UserEngagement.objects.create(user=instance)

@receiver(post_save, sender=PostView)
def update_engagement_on_view(sender, instance, created, **kwargs):
    """用戶瀏覽貼文時更新參與度"""
    if created:
        engagement, created = UserEngagement.objects.get_or_create(user=instance.user)
        engagement.update_view_stats(instance.duration)
        
        # 如果該用戶首次瀏覽此貼文，增加不重複瀏覽數
        if not PostView.objects.filter(user=instance.user, post=instance.post).exclude(id=instance.id).exists():
            engagement.unique_posts_viewed += 1
            engagement.save(update_fields=['unique_posts_viewed']) 