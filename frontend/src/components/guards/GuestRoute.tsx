/**
 * EngineerHub - 訪客路由組件
 * 
 * 職責：
 * - 檢查用戶認證狀態
 * - 限制已認證用戶訪問某些頁面（如登入、註冊頁面）
 * - 處理已認證用戶的重定向
 * 
 * 設計原則：
 * - Narrowly focused: 只負責訪客路由保護邏輯
 * - Flexible: 支援自定義重定向路徑
 * - Loosely coupled: 通過介面與認證服務交互
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthGuard } from '../../store/auth';

/**
 * 訪客路由組件屬性介面
 */
interface GuestRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ComponentType;
}

/**
 * 訪客路由組件
 * 
 * 功能：
 * - 檢查用戶認證狀態
 * - 已認證用戶重定向到指定頁面
 * - 未認證用戶可正常訪問
 * - 適用於登入、註冊等只允許未認證用戶訪問的頁面
 * 
 * @param children - 訪客可訪問的子組件
 * @param redirectTo - 已認證時的重定向路徑（預設：/）
 * @param fallback - 載入時的替代組件
 */
const GuestRoute: React.FC<GuestRouteProps> = ({ 
  children, 
  redirectTo = '/',
  fallback: Fallback 
}) => {
  // 獲取認證守衛狀態
  const { isAuthenticated, showLoading } = useAuthGuard();
  
  // 如果還在載入中，顯示 fallback 或什麼都不顯示
  if (showLoading) {
    return Fallback ? <Fallback /> : null;
  }
  
  // 如果提供了 fallback 組件且用戶已認證，顯示 fallback
  if (isAuthenticated && Fallback) {
    return <Fallback />;
  }
  
  // 如果用戶已認證，重定向到指定路徑
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // 用戶未認證，渲染訪客可訪問的內容
  return <>{children}</>;
};

export default GuestRoute; 