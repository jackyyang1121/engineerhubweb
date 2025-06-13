/**
 * EngineerHub - 性能監控Hook
 * 
 * 職責：
 * - 監控組件渲染性能
 * - 追蹤API請求性能
 * - 監測記憶體使用情況
 * - 提供性能分析報告
 * 
 * 設計原則：
 * - Narrowly focused: 專注於性能監控和分析
 * - Flexible: 支援多種監控策略和配置
 * - Loosely coupled: 與具體業務邏輯解耦
 */

import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * 性能指標介面
 */
export interface PerformanceMetrics {
  /** 組件渲染時間（毫秒） */
  renderTime: number;
  /** 組件掛載時間（毫秒） */
  mountTime: number;
  /** 重新渲染次數 */
  rerenderCount: number;
  /** 記憶體使用量（MB，如果支援） */
  memoryUsage?: number;
  /** 最後更新時間 */
  lastUpdate: number;
}

/**
 * API性能指標
 */
export interface ApiPerformanceMetrics {
  /** 請求URL */
  url: string;
  /** 請求方法 */
  method: string;
  /** 響應時間（毫秒） */
  duration: number;
  /** 響應狀態碼 */
  status: number;
  /** 請求時間戳 */
  timestamp: number;
  /** 是否成功 */
  success: boolean;
}

/**
 * 性能監控配置
 */
export interface PerformanceConfig {
  /** 是否啟用性能監控 */
  enabled?: boolean;
  /** 是否在開發環境下輸出日誌 */
  enableLogging?: boolean;
  /** 性能閾值（毫秒） */
  thresholds?: {
    /** 渲染時間警告閾值 */
    renderWarning: number;
    /** 渲染時間錯誤閾值 */
    renderError: number;
    /** API請求警告閾值 */
    apiWarning: number;
    /** API請求錯誤閾值 */
    apiError: number;
  };
  /** 取樣率（0-1，1表示100%取樣） */
  sampleRate?: number;
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  enabled: import.meta.env.DEV,
  enableLogging: import.meta.env.DEV,
  thresholds: {
    renderWarning: 16, // 16ms = 60fps
    renderError: 33,   // 33ms = 30fps
    apiWarning: 1000,  // 1秒
    apiError: 3000,    // 3秒
  },
  sampleRate: 1.0,
};

/**
 * 全域性能數據收集器
 */
class PerformanceCollector {
  private static instance: PerformanceCollector;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private apiMetrics: ApiPerformanceMetrics[] = [];
  private config: Required<PerformanceConfig>;

  private constructor(config: PerformanceConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 獲取單例實例
   */
  public static getInstance(config?: PerformanceConfig): PerformanceCollector {
    if (!PerformanceCollector.instance) {
      PerformanceCollector.instance = new PerformanceCollector(config);
    }
    return PerformanceCollector.instance;
  }

  /**
   * 記錄組件性能指標
   */
  public recordComponentMetrics(componentId: string, metrics: PerformanceMetrics): void {
    if (!this.shouldSample()) return;

    this.metrics.set(componentId, metrics);

    // 檢查性能閾值
    this.checkPerformanceThresholds(componentId, metrics);

    // 開發環境下輸出日誌
    if (this.config.enableLogging) {
      this.logComponentPerformance(componentId, metrics);
    }
  }

  /**
   * 記錄API性能指標
   */
  public recordApiMetrics(metrics: ApiPerformanceMetrics): void {
    if (!this.shouldSample()) return;

    this.apiMetrics.push(metrics);

    // 保持API指標數組大小在合理範圍內
    if (this.apiMetrics.length > 1000) {
      this.apiMetrics = this.apiMetrics.slice(-500);
    }

    // 檢查API性能閾值
    this.checkApiThresholds(metrics);

    // 開發環境下輸出日誌
    if (this.config.enableLogging) {
      this.logApiPerformance(metrics);
    }
  }

  /**
   * 獲取組件性能報告
   */
  public getComponentReport(): Record<string, PerformanceMetrics> {
    const report: Record<string, PerformanceMetrics> = {};
    this.metrics.forEach((metrics, componentId) => {
      report[componentId] = { ...metrics };
    });
    return report;
  }

  /**
   * 獲取API性能報告
   */
  public getApiReport(): {
    metrics: ApiPerformanceMetrics[];
    summary: {
      totalRequests: number;
      averageDuration: number;
      successRate: number;
      slowRequests: number;
    };
  } {
    const totalRequests = this.apiMetrics.length;
    const successfulRequests = this.apiMetrics.filter(m => m.success).length;
    const totalDuration = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0);
    const slowRequests = this.apiMetrics.filter(
      m => m.duration > this.config.thresholds.apiWarning
    ).length;

    return {
      metrics: [...this.apiMetrics],
      summary: {
        totalRequests,
        averageDuration: totalRequests > 0 ? totalDuration / totalRequests : 0,
        successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
        slowRequests,
      },
    };
  }

