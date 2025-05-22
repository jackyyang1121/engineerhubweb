"""
EngineerHub 核心URL配置

定義核心功能的API路由
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

app_name = 'core'

# API路由
urlpatterns = [
    # 搜尋相關API
    path('search/', views.SearchAPIView.as_view(), name='search'),
    path('search/suggestions/', views.SearchSuggestionsAPIView.as_view(), name='search-suggestions'),
    path('search/history/', views.SearchHistoryAPIView.as_view(), name='search-history'),
    
    # 通知相關API
    path('notifications/', views.NotificationListAPIView.as_view(), name='notifications'),
    path('notifications/<uuid:notification_id>/', views.NotificationDetailAPIView.as_view(), name='notification-detail'),
    path('notifications/mark-all-read/', views.mark_all_notifications_read, name='mark-all-notifications-read'),
    
    # 舉報相關API
    path('report/', views.ReportContentAPIView.as_view(), name='report-content'),
    
    # 平台統計API
    path('stats/', views.PlatformStatsAPIView.as_view(), name='platform-stats'),
    
    # 熱門話題API
    path('trending/', views.trending_topics, name='trending-topics'),
] 