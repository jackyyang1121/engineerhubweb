import { Outlet } from 'react-router-dom';
// 在你的父路由(AuthLayout)中放 <Outlet />。
// 當使用者訪問 /login 時，React Router 會：
// 先渲染父路由（例如 AuthLayout）
// 然後把 login 子路由對應的 <LoginPage /> 渲染到 <Outlet /> 位置上。

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
              {/* <br /> 是 換行元素 */}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {/* <span> 不會自己換行*/}
                分享技術智慧
              </span>
            </h2>
            
            <p className="text-xl text-indigo-200 mb-8 leading-relaxed">
            {/* <p>是文字元素 */}
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
            {/* Outlet 是 React Router（從 react-router-dom 匯入）提供的一個組件，用於在 巢狀路由 中，指定子路由要被渲染的位置。 */}
            {/* 簡單來說： */}
            {/* 如果父路由（例如 AuthLayout）定義了 <Outlet />，那它的子路由（例如 login、register）的 element 內容，就會被插入在 <Outlet /> 的位置。 */}
            {/* <Outlet /> 就是一个占位符，React Router 會根據當前 URL 把對應子路由的组件"插"到這個位置 */}
          </div>
        </div>
      </div>
    </div>
  );
};

{/* <span> 是「行內元素」 */}
{/* 🔸 適合用在：短字串或一小段文字（或局部文字），比如要改變樣式（顏色、粗體、斜體等），或是需要在行內包住特定字詞。 */}
{/* 🔸 預設：在瀏覽器中不會換行，也沒有上下的空隙。 */}
{/* 🔸 不具語意，只是包起來給 CSS 或 JS 使用。 */}

{/* <p> 是「段落」 */}
{/* 🔸 適合用在：文章的段落、比較長的文字敘述，通常一段內容裡面要有換行、較長的敘述。 */}
{/* 🔸 預設：在瀏覽器中顯示時，段落會上下留空行（有空隙）。 */}
{/* 🔸 SEO 友善：讓搜尋引擎知道「這是一段完整的句子」。 */}

export default AuthLayout;