import api from './axiosConfig';
import type { UserData } from './authApi';

// 定义类型
export interface Message {
  id: string;
  conversation: string;
  sender: string;
  sender_details: UserData;
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  file?: string;
  created_at: string;
  is_read: boolean;
  read_at?: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participants_details: UserData[];
  created_at: string;
  updated_at: string;
  latest_message?: Message;
  unread_count: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// 获取对话列表
export const getConversations = async (page = 1, pageSize = 10): Promise<PaginatedResponse<Conversation>> => {
  const response = await api.get('/chat/conversations/', {
    params: { page, page_size: pageSize }
  });
  return response.data;
};

// 获取单个对话
export const getConversation = async (conversationId: string): Promise<Conversation> => {
  const response = await api.get(`/chat/conversations/${conversationId}/`);
  return response.data;
};

// 创建对话
export const createConversation = async (participants: string[]): Promise<Conversation> => {
  const response = await api.post('/chat/conversations/', { participants });
  return response.data;
};

// 获取对话消息列表
export const getMessages = async (conversationId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Message>> => {
  const response = await api.get('/chat/messages/', {
    params: { conversation: conversationId, page, page_size: pageSize }
  });
  return response.data;
};

// 发送文字消息
export const sendTextMessage = async (conversationId: string, content: string): Promise<Message> => {
  const response = await api.post('/chat/messages/', {
    conversation: conversationId,
    content,
    message_type: 'text'
  });
  return response.data;
};

// 发送文件消息
export const sendFileMessage = async (conversationId: string, file: File, messageType: 'image' | 'video' | 'file'): Promise<Message> => {
  const formData = new FormData();
  formData.append('conversation', conversationId);
  formData.append('file', file);
  formData.append('message_type', messageType);
  
  // 根据文件类型添加空白内容或文件名作为内容
  formData.append('content', file.name || '');
  
  const response = await api.post('/chat/messages/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

// 标记消息为已读
export const markMessageAsRead = async (messageId: string): Promise<{ detail: string }> => {
  const response = await api.post(`/chat/messages/${messageId}/read/`);
  return response.data;
};

// 标记对话中所有消息为已读
export const markAllMessagesAsRead = async (conversationId: string): Promise<{ detail: string }> => {
  const response = await api.post(`/chat/conversations/${conversationId}/read_all/`);
  return response.data;
};

// 封存对话
export const archiveConversation = async (conversationId: string): Promise<void> => {
  await api.delete(`/chat/conversations/${conversationId}/`);
};

// 取消封存对话
export const unarchiveConversation = async (conversationId: string): Promise<{ detail: string }> => {
  const response = await api.post(`/chat/conversations/${conversationId}/unarchive/`);
  return response.data;
}; 