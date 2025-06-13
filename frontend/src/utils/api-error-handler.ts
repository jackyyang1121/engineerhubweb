/**
 * API 錯誤處理工具類
 * 
 * 功能：統一處理所有 API 調用的錯誤，解決專案中 29+ 個重複的錯誤處理邏輯
 * 
 * 設計原則：
 * - Narrowly focused: 專職負責錯誤處理邏輯
 * - Flexible: 支援不同的錯誤類型和上下文
 * - Loosely coupled: 通過類型系統確保錯誤處理的一致性
 */

// 定義 API 錯誤的類型結構，確保類型安全
interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      message?: string;
      detail?: string;
      errors?: Record<string, string[]>;
      [key: string]: unknown;
    };
    headers?: Record<string, string>;
  };
  request?: XMLHttpRequest;
  message?: string;
  code?: string;
}

// 定義用戶友好的錯誤信息類型
interface UserFriendlyError {
  message: string;
  statusCode?: number;
  type: 'auth' | 'permission' | 'validation' | 'network' | 'server' | 'unknown';
}

/**
 * API 錯誤處理器 - 統一處理所有 API 調用的錯誤
 * 
 * 這個類解決了專案中 29+ 個重複的 try-catch 錯誤處理邏輯
 * 將原本分散的錯誤處理統一到單一位置，提高維護性和一致性
 */
export class ApiErrorHandler {
  /**
   * 統一 API 調用包裝器
   * 
   * @param apiCall - 要執行的 API 調用函數
   * @param context - 操作上下文，用於生成友好的錯誤信息
   * @returns Promise<T> - API 調用的結果
   * 
   * 使用範例：
   * ```typescript
   * const userData = await ApiErrorHandler.handleApiCall(
   *   () => api.get(`/users/${userId}/`),
   *   '獲取用戶資料'
   * );
   * ```
   */
  static async handleApiCall<T>(
    apiCall: () => Promise<{ data: T }>, 
    context: string
  ): Promise<T> {
    try {
      // 執行 API 調用
      const response = await apiCall();
      return response.data;
    } catch (error: unknown) {
      // 統一錯誤處理邏輯
      const processedError = this.processError(error as ApiErrorResponse, context);
      
      // 記錄結構化的錯誤信息，便於除錯
      this.logError(processedError, context, error as ApiErrorResponse);
      
      // 拋出用戶友好的錯誤信息
      throw new Error(processedError.message);
    }
  }

  /**
   * 簡化版本 - 直接返回 data 而不是 response
   * 
   * @param apiCall - 直接返回數據的 API 調用
   * @param context - 操作上下文
   * @returns Promise<T> - API 調用的結果
   */
  static async handleDirectApiCall<T>(
    apiCall: () => Promise<T>, 
    context: string
  ): Promise<T> {
    try {
      return await apiCall();
    } catch (error: unknown) {
      const processedError = this.processError(error as ApiErrorResponse, context);
      this.logError(processedError, context, error as ApiErrorResponse);
      throw new Error(processedError.message);
    }
  }

  /**
   * 處理並分類錯誤，生成用戶友好的錯誤信息
   * 
   * @param error - 原始錯誤對象
   * @param context - 操作上下文
   * @returns UserFriendlyError - 處理後的錯誤信息
   * 
   * 根據 HTTP 狀態碼和錯誤內容，將技術錯誤轉換為用戶友好的信息
   */
  private static processError(error: ApiErrorResponse, context: string): UserFriendlyError {
    // 處理網絡錯誤或請求未發送的情況
    if (!error.response) {
      if (error.request) {
        return {
          message: '網絡連接失敗，請檢查您的網絡連接',
          type: 'network'
        };
      } else {
        return {
          message: `${context}失敗：請求配置錯誤`,
          type: 'unknown'
        };
      }
    }

    const status = error.response.status;
    const responseData = error.response.data;

    // 根據 HTTP 狀態碼進行分類處理
    switch (status) {
      case 400:
        return this.handleBadRequestError(responseData, context);
      
      case 401:
        return {
          message: '請先登入或重新登入',
          statusCode: 401,
          type: 'auth'
        };
      
      case 403:
        return {
          message: '沒有權限執行此操作',
          statusCode: 403,
          type: 'permission'
        };
      
      case 404:
        return {
          message: '找不到相關資源，可能已被刪除',
          statusCode: 404,
          type: 'unknown'
        };
      
      case 422:
        return this.handleValidationError(responseData, context);
      
      case 429:
        return {
          message: '操作過於頻繁，請稍後再試',
          statusCode: 429,
          type: 'server'
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: '伺服器暫時無法處理請求，請稍後再試',
          statusCode: status,
          type: 'server'
        };
      
      default:
        return {
          message: responseData?.message || responseData?.detail || `${context}失敗，請稍後再試`,
          statusCode: status,
          type: 'unknown'
        };
    }
  }

