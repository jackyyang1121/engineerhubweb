/**
 * EngineerHub - 虛擬化列表組件
 * 
 * 職責：
 * - 提供高性能的大數據列表渲染
 * - 只渲染可見範圍內的項目
 * - 支援動態高度和無限滾動
 * 
 * 設計原則：
 * - Narrowly focused: 專注於虛擬化渲染
 * - Flexible: 支援多種配置和自定義渲染
 * - Loosely coupled: 可用於任何列表場景
 */

import React, { 
  useState, 
  useEffect, 
  useRef, 
  useCallback, 
  useMemo
} from 'react';
import type { ReactElement } from 'react';
import { useInfiniteScroll } from '../../hooks/useIntersectionObserver';

/**
 * 列表項目介面
 */
interface VirtualizedItem<T = unknown> {
  /** 項目數據 */
  data: T;
  /** 項目高度（像素） */
  height?: number;
  /** 項目唯一標識 */
  id: string | number;
}

/**
 * 渲染項目屬性
 */
interface RenderItemProps<T> {
  /** 項目數據 */
  item: T;
  /** 項目索引 */
  index: number;
  /** 項目樣式 */
  style: React.CSSProperties;
  /** 是否可見 */
  isVisible: boolean;
}

/**
 * 虛擬化列表配置
 */
interface VirtualizedListConfig {
  /** 項目高度（固定高度模式） */
  itemHeight?: number;
  /** 容器高度 */
  containerHeight: number;
  /** 預渲染項目數量（緩衝區） */
  overscan?: number;
  /** 是否啟用動態高度 */
  enableDynamicHeight?: boolean;
  /** 間距 */
  gap?: number;
}

/**
 * 虛擬化列表組件屬性
 */
interface VirtualizedListProps<T> {
  /** 列表項目 */
  items: T[];
  /** 渲染項目的函數 */
  renderItem: (props: RenderItemProps<T>) => ReactElement;
  /** 獲取項目 ID 的函數 */
  getItemId: (item: T, index: number) => string | number;
  /** 配置選項 */
  config: VirtualizedListConfig;
  /** 空狀態組件 */
  emptyState?: ReactElement;
  /** 載入更多回調 */
  onLoadMore?: () => Promise<void> | void;
  /** 是否有更多數據 */
  hasMore?: boolean;
  /** 是否正在載入 */
  isLoading?: boolean;
  /** 載入組件 */
  loadingComponent?: ReactElement;
  /** 容器樣式類名 */
  className?: string;
}

/**
 * 計算可見範圍
 */
function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  itemCount: number,
  overscan: number = 3
) {
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + overscan,
    itemCount
  );

  return {
    startIndex: Math.max(0, startIndex - overscan),
    endIndex,
    visibleStartIndex: startIndex,
    visibleEndIndex: Math.min(startIndex + Math.ceil(containerHeight / itemHeight), itemCount)
  };
}

/**
 * 虛擬化列表組件
 * 
 * 功能：
 * - 只渲染可見區域的項目，提升大列表性能
 * - 支援固定高度和動態高度模式
 * - 內建無限滾動支援
 * - 支援預渲染緩衝區
 * 
 * @example
 * ```tsx
 * const posts = [
 *   { id: 1, title: '貼文1', content: '內容1' },
 *   { id: 2, title: '貼文2', content: '內容2' },
 * ];
 * 
 * <VirtualizedList
 *   items={posts}
 *   getItemId={(item) => item.id}
 *   config={{
 *     itemHeight: 200,
 *     containerHeight: 600,
 *     overscan: 5
 *   }}
 *   renderItem={({ item, index, style }) => (
 *     <div style={style}>
 *       <PostCard post={item} />
 *     </div>
 *   )}
 *   onLoadMore={loadMorePosts}
 *   hasMore={hasMorePosts}
 * />
 * ```
 */
