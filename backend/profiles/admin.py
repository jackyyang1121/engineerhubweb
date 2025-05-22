from django.contrib import admin
from django.utils.html import format_html
from .models import Portfolio, PortfolioMedia

@admin.register(Portfolio)
class PortfolioAdmin(admin.ModelAdmin):
    """
    作品集管理界面
    """
    list_display = ('id', 'user', 'title', 'has_github', 'has_project', 'has_youtube', 'created_at')
    list_filter = ('created_at', 'user')
    search_fields = ('title', 'description', 'user__username')
    date_hierarchy = 'created_at'
    
    def has_github(self, obj):
        """
        檢查是否有 GitHub 連結
        """
        return bool(obj.github_link)
    
    has_github.boolean = True
    has_github.short_description = 'GitHub'
    
    def has_project(self, obj):
        """
        檢查是否有項目網址
        """
        return bool(obj.project_link)
    
    has_project.boolean = True
    has_project.short_description = '項目網址'
    
    def has_youtube(self, obj):
        """
        檢查是否有 YouTube 連結
        """
        return bool(obj.youtube_link)
    
    has_youtube.boolean = True
    has_youtube.short_description = 'YouTube'


@admin.register(PortfolioMedia)
class PortfolioMediaAdmin(admin.ModelAdmin):
    """
    作品集媒體管理界面
    """
    list_display = ('id', 'portfolio', 'media_type', 'file_preview', 'order', 'created_at')
    list_filter = ('media_type', 'created_at')
    search_fields = ('portfolio__title', 'portfolio__user__username')
    
    def file_preview(self, obj):
        """
        顯示媒體文件預覽
        """
        if obj.media_type == PortfolioMedia.MediaType.IMAGE:
            return format_html('<img src="{}" width="50" height="50" />', obj.file.url)
        elif obj.media_type == PortfolioMedia.MediaType.VIDEO:
            return format_html('<video width="50" height="50" controls><source src="{}"></video>', obj.file.url)
        return '無預覽'
    
    file_preview.short_description = '媒體預覽' 