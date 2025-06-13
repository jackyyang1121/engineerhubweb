/**
 * 消息頁面標題組件
 * 
 * 職責：
 * - 顯示頁面標題和統計信息
 * - 提供新對話創建入口
 * - 處理用戶交互
 * 
 * 設計原則：
 * - Narrowly focused: 只負責標題區域的渲染和交互
 * - Flexible: 支援可配置的統計信息顯示
 * - Loosely coupled: 通過回調函數處理用戶操作
 */

import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';

interface MessageHeaderProps {
  conversationCount: number;
  totalUnreadCount: number;
  onNewChat: () => void;
}

/**
 * 格式化統計文本
 */
const formatStatsText = (count: number, unreadCount: number): string => {
  const baseText = `與 ${count} 位工程師保持聯繫`;
  
  if (unreadCount > 0) {
    return `${baseText}，${unreadCount} 則未讀消息`;
  }
  
  return baseText;
};

/**
 * 消息頁面標題組件
 */
const MessageHeader: React.FC<MessageHeaderProps> = ({
  conversationCount,
  totalUnreadCount,
  onNewChat
}) => {
  return (
    <div className="flex items-center justify-between mb-8">
      {/* 標題區域 */}
      <div className="flex items-center">
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-2xl shadow-lg mr-4">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
            訊息中心
          </h1>
          <p className="text-slate-600 mt-1">
            {formatStatsText(conversationCount, totalUnreadCount)}
          </p>
        </div>
      </div>
      
      {/* 新對話按鈕 */}
      <button
        onClick={onNewChat}
        className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
        aria-label="創建新對話"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        新對話
      </button>
    </div>
  );
};

export default MessageHeader; 