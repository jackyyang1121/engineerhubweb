# 工程師聚集地通知系統

## 概述

這是一個功能完整的通知系統，提供了從基礎通知到高級分析的全套功能。支持實時通知、智能聚合、個性化內容、統計分析等特性。

## 功能特性

### 🔔 基礎通知功能
- **多種通知類型**：關注、點讚、評論、回覆、提及、私信、分享、系統通知
- **通知模板系統**：支持自定義通知內容模板
- **用戶設置**：用戶可自定義通知偏好和勿擾時間
- **過期機制**：支持通知過期時間設置

### ⚡ 實時通知功能
- **WebSocket支持**：使用Django Channels實現實時通知推送
- **即時更新**：未讀數量實時更新
- **連接管理**：自動處理連接斷開和重連
- **心跳檢測**：保持連接穩定性

### 🧠 智能聚合功能
- **相似通知聚合**：自動合併相同類型的通知（如多個點讚）
- **減少通知疲勞**：避免用戶收到過多重複通知
- **靈活配置**：可配置聚合規則和時間窗口

### 🚀 高級分析功能
- **用戶參與度評分**：基於閱讀行為計算用戶活躍度
- **通知有效性分析**：分析不同類型通知的效果
- **高峰時間分析**：識別用戶最活躍的時間段
- **系統健康監控**：實時監控通知系統狀態

### 🎯 個性化功能
- **智能發送時間**：根據用戶活躍時間優化發送時機
- **個性化內容**：基於用戶偏好調整通知語調和風格
- **內容排程**：支持延時和定時發送通知

### 📊 管理和監控
- **批量操作**：支持批量創建、發送和管理通知
- **配額管理**：防止垃圾通知，設置發送頻率限制
- **撤回功能**：允許用戶撤回剛發送的通知
- **指標收集**：收集詳細的性能和使用指標

## 技術架構

### 核心組件

1. **NotificationService**：主要服務類，提供通知創建和管理功能
2. **NotificationAggregator**：通知聚合器，處理相似通知的合併
3. **NotificationAnalyzer**：分析器，提供統計和洞察功能
4. **NotificationScheduler**：排程器，優化通知發送時間
5. **NotificationPersonalizer**：個性化器，定制通知內容
6. **NotificationMetrics**：指標收集器，監控系統性能

### 異步任務系統

使用Celery處理以下異步任務：
- 郵件和推送通知發送
- 定期清理過期通知
- 用戶參與度分析
- 系統指標收集
- 個性化摘要發送

### WebSocket支持

- **NotificationConsumer**：處理用戶實時通知
- **NotificationAdminConsumer**：管理員監控界面

## 安裝和配置

### 1. 安裝依賴

```bash
pip install channels channels-redis celery redis
```

### 2. 設置配置

在 `settings.py` 中添加：

```python
# channels配置
ASGI_APPLICATION = 'engineerhub.asgi.application'
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}

# Celery配置
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'

# 通知系統配置
NOTIFICATION_SETTINGS = {
    'EMAIL_NOTIFICATIONS': True,
    'PUSH_NOTIFICATIONS': True,
    'DEFAULT_FROM_EMAIL': 'noreply@engineerhub.com',
}
```

### 3. 運行服務

```bash
# 啟動Redis
redis-server

# 啟動Celery worker
celery -A engineerhub worker -l info

# 啟動Celery beat（定時任務）
celery -A engineerhub beat -l info

# 啟動Django開發服務器
python manage.py runserver
```

## 使用方法

### 創建基本通知

```python
from notifications.services import NotificationService

# 創建關注通知
notification = NotificationService.create_follow_notification(
    actor=follower_user,
    recipient=followed_user
)

# 創建點讚通知
notification = NotificationService.create_like_notification(
    actor=liker_user,
    recipient=post_author,
    target_object=post
)
```

### 批量發送通知

```python
notifications_data = [
    {
        'recipient': user1,
        'notification_type': 'system',
        'title': '系統維護通知',
        'message': '系統將於今晚進行維護...'
    },
    # 更多通知...
]

count = NotificationService.bulk_send_notifications(notifications_data)
```

### 獲取用戶統計

```python
from notifications.services import NotificationService, NotificationAnalyzer

# 獲取用戶通知統計
stats = NotificationService.get_notification_statistics(user, days=30)

# 計算用戶參與度
engagement_score = NotificationAnalyzer.get_user_engagement_score(user)
```

### 使用管理命令

```bash
# 查看系統健康狀態
python manage.py notification_admin health_check

# 查看統計信息
python manage.py notification_admin stats --days 7

# 測試通知發送
python manage.py notification_admin test_notification --user-id 1

# 清理舊通知
python manage.py notification_admin cleanup --days 30

# 分析用戶參與度
python manage.py notification_admin user_engagement --days 30
```

