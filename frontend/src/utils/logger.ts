/**
 * 統一的日誌系統
 * 用於替代散落的 console.log，提供一致的日誌格式和等級控制
 */

// 日誌等級枚舉
export enum LogLevel {
  DEBUG = 0,    // 調試信息
  INFO = 1,     // 一般信息
  WARN = 2,     // 警告信息
  ERROR = 3,    // 錯誤信息
  CRITICAL = 4  // 嚴重錯誤
}

// 日誌配置介面
interface LoggerConfig {
  level: LogLevel;              // 日誌等級
  enableConsole: boolean;       // 是否輸出到控制台
  enableRemote: boolean;        // 是否發送到遠端（未來功能）
  prefix: string;              // 日誌前綴
  enableTimestamp: boolean;     // 是否顯示時間戳
}

// 日誌類別配置
const logCategories = {
  auth: '🔐',        // 認證相關
  api: '🌐',         // API 調用
  websocket: '🔌',   // WebSocket 相關
  ui: '🎨',          // UI 相關
  store: '📦',       // 狀態管理
  error: '❌',       // 錯誤
  success: '✅',     // 成功
  info: 'ℹ️',        // 一般信息
  warning: '⚠️',     // 警告
  debug: '🐛',       // 調試
  performance: '⚡',  // 性能相關
  user: '👤',        // 用戶操作
  chat: '💬',        // 聊天相關
  post: '📝',        // 貼文相關
  notification: '🔔', // 通知相關
  portfolio: '🎨'    // 作品集相關
} as const;

type LogCategory = keyof typeof logCategories;

// 日誌器類
class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  constructor(config?: Partial<LoggerConfig>) {
    // 默認配置
    this.config = {
      level: LogLevel.DEBUG, // 預設為 DEBUG，可以在應用初始化時根據環境設定
      enableConsole: true,
      enableRemote: false,
      prefix: 'EngineerHub',
      enableTimestamp: true,
      ...config
    };
  }

  // 獲取單例實例
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  // 獲取級別顏色
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '#9CA3AF';  // gray-400
      case LogLevel.INFO:
        return '#3B82F6';  // blue-500
      case LogLevel.WARN:
        return '#F59E0B';  // amber-500
      case LogLevel.ERROR:
        return '#EF4444';  // red-500
      case LogLevel.CRITICAL:
        return '#991B1B';  // red-800
      default:
        return '#6B7280';  // gray-500
    }
  }

  // 獲取控制台方法
  private getConsoleMethod(level: LogLevel): keyof Console {
    switch (level) {
      case LogLevel.DEBUG:
        return 'log';
      case LogLevel.INFO:
        return 'info';
      case LogLevel.WARN:
        return 'warn';
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        return 'error';
      default:
        return 'log';
    }
  }

  // 統一的日誌方法
  private log(
    logLevel: LogLevel,
    category: LogCategory,
    message: string,
    payload?: any
  ): void {
    // 檢查日誌級別是否應該輸出
    if (logLevel < this.config.level) {
      return;
    }

    // 構建日誌信息
    const timestamp = new Date().toLocaleTimeString();
    const categoryIcon = logCategories[category];
    const levelColor = this.getLevelColor(logLevel);
    const levelName = Object.keys(LogLevel).find(
      key => LogLevel[key as keyof typeof LogLevel] === logLevel
    ) || 'UNKNOWN';

    // 格式化輸出
    const formattedMessage = `[${timestamp}] ${categoryIcon} [${levelName}] ${message}`;

    // 根據級別輸出到不同的控制台方法
    const consoleMethod = this.getConsoleMethod(logLevel);
    
    if (payload !== undefined) {
      (console[consoleMethod] as any)(
        `%c${formattedMessage}`,
        `color: ${levelColor}; font-weight: bold;`,
        payload
      );
    } else {
      (console[consoleMethod] as any)(
        `%c${formattedMessage}`,
        `color: ${levelColor}; font-weight: bold;`
      );
    }
  }

  // 公開方法 - 調試
  debug(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  // 公開方法 - 信息
  info(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  // 公開方法 - 警告
  warn(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  // 公開方法 - 錯誤
  error(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  // 公開方法 - 嚴重錯誤
  critical(category: LogCategory, message: string, data?: any): void {
    this.log(LogLevel.CRITICAL, category, message, data);
  }

  // 性能測量
  time(label: string): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.time(`${this.config.prefix} - ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.config.level <= LogLevel.DEBUG) {
      console.timeEnd(`${this.config.prefix} - ${label}`);
    }
  }

  // 設置日誌等級
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  // 獲取當前日誌等級
  getLevel(): LogLevel {
    return this.config.level;
  }
}

// 導出單例實例
export const logger = Logger.getInstance();

// 導出類型
export type { LogCategory };