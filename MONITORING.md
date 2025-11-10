# 📊 Cloudflare Workers 監控和日誌系統

本文檔說明如何使用即時監控、結構化日誌和告警系統來管理報價系統的 Cloudflare Workers 部署。

---

## 📋 目錄

1. [監控方案概述](#監控方案概述)
2. [Tail Worker 即時監控](#tail-worker-即時監控)
3. [結構化日誌系統](#結構化日誌系統)
4. [基礎日誌查看](#基礎日誌查看)
5. [告警設置](#告警設置)
6. [使用指南](#使用指南)
7. [疑難排解](#疑難排解)

---

## 🎯 監控方案概述

本專案採用**分階段監控策略**，從免費的基礎監控到進階的即時告警：

### 監控架構

```
┌──────────────────────────────────┐
│   Quotation Worker (主應用)      │
│   - Next.js 應用                 │
│   - 結構化日誌輸出               │
└──────────┬───────────────────────┘
           │ 即時日誌流
           ▼
┌──────────────────────────────────┐
│   Tail Worker (監控系統)         │
│   - 過濾錯誤和警告               │
│   - 效能分析                     │
│   - 聚合統計                     │
└──────────┬───────────────────────┘
           │
           ├────► Slack (錯誤告警)
           ├────► Discord (狀態通知)
           └────► 效能統計摘要
```

### 三層監控方案

| 方案 | 成本 | 功能 | 適用場景 |
|------|------|------|---------|
| **Workers Logs** | 免費 | 基礎日誌查看 (24h) | 開發除錯、快速排查 |
| **Tail Worker** ⭐ | 免費 | 即時告警、自訂處理 | 生產環境監控 (推薦) |
| **Logpush** | $5/月起 | 長期存儲、BI 分析 | 企業合規、深度分析 |

**本專案實作：Workers Logs + Tail Worker（完全免費）**

---

## 🚨 Tail Worker 即時監控

### 功能特色

✅ **即時錯誤告警** - 錯誤發生立即發送到 Slack/Discord
✅ **效能監控** - 監控回應時間和慢請求
✅ **錯誤率分析** - 自動計算並告警錯誤率過高
✅ **批量處理** - 智慧聚合多個事件
✅ **可配置閾值** - 自訂告警條件
✅ **零成本** - 免費方案即可使用

### 檔案結構

```
workers/
└── tail-worker.ts          # Tail Worker 主程式

wrangler.tail.jsonc         # Tail Worker 配置
lib/logger/
└── structured-logger.ts    # 結構化日誌工具
```

### 告警類型

#### 1. **錯誤告警**（紅色）
當主 Worker 發生異常或錯誤時：

```
🚨 錯誤告警 - 偵測到 3 個錯誤

錯誤率: 15.00%
請求總數: 20

---

🚨 異常錯誤
時間: 2025-11-10T12:34:56.789Z
請求: GET /api/quotations/123
錯誤: TypeError: Cannot read property 'id' of undefined
Worker: quotation-system
```

#### 2. **效能警告**（黃色）
當錯誤率或回應時間超過閾值時：

```
⚠️ 效能警告

錯誤率: 6.50%
平均回應時間: 850ms
慢請求數: 3
總請求數: 50
```

#### 3. **慢請求警告**
當單一請求超過閾值（預設 1000ms）：

```
⚠️ 慢請求警告: /api/quotations/search
   耗時: 1350ms (閾值: 1000ms)
```

### 配置選項

在 `wrangler.tail.jsonc` 中配置：

```jsonc
{
  "vars": {
    "ALERT_THRESHOLD_ERROR_RATE": "5",      // 錯誤率閾值（5%）
    "ALERT_THRESHOLD_RESPONSE_TIME": "1000" // 回應時間閾值（1000ms）
  }
}
```

### 部署 Tail Worker

#### 方法 1：自動部署（推薦）

通過 GitHub Actions 自動部署：

```bash
# Push 代碼即可自動部署主 Worker 和 Tail Worker
git push origin main
```

#### 方法 2：手動部署

```bash
# 1. 設置 Webhook URLs（首次必須）
echo "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" | \
  wrangler secret put SLACK_WEBHOOK_URL --config wrangler.tail.jsonc

echo "https://hooks.slack.com/services/YOUR/ERROR/WEBHOOK" | \
  wrangler secret put ERROR_WEBHOOK_URL --config wrangler.tail.jsonc

# 2. 部署 Tail Worker
pnpm run deploy:tail

# 或使用 wrangler
wrangler deploy --config wrangler.tail.jsonc
```

#### 方法 3：一鍵部署所有 Workers

```bash
pnpm run deploy:all
```

---

## 📝 結構化日誌系統

### 為什麼需要結構化日誌？

傳統日誌：
```javascript
console.log('User login failed:', email)  // ❌ 難以解析
```

結構化日誌：
```javascript
logger.auth('failed', { email, reason: 'invalid_password' })  // ✅ 易於解析和告警
```

### 使用結構化 Logger

導入 logger：

```typescript
import { logger, createTimer, withLogging } from '@/lib/logger/structured-logger'
```

#### 基本日誌

```typescript
// Info 日誌
logger.info('用戶登入成功', { userId: '123', email: 'user@example.com' })

// Warning 日誌
logger.warn('API 回應緩慢', { duration: 1200, endpoint: '/api/quotations' })

// Error 日誌
logger.error('資料庫查詢失敗', {
  error: err.message,
  query: sql,
  table: 'quotations'
})
```

#### API 請求日誌

```typescript
// 自動記錄 API 請求
logger.api({
  method: 'GET',
  path: '/api/quotations',
  statusCode: 200,
  duration: 150,
  userId: '123',
  count: 25
})

// 錯誤請求
logger.api({
  method: 'POST',
  path: '/api/quotations',
  statusCode: 500,
  duration: 350,
  userId: '123',
  error: 'Database connection failed'
})
```

#### 使用計時器

```typescript
// Next.js API Route 範例
export async function GET(request: Request) {
  const timer = createTimer('GET', '/api/quotations', userId)

  try {
    const quotations = await fetchQuotations()

    timer.success(200, { count: quotations.length })

    return Response.json(quotations)
  } catch (error) {
    timer.error(500, error)

    return Response.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
```

#### 非同步操作包裝

```typescript
// 自動記錄錯誤和執行時間
const quotations = await withLogging(
  '查詢報價單',
  async () => await db.query('SELECT * FROM quotations WHERE user_id = $1', [userId]),
  { userId }
)
```

#### 業務事件日誌

```typescript
// 重要業務事件
logger.business('建立報價單', {
  quotationId: '123',
  customerId: '456',
  amount: 10000,
  currency: 'TWD'
})

logger.business('報價單已發送', {
  quotationId: '123',
  recipientEmail: 'customer@example.com',
  method: 'email'
})
```

#### Cron 任務日誌

```typescript
// 匯率同步範例
logger.cron('匯率同步', 'start')

try {
  const rates = await fetchExchangeRates()
  await saveRates(rates)

  logger.cron('匯率同步', 'success', { count: rates.length })
} catch (error) {
  logger.cron('匯率同步', 'failed', { error: error.message })
}
```

#### 領域專用 Logger

```typescript
// 建立專屬 logger
const quotationLogger = createDomainLogger('quotation')

quotationLogger.info('建立報價單', { quotationId: '123' })
quotationLogger.error('報價單建立失敗', { error: err.message })

// 輸出包含 domain 欄位：
// { timestamp: "...", level: "info", domain: "quotation", message: "建立報價單", quotationId: "123" }
```

### 日誌格式

所有日誌都是 JSON 格式，方便 Tail Worker 解析：

```json
{
  "timestamp": "2025-11-10T12:34:56.789Z",
  "level": "error",
  "message": "資料庫查詢失敗",
  "type": "database",
  "error": "Connection timeout",
  "query": "SELECT * FROM quotations",
  "severity": "high"
}
```

---

## 🔍 基礎日誌查看

### 使用 wrangler tail（即時查看）

#### 查看主 Worker 日誌

```bash
# 即時日誌（格式化輸出）
pnpm run logs

# 或
wrangler tail quotation-system --format pretty

# JSON 格式（適合解析）
pnpm run logs:json

# 只顯示錯誤
wrangler tail quotation-system --status error

# 過濾特定路徑
wrangler tail quotation-system --header "User-Agent=*Chrome*"
```

#### 查看 Tail Worker 日誌

```bash
# 查看監控系統本身的日誌
pnpm run logs:tail
```

### 使用 Dashboard

1. 前往 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Workers & Pages → quotation-system
3. Logs 標籤
4. 即時查看最近 24 小時的日誌

### 日誌保留時間

- **免費方案**：保留 24 小時
- **付費方案**：保留 30 天

---

## 🔔 告警設置

### 設置 Slack Webhook

1. 前往 Slack Workspace → Apps → Incoming Webhooks
2. 點擊 "Add to Slack"
3. 選擇頻道（例如 `#alerts`）
4. 複製 Webhook URL

5. 設置到 Cloudflare Workers：

```bash
# 方法 1：通過 wrangler
echo "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" | \
  wrangler secret put SLACK_WEBHOOK_URL --config wrangler.tail.jsonc

# 方法 2：通過 GitHub Secrets（推薦）
# 在 GitHub Repository Settings → Secrets and variables → Actions
# 新增 SLACK_WEBHOOK_URL
```

### 設置 Discord Webhook

1. 前往 Discord Server Settings → Integrations → Webhooks
2. 點擊 "New Webhook"
3. 設置名稱和頻道
4. 複製 Webhook URL

5. 設置到 Cloudflare：

```bash
echo "https://discord.com/api/webhooks/YOUR/WEBHOOK" | \
  wrangler secret put SLACK_WEBHOOK_URL --config wrangler.tail.jsonc
```

### 設置多個告警頻道

```bash
# 錯誤告警（發送到專門的錯誤頻道）
echo "https://hooks.slack.com/services/YOUR/ERROR/CHANNEL" | \
  wrangler secret put ERROR_WEBHOOK_URL --config wrangler.tail.jsonc

# 成功通知（發送到一般通知頻道）
echo "https://hooks.slack.com/services/YOUR/SUCCESS/CHANNEL" | \
  wrangler secret put SUCCESS_WEBHOOK_URL --config wrangler.tail.jsonc

# 效能警告（發送到效能監控頻道）
echo "https://hooks.slack.com/services/YOUR/PERFORMANCE/CHANNEL" | \
  wrangler secret put SLACK_WEBHOOK_URL --config wrangler.tail.jsonc
```

### 告警範例

#### Slack 錯誤告警

![Error Alert](https://via.placeholder.com/600x200/ff0000/ffffff?text=Error+Alert+Example)

```
🚨 錯誤告警 - 偵測到 5 個錯誤

錯誤率: 10.00%
請求總數: 50

🚨 異常錯誤
時間: 2025-11-10T12:34:56.789Z
請求: POST /api/quotations
錯誤: ValidationError: Invalid customer ID
Worker: quotation-system

---

🚨 ERROR
時間: 2025-11-10T12:35:12.456Z
請求: GET /api/quotations/999
訊息: Quotation not found
```

---

## 📖 使用指南

### 快速開始

#### 1. 在代碼中使用結構化日誌

更新 API Route (`app/api/quotations/route.ts`)：

```typescript
import { logger, createTimer } from '@/lib/logger/structured-logger'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const timer = createTimer('GET', '/api/quotations')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      timer.error(401, 'Unauthorized')
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 查詢報價單
    const quotations = await db.query(
      'SELECT * FROM quotations WHERE user_id = $1',
      [user.id]
    )

    // 記錄業務事件
    logger.business('查詢報價單', {
      userId: user.id,
      count: quotations.rows.length
    })

    timer.success(200, { count: quotations.rows.length })

    return Response.json(quotations.rows)
  } catch (error) {
    logger.error('查詢報價單失敗', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })

    timer.error(500, error)

    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
```

#### 2. 部署 Tail Worker

```bash
# 設置 Slack Webhook
echo "YOUR_SLACK_WEBHOOK_URL" | \
  wrangler secret put SLACK_WEBHOOK_URL --config wrangler.tail.jsonc

# 部署
pnpm run deploy:tail
```

#### 3. 測試告警

觸發錯誤來測試告警系統：

```bash
# 故意訪問不存在的報價單
curl https://quotation-system.acejou27.workers.dev/api/quotations/invalid

# 查看 Slack 是否收到告警
```

#### 4. 即時監控

```bash
# 開啟終端機查看即時日誌
pnpm run logs

# 在另一個終端機測試 API
curl https://quotation-system.acejou27.workers.dev/api/quotations
```

### 最佳實踐

#### ✅ 應該做的

1. **在關鍵路徑使用計時器**
   ```typescript
   const timer = createTimer('POST', '/api/quotations', userId)
   ```

2. **記錄業務事件**
   ```typescript
   logger.business('報價單已發送', { quotationId, email })
   ```

3. **使用結構化元資料**
   ```typescript
   logger.error('支付失敗', { paymentId, amount, currency, reason })
   ```

4. **在 Cron 任務中記錄開始和結束**
   ```typescript
   logger.cron('匯率同步', 'start')
   // ... 執行任務
   logger.cron('匯率同步', 'success', { count })
   ```

#### ❌ 不應該做的

1. **不要在循環中記錄每個項目**
   ```typescript
   // ❌ 錯誤
   for (const item of items) {
     logger.info('處理項目', { item })
   }

   // ✅ 正確
   logger.info('批量處理項目', { count: items.length })
   ```

2. **不要記錄敏感資訊**
   ```typescript
   // ❌ 錯誤
   logger.info('用戶登入', { password: '123456' })

   // ✅ 正確
   logger.auth('login', { userId, email })
   ```

3. **不要使用普通 console.log**
   ```typescript
   // ❌ 錯誤
   console.log('Something happened', value)

   // ✅ 正確
   logger.info('Something happened', { value })
   ```

---

## 🐛 疑難排解

### 問題 1：Tail Worker 沒有收到日誌

**症狀**：部署成功但 Slack 沒有收到告警

**解決方案**：

```bash
# 1. 確認 Tail Worker 已部署
wrangler list | grep tail

# 2. 確認 Tail Consumer 已設置
cat wrangler.jsonc | grep -A 3 tail_consumers

# 3. 手動添加 Tail Consumer（如果缺少）
wrangler tail quotation-system --format json | \
  wrangler tail quotation-tail-worker

# 4. 確認 Webhook URL 已設置
wrangler secret list --config wrangler.tail.jsonc
```

### 問題 2：Webhook 發送失敗

**錯誤訊息**：
```
Webhook 發送失敗: 404 Not Found
```

**解決方案**：

```bash
# 1. 測試 Webhook URL
curl -X POST YOUR_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"測試訊息"}'

# 2. 重新設置 Webhook
echo "CORRECT_WEBHOOK_URL" | \
  wrangler secret put SLACK_WEBHOOK_URL --config wrangler.tail.jsonc

# 3. 重新部署
pnpm run deploy:tail
```

### 問題 3：日誌格式不正確

**症狀**：Tail Worker 無法解析日誌

**解決方案**：

確保使用結構化 logger：

```typescript
// ✅ 正確
import { logger } from '@/lib/logger/structured-logger'
logger.info('訊息', { data })

// ❌ 錯誤
console.log('訊息', data)
```

### 問題 4：告警過多

**症狀**：收到太多告警訊息

**解決方案**：

調整閾值：

```bash
# 編輯 wrangler.tail.jsonc
{
  "vars": {
    "ALERT_THRESHOLD_ERROR_RATE": "10",     // 從 5% 調整到 10%
    "ALERT_THRESHOLD_RESPONSE_TIME": "2000" // 從 1000ms 調整到 2000ms
  }
}

# 重新部署
pnpm run deploy:tail
```

或在 Tail Worker 中添加過濾邏輯 (`workers/tail-worker.ts:50-60`)。

### 問題 5：無法查看即時日誌

**錯誤訊息**：
```
Error: Worker not found
```

**解決方案**：

```bash
# 1. 確認 Worker 名稱
wrangler list

# 2. 使用正確的名稱
wrangler tail YOUR_ACTUAL_WORKER_NAME

# 3. 確認已登入
wrangler whoami
```

---

## 📊 監控儀表板（未來擴展）

如果需要更進階的監控，可以考慮：

### 選項 1：Grafana + Logpush

```bash
# 1. 啟用 Logpush (需要付費方案)
wrangler logpush create \
  --destination-conf "https://your-grafana-endpoint" \
  --dataset workers_trace_events

# 2. 在 Grafana 設置儀表板
```

### 選項 2：Datadog 整合

```bash
# 在 Tail Worker 中發送到 Datadog
fetch('https://http-intake.logs.datadoghq.com/v1/input/' + API_KEY, {
  method: 'POST',
  body: JSON.stringify(logs)
})
```

### 選項 3：自建監控面板

使用 Cloudflare Workers KV 存儲統計資料，建立自訂儀表板。

---

## 🎯 總結

### 監控清單

- [x] 基礎日誌查看（Workers Logs）
- [x] 結構化日誌系統
- [x] Tail Worker 即時監控
- [x] Slack/Discord 告警
- [x] 錯誤率監控
- [x] 效能監控
- [x] Cron 任務監控
- [ ] 長期日誌存儲（未來）
- [ ] 監控儀表板（未來）

### 下一步

1. 在代碼中整合結構化日誌
2. 部署 Tail Worker
3. 設置 Slack/Discord Webhook
4. 測試告警系統
5. 調整閾值和過濾條件

---

## 📚 相關資源

- [Cloudflare Workers Logs 文檔](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
- [Tail Workers 文檔](https://developers.cloudflare.com/workers/observability/logs/tail-workers/)
- [Logpush 文檔](https://developers.cloudflare.com/workers/observability/logs/logpush/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [Discord Webhooks](https://discord.com/developers/docs/resources/webhook)

---

**最後更新**：2025-11-10
**維護者**：Claude Code
**版本**：1.0.0