export function VirtualizedList<T>({
  items,
  renderItem,
  getItemId,
  config,
  emptyState,
  onLoadMore,
  hasMore = false,
  isLoading = false,
  loadingComponent,
  className = ''
}: VirtualizedListProps<T>) {
  const {
    itemHeight = 100,
    containerHeight,
    overscan = 3,
    enableDynamicHeight = false,
    gap = 0
  } = config;

  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 滾動位置
  const [scrollTop, setScrollTop] = useState(0);
  
  // 動態高度映射（當啟用動態高度時）
  const [itemHeights, setItemHeights] = useState<Map<string | number, number>>(new Map());

  // 計算總高度
  const totalHeight = useMemo(() => {
    if (enableDynamicHeight) {
      let height = 0;
      items.forEach((item, index) => {
        const id = getItemId(item, index);
        const dynamicHeight = itemHeights.get(id) || itemHeight;
        height += dynamicHeight + gap;
      });
      return height;
    }
    
    return items.length * (itemHeight + gap);
  }, [items, itemHeight, gap, enableDynamicHeight, itemHeights, getItemId]);

  // 計算可見範圍
  const visibleRange = useMemo(() => {
    if (enableDynamicHeight) {
      // 動態高度模式下的計算較複雜，這裡簡化處理
      const averageHeight = itemHeight;
      return calculateVisibleRange(scrollTop, containerHeight, averageHeight, items.length, overscan);
    }
    
    return calculateVisibleRange(scrollTop, containerHeight, itemHeight, items.length, overscan);
  }, [scrollTop, containerHeight, itemHeight, items.length, overscan, enableDynamicHeight]);

  // 可見項目
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);

  // 滾動處理
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  // 項目高度測量（動態高度模式）
  const measureItemHeight = useCallback((id: string | number, height: number) => {
    if (enableDynamicHeight) {
      setItemHeights(prev => {
        const newMap = new Map(prev);
        newMap.set(id, height);
        return newMap;
      });
    }
  }, [enableDynamicHeight]);

  // 無限滾動
  const { ref: loadMoreRef } = useInfiniteScroll(
    async () => {
      if (onLoadMore && hasMore && !isLoading) {
        await onLoadMore();
      }
    },
    { 
      enabled: hasMore && !isLoading,
      threshold: 0.5 
    }
  );

  // 計算項目位置
  const getItemStyle = useCallback((index: number): React.CSSProperties => {
    const actualIndex = visibleRange.startIndex + index;
    
    if (enableDynamicHeight) {
      // 動態高度模式：累計計算位置
      let top = 0;
      for (let i = 0; i < actualIndex; i++) {
        const item = items[i];
        if (item) {
          const id = getItemId(item, i);
          const height = itemHeights.get(id) || itemHeight;
          top += height + gap;
        }
      }
      
      return {
        position: 'absolute',
        top,
        left: 0,
        right: 0,
        height: itemHeight // 初始高度，實際渲染後會更新
      };
    }
    
    // 固定高度模式
    return {
      position: 'absolute',
      top: actualIndex * (itemHeight + gap),
      left: 0,
      right: 0,
      height: itemHeight
    };
  }, [visibleRange.startIndex, enableDynamicHeight, items, getItemId, itemHeights, itemHeight, gap]);

  // 空狀態
  if (items.length === 0 && !isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        {emptyState || (
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-2">📝</div>
            <p>暫無數據</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* 虛擬滾動容器 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* 渲染可見項目 */}
        {visibleItems.map((item, index) => {
          const actualIndex = visibleRange.startIndex + index;
          const id = getItemId(item, actualIndex);
          const style = getItemStyle(index);
          const isVisible = actualIndex >= visibleRange.visibleStartIndex && 
                           actualIndex < visibleRange.visibleEndIndex;

          return (
            <VirtualizedItem
              key={id}
              item={item}
              index={actualIndex}
              style={style}
              isVisible={isVisible}
              renderItem={renderItem}
              measureHeight={measureItemHeight}
              itemId={id}
              enableDynamicHeight={enableDynamicHeight}
            />
          );
        })}

        {/* 載入更多觸發器 */}
        {hasMore && (
          <div 
            ref={loadMoreRef} 
            style={{ 
              position: 'absolute',
              top: totalHeight - 100,
              left: 0,
              right: 0,
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isLoading && (
              loadingComponent || (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span>載入中...</span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 虛擬化項目組件
 */
interface VirtualizedItemProps<T> {
  item: T;
  index: number;
  style: React.CSSProperties;
  isVisible: boolean;
  renderItem: (props: RenderItemProps<T>) => ReactElement;
  measureHeight: (id: string | number, height: number) => void;
  itemId: string | number;
  enableDynamicHeight: boolean;
}

function VirtualizedItem<T>({
  item,
  index,
  style,
  isVisible,
  renderItem,
  measureHeight,
  itemId,
  enableDynamicHeight
}: VirtualizedItemProps<T>) {
  const itemRef = useRef<HTMLDivElement>(null);

  // 測量高度
  useEffect(() => {
    if (enableDynamicHeight && itemRef.current) {
      const height = itemRef.current.offsetHeight;
      measureHeight(itemId, height);
    }
  }, [enableDynamicHeight, measureHeight, itemId]);

  return (
    <div ref={itemRef} style={style}>
      {renderItem({ item, index, style, isVisible })}
    </div>
  );
}

export default VirtualizedList; 