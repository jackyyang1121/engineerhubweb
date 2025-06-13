/**
 * 對話列表組件
 * 
 * 職責：
 * - 渲染對話列表
 * - 處理空狀態顯示
 * - 管理對話項目的統一樣式
 * 
 * 設計原則：
 * - Narrowly focused: 只負責對話列表的渲染邏輯
 * - Flexible: 支援不同的空狀態配置
 * - Loosely coupled: 通過props接收數據和事件處理器
 */

import React from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import ConversationListItem from './ConversationListItem';
import EmptyState from '../common/EmptyState';
import type { Conversation } from '../../api/chatApi';

interface ConversationDisplayConfig {
  showOnlineStatus: boolean;
  showUnreadBadge: boolean;
  showLastMessage: boolean;
  maxContentLength: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string | undefined;
  displayConfig: ConversationDisplayConfig;
  onEnterChat: (conversationId: string) => void;
  onShowOptions: (event: React.MouseEvent, conversationId: string) => void;
  formatTime: (timestamp: string) => string;
  searchQuery?: string;
}

/**
 * 獲取空狀態配置
 */
const getEmptyStateConfig = (searchQuery?: string) => {
  if (searchQuery) {
    return {
      title: "找不到相關對話",
      description: `沒有找到包含 "${searchQuery}" 的對話，試試其他關鍵字`
    };
  }
  
  return {
    title: "尚無聊天記錄",
    description: "開始與其他工程師交流吧！分享你的想法、技術心得和專案經驗。"
  };
};

/**
 * 對話列表組件
 */
const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  currentUserId,
  displayConfig,
  onEnterChat,
  onShowOptions,
  formatTime,
  searchQuery
}) => {
  // 如果沒有對話，顯示空狀態
  if (conversations.length === 0) {
    const emptyConfig = getEmptyStateConfig(searchQuery);
    
    return (
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="p-8">
          <EmptyState
            icon={ChatBubbleLeftRightIcon}
            title={emptyConfig.title}
            description={emptyConfig.description}
          />
        </div>
      </div>
    );
  }

  // 渲染對話列表
  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
      <div className="divide-y divide-slate-100/50">
        {conversations.map((conversation) => (
          <ConversationListItem
            key={conversation.id}
            conversation={conversation}
            currentUserId={currentUserId}
            displayConfig={displayConfig}
            onEnterChat={onEnterChat}
            onShowOptions={onShowOptions}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  );
};

export default ConversationList; 