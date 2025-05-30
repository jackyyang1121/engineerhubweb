/**
 * 通知頁面
 * 
 * 功能：
 * 1. 顯示用戶通知列表
 * 2. 支援篩選（全部、未讀、已讀）
 * 3. 批量標記為已讀
 * 4. 通知類型分類顯示
 * 5. 即時更新通知狀態
 */

import React, { useState} from 'react';
import { 
  BellIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  UserPlusIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  AtSymbolIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import api from '../../api/axiosConfig';

// 通知介面類型
interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'reply' | 'mention' | 'message' | 'share' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    avatar: string | null;
  };
}

interface NotificationResponse {
  notifications: Notification[];
  unread_count: number;
  total_count: number;
}

// 通知API
const notificationAPI = {
  getNotifications: async (filters?: { type?: string; is_read?: boolean }): Promise<NotificationResponse> => {
    try {
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.is_read !== undefined) params.append('is_read', filters.is_read.toString());
      
      const response = await api.get(`/notifications/?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('獲取通知失敗:', error);
      throw error;
    }
  },

  markAsRead: async (notificationIds: string[]): Promise<void> => {
    try {
      await api.patch('/notifications/mark-read/', {
        notification_ids: notificationIds
      });
    } catch (error) {
      console.error('標記已讀失敗:', error);
      throw error;
    }
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await api.patch('/notifications/mark-all-read/');
    } catch (error) {
      console.error('標記全部已讀失敗:', error);
      throw error;
    }
  },

  deleteNotifications: async (notificationIds: string[]): Promise<void> => {
    try {
      await api.delete('/notifications/bulk-delete/', {
        data: { notification_ids: notificationIds }
      });
    } catch (error) {
      console.error('刪除通知失敗:', error);
      throw error;
    }
  }
};

const NotificationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

  // 獲取通知列表
  const {
    data: notificationData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['notifications', selectedFilter],
    queryFn: () => {
      const filters: { is_read?: boolean } = {};
      if (selectedFilter === 'unread') filters.is_read = false;
      if (selectedFilter === 'read') filters.is_read = true;
      return notificationAPI.getNotifications(filters);
    },
    refetchInterval: 30000, // 每30秒刷新
    staleTime: 10000,
  });

  // 標記為已讀
  const markAsReadMutation = useMutation({
    mutationFn: notificationAPI.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications([]);
      toast.success('已標記為已讀');
    },
    onError: () => {
      toast.error('操作失敗，請重試');
    }
  });

  // 全部標記為已讀
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationAPI.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('所有通知已標記為已讀');
    },
    onError: () => {
      toast.error('操作失敗，請重試');
    }
  });

  // 刪除通知
  const deleteNotificationsMutation = useMutation({
    mutationFn: notificationAPI.deleteNotifications,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedNotifications([]);
      toast.success('通知已刪除');
    },
    onError: () => {
      toast.error('刪除失敗，請重試');
    }
  });

  const notifications = notificationData?.notifications || [];
  const unreadCount = notificationData?.unread_count || 0;

  // 獲取通知類型圖標
  const getNotificationIcon = (type: string) => {
    const iconClasses = "w-5 h-5";
    switch (type) {
      case 'follow':
        return <UserPlusIcon className={`${iconClasses} text-blue-500`} />;
      case 'like':
        return <HeartIcon className={`${iconClasses} text-red-500`} />;
      case 'comment':
      case 'reply':
        return <ChatBubbleLeftIcon className={`${iconClasses} text-green-500`} />;
      case 'mention':
        return <AtSymbolIcon className={`${iconClasses} text-purple-500`} />;
      case 'message':
        return <EnvelopeIcon className={`${iconClasses} text-blue-500`} />;
      case 'system':
        return <ExclamationTriangleIcon className={`${iconClasses} text-orange-500`} />;
      default:
        return <BellIcon className={`${iconClasses} text-gray-500`} />;
    }
  };

  // 格式化時間
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - date.getTime()) / (1000 * 60);

    if (diffMinutes < 1) {
      return '剛剛';
    } else if (diffMinutes < 60) {
      return `${Math.floor(diffMinutes)} 分鐘前`;
    } else if (diffMinutes < 24 * 60) {
      return `${Math.floor(diffMinutes / 60)} 小時前`;
    } else if (diffMinutes < 7 * 24 * 60) {
      return `${Math.floor(diffMinutes / (24 * 60))} 天前`;
    } else {
      return date.toLocaleDateString('zh-TW');
    }
  };

  // 處理通知選擇
  const handleNotificationSelect = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  // 處理全選
  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n.id));
    }
  };

  // 標記選中項為已讀
  const handleMarkSelectedAsRead = () => {
    if (selectedNotifications.length === 0) {
      toast.warning('請先選擇要標記的通知');
      return;
    }
    markAsReadMutation.mutate(selectedNotifications);
  };

  // 刪除選中的通知
  const handleDeleteSelected = () => {
    if (selectedNotifications.length === 0) {
      toast.warning('請先選擇要刪除的通知');
      return;
    }
    
    if (window.confirm(`確定要刪除 ${selectedNotifications.length} 條通知嗎？`)) {
      deleteNotificationsMutation.mutate(selectedNotifications);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner size="lg" text="載入通知..." />
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
            <p className="text-gray-600 mb-4">無法載入通知，請重試</p>
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
            <BellSolidIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">通知</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-gray-600">您有 {unreadCount} 條未讀通知</p>
              )}
            </div>
          </div>

          {/* 全部標記為已讀 */}
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <CheckIcon className="h-5 w-5 mr-2" />
              全部已讀
            </button>
          )}
        </div>

        {/* 篩選器 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {[
              { key: 'all', label: '全部', count: notificationData?.total_count || 0 },
              { key: 'unread', label: '未讀', count: unreadCount },
              { key: 'read', label: '已讀', count: (notificationData?.total_count || 0) - unreadCount }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key as any)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  selectedFilter === filter.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {filter.label}
                {filter.count > 0 && (
                  <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                    selectedFilter === filter.key
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {filter.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 批量操作 */}
          {selectedNotifications.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                已選擇 {selectedNotifications.length} 項
              </span>
              <button
                onClick={handleMarkSelectedAsRead}
                disabled={markAsReadMutation.isPending}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                標記已讀
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={deleteNotificationsMutation.isPending}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                刪除
              </button>
              <button
                onClick={() => setSelectedNotifications([])}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded-md hover:bg-gray-700 transition-colors"
              >
                取消選擇
              </button>
            </div>
          )}
        </div>

        {/* 通知列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {notifications.length === 0 ? (
            <EmptyState
              icon={BellIcon}
              title={
                selectedFilter === 'unread' ? "沒有未讀通知" :
                selectedFilter === 'read' ? "沒有已讀通知" : "暫無通知"
              }
              description={
                selectedFilter === 'unread' 
                  ? "所有通知都已查看"
                  : "與其他工程師互動會產生通知"
              }
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {/* 全選控制器 */}
              {notifications.length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNotifications.length === notifications.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {selectedNotifications.length === notifications.length ? '取消全選' : '全選'}
                    </span>
                  </label>
                </div>
              )}

              {/* 通知項目 */}
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {/* 選擇框 */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleNotificationSelect(notification.id)}
                      className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />

                    {/* 通知圖標 */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* 用戶頭像 */}
                    {notification.actor && (
                      <div className="flex-shrink-0">
                        <img
                          src={
                            notification.actor.avatar ||
                            `https://ui-avatars.com/api/?name=${notification.actor.username}&background=random&size=40`
                          }
                          alt={notification.actor.username}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      </div>
                    )}

                    {/* 通知內容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm ${
                          !notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-800'
                        }`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                    </div>

                    {/* 更多選項 */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: 實現更多選項（刪除、靜音等）
                        toast.info('更多選項功能即將推出');
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <EllipsisVerticalIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 統計信息 */}
        {notifications.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            顯示 {notifications.length} 條通知
            {selectedFilter === 'all' && notificationData?.total_count && notificationData.total_count > notifications.length && (
              <span className="ml-2">• 共 {notificationData.total_count} 條</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage; 