"""
快速測試示例 - 展示如何使用新的測試工具
執行方式: python manage.py shell -c "exec(open('QUICK_TEST_EXAMPLE.py').read())"
"""

# 引入測試工具
import sys
import os
sys.path.append('backend')
sys.path.append('backend/utils')

try:
    from utils.test_helpers import debug_log, test_db, QuickTests
    print("✅ 測試工具載入成功")
except ImportError as e:
    print(f"❌ 測試工具載入失敗: {e}")
    exit()

# ==================== 基本使用示例 ====================

print("\n" + "="*50)
print("🔍 基本調試示例")
print("="*50)

# 1. 基本調試
debug_log("系統啟動", {"timestamp": "2024-01-01", "version": "1.0"})

# 2. 不同日誌級別
debug_log("正常信息", level="INFO")
debug_log("警告信息", {"warning": "這是一個警告"}, level="WARN")  
debug_log("錯誤信息", {"error": "這是一個錯誤"}, level="ERROR")

# ==================== 數據庫測試示例 ====================

print("\n" + "="*50)
print("🗄️ 數據庫測試示例")
print("="*50)

# 測試數據庫查詢（安全的，只查詢基本表信息）
debug_log("開始數據庫測試")

# 查詢用戶數量
users_count = test_db("SELECT COUNT(*) as count FROM accounts_customuser")
debug_log("用戶總數", users_count)

# 查詢貼文數量
posts_count = test_db("SELECT COUNT(*) as count FROM posts_post")
debug_log("貼文總數", posts_count)

# ==================== 快速測試場景示例 ====================

print("\n" + "="*50) 
print("⚡ 快速測試場景示例")
print("="*50)

# 如果有用戶數據，測試用戶流程
try:
    # 獲取第一個用戶進行測試
    first_user = test_db("SELECT id FROM accounts_customuser LIMIT 1")
    if first_user and len(first_user) > 0:
        user_id = first_user[0][0]
        debug_log("找到測試用戶", {"user_id": user_id})
        QuickTests.test_user_flow(user_id)
    else:
        debug_log("沒有找到用戶數據，跳過用戶測試")
        
    # 獲取第一篇貼文進行測試  
    first_post = test_db("SELECT id FROM posts_post LIMIT 1")
    if first_post and len(first_post) > 0:
        post_id = first_post[0][0]
        debug_log("找到測試貼文", {"post_id": post_id})
        QuickTests.test_post_flow(post_id)
    else:
        debug_log("沒有找到貼文數據，跳過貼文測試")
        
except Exception as e:
    debug_log("測試過程中出現錯誤", {"error": str(e)}, level="ERROR")

# ==================== 性能測試示例 ====================

print("\n" + "="*50)
print("⏱️ 性能測試示例")  
print("="*50)

from utils.test_helpers import performance_test
import time

@performance_test("模擬耗時操作")
def simulate_heavy_task():
    # 模擬一個耗時操作
    time.sleep(0.1)
    return "操作完成"

result = simulate_heavy_task()
debug_log("性能測試結果", {"result": result})

# ==================== 實際使用場景示例 ====================

print("\n" + "="*50)
print("🎯 實際使用場景示例")
print("="*50)

def simulate_user_registration(username, email):
    """模擬用戶註冊流程"""
    debug_log("用戶註冊開始", {
        "username": username, 
        "email": email,
        "step": "validation"
    })
    
    # 模擬驗證步驟
    debug_log("步驟1: 驗證用戶輸入")
    debug_log("步驟2: 檢查用戶名重複")
    debug_log("步驟3: 檢查郵箱重複") 
    debug_log("步驟4: 創建用戶賬戶")
    
    debug_log("用戶註冊完成", {
        "username": username,
        "status": "success"
    })

def simulate_post_creation(title, content):
    """模擬貼文創建流程"""
    debug_log("貼文創建開始", {
        "title": title,
        "content_length": len(content),
        "step": "validation"
    })
    
    debug_log("步驟1: 驗證貼文內容")
    debug_log("步驟2: 處理代碼高亮")
    debug_log("步驟3: 保存到數據庫")
    debug_log("步驟4: 更新搜索索引")
    
    debug_log("貼文創建完成", {
        "title": title,
        "status": "success"
    })

# 運行模擬場景
simulate_user_registration("test_user", "test@example.com")
simulate_post_creation("我的第一篇技術文章", "這是文章內容...")

print("\n" + "="*50)
print("✅ 測試示例運行完成！")
print("="*50)
print("\n💡 提示:")
print("- 在開發環境中，所有調試信息會顯示在控制台")
print("- 日誌會自動保存到 logs/test_debug.log 文件")
print("- 在生產環境中，這些調試代碼會自動禁用")
print("- 可以通過修改 DEBUG 設置來控制日誌輸出")

print("\n📖 更多使用方法請查看 TESTING_GUIDE.md") 