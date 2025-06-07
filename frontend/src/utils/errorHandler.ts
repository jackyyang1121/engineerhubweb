/**
 * 統一的錯誤處理系統
 * 提供友好的錯誤提示、錯誤追蹤和錯誤恢復機制
 */

import { logger } from './logger';

// 錯誤類型枚舉
export enum ErrorType {
  NETWORK = 'NETWORK',           // 網絡錯誤
  API = 'API',                   // API 錯誤
  AUTH = 'AUTH',                 // 認證錯誤
  VALIDATION = 'VALIDATION',     // 驗證錯誤
  PERMISSION = 'PERMISSION',     // 權限錯誤
  NOT_FOUND = 'NOT_FOUND',       // 資源不存在
  SERVER = 'SERVER',             // 服務器錯誤
  CLIENT = 'CLIENT',             // 客戶端錯誤
  UNKNOWN = 'UNKNOWN'            // 未知錯誤
}

// 錯誤嚴重程度
export enum ErrorSeverity {
  LOW = 'LOW',         // 低：不影響使用
  MEDIUM = 'MEDIUM',   // 中：部分功能受影響
  HIGH = 'HIGH',       // 高：主要功能受影響
  CRITICAL = 'CRITICAL' // 嚴重：系統無法使用
}

// 自定義錯誤類
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly context?: any;
  public readonly timestamp: Date;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    options?: {
      code?: string;
      context?: any;
      userMessage?: string;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.severity = severity;
    this.code = options?.code;
    this.context = options?.context;
    this.timestamp = new Date();
    this.userMessage = options?.userMessage || this.getDefaultUserMessage(type);
  }

  // 獲取默認的用戶友好錯誤訊息
  private getDefaultUserMessage(type: ErrorType): string {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '網絡連接異常，請檢查您的網絡設置',
      [ErrorType.API]: '服務請求失敗，請稍後重試',
      [ErrorType.AUTH]: '認證失敗，請重新登錄',
      [ErrorType.VALIDATION]: '輸入數據有誤，請檢查後重試',
      [ErrorType.PERMISSION]: '您沒有權限執行此操作',
      [ErrorType.NOT_FOUND]: '請求的資源不存在',
      [ErrorType.SERVER]: '服務器錯誤，請稍後重試',
      [ErrorType.CLIENT]: '客戶端錯誤，請刷新頁面重試',
      [ErrorType.UNKNOWN]: '發生未知錯誤，請稍後重試'
    };
    return messages[type];
  }
}

// 錯誤處理器接口
interface ErrorHandler {
  handle(error: Error | AppError): void;
  canHandle(error: Error | AppError): boolean;
}

// 網絡錯誤處理器
class NetworkErrorHandler implements ErrorHandler {
  canHandle(error: Error | AppError): boolean {
    return error instanceof AppError && error.type === ErrorType.NETWORK;
  }

  handle(error: AppError): void {
    logger.error('api', '網絡錯誤', {
      message: error.message,
      code: error.code,
      context: error.context
    });
  }
}

// API 錯誤處理器
class ApiErrorHandler implements ErrorHandler {
  canHandle(error: Error | AppError): boolean {
    return error instanceof AppError && error.type === ErrorType.API;
  }

  handle(error: AppError): void {
    logger.error('api', `API 錯誤: ${error.code || 'UNKNOWN'}`, {
      message: error.message,
      context: error.context
    });
  }
}

// 認證錯誤處理器
class AuthErrorHandler implements ErrorHandler {
  canHandle(error: Error | AppError): boolean {
    return error instanceof AppError && error.type === ErrorType.AUTH;
  }

  handle(error: AppError): void {
    logger.error('auth', '認證錯誤', {
      message: error.message,
      code: error.code
    });
    
    // 如果是 token 過期，嘗試刷新
    if (error.code === 'TOKEN_EXPIRED') {
      // TODO: 觸發 token 刷新邏輯
    }
  }
}

// 錯誤管理器
class ErrorManager {
  private handlers: ErrorHandler[] = [];
  private errorQueue: AppError[] = [];
  private maxQueueSize = 50;

  constructor() {
    // 註冊默認處理器
    this.registerHandler(new NetworkErrorHandler());
    this.registerHandler(new ApiErrorHandler());
    this.registerHandler(new AuthErrorHandler());
  }

  // 註冊錯誤處理器
  registerHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  // 處理錯誤
  handle(error: Error | AppError): void {
    // 將普通錯誤轉換為 AppError
    const appError = error instanceof AppError 
      ? error 
      : new AppError(error.message, ErrorType.UNKNOWN);

    // 記錄錯誤
    this.logError(appError);

    // 添加到錯誤隊列
    this.addToQueue(appError);

    // 找到合適的處理器處理錯誤
    const handler = this.handlers.find(h => h.canHandle(appError));
    if (handler) {
      handler.handle(appError);
    } else {
      // 使用默認處理
      this.defaultHandle(appError);
    }

    // 顯示用戶提示
    this.showUserNotification(appError);
  }

