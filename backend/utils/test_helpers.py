"""
測試輔助工具 - 集中管理所有測試相關功能
使用方法：
from utils.test_helpers import debug_log, test_api, test_db

# 基本調試
debug_log("用戶登錄", user_data)

# API測試
test_api("posts/create", {"title": "測試"})

# 數據庫測試
test_db("SELECT * FROM posts LIMIT 5")
"""

import json
import time
from datetime import datetime
from django.conf import settings
from django.db import connection

class TestHelper:
    """集中的測試工具類"""
    
    def __init__(self):
        self.enabled = getattr(settings, 'DEBUG', False)
        self.log_file = 'logs/test_debug.log'
    
    def debug_log(self, label, data=None, level="INFO"):
        """統一的調試日誌輸出"""
        if not self.enabled:
            return
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        if data is not None:
            if isinstance(data, (dict, list)):
                data_str = json.dumps(data, ensure_ascii=False, indent=2)
            else:
                data_str = str(data)
            message = f"[{level}] {timestamp} - {label}:\n{data_str}"
        else:
            message = f"[{level}] {timestamp} - {label}"
        
        print(f"🔍 {message}")
        
        # 同時寫入日誌文件
        try:
            with open(self.log_file, 'a', encoding='utf-8') as f:
                f.write(f"{message}\n\n")
        except:
            pass
    
    def test_api(self, endpoint, data=None, method="POST"):
        """API測試輔助"""
        if not self.enabled:
            return
        
        self.debug_log(f"API測試 - {method} {endpoint}", {
            "data": data,
            "timestamp": time.time()
        })
    
    def test_db(self, query, params=None):
        """數據庫查詢測試"""
        if not self.enabled:
            return
        
        try:
            with connection.cursor() as cursor:
                cursor.execute(query, params or [])
                results = cursor.fetchall()
                self.debug_log(f"數據庫測試 - {query[:50]}...", {
                    "row_count": len(results),
                    "first_5_rows": results[:5] if results else []
                })
                return results
        except Exception as e:
            self.debug_log(f"數據庫錯誤", {"query": query, "error": str(e)}, "ERROR")
    
    def performance_test(self, func_name):
        """性能測試裝飾器"""
        def decorator(func):
            def wrapper(*args, **kwargs):
                if not self.enabled:
                    return func(*args, **kwargs)
                
                start_time = time.time()
                result = func(*args, **kwargs)
                end_time = time.time()
                
                self.debug_log(f"性能測試 - {func_name}", {
                    "執行時間": f"{(end_time - start_time) * 1000:.2f}ms",
                    "參數": f"args: {len(args)}, kwargs: {len(kwargs)}"
                })
                return result
            return wrapper
        return decorator

# 創建全局實例
test_helper = TestHelper()

# 便捷函數
def debug_log(label, data=None, level="INFO"):
    """快速調試日誌"""
    test_helper.debug_log(label, data, level)

def test_api(endpoint, data=None, method="POST"):
    """快速API測試"""
    test_helper.test_api(endpoint, data, method)

def test_db(query, params=None):
    """快速數據庫測試"""
    return test_helper.test_db(query, params)

def performance_test(func_name):
    """快速性能測試裝飾器"""
    return test_helper.performance_test(func_name)

# 常用測試場景
class QuickTests:
    """常用測試場景"""
    
    @staticmethod
    def test_user_flow(user_id):
        """測試用戶完整流程"""
        debug_log("測試用戶流程開始", {"user_id": user_id})
        
        # 測試用戶基本信息
        user_data = test_db("SELECT * FROM accounts_customuser WHERE id = %s", [user_id])
        debug_log("用戶數據", user_data)
        
        # 測試用戶貼文
        posts_data = test_db("SELECT * FROM posts_post WHERE author_id = %s LIMIT 5", [user_id])
        debug_log("用戶貼文", posts_data)
        
        debug_log("測試用戶流程結束")
    
    @staticmethod
    def test_post_flow(post_id):
        """測試貼文完整流程"""
        debug_log("測試貼文流程開始", {"post_id": post_id})
        
        # 測試貼文數據
        post_data = test_db("SELECT * FROM posts_post WHERE id = %s", [post_id])
        debug_log("貼文數據", post_data)
        
        # 測試評論數據
        comments_data = test_db("SELECT * FROM comments_comment WHERE post_id = %s LIMIT 5", [post_id])
        debug_log("評論數據", comments_data)
        
        debug_log("測試貼文流程結束") 