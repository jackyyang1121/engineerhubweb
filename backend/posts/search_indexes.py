"""
EngineerHub - Algolia 搜尋索引配置

定義各種模型的 Algolia 搜尋索引設置，包括：
1. 貼文搜尋索引
2. 用戶搜尋索引
3. 搜尋規則和排序
"""

from algoliasearch_django import AlgoliaIndex
from algoliasearch_django.decorators import register
from django.contrib.auth import get_user_model

from .models import Post

User = get_user_model()


@register(Post)
class PostIndex(AlgoliaIndex):
    """
    貼文搜尋索引
    支援內容、程式碼片段、作者等多維度搜尋
    """
    
    fields = [
        'id',
        'content',
        'code_snippet',
        'code_language',
        'author_username',
        'author_display_name',
        'author_avatar',
        'created_at',
        'updated_at',
        'likes_count',
        'comments_count',
        'is_published',
        'tags',
        'search_content',  # 自定義搜尋欄位
    ]
    
    # Algolia 索引設置
    settings = {
        # 可搜尋的屬性（按重要性排序）
        'searchableAttributes': [
            'unordered(content)',           # 貼文內容（最重要）
            'unordered(code_snippet)',      # 程式碼片段
            'unordered(author_username)',   # 作者用戶名
            'unordered(author_display_name)', # 作者顯示名稱
            'unordered(tags)',              # 標籤
        ],
        
        # 用於過濾的屬性
        'attributesForFaceting': [
            'code_language',
            'author_username',
            'is_published',
            'created_at',
            'tags',
        ],
        
        # 自定義排序規則
        'customRanking': [
            'desc(likes_count)',      # 按讚數降序
            'desc(comments_count)',   # 留言數降序
            'desc(created_at)',       # 創建時間降序
        ],
        
        # 分頁設置
        'hitsPerPage': 20,
        'maxValuesPerFacet': 100,
        
        # 高亮設置
        'highlightPreTag': '<mark class="algolia-highlight">',
        'highlightPostTag': '</mark>',
        
        # 程式碼搜尋優化
        'removeWordsIfNoResults': 'lastWords',
        'minWordSizefor1Typo': 4,
        'minWordSizefor2Typos': 8,
        
        # 同義詞和停用詞
        'ignorePlurals': True,
        'removeStopWords': ['en', 'zh'],
        
        # 地理位置設置（暫不使用）
        'attributesToIndex': None,
    }
    
    # 只索引已發布的貼文
    should_index = 'is_published'
    
    def get_author_username(self, instance):
        """獲取作者用戶名"""
        return instance.author.username if instance.author else ''
    
    def get_author_display_name(self, instance):
        """獲取作者顯示名稱"""
        if instance.author:
            return f"{instance.author.first_name} {instance.author.last_name}".strip() or instance.author.username
        return ''
    
    def get_author_avatar(self, instance):
        """獲取作者頭像 URL"""
        if instance.author and instance.author.avatar:
            return instance.author.avatar.url
        return None
    
    def get_likes_count(self, instance):
        """獲取按讚數"""
        return instance.likes.count()
    
    def get_comments_count(self, instance):
        """獲取留言數"""
        return instance.comments.count()
    
    def get_tags(self, instance):
        """獲取標籤列表"""
        return instance.tags.values_list('name', flat=True) if hasattr(instance, 'tags') else []
    
    def get_search_content(self, instance):
        """
        生成專用的搜尋內容
        結合內容和程式碼片段，提高搜尋準確性
        """
        content_parts = []
        
        if instance.content:
            content_parts.append(instance.content)
        
        if instance.code_snippet:
            # 為程式碼片段添加語言標識
            if instance.code_language:
                content_parts.append(f"[{instance.code_language}] {instance.code_snippet}")
            else:
                content_parts.append(instance.code_snippet)
        
        # 添加作者資訊
        if instance.author:
            content_parts.append(f"by {instance.author.username}")
        
        return ' '.join(content_parts)


@register(User)
class UserIndex(AlgoliaIndex):
    """
    用戶搜尋索引
    支援用戶名、技能、個人簡介等搜尋
    """
    
    fields = [
        'id',
        'username',
        'first_name',
        'last_name',
        'display_name',
        'bio',
        'skills',
        'followers_count',
        'following_count',
        'posts_count',
        'avatar_url',
        'is_active',
        'date_joined',
        'location',
        'website',
        'github_url',
        'search_content',
    ]
    
    settings = {
        'searchableAttributes': [
            'unordered(username)',       # 用戶名（最重要）
            'unordered(display_name)',   # 顯示名稱
            'unordered(first_name)',     # 名字
            'unordered(last_name)',      # 姓氏
            'unordered(bio)',            # 個人簡介
            'unordered(skills)',         # 技能標籤
            'unordered(location)',       # 地點
        ],
        
        'attributesForFaceting': [
            'skills',
            'location',
            'is_active',
            'date_joined',
        ],
        
        'customRanking': [
            'desc(followers_count)',     # 粉絲數降序
            'desc(posts_count)',         # 貼文數降序
            'desc(date_joined)',         # 註冊時間降序
        ],
        
        'hitsPerPage': 20,
        'highlightPreTag': '<mark class="algolia-highlight">',
        'highlightPostTag': '</mark>',
        
        'removeWordsIfNoResults': 'lastWords',
        'minWordSizefor1Typo': 3,
        'minWordSizefor2Typos': 7,
    }
    
    # 只索引活躍用戶
    should_index = 'is_active'
    
    def get_display_name(self, instance):
        """獲取顯示名稱"""
        return f"{instance.first_name} {instance.last_name}".strip() or instance.username
    
    def get_followers_count(self, instance):
        """獲取粉絲數"""
        return getattr(instance, 'followers', None).count() if hasattr(instance, 'followers') else 0
    
    def get_following_count(self, instance):
        """獲取關注數"""
        return getattr(instance, 'following', None).count() if hasattr(instance, 'following') else 0
    
    def get_posts_count(self, instance):
        """獲取貼文數"""
        return instance.posts.filter(is_published=True).count()
    
    def get_avatar_url(self, instance):
        """獲取頭像 URL"""
        return instance.avatar.url if instance.avatar else None
    
    def get_skills(self, instance):
        """獲取技能列表"""
        if hasattr(instance, 'skills') and instance.skills:
            return instance.skills if isinstance(instance.skills, list) else []
        return []
    
    def get_location(self, instance):
        """獲取地點"""
        return getattr(instance, 'location', '') or ''
    
    def get_website(self, instance):
        """獲取個人網站"""
        return getattr(instance, 'website', '') or ''
    
    def get_github_url(self, instance):
        """獲取 GitHub URL"""
        return getattr(instance, 'github_url', '') or ''
    
    def get_search_content(self, instance):
        """
        生成專用的搜尋內容
        結合用戶的各種資訊
        """
        content_parts = []
        
        # 基本資訊
        content_parts.append(instance.username)
        
        if instance.first_name or instance.last_name:
            content_parts.append(f"{instance.first_name} {instance.last_name}".strip())
        
        if instance.bio:
            content_parts.append(instance.bio)
        
        # 技能標籤
        skills = self.get_skills(instance)
        if skills:
            content_parts.extend(skills)
        
        # 地點
        location = self.get_location(instance)
        if location:
            content_parts.append(location)
        
        return ' '.join(content_parts) 