## API接口

### 獲取通知列表

```
GET /api/notifications/
```

參數：
- `page`: 頁碼
- `type`: 通知類型過濾
- `is_read`: 閱讀狀態過濾

### 標記通知為已讀

```
POST /api/notifications/mark-read/
```

請求體：
```json
{
    "notification_ids": [1, 2, 3]
}
```

### 獲取通知統計

```
GET /api/notifications/statistics/
```

參數：
- `days`: 統計天數（默認30天）

### 搜索通知

```
GET /api/notifications/search/
```

參數：
- `q`: 搜索關鍵詞
- `type`: 通知類型
- `days`: 時間範圍

## WebSocket連接

### 前端連接示例

```javascript
const notificationSocket = new WebSocket(
    'ws://localhost:8000/ws/notifications/'
);

notificationSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    
    switch(data.type) {
        case 'new_notification':
            showNotification(data.notification);
            break;
        case 'unread_count_update':
            updateUnreadCount(data.count);
            break;
        case 'notification_revoked':
            removeNotification(data.notification_id);
            break;
    }
};

// 標記通知為已讀
function markAsRead(notificationIds) {
    notificationSocket.send(JSON.stringify({
        'type': 'mark_as_read',
        'notification_ids': notificationIds
    }));
}
```

## 監控和指標

### 系統指標

- 每小時/每日通知數量
- 通知閱讀率
- 未讀通知積壓
- 平均響應時間

### 用戶指標

- 個人參與度評分
- 閱讀習慣分析
- 活躍時間分析

### 健康檢查

系統會自動評估通知系統的健康狀態：
- **健康**：閱讀率 > 70%，未讀積壓 < 1000
- **良好**：閱讀率 > 50%，未讀積壓 < 5000
- **需要關注**：其他情況

## 定時任務

系統配置了以下定時任務：

```python
# celery_beat_schedule配置
CELERY_BEAT_SCHEDULE = {
    'cleanup-expired-notifications': {
        'task': 'notifications.tasks.cleanup_expired_notifications',
        'schedule': crontab(hour=2, minute=0),  # 每天凌晨2點
    },
    'send-weekly-digest': {
        'task': 'notifications.tasks.send_weekly_digest',
        'schedule': crontab(day_of_week=1, hour=9, minute=0),  # 每週一上午9點
    },
    'collect-metrics': {
        'task': 'notifications.tasks.collect_notification_metrics',
        'schedule': 300.0,  # 每5分鐘
    },
    'generate-engagement-report': {
        'task': 'notifications.tasks.generate_user_engagement_report',
        'schedule': crontab(hour=8, minute=0),  # 每天上午8點
    },
}
```

## 性能優化

### 數據庫優化

- 添加了合適的索引
- 使用select_related優化查詢
- 實現了分頁和限制

### 緩存策略

- 使用Redis緩存配額計數
- 緩存用戶設置和偏好
- 緩存統計數據

### 異步處理

- 郵件和推送通知異步發送
- 統計分析異步計算
- 批量操作使用任務隊列

## 安全考慮

- 驗證用戶權限
- 防止垃圾通知（配額限制）
- 輸入驗證和過濾
- WebSocket連接認證

## 故障排除

### 常見問題

1. **通知未實時更新**
   - 檢查Redis連接
   - 確認WebSocket連接正常
   - 查看Channels配置

2. **郵件通知未發送**
   - 檢查郵件配置
   - 確認Celery worker運行
   - 查看任務日誌

3. **性能問題**
   - 檢查數據庫索引
   - 監控Redis使用情況
   - 分析慢查詢

### 日誌監控

系統使用專門的日誌記錄器：

```python
logger = logging.getLogger('engineerhub.notifications')
```

建議配置日誌級別和輸出：

```python
LOGGING = {
    'loggers': {
        'engineerhub.notifications': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

## 擴展功能

### 自定義通知類型

```python
# 在models.py中添加新類型
class NotificationType(models.TextChoices):
    # 現有類型...
    ACHIEVEMENT = 'achievement', _('成就通知')

# 在services.py中添加創建方法
@staticmethod
def create_achievement_notification(recipient, achievement):
    # 實現邏輯...
```

### 自定義聚合規則

```python
# 在NotificationAggregator中添加新的聚合方法
@staticmethod
def _aggregate_achievements(notifications):
    # 實現成就通知聚合邏輯...
```

### 第三方集成

- **Slack集成**：發送通知到Slack頻道
- **微信推送**：集成微信公眾號推送
- **釘釘機器人**：企業內部通知

## 總結

這個通知系統提供了完整的通知管理解決方案，從基礎功能到高級分析都有覆蓋。系統設計考慮了性能、可擴展性和用戶體驗，是一個適合生產環境使用的通知系統。 