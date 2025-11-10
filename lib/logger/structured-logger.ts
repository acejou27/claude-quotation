/**
 * 結構化日誌工具
 *
 * 提供統一的日誌格式，方便 Tail Worker 解析和告警
 *
 * 使用範例：
 * ```ts
 * import { logger } from '@/lib/logger/structured-logger'
 *
 * // 基本日誌
 * logger.info('用戶登入成功', { userId: '123', email: 'user@example.com' })
 *
 * // 錯誤日誌
 * logger.error('資料庫查詢失敗', { error: err.message, query: sql })
 *
 * // API 請求日誌
 * logger.api({
 *   method: 'GET',
 *   path: '/api/quotations',
 *   statusCode: 200,
 *   duration: 150,
 *   userId: '123'
 * })
 * ```
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogMetadata {
  [key: string]: any;
}

export interface ApiLogMetadata {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  userId?: string;
  error?: string;
  [key: string]: any;
}

/**
 * 格式化日誌輸出
 */
function formatLog(level: LogLevel, message: string, metadata?: LogMetadata): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...metadata,
  };

  // 根據 level 使用不同的 console 方法
  switch (level) {
    case 'error':
      console.error(JSON.stringify(logEntry));
      break;
    case 'warn':
      console.warn(JSON.stringify(logEntry));
      break;
    case 'debug':
      if (process.env.NODE_ENV === 'development') {
        console.debug(JSON.stringify(logEntry));
      }
      break;
    default:
      console.log(JSON.stringify(logEntry));
  }
}

/**
 * 結構化日誌器
 */
export const logger = {
  /**
   * Debug 日誌（僅開發環境）
   */
  debug(message: string, metadata?: LogMetadata): void {
    formatLog('debug', message, metadata);
  },

  /**
   * Info 日誌
   */
  info(message: string, metadata?: LogMetadata): void {
    formatLog('info', message, metadata);
  },

  /**
   * Warning 日誌
   */
  warn(message: string, metadata?: LogMetadata): void {
    formatLog('warn', message, metadata);
  },

  /**
   * Error 日誌
   */
  error(message: string, metadata?: LogMetadata): void {
    formatLog('error', message, {
      ...metadata,
      severity: 'high',
    });
  },

  /**
   * API 請求日誌
   */
  api(metadata: ApiLogMetadata): void {
    const { method, path, statusCode, duration, error } = metadata;

    const level: LogLevel = statusCode >= 500 ? 'error'
      : statusCode >= 400 ? 'warn'
      : 'info';

    const message = error
      ? `API 錯誤: ${method} ${path}`
      : `API 請求: ${method} ${path}`;

    formatLog(level, message, {
      type: 'api',
      ...metadata,
    });
  },

  /**
   * 資料庫操作日誌
   */
  database(operation: string, metadata?: LogMetadata): void {
    formatLog('info', `資料庫操作: ${operation}`, {
      type: 'database',
      ...metadata,
    });
  },

  /**
   * 認證日誌
   */
  auth(event: 'login' | 'logout' | 'failed', metadata?: LogMetadata): void {
    const message = {
      login: '用戶登入',
      logout: '用戶登出',
      failed: '認證失敗',
    }[event];

    formatLog(event === 'failed' ? 'warn' : 'info', message, {
      type: 'auth',
      event,
      ...metadata,
    });
  },

  /**
   * 業務事件日誌
   */
  business(event: string, metadata?: LogMetadata): void {
    formatLog('info', `業務事件: ${event}`, {
      type: 'business',
      event,
      ...metadata,
    });
  },

  /**
   * 效能日誌
   */
  performance(operation: string, duration: number, metadata?: LogMetadata): void {
    const level: LogLevel = duration > 1000 ? 'warn' : 'info';

    formatLog(level, `效能: ${operation}`, {
      type: 'performance',
      duration,
      slow: duration > 1000,
      ...metadata,
    });
  },

  /**
   * Cron 任務日誌
   */
  cron(taskName: string, status: 'start' | 'success' | 'failed', metadata?: LogMetadata): void {
    const level: LogLevel = status === 'failed' ? 'error' : 'info';
    const message = `Cron 任務: ${taskName} - ${status}`;

    formatLog(level, message, {
      type: 'cron',
      taskName,
      status,
      ...metadata,
    });
  },
};

/**
 * API 請求計時器
 *
 * 使用範例：
 * ```ts
 * const timer = createTimer('GET', '/api/quotations')
 * try {
 *   const result = await fetchQuotations()
 *   timer.success(200, { count: result.length })
 * } catch (error) {
 *   timer.error(500, error)
 * }
 * ```
 */
export function createTimer(method: string, path: string, userId?: string) {
  const startTime = Date.now();

  return {
    success(statusCode: number, metadata?: LogMetadata): void {
      const duration = Date.now() - startTime;
      logger.api({
        method,
        path,
        statusCode,
        duration,
        userId,
        ...metadata,
      });
    },

    error(statusCode: number, error: any, metadata?: LogMetadata): void {
      const duration = Date.now() - startTime;
      logger.api({
        method,
        path,
        statusCode,
        duration,
        userId,
        error: error?.message || String(error),
        ...metadata,
      });
    },
  };
}

/**
 * 非同步操作包裝器（自動記錄錯誤）
 *
 * 使用範例：
 * ```ts
 * const result = await withLogging(
 *   '查詢報價單',
 *   async () => await db.query('SELECT * FROM quotations'),
 *   { userId: '123' }
 * )
 * ```
 */
export async function withLogging<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: LogMetadata
): Promise<T> {
  const startTime = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - startTime;

    logger.performance(operation, duration, {
      success: true,
      ...metadata,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    logger.error(`操作失敗: ${operation}`, {
      duration,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...metadata,
    });

    throw error;
  }
}

/**
 * 建立領域專用 logger
 *
 * 使用範例：
 * ```ts
 * const quotationLogger = createDomainLogger('quotation')
 * quotationLogger.info('建立報價單', { quotationId: '123' })
 * // 輸出: { ..., domain: 'quotation', message: '建立報價單', quotationId: '123' }
 * ```
 */
export function createDomainLogger(domain: string) {
  return {
    debug(message: string, metadata?: LogMetadata): void {
      logger.debug(message, { domain, ...metadata });
    },
    info(message: string, metadata?: LogMetadata): void {
      logger.info(message, { domain, ...metadata });
    },
    warn(message: string, metadata?: LogMetadata): void {
      logger.warn(message, { domain, ...metadata });
    },
    error(message: string, metadata?: LogMetadata): void {
      logger.error(message, { domain, ...metadata });
    },
  };
}
