/**
 * EngineerHub - 保護路由組件
 * 
 * 職責：
 * - 檢查用戶認證狀態
 * - 處理未認證用戶的重定向
 * - 保護需要認證的路由
 * 
 * 設計原則：
 * - Narrowly focused: 只負責路由保護邏輯
 * - Flexible: 支援依賴注入的認證狀態檢查
 * - Loosely coupled: 通過介面與認證服務交互
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * 保護路由組件屬性介面
 */
interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  fallback?: React.ComponentType;
}

/**
 * 保護路由組件
 * 
 * 功能：
 * - 檢查用戶認證狀態
 * - 未認證時重定向到登入頁面
 * - 保存原始路由用於登入後跳回
 * - 支援自定義重定向路徑
 * 
 * @param children - 被保護的子組件
 * @param redirectTo - 未認證時的重定向路徑（預設：/login）
 * @param fallback - 載入時的替代組件
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login',
  fallback: Fallback 
}) => {
  // 獲取認證狀態
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  
  // 獲取當前路由位置，用於登入後跳回
  const location = useLocation();
  
  // 如果提供了 fallback 組件且用戶未認證，顯示 fallback
  if (!isAuthenticated && Fallback) {
    return <Fallback />;
  }
  
  // 如果用戶未認證，重定向到指定路徑
  if (!isAuthenticated) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  // 用戶已認證，渲染受保護的內容
  return <>{children}</>;
};

export default ProtectedRoute; 