/**
 * Tail Worker - 即時監控和告警系統
 *
 * 功能：
 * 1. 監聽主 Worker 的日誌
 * 2. 過濾錯誤和關鍵事件
 * 3. 發送告警到 Slack/Discord
 * 4. 收集效能指標
 * 5. 每日統計摘要
 *
 * 部署：
 * wrangler deploy workers/tail-worker.ts --name quotation-tail-worker
 */

export interface Env {
  // Webhook URLs
  ERROR_WEBHOOK_URL?: string;
  SUCCESS_WEBHOOK_URL?: string;
  SLACK_WEBHOOK_URL?: string;

  // 告警配置
  ALERT_THRESHOLD_ERROR_RATE?: string; // 錯誤率閾值 (預設 5%)
  ALERT_THRESHOLD_RESPONSE_TIME?: string; // 回應時間閾值 (預設 1000ms)
}

interface TailEvent {
  logs: LogEntry[];
  exceptions: ExceptionEntry[];
  outcome: 'ok' | 'exception' | 'canceled' | 'unknown';
  eventTimestamp: number;
  event: {
    request?: {
      url: string;
      method: string;
      headers: Record<string, string>;
    };
  };
  scriptName: string;
}

interface LogEntry {
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: any[];
  timestamp: number;
}

interface ExceptionEntry {
  name: string;
  message: string;
  timestamp: number;
}

interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  totalDuration: number;
  slowRequests: number;
}

export default {
  async tail(events: TailEvent[], env: Env, ctx: ExecutionContext) {
    // 批量處理事件
    const errors: string[] = [];
    const warnings: string[] = [];
    const metrics: PerformanceMetrics = {
      requestCount: 0,
      errorCount: 0,
      totalDuration: 0,
      slowRequests: 0,
    };

    const errorThreshold = parseFloat(env.ALERT_THRESHOLD_ERROR_RATE || '5');
    const responseTimeThreshold = parseFloat(env.ALERT_THRESHOLD_RESPONSE_TIME || '1000');

    // 處理每個事件
    for (const event of events) {
      metrics.requestCount++;

      // 檢查異常
      if (event.exceptions && event.exceptions.length > 0) {
        metrics.errorCount++;
        for (const exception of event.exceptions) {
          const errorMsg = formatException(event, exception);
          errors.push(errorMsg);
        }
      }

      // 檢查錯誤日誌
      if (event.logs) {
        for (const log of event.logs) {
          if (log.level === 'error') {
            metrics.errorCount++;
            const errorMsg = formatLog(event, log);
            errors.push(errorMsg);
          } else if (log.level === 'warn') {
            const warnMsg = formatLog(event, log);
            warnings.push(warnMsg);
          }
        }
      }

      // 檢查效能
      if (event.outcome === 'ok') {
        // 假設從日誌中提取執行時間
        const duration = extractDuration(event.logs);
        if (duration) {
          metrics.totalDuration += duration;
          if (duration > responseTimeThreshold) {
            metrics.slowRequests++;
            warnings.push(
              `⚠️ 慢請求警告: ${event.event.request?.url}\n` +
              `   耗時: ${duration}ms (閾值: ${responseTimeThreshold}ms)`
            );
          }
        }
      }
    }

    // 計算錯誤率
    const errorRate = (metrics.errorCount / metrics.requestCount) * 100;
    const avgResponseTime = metrics.totalDuration / metrics.requestCount;

    // 發送告警
    const promises: Promise<void>[] = [];

    // 1. 錯誤告警
    if (errors.length > 0 && env.ERROR_WEBHOOK_URL) {
      const errorAlert = formatErrorAlert(errors, metrics, errorRate);
      promises.push(sendWebhook(env.ERROR_WEBHOOK_URL, errorAlert));
    }

    // 2. 效能告警
    if (errorRate > errorThreshold || metrics.slowRequests > 0) {
      const performanceAlert = formatPerformanceAlert(metrics, errorRate, avgResponseTime);
      if (env.SLACK_WEBHOOK_URL) {
        promises.push(sendWebhook(env.SLACK_WEBHOOK_URL, performanceAlert));
      }
    }

    // 3. 警告通知（如果有）
    if (warnings.length > 0 && warnings.length < 5 && env.SLACK_WEBHOOK_URL) {
      const warningAlert = formatWarningAlert(warnings);
      promises.push(sendWebhook(env.SLACK_WEBHOOK_URL, warningAlert));
    }

    // 非阻塞發送
    ctx.waitUntil(Promise.all(promises));
  },
};