  // 記錄錯誤
  private logError(error: AppError): void {
    const logData = {
      type: error.type,
      severity: error.severity,
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp,
      stack: error.stack
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        logger.critical('error', '嚴重錯誤', logData);
        break;
      case ErrorSeverity.HIGH:
        logger.error('error', '高優先級錯誤', logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn('error', '中等優先級錯誤', logData);
        break;
      case ErrorSeverity.LOW:
        logger.info('error', '低優先級錯誤', logData);
        break;
    }
  }

  // 添加到錯誤隊列
  private addToQueue(error: AppError): void {
    this.errorQueue.push(error);
    
    // 保持隊列大小
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  // 默認錯誤處理
  private defaultHandle(error: AppError): void {
    logger.error('error', '未處理的錯誤', {
      type: error.type,
      message: error.message,
      code: error.code
    });
  }

  // 顯示用戶提示
  private showUserNotification(error: AppError): void {
    // TODO: 整合通知系統，顯示錯誤提示
    // 暫時使用 console.error
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      console.error(`[錯誤] ${error.userMessage}`);
    }
  }

  // 獲取錯誤歷史
  getErrorHistory(): AppError[] {
    return [...this.errorQueue];
  }

  // 清空錯誤歷史
  clearErrorHistory(): void {
    this.errorQueue = [];
  }

  // 獲取錯誤統計
  getErrorStats(): Record<ErrorType, number> {
    const stats: Record<ErrorType, number> = {
      [ErrorType.NETWORK]: 0,
      [ErrorType.API]: 0,
      [ErrorType.AUTH]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.PERMISSION]: 0,
      [ErrorType.NOT_FOUND]: 0,
      [ErrorType.SERVER]: 0,
      [ErrorType.CLIENT]: 0,
      [ErrorType.UNKNOWN]: 0
    };

    this.errorQueue.forEach(error => {
      stats[error.type]++;
    });

    return stats;
  }
}

// 創建單例實例
export const errorManager = new ErrorManager();

// 工具函數：處理 API 錯誤
export function handleApiError(error: any): AppError {
  // 解析不同類型的 API 錯誤
  if (error.response) {
    // 服務器響應錯誤
    const status = error.response.status;
    const data = error.response.data;
    
    let errorType = ErrorType.API;
    let severity = ErrorSeverity.MEDIUM;
    
    // 根據狀態碼判斷錯誤類型
    switch (status) {
      case 401:
        errorType = ErrorType.AUTH;
        severity = ErrorSeverity.HIGH;
        break;
      case 403:
        errorType = ErrorType.PERMISSION;
        break;
      case 404:
        errorType = ErrorType.NOT_FOUND;
        severity = ErrorSeverity.LOW;
        break;
      case 500:
      case 502:
      case 503:
        errorType = ErrorType.SERVER;
        severity = ErrorSeverity.HIGH;
        break;
    }
    
    return new AppError(
      data.message || error.message,
      errorType,
      severity,
      {
        code: data.code || `HTTP_${status}`,
        context: { status, data },
        userMessage: data.userMessage
      }
    );
  } else if (error.request) {
    // 網絡錯誤
    return new AppError(
      '網絡請求失敗',
      ErrorType.NETWORK,
      ErrorSeverity.HIGH,
      {
        code: 'NETWORK_ERROR',
        context: error
      }
    );
  } else {
    // 其他錯誤
    return new AppError(
      error.message || '未知錯誤',
      ErrorType.UNKNOWN,
      ErrorSeverity.MEDIUM,
      {
        context: error
      }
    );
  }
}

// 全局錯誤捕獲
export function setupGlobalErrorHandlers(): void {
  // 捕獲未處理的 Promise 錯誤
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('error', '未處理的 Promise 錯誤', {
      reason: event.reason,
      promise: event.promise
    });
    
    errorManager.handle(new AppError(
      event.reason?.message || '未處理的 Promise 錯誤',
      ErrorType.CLIENT,
      ErrorSeverity.HIGH,
      {
        context: event.reason
      }
    ));
    
    event.preventDefault();
  });

  // 捕獲全局錯誤
  window.addEventListener('error', (event) => {
    logger.error('error', '全局錯誤', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
    
    errorManager.handle(new AppError(
      event.message,
      ErrorType.CLIENT,
      ErrorSeverity.HIGH,
      {
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      }
    ));
    
    event.preventDefault();
  });
}