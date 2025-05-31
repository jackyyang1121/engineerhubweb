/**
 * WebSocket 演示頁面
 * 
 * 展示各種 WebSocket Hook 的功能和使用方法
 */

import React, { useState } from 'react';
import {
  SignalIcon,
  ChatBubbleLeftRightIcon,
  BellIcon,
  UserGroupIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

import { 
  useWebSocket, 
  useChatWebSocket, 
  useNotificationWebSocket, 
  usePresenceWebSocket,
  WebSocketState 
} from '../../hooks/useWebSocket';

const WebSocketDemo: React.FC = () => {
  const [customUrl, setCustomUrl] = useState('test/');
  
  // 各種 WebSocket 連接
  const customWS = useWebSocket({
    url: customUrl,
    reconnect: true,
    onMessage: (message) => {
      console.log('自定義 WebSocket 收到訊息:', message);
    },
    onOpen: () => {
      console.log('自定義 WebSocket 已連接');
    },
    onClose: () => {
      console.log('自定義 WebSocket 已斷開');
    }
  });

  const chatWS = useChatWebSocket();
  const notificationWS = useNotificationWebSocket();
  const presenceWS = usePresenceWebSocket();

  // 狀態顯示
  const getStateDisplay = (state: WebSocketState) => {
    const stateConfig = {
      [WebSocketState.CONNECTING]: { text: '連接中', color: 'text-yellow-600', bg: 'bg-yellow-100' },
      [WebSocketState.CONNECTED]: { text: '已連接', color: 'text-green-600', bg: 'bg-green-100' },
      [WebSocketState.DISCONNECTED]: { text: '已斷線', color: 'text-red-600', bg: 'bg-red-100' },
      [WebSocketState.RECONNECTING]: { text: '重連中', color: 'text-orange-600', bg: 'bg-orange-100' },
      [WebSocketState.ERROR]: { text: '錯誤', color: 'text-red-600', bg: 'bg-red-100' }
    };
    
    return stateConfig[state] || stateConfig[WebSocketState.DISCONNECTED];
  };

  // 發送測試訊息
  const sendTestMessage = (ws: ReturnType<typeof useWebSocket>, type: string) => {
    const testMessage = {
      type: 'test',
      data: {
        message: `來自 ${type} 的測試訊息`,
        timestamp: new Date().toISOString(),
        random: Math.random()
      }
    };
    
    ws.sendMessage(testMessage);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            WebSocket 功能演示
          </h1>
          <p className="text-lg text-gray-600">
            展示企業級 WebSocket Hook 的各種功能
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 自定義 WebSocket */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <SignalIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">自定義 WebSocket</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WebSocket URL
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="輸入 WebSocket 路徑..."
                  />
                  <button
                    onClick={customWS.reconnect}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <ArrowPathIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    customWS.readyState === WebSocketState.CONNECTED ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${getStateDisplay(customWS.readyState).color}`}>
                    {getStateDisplay(customWS.readyState).text}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  ID: {customWS.connectionId?.slice(-8)}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>重連次數: {customWS.reconnectCount}</div>
                <div>訊息數: {customWS.messageCount}</div>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => sendTestMessage(customWS, '自定義')}
                  disabled={customWS.readyState !== WebSocketState.CONNECTED}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  發送測試訊息
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={customWS.disconnect}
                    className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                  >
                    斷開連接
                  </button>
                  <button
                    onClick={customWS.reconnect}
                    className="flex-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    重新連接
                  </button>
                </div>
              </div>
              
              {customWS.lastMessage && (
                <div className="bg-gray-50 rounded-md p-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">最新訊息:</div>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap overflow-auto max-h-20">
                    {JSON.stringify(customWS.lastMessage, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* 聊天 WebSocket */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">聊天 WebSocket</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    chatWS.readyState === WebSocketState.CONNECTED ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${getStateDisplay(chatWS.readyState).color}`}>
                    {getStateDisplay(chatWS.readyState).text}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  聊天室: 全局
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>重連次數: {chatWS.reconnectCount}</div>
                <div>訊息數: {chatWS.messageCount}</div>
              </div>
              
              <button
                onClick={() => sendTestMessage(chatWS, '聊天')}
                disabled={chatWS.readyState !== WebSocketState.CONNECTED}
                className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                發送聊天訊息
              </button>
              
              {chatWS.lastMessage && (
                <div className="bg-green-50 rounded-md p-3">
                  <div className="text-xs font-medium text-green-700 mb-1">聊天訊息:</div>
                  <div className="text-xs text-green-600">
                    類型: {chatWS.lastMessage.type}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    時間: {chatWS.lastMessage.timestamp}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 通知 WebSocket */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <BellIcon className="h-6 w-6 text-orange-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">通知 WebSocket</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    notificationWS.readyState === WebSocketState.CONNECTED ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${getStateDisplay(notificationWS.readyState).color}`}>
                    {getStateDisplay(notificationWS.readyState).text}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  通知頻道
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>重連次數: {notificationWS.reconnectCount}</div>
                <div>訊息數: {notificationWS.messageCount}</div>
              </div>
              
              <button
                onClick={() => sendTestMessage(notificationWS, '通知')}
                disabled={notificationWS.readyState !== WebSocketState.CONNECTED}
                className="w-full px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
              >
                發送通知測試
              </button>
              
              {notificationWS.lastMessage && (
                <div className="bg-orange-50 rounded-md p-3">
                  <div className="text-xs font-medium text-orange-700 mb-1">通知訊息:</div>
                  <div className="text-xs text-orange-600">
                    類型: {notificationWS.lastMessage.type}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 在線狀態 WebSocket */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <UserGroupIcon className="h-6 w-6 text-purple-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">在線狀態 WebSocket</h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    presenceWS.readyState === WebSocketState.CONNECTED ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className={`text-sm font-medium ${getStateDisplay(presenceWS.readyState).color}`}>
                    {getStateDisplay(presenceWS.readyState).text}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  在線追蹤
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>重連次數: {presenceWS.reconnectCount}</div>
                <div>訊息數: {presenceWS.messageCount}</div>
              </div>
              
              <button
                onClick={() => sendTestMessage(presenceWS, '在線狀態')}
                disabled={presenceWS.readyState !== WebSocketState.CONNECTED}
                className="w-full px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                更新在線狀態
              </button>
              
              {presenceWS.lastMessage && (
                <div className="bg-purple-50 rounded-md p-3">
                  <div className="text-xs font-medium text-purple-700 mb-1">狀態更新:</div>
                  <div className="text-xs text-purple-600">
                    類型: {presenceWS.lastMessage.type}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 功能說明 */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">WebSocket Hook 功能特性</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">連接管理</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• 自動重連機制</li>
                <li>• 連接狀態追蹤</li>
                <li>• 心跳檢測</li>
                <li>• 錯誤處理</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">訊息處理</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• JSON 訊息自動解析</li>
                <li>• 訊息類型分發</li>
                <li>• 發送狀態反饋</li>
                <li>• 訊息計數統計</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">專用 Hook</h4>
              <ul className="text-gray-600 space-y-1">
                <li>• 聊天 WebSocket</li>
                <li>• 通知 WebSocket</li>
                <li>• 在線狀態 WebSocket</li>
                <li>• 可擴展架構</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebSocketDemo; 