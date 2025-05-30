/**
 * 訊息頁面
 * 
 * 功能：
 * 1. 顯示聊天對象列表
 * 2. 展示最近的訊息預覽
 * 3. 支援搜尋聊天對象
 * 4. 快速進入聊天詳情
 */

import React, { useState} from 'react';
import {useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import { chatAPI, type Conversation } from '../api/chat';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation] = useState<string | null>(null);

  // 獲取對話列表
  const {
    data: conversations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const response = await chatAPI.getConversations();
        console.log('💬 聊天 API 響應:', response);
        // 確保返回數組，即使 API 響應不正確
        return Array.isArray(response.conversations) ? response.conversations : [];
      } catch (error) {
        console.error('💬 獲取對話列表失敗:', error);
        // 返回空數組而不是 undefined
        return [];
      }
    },
    refetchInterval: 30000, // 每30秒刷新一次
    staleTime: 10000, // 10秒內認為數據新鮮
  });

  // 過濾對話列表
  const filteredConversations = conversations.filter(conversation => {
    if (!searchQuery) return true;
    
    const otherParticipant = conversation.participants.find(p => String(p.id) !== String(user?.id));
    if (!otherParticipant) return false;

    const searchTarget = `${otherParticipant.first_name} ${otherParticipant.last_name} ${otherParticipant.username}`.toLowerCase();
    return searchTarget.includes(searchQuery.toLowerCase());
  });

  // 格式化時間
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (diffHours < 24 * 7) {
      return date.toLocaleDateString('zh-TW', {
        weekday: 'short'
      });
    } else {
      return date.toLocaleDateString('zh-TW', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 獲取對話中的其他參與者
  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find(p => String(p.id) !== String(user?.id));
  };

  // 處理進入聊天
  const handleEnterChat = (conversationId: string) => {
    navigate(`/messages/${conversationId}`);
  };

  // 開始新聊天
  const handleNewChat = () => {
    // TODO: 實現新聊天功能（選擇用戶後創建對話）
    toast.info('新聊天功能即將推出');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" text="載入聊天記錄..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">載入失敗</h2>
            <p className="text-gray-600 mb-4">無法載入聊天記錄，請重試</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              重新載入
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 頁面標題 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">訊息</h1>
          </div>
          
          <button
            onClick={handleNewChat}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新對話
          </button>
        </div>

        {/* 搜尋框 */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="搜尋聊天對象..."
          />
        </div>

        {/* 對話列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredConversations.length === 0 ? (
            <EmptyState
              icon={ChatBubbleLeftRightIcon}
              title={searchQuery ? "找不到相關對話" : "尚無聊天記錄"}
              description={
                searchQuery 
                  ? "試試搜尋其他關鍵字"
                  : "開始與其他工程師交流吧！分享你的想法和經驗。"
              }
              action={{
                label: "開始新對話",
                onClick: handleNewChat
              }}
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredConversations.map((conversation) => {
                const otherParticipant = getOtherParticipant(conversation);
                if (!otherParticipant) return null;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleEnterChat(conversation.id)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* 頭像 */}
                      <div className="relative">
                        <img
                          src={
                            otherParticipant.avatar || 
                            `https://ui-avatars.com/api/?name=${otherParticipant.username}&background=random&size=48`
                          }
                          alt={otherParticipant.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        {otherParticipant.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                        )}
                      </div>

                      {/* 對話信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {otherParticipant.first_name} {otherParticipant.last_name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              @{otherParticipant.username}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            {conversation.last_message && (
                              <p className="text-xs text-gray-500">
                                {formatTime(conversation.updated_at)}
                              </p>
                            )}
                            {conversation.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full mt-1">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 最新訊息 */}
                        {conversation.last_message ? (
                          <div className="mt-1">
                            <p className={`text-sm ${
                              conversation.unread_count > 0 ? 'font-medium text-gray-900' : 'text-gray-600'
                            } truncate`}>
                              {String(conversation.last_message.sender.id) === String(user?.id) ? (
                                <span className="flex items-center">
                                  <PaperAirplaneIcon className="h-3 w-3 mr-1 text-gray-400" />
                                  {conversation.last_message.content}
                                </span>
                              ) : (
                                conversation.last_message.content
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 mt-1">點擊開始聊天</p>
                        )}
                      </div>

                      {/* 更多選項 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: 實現更多選項（靜音、刪除對話等）
                          toast.info('更多選項功能即將推出');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <EllipsisVerticalIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 統計信息 */}
        {filteredConversations.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            共 {filteredConversations.length} 個對話
            {conversations.some(c => c.unread_count > 0) && (
              <span className="ml-2">
                • {conversations.reduce((sum, c) => sum + c.unread_count, 0)} 條未讀訊息
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage; 