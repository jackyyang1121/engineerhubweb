/**
 * 對話列表項組件
 * 
 * 職責：
 * - 顯示單個對話的信息
 * - 處理對話項目的點擊事件
 * - 顯示未讀狀態和在線狀態
 * 
 * 設計原則：
 * - Narrowly focused: 只負責單個對話項目的渲染
 * - Flexible: 支援配置化的顯示選項
 * - Loosely coupled: 通過props接收數據，不依賴外部狀態
 */

import React, { memo } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import type { Conversation, UserData } from '../../api/chatApi';

interface ConversationDisplayConfig {
  showOnlineStatus: boolean;
  showUnreadBadge: boolean;
  showLastMessage: boolean;
  maxContentLength: number;
}

interface ConversationListItemProps {
  conversation: Conversation;
  currentUserId: string | undefined;
  displayConfig: ConversationDisplayConfig;
  onEnterChat: (conversationId: string) => void;
  onShowOptions: (event: React.MouseEvent, conversationId: string) => void;
  formatTime: (timestamp: string) => string;
}

/**
 * 獲取對話中的其他參與者
 */
const getOtherParticipants = (
  conversation: Conversation, 
  currentUserId: string | undefined
): UserData[] => {
  return conversation.participants_details.filter(
    (participant: UserData) => String(participant.id) !== String(currentUserId)
  );
};

/**
 * 截斷文本內容
 */
const truncateContent = (content: string, maxLength: number): string => {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
};

/**
 * 對話列表項組件
 */
const ConversationListItem: React.FC<ConversationListItemProps> = memo(({
  conversation,
  currentUserId,
  displayConfig,
  onEnterChat,
  onShowOptions,
  formatTime
}) => {
  const otherParticipants = getOtherParticipants(conversation, currentUserId);
  
  if (otherParticipants.length === 0) {
    return null;
  }

  const participant = otherParticipants[0];
  const displayName = participant.display_name || 
                     `${participant.first_name} ${participant.last_name}`.trim() || 
                     participant.username;

  const handleClick = () => {
    onEnterChat(String(conversation.id));
  };

  const handleOptionsClick = (event: React.MouseEvent) => {
    onShowOptions(event, String(conversation.id));
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center p-4 hover:bg-slate-50/80 transition-all duration-200 cursor-pointer border-b border-slate-100/50 last:border-b-0"
    >
      {/* 頭像區域 */}
      <div className="relative flex-shrink-0 mr-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-lg shadow-lg">
          {displayName.charAt(0).toUpperCase()}
        </div>
        
        {/* 在線狀態指示器 */}
        {displayConfig.showOnlineStatus && participant.is_online && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm" />
        )}
      </div>

      {/* 對話信息區域 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-slate-900 truncate">
            {displayName}
          </h3>
          
          {/* 時間顯示 */}
          {conversation.updated_at && (
            <span className="text-xs text-slate-500 flex-shrink-0 ml-2">
              {formatTime(conversation.updated_at)}
            </span>
          )}
        </div>

        {/* 最新消息預覽 */}
        {displayConfig.showLastMessage && conversation.latest_message && (
          <p className="text-sm text-slate-600 truncate">
            {truncateContent(conversation.latest_message.content, displayConfig.maxContentLength)}
          </p>
        )}
      </div>

      {/* 右側操作區域 */}
      <div className="flex items-center ml-4 space-x-2">
        {/* 未讀消息徽章 */}
        {displayConfig.showUnreadBadge && conversation.unread_count > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-2 font-medium shadow-lg">
            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
          </div>
        )}

        {/* 更多選項按鈕 */}
        <button
          onClick={handleOptionsClick}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
        >
          <EllipsisVerticalIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
});

ConversationListItem.displayName = 'ConversationListItem';

export default ConversationListItem; 