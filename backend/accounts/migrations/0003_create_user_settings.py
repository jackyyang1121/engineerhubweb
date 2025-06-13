"""
數據遷移：為現有用戶創建 UserSettings 記錄

此遷移確保所有現有用戶都有對應的 UserSettings 記錄，
避免在訪問 user.settings 時出現 DoesNotExist 錯誤
"""

from django.db import migrations


def create_user_settings_for_existing_users(apps, schema_editor):
    """
    為所有現有用戶創建 UserSettings 記錄
    
    Args:
        apps: Django 應用註冊表
        schema_editor: 數據庫模式編輯器
    """
    # 獲取模型類（使用遷移時的歷史版本）
    User = apps.get_model('accounts', 'User')
    UserSettings = apps.get_model('accounts', 'UserSettings')
    
    # 查找所有沒有 UserSettings 的用戶
    users_without_settings = User.objects.filter(settings__isnull=True)
    
    # 為這些用戶批量創建默認設置
    settings_to_create = []
    for user in users_without_settings:
        settings_to_create.append(
            UserSettings(
                user=user,
                email_notifications=True,
                push_notifications=True,
                notification_new_follower=True,
                notification_post_like=True,
                notification_post_comment=True,
                notification_comment_reply=True,
                notification_mention=True,
                notification_new_message=True,
                profile_visibility='public',
                show_online_status=True,
                allow_mentions=True,
                theme='auto',
                language='zh-hant'
            )
        )
    
    # 批量創建設置記錄
    if settings_to_create:
        UserSettings.objects.bulk_create(settings_to_create)
        print(f"為 {len(settings_to_create)} 個現有用戶創建了 UserSettings 記錄")


def reverse_create_user_settings(apps, schema_editor):
    """
    逆向操作：刪除在此遷移中創建的 UserSettings 記錄
    
    注意：實際上很難準確逆向此操作，因為我們無法區分
    哪些 UserSettings 是在此遷移中創建的，哪些是之後創建的
    """
    # 為安全起見，逆向操作不做任何事情
    pass


class Migration(migrations.Migration):
    """
    數據遷移類
    
    此遷移依賴於 UserSettings 模型已經存在，
    所以依賴於包含 UserSettings 創建的初始遷移
    """
    
    dependencies = [
        ('accounts', '0002_user_following'),
    ]

    operations = [
        migrations.RunPython(
            create_user_settings_for_existing_users,
            reverse_create_user_settings,
            hints={'target_db': 'default'}
        ),
    ] 