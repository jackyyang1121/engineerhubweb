/**
 * EngineerHub - 防抖 Hook
 * 
 * 職責：
 * - 提供防抖功能，減少頻繁的API調用
 * - 優化搜尋和輸入性能
 * - 支援可配置的延遲時間
 * 
 * 設計原則：
 * - Narrowly focused: 專注於防抖功能
 * - Flexible: 支援自定義延遲時間和依賴項
 * - Loosely coupled: 通用化設計，可用於任何場景
 */

import { useState, useEffect } from 'react';

/**
 * 防抖 Hook
 * 
 * 功能：
 * - 延遲執行值的更新，避免頻繁觸發
 * - 適用於搜尋輸入、API 調用等場景
 * - 支援自定義延遲時間
 * 
 * @param value - 需要防抖的值
 * @param delay - 延遲時間（毫秒），預設 300ms
 * @returns 防抖後的值
 * 
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [searchTerm, setSearchTerm] = useState('');
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *   
 *   useEffect(() => {
 *     if (debouncedSearchTerm) {
 *       // 執行搜尋 API 調用
 *       performSearch(debouncedSearchTerm);
 *     }
 *   }, [debouncedSearchTerm]);
 *   
 *   return (
 *     <input
 *       value={searchTerm}
 *       onChange={(e) => setSearchTerm(e.target.value)}
 *       placeholder="搜尋..."
 *     />
 *   );
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  // 儲存防抖後的值
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // 設置定時器，在延遲時間後更新防抖值
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // 清理函數：清除定時器
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // 當 value 或 delay 改變時重新執行

  return debouncedValue;
}

/**
 * 防抖回調 Hook
 * 
 * 功能：
 * - 防抖函數調用，而不是值
 * - 適用於事件處理、API 調用等場景
 * - 支援取消待執行的回調
 * 
 * @param callback - 需要防抖的回調函數
 * @param delay - 延遲時間（毫秒），預設 300ms
 * @returns 包含防抖函數和取消函數的對象
 * 
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const { debouncedCallback: debouncedSearch, cancel } = useDebounceCallback(
 *     (term: string) => {
 *       performSearch(term);
 *     },
 *     500
 *   );
 *   
 *   return (
 *     <div>
 *       <input
 *         onChange={(e) => debouncedSearch(e.target.value)}
 *         placeholder="搜尋..."
 *       />
 *       <button onClick={cancel}>取消搜尋</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useDebounceCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay: number = 300
) {
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // 防抖回調函數
  const debouncedCallback = (...args: TArgs) => {
    // 清除之前的定時器
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // 設置新的定時器
    const newTimeoutId = setTimeout(() => {
      callback(...args);
      setTimeoutId(null);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  // 取消待執行的回調
  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  // 組件卸載時清理定時器
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  return {
    debouncedCallback,
    cancel,
    isPending: timeoutId !== null,
  };
}

/**
 * 即時防抖 Hook
 * 
 * 功能：
 * - 第一次調用立即執行，後續調用進行防抖
 * - 適用於需要即時回應但避免頻繁調用的場景
 * 
 * @param value - 需要防抖的值
 * @param delay - 延遲時間（毫秒），預設 300ms
 * @returns 防抖後的值
 */
export function useImmediateDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(true);

  useEffect(() => {
    // 第一次運行時立即更新
    if (isFirstRun) {
      setDebouncedValue(value);
      setIsFirstRun(false);
      return;
    }

    // 後續運行使用防抖
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, isFirstRun]);

  return debouncedValue;
}

export default useDebounce; 