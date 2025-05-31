/**
 * WebSocket Hook
 * 
 * 提供 WebSocket 連接管理、訊息處理、重連邏輯等功能
 * 主要用於聊天系統的即時通訊
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getWebSocketURL } from '../api/client';

// WebSocket 連接狀態
export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
  RECONNECTING = 'reconnecting'
}

// WebSocket 訊息類型
export interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp?: string;
}

// WebSocket Hook 參數
interface UseWebSocketOptions {
  url: string;
  protocols?: string | string[];
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  onOpen?: (event: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
  onReconnect?: (attempt: number) => void;
}

// WebSocket Hook 返回值
interface UseWebSocketReturn {
  // 連接狀態
  readyState: WebSocketState;
  connectionId: string | null;
  lastMessage: WebSocketMessage | null;
  
  // 統計信息
  reconnectCount: number;
  messageCount: number;
  
  // 方法
  sendMessage: (message: WebSocketMessage) => boolean;
  sendJsonMessage: (data: unknown, type?: string) => boolean;
  disconnect: () => void;
  reconnect: () => void;
  
  // WebSocket 實例（謹慎使用）
  webSocket: WebSocket | null;
}

/**
 * WebSocket Hook
 */
export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    protocols,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    heartbeatInterval = 30000,
    onOpen,
    onMessage,
    onError,
    onClose,
    onReconnect
  } = options;

  // 狀態管理
  const [readyState, setReadyState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  // Refs
  const webSocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsCountRef = useRef(0);
  const isManualDisconnectRef = useRef(false);

  // 生成連接ID
  const generateConnectionId = (): string => {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 清理定時器
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // 心跳檢測
  const startHeartbeat = useCallback(() => {
    if (heartbeatInterval > 0) {
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (webSocketRef.current?.readyState === WebSocket.OPEN) {
          webSocketRef.current.send(JSON.stringify({
            type: 'ping',
            timestamp: new Date().toISOString()
          }));
          startHeartbeat(); // 遞歸調用
        }
      }, heartbeatInterval);
    }
  }, [heartbeatInterval]);

  // 停止心跳
  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // 創建 WebSocket 連接的通用邏輯
  const createWebSocketConnection = useCallback(() => {
    if (webSocketRef.current) {
      webSocketRef.current.close();
    }

    try {
      setReadyState(WebSocketState.CONNECTING);
      const wsUrl = getWebSocketURL(url);
      const ws = new WebSocket(wsUrl, protocols);
      webSocketRef.current = ws;
      const connId = generateConnectionId();
      setConnectionId(connId);

      const handleReconnect = () => {
        if (!isManualDisconnectRef.current) {
          // 延遲調用 attemptReconnect 以避免循環依賴
          setTimeout(() => {
            if (
              reconnect &&
              !isManualDisconnectRef.current &&
              reconnectAttemptsCountRef.current < reconnectAttempts
            ) {
              setReadyState(WebSocketState.RECONNECTING);
              reconnectAttemptsCountRef.current += 1;
              setReconnectCount(reconnectAttemptsCountRef.current);
              onReconnect?.(reconnectAttemptsCountRef.current);
              
              setTimeout(() => {
                createWebSocketConnection();
              }, reconnectInterval);
            } else {
              setReadyState(WebSocketState.DISCONNECTED);
            }
          }, 0);
        }
      };

      ws.onopen = (event) => {
        console.log('WebSocket 連接已建立');
        setReadyState(WebSocketState.CONNECTED);
        reconnectAttemptsCountRef.current = 0;
        setReconnectCount(0);
        isManualDisconnectRef.current = false;
        startHeartbeat();
        onOpen?.(event);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          setMessageCount(prev => prev + 1);
          
          if (message.type === 'pong') {
            console.log('收到心跳回應');
            return;
          }
          
          onMessage?.(message);
        } catch (error) {
          console.error('解析 WebSocket 訊息失敗:', error);
          const textMessage: WebSocketMessage = {
            type: 'text',
            data: event.data,
            timestamp: new Date().toISOString()
          };
          setLastMessage(textMessage);
          onMessage?.(textMessage);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket 錯誤:', error);
        setReadyState(WebSocketState.ERROR);
        stopHeartbeat();
        onError?.(error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket 連接已關閉:', event.code, event.reason);
        setReadyState(WebSocketState.DISCONNECTED);
        stopHeartbeat();
        clearTimers();
        onClose?.(event);
        
        if (event.code !== 1000) {
          handleReconnect();
        }
      };

    } catch (error) {
      console.error('創建 WebSocket 連接失敗:', error);
      setReadyState(WebSocketState.ERROR);
    }
  }, [url, protocols, onOpen, onMessage, onError, onClose, startHeartbeat, stopHeartbeat, clearTimers, reconnect, reconnectAttempts, reconnectInterval, onReconnect]);

  // 發送訊息
  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    const ws = webSocketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        const messageToSend = {
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        };
        ws.send(JSON.stringify(messageToSend));
        setMessageCount(prev => prev + 1);
        return true;
      } catch (error) {
        console.error('發送 WebSocket 訊息失敗:', error);
        return false;
      }
    }
    console.warn('WebSocket 連接未就緒，無法發送訊息');
    return false;
  }, []);

  // 發送 JSON 訊息（便利方法）
  const sendJsonMessage = useCallback((data: unknown, type: string = 'message'): boolean => {
    return sendMessage({ type, data });
  }, [sendMessage]);

  // 連接 WebSocket
  const connect = useCallback(() => {
    createWebSocketConnection();
  }, [createWebSocketConnection]);

  // 手動斷開連接
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    clearTimers();
    stopHeartbeat();
    
    if (webSocketRef.current) {
      webSocketRef.current.close(1000, '手動關閉連接');
    }
    
    setReadyState(WebSocketState.DISCONNECTED);
    setConnectionId(null);
  }, [clearTimers, stopHeartbeat]);

  // 手動重連
  const reconnectManually = useCallback(() => {
    isManualDisconnectRef.current = false;
    reconnectAttemptsCountRef.current = 0;
    setReconnectCount(0);
    connect();
  }, [connect]);

  // 初始化連接
  useEffect(() => {
    createWebSocketConnection();
    
    // 清理函數
    return () => {
      isManualDisconnectRef.current = true;
      clearTimers();
      stopHeartbeat();
      if (webSocketRef.current) {
        webSocketRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在組件掛載時執行

  // 當 URL 變化時重新連接
  useEffect(() => {
    if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
      disconnect();
      setTimeout(() => {
        createWebSocketConnection();
      }, 100);
    }
  }, [url, disconnect, createWebSocketConnection]);

  return {
    readyState,
    connectionId,
    lastMessage,
    reconnectCount,
    messageCount,
    sendMessage,
    sendJsonMessage,
    disconnect,
    reconnect: reconnectManually,
    webSocket: webSocketRef.current
  };
};

/**
 * 聊天 WebSocket Hook
 * 專門用於聊天功能的 WebSocket 連接
 */
export const useChatWebSocket = (conversationId?: string) => {
  const chatUrl = conversationId ? `chat/${conversationId}/` : 'chat/';
  
  return useWebSocket({
    url: chatUrl,
    reconnect: true,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    heartbeatInterval: 30000,
    onOpen: () => {
      console.log('聊天 WebSocket 連接已建立');
    },
    onError: (error) => {
      console.error('聊天 WebSocket 錯誤:', error);
    },
    onClose: () => {
      console.log('聊天 WebSocket 連接已關閉');
    }
  });
};

/**
 * 通知 WebSocket Hook
 * 專門用於即時通知的 WebSocket 連接
 */
export const useNotificationWebSocket = () => {
  return useWebSocket({
    url: 'notifications/',
    reconnect: true,
    reconnectAttempts: 10,
    reconnectInterval: 5000,
    heartbeatInterval: 60000,
    onOpen: () => {
      console.log('通知 WebSocket 連接已建立');
    },
    onError: (error) => {
      console.error('通知 WebSocket 錯誤:', error);
    }
  });
};

/**
 * 在線狀態 WebSocket Hook
 * 用於追蹤用戶在線狀態
 */
export const usePresenceWebSocket = () => {
  return useWebSocket({
    url: 'presence/',
    reconnect: true,
    reconnectAttempts: 3,
    reconnectInterval: 10000,
    heartbeatInterval: 30000,
    onOpen: () => {
      console.log('在線狀態 WebSocket 連接已建立');
    }
  });
};

export default useWebSocket; 