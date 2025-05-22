from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NotificationViewSet, NotificationSettingsViewSet, NotificationTemplateViewSet

# 創建路由器
router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notification')
router.register(r'settings', NotificationSettingsViewSet, basename='notification-settings')
router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')

app_name = 'notifications'

urlpatterns = [
    path('', include(router.urls)),
] 