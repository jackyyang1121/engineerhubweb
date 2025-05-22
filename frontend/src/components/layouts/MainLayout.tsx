import { Outlet } from 'react-router-dom';
import MainNavbar from './MainNavbar';

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <MainNavbar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="container mx-auto py-6 px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout; 