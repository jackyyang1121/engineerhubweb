/**
 * 測試工具使用示例組件
 * 展示如何在前端組件中使用統一的測試工具
 */

import React, { useEffect, useState } from 'react';
import { 
  debugLog, 
  testComponent, 
  testApi, 
  performanceTest,
  QuickTests 
} from '../utils/testHelpers';

interface TestDemoProps {
  title?: string;
}

const TestDemo: React.FC<TestDemoProps> = ({ title = "測試示例" }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 組件掛載時測試
  useEffect(() => {
    testComponent("TestDemo", { title });
    debugLog("TestDemo 組件已掛載", { title });
    
    // 模擬數據載入
    loadTestData();
  }, [title]);

  // 模擬 API 調用
  const loadTestData = async () => {
    setLoading(true);
    debugLog("開始載入測試數據");
    
    try {
      // 使用 API 測試工具
      testApi("獲取測試數據", "/api/test");
      
      // 模擬網絡延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockData = [
        { id: 1, name: "測試項目1", type: "API" },
        { id: 2, name: "測試項目2", type: "組件" },
        { id: 3, name: "測試項目3", type: "性能" }
      ];
      
      setData(mockData);
      debugLog("測試數據載入完成", { count: mockData.length });
      
    } catch (error) {
      debugLog("數據載入失敗", error, "ERROR");
    } finally {
      setLoading(false);
    }
  };

  // 性能測試示例
  const handlePerformanceTest = () => {
    const result = performanceTest("數據處理測試", () => {
      // 模擬複雜計算
      let sum = 0;
      for (let i = 0; i < 100000; i++) {
        sum += Math.random();
      }
      return sum;
    });
    
    debugLog("性能測試完成", { result });
  };

  // 用戶交互測試
  const handleUserAction = (action: string, itemId?: number) => {
    debugLog(`用戶操作: ${action}`, { 
      action, 
      itemId, 
      timestamp: Date.now() 
    });
    
    // 根據不同操作執行不同邏輯
    switch (action) {
      case "click":
        debugLog("處理點擊事件", { itemId });
        break;
      case "hover":
        debugLog("處理懸停事件", { itemId });
        break;
      default:
        debugLog("未知操作", { action }, "WARN");
    }
  };

  // 快速測試場景
  const runQuickTests = () => {
    debugLog("開始運行快速測試場景");
    
    // 測試用戶登錄流程
    QuickTests.testUserLogin({ username: "test_user", email: "test@example.com" });
    
    // 測試貼文流程
    QuickTests.testPostFlow({ id: 1, title: "測試貼文", content: "測試內容" });
    
    // 測試 WebSocket 連接
    QuickTests.testWebSocket("ws://localhost:8000/ws/");
    
    debugLog("快速測試場景運行完成");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{title}</h1>
      
      {/* 基本測試區域 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">🔍 基本測試功能</h2>
        <div className="space-y-2">
          <button 
            onClick={() => debugLog("手動觸發的調試信息", { time: new Date().toISOString() })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            觸發調試日誌
          </button>
          
          <button 
            onClick={() => debugLog("這是一個警告", { level: "warning" }, "WARN")}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 ml-2"
          >
            觸發警告日誌
          </button>
          
          <button 
            onClick={() => debugLog("這是一個錯誤", { error: "模擬錯誤" }, "ERROR")}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 ml-2"
          >
            觸發錯誤日誌
          </button>
        </div>
      </div>

      {/* 性能測試區域 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">⏱️ 性能測試</h2>
        <button 
          onClick={handlePerformanceTest}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          運行性能測試
        </button>
      </div>

      {/* 數據載入測試 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">📊 數據載入測試</h2>
        <button 
          onClick={loadTestData}
          disabled={loading}
          className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {loading ? "載入中..." : "重新載入數據"}
        </button>
        
        <div className="mt-4">
          <h3 className="font-medium mb-2">測試數據:</h3>
          {data.length > 0 ? (
            <ul className="space-y-1">
              {data.map(item => (
                <li 
                  key={item.id}
                  className="p-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                  onClick={() => handleUserAction("click", item.id)}
                  onMouseEnter={() => handleUserAction("hover", item.id)}
                >
                  {item.name} ({item.type})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">暫無數據</p>
          )}
        </div>
      </div>

      {/* 快速測試場景 */}
      <div className="mb-8 p-4 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">⚡ 快速測試場景</h2>
        <button 
          onClick={runQuickTests}
          className="px-4 py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600"
        >
          運行快速測試場景
        </button>
      </div>

      {/* 使用提示 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 使用提示</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 打開瀏覽器開發者工具查看控制台輸出</li>
          <li>• 在控制台輸入 <code className="bg-blue-100 px-1 rounded">window.testHelper.getHistory()</code> 查看測試歷史</li>
          <li>• 使用 <code className="bg-blue-100 px-1 rounded">window.testHelper.clearHistory()</code> 清除測試歷史</li>
          <li>• 所有測試功能只在開發環境啟用</li>
        </ul>
      </div>
    </div>
  );
};

export default TestDemo; 