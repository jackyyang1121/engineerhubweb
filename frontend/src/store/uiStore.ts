import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==================== UI Store Interface ====================
interface UIState {
  // 主題相關
  theme: 'light' | 'dark' | 'auto';
  
  // 佈局相關
  sidebarCollapsed: boolean;
  isMobile: boolean;
  
  // 通知相關
  notifications: Array<Toast>;
  
  // 彈窗相關
  modals: Array<Modal>;
  
  // 載入狀態
  isLoading: boolean;
  loadingMessage?: string;
  
  // 錯誤狀態
  error?: {
    message: string;
    code?: string;
    timestamp: string;
  } | null;
}

interface UIActions {
  // 主題操作
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  toggleTheme: () => void;
  
  // 側邊欄操作
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setSidebarPinned: (isPinned: boolean) => void;
  
  // 模態框操作
  openModal: (type: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  
  // 搜索操作
  toggleSearch: () => void;
  setSearchQuery: (query: string) => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  
  // 通知操作
  toggleNotifications: () => void;
  setUnreadCount: (count: number) => void;
  
  // 載入狀態操作
  setGlobalLoading: (loading: boolean) => void;
  setPageLoading: (loading: boolean) => void;
  
  // Toast 操作
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  hideToast: () => void;
}

type UIStore = UIState & UIActions;

interface Modal {
  id: string;
  component: React.ComponentType<unknown>; // 使用更具體的類型
  props?: Record<string, unknown>; // 使用更具體的類型
  onClose?: () => void;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}

// ==================== Store Implementation ====================
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // ==================== Initial State ====================
      theme: 'auto',
      
      sidebarCollapsed: false,
      isMobile: false,
      
      notifications: [],
      
      modals: [],
      
      isLoading: false,
      loadingMessage: undefined,
      
      error: undefined,
      
      // ==================== Actions ====================
      
      // 主題操作
      setTheme: (theme) => {
        set({ theme });
        
        // 實際應用主題到 DOM
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // auto - 根據系統偏好設置
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },
      
      toggleTheme: () => {
        const { theme } = get();
        const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
        get().setTheme(newTheme);
      },
      
      // 側邊欄操作
      toggleSidebar: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        }));
      },
      
      setSidebarOpen: (isOpen) => {
        set({
          sidebarCollapsed: isOpen,
        });
      },
      
      setSidebarPinned: (isPinned) => {
        set({
          sidebarCollapsed: isPinned,
        });
      },
      
      // 模態框操作
      openModal: (type, data) => {
        set({
          modals: [
            ...get().modals,
            {
              id: Date.now().toString(),
              component: type as unknown as React.ComponentType<unknown>,
              props: data,
            },
          ],
        });
      },
      
      closeModal: () => {
        set((state) => ({
          modals: state.modals.filter(m => m.id !== get().modals[0].id),
        }));
      },
      
      // 搜索操作
      toggleSearch: () => {
        set((state) => ({
          sidebarCollapsed: !state.sidebarCollapsed,
        }));
      },
      
      setSearchQuery: (query) => {
        set({
          loadingMessage: query,
        });
      },
      
      addRecentSearch: (query) => {
        if (!query.trim()) return;
        
        set((state) => {
          const recent = state.notifications.filter(n => n.id !== query);
          return {
            notifications: [
              ...recent.slice(0, 10),
              {
                id: query,
                type: 'info',
                message: query,
              },
            ],
          };
        });
      },
      
      clearRecentSearches: () => {
        set({
          notifications: [],
        });
      },
      
      // 通知操作
      toggleNotifications: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({
            ...n,
            type: n.type === 'info' ? 'success' : 'info',
          })),
        }));
      },
      
      setUnreadCount: () => {
        set((state) => ({
          notifications: state.notifications.map(n => ({
            ...n,
            type: n.type === 'info' ? 'success' : 'info',
          })),
        }));
      },
      
      // 載入狀態操作
      setGlobalLoading: (loading) => {
        set({
          isLoading: loading,
        });
      },
      
      setPageLoading: (loading) => {
        set({
          isLoading: loading,
        });
      },
      
      // Toast 操作
      showToast: (message, type) => {
        set((state) => ({
          notifications: [
            ...state.notifications,
            {
              id: Date.now().toString(),
              type,
              message,
            },
          ],
        }));
        
        // 3秒後自動隱藏
        setTimeout(() => {
          get().hideToast();
        }, 3000);
      },
      
      hideToast: () => {
        set((state) => ({
          notifications: state.notifications.filter(n => n.id !== get().notifications[0].id),
        }));
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        notifications: state.notifications.map(n => n.id),
      }),
    }
  )
);

// ==================== 主題初始化 ====================
// 在應用啟動時初始化主題
if (typeof window !== 'undefined') {
  const storedTheme = localStorage.getItem('ui-storage');
  let theme = 'auto';
  
  if (storedTheme) {
    try {
      const parsed = JSON.parse(storedTheme);
      theme = parsed.state?.theme || 'auto';
    } catch (e) {
      console.warn('Failed to parse stored theme:', e);
    }
  }
  
  // 應用主題
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // auto - 根據系統偏好設置
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // 監聽系統主題變化
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentTheme = useUIStore.getState().theme;
      if (currentTheme === 'auto') {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    });
  }
}

// ==================== Export Types ====================
export type { UIStore, UIState, UIActions }; 