/**
 * EngineerHub - 保護路由組件
 * 
 * 職責：
 * - 檢查用戶認證狀態
 * - 處理未認證用戶的重定向
 * - 保護需要認證的路由
 * - 檢查用戶角色權限
 * 
 * 設計原則：
 * - Narrowly focused: 只負責路由保護邏輯
 * - Flexible: 支援依賴注入的認證狀態檢查
 * - Loosely coupled: 通過介面與認證服務交互
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthGuard, useFullAuth } from '../../store/auth';

/**
 * 保護路由組件屬性介面
 */
interface ProtectedRouteProps {
  /** 被保護的子組件 */
  children: React.ReactNode;
  /** 未認證時的重定向路徑（預設：/login） */
  redirectTo?: string;
  /** 載入時的替代組件 */
  fallback?: React.ComponentType;
  /** 需要的用戶角色 */
  requiredRole?: 'admin' | 'moderator' | 'user';
  /** 需要的權限 */
  requiredPermission?: string;
}

/**
 * 保護路由組件
 * 
 * 功能：
 * - 檢查用戶認證狀態
 * - 未認證時重定向到登入頁面
 * - 保存原始路由用於登入後跳回
 * - 支援自定義重定向路徑
 * - 支援角色和權限檢查
 * 
 * @param children - 被保護的子組件
 * @param redirectTo - 未認證時的重定向路徑（預設：/login）
 * @param fallback - 載入時的替代組件
 * @param requiredRole - 需要的用戶角色
 * @param requiredPermission - 需要的權限
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  redirectTo = '/login',
  fallback: Fallback,
  requiredRole,
  requiredPermission
}) => {
  // 使用認證守衛Hook進行基本認證檢查
  const { 
    showLoading, 
    shouldRedirectToLogin 
  } = useAuthGuard();
  
  // 使用完整認證Hook進行權限檢查
  const { user, hasPermission } = useFullAuth();
  
  // 獲取當前路由位置，用於登入後跳回
  const location = useLocation();
  
  // 載入中狀態 - 顯示載入指示器或自定義fallback
  if (showLoading) {
    if (Fallback) {
      return <Fallback />;
    }
    
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // 未認證 - 重定向到登入頁面
  if (shouldRedirectToLogin) {
    return (
      <Navigate 
        to={redirectTo} 
        state={{ from: location }} 
        replace 
      />
    );
  }
  
  // 檢查角色權限（如果指定了角色要求）
  if (requiredRole && user) {
    const hasRequiredRole = () => {
      switch (requiredRole) {
        case 'admin':
          return user.is_staff || user.is_superuser;
        case 'moderator':
          return user.is_staff || user.is_superuser;
        case 'user':
          return true; // 已認證用戶都有user角色
        default:
          return false;
      }
    };
    
    if (!hasRequiredRole()) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h2>
            <p className="text-gray-600">您沒有訪問此頁面的權限</p>
            <p className="text-sm text-gray-500 mt-2">需要角色：{requiredRole}</p>
          </div>
        </div>
      );
    }
  }
  
  // 檢查特定權限（如果指定了權限要求）
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">權限不足</h2>
          <p className="text-gray-600">您沒有執行此操作的權限</p>
          <p className="text-sm text-gray-500 mt-2">需要權限：{requiredPermission}</p>
        </div>
      </div>
    );
  }
  
  // 權限檢查通過 - 渲染受保護的內容
  return <>{children}</>;
};

export default ProtectedRoute; 