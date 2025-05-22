# 🎨 前端專案導覽 - React + TypeScript

> **企業級前端開發學習指南**

## 📖 前端概述

本前端專案採用現代化的 React 18 + TypeScript 架構，整合了業界最佳實踐，為新手開發者提供完整的企業級前端開發學習範例。

## 🏗️ 目錄結構詳解

```
frontend/
├── 📁 public/                      # 靜態資源目錄
│   ├── vite.svg                    # 網站圖標
│   └── index.html                  # HTML 模板
├── 📁 src/                         # 源代碼目錄
│   ├── 📁 components/              # 可重用組件
│   │   ├── 📁 common/              # 通用組件
│   │   │   ├── Button.tsx          # 按鈕組件
│   │   │   ├── LoadingSpinner.tsx  # 載入動畫
│   │   │   └── Modal.tsx           # 彈窗組件
│   │   ├── 📁 layout/              # 布局組件
│   │   │   ├── Header.tsx          # 頁面頭部
│   │   │   ├── Sidebar.tsx         # 側邊欄
│   │   │   └── Footer.tsx          # 頁面底部
│   │   └── 📁 features/            # 功能特定組件
│   │       ├── PostCard.tsx        # 貼文卡片
│   │       ├── UserProfile.tsx     # 用戶資料
│   │       └── CodeBlock.tsx       # 程式碼區塊
│   ├── 📁 pages/                   # 頁面組件
│   │   ├── 📁 home/                # 首頁相關
│   │   ├── 📁 profile/             # 個人資料頁
│   │   ├── 📁 explore/             # 探索頁面
│   │   └── 📁 auth/                # 認證頁面
│   ├── 📁 hooks/                   # 自定義 Hook
│   │   ├── useAuth.ts              # 認證 Hook
│   │   ├── useApi.ts               # API 請求 Hook
│   │   └── useLocalStorage.ts      # 本地存儲 Hook
│   ├── 📁 store/                   # 狀態管理
│   │   ├── authStore.ts            # 認證狀態
│   │   ├── postStore.ts            # 貼文狀態
│   │   └── uiStore.ts              # UI 狀態
│   ├── 📁 api/                     # API 服務
│   │   ├── auth.ts                 # 認證 API
│   │   ├── posts.ts                # 貼文 API
│   │   └── users.ts                # 用戶 API
│   ├── 📁 types/                   # TypeScript 類型定義
│   │   ├── auth.ts                 # 認證類型
│   │   ├── post.ts                 # 貼文類型
│   │   └── user.ts                 # 用戶類型
│   ├── 📁 utils/                   # 工具函數
│   │   ├── formatters.ts           # 格式化函數
│   │   ├── validators.ts           # 驗證函數
│   │   └── constants.ts            # 常量定義
│   ├── 📁 assets/                  # 靜態資源
│   │   ├── images/                 # 圖片資源
│   │   └── icons/                  # 圖標資源
│   ├── App.tsx                     # 主應用組件
│   ├── main.tsx                    # 應用入口
│   ├── index.css                   # 全局樣式
│   └── vite-env.d.ts              # Vite 類型聲明
├── 📦 package.json                 # 依賴配置
├── 📝 tsconfig.json               # TypeScript 配置
├── 🎨 tailwind.config.ts          # Tailwind CSS 配置
├── ⚡ vite.config.ts              # Vite 構建配置
└── 📖 FRONTEND_GUIDE.md           # 本導覽文件
```

## 🛠️ 技術棧深度解析

### 🎯 核心技術

#### React 18
- **功能**：用戶界面構建
- **新特性**：Concurrent Features, Automatic Batching
- **學習重點**：組件生命週期、Hook 使用、效能優化

#### TypeScript
- **功能**：靜態類型檢查
- **優勢**：提升代碼品質、減少運行時錯誤
- **學習重點**：類型定義、泛型使用、接口設計

### 🎨 UI 與樣式

#### Tailwind CSS
- **功能**：原子化 CSS 框架
- **優勢**：快速開發、一致性設計
- **配置**：`tailwind.config.ts`

```typescript
// tailwind.config.ts 範例
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981'
      }
    }
  }
}
```

