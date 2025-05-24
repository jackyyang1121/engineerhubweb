/**
 * 測試輔助工具 - 集中管理所有前端測試相關功能
 * 使用方法：
 * import { debugLog, testApi, testComponent } from '@/utils/testHelpers';
 * 
 * // 基本調試
 * debugLog("用戶狀態", userData);
 * 
 * // API測試
 * testApi("posts", "/api/posts/");
 * 
 * // 組件測試
 * testComponent("PostCard", props);
 */

interface LogData {
  [key: string]: any;
}

class TestHelper {
  private enabled: boolean;
  private logHistory: Array<{timestamp: string, label: string, data: any}> = [];

  constructor() {
    this.enabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEBUG === 'true';
  }

  /**
   * 統一的調試日誌輸出
   */
  debugLog(label: string, data?: LogData | any, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): void {
    if (!this.enabled) return;

    const timestamp = new Date().toLocaleString('zh-TW');
    const logEntry = { timestamp, label, data };
    
    // 添加到歷史記錄
    this.logHistory.push(logEntry);
    
    // 只保留最近100條記錄
    if (this.logHistory.length > 100) {
      this.logHistory.shift();
    }

    const emoji = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : '🔍';
    
    if (data !== undefined) {
      console.group(`${emoji} [${level}] ${timestamp} - ${label}`);
      console.log(data);
      console.groupEnd();
    } else {
      console.log(`${emoji} [${level}] ${timestamp} - ${label}`);
    }
  }

  /**
   * API測試輔助
   */
  testApi(name: string, url: string, data?: any, method: string = 'GET'): void {
    if (!this.enabled) return;

    this.debugLog(`API測試 - ${name}`, {
      url,
      method,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 組件測試輔助
   */
  testComponent(componentName: string, props?: any, state?: any): void {
    if (!this.enabled) return;

    this.debugLog(`組件測試 - ${componentName}`, {
      props,
      state,
      timestamp: Date.now()
    });
  }

  /**
   * 性能測試
   */
  performanceTest<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();

    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();

    this.debugLog(`性能測試 - ${name}`, {
      執行時間: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * 異步性能測試
   */
  async performanceTestAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();

    this.debugLog(`異步性能測試 - ${name}`, {
      執行時間: `${(endTime - startTime).toFixed(2)}ms`,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * 網絡請求監控
   */
  monitorRequest(url: string, options?: RequestInit): void {
    if (!this.enabled) return;

    this.debugLog('網絡請求', {
      url,
      method: options?.method || 'GET',
      headers: options?.headers,
      body: options?.body,
      timestamp: Date.now()
    });
  }

  /**
   * 獲取調試歷史
   */
  getLogHistory(): Array<{timestamp: string, label: string, data: any}> {
    return this.logHistory;
  }

  /**
   * 清除調試歷史
   */
  clearLogHistory(): void {
    this.logHistory = [];
    this.debugLog('調試歷史已清除');
  }

  /**
   * 導出調試歷史到JSON
   */
  exportLogHistory(): string {
    return JSON.stringify(this.logHistory, null, 2);
  }
}

// 創建全局實例
const testHelper = new TestHelper();

// 便捷函數
export const debugLog = (label: string, data?: LogData | any, level?: 'INFO' | 'WARN' | 'ERROR') => {
  testHelper.debugLog(label, data, level);
};

export const testApi = (name: string, url: string, data?: any, method?: string) => {
  testHelper.testApi(name, url, data, method);
};

export const testComponent = (componentName: string, props?: any, state?: any) => {
  testHelper.testComponent(componentName, props, state);
};

export const performanceTest = <T>(name: string, fn: () => T): T => {
  return testHelper.performanceTest(name, fn);
};

export const performanceTestAsync = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  return testHelper.performanceTestAsync(name, fn);
};

export const monitorRequest = (url: string, options?: RequestInit) => {
  testHelper.monitorRequest(url, options);
};

// 常用測試場景
export class QuickTests {
  /**
   * 測試用戶登錄流程
   */
  static testUserLogin(userData: any): void {
    debugLog('測試用戶登錄流程開始', { userData });
    
    // 模擬登錄步驟
    debugLog('步驟1: 驗證用戶輸入');
    debugLog('步驟2: 發送登錄請求');
    debugLog('步驟3: 處理登錄響應');
    
    debugLog('測試用戶登錄流程結束');
  }

  /**
   * 測試貼文操作流程
   */
  static testPostFlow(postData: any): void {
    debugLog('測試貼文流程開始', { postData });
    
    // 模擬貼文操作
    debugLog('步驟1: 載入貼文數據');
    debugLog('步驟2: 渲染貼文組件');
    debugLog('步驟3: 處理用戶互動');
    
    debugLog('測試貼文流程結束');
  }

  /**
   * 測試WebSocket連接
   */
  static testWebSocket(wsUrl: string): void {
    debugLog('測試WebSocket連接', {
      url: wsUrl,
      readyState: 'CONNECTING',
      timestamp: Date.now()
    });
  }
}

// 開發環境下添加到全局對象，方便在控制台使用
if (testHelper['enabled']) {
  (window as any).testHelper = {
    debugLog,
    testApi,
    testComponent,
    performanceTest,
    getHistory: () => testHelper.getLogHistory(),
    clearHistory: () => testHelper.clearLogHistory(),
    exportHistory: () => testHelper.exportLogHistory(),
    QuickTests
  };
  
  debugLog('測試工具已載入', {
    提示: '在控制台使用 window.testHelper 訪問所有功能'
  });
} 