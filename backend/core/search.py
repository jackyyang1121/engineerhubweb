"""
EngineerHub 搜尋系統 - Algolia 版本

企業級搜尋服務，基於 Algolia 提供：
1. 用戶搜尋（姓名、技能標籤）
2. 貼文搜尋（內容、程式碼片段）
3. 高效的全文搜尋和即時建議
4. 搜尋分析和歷史記錄
"""

import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from django.conf import settings
from django.core.cache import cache
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from django.db import models 

from algoliasearch.search_client import SearchClient
from algoliasearch.exceptions import AlgoliaException

from posts.models import Post
from .models import SearchHistory

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.search')

User = get_user_model()


class AlgoliaSearchService:
    """
    Algolia 搜尋服務類
    提供統一的搜尋介面和功能
    """
    
    def __init__(self):
        # 檢查 Algolia 配置是否可用
        self.algolia_enabled = settings.ALGOLIA.get('ENABLED', False)
        
        if self.algolia_enabled and settings.ALGOLIA.get('APPLICATION_ID') and settings.ALGOLIA.get('API_KEY'):
            try:
                # Algolia 客戶端初始化
                self.client = SearchClient.create(
                    settings.ALGOLIA['APPLICATION_ID'],
                    settings.ALGOLIA['API_KEY']
                )
                
                # 索引名稱
                self.posts_index_name = f"{settings.ALGOLIA['INDEX_PREFIX']}_Post"
                self.users_index_name = f"{settings.ALGOLIA['INDEX_PREFIX']}_User"
                
                # 取得索引實例
                self.posts_index = self.client.init_index(self.posts_index_name)
                self.users_index = self.client.init_index(self.users_index_name)
                
                logger.info("Algolia 搜尋服務已初始化")
            except Exception as e:
                logger.warning(f"Algolia 初始化失敗，將使用數據庫搜尋: {str(e)}")
                self.algolia_enabled = False
                self.client = None
                self.posts_index = None
                self.users_index = None
        else:
            logger.info("Algolia 配置不完整，使用數據庫搜尋作為備用方案")
            self.algolia_enabled = False
            self.client = None
            self.posts_index = None
            self.users_index = None
        
        # 設定參數
        self.cache_timeout = getattr(settings, 'SEARCH_CACHE_TIMEOUT', 300)
        self.max_results = 50
        self.min_query_length = 2
    
    def search_posts(self, 
                    query: str, 
                    user_id: Optional[int] = None, 
                    limit: int = 20,
                    filters: Optional[Dict[str, Any]] = None,
                    facets: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        搜尋貼文
        
        Args:
            query: 搜尋關鍵字
            user_id: 當前用戶ID（用於記錄搜尋歷史）
            limit: 結果限制數量
            filters: 過濾條件 (例如: {'code_language': 'python'})
            facets: 需要的 facet 資訊
        
        Returns:
            包含貼文搜尋結果的字典
        """
        if len(query.strip()) < self.min_query_length:
            return {
                'posts': [], 
                'total': 0, 
                'query': query,
                'facets': {},
                'search_time': 0
            }
        
        # 如果 Algolia 不可用，返回空結果
        if not self.algolia_enabled:
            return {
                'posts': [], 
                'total': 0, 
                'query': query,
                'facets': {},
                'search_time': 0,
                'message': 'Algolia 搜尋服務暫時不可用，請稍後再試'
            }
        
        start_time = time.time()
        
        try:
            # 構建緩存鍵
            cache_key = f"search_posts_{query.lower()}_{limit}_{hash(str(filters))}"
            cached_result = cache.get(cache_key)
            
            if cached_result:
                logger.debug(f"從緩存獲取貼文搜尋結果: {query}")
                return cached_result
            
            # 構建搜尋參數
            search_params = {
                'hitsPerPage': min(limit, self.max_results),
                'attributesToRetrieve': [
                    'objectID', 'content', 'code_snippet', 'code_language',
                    'author_username', 'author_display_name', 'author_avatar',
                    'created_at', 'likes_count', 'comments_count', 'tags'
                ],
                'attributesToHighlight': ['content', 'code_snippet', 'author_username'],
                'highlightPreTag': '<mark class="search-highlight">',
                'highlightPostTag': '</mark>',
            }
            
            # 添加過濾條件
            if filters:
                filter_strings = []
                for key, value in filters.items():
                    if isinstance(value, list):
                        # 多值過濾: code_language:python OR code_language:javascript
                        filter_parts = [f"{key}:{v}" for v in value]
                        filter_strings.append(f"({' OR '.join(filter_parts)})")
                    else:
                        filter_strings.append(f"{key}:{value}")
                
                if filter_strings:
                    search_params['filters'] = ' AND '.join(filter_strings)
            
            # 添加 facets
            if facets:
                search_params['facets'] = facets
            
            # 執行搜尋
            response = self.posts_index.search(query, search_params)
            
            # 處理搜尋結果
            posts_data = []
            for hit in response['hits']:
                post_data = {
                    'id': hit.get('objectID'),
                    'content': self._extract_highlight(hit, 'content'),
                    'code_snippet': self._extract_highlight(hit, 'code_snippet'),
                    'code_language': hit.get('code_language'),
                    'author': {
                        'username': hit.get('author_username'),
                        'display_name': hit.get('author_display_name'),
                        'avatar': hit.get('author_avatar')
                    },
                    'created_at': hit.get('created_at'),
                    'likes_count': hit.get('likes_count', 0),
                    'comments_count': hit.get('comments_count', 0),
                    'tags': hit.get('tags', []),
                    '_highlightResult': hit.get('_highlightResult', {})
                }
                posts_data.append(post_data)
            
            search_time = time.time() - start_time
            
            result = {
                'posts': posts_data,
                'total': response.get('nbHits', 0),
                'query': query,
                'facets': response.get('facets', {}),
                'search_time': round(search_time, 3),
                'page': response.get('page', 0),
                'pages': response.get('nbPages', 1)
            }
            
            # 緩存結果
            cache.set(cache_key, result, self.cache_timeout)
            
            # 記錄搜尋歷史
            if user_id:
                self._save_search_history(user_id, query, 'post', len(posts_data), search_time)
            
            logger.info(f"貼文搜尋完成: '{query}' 找到 {len(posts_data)} 個結果, 耗時 {search_time:.3f}s")
            return result
            
        except AlgoliaException as e:
            logger.error(f"Algolia 貼文搜尋錯誤: {str(e)}")
            return {
                'posts': [], 
                'total': 0, 
                'query': query, 
                'error': f'搜尋服務錯誤: {str(e)}',
                'search_time': time.time() - start_time
            }
        except Exception as e:
            logger.error(f"貼文搜尋錯誤: {str(e)}")
            return {
                'posts': [], 
                'total': 0, 
                'query': query, 
                'error': '搜尋服務暫時不可用',
                'search_time': time.time() - start_time
            }
    
    def search_users(self, 
                    query: str, 
                    user_id: Optional[int] = None, 
                    limit: int = 20,
                    filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        搜尋用戶
        
        Args:
            query: 搜尋關鍵字
            user_id: 當前用戶ID（用於記錄搜尋歷史）
            limit: 結果限制數量
            filters: 過濾條件
        
        Returns:
            包含用戶搜尋結果的字典
        """
        if len(query.strip()) < self.min_query_length:
            return {
                'users': [], 
                'total': 0, 
                'query': query,
                'search_time': 0
            }
        
        # 如果 Algolia 不可用，返回空結果
        if not self.algolia_enabled:
            return {
                'users': [], 
                'total': 0, 
                'query': query,
                'search_time': 0,
                'message': 'Algolia 搜尋服務暫時不可用，請稍後再試'
            }
        
        start_time = time.time()
        
        try:
            # 構建緩存鍵
            cache_key = f"search_users_{query.lower()}_{limit}_{hash(str(filters))}"
            cached_result = cache.get(cache_key)
            
            if cached_result:
                logger.debug(f"從緩存獲取用戶搜尋結果: {query}")
                return cached_result
            
            # 構建搜尋參數
            search_params = {
                'hitsPerPage': min(limit, self.max_results),
                'attributesToRetrieve': [
                    'objectID', 'username', 'display_name', 'bio', 'skills',
                    'followers_count', 'posts_count', 'avatar_url', 'location'
                ],
                'attributesToHighlight': ['username', 'display_name', 'bio', 'skills'],
                'highlightPreTag': '<mark class="search-highlight">',
                'highlightPostTag': '</mark>',
            }
            
            # 添加過濾條件
            if filters:
                filter_strings = []
                for key, value in filters.items():
                    if isinstance(value, list):
                        filter_parts = [f"{key}:{v}" for v in value]
                        filter_strings.append(f"({' OR '.join(filter_parts)})")
                    else:
                        filter_strings.append(f"{key}:{value}")
                
                if filter_strings:
                    search_params['filters'] = ' AND '.join(filter_strings)
            
            # 執行搜尋
            response = self.users_index.search(query, search_params)
            
            # 處理搜尋結果
            users_data = []
            for hit in response['hits']:
                user_data = {
                    'id': hit.get('objectID'),
                    'username': self._extract_highlight(hit, 'username'),
                    'display_name': self._extract_highlight(hit, 'display_name'),
                    'bio': self._extract_highlight(hit, 'bio'),
                    'skills': hit.get('skills', []),
                    'followers_count': hit.get('followers_count', 0),
                    'posts_count': hit.get('posts_count', 0),
                    'avatar': hit.get('avatar_url'),
                    'location': hit.get('location'),
                    '_highlightResult': hit.get('_highlightResult', {})
                }
                users_data.append(user_data)
            
            search_time = time.time() - start_time
            
            result = {
                'users': users_data,
                'total': response.get('nbHits', 0),
                'query': query,
                'search_time': round(search_time, 3),
                'page': response.get('page', 0),
                'pages': response.get('nbPages', 1)
            }
            
            # 緩存結果
            cache.set(cache_key, result, self.cache_timeout)
            
            # 記錄搜尋歷史
            if user_id:
                self._save_search_history(user_id, query, 'user', len(users_data), search_time)
            
            logger.info(f"用戶搜尋完成: '{query}' 找到 {len(users_data)} 個結果, 耗時 {search_time:.3f}s")
            return result
            
        except AlgoliaException as e:
            logger.error(f"Algolia 用戶搜尋錯誤: {str(e)}")
            return {
                'users': [], 
                'total': 0, 
                'query': query, 
                'error': f'搜尋服務錯誤: {str(e)}',
                'search_time': time.time() - start_time
            }
        except Exception as e:
            logger.error(f"用戶搜尋錯誤: {str(e)}")
            return {
                'users': [], 
                'total': 0, 
                'query': query, 
                'error': '搜尋服務暫時不可用',
                'search_time': time.time() - start_time
            }
    
    def search_all(self, 
                  query: str, 
                  user_id: Optional[int] = None, 
                  limit: int = 20) -> Dict[str, Any]:
        """
        混合搜尋（用戶 + 貼文）
        
        Args:
            query: 搜尋關鍵字
            user_id: 當前用戶ID
            limit: 每種類型的結果限制數量
        
        Returns:
            包含混合搜尋結果的字典
        """
        start_time = time.time()
        
        # 並行搜尋用戶和貼文
        users_result = self.search_users(query, user_id, limit)
        posts_result = self.search_posts(query, user_id, limit)
        
        search_time = time.time() - start_time
        
        result = {
            'query': query,
            'users': users_result.get('users', []),
            'posts': posts_result.get('posts', []),
            'total_users': users_result.get('total', 0),
            'total_posts': posts_result.get('total', 0),
            'search_time': round(search_time, 3)
        }
        
        # 記錄混合搜尋歷史
        if user_id:
            total_results = len(result['users']) + len(result['posts'])
            self._save_search_history(user_id, query, 'mixed', total_results, search_time)
        
        return result
    
    def get_search_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """
        獲取搜尋建議（基於 Algolia Query Suggestions 或熱門搜尋）
        
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
            
            # 如果 Algolia 可用，從用戶索引獲取建議
            if self.algolia_enabled:
                try:
                    user_response = self.users_index.search(query, {
                        'hitsPerPage': limit,
                        'attributesToRetrieve': ['username'],
                        'restrictSearchableAttributes': ['username']
                    })
                    
                    for hit in user_response['hits']:
                        username = hit.get('username', '')
                        if username and username.lower().startswith(query.lower()):
                            suggestions.add(username)
                except:
                    pass
            
            # 從熱門搜尋歷史獲取建議
            try:
                popular_searches = SearchHistory.objects.filter(
                    query__istartswith=query,
                    created_at__gte=timezone.now() - timedelta(days=30)
                ).values('query').annotate(
                    count=models.Count('query')
                ).order_by('-count').values_list('query', flat=True)[:limit]
                
                suggestions.update(popular_searches)
            except:
                pass
            
            result = list(suggestions)[:limit]
            
            # 緩存建議
            cache.set(cache_key, result, 3600)  # 1小時緩存
            
            return result
            
        except Exception as e:
            logger.error(f"獲取搜尋建議錯誤: {str(e)}")
            return []
    
    def get_trending_searches(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        獲取熱門搜尋關鍵字
        
        Args:
            limit: 結果數量限制
        
        Returns:
            熱門搜尋列表
        """
        try:
            cache_key = "trending_searches"
            cached_result = cache.get(cache_key)
            
            if cached_result:
                return cached_result
            
            # 統計最近30天的熱門搜尋
            from django.db.models import Count
            trending = SearchHistory.objects.filter(
                created_at__gte=timezone.now() - timedelta(days=30)
            ).values('query').annotate(
                search_count=Count('query'),
                last_searched=models.Max('created_at')
            ).order_by('-search_count')[:limit]
            
            result = list(trending)
            
            # 緩存1小時
            cache.set(cache_key, result, 3600)
            
            return result
            
        except Exception as e:
            logger.error(f"獲取熱門搜尋錯誤: {str(e)}")
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
                'id': str(record.id),
                'query': record.query,
                'search_type': record.search_type,
                'results_count': record.results_count,
                'response_time': record.response_time,
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
    
    def reindex_all(self) -> Tuple[bool, str]:
        """
        重新建立所有索引
        
        Returns:
            (成功狀態, 訊息)
        """
        try:
            # 重新索引貼文
            posts_count = Post.objects.filter(is_published=True).count()
            logger.info(f"開始重新索引 {posts_count} 篇貼文...")
            
            # 重新索引用戶
            users_count = User.objects.filter(is_active=True).count()
            logger.info(f"開始重新索引 {users_count} 個用戶...")
            
            # 清除相關緩存
            cache.delete_many([
                key for key in cache.get_many(['search_posts_*', 'search_users_*']).keys()
            ])
            
            logger.info("索引重建完成")
            return True, f"成功重新索引 {posts_count} 篇貼文和 {users_count} 個用戶"
            
        except Exception as e:
            logger.error(f"重新索引錯誤: {str(e)}")
            return False, f"重新索引失敗: {str(e)}"
    
    def _extract_highlight(self, hit: Dict, field: str) -> str:
        """
        提取高亮內容，如果沒有高亮則返回原始內容
        
        Args:
            hit: Algolia 搜尋結果項目
            field: 欄位名稱
        
        Returns:
            高亮或原始內容
        """
        highlight_result = hit.get('_highlightResult', {})
        field_highlight = highlight_result.get(field, {})
        
        if field_highlight and 'value' in field_highlight:
            return field_highlight['value']
        
        return hit.get(field, '')
    
    def _save_search_history(self, 
                           user_id: int, 
                           query: str, 
                           search_type: str, 
                           results_count: int,
                           response_time: float):
        """
        保存搜尋歷史
        
        Args:
            user_id: 用戶ID
            query: 搜尋關鍵字
            search_type: 搜尋類型
            results_count: 結果數量
            response_time: 響應時間
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
                    results_count=results_count,
                    response_time=response_time
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


# 建立全局搜尋服務實例
search_service = AlgoliaSearchService() 