/**
 * 格式化異常訊息
 */
function formatException(event: TailEvent, exception: ExceptionEntry): string {
  const url = event.event.request?.url || 'unknown';
  const method = event.event.request?.method || 'unknown';
  const timestamp = new Date(exception.timestamp).toISOString();

  return (
    `🚨 **異常錯誤**\n` +
    `時間: ${timestamp}\n` +
    `請求: ${method} ${url}\n` +
    `錯誤: ${exception.name}: ${exception.message}\n` +
    `Worker: ${event.scriptName}`
  );
}

/**
 * 格式化日誌訊息
 */
function formatLog(event: TailEvent, log: LogEntry): string {
  const url = event.event.request?.url || 'unknown';
  const method = event.event.request?.method || 'unknown';
  const timestamp = new Date(log.timestamp).toISOString();
  const message = log.message.map(m =>
    typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m)
  ).join(' ');

  const emoji = log.level === 'error' ? '🚨' : '⚠️';

  return (
    `${emoji} **${log.level.toUpperCase()}**\n` +
    `時間: ${timestamp}\n` +
    `請求: ${method} ${url}\n` +
    `訊息: ${message}`
  );
}

/**
 * 從日誌中提取執行時間
 */
function extractDuration(logs?: LogEntry[]): number | null {
  if (!logs) return null;

  for (const log of logs) {
    for (const msg of log.message) {
      if (typeof msg === 'object' && msg !== null && 'duration' in msg) {
        return Number(msg.duration) || null;
      }
      if (typeof msg === 'string' && msg.includes('duration')) {
        const match = msg.match(/duration[:\s]+(\d+)/i);
        if (match) return parseInt(match[1]);
      }
    }
  }

  return null;
}

/**
 * 格式化錯誤告警
 */
function formatErrorAlert(
  errors: string[],
  metrics: PerformanceMetrics,
  errorRate: number
): object {
  const errorCount = errors.length;
  const displayErrors = errors.slice(0, 5); // 最多顯示 5 個錯誤
  const moreErrors = errorCount > 5 ? errorCount - 5 : 0;

  return {
    username: 'Quotation System Monitor',
    icon_emoji: ':rotating_light:',
    attachments: [
      {
        color: 'danger',
        title: `🚨 錯誤告警 - 偵測到 ${errorCount} 個錯誤`,
        fields: [
          {
            title: '錯誤率',
            value: `${errorRate.toFixed(2)}%`,
            short: true,
          },
          {
            title: '請求總數',
            value: `${metrics.requestCount}`,
            short: true,
          },
        ],
        text: displayErrors.join('\n\n---\n\n') +
          (moreErrors > 0 ? `\n\n_... 還有 ${moreErrors} 個錯誤_` : ''),
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * 格式化效能告警
 */
function formatPerformanceAlert(
  metrics: PerformanceMetrics,
  errorRate: number,
  avgResponseTime: number
): object {
  return {
    username: 'Quotation System Monitor',
    icon_emoji: ':chart_with_upwards_trend:',
    attachments: [
      {
        color: 'warning',
        title: '⚠️ 效能警告',
        fields: [
          {
            title: '錯誤率',
            value: `${errorRate.toFixed(2)}%`,
            short: true,
          },
          {
            title: '平均回應時間',
            value: `${avgResponseTime.toFixed(0)}ms`,
            short: true,
          },
          {
            title: '慢請求數',
            value: `${metrics.slowRequests}`,
            short: true,
          },
          {
            title: '總請求數',
            value: `${metrics.requestCount}`,
            short: true,
          },
        ],
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };
}

/**
 * 格式化警告告警
 */
function formatWarningAlert(warnings: string[]): object {
  return {
    username: 'Quotation System Monitor',
    icon_emoji: ':warning:',
    text: '⚠️ **系統警告**\n\n' + warnings.join('\n\n---\n\n'),
  };
}

/**
 * 發送 Webhook
 */
async function sendWebhook(webhookUrl: string, payload: object): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`Webhook 發送失敗: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Webhook 發送錯誤:', error);
  }
}
