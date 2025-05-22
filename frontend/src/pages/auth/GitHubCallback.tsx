/**
 * GitHub OAuth 回調處理頁面
 * 
 * 功能：
 * 1. 處理GitHub OAuth授權回調
 * 2. 提取授權碼並傳送給父視窗
 * 3. 錯誤處理和用戶反饋
 */

import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const GitHubCallback: React.FC = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // 檢查是否在彈出視窗中
    if (window.opener && window.opener !== window) {
      try {
        if (error) {
          // 發送錯誤消息給父視窗
          window.opener.postMessage({
            type: 'GITHUB_AUTH_ERROR',
            error: error,
            description: errorDescription || '授權失敗'
          }, window.location.origin);
        } else if (code) {
          // 發送成功消息和授權碼給父視窗
          window.opener.postMessage({
            type: 'GITHUB_AUTH_SUCCESS',
            code: code
          }, window.location.origin);
        } else {
          // 沒有授權碼也沒有錯誤，可能是用戶取消
          window.opener.postMessage({
            type: 'GITHUB_AUTH_ERROR',
            error: 'no_code',
            description: '未收到授權碼'
          }, window.location.origin);
        }
        
        // 關閉彈出視窗
        window.close();
      } catch (error) {
        console.error('發送消息給父視窗失敗:', error);
        // 如果無法與父視窗通信，嘗試關閉視窗
        window.close();
      }
    } else {
      // 如果不在彈出視窗中，重定向到登入頁面
      window.location.href = '/login';
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <LoadingSpinner size="lg" />
        <h2 className="mt-4 text-lg font-semibold text-gray-900">
          正在處理 GitHub 授權...
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          請稍候，我們正在完成登入流程
        </p>
      </div>
    </div>
  );
};

export default GitHubCallback; 