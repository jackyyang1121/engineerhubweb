"""
EngineerHub 搜尋系統

企業級搜尋服務，支援：
1. 用戶搜尋（姓名、技能標籤）
2. 貼文搜尋（內容、程式碼片段）
3. 高效的全文搜尋
4. 搜尋建議和歷史記錄
"""

import logging
import re
from typing import List, Dict, Any, Optional
from django.db.models import Q, Count, F
from django.contrib.auth import get_user_model
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

from posts.models import Post
from .models import SearchHistory

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.search')

User = get_user_model()


class SearchService:
    """
    搜尋服務類
    提供統一的搜尋介面和功能
    """
    
    def __init__(self):
        self.cache_timeout = 300  # 5分鐘緩存
        self.max_results = 50
        self.min_query_length = 2
    
    def search_users(self, query: str, user_id: Optional[int] = None, limit: int = 20) -> Dict[str, Any]:
        """
        搜尋用戶
        
        Args:
            query: 搜尋關鍵字
            user_id: 當前用戶ID（用於記錄搜尋歷史）
            limit: 結果限制數量
        
        Returns:
            包含用戶搜尋結果的字典
        """
        if len(query.strip()) < self.min_query_length:
            return {'users': [], 'total': 0, 'query': query}
        
        try:
            # 構建緩存鍵
            cache_key = f"search_users_{query.lower()}_{limit}"
            cached_result = cache.get(cache_key)
            
            if cached_result:
                logger.debug(f"從緩存獲取用戶搜尋結果: {query}")
                return cached_result
            
            # 搜尋用戶名、姓名、技能標籤
            search_query = Q(username__icontains=query) | \
                          Q(first_name__icontains=query) | \
                          Q(last_name__icontains=query) | \
                          Q(bio__icontains=query)
            
            # 搜尋技能標籤（JSON字段）
            if hasattr(User, 'skills'):
                # 將技能數組轉換為可搜尋的字符串
                users_with_skills = User.objects.filter(
                    skills__isnull=False
                ).extra(
                    where=["LOWER(skills::text) LIKE %s"],
                    params=[f'%{query.lower()}%']
                )
                search_query |= Q(id__in=users_with_skills.values_list('id', flat=True))
            
            # 執行搜尋並排序
            users = User.objects.filter(
                search_query,
                is_active=True
            ).select_related().annotate(
                followers_count=Count('followers', distinct=True),
                posts_count=Count('posts', distinct=True)
            ).order_by(
                '-followers_count',  # 按關注者數量排序
                '-posts_count',      # 按貼文數量排序
                'username'
            )[:limit]
            
            # 序列化結果
            users_data = []
            for user in users:
                users_data.append({
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'bio': user.bio or '',
                    'avatar': user.avatar.url if user.avatar else None,
                    'skills': user.skills if hasattr(user, 'skills') else [],
                    'followers_count': user.followers_count,
                    'posts_count': user.posts_count,
                    'is_online': getattr(user, 'is_online', False)
                })
            
            result = {
                'users': users_data,
                'total': len(users_data),
                'query': query
            }
            
            # 緩存結果
            cache.set(cache_key, result, self.cache_timeout)
            
            # 記錄搜尋歷史
            if user_id:
                self._save_search_history(user_id, query, 'user', len(users_data))
            
            logger.info(f"用戶搜尋完成: '{query}' 找到 {len(users_data)} 個結果")
            return result
            
        except Exception as e:
            logger.error(f"用戶搜尋錯誤: {str(e)}")
            return {'users': [], 'total': 0, 'query': query, 'error': str(e)}
    
    def search_posts(self, query: str, user_id: Optional[int] = None, limit: int = 20) -> Dict[str, Any]:
        """
        搜尋貼文
        
        Args:
            query: 搜尋關鍵字
            user_id: 當前用戶ID
            limit: 結果限制數量
        
        Returns:
            包含貼文搜尋結果的字典
        """
        if len(query.strip()) < self.min_query_length:
            return {'posts': [], 'total': 0, 'query': query}
        
        try:
            # 構建緩存鍵
            cache_key = f"search_posts_{query.lower()}_{limit}"
            cached_result = cache.get(cache_key)
            
            if cached_result:
                logger.debug(f"從緩存獲取貼文搜尋結果: {query}")
                return cached_result
            
            # 構建搜尋查詢
            search_query = Q(content__icontains=query) | \
                          Q(code_snippet__icontains=query) | \
                          Q(author__username__icontains=query)
            
            # 使用 PostgreSQL 全文搜尋（如果可用）
            if hasattr(Post.objects, 'search'):
                search_vector = SearchVector('content', weight='A') + \
                               SearchVector('code_snippet', weight='B') + \
                               SearchVector('author__username', weight='C')
                search_query_pg = SearchQuery(query)
                
                posts = Post.objects.annotate(
                    search=search_vector,
                    rank=SearchRank(search_vector, search_query_pg)
                ).filter(
                    search=search_query_pg,
                    is_published=True
                ).select_related('author').prefetch_related(
                    'media', 'likes', 'comments'
                ).order_by('-rank', '-created_at')[:limit]
            else:
                # 降級為基本搜尋
                posts = Post.objects.filter(
                    search_query,
                    is_published=True
                ).select_related('author').prefetch_related(
                    'media', 'likes', 'comments'
                ).annotate(
                    likes_count=Count('likes', distinct=True),
                    comments_count=Count('comments', distinct=True)
                ).order_by(
                    '-likes_count',
                    '-comments_count',
                    '-created_at'
                )[:limit]
            
            # 序列化結果
            posts_data = []
            for post in posts:
                # 高亮搜尋關鍵字
                highlighted_content = self._highlight_text(post.content, query)
                highlighted_code = self._highlight_text(post.code_snippet, query) if post.code_snippet else None
                
                posts_data.append({
                    'id': str(post.id),
                    'content': highlighted_content,
                    'code_snippet': highlighted_code,
                    'code_language': post.code_language,
                    'author': {
                        'id': post.author.id,
                        'username': post.author.username,
                        'avatar': post.author.avatar.url if post.author.avatar else None
                    },
                    'created_at': post.created_at.isoformat(),
                    'likes_count': post.likes_count,
                    'comments_count': post.comments_count,
                    'has_media': post.media.exists(),
                    'media_count': post.media.count()
                })
            
            result = {
                'posts': posts_data,
                'total': len(posts_data),
                'query': query
            }
            
            # 緩存結果
            cache.set(cache_key, result, self.cache_timeout)
            
            # 記錄搜尋歷史
            if user_id:
                self._save_search_history(user_id, query, 'post', len(posts_data))
            
            logger.info(f"貼文搜尋完成: '{query}' 找到 {len(posts_data)} 個結果")
            return result
            
        except Exception as e:
            logger.error(f"貼文搜尋錯誤: {str(e)}")
            return {'posts': [], 'total': 0, 'query': query, 'error': str(e)}
    
    def get_search_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """
        獲取搜尋建議
        
        Args:
            query: 部分搜尋關鍵字
            limit: 建議數量限制
        
        Returns:
            搜尋建議列表
        """
        if len(query.strip()) < 2:
            return []
        
        try:
            cache_key = f"search_suggestions_{query.lower()}"
            cached_suggestions = cache.get(cache_key)
            
            if cached_suggestions:
                return cached_suggestions
            
            suggestions = set()
            
            # 從用戶名獲取建議
            user_suggestions = User.objects.filter(
                username__istartswith=query,
                is_active=True
            ).values_list('username', flat=True)[:limit]
            suggestions.update(user_suggestions)
            
            # 從技能標籤獲取建議
            if hasattr(User, 'skills'):
                users_with_skills = User.objects.filter(
                    skills__isnull=False
                ).values_list('skills', flat=True)
                
                for skills_list in users_with_skills:
                    if skills_list:
                        for skill in skills_list:
                            if skill.lower().startswith(query.lower()):
                                suggestions.add(skill)
                                if len(suggestions) >= limit:
                                    break
            
            # 從熱門搜尋歷史獲取建議
            popular_searches = SearchHistory.objects.filter(
                query__istartswith=query,
                created_at__gte=timezone.now() - timedelta(days=30)
            ).values('query').annotate(
                count=Count('query')
            ).order_by('-count').values_list('query', flat=True)[:limit]
            
            suggestions.update(popular_searches)
            
            result = list(suggestions)[:limit]
            
            # 緩存建議
            cache.set(cache_key, result, 3600)  # 1小時緩存
            
            return result
            
        except Exception as e:
            logger.error(f"獲取搜尋建議錯誤: {str(e)}")
            return []
    
    def get_search_history(self, user_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        """
        獲取用戶搜尋歷史
        
        Args:
            user_id: 用戶ID
            limit: 歷史記錄數量限制
        
        Returns:
            搜尋歷史列表
        """
        try:
            history = SearchHistory.objects.filter(
                user_id=user_id
            ).order_by('-created_at')[:limit]
            
            return [{
                'id': record.id,
                'query': record.query,
                'search_type': record.search_type,
                'results_count': record.results_count,
                'created_at': record.created_at.isoformat()
            } for record in history]
            
        except Exception as e:
            logger.error(f"獲取搜尋歷史錯誤: {str(e)}")
            return []
    
    def clear_search_history(self, user_id: int) -> bool:
        """
        清除用戶搜尋歷史
        
        Args:
            user_id: 用戶ID
        
        Returns:
            是否成功清除
        """
        try:
            deleted_count, _ = SearchHistory.objects.filter(user_id=user_id).delete()
            logger.info(f"用戶 {user_id} 清除了 {deleted_count} 條搜尋歷史")
            return True
        except Exception as e:
            logger.error(f"清除搜尋歷史錯誤: {str(e)}")
            return False
    
    def _highlight_text(self, text: str, query: str, max_length: int = 200) -> str:
        """
        高亮搜尋關鍵字
        
        Args:
            text: 原始文本
            query: 搜尋關鍵字
            max_length: 最大返回長度
        
        Returns:
            高亮後的文本片段
        """
        if not text or not query:
            return text[:max_length] if text else ''
        
        # 不區分大小寫的搜尋
        pattern = re.compile(re.escape(query), re.IGNORECASE)
        
        # 查找第一個匹配位置
        match = pattern.search(text)
        if not match:
            return text[:max_length]
        
        # 計算摘要範圍
        start_pos = max(0, match.start() - 50)
        end_pos = min(len(text), match.end() + 150)
        
        excerpt = text[start_pos:end_pos]
        
        # 高亮關鍵字
        highlighted = pattern.sub(f'<mark>\\g<0></mark>', excerpt)
        
        # 添加省略號
        if start_pos > 0:
            highlighted = '...' + highlighted
        if end_pos < len(text):
            highlighted = highlighted + '...'
        
        return highlighted
    
    def _save_search_history(self, user_id: int, query: str, search_type: str, results_count: int):
        """
        保存搜尋歷史
        
        Args:
            user_id: 用戶ID
            query: 搜尋關鍵字
            search_type: 搜尋類型
            results_count: 結果數量
        """
        try:
            # 避免重複記錄（相同用戶、關鍵字、類型在5分鐘內）
            recent_history = SearchHistory.objects.filter(
                user_id=user_id,
                query=query,
                search_type=search_type,
                created_at__gte=timezone.now() - timedelta(minutes=5)
            ).exists()
            
            if not recent_history:
                SearchHistory.objects.create(
                    user_id=user_id,
                    query=query,
                    search_type=search_type,
                    results_count=results_count
                )
                
                # 限制歷史記錄數量（保留最近100條）
                old_records = SearchHistory.objects.filter(
                    user_id=user_id
                ).order_by('-created_at')[100:]
                
                if old_records:
                    SearchHistory.objects.filter(
                        id__in=[record.id for record in old_records]
                    ).delete()
                    
        except Exception as e:
            logger.error(f"保存搜尋歷史錯誤: {str(e)}")


# 搜尋服務實例
search_service = SearchService() 