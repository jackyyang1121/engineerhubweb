/**
 * 聊天頁面
 * 
 * 展示即時聊天功能，使用 WebSocket Hook
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {  PaperAirplaneIcon,  PaperClipIcon} from '@heroicons/react/24/outline';
import { useChatWebSocket, WebSocketState } from '../../hooks/useWebSocket';
import { useAuthStore } from '../../store/authStore';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { toast } from 'react-toastify';

interface Message {
  id: string;
  sender: {
    id: number;
    username: string;
    avatar: string | null;
  };
  content: string;
  message_type: 'text' | 'image' | 'video' | 'file';
  file: string | null;
  created_at: string;
  is_read: boolean;
}

// WebSocket 訊息類型定義
interface WebSocketMessageData {
  // 聊天訊息數據
  chat_message?: Message;
  // 輸入狀態數據
  user_id?: number;
  username?: string;
  // 訊息已讀數據
  message_id?: string;
  // 其他通用數據
  [key: string]: unknown;
}

interface WebSocketMessage {
  type: string;
  data: WebSocketMessageData;
  timestamp?: string;
}

const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { user } = useAuthStore();
  
  // WebSocket 連接
  const {
    readyState,
    lastMessage,
    sendJsonMessage,
    reconnectCount,
    messageCount
  } = useChatWebSocket(conversationId);

  // 狀態管理
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 滾動到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 載入訊息
  const loadMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      // 模擬載入訊息
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 模擬訊息數據
      const mockMessages: Message[] = [
        {
          id: '1',
          sender: {
            id: 1,
            username: 'Alice',
            avatar: 'https://ui-avatars.com/api/?name=Alice&background=random'
          },
          content: '嗨！你好嗎？',
          message_type: 'text',
          file: null,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          is_read: true
        },
        {
          id: '2',
          sender: {
            id: Number(user?.id) || 2,
            username: user?.username || 'You',
            avatar: user?.avatar || null
          },
          content: '我很好，謝謝！你呢？',
          message_type: 'text',
          file: null,
          created_at: new Date(Date.now() - 3000000).toISOString(),
          is_read: true
        },
        {
          id: '3',
          sender: {
            id: 1,
            username: 'Alice',
            avatar: 'https://ui-avatars.com/api/?name=Alice&background=random'
          },
          content: '也很好！今天天氣不錯呢。',
          message_type: 'text',
          file: null,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          is_read: false
        }
      ];
      
      // 如果有 conversationId，可以根據它載入特定對話
      if (conversationId) {
        console.log('載入對話:', conversationId);
      }
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('載入訊息失敗:', error);
      toast.error('載入訊息失敗');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user?.id, user?.username, user?.avatar]);

  // 處理 WebSocket 訊息
  useEffect(() => {
    if (!lastMessage) return;

    // 類型保護函數
    const isWebSocketMessage = (msg: unknown): msg is WebSocketMessage => {
      return typeof msg === 'object' && msg !== null && 'type' in msg && 'data' in msg;
    };

    if (!isWebSocketMessage(lastMessage)) return;

    const messageData = lastMessage.data;

    switch (lastMessage.type) {
      case 'chat_message':
        // 新訊息 - 假設直接就是 Message 對象
        if (messageData.chat_message) {
          setMessages(prev => [...prev, messageData.chat_message as Message]);
        } else {
          // 如果 data 本身就是 message 對象，進行類型斷言
          const newMessage = messageData as unknown as Message;
          if (newMessage.id && newMessage.content) {
            setMessages(prev => [...prev, newMessage]);
          }
        }
        break;
      
      case 'typing_start':
        // 用戶開始輸入
        if (messageData.user_id !== user?.id && messageData.username) {
          setTypingUsers(prev => {
            if (!prev.includes(messageData.username as string)) {
              return [...prev, messageData.username as string];
            }
            return prev;
          });
        }
        break;
      
      case 'typing_stop':
        // 用戶停止輸入
        if (messageData.username) {
          setTypingUsers(prev => prev.filter(u => u !== messageData.username));
        }
        break;
      
      case 'message_read':
        // 訊息已讀
        if (messageData.message_id) {
          setMessages(prev => prev.map(msg => 
            msg.id === messageData.message_id 
              ? { ...msg, is_read: true }
              : msg
          ));
        }
        break;
      
      case 'user_joined':
        if (messageData.username) {
          console.log(`${messageData.username} 加入聊天`);
        }
        break;
      
      case 'user_left':
        if (messageData.username) {
          console.log(`${messageData.username} 離開聊天`);
        }
        break;
      
      default:
        console.log('未處理的訊息類型:', lastMessage.type);
    }
  }, [lastMessage, user?.id]);

  // 發送訊息
  const sendMessage = async () => {
    if (!inputMessage.trim() || !conversationId) return;

    const message = {
      content: inputMessage.trim(),
      conversation_id: conversationId,
      message_type: 'text'
    };

    // 通過 WebSocket 發送
    const sent = sendJsonMessage(message, 'chat_message');
    
    if (sent) {
      setInputMessage('');
      // 停止輸入指示
      sendJsonMessage({ conversation_id: conversationId }, 'typing_stop');
    }
  };

  // 處理輸入變化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    // 輸入指示
    if (value.trim() && !isTyping) {
      setIsTyping(true);
      sendJsonMessage({ conversation_id: conversationId }, 'typing_start');
    } else if (!value.trim() && isTyping) {
      setIsTyping(false);
      sendJsonMessage({ conversation_id: conversationId }, 'typing_stop');
    }
  };

  // 處理文件上傳
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    try {
      // 文件會通過 WebSocket 推送，所以這裡不需要手動添加到訊息列表
    } catch (error) {
      console.error('文件上傳失敗:', error);
    }
  };

  // 處理按鍵事件
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 連接狀態指示器
  const getConnectionStatus = () => {
    switch (readyState) {
      case WebSocketState.CONNECTING:
        return { text: '連接中...', color: 'text-yellow-600' };
      case WebSocketState.CONNECTED:
        return { text: '已連接', color: 'text-green-600' };
      case WebSocketState.DISCONNECTED:
        return { text: '已斷線', color: 'text-red-600' };
      case WebSocketState.RECONNECTING:
        return { text: `重連中 (${reconnectCount})`, color: 'text-orange-600' };
      case WebSocketState.ERROR:
        return { text: '連接錯誤', color: 'text-red-600' };
      default:
        return { text: '未知狀態', color: 'text-gray-600' };
    }
  };

  // 格式化時間
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 初始化
  useEffect(() => {
    loadMessages();
  }, [conversationId, loadMessages]);

  // 自動滾動到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner size="lg" text="載入聊天記錄..." />
      </div>
    );
  }

  const status = getConnectionStatus();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 聊天標題欄 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              聊天室
            </h1>
            <div className="flex items-center space-x-2 text-sm">
              <span className={status.color}>
                {status.text}
              </span>
              <span className="text-gray-500">
                • 已收發 {messageCount} 條訊息
              </span>
            </div>
          </div>
          
          {/* 連接狀態指示 */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              readyState === WebSocketState.CONNECTED ? 'bg-green-500' : 'bg-red-500'
            }`} />
          </div>
        </div>
      </div>

      {/* 訊息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((message) => {
          const isOwnMessage = message.sender.id === Number(user?.id);
          
          return (
            <div
              key={message.id}
              className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                isOwnMessage
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}>
                {!isOwnMessage && (
                  <div className="text-xs font-medium mb-1 text-gray-600">
                    {message.sender.username}
                  </div>
                )}
                
                {message.message_type === 'text' ? (
                  <div className="text-sm">
                    {message.content}
                  </div>
                ) : (
                  <div className="text-sm">
                    {message.file && (
                      <img 
                        src={message.file} 
                        alt="圖片" 
                        className="max-w-full h-auto rounded"
                      />
                    )}
                    {message.content && (
                      <div className="mt-2">{message.content}</div>
                    )}
                  </div>
                )}
                
                <div className={`text-xs mt-1 flex items-center justify-between ${
                  isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  <span>{formatTime(message.created_at)}</span>
                  {isOwnMessage && (
                    <span className="ml-2">
                      {message.is_read ? '已讀' : '未讀'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* 輸入指示 */}
        {typingUsers.length > 0 && (
          <div className="flex justify-start">
            <div className="bg-gray-200 rounded-lg px-4 py-2">
              <div className="text-sm text-gray-600">
                {typingUsers.join(', ')} 正在輸入...
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* 輸入區域 */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end space-x-3">
          {/* 文件上傳 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <PaperClipIcon className="h-5 w-5" />
          </button>

          {/* 輸入框 */}
          <div className="flex-1">
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              placeholder="輸入訊息..."
              disabled={readyState !== WebSocketState.CONNECTED}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* 發送按鈕 */}
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || readyState !== WebSocketState.CONNECTED}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage; 