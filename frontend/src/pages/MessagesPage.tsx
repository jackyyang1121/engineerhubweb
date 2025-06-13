/**
 * 訊息頁面 - 聊天對話管理中心
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責對話列表的顯示和管理
 * - Flexible: 通過依賴注入和配置選項支援不同的使用場景
 * - Loosely coupled: 通過類型系統確保與聊天 API 的安全交互
 * 
 * 功能：
 * 1. 顯示用戶的所有聊天對話列表
 * 2. 提供即時的對話搜尋和過濾功能
 * 3. 展示最新消息預覽和未讀消息計數
 * 4. 支援快速進入特定聊天對話
 * 5. 提供創建新對話的功能入口
 * 
 * 重構重點：
 * - 統一的錯誤處理和載入狀態管理
 * - 類型安全的數據處理和顯示
 * - 模塊化的組件結構便於維護和測試
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  PlusIcon,
  PaperAirplaneIcon,
  EllipsisVerticalIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/solid';
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
import EmptyState from '../components/common/EmptyState';
import type { UserData } from '../types';

// ==================== 組件內部類型定義 ====================

/**
 * 對話搜尋配置介面
 * 定義搜尋功能的行為參數
 */
interface SearchConfig {
  placeholder: string;        // 搜尋框提示文字
  minLength: number;         // 最小搜尋字符數
  caseSensitive: boolean;    // 是否區分大小寫
}

/**
 * 對話項目顯示配置介面
 * 控制對話項目的顯示方式
 */
interface ConversationDisplayConfig {
  showOnlineStatus: boolean;  // 是否顯示在線狀態
  showUnreadBadge: boolean;  // 是否顯示未讀計數
  showLastMessage: boolean;  // 是否顯示最新消息
  maxContentLength: number;  // 消息內容最大顯示長度
}

// ==================== Hook：對話數據管理 ====================

/**
 * 對話數據管理 Hook
 * 
 * 職責：
 * - 管理對話列表的載入和刷新
 * - 提供統一的錯誤處理
 * - 實現數據快取策略
 * 
 * @returns 對話數據、載入狀態和操作函數
 */
const useConversations = () => {
  return useQuery<PaginatedResponse<Conversation>, Error>({
    queryKey: ['conversations'],
    queryFn: async (): Promise<PaginatedResponse<Conversation>> => {
      try {
        console.log('🔄 開始載入對話列表...');
        const response = await getConversations(1, 50); // 載入前50個對話
        
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
    refetchInterval: 30000,        // 每30秒自動刷新
    staleTime: 10000,             // 10秒內認為數據新鮮
    retry: 3,                     // 失敗後重試3次
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000) // 指數退避重試
  });
};

// ==================== Hook：對話搜尋功能 ====================

/**
 * 對話搜尋 Hook
 * 
 * 職責：
 * - 提供即時搜尋功能
 * - 支援多種搜尋條件組合
 * - 優化搜尋性能
 * 
 * @param conversations - 原始對話列表
 * @param config - 搜尋配置選項
 * @returns 搜尋狀態和過濾後的對話列表
 */
const useConversationSearch = (
  conversations: Conversation[], 
  config: SearchConfig = {
    placeholder: '搜尋聊天對象...',
    minLength: 1,
    caseSensitive: false
  }
) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { user } = useAuthStore();

  // 使用 useMemo 優化搜尋性能，避免不必要的重新計算
  const filteredConversations = useMemo(() => {
    // 如果搜尋關鍵字不足最小長度，返回全部對話
    if (!searchQuery || searchQuery.length < config.minLength) {
      return conversations;
    }

    // 處理搜尋關鍵字：根據配置決定是否區分大小寫
    const processedQuery = config.caseSensitive 
      ? searchQuery 
      : searchQuery.toLowerCase();

    return conversations.filter((conversation: Conversation) => {
      // 查找對話中除當前用戶外的其他參與者
      const otherParticipants = conversation.participants_details.filter(
        (participant: UserData) => String(participant.id) !== String(user?.id)
      );

      // 如果沒有其他參與者，不顯示此對話
      if (otherParticipants.length === 0) {
        return false;
      }

      // 對每個參與者進行搜尋匹配
      return otherParticipants.some((participant: UserData) => {
        // 構建搜尋目標字符串：包含姓名和用戶名
        const searchTarget = [
          participant.first_name || '',
          participant.last_name || '',
          participant.username || '',
          participant.display_name || ''
        ].join(' ');

        const processedTarget = config.caseSensitive 
          ? searchTarget 
          : searchTarget.toLowerCase();

        return processedTarget.includes(processedQuery);
      });
    });
  }, [conversations, searchQuery, config, user?.id]);

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    searchConfig: config
  };
};

// ==================== 工具函數：時間格式化 ====================

