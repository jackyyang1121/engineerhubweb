import { Outlet } from 'react-router-dom';
// 在你的父路由(AuthLayout)中放 <Outlet />。
// 當使用者訪問 /login 時，React Router 會：
// 先渲染父路由（例如 AuthLayout）
// 然後把 login 子路由對應的 <LoginPage /> 渲染到 <Outlet /> 位置上。

const AuthLayout = () => {
  return (
  // 創建一個全屏容器，設置背景漸層並隱藏溢出內容。 
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* 創建一個全屏容器，設置最小高度為螢幕高度，使用漸變背景從深藍到紫色再到粉紅色，並隱藏溢出內容。 */}
      
      {/* 添加動態背景裝飾，包含多個模糊彩色圓形，增強視覺效果。 */}
      <div className="absolute inset-0">
        {/* 在左上角添加一個藍色圓形，設置寬高為 72 單位，半透明並帶模糊效果，應用漂浮動畫。 */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-blue-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float"></div>
        {/* 在右上角添加一個紫色圓形，與藍色圓形類似，但動畫延遲 2 秒，增加視覺層次感。 */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '2s' }}></div>
        {/* 在左下角添加一個粉色圓形，動畫延遲 4 秒，進一步豐富背景動態效果。 */}
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '4s' }}></div>
        {/* 在右下角添加一個靛藍色圓形，動畫延遲 6 秒，完成四個角落的裝飾佈局。 */}
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-indigo-500/20 rounded-full mix-blend-multiply filter blur-xl animate-float" style={{ animationDelay: '6s' }}></div>
      </div>
      
      {/* 疊加一個半透明網格背景，增加背景的層次感。 */}
      <div className="absolute inset-0 bg-grid-white/5"></div>
      
      {/* 設置主要內容區塊，確保內容疊在背景之上並佔滿螢幕高度。 */}
      <div className="relative z-10 flex min-h-screen">
        {/* 左側品牌區域，僅在較大屏幕顯示，展示品牌資訊。 */}
        <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12">
          {/* 限制品牌內容寬度並設置白色文字，包含標識和描述。 */}
          <div className="max-w-md text-white">
            {/* 創建品牌標識區塊，使用 flex 佈局排列圖標和文字，底部間距設為 8。 */}
            <div className="flex items-center space-x-4 mb-8">
              {/* 開始圖標容器，使用相對定位，以便在圖標上疊加狀態指示器。 */}
              <div className="relative">
                {/* 設置圖標背景為漸變色（藍到粉紅），寬高 16 單位，圓角並帶陰影，內容置中。 */}
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl">
                  {/* 顯示文字 "EH"，設置白色粗體字，字體大小為 2xl，作為品牌縮寫。 */}
                  <span className="text-white font-black text-2xl">EH</span>
                  {/* <span>是行內元素，用來包裹文字，方便套用樣式或操作 */}
                </div>
                {/* 添加綠色狀態指示器，位於圖標右上角，帶動畫脈動效果，表示活躍狀態。 */}
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-4 border-indigo-900 animate-pulse"></div>
              </div>
              {/* 品牌名稱和標語區塊，垂直排列標題和副標題。 */}
              <div>
                {/* 顯示品牌名稱 "EngineerHub"，使用漸變色文字效果，字體設為粗體 3xl。 */}
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  EngineerHub
                </h1>
                {/* 添加副標題 "工程師專屬社群平台"，文字顏色設為靛藍色，作為品牌描述。 */}
                <p className="text-indigo-300">工程師專屬社群平台</p>
              </div>
            </div>
            
            {/* 顯示主要標語，設置文字大小為 4xl，加粗，行距緊湊，底部間距為 6。 */}
            <h2 className="text-4xl font-bold mb-6 leading-tight">
              {/* 顯示標語第一部分 "連接全球工程師"，作為標語的上半部分。 */}
              連接全球工程師
              {/* 使用 <br /> 強制換行，將標語分成兩行顯示。 */}
              <br />
              {/* 使用 <span> 包裹標語第二部分，應用漸變色效果，提升視覺亮點。 */}
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {/* 顯示標語第二部分 "分享技術智慧"，強調技術分享的主題。 */}
                分享技術智慧
              </span>
            </h2>
            
            {/* 添加簡介文字，設置文字大小為 xl，顏色為靛藍色，行距放鬆，底部間距為 8。 */}
            <p className="text-xl text-indigo-200 mb-8 leading-relaxed">
              {/* 顯示簡介內容，描述平台功能，鼓勵用戶參與和成長。 */}
              在這裡分享代碼、交流技術、展示項目，
              與世界各地的工程師建立連接，共同成長。
            </p>
            
            {/* 展示平台功能列表，使用垂直間距排列四個功能項。 */}
            <div className="space-y-4">
              {/* 開始第一個功能項，使用 flex 佈局排列圓點和文字，間距設為 3。 */}
              <div className="flex items-center space-x-3">
                {/* 添加綠色圓點，作為功能項的標誌，寬高設為 2 單位。 */}
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                {/* 顯示功能描述 "技術討論與分享"，文字顏色設為靛藍色。 */}
                <span className="text-indigo-200">技術討論與分享</span> 
              </div>
              {/* 開始第二個功能項，結構與第一項相同，僅顏色和文字不同。 */}
              <div className="flex items-center space-x-3">
                {/* 添加藍色圓點，作為第二項的標誌。 */}
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                {/* 顯示功能描述 "代碼片段展示"，文字顏色保持一致。 */}
                <span className="text-indigo-200">代碼片段展示</span>
              </div>
              {/* 開始第三個功能項，繼續使用相同結構。 */}
              <div className="flex items-center space-x-3">
                {/* 添加紫色圓點，作為第三項的標誌。 */}
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                {/* 顯示功能描述 "項目合作機會"。 */}
                <span className="text-indigo-200">項目合作機會</span>
              </div>
              {/* 開始第四個功能項。 */}
              <div className="flex items-center space-x-3">
                {/* 添加粉色圓點，作為第四項的標誌。 */}
                <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                {/* 顯示功能描述 "職業發展交流"。 */}
                <span className="text-indigo-200">職業發展交流</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 右側表單區域，用於渲染子路由內容，保持內容居中。 */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          {/* 限制表單內容寬度並渲染子路由組件。 */}
          <div className="w-full max-w-md">
            {/* 使用 Outlet 組件，作為子路由的渲染位置，例如登錄或註冊頁面。 */}
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