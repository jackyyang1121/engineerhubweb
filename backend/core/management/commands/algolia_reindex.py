"""
Django 管理命令：重新建立 Algolia 索引

使用方法：
    python manage.py algolia_reindex
    python manage.py algolia_reindex --model Post
    python manage.py algolia_reindex --model User
    python manage.py algolia_reindex --clear
"""

from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth import get_user_model

from posts.models import Post
from core.search import search_service

User = get_user_model()


class Command(BaseCommand):
    help = '重新建立 Algolia 搜尋索引'

    def add_arguments(self, parser):
        parser.add_argument(
            '--model',
            type=str,
            choices=['Post', 'User', 'all'],
            default='all',
            help='指定要重新索引的模型 (Post, User, or all)'
        )
        
        parser.add_argument(
            '--clear',
            action='store_true',
            help='清除現有索引後重新建立'
        )
        
        parser.add_argument(
            '--batch-size',
            type=int,
            default=1000,
            help='批次處理大小'
        )
        
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='顯示詳細的處理過程'
        )

    def handle(self, *args, **options):
        model_choice = options['model']
        clear_index = options['clear']
        batch_size = options['batch_size']
        verbose = options['verbose']
        
        self.stdout.write(
            self.style.SUCCESS('開始重新建立 Algolia 索引...')
        )
        
        try:
            # 檢查 Algolia 配置
            if not settings.ALGOLIA.get('APPLICATION_ID') or not settings.ALGOLIA.get('API_KEY'):
                raise CommandError('Algolia 配置不完整，請檢查 ALGOLIA_APPLICATION_ID 和 ALGOLIA_API_KEY')
            
            total_indexed = 0
            
            # 重新索引貼文
            if model_choice in ['Post', 'all']:
                posts_count = self._reindex_posts(clear_index, batch_size, verbose)
                total_indexed += posts_count
                self.stdout.write(
                    self.style.SUCCESS(f'✅ 成功索引 {posts_count} 篇貼文')
                )
            
            # 重新索引用戶
            if model_choice in ['User', 'all']:
                users_count = self._reindex_users(clear_index, batch_size, verbose)
                total_indexed += users_count
                self.stdout.write(
                    self.style.SUCCESS(f'✅ 成功索引 {users_count} 個用戶')
                )
            
            self.stdout.write(
                self.style.SUCCESS(f'🎉 索引重建完成！總共處理了 {total_indexed} 個項目')
            )
            
        except Exception as e:
            raise CommandError(f'索引重建失敗: {str(e)}')

    def _reindex_posts(self, clear_index, batch_size, verbose):
        """重新索引貼文"""
        from algoliasearch_django import get_adapter
        
        if verbose:
            self.stdout.write('開始處理貼文索引...')
        
        # 獲取需要索引的貼文
        posts = Post.objects.filter(is_published=True).select_related('author')
        total_posts = posts.count()
        
        if verbose:
            self.stdout.write(f'找到 {total_posts} 篇需要索引的貼文')
        
        if clear_index:
            if verbose:
                self.stdout.write('清除現有的貼文索引...')
            try:
                search_service.posts_index.clear_objects()
                if verbose:
                    self.stdout.write(self.style.WARNING('現有貼文索引已清除'))
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'清除貼文索引時發生錯誤: {str(e)}')
                )
        
        # 批次處理索引
        indexed_count = 0
        adapter = get_adapter(Post)
        
        for i in range(0, total_posts, batch_size):
            batch_posts = posts[i:i + batch_size]
            
            try:
                # 使用 Algolia Django 適配器進行批次索引
                adapter.update_records(batch_posts)
                indexed_count += len(batch_posts)
                
                if verbose:
                    self.stdout.write(f'已索引 {indexed_count}/{total_posts} 篇貼文')
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'索引貼文批次 {i}-{i+batch_size} 時發生錯誤: {str(e)}')
                )
        
        return indexed_count

    def _reindex_users(self, clear_index, batch_size, verbose):
        """重新索引用戶"""
        from algoliasearch_django import get_adapter
        
        if verbose:
            self.stdout.write('開始處理用戶索引...')
        
        # 獲取需要索引的用戶
        users = User.objects.filter(is_active=True)
        total_users = users.count()
        
        if verbose:
            self.stdout.write(f'找到 {total_users} 個需要索引的用戶')
        
        if clear_index:
            if verbose:
                self.stdout.write('清除現有的用戶索引...')
            try:
                search_service.users_index.clear_objects()
                if verbose:
                    self.stdout.write(self.style.WARNING('現有用戶索引已清除'))
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'清除用戶索引時發生錯誤: {str(e)}')
                )
        
        # 批次處理索引
        indexed_count = 0
        adapter = get_adapter(User)
        
        for i in range(0, total_users, batch_size):
            batch_users = users[i:i + batch_size]
            
            try:
                # 使用 Algolia Django 適配器進行批次索引
                adapter.update_records(batch_users)
                indexed_count += len(batch_users)
                
                if verbose:
                    self.stdout.write(f'已索引 {indexed_count}/{total_users} 個用戶')
                    
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'索引用戶批次 {i}-{i+batch_size} 時發生錯誤: {str(e)}')
                )
        
        return indexed_count 