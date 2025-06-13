/**
 * 權限檢查工具模塊
 * 
 * 功能：統一處理專案中的權限檢查邏輯，提供一致的權限管理
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責權限檢查邏輯
 * - Flexible: 支援不同類型的權限檢查場景
 * - Loosely coupled: 通過類型系統確保權限檢查的安全性
 */

// 導入用戶數據類型
import type { UserData } from '../types';

// 定義資源所有者類型 - 具有作者字段的資源
interface ResourceWithAuthor {
  author: string | number;  // 作者 ID，支援字符串或數字類型
}

// 定義具有用戶 ID 的資源類型
interface ResourceWithUserId {
  user_id: string | number;  // 用戶 ID
}

// 定義具有創建者的資源類型
interface ResourceWithCreator {
  created_by: string | number;  // 創建者 ID
}

// 聯合類型：所有可能的資源類型
type Resource = ResourceWithAuthor | ResourceWithUserId | ResourceWithCreator;

// 權限檢查結果類型
interface PermissionResult {
  allowed: boolean;         // 是否允許
  reason?: string;          // 不允許的原因
}

/**
 * 權限檢查器類 - 統一處理各種權限檢查場景
 * 
 * 這個類解決了組件中重複的權限檢查邏輯，提供一致且安全的權限判斷
 */
export class PermissionChecker {
  /**
   * 檢查是否為資源作者
   * 
   * @param currentUser - 當前登入的用戶
   * @param resource - 要檢查的資源（具有作者資訊）
   * @returns boolean - 是否為作者
   * 
   * 使用範例：
   * ```typescript
   * const canEdit = PermissionChecker.isAuthor(user, post);
   * ```
   */
  static isAuthor(currentUser: UserData | null, resource: ResourceWithAuthor): boolean {
    // 檢查用戶是否已登入
    if (!currentUser) {
      return false;
    }

    // 統一轉換為字符串進行比較，避免類型不一致問題
    const currentUserId = String(currentUser.id);
    const authorId = String(resource.author);
    
    return currentUserId === authorId;
  }

  /**
   * 檢查是否為資源所有者（通用方法）
   * 
   * @param currentUser - 當前登入的用戶
   * @param resource - 要檢查的資源
   * @returns boolean - 是否為所有者
   * 
   * 這個方法會自動識別資源中的所有者字段（author, user_id, created_by）
   */
  static isOwner(currentUser: UserData | null, resource: Resource): boolean {
    if (!currentUser) {
      return false;
    }

    const currentUserId = String(currentUser.id);

    // 檢查不同的所有者字段
    if ('author' in resource) {
      return currentUserId === String(resource.author);
    }
    
    if ('user_id' in resource) {
      return currentUserId === String(resource.user_id);
    }
    
    if ('created_by' in resource) {
      return currentUserId === String(resource.created_by);
    }

    return false;
  }

  /**
   * 檢查是否可以編輯資源
   * 
   * @param currentUser - 當前登入的用戶
   * @param resource - 要編輯的資源
   * @returns PermissionResult - 權限檢查結果
   * 
   * 編輯權限規則：
   * 1. 必須是資源的所有者
   * 2. 或者是管理員/工作人員
   */
  static canEdit(currentUser: UserData | null, resource: Resource): PermissionResult {
    // 檢查用戶是否已登入
    if (!currentUser) {
      return {
        allowed: false,
        reason: '需要登入才能編輯'
      };
    }

    // 檢查是否為資源所有者
    if (this.isOwner(currentUser, resource)) {
      return {
        allowed: true
      };
    }

    // 檢查是否為管理員
    if (currentUser.is_staff || currentUser.is_superuser) {
      return {
        allowed: true
      };
    }

    return {
      allowed: false,
      reason: '只有作者和管理員可以編輯此內容'
    };
  }

  /**
   * 檢查是否可以刪除資源
   * 
   * @param currentUser - 當前登入的用戶
   * @param resource - 要刪除的資源
   * @returns PermissionResult - 權限檢查結果
   * 
   * 刪除權限規則：
   * 1. 必須是資源的所有者
   * 2. 或者是管理員/工作人員
   */
  static canDelete(currentUser: UserData | null, resource: Resource): PermissionResult {
    // 檢查用戶是否已登入
    if (!currentUser) {
      return {
        allowed: false,
        reason: '需要登入才能刪除'
      };
    }

    // 檢查是否為資源所有者
    if (this.isOwner(currentUser, resource)) {
      return {
        allowed: true
      };
    }

    // 檢查是否為管理員
    if (currentUser.is_staff || currentUser.is_superuser) {
      return {
        allowed: true
      };
    }

    return {
      allowed: false,
      reason: '只有作者和管理員可以刪除此內容'
    };
  }

  /**
   * 檢查是否可以查看資源
   * 
   * @param currentUser - 當前登入的用戶
   * @param resource - 要查看的資源
   * @param isPublic - 資源是否為公開（默認 true）
   * @returns PermissionResult - 權限檢查結果
   * 
   * 查看權限規則：
   * 1. 公開資源：所有用戶都可以查看
   * 2. 私有資源：只有所有者和管理員可以查看
   */
  static canView(
    currentUser: UserData | null, 
    resource: Resource, 
    isPublic: boolean = true
  ): PermissionResult {
    // 公開資源所有人都可以查看
    if (isPublic) {
      return {
        allowed: true
      };
    }

    // 私有資源需要登入
    if (!currentUser) {
      return {
        allowed: false,
        reason: '需要登入才能查看此內容'
      };
    }

    // 檢查是否為資源所有者
    if (this.isOwner(currentUser, resource)) {
      return {
        allowed: true
      };
    }

    // 檢查是否為管理員
    if (currentUser.is_staff || currentUser.is_superuser) {
      return {
        allowed: true
      };
    }

    return {
      allowed: false,
      reason: '沒有權限查看此內容'
    };
  }