  /**
   * 處理 400 錯誤 (Bad Request)
   * 
   * @param responseData - 響應數據
   * @param context - 操作上下文
   * @returns UserFriendlyError - 處理後的錯誤信息
   */
  private static handleBadRequestError(responseData: unknown, context: string): UserFriendlyError {
    // 類型安全的響應數據檢查
    const data = responseData as Record<string, unknown>;
    
    // 檢查是否有具體的錯誤信息
    if (data && typeof data.message === 'string') {
      return {
        message: data.message,
        statusCode: 400,
        type: 'validation'
      };
    }

    if (data && typeof data.detail === 'string') {
      return {
        message: data.detail,
        statusCode: 400,
        type: 'validation'
      };
    }

    // 處理字段驗證錯誤
    if (data && data.errors && typeof data.errors === 'object') {
      const errorMessages = this.extractFieldErrors(data.errors as Record<string, string[]>);
      return {
        message: errorMessages.length > 0 ? errorMessages.join('；') : `${context}：資料格式錯誤`,
        statusCode: 400,
        type: 'validation'
      };
    }

    return {
      message: `${context}：請求資料格式錯誤`,
      statusCode: 400,
      type: 'validation'
    };
  }

  /**
   * 處理 422 錯誤 (驗證失敗)
   * 
   * @param responseData - 響應數據
   * @param context - 操作上下文
   * @returns UserFriendlyError - 處理後的錯誤信息
   */
  private static handleValidationError(responseData: unknown, context: string): UserFriendlyError {
    // 類型安全的響應數據檢查
    const data = responseData as Record<string, unknown>;
    
    if (data && data.errors && typeof data.errors === 'object') {
      const errorMessages = this.extractFieldErrors(data.errors as Record<string, string[]>);
      return {
        message: errorMessages.length > 0 ? errorMessages.join('；') : `${context}：資料驗證失敗`,
        statusCode: 422,
        type: 'validation'
      };
    }

    return {
      message: (data && typeof data.message === 'string' ? data.message : `${context}：資料驗證失敗`),
      statusCode: 422,
      type: 'validation'
    };
  }

  /**
   * 從錯誤響應中提取字段級別的錯誤信息
   * 
   * @param errors - 錯誤對象，通常是 { field: [error1, error2] } 的格式
   * @returns string[] - 用戶友好的錯誤信息數組
   */
  private static extractFieldErrors(errors: Record<string, string[]>): string[] {
    const messages: string[] = [];
    
    // 定義字段名稱映射，將英文字段名轉換為中文
    const fieldNameMap: Record<string, string> = {
      'username': '用戶名',
      'email': '電子郵件',
      'password': '密碼',
      'content': '內容',
      'title': '標題',
      'first_name': '名字',
      'last_name': '姓氏',
      'bio': '個人簡介',
      'code_snippet': '程式碼片段'
    };

    // 遍歷每個字段的錯誤信息
    Object.entries(errors).forEach(([field, fieldErrors]) => {
      const fieldName = fieldNameMap[field] || field;
      
      // 將該字段的所有錯誤信息合併
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        const errorText = fieldErrors.join('，');
        messages.push(`${fieldName}：${errorText}`);
      }
    });

    return messages;
  }

  /**
   * 記錄詳細的錯誤信息，便於開發和除錯
   * 
   * @param processedError - 處理後的錯誤信息
   * @param context - 操作上下文
   * @param originalError - 原始錯誤對象
   */
  private static logError(
    processedError: UserFriendlyError, 
    context: string, 
    originalError: ApiErrorResponse
  ): void {
    // 在開發環境中記錄詳細錯誤信息
    if (import.meta.env.DEV) {
      console.group(`🚫 API 錯誤 - ${context}`);
      console.error('用戶友好信息:', processedError.message);
      console.error('錯誤類型:', processedError.type);
      console.error('HTTP 狀態碼:', processedError.statusCode);
      
      if (originalError.response) {
        console.error('響應狀態:', originalError.response.status);
        console.error('響應數據:', originalError.response.data);
      } else if (originalError.request) {
        console.error('請求對象:', originalError.request);
      } else {
        console.error('錯誤信息:', originalError.message);
      }
      console.groupEnd();
    } else {
      // 在生產環境中只記錄關鍵信息
      console.error(`API 錯誤 [${context}]:`, {
        type: processedError.type,
        status: processedError.statusCode,
        message: processedError.message
      });
    }
  }

  /**
   * 檢查錯誤是否為特定類型
   * 
   * @param error - 錯誤對象
   * @param errorType - 要檢查的錯誤類型
   * @returns boolean - 是否為指定類型的錯誤
   */
  static isErrorType(error: unknown, errorType: 'auth' | 'permission' | 'validation' | 'network' | 'server'): boolean {
    if (!(error instanceof Error)) return false;
    
    // 這裡可以根據錯誤信息來判斷錯誤類型
    // 實際項目中可能需要更精確的判斷邏輯
    const message = error.message.toLowerCase();
    
    switch (errorType) {
      case 'auth':
        return message.includes('登入') || message.includes('驗證');
      case 'permission':
        return message.includes('權限') || message.includes('沒有權限');
      case 'validation':
        return message.includes('格式') || message.includes('驗證');
      case 'network':
        return message.includes('網絡') || message.includes('連接');
      case 'server':
        return message.includes('伺服器') || message.includes('稍後再試');
      default:
        return false;
    }
  }
}

// 將靜態方法綁定到類，以確保 `this` 上下文正確
export const handleApiCall = ApiErrorHandler.handleApiCall.bind(ApiErrorHandler);
export const handleDirectApiCall = ApiErrorHandler.handleDirectApiCall.bind(ApiErrorHandler);
export const isErrorType = ApiErrorHandler.isErrorType; 