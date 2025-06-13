import React from 'react';
import MainNavbar from './MainNavbar';

/**
 * 主要應用佈局組件
 * 
 * 功能：
 * - 提供側邊導航欄
 * - 美化背景設計
 * - 響應式佈局支援
 * 
 * 設計原則：
 * - Narrowly focused: 專注於佈局管理
 * - Flexible: 支援任意子組件
 * - Loosely coupled: 不依賴特定路由實現
 */
interface MainLayoutProps {
  /** 要渲染的子組件 */
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex">
      {/* 側邊導航欄 - 提供應用主要導航功能 */}
      <MainNavbar />
      
      {/* 主內容區域 - 自適應剩餘空間 */}
      <main className="flex-1 ml-72 min-h-screen relative">
        {/* 背景裝飾 - 增強視覺效果，不影響交互 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-100/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        {/* 內容容器 - 確保內容在背景之上 */}
        <div className="relative z-10 container mx-auto py-8 px-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout; 