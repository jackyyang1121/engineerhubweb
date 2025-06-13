/**
 * EngineerHub - 優化查詢Hook
 * 
 * 職責：
 * - 整合防抖、緩存、錯誤處理的統一查詢方案
 * - 提供智能重試機制
 * - 支援背景更新和樂觀更新
 * - 管理查詢狀態和生命週期
 * 
 * 設計原則：
 * - Narrowly focused: 專注於數據查詢優化
 * - Flexible: 支援多種查詢策略和配置
 * - Loosely coupled: 與具體API實現解耦
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { useApiPerformanceMonitor } from './usePerformanceMonitor';

/**
 * 查詢狀態
 */
export interface QueryState<T> {
  /** 查詢數據 */
  data: T | null;
  /** 是否正在載入 */
  isLoading: boolean;
  /** 是否正在重新驗證 */
  isValidating: boolean;
  /** 錯誤信息 */
  error: Error | null;
  /** 是否已載入過 */
  hasLoaded: boolean;
  /** 最後更新時間 */
  lastUpdated: number | null;
  /** 重試次數 */
  retryCount: number;
}

/**
 * 查詢配置
 */
export interface QueryConfig<T> {
  /** 查詢鍵值（用於緩存） */
  queryKey: string;
  /** 查詢函數 */
  queryFn: () => Promise<T>;
  /** 是否啟用查詢 */
  enabled?: boolean;
  /** 緩存時間（毫秒） */
  cacheTime?: number;
  /** 資料過期時間（毫秒） */
  staleTime?: number;
  /** 重試次數 */
  retryCount?: number;
  /** 重試延遲（毫秒） */
  retryDelay?: number;
  /** 防抖延遲（毫秒） */
  debounceDelay?: number;
  /** 是否在視窗焦點時重新獲取 */
  refetchOnWindowFocus?: boolean;
  /** 是否在重新連接時重新獲取 */
  refetchOnReconnect?: boolean;
  /** 成功回調 */
  onSuccess?: (data: T) => void;
  /** 錯誤回調 */
  onError?: (error: Error) => void;
  /** 資料變更回調 */
  onDataChange?: (data: T) => void;
}

/**
 * 緩存項目
 */
interface CacheItem<T> {
  /** 緩存數據 */
  data: T;
  /** 緩存時間戳 */
  timestamp: number;
  /** 過期時間戳 */
  expiresAt: number;
}

/**
 * 預設配置
 */
const DEFAULT_CONFIG: Required<Omit<QueryConfig<unknown>, 'queryKey' | 'queryFn' | 'onSuccess' | 'onError' | 'onDataChange'>> = {
  enabled: true,
  cacheTime: 5 * 60 * 1000, // 5分鐘
  staleTime: 30 * 1000,     // 30秒
  retryCount: 3,
  retryDelay: 1000,
  debounceDelay: 300,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
};

/**
 * 全域查詢緩存管理器
 */
class QueryCache {
  private static instance: QueryCache;
  private cache: Map<string, CacheItem<unknown>> = new Map();
  private subscribers: Map<string, Set<() => void>> = new Map();

  private constructor() {
    // 定期清理過期緩存
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // 每分鐘清理一次
  }

  /**
   * 獲取單例實例
   */
  public static getInstance(): QueryCache {
    if (!QueryCache.instance) {
      QueryCache.instance = new QueryCache();
    }
    return QueryCache.instance;
  }

  /**
   * 設置緩存
   */
  public set<T>(key: string, data: T, cacheTime: number): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + cacheTime,
    });

    // 通知訂閱者
    this.notifySubscribers(key);
  }

  /**
   * 獲取緩存
   */
  public get<T>(key: string, staleTime: number): { data: T; isStale: boolean } | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    
    // 檢查是否過期
    if (now > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // 檢查是否過時
    const isStale = now - item.timestamp > staleTime;

    return {
      data: item.data,
      isStale,
    };
  }

  /**
   * 訂閱緩存變更
   */
  public subscribe(key: string, callback: () => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    this.subscribers.get(key)!.add(callback);

    // 返回取消訂閱函數
    return () => {
      const subs = this.subscribers.get(key);
      if (subs) {
        subs.delete(callback);
        if (subs.size === 0) {
          this.subscribers.delete(key);
        }
      }
    };
  }

  /**
   * 通知訂閱者
   */
  private notifySubscribers(key: string): void {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      subscribers.forEach(callback => callback());
    }
  }

  /**
   * 清理過期緩存
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((item, key) => {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => {
      this.cache.delete(key);
    });

    if (keysToDelete.length > 0) {
      console.log(`🧹 清理了 ${keysToDelete.length} 個過期緩存項`);
    }
  }

  /**
   * 手動清除特定緩存
   */
  public invalidate(key: string): void {
    this.cache.delete(key);
    this.notifySubscribers(key);
  }

  /**
   * 清除所有緩存
   */
  public clear(): void {
    this.cache.clear();
    // 通知所有訂閱者
    this.subscribers.forEach((_, key) => {
      this.notifySubscribers(key);
    });
  }
}