  /**
   * 清除所有性能數據
   */
  public clearMetrics(): void {
    this.metrics.clear();
    this.apiMetrics.length = 0;
  }

  /**
   * 是否應該進行取樣
   */
  private shouldSample(): boolean {
    return this.config.enabled && Math.random() < this.config.sampleRate;
  }

  /**
   * 檢查組件性能閾值
   */
  private checkPerformanceThresholds(componentId: string, metrics: PerformanceMetrics): void {
    const { renderTime } = metrics;
    const { renderWarning, renderError } = this.config.thresholds;

    if (renderTime > renderError) {
      console.error(`⚠️ 組件 ${componentId} 渲染過慢: ${renderTime}ms (閾值: ${renderError}ms)`);
    } else if (renderTime > renderWarning) {
      console.warn(`🐌 組件 ${componentId} 渲染較慢: ${renderTime}ms (閾值: ${renderWarning}ms)`);
    }

    // 檢查重新渲染次數
    if (metrics.rerenderCount > 10) {
      console.warn(`🔄 組件 ${componentId} 重新渲染過多: ${metrics.rerenderCount} 次`);
    }
  }

  /**
   * 檢查API性能閾值
   */
  private checkApiThresholds(metrics: ApiPerformanceMetrics): void {
    const { duration } = metrics;
    const { apiWarning, apiError } = this.config.thresholds;

    if (duration > apiError) {
      console.error(`⚠️ API請求過慢: ${metrics.method} ${metrics.url} - ${duration}ms`);
    } else if (duration > apiWarning) {
      console.warn(`🐌 API請求較慢: ${metrics.method} ${metrics.url} - ${duration}ms`);
    }
  }

  /**
   * 輸出組件性能日誌
   */
  private logComponentPerformance(componentId: string, metrics: PerformanceMetrics): void {
    console.group(`📊 組件性能 - ${componentId}`);
    console.log(`渲染時間: ${metrics.renderTime}ms`);
    console.log(`掛載時間: ${metrics.mountTime}ms`);
    console.log(`重新渲染: ${metrics.rerenderCount} 次`);
    if (metrics.memoryUsage) {
      console.log(`記憶體使用: ${metrics.memoryUsage.toFixed(2)}MB`);
    }
    console.groupEnd();
  }

  /**
   * 輸出API性能日誌
   */
  private logApiPerformance(metrics: ApiPerformanceMetrics): void {
    const emoji = metrics.success ? '✅' : '❌';
    
    console.group(`${emoji} API請求性能`);
    console.log(`URL: ${metrics.method} ${metrics.url}`);
    console.log(`耗時: ${metrics.duration}ms`);
    console.log(`狀態: ${metrics.status}`);
    console.log(`時間: ${new Date(metrics.timestamp).toLocaleTimeString()}`);
    console.groupEnd();
  }
}

