/**
 * 聊天相關API接口
 */

import api from './axiosConfig';

// 類型定義
export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string | null;
  is_online: boolean;
  last_online: string;
}

export interface Message {
  id: string;
  sender: User;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  file: string | null;
  created_at: string;
  is_read: boolean;
  read_at: string | null;
}

export interface Conversation {
  id: string;
  participants: User[];
  last_message: Message | null;
  unread_count: number;
  updated_at: string;
  created_at: string;
}

export interface ConversationState {
  is_archived: boolean;
  unread_count: number;
  last_read_at: string | null;
}

export interface ChatResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const chatAPI = {
  /**
   * 獲取對話列表
   */
  async getConversations(): Promise<{ conversations: Conversation[] }> {
    const response = await api.get('/chat/conversations/');
    return response.data;
  },

  /**
   * 創建新對話
   */
  async createConversation(participantId: number): Promise<{ conversation: Conversation }> {
    const response = await api.post('/chat/conversations/', {
      participant_id: participantId
    });
    return response.data;
  },

  /**
   * 獲取對話詳情
   */
  async getConversation(conversationId: string): Promise<{ conversation: Conversation }> {
    const response = await api.get(`/chat/conversations/${conversationId}/`);
    return response.data;
  },

  /**
   * 獲取對話訊息
   */
  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<{ 
    messages: Message[]; 
    total: number; 
    page: number; 
    has_next: boolean; 
  }> {
    const response = await api.get(`/chat/conversations/${conversationId}/messages/`, {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * 發送文字訊息
   */
  async sendMessage(conversationId: string, content: string): Promise<{ message: Message }> {
    const response = await api.post(`/chat/conversations/${conversationId}/messages/`, {
      content,
      message_type: 'text'
    });
    return response.data;
  },

  /**
   * 發送文件
   */
  async sendFile(conversationId: string, file: File): Promise<{ message: Message }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message_type', file.type.startsWith('image/') ? 'image' : 
                                   file.type.startsWith('video/') ? 'video' : 'file');

    const response = await api.post(
      `/chat/conversations/${conversationId}/messages/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  /**
   * 標記訊息為已讀
   */
  async markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
    const response = await api.patch(`/chat/messages/${messageId}/read/`);
    return response.data;
  },

  /**
   * 標記對話中所有訊息為已讀
   */
  async markConversationAsRead(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.patch(`/chat/conversations/${conversationId}/read/`);
    return response.data;
  },

  /**
   * 刪除訊息
   */
  async deleteMessage(messageId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/chat/messages/${messageId}/`);
    return response.data;
  },

  /**
   * 封存對話
   */
  async archiveConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.patch(`/chat/conversations/${conversationId}/archive/`);
    return response.data;
  },

  /**
   * 取消封存對話
   */
  async unarchiveConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.patch(`/chat/conversations/${conversationId}/unarchive/`);
    return response.data;
  },

  /**
   * 離開對話
   */
  async leaveConversation(conversationId: string): Promise<{ success: boolean }> {
    const response = await api.delete(`/chat/conversations/${conversationId}/leave/`);
    return response.data;
  },

  /**
   * 搜尋訊息
   */
  async searchMessages(query: string, conversationId?: string): Promise<{ 
    messages: Message[]; 
    total: number; 
  }> {
    const params: any = { q: query };
    if (conversationId) {
      params.conversation_id = conversationId;
    }

    const response = await api.get('/chat/search/', { params });
    return response.data;
  },

  /**
   * 獲取在線用戶列表
   */
  async getOnlineUsers(): Promise<{ users: User[] }> {
    const response = await api.get('/chat/online-users/');
    return response.data;
  },

  /**
   * 更新用戶在線狀態
   */
  async updateOnlineStatus(isOnline: boolean): Promise<{ success: boolean }> {
    const response = await api.patch('/chat/online-status/', {
      is_online: isOnline
    });
    return response.data;
  },

  /**
   * 獲取未讀訊息數
   */
  async getUnreadCount(): Promise<{ unread_count: number }> {
    const response = await api.get('/chat/unread-count/');
    return response.data;
  },

  /**
   * 獲取對話統計
   */
  async getConversationStats(conversationId: string): Promise<{
    total_messages: number;
    participants_count: number;
    created_at: string;
    last_activity: string;
  }> {
    const response = await api.get(`/chat/conversations/${conversationId}/stats/`);
    return response.data;
  },

  /**
   * 舉報訊息
   */
  async reportMessage(messageId: string, reason: string, description?: string): Promise<{ success: boolean }> {
    const response = await api.post(`/chat/messages/${messageId}/report/`, {
      reason,
      description
    });
    return response.data;
  },

  /**
   * 封鎖用戶
   */
  async blockUser(userId: number): Promise<{ success: boolean }> {
    const response = await api.post(`/chat/users/${userId}/block/`);
    return response.data;
  },

  /**
   * 解除封鎖用戶
   */
  async unblockUser(userId: number): Promise<{ success: boolean }> {
    const response = await api.delete(`/chat/users/${userId}/block/`);
    return response.data;
  },

  /**
   * 獲取封鎖用戶列表
   */
  async getBlockedUsers(): Promise<{ users: User[] }> {
    const response = await api.get('/chat/blocked-users/');
    return response.data;
  },
}; 