  /**
   * 檢查是否為管理員
   * 
   * @param currentUser - 當前登入的用戶
   * @returns boolean - 是否為管理員
   */
  static isAdmin(currentUser: UserData | null): boolean {
    if (!currentUser) {
      return false;
    }

    return Boolean(currentUser.is_staff) || Boolean(currentUser.is_superuser);
  }

  /**
   * 檢查是否為超級用戶
   * 
   * @param currentUser - 當前登入的用戶
   * @returns boolean - 是否為超級用戶
   */
  static isSuperUser(currentUser: UserData | null): boolean {
    if (!currentUser) {
      return false;
    }

    return Boolean(currentUser.is_superuser);
  }

  /**
   * 檢查是否可以執行管理員操作
   * 
   * @param currentUser - 當前登入的用戶
   * @returns PermissionResult - 權限檢查結果
   */
  static canPerformAdminAction(currentUser: UserData | null): PermissionResult {
    if (!currentUser) {
      return {
        allowed: false,
        reason: '需要登入才能執行管理操作'
      };
    }

    if (!this.isAdmin(currentUser)) {
      return {
        allowed: false,
        reason: '需要管理員權限才能執行此操作'
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * 檢查是否可以互動（點讚、評論等）
   * 
   * @param currentUser - 當前登入的用戶
   * @returns PermissionResult - 權限檢查結果
   * 
   * 互動權限規則：
   * 1. 必須已登入
   * 2. 帳號未被封禁
   */
  static canInteract(currentUser: UserData | null): PermissionResult {
    if (!currentUser) {
      return {
        allowed: false,
        reason: '請先登入'
      };
    }

    // 檢查帳號是否活躍（未被封禁）
    if (!currentUser.is_active) {
      return {
        allowed: false,
        reason: '您的帳號已被暫停，無法進行互動'
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * 檢查是否可以關注/取消關注用戶
   * 
   * @param currentUser - 當前登入的用戶
   * @param targetUserId - 目標用戶 ID
   * @returns PermissionResult - 權限檢查結果
   */
  static canFollowUser(currentUser: UserData | null, targetUserId: string | number): PermissionResult {
    // 基本的互動權限檢查
    const interactResult = this.canInteract(currentUser);
    if (!interactResult.allowed) {
      return interactResult;
    }

    // 不能關注自己
    if (currentUser && String(currentUser.id) === String(targetUserId)) {
      return {
        allowed: false,
        reason: '不能關注自己'
      };
    }

    return {
      allowed: true
    };
  }

  /**
   * 批量權限檢查 - 檢查多個權限
   * 
   * @param currentUser - 當前登入的用戶
   * @param resource - 要檢查的資源
   * @param permissions - 要檢查的權限列表
   * @returns Record<string, PermissionResult> - 各項權限的檢查結果
   * 
   * 使用範例：
   * ```typescript
   * const permissions = PermissionChecker.checkMultiple(user, post, ['edit', 'delete', 'view']);
   * if (permissions.edit.allowed) {
   *   // 顯示編輯按鈕
   * }
   * ```
   */
  static checkMultiple(
    currentUser: UserData | null,
    resource: Resource,
    permissions: Array<'edit' | 'delete' | 'view'>
  ): Record<string, PermissionResult> {
    const results: Record<string, PermissionResult> = {};

    permissions.forEach(permission => {
      switch (permission) {
        case 'edit':
          results.edit = this.canEdit(currentUser, resource);
          break;
        case 'delete':
          results.delete = this.canDelete(currentUser, resource);
          break;
        case 'view':
          results.view = this.canView(currentUser, resource);
          break;
      }
    });

    return results;
  }
}

/**
 * 便捷的權限檢查 Hook（用於 React 組件）
 * 
 * @param currentUser - 當前用戶
 * @param resource - 資源對象
 * @returns 權限檢查方法的對象
 * 
 * 使用範例：
 * ```typescript
 * const { canEdit, canDelete, canView } = usePermissions(user, post);
 * ```
 */
export function usePermissions(currentUser: UserData | null, resource?: Resource) {
  return {
    // 基本權限檢查
    canEdit: resource ? PermissionChecker.canEdit(currentUser, resource) : { allowed: false, reason: '沒有資源' },
    canDelete: resource ? PermissionChecker.canDelete(currentUser, resource) : { allowed: false, reason: '沒有資源' },
    canView: resource ? PermissionChecker.canView(currentUser, resource) : { allowed: false, reason: '沒有資源' },
    
    // 用戶身份檢查
    isOwner: resource ? PermissionChecker.isOwner(currentUser, resource) : false,
    isAdmin: PermissionChecker.isAdmin(currentUser),
    isSuperUser: PermissionChecker.isSuperUser(currentUser),
    
    // 互動權限
    canInteract: PermissionChecker.canInteract(currentUser),
    canPerformAdminAction: PermissionChecker.canPerformAdminAction(currentUser),
  };
}

/**
 * 便捷的權限檢查函數 - 提供簡化的 API
 */
export const isAuthor = PermissionChecker.isAuthor;
export const isOwner = PermissionChecker.isOwner;
export const canEdit = PermissionChecker.canEdit;
export const canDelete = PermissionChecker.canDelete;
export const canView = PermissionChecker.canView;
export const isAdmin = PermissionChecker.isAdmin;
export const isSuperUser = PermissionChecker.isSuperUser;
export const canInteract = PermissionChecker.canInteract;
export const canFollowUser = PermissionChecker.canFollowUser;

// 導出類型
export type {
  ResourceWithAuthor,
  ResourceWithUserId,
  ResourceWithCreator,
  Resource,
  PermissionResult
}; 