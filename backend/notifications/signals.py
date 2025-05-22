import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType

from .models import Notification, NotificationSettings, NotificationType
from .services import NotificationService

# 設置日誌記錄器
logger = logging.getLogger('engineerhub.notifications')


@receiver(post_save, sender='users.CustomUser')
def create_user_notification_settings(sender, instance, created, **kwargs):
    """
    為新用戶創建默認通知設置
    """
    if created:
        try:
            NotificationSettings.objects.create(user=instance)
            logger.info(f"為新用戶 {instance.username} 創建了默認通知設置")
        except Exception as e:
            logger.error(f"創建用戶通知設置失敗: {str(e)}")


@receiver(post_save, sender='users.UserFollowing')
def handle_follow_notification(sender, instance, created, **kwargs):
    """
    處理關注通知
    """
    if created:
        try:
            NotificationService.create_follow_notification(
                actor=instance.user,
                recipient=instance.following_user
            )
        except Exception as e:
            logger.error(f"創建關注通知失敗: {str(e)}")


@receiver(post_save, sender='posts.Like')
def handle_like_notification(sender, instance, created, **kwargs):
    """
    處理點讚通知
    """
    if created and hasattr(instance, 'post') and instance.post:
        try:
            # 確保不是用戶給自己的內容點讚
            if instance.user != instance.post.author:
                NotificationService.create_like_notification(
                    actor=instance.user,
                    recipient=instance.post.author,
                    target_object=instance.post
                )
        except Exception as e:
            logger.error(f"創建點讚通知失敗: {str(e)}")


@receiver(post_save, sender='comments.Comment')
def handle_comment_notification(sender, instance, created, **kwargs):
    """
    處理評論通知
    """
    if created:
        try:
            # 給貼文作者發送評論通知
            if instance.author != instance.post.author:
                NotificationService.create_comment_notification(
                    actor=instance.author,
                    recipient=instance.post.author,
                    target_object=instance
                )
            
            # 如果是回覆評論，給被回覆的評論作者發送通知
            if instance.parent and instance.author != instance.parent.author:
                NotificationService.create_reply_notification(
                    actor=instance.author,
                    recipient=instance.parent.author,
                    target_object=instance
                )
                
        except Exception as e:
            logger.error(f"創建評論通知失敗: {str(e)}")


@receiver(post_save, sender='chat.Message')
def handle_message_notification(sender, instance, created, **kwargs):
    """
    處理私信通知
    """
    if created:
        try:
            # 給對話中的其他參與者發送通知
            conversation = instance.conversation
            for participant in conversation.participants.exclude(id=instance.sender.id):
                NotificationService.create_message_notification(
                    actor=instance.sender,
                    recipient=participant,
                    target_object=instance
                )
        except Exception as e:
            logger.error(f"創建私信通知失敗: {str(e)}")


@receiver(post_save, sender='posts.Share')
def handle_share_notification(sender, instance, created, **kwargs):
    """
    處理分享通知
    """
    if created and hasattr(instance, 'post') and instance.post:
        try:
            # 確保不是用戶分享自己的內容
            if instance.user != instance.post.author:
                NotificationService.create_share_notification(
                    actor=instance.user,
                    recipient=instance.post.author,
                    target_object=instance.post
                )
        except Exception as e:
            logger.error(f"創建分享通知失敗: {str(e)}")


# 處理提及通知的信號
def handle_mention_notification(post_instance=None, comment_instance=None, mentions=None):
    """
    處理提及通知
    這個函數需要在檢測到提及時手動調用
    """
    if not mentions:
        return
    
    try:
        from users.models import CustomUser
        
        # 獲取所有被提及的用戶
        mentioned_users = CustomUser.objects.filter(username__in=mentions)
        
        for user in mentioned_users:
            if post_instance:
                # 貼文中的提及
                if user != post_instance.author:
                    NotificationService.create_mention_notification(
                        actor=post_instance.author,
                        recipient=user,
                        target_object=post_instance
                    )
            elif comment_instance:
                # 評論中的提及
                if user != comment_instance.author:
                    NotificationService.create_mention_notification(
                        actor=comment_instance.author,
                        recipient=user,
                        target_object=comment_instance
                    )
                    
    except Exception as e:
        logger.error(f"創建提及通知失敗: {str(e)}")


# 清理過期通知的信號
@receiver(post_delete, sender='posts.Post')
def clean_post_notifications(sender, instance, **kwargs):
    """
    清理與已刪除貼文相關的通知
    """
    try:
        content_type = ContentType.objects.get_for_model(instance)
        Notification.objects.filter(
            content_type=content_type,
            object_id=instance.id
        ).delete()
        logger.info(f"已清理與貼文 {instance.id} 相關的通知")
    except Exception as e:
        logger.error(f"清理貼文通知失敗: {str(e)}")


@receiver(post_delete, sender='comments.Comment')
def clean_comment_notifications(sender, instance, **kwargs):
    """
    清理與已刪除評論相關的通知
    """
    try:
        content_type = ContentType.objects.get_for_model(instance)
        Notification.objects.filter(
            content_type=content_type,
            object_id=instance.id
        ).delete()
        logger.info(f"已清理與評論 {instance.id} 相關的通知")
    except Exception as e:
        logger.error(f"清理評論通知失敗: {str(e)}")


@receiver(post_delete, sender='users.UserFollowing')
def clean_follow_notifications(sender, instance, **kwargs):
    """
    清理取消關注的通知
    """
    try:
        # 刪除關注通知
        Notification.objects.filter(
            type=NotificationType.FOLLOW,
            actor=instance.user,
            recipient=instance.following_user
        ).delete()
        logger.info(f"已清理 {instance.user.username} 關注 {instance.following_user.username} 的通知")
    except Exception as e:
        logger.error(f"清理關注通知失敗: {str(e)}")


@receiver(post_delete, sender='posts.Like')
def clean_like_notifications(sender, instance, **kwargs):
    """
    清理取消點讚的通知
    """
    try:
        if hasattr(instance, 'post') and instance.post:
            content_type = ContentType.objects.get_for_model(instance.post)
            Notification.objects.filter(
                type=NotificationType.LIKE,
                actor=instance.user,
                recipient=instance.post.author,
                content_type=content_type,
                object_id=instance.post.id
            ).delete()
            logger.info(f"已清理 {instance.user.username} 對貼文 {instance.post.id} 的點讚通知")
    except Exception as e:
        logger.error(f"清理點讚通知失敗: {str(e)}") 