/**
 * 組件性能監控Hook
 * 
 * 功能：
 * - 自動監控組件渲染性能
 * - 追蹤組件生命週期
 * - 記錄重新渲染次數
 * - 監測記憶體使用（如果瀏覽器支援）
 * 
 * @param componentName - 組件名稱（用於識別）
 * @param config - 性能監控配置
 * @returns 性能指標和控制函數
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { metrics, startMeasure, endMeasure } = usePerformanceMonitor('MyComponent');
 *   
 *   // 手動測量特定操作
 *   const handleClick = () => {
 *     startMeasure('button-click');
 *     // 執行耗時操作
 *     setTimeout(() => {
 *       endMeasure('button-click');
 *     }, 100);
 *   };
 *   
 *   return (
 *     <div>
 *       <p>渲染時間: {metrics.renderTime}ms</p>
 *       <button onClick={handleClick}>測試性能</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceMonitor(
  componentName: string,
  config: PerformanceConfig = {}
) {
  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number>(Date.now());
  const measurementsRef = useRef<Map<string, number>>(new Map());
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    mountTime: 0,
    rerenderCount: 0,
    lastUpdate: Date.now(),
  });

  const collector = PerformanceCollector.getInstance(config);

  // 記錄掛載時間
  useEffect(() => {
    const mountTime = Date.now() - mountTimeRef.current;
    
    setMetrics(prev => ({
      ...prev,
      mountTime,
      lastUpdate: Date.now(),
    }));
    
    // 在 effect 中複製 ref 值，避免在清理時已經改變
    const measurements = measurementsRef.current;
    
    return () => {
      // 組件卸載時清理性能測量數據
      if (measurements) {
        measurements.clear();
      }
    };
  }, []);

  // 記錄每次渲染
  useEffect(() => {
    const renderStartTime = lastRenderTimeRef.current;
    const renderEndTime = Date.now();
    const renderTime = renderEndTime - renderStartTime;
    
    renderCountRef.current++;
    lastRenderTimeRef.current = renderEndTime;

    // 獲取記憶體使用情況（如果支援）
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      const memInfo = (performance as { memory: { usedJSHeapSize: number } }).memory;
      memoryUsage = memInfo.usedJSHeapSize / 1024 / 1024; // 轉換為MB
    }

    const newMetrics: PerformanceMetrics = {
      renderTime,
      mountTime: metrics.mountTime,
      rerenderCount: renderCountRef.current,
      memoryUsage,
      lastUpdate: renderEndTime,
    };

    setMetrics(newMetrics);
    
    // 記錄到全域收集器
    collector.recordComponentMetrics(componentName, newMetrics);
  }, [metrics.mountTime, collector, componentName]);

  /**
   * 開始測量特定操作
   */
  const startMeasure = useCallback((operationName: string) => {
    measurementsRef.current.set(operationName, Date.now());
  }, []);

  /**
   * 結束測量特定操作
   */
  const endMeasure = useCallback((operationName: string): number => {
    const startTime = measurementsRef.current.get(operationName);
    if (!startTime) {
      console.warn(`找不到操作 "${operationName}" 的開始時間`);
      return 0;
    }

    const duration = Date.now() - startTime;
    measurementsRef.current.delete(operationName);

    if (config.enableLogging) {
      console.log(`⏱️ ${componentName} - ${operationName}: ${duration}ms`);
    }

    return duration;
  }, [componentName, config.enableLogging]);

  /**
   * 獲取性能報告
   */
  const getReport = useCallback(() => {
    return collector.getComponentReport();
  }, [collector]);

  /**
   * 清除性能數據
   */
  const clearMetrics = useCallback(() => {
    collector.clearMetrics();
    setMetrics({
      renderTime: 0,
      mountTime: 0,
      rerenderCount: 0,
      lastUpdate: Date.now(),
    });
  }, [collector]);

  return {
    /** 當前組件性能指標 */
    metrics,
    /** 開始測量操作 */
    startMeasure,
    /** 結束測量操作 */
    endMeasure,
    /** 獲取性能報告 */
    getReport,
    /** 清除性能數據 */
    clearMetrics,
  };
}

/**
 * API性能監控Hook
 * 
 * 功能：
 * - 自動監控API請求性能
 * - 記錄請求響應時間
 * - 追蹤請求成功率
 * - 提供性能分析
 * 
 * @param config - 性能監控配置
 * @returns API性能監控函數
 * 
 * @example
 * ```typescript
 * function useApi() {
 *   const { measureApiCall } = useApiPerformanceMonitor();
 *   
 *   const fetchData = async () => {
 *     return measureApiCall(
 *       'GET',
 *       '/api/posts',
 *       () => fetch('/api/posts').then(res => res.json())
 *     );
 *   };
 *   
 *   return { fetchData };
 * }
 * ```
 */
export function useApiPerformanceMonitor(config: PerformanceConfig = {}) {
  const collector = PerformanceCollector.getInstance(config);

  /**
   * 測量API調用性能
   */
  const measureApiCall = useCallback(async <T>(
    method: string,
    url: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const startTime = Date.now();
    let success = true;
    let status = 200;

    try {
      const result = await apiCall();
      return result;
    } catch (error) {
      success = false;
      
             // 嘗試從錯誤中提取狀態碼
       if (error && typeof error === 'object' && 'status' in error) {
         status = (error as { status: number }).status;
      } else {
        status = 0; // 網絡錯誤或其他錯誤
      }
      
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      // 記錄API性能指標
      collector.recordApiMetrics({
        method,
        url,
        duration,
        status,
        timestamp: Date.now(),
        success,
      });
    }
  }, [collector]);

  /**
   * 獲取API性能報告
   */
  const getApiReport = useCallback(() => {
    return collector.getApiReport();
  }, [collector]);

  return {
    /** 測量API調用性能 */
    measureApiCall,
    /** 獲取API性能報告 */
    getApiReport,
  };
}

/**
 * 導出性能收集器實例（用於全域訪問）
 */
export { PerformanceCollector };

export default usePerformanceMonitor; 