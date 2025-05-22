import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ==================== UI Store Interface ====================
interface UIState {
  // 主題設置
  theme: 'light' | 'dark' | 'auto';
  
  // 側邊欄狀態
  sidebar: {
    isOpen: boolean;
    isPinned: boolean;
  };
  
  // 模態框狀態
  modal: {
    isOpen: boolean;
    type?: string;
    data?: any;
  };
  
  // 搜索狀態
  search: {
    isOpen: boolean;
    query: string;
    recentSearches: string[];
  };
  
  // 通知狀態
  notifications: {
    isOpen: boolean;
    unreadCount: number;
  };
  
  // 載入狀態
  loading: {
    global: boolean;
    page: boolean;
  };
  
  // Toast 通知
  toast: {
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    isVisible: boolean;
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
  openModal: (type: string, data?: any) => void;
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

// ==================== Store Implementation ====================
export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // ==================== Initial State ====================
      theme: 'auto',
      
      sidebar: {
        isOpen: false,
        isPinned: false,
      },
      
      modal: {
        isOpen: false,
      },
      
      search: {
        isOpen: false,
        query: '',
        recentSearches: [],
      },
      
      notifications: {
        isOpen: false,
        unreadCount: 0,
      },
      
      loading: {
        global: false,
        page: false,
      },
      
      toast: null,
      
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
          sidebar: {
            ...state.sidebar,
            isOpen: !state.sidebar.isOpen,
          },
        }));
      },
      
      setSidebarOpen: (isOpen) => {
        set((state) => ({
          sidebar: {
            ...state.sidebar,
            isOpen,
          },
        }));
      },
      
      setSidebarPinned: (isPinned) => {
        set((state) => ({
          sidebar: {
            ...state.sidebar,
            isPinned,
          },
        }));
      },
      
      // 模態框操作
      openModal: (type, data) => {
        set({
          modal: {
            isOpen: true,
            type,
            data,
          },
        });
      },
      
      closeModal: () => {
        set({
          modal: {
            isOpen: false,
          },
        });
      },
      
      // 搜索操作
      toggleSearch: () => {
        set((state) => ({
          search: {
            ...state.search,
            isOpen: !state.search.isOpen,
          },
        }));
      },
      
      setSearchQuery: (query) => {
        set((state) => ({
          search: {
            ...state.search,
            query,
          },
        }));
      },
      
      addRecentSearch: (query) => {
        if (!query.trim()) return;
        
        set((state) => {
          const recent = state.search.recentSearches.filter(s => s !== query);
          return {
            search: {
              ...state.search,
              recentSearches: [query, ...recent].slice(0, 10), // 最多保存 10 個
            },
          };
        });
      },
      
      clearRecentSearches: () => {
        set((state) => ({
          search: {
            ...state.search,
            recentSearches: [],
          },
        }));
      },
      
      // 通知操作
      toggleNotifications: () => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            isOpen: !state.notifications.isOpen,
          },
        }));
      },
      
      setUnreadCount: (count) => {
        set((state) => ({
          notifications: {
            ...state.notifications,
            unreadCount: count,
          },
        }));
      },
      
      // 載入狀態操作
      setGlobalLoading: (loading) => {
        set((state) => ({
          loading: {
            ...state.loading,
            global: loading,
          },
        }));
      },
      
      setPageLoading: (loading) => {
        set((state) => ({
          loading: {
            ...state.loading,
            page: loading,
          },
        }));
      },
      
      // Toast 操作
      showToast: (message, type) => {
        set({
          toast: {
            message,
            type,
            isVisible: true,
          },
        });
        
        // 3秒後自動隱藏
        setTimeout(() => {
          get().hideToast();
        }, 3000);
      },
      
      hideToast: () => {
        set({ toast: null });
      },
    }),
    {
      name: 'ui-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebar: {
          isPinned: state.sidebar.isPinned,
        },
        search: {
          recentSearches: state.search.recentSearches,
        },
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