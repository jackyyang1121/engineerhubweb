/**
 * EngineerHub - Intersection Observer Hook
 * 
 * 職責：
 * - 提供元素可見性檢測功能
 * - 支援無限滾動實現
 * - 支援圖片懶載入
 * - 支援動畫觸發
 * 
 * 設計原則：
 * - Narrowly focused: 專注於可見性檢測
 * - Flexible: 支援多種配置選項
 * - Loosely coupled: 與具體業務邏輯解耦
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Intersection Observer 配置選項
 */
interface UseIntersectionObserverOptions {
  /** 根元素，null 表示視窗 */
  root?: Element | null;
  /** 根邊距 */
  rootMargin?: string;
  /** 觸發閾值 */
  threshold?: number | number[];
  /** 是否只觸發一次 */
  triggerOnce?: boolean;
  /** 是否啟用 */
  enabled?: boolean;
}

/**
 * Intersection Observer Hook
 * 
 * 功能：
 * - 檢測元素是否進入視窗
 * - 提供元素可見性狀態
 * - 支援自定義觸發條件
 * 
 * @param options - 配置選項
 * @returns 包含 ref、是否可見等狀態的對象
 * 
 * @example
 * ```tsx
 * function LazyImage({ src, alt }) {
 *   const { ref, isIntersecting } = useIntersectionObserver({
 *     threshold: 0.1,
 *     triggerOnce: true
 *   });
 *   
 *   return (
 *     <div ref={ref}>
 *       {isIntersecting ? (
 *         <img src={src} alt={alt} />
 *       ) : (
 *         <div className="placeholder">載入中...</div>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
) {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    triggerOnce = false,
    enabled = true,
  } = options;

  // 元素引用
  const elementRef = useRef<Element | null>(null);
  
  // 可見性狀態
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  // 入口信息
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  // 設置元素引用的回調
  const setRef = useCallback((element: Element | null) => {
    elementRef.current = element;
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    
    // 如果沒有元素或未啟用，則不執行
    if (!element || !enabled) {
      return;
    }

    // 檢查瀏覽器是否支援 Intersection Observer
    if (!window.IntersectionObserver) {
      console.warn('瀏覽器不支援 Intersection Observer');
      setIsIntersecting(true); // 降級處理：假設元素可見
      return;
    }

    // 創建觀察器
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setEntry(entry);
        setIsIntersecting(entry.isIntersecting);

        // 如果只觸發一次且已經可見，則停止觀察
        if (triggerOnce && entry.isIntersecting) {
          observer.unobserve(element);
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    // 開始觀察
    observer.observe(element);

    // 清理函數
    return () => {
      observer.unobserve(element);
    };
  }, [root, rootMargin, threshold, triggerOnce, enabled]);

  return {
    ref: setRef,
    isIntersecting,
    entry,
  };
}

/**
 * 無限滾動 Hook
 * 
 * 功能：
 * - 檢測是否滾動到底部
 * - 觸發載入更多數據
 * - 支援載入狀態管理
 * 
 * @param onLoadMore - 載入更多數據的回調
 * @param options - 配置選項
 * @returns 包含 ref 和載入狀態的對象
 * 
 * @example
 * ```tsx
 * function PostList() {
 *   const [posts, setPosts] = useState([]);
 *   const [hasMore, setHasMore] = useState(true);
 *   
 *   const { ref, isLoading } = useInfiniteScroll(
 *     async () => {
 *       const newPosts = await fetchMorePosts();
 *       setPosts(prev => [...prev, ...newPosts]);
 *       setHasMore(newPosts.length > 0);
 *     },
 *     { enabled: hasMore }
 *   );
 *   
 *   return (
 *     <div>
 *       {posts.map(post => <PostCard key={post.id} post={post} />)}
 *       <div ref={ref}>
 *         {isLoading && <div>載入中...</div>}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInfiniteScroll(
  onLoadMore: () => Promise<void> | void,
  options: {
    rootMargin?: string;
    threshold?: number;
    enabled?: boolean;
  } = {}
) {
  const {
    rootMargin = '100px',
    threshold = 0.1,
    enabled = true,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  // 載入更多數據的回調
  const handleLoadMore = useCallback(async () => {
    if (loadingRef.current || !enabled) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);

    try {
      await onLoadMore();
    } catch (error) {
      console.error('載入更多數據失敗:', error);
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, [onLoadMore, enabled]);

  // 使用 Intersection Observer 檢測觸發元素
  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
    enabled,
  });

  // 當觸發元素可見時載入更多數據
  useEffect(() => {
    if (isIntersecting && enabled) {
      handleLoadMore();
    }
  }, [isIntersecting, enabled, handleLoadMore]);

  return {
    ref,
    isLoading,
  };
}

/**
 * 懶載入 Hook
 * 
 * 功能：
 * - 延遲載入資源直到需要時
 * - 適用於圖片、組件等資源
 * - 支援預載入距離配置
 * 
 * @param options - 配置選項
 * @returns 包含 ref 和載入狀態的對象
 */
export function useLazyLoad(
  options: {
    rootMargin?: string;
    threshold?: number;
    triggerOnce?: boolean;
  } = {}
) {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true,
  } = options;

  const [shouldLoad, setShouldLoad] = useState(false);

  const { ref, isIntersecting } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce,
  });

  useEffect(() => {
    if (isIntersecting) {
      setShouldLoad(true);
    }
  }, [isIntersecting]);

  return {
    ref,
    shouldLoad,
    isIntersecting,
  };
}

export default useIntersectionObserver; 