/**
 * 優化查詢Hook
 * 
 * 功能：
 * - 智能緩存管理
 * - 自動防抖
 * - 錯誤重試
 * - 背景更新
 * - 性能監控
 * - 狀態管理
 * 
 * @param config - 查詢配置
 * @returns 查詢狀態和控制函數
 * 
 * @example
 * ```typescript
 * function UserProfile({ userId }: { userId: string }) {
 *   const {
 *     data: user,
 *     isLoading,
 *     error,
 *     refetch,
 *     mutate
 *   } = useOptimizedQuery({
 *     queryKey: `user-${userId}`,
 *     queryFn: () => fetchUser(userId),
 *     enabled: !!userId,
 *     staleTime: 60000, // 1分鐘內不重新獲取
 *     onSuccess: (user) => console.log('用戶載入成功:', user.name),
 *     onError: (error) => console.error('載入失敗:', error),
 *   });
 * 
 *   if (isLoading) return <div>載入中...</div>;
 *   if (error) return <div>錯誤: {error.message}</div>;
 *   if (!user) return <div>找不到用戶</div>;
 * 
 *   return (
 *     <div>
 *       <h1>{user.name}</h1>
 *       <button onClick={() => refetch()}>重新載入</button>
 *       <button onClick={() => mutate({ ...user, name: '新名稱' })}>
 *         樂觀更新
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useOptimizedQuery<T>(config: QueryConfig<T>) {
  const {
    queryKey,
    queryFn,
    enabled = DEFAULT_CONFIG.enabled,
    cacheTime = DEFAULT_CONFIG.cacheTime,
    staleTime = DEFAULT_CONFIG.staleTime,
    retryCount = DEFAULT_CONFIG.retryCount,
    retryDelay = DEFAULT_CONFIG.retryDelay,
    debounceDelay = DEFAULT_CONFIG.debounceDelay,
    refetchOnWindowFocus = DEFAULT_CONFIG.refetchOnWindowFocus,
    refetchOnReconnect = DEFAULT_CONFIG.refetchOnReconnect,
    onSuccess,
    onError,
    onDataChange,
  } = config;

  // 查詢狀態
  const [state, setState] = useState<QueryState<T>>({
    data: null,
    isLoading: false,
    isValidating: false,
    error: null,
    hasLoaded: false,
    lastUpdated: null,
    retryCount: 0,
  });

  // 緩存和性能監控
  const cache = QueryCache.getInstance();
  const { measureApiCall } = useApiPerformanceMonitor();
  
  // 防抖查詢函數
  const debouncedQueryFn = useDebounce(queryFn, debounceDelay);
  
  // 防止重複請求
  const requestInFlightRef = useRef<Promise<T> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * 執行查詢
   */
  const executeQuery = useCallback(async (
    isBackground = false,
    currentRetryCount = 0
  ): Promise<T | null> => {
    // 如果查詢被禁用，直接返回
    if (!enabled) {
      return null;
    }

    // 取消之前的請求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 創建新的取消控制器
    abortControllerRef.current = new AbortController();

    // 檢查是否有進行中的請求
    if (requestInFlightRef.current && !isBackground) {
      return requestInFlightRef.current;
    }

    // 更新載入狀態
    if (!isBackground) {
      setState(prev => ({
        ...prev,
        isLoading: !prev.hasLoaded,
        isValidating: prev.hasLoaded,
        error: null,
        retryCount: currentRetryCount,
      }));
    }

    try {
      // 執行查詢並監控性能
      const queryPromise = measureApiCall(
        'GET',
        queryKey,
        () => debouncedQueryFn()
      );

      requestInFlightRef.current = queryPromise;
      const data = await queryPromise;

      // 更新緩存
      cache.set(queryKey, data, cacheTime);

      // 更新狀態
      setState(prev => ({
        ...prev,
        data,
        isLoading: false,
        isValidating: false,
        error: null,
        hasLoaded: true,
        lastUpdated: Date.now(),
        retryCount: 0,
      }));

      // 觸發成功回調
      onSuccess?.(data);
      onDataChange?.(data);

      return data;
    } catch (error) {
      // 如果是取消請求，不處理錯誤
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }

      const errorObj = error instanceof Error ? error : new Error(String(error));

      // 檢查是否需要重試
      if (currentRetryCount < retryCount) {
        console.warn(`🔄 查詢失敗，準備重試 (${currentRetryCount + 1}/${retryCount}):`, errorObj.message);
        
        // 延遲後重試
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return executeQuery(isBackground, currentRetryCount + 1);
      }

      // 更新錯誤狀態
      setState(prev => ({
        ...prev,
        isLoading: false,
        isValidating: false,
        error: errorObj,
        retryCount: currentRetryCount,
      }));

      // 觸發錯誤回調
      onError?.(errorObj);

      throw errorObj;
    } finally {
      requestInFlightRef.current = null;
      abortControllerRef.current = null;
    }
  }, [
    enabled,
    queryKey,
    debouncedQueryFn,
    cacheTime,
    retryCount,
    retryDelay,
    measureApiCall,
    cache,
    onSuccess,
    onError,
    onDataChange,
  ]);

  /**
   * 手動重新獲取
   */
  const refetch = useCallback(async (): Promise<T | null> => {
    // 清除緩存
    cache.invalidate(queryKey);
    return executeQuery(false, 0);
  }, [cache, queryKey, executeQuery]);

  /**
   * 樂觀更新
   */
  const mutate = useCallback((newData: T | ((prevData: T | null) => T)) => {
    setState(prev => {
      const updatedData = typeof newData === 'function' 
        ? (newData as (prevData: T | null) => T)(prev.data)
        : newData;

      // 更新緩存
      cache.set(queryKey, updatedData, cacheTime);

      // 觸發變更回調
      onDataChange?.(updatedData);

      return {
        ...prev,
        data: updatedData,
        lastUpdated: Date.now(),
      };
    });
  }, [cache, queryKey, cacheTime, onDataChange]);

  /**
   * 清除查詢緩存
   */
  const invalidate = useCallback(() => {
    cache.invalidate(queryKey);
  }, [cache, queryKey]);

  // 初始化時檢查緩存並執行查詢
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // 檢查緩存
    const cachedResult = cache.get<T>(queryKey, staleTime);
    
    if (cachedResult) {
      // 使用緩存數據
      setState(prev => ({
        ...prev,
        data: cachedResult.data,
        hasLoaded: true,
        lastUpdated: Date.now(),
        error: null,
      }));

      // 如果數據過時，在背景重新獲取
      if (cachedResult.isStale) {
        executeQuery(true);
      }
    } else {
      // 沒有緩存，執行查詢
      executeQuery();
    }

    // 訂閱緩存變更
    const unsubscribe = cache.subscribe(queryKey, () => {
      const updatedResult = cache.get<T>(queryKey, staleTime);
      if (updatedResult) {
        setState(prev => ({
          ...prev,
          data: updatedResult.data,
          lastUpdated: Date.now(),
        }));
      }
    });

    return () => {
      unsubscribe();
      // 清理進行中的請求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, queryKey, staleTime, cache, executeQuery]);

  // 視窗焦點重新獲取
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) {
      return;
    }

    const handleFocus = () => {
      const cachedResult = cache.get<T>(queryKey, staleTime);
      if (!cachedResult || cachedResult.isStale) {
        executeQuery(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, cache, queryKey, staleTime, executeQuery]);

  // 網絡重連重新獲取
  useEffect(() => {
    if (!refetchOnReconnect || !enabled) {
      return;
    }

    const handleOnline = () => {
      executeQuery(true);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [refetchOnReconnect, enabled, executeQuery]);

  // 記憶化返回值
  const result = useMemo(() => ({
    ...state,
    refetch,
    mutate,
    invalidate,
  }), [state, refetch, mutate, invalidate]);

  return result;
}

/**
 * 多查詢Hook - 同時管理多個查詢
 * 
 * 功能：
 * - 同時執行多個查詢
 * - 統一管理查詢狀態
 * - 提供組合查詢結果
 * 
 * 設計原則：
 * - Narrowly focused: 專注於多查詢管理
 * - Flexible: 支援動態查詢配置
 * - Loosely coupled: 每個查詢獨立運行
 * 
 * 注意：此Hook必須在固定數量的查詢中使用，避免違反React Hooks規則
 */
export function useOptimizedQueries<T extends Record<string, unknown>>(
  queries: Array<QueryConfig<T[keyof T]> & { key: keyof T }>
) {
  // 確保查詢數量固定，避免違反React Hooks規則
  const maxQueries = 10; // 支援最多10個查詢
  const paddedQueries = [...queries];
  
  // 填充到固定長度，未使用的查詢設為disabled
  while (paddedQueries.length < maxQueries) {
    paddedQueries.push({
      key: `_unused_${paddedQueries.length}` as keyof T,
      queryKey: `unused_${paddedQueries.length}`,
      queryFn: async () => ({} as T[keyof T]),  // 返回空對象而非null來符合類型
      enabled: false,
    });
  }

  // 使用固定數量的Hook調用
  const result0 = useOptimizedQuery({ ...paddedQueries[0], enabled: paddedQueries[0] && queries.length > 0 ? paddedQueries[0].enabled !== false : false });
  const result1 = useOptimizedQuery({ ...paddedQueries[1], enabled: paddedQueries[1] && queries.length > 1 ? paddedQueries[1].enabled !== false : false });
  const result2 = useOptimizedQuery({ ...paddedQueries[2], enabled: paddedQueries[2] && queries.length > 2 ? paddedQueries[2].enabled !== false : false });
  const result3 = useOptimizedQuery({ ...paddedQueries[3], enabled: paddedQueries[3] && queries.length > 3 ? paddedQueries[3].enabled !== false : false });
  const result4 = useOptimizedQuery({ ...paddedQueries[4], enabled: paddedQueries[4] && queries.length > 4 ? paddedQueries[4].enabled !== false : false });
  const result5 = useOptimizedQuery({ ...paddedQueries[5], enabled: paddedQueries[5] && queries.length > 5 ? paddedQueries[5].enabled !== false : false });
  const result6 = useOptimizedQuery({ ...paddedQueries[6], enabled: paddedQueries[6] && queries.length > 6 ? paddedQueries[6].enabled !== false : false });
  const result7 = useOptimizedQuery({ ...paddedQueries[7], enabled: paddedQueries[7] && queries.length > 7 ? paddedQueries[7].enabled !== false : false });
  const result8 = useOptimizedQuery({ ...paddedQueries[8], enabled: paddedQueries[8] && queries.length > 8 ? paddedQueries[8].enabled !== false : false });
  const result9 = useOptimizedQuery({ ...paddedQueries[9], enabled: paddedQueries[9] && queries.length > 9 ? paddedQueries[9].enabled !== false : false });

  // 計算組合狀態
  return useMemo(() => {
    // 在 useMemo 內部創建 allResults 陣列，避免依賴問題
    const allResults = [result0, result1, result2, result3, result4, result5, result6, result7, result8, result9];
    const activeResults = allResults.slice(0, queries.length);
    const combinedResult = {} as Record<keyof T, typeof result0>;
    
    // 將結果映射回對應的key
    queries.forEach((queryConfig, index) => {
      if (activeResults[index]) {
        combinedResult[queryConfig.key] = activeResults[index] as typeof result0;
      }
    });

    return {
      queries: combinedResult,
      isLoading: activeResults.some(r => r?.isLoading) || false,
      isValidating: activeResults.some(r => r?.isValidating) || false,
      hasError: activeResults.some(r => r?.error !== null) || false,
      allLoaded: activeResults.every(r => r?.hasLoaded) || false,
    };
  }, [queries, result0, result1, result2, result3, result4, result5, result6, result7, result8, result9]);
}

/**
 * 導出緩存實例（用於全域操作）
 */
export { QueryCache };

export default useOptimizedQuery; 