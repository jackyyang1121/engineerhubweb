/**
 * 聊天 API 模塊
 * 
 * 功能：提供即時聊天相關的所有 API 調用功能
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責聊天和對話相關的 API 調用
 * - Flexible: 使用統一的錯誤處理機制，支援多種消息類型
 * - Loosely coupled: 通過類型系統確保聊天 API 的安全性
 * 
 * 重構重點：
 * - 使用統一的 handleApiCall 錯誤處理器
 * - 提供清晰的類型定義和詳細註釋
 * - 支援文字、圖片、影片和文件消息
 * - 保持函數職責單一，便於測試和維護
 */

import api from './axiosConfig';
import { handleApiCall } from '../utils/api-error-handler';
import type { UserData } from '../types';

// ==================== 類型定義 ====================

/**
 * 消息類型定義
 * 支援多種消息格式的統一介面
 */
export interface Message {
  id: string;                    // 消息唯一標識符
  conversation: string;          // 所屬對話 ID
  sender: string;               // 發送者用戶 ID
  sender_details: UserData;     // 發送者詳細信息
  content: string;              // 消息內容
  message_type: 'text' | 'image' | 'video' | 'file';  // 消息類型
  file?: string;                // 文件 URL（文件消息時使用）
  created_at: string;           // 創建時間 ISO 格式
  is_read: boolean;             // 是否已讀
  read_at?: string;             // 閱讀時間（已讀時使用）
}

/**
 * 對話類型定義
 * 包含參與者信息和最新消息狀態
 */
export interface Conversation {
  id: string;                      // 對話唯一標識符
  participants: string[];          // 參與者用戶 ID 列表
  participants_details: UserData[]; // 參與者詳細信息列表
  created_at: string;              // 創建時間 ISO 格式
  updated_at: string;              // 最後更新時間
  latest_message?: Message;        // 最新消息（可選）
  unread_count: number;           // 未讀消息數量
}

/**
 * 分頁響應類型
 * 用於對話和消息列表的分頁顯示
 */
export interface PaginatedResponse<T> {
  count: number;          // 總數據量
  next: string | null;    // 下一頁 URL
  previous: string | null; // 上一頁 URL
  results: T[];           // 當前頁數據
}

// 重新導出類型定義供其他模塊使用
export type { UserData } from '../types';

// ==================== 對話管理 API ====================

/**
 * 獲取用戶的對話列表
 * 
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁顯示數量，默認 10 條
 * @returns Promise<PaginatedResponse<Conversation>> - 包含對話列表的分頁響應
 * 
 * 使用範例：
 * ```typescript
 * const conversations = await getConversations(1, 20);
 * conversations.results.forEach(conv => {
 *   console.log(`對話 ${conv.id} 有 ${conv.unread_count} 條未讀`);
 * });
 * ```
 */
export const getConversations = async (page: number = 1, pageSize: number = 10): Promise<PaginatedResponse<Conversation>> => {
  return handleApiCall(
    () => api.get('/chat/conversations/', {
      params: { 
        page,              // 頁碼參數
        page_size: pageSize // 每頁大小參數
      }
    }),
    '獲取對話列表'
  );
};

/**
 * 獲取單個對話的詳細信息
 * 
 * @param conversationId - 對話 ID
 * @returns Promise<Conversation> - 對話詳細信息
 * 
 * 使用範例：
 * ```typescript
 * const conversation = await getConversation('123');
 * console.log('對話參與者:', conversation.participants_details.map(p => p.username));
 * ```
 */
export const getConversation = async (conversationId: string): Promise<Conversation> => {
  return handleApiCall(
    () => api.get(`/chat/conversations/${conversationId}/`),
    '獲取對話詳情'
  );
};

/**
 * 創建新的對話
 * 
 * @param participants - 參與者用戶 ID 列表
 * @returns Promise<Conversation> - 創建的對話信息
 * 
 * 注意：參與者列表會自動包含當前用戶
 * 
 * 使用範例：
 * ```typescript
 * const conversation = await createConversation(['user123', 'user456']);
 * console.log('新對話已創建:', conversation.id);
 * ```
 */
export const createConversation = async (participants: string[]): Promise<Conversation> => {
  return handleApiCall(
    () => api.post('/chat/conversations/', { participants }),
    '創建對話'
  );
};

// ==================== 消息管理 API ====================

/**
 * 獲取指定對話的消息列表
 * 
 * @param conversationId - 對話 ID
 * @param page - 頁碼，默認第 1 頁
 * @param pageSize - 每頁顯示數量，默認 20 條
 * @returns Promise<PaginatedResponse<Message>> - 包含消息列表的分頁響應
 * 
 * 注意：消息按時間倒序排列，最新的消息在前面
 * 
 * 使用範例：
 * ```typescript
 * const messages = await getMessages('conv123', 1, 50);
 * messages.results.forEach(msg => {
 *   console.log(`${msg.sender_details.username}: ${msg.content}`);
 * });
 * ```
 */