/**
 * 智能時間格式化函數
 * 
 * 職責：
 * - 根據時間差異選擇合適的顯示格式
 * - 提供用戶友好的時間表示
 * 
 * @param timestamp - ISO格式的時間字符串
 * @returns 格式化後的時間顯示字符串
 */
const formatConversationTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  // 今天內：顯示具體時間
  if (diffHours < 24) {
    return date.toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // 使用24小時制
    });
  }
  
  // 一週內：顯示星期
  if (diffHours < 24 * 7) {
    return date.toLocaleDateString('zh-TW', {
      weekday: 'short'
    });
  }
  
  // 超過一週：顯示日期
  return date.toLocaleDateString('zh-TW', {
    month: 'short',
    day: 'numeric'
  });
};

// ==================== 工具函數：參與者信息獲取 ====================

/**
 * 獲取對話中的其他參與者
 * 
 * 職責：
 * - 從對話參與者中排除當前用戶
 * - 處理群組對話的多個參與者
 * - 提供安全的參與者信息訪問
 * 
 * @param conversation - 對話對象
 * @param currentUserId - 當前用戶ID
 * @returns 其他參與者的用戶數據數組
 */
const getOtherParticipants = (
  conversation: Conversation, 
  currentUserId: string | undefined
): UserData[] => {
  if (!currentUserId || !conversation.participants_details) {
    return [];
  }

  return conversation.participants_details.filter(
    (participant: UserData) => String(participant.id) !== String(currentUserId)
  );
};

