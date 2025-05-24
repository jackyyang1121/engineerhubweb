import { Outlet } from 'react-router-dom';
import MainNavbar from './MainNavbar';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex">
      <MainNavbar />
      <main className="flex-1 ml-72 min-h-screen relative">
        {/* 背景裝飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-100/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-100/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 container mx-auto py-8 px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout; 