export const getMessages = async (
  conversationId: string, 
  page: number = 1, 
  pageSize: number = 20
): Promise<PaginatedResponse<Message>> => {
  return handleApiCall(
    () => api.get('/chat/messages/', {
      params: { 
        conversation: conversationId, // 對話 ID 參數
        page,                         // 頁碼參數
        page_size: pageSize          // 每頁大小參數
      }
    }),
    '獲取對話消息'
  );
};

/**
 * 發送文字消息
 * 
 * @param conversationId - 對話 ID
 * @param content - 消息內容
 * @returns Promise<Message> - 發送的消息對象
 * 
 * 使用範例：
 * ```typescript
 * const message = await sendTextMessage('conv123', '你好！');
 * console.log('消息已發送:', message.id);
 * ```
 */
export const sendTextMessage = async (conversationId: string, content: string): Promise<Message> => {
  return handleApiCall(
    () => api.post('/chat/messages/', {
      conversation: conversationId,  // 目標對話
      content,                      // 消息內容
      message_type: 'text'          // 指定為文字消息
    }),
    '發送文字消息'
  );
};

/**
 * 發送文件消息（圖片、影片或其他文件）
 * 
 * @param conversationId - 對話 ID
 * @param file - 要上傳的文件
 * @param messageType - 消息類型：'image' | 'video' | 'file'
 * @returns Promise<Message> - 發送的消息對象
 * 
 * 功能：
 * - 自動檢測文件類型
 * - 支援多媒體文件上傳
 * - 生成文件預覽（圖片/影片）
 * 
 * 使用範例：
 * ```typescript
 * const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
 * const file = fileInput.files?.[0];
 * if (file) {
 *   const message = await sendFileMessage('conv123', file, 'image');
 *   console.log('文件已發送:', message.file);
 * }
 * ```
 */
export const sendFileMessage = async (
  conversationId: string, 
  file: File, 
  messageType: 'image' | 'video' | 'file'
): Promise<Message> => {
  return handleApiCall(
    () => {
      // 創建 FormData 對象用於文件上傳
      const formData = new FormData();
      formData.append('conversation', conversationId);  // 目標對話
      formData.append('file', file);                   // 上傳的文件
      formData.append('message_type', messageType);    // 消息類型
      
      // 使用文件名作為消息內容，如果沒有文件名則為空
      formData.append('content', file.name || '');
      
      return api.post('/chat/messages/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'  // 設置正確的文件上傳內容類型
        }
      });
    },
    '發送文件消息'
  );
};

// ==================== 消息狀態管理 API ====================

/**
 * 標記指定消息為已讀
 * 
 * @param messageId - 消息 ID
 * @returns Promise<{detail: string}> - 操作結果信息
 * 
 * 使用範例：
 * ```typescript
 * const result = await markMessageAsRead('msg123');
 * console.log(result.detail); // "消息已標記為已讀"
 * ```
 */
export const markMessageAsRead = async (messageId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/chat/messages/${messageId}/read/`),
    '標記消息為已讀'
  );
};

/**
 * 標記對話中所有消息為已讀
 * 
 * @param conversationId - 對話 ID
 * @returns Promise<{detail: string}> - 操作結果信息
 * 
 * 功能：批量標記對話中的所有未讀消息為已讀狀態
 * 
 * 使用範例：
 * ```typescript
 * const result = await markAllMessagesAsRead('conv123');
 * console.log(result.detail); // "所有消息已標記為已讀"
 * ```
 */
export const markAllMessagesAsRead = async (conversationId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/chat/conversations/${conversationId}/read_all/`),
    '標記所有消息為已讀'
  );
};

// ==================== 對話操作 API ====================

/**
 * 封存對話
 * 
 * @param conversationId - 對話 ID
 * @returns Promise<void> - 封存操作無返回值
 * 
 * 注意：封存的對話不會在對話列表中顯示，但歷史記錄會保留
 * 
 * 使用範例：
 * ```typescript
 * await archiveConversation('conv123');
 * console.log('對話已封存');
 * ```
 */
export const archiveConversation = async (conversationId: string): Promise<void> => {
  return handleApiCall(
    () => api.delete(`/chat/conversations/${conversationId}/`),
    '封存對話'
  );
};

/**
 * 取消封存對話
 * 
 * @param conversationId - 對話 ID
 * @returns Promise<{detail: string}> - 操作結果信息
 * 
 * 功能：將封存的對話重新顯示在對話列表中
 * 
 * 使用範例：
 * ```typescript
 * const result = await unarchiveConversation('conv123');
 * console.log(result.detail); // "對話已取消封存"
 * ```
 */
export const unarchiveConversation = async (conversationId: string): Promise<{ detail: string }> => {
  return handleApiCall(
    () => api.post(`/chat/conversations/${conversationId}/unarchive/`),
    '取消封存對話'
  );
}; 