#### Headless UI
- **功能**：無樣式的可訪問組件
- **優勢**：完全可定制、無障礙支援
- **常用組件**：Modal, Dropdown, Toggle

### 📡 狀態管理

#### Zustand
- **功能**：輕量級狀態管理
- **優勢**：簡單易用、TypeScript 友好
- **適用場景**：中小型專案的全局狀態

```typescript
// 狀態管理範例
interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  login: (user: User) => void;
  logout: () => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  login: (user) => set({ user, isLoggedIn: true }),
  logout: () => set({ user: null, isLoggedIn: false })
}));
```

#### React Query (TanStack Query)
- **功能**：伺服器狀態管理
- **優勢**：緩存、同步、背景更新
- **特性**：自動重新請求、錯誤處理、樂觀更新

### 🛣️ 路由管理

#### React Router v6
- **功能**：客戶端路由
- **新特性**：嵌套路由、數據載入
- **學習重點**：路由配置、保護路由、懶載入

## 🎯 核心組件設計

### 🧩 組件分類

#### 1. 通用組件 (Common Components)
**位置**：`src/components/common/`
**特點**：可重用、無業務邏輯、高度可配置

```typescript
// Button 組件範例
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Button: React.FC<ButtonProps> = ({ 
  variant, 
  size, 
  loading, 
  children, 
  onClick 
}) => {
  const baseClasses = 'rounded-lg font-medium transition-colors';
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700'
  };
  
  return (
    <button 
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
      disabled={loading}
    >
      {loading ? <LoadingSpinner /> : children}
    </button>
  );
};
```

#### 2. 布局組件 (Layout Components)
**位置**：`src/components/layout/`
**特點**：結構性組件、響應式設計

#### 3. 功能組件 (Feature Components)
**位置**：`src/components/features/`
**特點**：業務相關、特定功能

### 📱 頁面組件結構

每個頁面組件都遵循統一的結構：

```typescript
// 頁面組件範例結構
const ExplorePage: React.FC = () => {
  // 1. 狀態管理
  const [activeTab, setActiveTab] = useState('trending');
  
  // 2. API 查詢
  const { data, isLoading, error } = useQuery({
    queryKey: ['trending'],
    queryFn: fetchTrendingData
  });
  
  // 3. 事件處理函數
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };
  
  // 4. 渲染函數
  const renderContent = () => {
    if (isLoading) return <LoadingSpinner />;
    if (error) return <ErrorMessage />;
    return <ContentDisplay data={data} />;
  };
  
  // 5. 主渲染
  return (
    <div className="container mx-auto px-4">
      <Header />
      <TabNavigation activeTab={activeTab} onChange={handleTabChange} />
      {renderContent()}
    </div>
  );
};
```

## 🔗 API 整合模式

### 📡 API 服務層

**位置**：`src/api/`
**設計原則**：職責分離、錯誤處理、類型安全

```typescript
// API 服務範例
class PostAPI {
  private baseURL = '/api/posts';
  
  async getPosts(page: number = 1): Promise<PaginatedResponse<Post>> {
    try {
      const response = await axios.get(`${this.baseURL}/?page=${page}`);
      return response.data;
    } catch (error) {
      throw new APIError('獲取貼文失敗', error);
    }
  }
  
  async createPost(data: CreatePostData): Promise<Post> {
    try {
      const response = await axios.post(this.baseURL, data);
      return response.data;
    } catch (error) {
      throw new APIError('創建貼文失敗', error);
    }
  }
}

export const postAPI = new PostAPI();
```

### 🎣 自定義 Hook

**位置**：`src/hooks/`
**目的**：邏輯複用、狀態封裝

```typescript
// 自定義 Hook 範例
const useAuth = () => {
  const { user, login, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      const user = await authAPI.login(credentials);
      login(user);
      navigate('/dashboard');
    } catch (error) {
      toast.error('登入失敗');
    }
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  return {
    user,
    isLoggedIn: !!user,
    login: handleLogin,
    logout: handleLogout
  };
};
```

## 🎨 樣式設計系統

### 🎯 設計原則

