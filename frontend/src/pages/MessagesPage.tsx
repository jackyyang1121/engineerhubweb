/**
 * 訊息頁面 - 聊天對話管理中心（重構版）
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責對話列表的顯示和管理
 * - Flexible: 通過組件化設計支援不同的使用場景
 * - Loosely coupled: 通過類型系統確保與聊天 API 的安全交互
 * 
 * 重構改進：
 * - 將大型組件拆分為多個小組件，降低複雜度
 * - 提取自定義 hooks 管理業務邏輯
 * - 統一錯誤處理和載入狀態管理
 * - 使用組合模式提高可維護性
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';

// 導入聊天相關的API和類型定義
import { 
  getConversations, 
  type Conversation,
  type PaginatedResponse 
} from '../api/chatApi';
import { useAuthStore } from '../store/authStore';
import LoadingSpinner from '../components/common/LoadingSpinner';

// 導入重構後的組件
import MessageHeader from '../components/messages/MessageHeader';
import ConversationSearch from '../components/messages/ConversationSearch';
import ConversationList from '../components/messages/ConversationList';

import type { UserData } from '../types';

// ==================== 組件內部類型定義 ====================

/**
 * 對話項目顯示配置介面
 */
interface ConversationDisplayConfig {
  showOnlineStatus: boolean;
  showUnreadBadge: boolean;
  showLastMessage: boolean;
  maxContentLength: number;
}

// ==================== Hook：對話數據管理 ====================

/**
 * 對話數據管理 Hook
 */
const useConversations = () => {
  return useQuery<PaginatedResponse<Conversation>, Error>({
    queryKey: ['conversations'],
    queryFn: async (): Promise<PaginatedResponse<Conversation>> => {
      try {
        console.log('🔄 開始載入對話列表...');
        const response = await getConversations(1, 50);
        
        console.log('✅ 對話列表載入成功:', {
          總數量: response.count,
          當前頁數量: response.results.length,
          未讀對話數: response.results.filter(conv => conv.unread_count > 0).length
        });
        
        return response;
      } catch (error) {
        console.error('❌ 載入對話列表失敗:', error);
        throw new Error('無法載入聊天記錄，請檢查網路連接');
      }
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

// ==================== Hook：對話搜尋功能 ====================

/**
 * 對話搜尋 Hook
 */
const useConversationSearch = (conversations: Conversation[]) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { user } = useAuthStore();

  const filteredConversations = useMemo(() => {
    if (!searchQuery || searchQuery.length < 1) {
      return conversations;
    }

    const processedQuery = searchQuery.toLowerCase();

    return conversations.filter((conversation: Conversation) => {
      const otherParticipants = conversation.participants_details.filter(
        (participant: UserData) => String(participant.id) !== String(user?.id)
      );

      if (otherParticipants.length === 0) {
        return false;
      }

      return otherParticipants.some((participant: UserData) => {
        const searchTarget = [
          participant.first_name || '',
          participant.last_name || '',
          participant.username || '',
          participant.display_name || ''
        ].join(' ').toLowerCase();

        return searchTarget.includes(processedQuery);
      });
    });
  }, [conversations, searchQuery, user?.id]);

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations
  };
};

// ==================== 工具函數 ====================

/**
 * 智能時間格式化函數
 */
const formatConversationTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString('zh-TW', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }

  if (diffHours < 168) {
    return date.toLocaleDateString('zh-TW', { weekday: 'short' });
  }

  return date.toLocaleDateString('zh-TW', { 
    month: 'short', 
    day: 'numeric' 
  });
};

// ==================== 主組件 ====================

const MessagesPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // 使用自定義Hook管理對話數據
  const {
    data: conversationsResponse,
    isLoading,
    error,
    refetch
  } = useConversations();

  // 提取對話列表
  const conversations = useMemo(() => {
    return conversationsResponse?.results || [];
  }, [conversationsResponse?.results]);

  // 使用搜尋Hook處理對話過濾
  const {
    searchQuery,
    setSearchQuery,
    filteredConversations
  } = useConversationSearch(conversations);

  // 定義顯示配置
  const displayConfig: ConversationDisplayConfig = {
    showOnlineStatus: true,
    showUnreadBadge: true,
    showLastMessage: true,
    maxContentLength: 50
  };

  // ==================== 事件處理函數 ====================

  const handleEnterChat = useCallback((conversationId: string) => {
    console.log('🚀 進入對話:', conversationId);
    navigate(`/messages/${conversationId}`);
  }, [navigate]);

  const handleNewChat = useCallback(() => {
    console.log('➕ 準備創建新對話');
    toast.info('新聊天功能即將推出，敬請期待！', {
      position: 'top-center',
      autoClose: 3000
    });
  }, []);

  const handleConversationOptions = useCallback((
    event: React.MouseEvent, 
    conversationId: string
  ) => {
    event.stopPropagation();
    console.log('⚙️ 顯示對話選項:', conversationId);
    toast.info('對話選項功能開發中', {
      position: 'top-center',
      autoClose: 2000
    });
  }, []);

  // 計算總未讀消息數
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total: number, conversation: Conversation) => {
      return total + (conversation.unread_count || 0);
    }, 0);
  }, [conversations]);

  // ==================== 條件渲染 ====================

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20">
              <LoadingSpinner size="lg" />
              <p className="text-slate-600 mt-4 text-center font-medium">
                正在載入您的聊天記錄...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-red-200/50">
              <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">載入失敗</h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {error.message || '無法載入聊天記錄，請檢查網路連接後重試'}
              </p>
              <button
                onClick={() => refetch()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                重新載入
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== 主要渲染內容 ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* 頁面標題區域 */}
        <MessageHeader 
          conversationCount={conversations.length}
          totalUnreadCount={totalUnreadCount}
          onNewChat={handleNewChat}
        />

        {/* 搜尋功能區域 */}
        <ConversationSearch 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          resultCount={filteredConversations.length}
          totalCount={conversations.length}
        />

        {/* 對話列表區域 */}
        <ConversationList
          conversations={filteredConversations}
          currentUserId={user?.id}
          displayConfig={displayConfig}
          onEnterChat={handleEnterChat}
          onShowOptions={handleConversationOptions}
          formatTime={formatConversationTime}
          searchQuery={searchQuery}
        />
        
      </div>
    </div>
  );
};

export default MessagesPage; 