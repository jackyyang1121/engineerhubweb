import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* 動態背景裝飾 */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '6s' }}></div>
      </div>
      
      {/* 網格背景 */}
      <div className="absolute inset-0 bg-grid-white/5"></div>
      
      {/* 主要內容 */}
      <div className="relative z-10 flex min-h-screen">
        {/* 左側品牌區域 */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          <div className="max-w-md text-white">
            <div className="flex items-center space-x-4 mb-8">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  <span className="text-white font-black text-2xl">EH</span>
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-indigo-900 animate-pulse"></div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  EngineerHub
                </h1>
                <p className="text-indigo-300">工程師專屬社群平台</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              連接全球工程師
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                分享技術智慧
              </span>
            </h2>
            
            <p className="text-xl text-indigo-200 mb-8 leading-relaxed">
              在這裡分享代碼、交流技術、展示項目，
              與世界各地的工程師建立連接，共同成長。
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-indigo-200">技術討論與分享</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-indigo-200">代碼片段展示</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-indigo-200">項目合作機會</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                <span className="text-indigo-200">職業發展交流</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右側表單區域 */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout; 