#### 1. 原子化設計
- **原子組件**：Button, Input, Icon
- **分子組件**：SearchBox, Card
- **有機體組件**：Header, PostList
- **模板**：PageLayout
- **頁面**：HomePage, ProfilePage

#### 2. 響應式設計
```css
/* Tailwind 響應式斷點 */
sm:  640px  /* 小屏幕 */
md:  768px  /* 中等屏幕 */
lg:  1024px /* 大屏幕 */
xl:  1280px /* 超大屏幕 */
2xl: 1536px /* 超超大屏幕 */
```

#### 3. 色彩系統
```typescript
// 色彩配置
const colors = {
  primary: {
    50: '#eff6ff',
    500: '#3b82f6',
    900: '#1e3a8a'
  },
  gray: {
    50: '#f9fafb',
    500: '#6b7280',
    900: '#111827'
  }
};
```

## 🚀 開發工作流

### 🔧 本地開發

1. **啟動開發服務器**
   ```bash
   npm run dev
   ```

2. **代碼檢查**
   ```bash
   npm run lint
   ```

3. **類型檢查**
   ```bash
   npm run type-check
   ```

### 🧪 測試策略

#### 單元測試
```typescript
// 組件測試範例
describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button variant="primary">Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### 📦 構建與部署

#### 構建生產版本
```bash
npm run build
```

#### 預覽構建結果
```bash
npm run preview
```

## 🎓 學習建議

### 🎯 新手學習路徑

#### 第一階段：基礎理解
1. **熟悉專案結構**
   - 瀏覽 `src/` 目錄
   - 理解組件分類
   - 查看頁面組織方式

2. **學習基礎組件**
   - 從 `Button` 組件開始
   - 理解 props 設計
   - 學習 Tailwind CSS 類名

#### 第二階段：狀態管理
1. **Zustand 狀態管理**
   - 查看 `src/store/` 目錄
   - 理解狀態設計模式
   - 學習狀態更新方法

2. **React Query 使用**
   - 學習數據請求
   - 理解緩存機制
   - 掌握錯誤處理

#### 第三階段：進階功能
1. **自定義 Hook**
   - 查看 `src/hooks/` 目錄
   - 學習邏輯複用
   - 實踐編寫 Hook

2. **路由管理**
   - 理解路由配置
   - 學習保護路由
   - 掌握懶載入

### 💡 實踐建議

#### 1. 修改現有組件
- 改變按鈕顏色
- 調整卡片布局
- 添加新的 props

#### 2. 創建新組件
- 實現 Toast 通知
- 創建搜索框
- 開發標籤組件

#### 3. 添加新頁面
- 設計設置頁面
- 實現關於頁面
- 創建幫助中心

## 🔧 開發工具

### 📝 VS Code 設置

#### 推薦插件
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint"
  ]
}
```

#### 工作區設置
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

### 🚀 效能優化

#### 1. 組件優化
- 使用 `React.memo`
- 合理使用 `useMemo`
- 避免不必要的重新渲染

#### 2. 打包優化
- 代碼分割
- 懶載入路由
- 圖片優化

#### 3. 網路優化
- API 請求合併
- 數據預載入
- 緩存策略

## 🆘 常見問題

### Q: 組件樣式不生效？
**A**: 檢查 Tailwind CSS 類名是否正確，確認配置文件是否包含所有源文件。

### Q: TypeScript 報錯？
**A**: 檢查類型定義，確保導入的類型正確，查看 `src/types/` 目錄。

### Q: API 請求失敗？
**A**: 檢查網路連接、API 端點、請求格式和錯誤處理。

### Q: 狀態更新不生效？
**A**: 確認 Zustand store 的使用方式，檢查狀態更新邏輯。

## 📚 延伸學習

### 📖 推薦資源
- [React 官方文檔](https://react.dev)
- [TypeScript 官方文檔](https://www.typescriptlang.org)
- [Tailwind CSS 文檔](https://tailwindcss.com)
- [React Query 文檔](https://tanstack.com/query)

### 🎯 進階主題
- React Server Components
- 微前端架構
- 狀態機 (XState)
- 測試驅動開發

---

**🎉 掌握這些知識，你就能自信地開發現代化的 React 應用了！** 