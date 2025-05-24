# 測試代碼整理指南

## 概述
為了讓測試代碼更加集中和整潔，我們創建了統一的測試工具來替代散落的 `print()` 和 `console.log()` 語句。

## 後端測試工具 (Python)

### 基本使用

```python
# 引入測試工具
from utils.test_helpers import debug_log, test_api, test_db, QuickTests

# 替換原來的 print() 語句
# ❌ 舊方式
print("用戶數據:", user_data)

# ✅ 新方式
debug_log("用戶數據", user_data)
```

### 常用場景

#### 1. API調試
```python
# 在 views.py 中
from utils.test_helpers import debug_log, performance_test

@performance_test("用戶登錄")
def login_view(request):
    debug_log("登錄請求", {
        "method": request.method,
        "user_agent": request.META.get('HTTP_USER_AGENT'),
        "ip": request.META.get('REMOTE_ADDR')
    })
    
    # 原本的邏輯...
    
    debug_log("登錄成功", {"user_id": user.id})
```

#### 2. 數據庫調試
```python
# 在 models.py 或 views.py 中
from utils.test_helpers import test_db, debug_log

def get_user_posts(user_id):
    debug_log("查詢用戶貼文", {"user_id": user_id})
    
    # 使用測試工具查詢數據庫
    posts = test_db("SELECT * FROM posts_post WHERE author_id = %s", [user_id])
    
    debug_log("查詢結果", {"count": len(posts) if posts else 0})
    return posts
```

#### 3. 快速測試場景
```python
# 在任何需要測試的地方
from utils.test_helpers import QuickTests

# 測試用戶完整流程
QuickTests.test_user_flow(user_id=1)

# 測試貼文完整流程
QuickTests.test_post_flow(post_id=5)
```

## 前端測試工具 (TypeScript)

### 基本使用

```typescript
// 引入測試工具
import { debugLog, testApi, testComponent } from '@/utils/testHelpers';

// 替換原來的 console.log() 語句
// ❌ 舊方式
console.log("用戶狀態:", userData);

// ✅ 新方式
debugLog("用戶狀態", userData);
```

### 常用場景

#### 1. 組件調試
```typescript
// 在 React 組件中
import { debugLog, testComponent } from '@/utils/testHelpers';

const PostCard = ({ post, onLike }: PostCardProps) => {
  useEffect(() => {
    testComponent("PostCard", { post, onLike });
  }, [post]);

  const handleLike = () => {
    debugLog("點讚操作", { postId: post.id, currentLikes: post.likes });
    onLike();
  };

  // 組件邏輯...
};
```

#### 2. API調試
```typescript
// 在 API 調用中
import { testApi, debugLog } from '@/utils/testHelpers';

const fetchPosts = async () => {
  testApi("獲取貼文列表", "/api/posts/");
  
  try {
    const response = await fetch("/api/posts/");
    const data = await response.json();
    
    debugLog("API響應", { 
      status: response.status, 
      dataCount: data.length 
    });
    
    return data;
  } catch (error) {
    debugLog("API錯誤", error, "ERROR");
  }
};
```

#### 3. 性能測試
```typescript
import { performanceTest, performanceTestAsync } from '@/utils/testHelpers';

// 同步性能測試
const processData = (data: any[]) => {
  return performanceTest("數據處理", () => {
    return data.map(item => transformItem(item));
  });
};

// 異步性能測試
const loadUserData = async (userId: string) => {
  return performanceTestAsync("載入用戶數據", async () => {
    const response = await fetch(`/api/users/${userId}`);
    return response.json();
  });
};
```

## 替換現有測試代碼

### 步驟1: 替換 settings 中的 print 語句

將 `backend/engineerhub/settings/development.py` 中的 print 語句替換：

```python
# 在文件頂部添加
from utils.test_helpers import debug_log

# 替換現有的 print 語句
# ❌ 舊方式
print("✅ Debug Toolbar 已啟用")

# ✅ 新方式  
debug_log("Debug Toolbar 已啟用", level="INFO")
```

### 步驟2: 替換前端的 console.log

將前端組件中的 console.log 替換：

```typescript
// 在組件頂部引入
import { debugLog } from '@/utils/testHelpers';

// 替換現有的 console.log
// ❌ 舊方式
console.log('WebSocket 連接已建立');

// ✅ 新方式
debugLog('WebSocket 連接已建立');
```

## 配置環境變數

### 後端
在開發環境中，測試工具會自動啟用（當 `DEBUG=True` 時）。

### 前端
在 `.env.development` 中添加：
```
VITE_ENABLE_DEBUG=true
```

## 日誌輸出

### 後端日誌
- 控制台輸出：帶有 🔍 emoji 的格式化日誌
- 文件輸出：自動寫入 `logs/test_debug.log`

### 前端日誌
- 控制台輸出：分組折疊的格式化日誌
- 歷史記錄：可在瀏覽器控制台使用 `window.testHelper.getHistory()` 查看

## 生產環境
在生產環境中，所有測試代碼會自動禁用，不會影響性能。

## 使用建議

1. **集中測試**：將相關的測試代碼集中在一個函數或文件中
2. **語義化標籤**：使用有意義的標籤描述測試內容
3. **分級日誌**：使用 INFO/WARN/ERROR 等級別
4. **性能測試**：對關鍵功能使用性能測試裝飾器
5. **條件測試**：只在開發環境啟用測試代碼

## 控制台快捷方式

在瀏覽器開發工具中，你可以直接使用：

```javascript
// 查看測試歷史
window.testHelper.getHistory()

// 清除測試歷史  
window.testHelper.clearHistory()

// 導出測試歷史
window.testHelper.exportHistory()

// 快速測試
window.testHelper.QuickTests.testUserLogin({username: 'test'})
```

這樣就能讓測試代碼更加整潔和集中了！ 