/**
 * 分頁處理 Hook
 * 
 * 功能：統一處理專案中 12+ 個分頁場景的邏輯，提供一致的分頁體驗
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責分頁邏輯
 * - Flexible: 支援不同的 API 調用和配置選項
 * - Loosely coupled: 通過泛型和回調函數實現鬆耦合
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// 分頁響應的標準結構類型
interface PaginatedResponse<T> {
  results: T[];      // 當前頁的數據
  count: number;     // 總數據量
  next: string | null;    // 下一頁 URL
  previous: string | null; // 上一頁 URL
}

// 分頁配置選項
interface PaginationConfig {
  pageSize?: number;          // 每頁顯示的項目數量，默認 10
  autoLoad?: boolean;         // 是否自動載入第一頁，默認 true
  enableInfiniteScroll?: boolean; // 是否啟用無限滾動，默認 false
  resetOnDependencyChange?: boolean; // 當依賴變更時是否重置，默認 true
}

// 分頁狀態類型
interface PaginationState<T> {
  data: T[];                  // 當前載入的所有數據
  loading: boolean;           // 是否正在載入中
  error: string | null;       // 錯誤信息
  currentPage: number;        // 當前頁碼
  totalPages: number;         // 總頁數
  totalCount: number;         // 總數據量
  hasNextPage: boolean;       // 是否有下一頁
  hasPreviousPage: boolean;   // 是否有上一頁
  isFirstLoad: boolean;       // 是否為首次載入
}

// 分頁操作方法類型
interface PaginationActions {
  loadPage: (page: number) => Promise<void>;     // 載入指定頁面
  nextPage: () => Promise<void>;                 // 載入下一頁
  prevPage: () => Promise<void>;                 // 載入上一頁
  refresh: () => Promise<void>;                  // 刷新當前頁
  reset: () => void;                             // 重置到初始狀態
  loadMore: () => Promise<void>;                 // 載入更多（無限滾動）
}

// Hook 的返回類型
interface UsePaginationReturn<T> extends PaginationState<T>, PaginationActions {}

/**
 * 分頁 Hook - 統一處理各種分頁場景
 * 
 * @param fetchFunction - 獲取數據的函數，接收頁碼和每頁數量，返回分頁響應
 * @param config - 分頁配置選項
 * @param dependencies - 依賴項數組，當依賴變更時重新載入數據
 * @returns 分頁狀態和操作方法
 * 
 * 使用範例：
 * ```typescript
 * // 基本使用
 * const {
 *   data: posts,
 *   loading,
 *   error,
 *   currentPage,
 *   totalPages,
 *   nextPage,
 *   prevPage,
 *   refresh
 * } = usePagination(
 *   (page, pageSize) => getPosts(page, pageSize),
 *   { pageSize: 10 }
 * );
 * 
 * // 無限滾動使用
 * const {
 *   data: posts,
 *   loading,
 *   loadMore,
 *   hasNextPage
 * } = usePagination(
 *   (page, pageSize) => getPosts(page, pageSize),
 *   { enableInfiniteScroll: true }
 * );
 * ```
 */
