/**
 * 對話搜索組件
 * 
 * 職責：
 * - 提供對話搜索輸入介面
 * - 顯示搜索結果統計
 * - 處理搜索狀態管理
 * 
 * 設計原則：
 * - Narrowly focused: 只負責搜索相關的UI和邏輯
 * - Flexible: 支援自定義搜索配置
 * - Loosely coupled: 通過回調函數與父組件通信
 */

import React from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ConversationSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  resultCount: number;
  totalCount: number;
  placeholder?: string;
}

/**
 * 對話搜索組件
 */
const ConversationSearch: React.FC<ConversationSearchProps> = ({
  searchQuery,
  onSearchChange,
  resultCount,
  totalCount,
  placeholder = "搜尋聊天對象的姓名或用戶名..."
}) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
  };

  return (
    <div className="relative mb-8">
      {/* 搜索輸入框 */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-6 w-6 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            className="block w-full pl-12 pr-4 py-4 bg-transparent text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-0 text-lg"
            placeholder={placeholder}
            aria-label="搜索對話"
          />
        </div>
      </div>
      
      {/* 搜索結果統計 */}
      {searchQuery && (
        <div className="mt-2 text-sm text-slate-600 text-center">
          找到 {resultCount} 個相關對話
          {resultCount !== totalCount && ` (共 ${totalCount} 個對話)`}
        </div>
      )}
    </div>
  );
};

export default ConversationSearch; 