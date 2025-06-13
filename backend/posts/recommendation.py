"""
EngineerHub - 貼文推薦系統

實現智能推薦演算法：
1. 追蹤用戶發布的貼文（優先級最高）
2. 熱門貼文推薦
3. 基於用戶行為的個性化推薦（點讚、留言、瀏覽、技能標籤）
"""

import logging
import random
from typing import List, Dict, Any, Optional, TYPE_CHECKING
from datetime import datetime, timedelta
from django.db.models import Q, Count, F, Avg, Case, When, IntegerField
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

# 暫時註釋掉 sklearn 依賴，避免導入錯誤
# from sklearn.feature_extraction.text import TfidfVectorizer
# from sklearn.metrics.pairwise import cosine_similarity
# import numpy as np

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractUser
    from .models import Post, PostView

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.recommendation')

User = get_user_model()

# 在運行時才導入這些模型，避免循環導入
def get_models():
    try:
        from .models import Post, Like, PostView
        from comments.models import Comment  # 可能這個不存在
        from accounts.models import Follow
        return Post, Like, PostView, Comment, Follow
    except ImportError as e:
        logger.warning(f"某些模型導入失敗: {e}")
        # 返回基本模型
        from .models import Post, Like, PostView
        from accounts.models import Follow
        return Post, Like, PostView, None, Follow


class RecommendationConfig:
    """
    推薦系統配置
    
    集中管理推薦算法的參數和權重
    """
    # 推薦權重配置
    WEIGHTS = {
        'following': 0.5,    # 追蹤用戶貼文權重
        'trending': 0.3,     # 熱門貼文權重
        'personalized': 0.2  # 個性化推薦權重
    }
    
    # 緩存配置
    CACHE_TIMEOUT = 600  # 10分鐘緩存
    DEFAULT_PAGE_SIZE = 20
    
    # 時間範圍配置
    FOLLOWING_POSTS_DAYS = 7  # 追蹤用戶貼文的時間範圍
    TRENDING_POSTS_DAYS = 7   # 熱門貼文的時間範圍
    INTERACTION_HISTORY_DAYS = 30  # 用戶互動歷史的時間範圍


class PostCountCalculator:
    """
    貼文數量計算器
    
    負責計算各類推薦的數量分配
    """
    
    @staticmethod
    def calculate_distribution(page_size: int, weights: Dict[str, float]) -> Dict[str, int]:
        """
        計算各類推薦的數量分配
        
        Args:
            page_size: 頁面大小
            weights: 權重配置
            
        Returns:
            Dict[str, int]: 各類推薦的數量分配
        """
        following_count = int(page_size * weights['following'])
        trending_count = int(page_size * weights['trending'])
        personalized_count = page_size - following_count - trending_count
        
        return {
            'following': following_count,
            'trending': trending_count,
            'personalized': personalized_count
        }


class RecommendationCache:
    """
    推薦系統緩存管理器
    
    負責緩存的讀取、設置和失效管理
    """
    
    @staticmethod
    def get_cache_key(user_id: int, page: int, page_size: int) -> str:
        """生成緩存鍵"""
        return f"feed_recommendations_{user_id}_{page}_{page_size}"
    
    @staticmethod
    def get_recommendations(user_id: int, page: int, page_size: int) -> Optional[Dict[str, Any]]:
        """從緩存獲取推薦"""
        cache_key = RecommendationCache.get_cache_key(user_id, page, page_size)
        return cache.get(cache_key)
    
    @staticmethod
    def set_recommendations(user_id: int, page: int, page_size: int, 
                          result: Dict[str, Any], timeout: int) -> None:
        """設置推薦緩存"""
        cache_key = RecommendationCache.get_cache_key(user_id, page, page_size)
        cache.set(cache_key, result, timeout)


