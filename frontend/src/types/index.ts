// ==================== 基礎類型 ====================

// 分頁響應類型
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// API 錯誤響應類型
export interface ApiError {
  message: string;
  details?: Record<string, string[]>;
  status?: number;
}

// ==================== 用戶相關類型 ====================

// 用戶統計信息類型
export interface UserStats {
  followers_count: number;
  following_count: number;
  posts_count: number;
  likes_received_count: number;
}

// 用戶數據類型
export interface UserData {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  github_url?: string;
  skill_tags?: string[];
  is_online: boolean;
  last_online?: string;
  is_verified?: boolean;
  is_private?: boolean;
  // 統計數據
  followers_count: number;
  following_count: number;
  posts_count: number;
  likes_received_count: number;
  // 社交功能
  is_following?: boolean;
  is_blocked?: boolean;
  // 時間戳
  created_at?: string;
  updated_at?: string;
  date_joined?: string;
}

// 註冊數據類型
export interface RegisterData {
  email: string;
  username: string;
  password1: string;
  password2: string;
  first_name: string;
  last_name: string;
}

// 登入數據類型
export interface LoginData {
  username: string;
  password: string;
}

// Token 響應類型
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: UserData;
}

// ==================== 貼文相關類型 ====================

// 貼文媒體類型
export interface PostMedia {
  id: string;
  file: string;
  media_type: 'image' | 'video';
  order: number;
  alt_text?: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  file_size?: number;
  duration?: number;
}

// 貼文類型
export interface Post {
  id: string;
  author: string;
  author_details: UserData;
  content: string;
  code_snippet?: string;
  code_language?: string;
  code_highlighted?: string;
  media: PostMedia[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
  is_saved: boolean;
  is_published: boolean;
  is_featured: boolean;
}

// 創建貼文數據類型
export interface CreatePostData {
  content: string;
  code_snippet?: string;
  media?: File[];
}

// 更新貼文數據類型
export interface UpdatePostData {
  content?: string;
  code_snippet?: string;
  new_media?: File[];
  remove_media?: string[];
}

// ==================== 評論相關類型 ====================

// 評論類型
export interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  likes_count: number;
  replies_count: number;
  is_liked: boolean;
  is_deleted: boolean;
  is_edited: boolean;
  user: string; // 用戶ID
  author_details: {
    id: string;
    username: string;
    display_name?: string;
    avatar?: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  post: string;
  parent?: string;
  replies?: Comment[];
}

// 創建評論數據類型
export interface CreateCommentData {
  post: string;
  content: string;
  parent?: string;
}

// ==================== 搜索相關類型 ====================

// 搜索結果類型
export interface SearchResult {
  posts: Post[];
  users: UserData[];
  total_count: number;
  posts_count: number;
  users_count: number;
}

// 搜索參數類型
export interface SearchParams {
  q: string;
  type?: 'all' | 'posts' | 'users';
  page?: number;
  ordering?: string;
}

// ==================== 聊天相關類型 ====================

// 消息類型
export interface Message {
  id: string;
  sender: string;
  sender_details: UserData;
  recipient: string;
  recipient_details: UserData;
  content: string;
  message_type: 'text' | 'image' | 'file';
  file_url?: string;
  created_at: string;
  is_read: boolean;
}

// 對話類型
export interface Conversation {
  id: string;
  participants: UserData[];
  last_message?: Message;
  updated_at: string;
  unread_count: number;
}

// ==================== 通知相關類型 ====================

// 通知相關
export interface NotificationData {
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>; // 改為更具體的類型
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'system';
  title: string;
  message: string;
  data: NotificationData;
  read: boolean;
  created_at: string;
  user: string;
}

// ==================== 作品集相關類型 ====================

// 作品集項目類型
export interface PortfolioProject {
  id: string;
  title: string;
  description: string;
  image?: string;
  project_url?: string;
  github_url?: string;
  youtube_url?: string;
  technologies: string[];
  is_featured: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}

// ==================== 設置相關類型 ====================

// 用戶設置類型
export interface UserSettings {
  // 通知設置
  email_notifications: boolean;
  push_notifications: boolean;
  notification_new_follower: boolean;
  notification_post_like: boolean;
  notification_post_comment: boolean;
  notification_comment_reply: boolean;
  notification_mention: boolean;
  notification_new_message: boolean;
  
  // 隱私設置
  profile_visibility: 'public' | 'followers' | 'private';
  show_online_status: boolean;
  allow_mentions: boolean;
  
  // UI 偏好
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-hant' | 'zh-hans' | 'en';
}

// 通知設置類型
export interface NotificationSettings {
  new_follower: boolean;
  post_like: boolean;
  post_comment: boolean;
  comment_reply: boolean;
  comment_like: boolean;
  new_message: boolean;
  post_mention: boolean;
  comment_mention: boolean;
  system_notification: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
}

// 隱私設置類型
export interface PrivacySettings {
  account_private: boolean;
  hide_online_status: boolean;
  hide_activity_status: boolean;
  disable_mention: boolean;
  profile_visibility: 'public' | 'followers' | 'none';
  email_visibility: 'public' | 'followers' | 'none';
  portfolio_visibility: 'public' | 'followers' | 'none';
}

// ==================== 表單相關類型 ====================

// 更改密碼數據類型
export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// 舉報數據類型
export interface ReportData {
  reason: string;
  details?: string;
}

// ==================== UI 組件類型 ====================

// 模態框基礎屬性
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 確認模態框屬性
export interface ConfirmModalProps extends ModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  danger?: boolean;
}

// 表單錯誤類型
export interface FormErrors {
  [key: string]: string | undefined;
}

// 表單狀態類型
export interface FormState<T> {
  data: T;
  errors: FormErrors;
  isSubmitting: boolean;
}

// 路由守衛屬性
export interface RouteGuardProps {
  children: React.ReactNode;
}

// 頁面組件屬性
export interface PageProps {
  className?: string;
}

// ==================== 常用類型別名 ====================

// 按鈕變體類型
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

// 按鈕大小類型
export type ButtonSize = 'sm' | 'md' | 'lg';

// 輸入框類型
export type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';

// 載入狀態類型
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// 主題類型
export type Theme = 'light' | 'dark' | 'auto';

// 排序方向類型
export type SortDirection = 'asc' | 'desc';

// 文件類型
export type FileType = 'image' | 'video' | 'document';

// Toast 類型
export type ToastType = 'success' | 'error' | 'warning' | 'info'; 