// ==================== 主組件：MessagesPage ====================

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

  // 提取對話列表，提供安全的默認值
  const conversations = conversationsResponse?.results || [];

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

  /**
   * 處理進入特定聊天對話
   * 
   * @param conversationId - 對話ID
   */
  const handleEnterChat = useCallback((conversationId: string) => {
    console.log('🚀 進入對話:', conversationId);
    navigate(`/messages/${conversationId}`);
  }, [navigate]);

  /**
   * 處理創建新聊天對話
   * 目前顯示提示信息，後續可擴展為完整的用戶選擇功能
   */
  const handleNewChat = useCallback(() => {
    console.log('➕ 準備創建新對話');
    toast.info('新聊天功能即將推出，敬請期待！', {
      position: 'top-center',
      autoClose: 3000
    });
  }, []);

  /**
   * 處理對話選項菜單
   * 
   * @param event - 點擊事件
   * @param conversationId - 對話ID
   */
  const handleConversationOptions = useCallback((
    event: React.MouseEvent, 
    conversationId: string
  ) => {
    event.stopPropagation(); // 防止觸發對話點擊事件
    console.log('⚙️ 顯示對話選項:', conversationId);
    toast.info('對話選項功能開發中', {
      position: 'top-center',
      autoClose: 2000
    });
  }, []);

  // ==================== 統計數據計算 ====================

  // 計算總未讀消息數，使用reduce進行安全累加
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((total: number, conversation: Conversation) => {
      return total + (conversation.unread_count || 0);
    }, 0);
  }, [conversations]);

  // ==================== 條件渲染：載入狀態 ====================

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

  // ==================== 條件渲染：錯誤狀態 ====================

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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-3 rounded-2xl shadow-lg mr-4">
              <ChatBubbleLeftRightIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                訊息中心
              </h1>
              <p className="text-slate-600 mt-1">
                與 {conversations.length} 位工程師保持聯繫
              </p>
            </div>
          </div>
          
          {/* 新對話按鈕 */}
          <button
            onClick={handleNewChat}
            className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            新對話
          </button>
        </div>

        {/* 搜尋功能區域 */}
        <div className="relative mb-8">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-6 w-6 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 bg-transparent text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-0 text-lg"
                placeholder="搜尋聊天對象的姓名或用戶名..."
              />
            </div>
          </div>
          
          {/* 搜尋結果統計 */}
          {searchQuery && (
            <div className="mt-2 text-sm text-slate-600 text-center">
              找到 {filteredConversations.length} 個相關對話
            </div>
          )}
        </div>

        {/* 對話列表區域 */}
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          {filteredConversations.length === 0 ? (
            // 空狀態顯示
            <div className="p-8">
              <EmptyState
                icon={ChatBubbleLeftRightIcon}
                title={searchQuery ? "找不到相關對話" : "尚無聊天記錄"}
                description={
                  searchQuery 
                    ? `沒有找到包含 "${searchQuery}" 的對話，試試其他關鍵字`
                    : "開始與其他工程師交流吧！分享你的想法、技術心得和專案經驗。"
                }
                action={{
                  label: searchQuery ? "清除搜尋" : "開始新對話",
                  onClick: searchQuery ? () => setSearchQuery('') : handleNewChat
                }}
              />
            </div>
          ) : (
            // 對話列表
            <div className="divide-y divide-slate-200/50">
              {filteredConversations.map((conversation: Conversation) => {
                // 獲取對話中的其他參與者
                const otherParticipants = getOtherParticipants(conversation, user?.id);
                
                // 如果沒有其他參與者，跳過此對話
                if (otherParticipants.length === 0) {
                  return null;
                }
                
                // 獲取主要顯示的參與者（群組對話時取第一個）
                const primaryParticipant = otherParticipants[0];
                const isGroupChat = otherParticipants.length > 1;

                return (
                  <div
                    key={conversation.id}
                    onClick={() => handleEnterChat(conversation.id)}
                    className="p-6 hover:bg-white/50 cursor-pointer transition-all duration-300 group"
                  >
                    <div className="flex items-start space-x-4">
                      
                      {/* 用戶頭像區域 */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={
                            primaryParticipant.avatar || 
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(primaryParticipant.username || 'User')}&background=random&size=56`
                          }
                          alt={primaryParticipant.username}
                          className="w-14 h-14 rounded-2xl object-cover border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                        />
                        
                        {/* 在線狀態指示器 */}
                        {displayConfig.showOnlineStatus && primaryParticipant.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
                        )}
                        
                        {/* 群組對話指示器 */}
                        {isGroupChat && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {otherParticipants.length}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* 對話信息區域 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                              {isGroupChat 
                                ? `${primaryParticipant.first_name || primaryParticipant.username} 等 ${otherParticipants.length} 人`
                                : `${primaryParticipant.first_name || ''} ${primaryParticipant.last_name || ''}`.trim() || primaryParticipant.username
                              }
                            </h3>
                            <p className="text-sm text-slate-500 truncate">
                              @{primaryParticipant.username}
                            </p>
                          </div>
                          
                          {/* 時間和未讀計數 */}
                          <div className="flex flex-col items-end space-y-1">
                            {conversation.latest_message && (
                              <p className="text-xs text-slate-500 font-medium">
                                {formatConversationTime(conversation.updated_at)}
                              </p>
                            )}
                            
                            {displayConfig.showUnreadBadge && conversation.unread_count > 0 && (
                              <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-pink-500 rounded-full shadow-lg animate-pulse">
                                {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 最新消息預覽 */}
                        {displayConfig.showLastMessage && conversation.latest_message ? (
                          <div className="mt-2">
                            <p className={`text-sm truncate transition-colors ${
                              conversation.unread_count > 0 
                                ? 'font-semibold text-slate-900' 
                                : 'text-slate-600'
                            }`}>
                              {String(conversation.latest_message.sender_details.id) === String(user?.id) ? (
                                <span className="flex items-center">
                                  <PaperAirplaneIcon className="h-3 w-3 mr-2 text-blue-500 flex-shrink-0" />
                                  <span className="truncate">
                                    {conversation.latest_message.content.length > displayConfig.maxContentLength
                                      ? `${conversation.latest_message.content.substring(0, displayConfig.maxContentLength)}...`
                                      : conversation.latest_message.content
                                    }
                                  </span>
                                </span>
                              ) : (
                                <span className="truncate">
                                  {conversation.latest_message.content.length > displayConfig.maxContentLength
                                    ? `${conversation.latest_message.content.substring(0, displayConfig.maxContentLength)}...`
                                    : conversation.latest_message.content
                                  }
                                </span>
                              )}
                            </p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 mt-2 italic">
                            點擊開始與 {primaryParticipant.first_name || primaryParticipant.username} 聊天
                          </p>
                        )}
                      </div>

                      {/* 操作按鈕 */}
                      <button
                        onClick={(e) => handleConversationOptions(e, conversation.id)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white/50 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100"
                        aria-label="對話選項"
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

        {/* 統計信息區域 */}
        {filteredConversations.length > 0 && (
          <div className="mt-6 text-center">
            <div className="inline-flex items-center space-x-6 bg-white/50 backdrop-blur-xl rounded-xl px-6 py-3 border border-white/20 shadow-lg">
              <div className="text-sm">
                <span className="font-semibold text-slate-900">
                  {filteredConversations.length}
                </span>
                <span className="text-slate-600 ml-1">個對話</span>
              </div>
              
              {totalUnreadCount > 0 && (
                <div className="text-sm">
                  <span className="font-semibold text-red-600">
                    {totalUnreadCount}
                  </span>
                  <span className="text-slate-600 ml-1">條未讀</span>
                </div>
              )}
              
              <div className="text-sm">
                <span className="font-semibold text-slate-900">
                  {conversations.filter(conv => 
                    getOtherParticipants(conv, user?.id).some(p => p.is_online)
                  ).length}
                </span>
                <span className="text-slate-600 ml-1">位在線</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage; 