class PostMixer:
    """
    貼文混合器
    
    負責將不同來源的推薦貼文混合和排序
    """
    
    @staticmethod
    def mix_recommendations(recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        混合並打亂推薦，保持一定的隨機性
        
        Args:
            recommendations: 推薦列表
            
        Returns:
            List[Dict[str, Any]]: 混合後的推薦列表
        """
        # 按類型分組
        grouped = PostMixer._group_by_type(recommendations)
        
        # 交錯混合不同類型的推薦
        mixed = PostMixer._interleave_recommendations(grouped)
        
        return mixed
    
    @staticmethod
    def _group_by_type(recommendations: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        """按推薦類型分組"""
        grouped = {'following': [], 'trending': [], 'personalized': []}
        
        for rec in recommendations:
            rec_type = rec.get('recommendation_type', 'personalized')
            if rec_type in grouped:
                grouped[rec_type].append(rec)
        
        return grouped
    
    @staticmethod
    def _interleave_recommendations(grouped: Dict[str, List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
        """交錯混合不同類型的推薦"""
        mixed = []
        max_length = max(len(posts) for posts in grouped.values()) if grouped.values() else 0
        
        for i in range(max_length):
            for rec_type in ['following', 'trending', 'personalized']:
                if i < len(grouped[rec_type]):
                    mixed.append(grouped[rec_type][i])
        
        return mixed


class RecommendationResultBuilder:
    """
    推薦結果構建器
    
    負責構建最終的推薦結果數據結構
    """
    
    @staticmethod
    def build_result(recommendations: List[Dict[str, Any]], page: int, page_size: int,
                    breakdown: Dict[str, int]) -> Dict[str, Any]:
        """
        構建推薦結果
        
        Args:
            recommendations: 推薦列表
            page: 頁碼
            page_size: 頁面大小
            breakdown: 推薦分解數據
            
        Returns:
            Dict[str, Any]: 推薦結果
        """
        # 分頁處理
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_recommendations = recommendations[start_idx:end_idx]
        
        return {
            'posts': page_recommendations,
            'page': page,
            'page_size': page_size,
            'total_count': len(recommendations),
            'has_next': end_idx < len(recommendations),
            'recommendation_breakdown': breakdown
        }


class RecommendationEngine:
    """
    貼文推薦引擎
    
    實現多層次推薦策略：
    1. 追蹤用戶貼文（權重：50%）
    2. 熱門貼文（權重：30%）
    3. 個性化推薦（權重：20%）
    """
    
    def __init__(self):
        self.config = RecommendationConfig()
        self.cache = RecommendationCache()
        self.mixer = PostMixer()
        self.result_builder = RecommendationResultBuilder()
    
    def get_feed_recommendations(self, user: "AbstractUser", page: int = 1, 
                               page_size: int = 20) -> Dict[str, Any]:
        """
        獲取用戶個人化信息流推薦
        
        Args:
            user: 目標用戶
            page: 頁碼
            page_size: 每頁大小
        
        Returns:
            推薦貼文列表和相關元數據
        """
        try:
            # 檢查緩存
            cached_result = self.cache.get_recommendations(user.id, page, page_size)
            if cached_result:
                logger.debug(f"從緩存獲取用戶 {user.username} 的推薦")
                return cached_result
            
            # 生成推薦
            recommendations, breakdown = self._generate_recommendations(user, page_size)
            
            # 混合推薦
            final_recommendations = self.mixer.mix_recommendations(recommendations)
            
            # 構建結果
            result = self.result_builder.build_result(
                final_recommendations, page, page_size, breakdown
            )
            
            # 緩存結果
            self.cache.set_recommendations(
                user.id, page, page_size, result, self.config.CACHE_TIMEOUT
            )
            
            logger.info(f"為用戶 {user.username} 生成了 {len(result['posts'])} 條推薦")
            return result
            
        except Exception as e:
            logger.error(f"獲取推薦失敗: {str(e)}")
            return self._get_fallback_result(page, page_size, str(e))
    
    def _generate_recommendations(self, user: "AbstractUser", page_size: int) -> tuple:
        """
        生成推薦內容
        
        Args:
            user: 目標用戶
            page_size: 頁面大小
            
        Returns:
            tuple: (推薦列表, 分解數據)
        """
        # 計算各類推薦的數量分配
        distribution = PostCountCalculator.calculate_distribution(page_size, self.config.WEIGHTS)
        
        recommendations = []
        
        # 1. 獲取追蹤用戶貼文
        following_posts = self._get_following_posts(user, distribution['following'])
        recommendations.extend(following_posts)
        
        # 2. 獲取熱門貼文（排除已添加的）
        exclude_ids = [post['id'] for post in recommendations]
        trending_posts = self._get_trending_posts(user, distribution['trending'], exclude_ids)
        recommendations.extend(trending_posts)
        
        # 3. 獲取個性化推薦（排除已添加的）
        exclude_ids = [post['id'] for post in recommendations]
        personalized_posts = self._get_personalized_posts(user, distribution['personalized'], exclude_ids)
        recommendations.extend(personalized_posts)
        
        breakdown = {
            'following': len(following_posts),
            'trending': len(trending_posts),
            'personalized': len(personalized_posts)
        }
        
        return recommendations, breakdown
    
    def _get_fallback_result(self, page: int, page_size: int, error: str) -> Dict[str, Any]:
        """獲取後備結果（當發生錯誤時）"""
        return {
            'posts': [],
            'page': page,
            'page_size': page_size,
            'total_count': 0,
            'has_next': False,
            'error': error
        }
    
    def _get_following_posts(self, user: "AbstractUser", limit: int) -> List[Dict[str, Any]]:
        """
        獲取追蹤用戶的貼文
        
        Args:
            user: 目標用戶
            limit: 限制數量
        
        Returns:
            追蹤用戶的貼文列表
        """
        try:
            # 動態導入模型
            Post, Like, PostView, Comment, Follow = get_models()
            
            # 獲取用戶追蹤的人
            following_users = Follow.objects.filter(follower=user).values_list('following', flat=True)
            
            if not following_users:
                return []
            
            # 獲取追蹤用戶的最新貼文（按時間倒序）
            posts = Post.objects.filter(
                author__in=following_users,
                is_published=True,
                created_at__gte=timezone.now() - timedelta(days=7)  # 最近一週
            ).select_related('author').order_by('-created_at')[:limit]
            
            return self._serialize_posts(posts, recommendation_type='following')
            
        except Exception as e:
            logger.error(f"獲取追蹤用戶貼文失敗: {str(e)}")
            return []
    
    def _get_trending_posts(self, user: "AbstractUser", limit: int, exclude_ids: List[str] = None) -> List[Dict[str, Any]]:
        """
        獲取熱門貼文
        
        Args:
            user: 目標用戶
            limit: 限制數量
            exclude_ids: 要排除的貼文ID列表
        
        Returns:
            熱門貼文列表
        """
        try:
            # 動態導入模型
            Post, Like, PostView, Comment, Follow = get_models()
            
            exclude_ids = exclude_ids or []
            
            # 計算熱門分數（綜合點讚數、評論數、瀏覽數和時間衰減）
            one_week_ago = timezone.now() - timedelta(days=7)
            
            posts = Post.objects.filter(
                is_published=True,
                created_at__gte=one_week_ago
            ).exclude(
                id__in=exclude_ids
            ).exclude(
                author=user  # 排除自己的貼文
            ).annotate(
                # 熱門分數計算
                trending_score=F('likes_count') * 2 + F('comments_count') * 3 + F('views_count') * 0.1
            ).select_related('author').order_by('-trending_score')[:limit]
            
            return self._serialize_posts(posts, recommendation_type='trending')
            
        except Exception as e:
            logger.error(f"獲取熱門貼文失敗: {str(e)}")
            return []
    
    def _get_personalized_posts(self, user: "AbstractUser", limit: int, exclude_ids: List[str] = None) -> List[Dict[str, Any]]:
        """
        獲取個性化推薦貼文
        
        基於用戶的技能標籤、互動歷史等進行推薦
        
        Args:
            user: 目標用戶
            limit: 限制數量
            exclude_ids: 要排除的貼文ID列表
        
        Returns:
            個性化推薦貼文列表
        """
        try:
            # 動態導入模型
            Post, Like, PostView, Comment, Follow = get_models()
            
            exclude_ids = exclude_ids or []
            
            # 獲取用戶的技能標籤
            user_skills = getattr(user, 'skill_tags', []) or []
            
            # 獲取用戶最近點讚和評論的貼文作者
            recent_interactions = self._get_user_interactions(user, days=30)
            preferred_authors = [interaction['author_id'] for interaction in recent_interactions]
            
            # 構建查詢
            query = Q(is_published=True)
            query &= ~Q(id__in=exclude_ids)
            query &= ~Q(author=user)  # 排除自己的貼文
            
            # 技能標籤匹配分數
            skill_conditions = []
            for skill in user_skills:
                skill_conditions.append(
                    When(
                        Q(content__icontains=skill) | Q(code_snippet__icontains=skill),
                        then=1
                    )
                )
            
            # 作者偏好分數
            author_conditions = []
            for author_id in preferred_authors:
                author_conditions.append(
                    When(author_id=author_id, then=1)
                )
            
            # 如果沒有條件，使用簡單查詢
            if not skill_conditions and not author_conditions:
                posts = Post.objects.filter(query).select_related('author').order_by('-likes_count')[:limit]
            else:
                posts = Post.objects.filter(query).annotate(
                    skill_match_score=Case(
                        *skill_conditions,
                        default=0,
                        output_field=IntegerField()
                    ) if skill_conditions else 0,
                    author_preference_score=Case(
                        *author_conditions,
                        default=0,
                        output_field=IntegerField()
                    ) if author_conditions else 0,
                    # 個性化分數計算
                    personalized_score=F('likes_count') * 0.5
                ).select_related('author').order_by('-personalized_score')[:limit]
            
            return self._serialize_posts(posts, recommendation_type='personalized')
            
        except Exception as e:
            logger.error(f"獲取個性化推薦失敗: {str(e)}")
            return []
    
    def _get_user_interactions(self, user: "AbstractUser", days: int = 30) -> List[Dict[str, Any]]:
        """
        獲取用戶最近的互動記錄
        
        Args:
            user: 用戶
            days: 天數
        
        Returns:
            互動記錄列表
        """
        try:
            # 動態導入模型
            Post, Like, PostView, Comment, Follow = get_models()
            
            since_date = timezone.now() - timedelta(days=days)
            
            # 獲取點讚記錄
            likes = Like.objects.filter(
                user=user,
                created_at__gte=since_date
            ).select_related('post__author').values(
                'post__author__id',
                'post__author__username'
            )
            
            # 獲取評論記錄（如果評論模型存在）
            interactions = []
            for like in likes:
                interactions.append({
                    'author_id': like['post__author__id'],
                    'author_username': like['post__author__username'],
                    'type': 'like'
                })
            
            # 如果評論模型存在，也獲取評論記錄
            if Comment:
                comments = Comment.objects.filter(
                    author=user,
                    created_at__gte=since_date
                ).select_related('post__author').values(
                    'post__author__id',
                    'post__author__username'
                )
                
                for comment in comments:
                    interactions.append({
                        'author_id': comment['post__author__id'],
                        'author_username': comment['post__author__username'],
                        'type': 'comment'
                    })
            
            return interactions
            
        except Exception as e:
            logger.error(f"獲取用戶互動記錄失敗: {str(e)}")
            return []
    
    def _shuffle_recommendations(self, recommendations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        混合推薦結果，保持一定的隨機性和多樣性
        
        Args:
            recommendations: 原始推薦列表
        
        Returns:
            混合後的推薦列表
        """
        try:
            # 按推薦類型分組
            following = [r for r in recommendations if r.get('recommendation_type') == 'following']
            trending = [r for r in recommendations if r.get('recommendation_type') == 'trending']
            personalized = [r for r in recommendations if r.get('recommendation_type') == 'personalized']
            
            # 交替混合不同類型的推薦
            mixed = []
            max_len = max(len(following), len(trending), len(personalized))
            
            for i in range(max_len):
                if i < len(following):
                    mixed.append(following[i])
                if i < len(trending):
                    mixed.append(trending[i])
                if i < len(personalized):
                    mixed.append(personalized[i])
            
            # 添加一些隨機性
            if mixed:
                # 隨機交換一些位置（不超過20%）
                swap_count = min(len(mixed) // 5, 10)
                for _ in range(swap_count):
                    i, j = random.sample(range(len(mixed)), 2)
                    mixed[i], mixed[j] = mixed[j], mixed[i]
            
            return mixed
            
        except Exception as e:
            logger.error(f"混合推薦結果失敗: {str(e)}")
            return recommendations
    
    def _serialize_posts(self, posts, recommendation_type: str = 'default') -> List[Dict[str, Any]]:
        """
        序列化貼文列表
        
        Args:
            posts: 貼文查詢集
            recommendation_type: 推薦類型
        
        Returns:
            序列化後的貼文列表
        """
        try:
            serialized_posts = []
            
            for post in posts:
                # 基本信息
                post_data = {
                    'id': str(post.id),
                    'content': post.content,
                    'code_snippet': getattr(post, 'code_snippet', ''),
                    'code_language': getattr(post, 'code_language', ''),
                    'author': {
                        'id': str(post.author.id),
                        'username': post.author.username,
                        'display_name': getattr(post.author, 'display_name', post.author.username),
                        'avatar': getattr(post.author, 'avatar_url', ''),
                    },
                    'created_at': post.created_at.isoformat(),
                    'updated_at': post.updated_at.isoformat(),
                    'likes_count': getattr(post, 'likes_count', 0),
                    'comments_count': getattr(post, 'comments_count', 0),
                    'views_count': getattr(post, 'views_count', 0),
                    'recommendation_type': recommendation_type,
                    'recommendation_score': getattr(post, 'trending_score', 0) or getattr(post, 'personalized_score', 0),
                }
                
                # 媒體文件（如果存在）
                try:
                    if hasattr(post, 'media') and post.media.exists():
                        post_data['media'] = [
                            {
                                'id': str(media.id),
                                'url': media.file.url,
                                'type': media.media_type,
                            } for media in post.media.all()
                        ]
                    else:
                        post_data['media'] = []
                except Exception:
                    post_data['media'] = []
                
                # 標籤（如果存在）
                try:
                    if hasattr(post, 'tags') and post.tags.exists():
                        post_data['tags'] = [tag.name for tag in post.tags.all()]
                    else:
                        post_data['tags'] = []
                except Exception:
                    post_data['tags'] = []
                
                serialized_posts.append(post_data)
            
            return serialized_posts
            
        except Exception as e:
            logger.error(f"序列化貼文失敗: {str(e)}")
            return []
    
    def update_user_preferences(self, user: "AbstractUser", post: "Post", action: str):
        """
        更新用戶偏好（基於用戶行為）
        
        Args:
            user: 用戶
            post: 貼文
            action: 行為類型（like, comment, view, share）
        """
        try:
            # 在真實應用中，這裡可以使用機器學習模型來更新用戶偏好
            # 目前簡單記錄用戶行為以供後續分析
            
            preference_key = f"user_preferences_{user.id}"
            preferences = cache.get(preference_key, {})
            
            # 更新作者偏好
            author_id = str(post.author.id)
            if 'preferred_authors' not in preferences:
                preferences['preferred_authors'] = {}
            
            if author_id not in preferences['preferred_authors']:
                preferences['preferred_authors'][author_id] = 0
            
            # 根據行為類型增加不同的權重
            action_weights = {
                'view': 1,
                'like': 3,
                'comment': 5,
                'share': 4
            }
            
            preferences['preferred_authors'][author_id] += action_weights.get(action, 1)
            
            # 更新技能標籤偏好
            if post.code_snippet and post.code_language:
                if 'preferred_languages' not in preferences:
                    preferences['preferred_languages'] = {}
                
                language = post.code_language
                if language not in preferences['preferred_languages']:
                    preferences['preferred_languages'][language] = 0
                
                preferences['preferred_languages'][language] += action_weights.get(action, 1)
            
            # 更新內容主題偏好（基於內容關鍵詞）
            content_keywords = self._extract_keywords(post.content)
            if content_keywords:
                if 'preferred_topics' not in preferences:
                    preferences['preferred_topics'] = {}
                
                for keyword in content_keywords:
                    if keyword not in preferences['preferred_topics']:
                        preferences['preferred_topics'][keyword] = 0
                    
                    preferences['preferred_topics'][keyword] += action_weights.get(action, 1)
            
            # 緩存用戶偏好（1週）
            cache.set(preference_key, preferences, 604800)
            
            logger.debug(f"更新用戶 {user.username} 偏好: {action} on post {post.id}")
            
        except Exception as e:
            logger.error(f"更新用戶偏好失敗: {str(e)}")
    
    def _extract_keywords(self, content: str, max_keywords: int = 10) -> List[str]:
        """
        從內容中提取關鍵詞
        
        Args:
            content: 內容文本
            max_keywords: 最大關鍵詞數量
        
        Returns:
            關鍵詞列表
        """
        try:
            if not content:
                return []
            
            # 簡單的關鍵詞提取（在實際應用中可以使用更高級的NLP技術）
            # 移除常見停用詞
            stop_words = {
                '的', '是', '在', '有', '和', '了', '與', '或', '但', '如果', '因為',
                'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
                'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during'
            }
            
            # 分詞並過濾
            import re
            words = re.findall(r'\b[a-zA-Z\u4e00-\u9fff]{2,}\b', content.lower())
            keywords = [word for word in words if word not in stop_words and len(word) > 2]
            
            # 統計詞頻
            word_freq = {}
            for word in keywords:
                word_freq[word] = word_freq.get(word, 0) + 1
            
            # 按頻率排序並返回前N個
            sorted_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)
            return [word for word, freq in sorted_keywords[:max_keywords]]
            
        except Exception as e:
            logger.error(f"提取關鍵詞失敗: {str(e)}")
            return []


class RecommendationAnalytics:
    """
    推薦系統分析工具
    
    用於監控和優化推薦效果
    """
    
    @staticmethod
    def calculate_ctr(user: "AbstractUser", days: int = 7) -> float:
        """
        計算點擊率（Click-Through Rate）
        
        Args:
            user: 用戶
            days: 統計天數
        
        Returns:
            點擊率
        """
        try:
            # 動態導入模型
            Post, Like, PostView, Comment, Follow = get_models()
            
            since_date = timezone.now() - timedelta(days=days)
            
            # 獲取推薦的貼文數量（從緩存或日誌中獲取）
            recommended_count = cache.get(f"recommended_count_{user.id}_{days}", 0)
            
            # 獲取用戶實際點擊（瀏覽、點讚、評論）的數量
            clicked_count = PostView.objects.filter(
                user=user,
                created_at__gte=since_date
            ).count()
            
            if recommended_count == 0:
                return 0.0
            
            return clicked_count / recommended_count
            
        except Exception as e:
            logger.error(f"計算點擊率失敗: {str(e)}")
            return 0.0
    
    @staticmethod
    def get_recommendation_diversity(recommendations: List[Dict[str, Any]]) -> float:
        """
        計算推薦多樣性
        
        Args:
            recommendations: 推薦列表
        
        Returns:
            多樣性分數（0-1）
        """
        try:
            if not recommendations:
                return 0.0
            
            # 計算作者多樣性
            authors = set()
            languages = set()
            topics = set()
            
            for rec in recommendations:
                if rec.get('author', {}).get('id'):
                    authors.add(rec['author']['id'])
                
                if rec.get('code_language'):
                    languages.add(rec['code_language'])
                
                # 簡單的主題分類（可以改進）
                content = rec.get('content', '').lower()
                if 'ai' in content or 'machine learning' in content:
                    topics.add('ai')
                elif 'web' in content or 'frontend' in content:
                    topics.add('web')
                elif 'backend' in content or 'server' in content:
                    topics.add('backend')
                elif 'mobile' in content or 'app' in content:
                    topics.add('mobile')
                else:
                    topics.add('general')
            
            # 計算綜合多樣性分數
            author_diversity = len(authors) / len(recommendations)
            language_diversity = len(languages) / max(1, len([r for r in recommendations if r.get('code_language')]))
            topic_diversity = len(topics) / len(recommendations)
            
            return (author_diversity + language_diversity + topic_diversity) / 3
            
        except Exception as e:
            logger.error(f"計算推薦多樣性失敗: {str(e)}")
            return 0.0


# 創建全域推薦引擎實例
recommendation_engine = RecommendationEngine() 