export function usePagination<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  config: PaginationConfig = {},
  dependencies: unknown[] = []
): UsePaginationReturn<T> {
  // 配置選項解構，設置默認值
  const {
    pageSize = 10,
    autoLoad = true,
    enableInfiniteScroll = false,
    resetOnDependencyChange = true
  } = config;

  // 分頁狀態管理
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // 使用 ref 來避免在 useCallback 中的依賴問題
  const fetchFunctionRef = useRef(fetchFunction);
  fetchFunctionRef.current = fetchFunction;

  /**
   * 載入指定頁面的數據
   * 
   * @param page - 要載入的頁碼
   * @param append - 是否將新數據追加到現有數據（用於無限滾動）
   */
  const loadPage = useCallback(async (page: number, append: boolean = false) => {
    // 防止重複請求
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // 調用傳入的獲取數據函數
      const response = await fetchFunctionRef.current(page, pageSize);
      
      // 計算總頁數
      const calculatedTotalPages = Math.ceil(response.count / pageSize);
      
      // 更新狀態
      if (append && !isFirstLoad) {
        // 無限滾動模式：追加數據
        setData(prevData => [...prevData, ...response.results]);
      } else {
        // 普通分頁模式：替換數據
        setData(response.results);
      }
      
      setTotalCount(response.count);
      setTotalPages(calculatedTotalPages);
      setCurrentPage(page);
      setHasNextPage(!!response.next);
      setHasPreviousPage(!!response.previous);
      
      // 標記首次載入完成
      if (isFirstLoad) {
        setIsFirstLoad(false);
      }
      
    } catch (err: unknown) {
      // 統一錯誤處理
      const errorMessage = err instanceof Error ? err.message : '載入數據失敗';
      setError(errorMessage);
      
      // 如果是首次載入失敗，確保數據為空
      if (isFirstLoad) {
        setData([]);
      }
      
    } finally {
      setLoading(false);
    }
  }, [loading, pageSize, isFirstLoad]);

  /**
   * 載入下一頁
   * 在無限滾動模式下追加數據，否則替換數據
   */
  const nextPage = useCallback(async () => {
    if (!hasNextPage || loading) return;
    
    const nextPageNumber = currentPage + 1;
    await loadPage(nextPageNumber, enableInfiniteScroll);
  }, [hasNextPage, loading, currentPage, loadPage, enableInfiniteScroll]);

  /**
   * 載入上一頁
   * 只在非無限滾動模式下可用
   */
  const prevPage = useCallback(async () => {
    if (!hasPreviousPage || loading || enableInfiniteScroll) return;
    
    const prevPageNumber = currentPage - 1;
    await loadPage(prevPageNumber, false);
  }, [hasPreviousPage, loading, currentPage, loadPage, enableInfiniteScroll]);

  /**
   * 刷新當前頁面
   * 重新載入當前頁的數據
   */
  const refresh = useCallback(async () => {
    if (enableInfiniteScroll) {
      // 無限滾動模式：重新載入所有數據
      setData([]);
      setCurrentPage(1);
      setIsFirstLoad(true);
      await loadPage(1, false);
    } else {
      // 普通分頁模式：重新載入當前頁
      await loadPage(currentPage, false);
    }
  }, [loadPage, currentPage, enableInfiniteScroll]);

  /**
   * 重置到初始狀態
   * 清空所有數據並回到第一頁
   */
  const reset = useCallback(() => {
    setData([]);
    setLoading(false);
    setError(null);
    setCurrentPage(1);
    setTotalPages(0);
    setTotalCount(0);
    setHasNextPage(false);
    setHasPreviousPage(false);
    setIsFirstLoad(true);
  }, []);

  /**
   * 載入更多數據（無限滾動專用）
   * 等同於 nextPage，但語義更清晰
   */
  const loadMore = useCallback(async () => {
    if (!enableInfiniteScroll) {
      console.warn('loadMore 只能在啟用無限滾動模式下使用');
      return;
    }
    await nextPage();
  }, [enableInfiniteScroll, nextPage]);

  /**
   * 處理依賴項變更
   * 當外部依賴變更時，根據配置決定是否重置數據
   */
  useEffect(() => {
    if (!resetOnDependencyChange) return;

    // 重置狀態並重新載入第一頁
    reset();
    
    if (autoLoad) {
      loadPage(1, false);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  /**
   * 初始載入
   * 組件首次渲染時的自動載入邏輯
   */
  useEffect(() => {
    // 如果禁用自動載入，或者已經有數據了，就不自動載入
    if (!autoLoad || data.length > 0) return;

    loadPage(1, false);
  }, [autoLoad, loadPage, data.length]);

  // 返回狀態和操作方法
  return {
    // 狀態
    data,
    loading,
    error,
    currentPage,
    totalPages,
    totalCount,
    hasNextPage,
    hasPreviousPage,
    isFirstLoad,
    
    // 操作方法
    loadPage: (page: number) => loadPage(page, false),
    nextPage,
    prevPage,
    refresh,
    reset,
    loadMore,
  };
}

/**
 * 簡化版分頁 Hook - 適用於簡單的分頁場景
 * 
 * @param fetchFunction - 獲取數據的函數
 * @param pageSize - 每頁數量，默認 10
 * @returns 簡化的分頁狀態和操作
 */
export function useSimplePagination<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = 10
) {
  return usePagination(fetchFunction, { pageSize, autoLoad: true });
}

/**
 * 無限滾動 Hook - 適用於無限滾動場景
 * 
 * @param fetchFunction - 獲取數據的函數
 * @param pageSize - 每頁數量，默認 10
 * @returns 無限滾動的狀態和操作
 */
export function useInfiniteScroll<T>(
  fetchFunction: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize: number = 10
) {
  return usePagination(fetchFunction, {
    pageSize,
    autoLoad: true,
    enableInfiniteScroll: true
  });
}

// 導出類型，供其他模塊使用
export type {
  PaginatedResponse,
  PaginationConfig,
  PaginationState,
  PaginationActions,
  UsePaginationReturn
}; 