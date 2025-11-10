# 資料庫遷移完整建議書
## Zeabur 清理 + Cloudflare D1 + KV 整合方案

**版本**: 1.0
**日期**: 2025-01-10
**作者**: Claude Code
**狀態**: 深度分析後的最終建議

---

## 📋 執行摘要

### 建議方案
採用 **Supabase Auth + Cloudflare D1 + Cloudflare KV** 三層混合架構：

- **認證層**: Supabase Auth（保留現有實作）
- **資料層**: Cloudflare D1（17 張業務表）
- **快取層**: Cloudflare KV（熱資料加速）

### 核心優勢
1. **成本節省 100%**: 從 $35-45/月 降至 $0/月（完全在免費額度內）
2. **效能提升 40-50%**: API 回應時間從 150-200ms 降至 80-100ms
3. **架構簡化**: 移除 Zeabur，統一在 Cloudflare 平台
4. **可擴展性**: 完全在 Cloudflare Edge，全球低延遲

### 工作量估算
- **總時間**: 40 小時（1-2 週）
- **風險等級**: 中等（可控，有完整回滾機制）
- **優先級**: P0（安全性）+ P1（架構遷移）

---

## 🎯 遷移目標與動機

### 當前問題
1. **多資料庫複雜性**
   - Zeabur PostgreSQL（業務資料）
   - Supabase PostgreSQL（認證 + 部分業務資料）
   - 架構混亂，維護成本高

2. **安全性風險**
   - Zeabur API Token 洩漏在 Git 歷史
   - 資料庫密碼硬編碼在腳本中
   - 需要立即清理

3. **成本問題**
   - 雙資料庫訂閱費用
   - 未充分利用 Cloudflare 免費額度

4. **效能瓶頸**
   - 每次 API 請求都查詢權限（3-5 次資料庫查詢）
   - 匯率查詢重複（每個報價單都需要）
   - 公司設定每次 PDF 生成都要讀取

### 遷移目標
✅ **簡化架構**: 單一資料平台（Cloudflare）
✅ **提升安全**: 清理所有洩漏的密鑰
✅ **降低成本**: 100% 使用免費額度
✅ **優化效能**: KV 快取熱資料
✅ **保持穩定**: 認證系統零改動

---

## 🏗️ 目標架構設計

### 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                      使用者請求                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers (Edge)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Next.js Application (OpenNext)                 │ │
│  │  - API Routes                                               │ │
│  │  - Server-Side Rendering                                    │ │
│  │  - Middleware (認證、權限檢查)                               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Supabase Auth   │  │ Cloudflare D1    │  │ Cloudflare KV    │
│  (認證系統)       │  │ (主資料庫)        │  │ (快取層)          │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ - 使用者認證      │  │ 17 張業務表:     │  │ 熱資料快取:       │
│ - OAuth 整合     │  │ • customers      │  │ • 匯率資料        │
│ - Session 管理   │  │ • products       │  │ • 使用者權限      │
│ - Email 驗證     │  │ • quotations     │  │ • 公司設定        │
│ - 密碼重設       │  │ • companies      │  │ TTL: 1-24 小時   │
│                  │  │ • contracts      │  │                  │
│ 免費: 50K MAU    │  │ • payments       │  │ 免費: 100K 讀取  │
└──────────────────┘  │ • roles/perms    │  └──────────────────┘
                      │ • audit_logs     │
                      │                  │
                      │ 免費: 100K 讀取  │
                      └──────────────────┘
```

### 資料流向

#### 1. 使用者認證流程
```
使用者登入
    ↓
Supabase Auth 驗證
    ↓
返回 JWT Token
    ↓
Workers 驗證 Token
    ↓
允許存取 API
```

#### 2. 權限檢查流程（使用 KV 快取）
```
API 請求
    ↓
檢查 KV: user_permissions:{userId}
    ├─ 命中 → 返回權限（1-2ms）
    └─ 未命中 → 查詢 D1（30ms）
                 ↓
                寫入 KV (TTL: 1小時)
                 ↓
                返回權限
```

#### 3. 報價單查詢流程（使用 KV 快取匯率）
```
查詢報價單
    ↓
從 D1 讀取報價單資料（50ms）
    ↓
查詢匯率: KV 快取
    ├─ 命中 → 返回匯率（1-2ms）
    └─ 未命中 → D1 查詢（50ms）
                 ↓
                寫入 KV (TTL: 24小時)
    ↓
計算總金額（幣別轉換）
    ↓
返回結果
```

---

## 📊 資料表遷移清單

### 需要遷移到 D1 的表（17 張）

#### 核心業務表（5 張）
| 表名 | 資料量估計 | 寫入頻率 | 讀取頻率 | KV 快取 |
|------|-----------|---------|---------|---------|
| `customers` | 100-1000 筆 | 低 | 中 | ❌ |
| `products` | 50-500 筆 | 低 | 高 | 🔸 可選 |
| `quotations` | 500-5000 筆 | 中 | 高 | ❌ |
| `quotation_items` | 2000-20000 筆 | 中 | 高 | ❌ |
| `exchange_rates` | 365 × 100 筆 | 極低（每日） | 極高 | ✅ **必須** |

#### 多公司架構（2 張）
| 表名 | 資料量估計 | 寫入頻率 | 讀取頻率 | KV 快取 |
|------|-----------|---------|---------|---------|
| `companies` | 5-50 筆 | 極低 | 高 | ✅ **推薦** |
| `company_members` | 50-500 筆 | 低 | 中 | ❌ |

#### 權限管理（5 張）
| 表名 | 資料量估計 | 寫入頻率 | 讀取頻率 | KV 快取 |
|------|-----------|---------|---------|---------|
| `roles` | 5-10 筆 | 極低 | 高 | ✅ **推薦** |
| `permissions` | 20-50 筆 | 極低 | 極高 | ✅ **推薦** |
| `role_permissions` | 50-200 筆 | 低 | 極高 | ✅ **推薦** |
| `user_roles` | 50-500 筆 | 低 | 極高 | ✅ **推薦** |
| `user_profiles` | 50-500 筆 | 低 | 高 | ✅ **推薦** |

#### 合約與付款（4 張）
| 表名 | 資料量估計 | 寫入頻率 | 讀取頻率 | KV 快取 |
|------|-----------|---------|---------|---------|
| `customer_contracts` | 100-1000 筆 | 低 | 中 | ❌ |
| `payments` | 500-5000 筆 | 中 | 高 | ❌ |
| `payment_terms` | 200-2000 筆 | 低 | 中 | ❌ |
| `payment_schedules` | 500-5000 筆 | 低 | 中 | ❌ |

#### 審計（1 張）
| 表名 | 資料量估計 | 寫入頻率 | 讀取頻率 | KV 快取 |
|------|-----------|---------|---------|---------|
| `audit_logs` | 10000+ 筆 | 高 | 低 | ❌ |

### 保留在 Supabase 的功能
✅ `auth.users` - 使用者認證
✅ `auth.sessions` - 登入會話
✅ `auth.identities` - OAuth 身份
✅ Email/密碼登入功能
✅ OAuth 整合（Google、GitHub）
✅ 密碼重設流程
✅ Email 驗證流程

---

## 🚀 KV 快取策略詳解

### KV 快取決策矩陣

根據以下標準評估是否使用 KV：

| 評估標準 | 權重 | 說明 |
|---------|------|------|
| 讀寫比例 | ⭐⭐⭐⭐⭐ | 讀取頻繁、寫入少 → 適合 KV |
| 資料量 | ⭐⭐⭐⭐ | 單筆 < 25MB，總量 < 1GB → 適合 |
| 一致性要求 | ⭐⭐⭐⭐⭐ | 可接受最終一致性 → 適合 |
| 查詢複雜度 | ⭐⭐⭐ | 簡單 key-value 查詢 → 適合 |

### 推薦的 KV 快取配置

#### 1️⃣ 匯率資料 ⭐⭐⭐⭐⭐（最高優先級）

**為什麼必須快取？**
- 每個報價單計算都需要查詢匯率（讀取極頻繁）
- 每日更新一次（寫入極少）
- 資料量小（約 100 種幣別對應）
- 允許幾分鐘的延遲

**KV 配置**:
```typescript
// Key 設計
key: `exchange_rate:${fromCurrency}:${toCurrency}:${date}`
// 範例: exchange_rate:USD:TWD:2025-01-10

// Value 範例
value: 31.5

// TTL
expirationTtl: 86400 // 24 小時
```

**效能提升**:
- D1 查詢: ~50ms
- KV 讀取: ~1-2ms
- **提升 25-50 倍**

**快取失效**:
```typescript
// 每日 00:00 同步新匯率時
async function syncExchangeRates() {
  const rates = await fetchLatestRates()

  for (const rate of rates) {
    // 同時寫入 D1 和 KV
    await Promise.all([
      d1.execute('INSERT INTO exchange_rates ...'),
      kv.set(`exchange_rate:${rate.from}:${rate.to}:${date}`, rate.rate, 86400)
    ])
  }
}
```

---

#### 2️⃣ 使用者權限 ⭐⭐⭐⭐⭐（最高優先級）

**為什麼必須快取？**
- 每次 API 請求都要檢查權限（讀取極頻繁）
- 需要 3-5 次 D1 JOIN 查詢（耗時）
- 權限變更不頻繁（寫入少）

**KV 配置**:
```typescript
// Key 設計
key: `user_permissions:${userId}`

// Value 範例
value: {
  userId: 'uuid-xxx',
  roles: ['salesperson'],
  permissions: [
    'read:customers',
    'write:customers',
    'read:quotations',
    'write:quotations'
  ],
  companyId: 'uuid-company',
  updatedAt: '2025-01-10T10:00:00Z'
}

// TTL
expirationTtl: 3600 // 1 小時
```

**效能提升**:
- D1 查詢（3-5 次 JOIN）: ~80-100ms
- KV 讀取: ~1-2ms
- **每次請求節省 80-98ms**

**快取失效**:
```typescript
// 當管理員變更使用者角色時
async function updateUserRole(userId: string, newRoleId: string) {
  // 1. 更新 D1
  await d1.execute('UPDATE user_roles SET role_id = ? WHERE user_id = ?', [newRoleId, userId])

  // 2. 立即刪除 KV 快取
  await kv.delete(`user_permissions:${userId}`)

  // 下次請求會重新從 D1 載入
}
```

---

#### 3️⃣ 公司設定 ⭐⭐⭐⭐（強烈推薦）

**為什麼應該快取？**
- PDF 生成時需要公司 logo、銀行帳戶等（讀取頻繁）
- 公司資訊變更不頻繁（寫入少）

**KV 配置**:
```typescript
// Key 設計
key: `company:${companyId}`

// Value 範例
value: {
  id: 'uuid-company',
  name: { zh: '科技公司', en: 'Tech Company' },
  logoUrl: 'https://storage.../logo.png',
  bankName: '台灣銀行',
  bankAccount: '123-456-7890',
  taxId: '12345678',
  updatedAt: '2025-01-10T10:00:00Z'
}

// TTL
expirationTtl: 7200 // 2 小時
```

**效能提升**:
- D1 查詢: ~30ms
- KV 讀取: ~1-2ms
- **提升 15-30 倍**

---

#### 4️⃣ 產品目錄 ⭐⭐（可選）

**為什麼可選？**
- 建立報價單時需要查詢產品列表（讀取頻繁）
- 但產品價格可能更新（寫入不算少）

**KV 配置**:
```typescript
// Key 設計（按使用者分片）
key: `products:user:${userId}`

// Value 範例
value: [
  {
    id: 'uuid-product-1',
    name: { zh: '產品 A', en: 'Product A' },
    basePrice: 1000,
    baseCurrency: 'TWD'
  },
  // ...
]

// TTL（較短，因為可能更新）
expirationTtl: 1800 // 30 分鐘
```

**注意事項**:
- 產品新增/修改時需要刪除快取
- 產品很多時可能超過 25MB 限制（需分頁快取）

---

### KV 快取實作範例

#### 通用快取模式（Cache-Aside）

```typescript
// lib/cache/kv-wrapper.ts
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // 1. 嘗試從 KV 讀取
  const cached = await env.CACHE.get<T>(key, 'json')

  if (cached) {
    console.log(`KV HIT: ${key}`)
    return cached
  }

  // 2. KV miss，執行查詢函式
  console.log(`KV MISS: ${key}`)
  const data = await fetchFn()

  // 3. 寫入 KV（異步，不阻塞回應）
  await env.CACHE.put(key, JSON.stringify(data), { expirationTtl: ttl })

  return data
}

// 快取失效
export async function invalidateCache(key: string): Promise<void> {
  await env.CACHE.delete(key)
}

// 批次失效（使用 prefix）
export async function invalidateCachePattern(prefix: string): Promise<void> {
  const list = await env.CACHE.list({ prefix })
  await Promise.all(list.keys.map(k => env.CACHE.delete(k.name)))
}
```

#### 實際使用範例

```typescript
// lib/services/exchange-rate-cached.ts
export async function getExchangeRate(
  from: string,
  to: string,
  date: string
): Promise<number> {
  const key = `exchange_rate:${from}:${to}:${date}`

  return getCached(
    key,
    async () => {
      // Fallback: 從 D1 查詢
      const result = await env.DB.prepare(
        'SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND date = ?'
      ).bind(from, to, date).first<{ rate: number }>()

      if (!result) {
        throw new Error(`Exchange rate not found: ${from} -> ${to} on ${date}`)
      }

      return result.rate
    },
    86400 // 24 小時 TTL
  )
}
```

---

## 📈 效能預估與成本分析

### API 回應時間對比

| API 端點 | 現有架構 | D1（無快取） | D1 + KV | 改善幅度 |
|---------|---------|-------------|---------|---------|
| 取得報價單列表 | 180ms | 120ms | 70ms | **61%** |
| 建立報價單 | 220ms | 150ms | 90ms | **59%** |
| 匯率查詢 | 60ms | 50ms | 2ms | **97%** |
| 權限檢查 | 100ms | 80ms | 2ms | **98%** |
| 生成 PDF | 300ms | 250ms | 180ms | **40%** |

**總體改善**: API p95 回應時間從 200ms 降至 **80-100ms**（改善 50%）

---

### 成本對比（假設 100 活躍使用者）

#### 現有架構成本
| 服務 | 用途 | 月費用 |
|------|------|--------|
| Zeabur PostgreSQL | 業務資料 | $15-20 |
| Supabase Pro | 認證 + 資料庫 | $25 |
| **總計** | | **$40-45** |

#### 遷移後成本
| 服務 | 用途 | 月費用 | 免費額度 | 實際用量 |
|------|------|--------|---------|---------|
| Supabase Free | 僅認證 | **$0** | 50,000 MAU | ~100 MAU ✅ |
| Cloudflare D1 | 主資料庫 | **$0** | 100K 讀取/天 | ~10K/天 ✅ |
| Cloudflare KV | 快取層 | **$0** | 100K 讀取/天 | ~15K/天 ✅ |
| Cloudflare Workers | 運算 | **$0** | 100K 請求/天 | ~20K/天 ✅ |
| **總計** | | **$0/月** | | |

**成本節省**: **100%**（$40-45/月 → $0/月）

---

### 免費額度安全邊際分析

#### D1 免費額度
- **讀取**: 100,000 次/天
- **寫入**: 1,000 次/天
- **儲存**: 10 GB

**預估用量**（100 使用者）:
- 讀取: ~10,000 次/天（10% 使用率）✅
- 寫入: ~500 次/天（50% 使用率）✅
- 儲存: ~100 MB（1% 使用率）✅

#### KV 免費額度
- **讀取**: 100,000 次/天
- **寫入**: 1,000 次/天
- **儲存**: 1 GB

**預估用量**:
- 讀取: ~15,000 次/天（15% 使用率）✅
- 寫入: ~100 次/天（10% 使用率）✅
- 儲存: ~5 MB（0.5% 使用率）✅

**結論**: 即使使用者成長 5-10 倍，仍在免費額度內

---

## 🛠️ 遷移執行計畫

### 第一階段：緊急安全處理（1 小時）⚠️

**優先級**: P0（立即執行）

#### 任務清單
- [ ] 檢查 Git 歷史是否包含洩漏的密鑰
  ```bash
  git log -p -S "sk-gunsc3tyolpxb7beylvkwkhexcxqd"
  git log -p -S "kPbdR4g7Apj1m0QT8f63zNve5D9MLx2W"
  ```

- [ ] 如果發現洩漏，立即撤銷密鑰
  - Zeabur Dashboard → API Tokens → Revoke
  - 如有必要，變更資料庫密碼

- [ ] 移除配置檔案中的敏感資料
  - `.mcp.json` - 刪除 ZEABUR_TOKEN
  - `.claude/settings.local.json` - 刪除 ZEABUR_TOKEN
  - `scripts/setup-admin.js` - 移除硬編碼的連接字串

- [ ] 清理 Git 歷史（如果已推送）
  ```bash
  # 使用 BFG Repo-Cleaner
  bfg --delete-files .mcp.json
  bfg --replace-text passwords.txt
  git reflog expire --expire=now --all
  git gc --prune=now --aggressive
  git push --force
  ```

- [ ] 建立 `.env.local.template` 作為範例

---

### 第二階段：Zeabur 完全清理（3 小時）

**優先級**: P1

#### 2.1 刪除 Zeabur 資料庫層（1 小時）

**刪除檔案**:
```bash
rm lib/db/zeabur.ts
rm lib/services/exchange-rate-zeabur.ts
```

**更新引用**（11 個檔案）:
- `app/api/exchange-rates/route.ts`
- `app/api/exchange-rates/sync/route.ts`
- `app/api/cron/exchange-rates/route.ts`
- `app/api/admin/stats/route.ts`
- `app/api/admin/users/route.ts`
- `app/api/admin/companies/route.ts`
- `app/api/company/[id]/members/route.ts`
- `app/auth/callback/route.ts`
- `app/api/admin/companies/[id]/members/route.ts`
- `app/api/quotations/[id]/route.ts`
- `app/api/migrate/contract-file-name/route.ts`

**修改方式**: 暫時改用 Supabase client（過渡期）

#### 2.2 清理腳本和測試（1 小時）

**刪除檔案**:
```bash
rm scripts/setup-zeabur-db.ts
rm scripts/setup-zeabur-db-new.ts
rm scripts/setup-zeabur-for-business.sh
rm scripts/setup-zeabur.sh
rm scripts/check-zeabur-data.sh
```

**更新測試**:
- `tests/unit/exchange-rates.test.ts` - 移除 Zeabur mock
- `tests/setup.ts` - 移除 ZEABUR_POSTGRES_URL

#### 2.3 清理文檔和環境變數（1 小時）

**移動文檔到歷史資料夾**:
```bash
mkdir -p docs/archive/zeabur
mv ZEABUR_SSH_GUIDE.md docs/archive/zeabur/
mv docs/ZEABUR_POSTGRES_SETUP.md docs/archive/zeabur/
mv docs/ZEABUR_MIGRATION_COMPLETE.md docs/archive/zeabur/
mv zeabur-schema.sql docs/archive/zeabur/
```

**更新環境變數範本**:
- `.env.local.example` - 移除 ZEABUR_POSTGRES_URL
- `.env.production.example` - 移除 ZEABUR_POSTGRES_URL

---

### 第三階段：建立 D1 資料庫（10 小時）

**優先級**: P1

#### 3.1 建立 D1 資料庫並轉換 Schema（4 小時）

**建立 D1**:
```bash
npx wrangler d1 create quotation-system-db
```

**轉換 Schema**（PostgreSQL → SQLite）:

建立 `migrations/d1/001_initial_schema.sql`

**主要轉換規則**:
| PostgreSQL | SQLite | 說明 |
|-----------|--------|------|
| `UUID` | `TEXT` | 使用 TEXT 儲存 UUID 字串 |
| `JSONB` | `TEXT` | 序列化為 JSON 字串 |
| `DECIMAL(12,2)` | `REAL` | 浮點數 |
| `TIMESTAMP` | `TEXT` | ISO-8601 格式 |
| `INET` | `TEXT` | IP 位址字串 |
| `REFERENCES auth.users(id)` | 移除 | 改用應用層檢查 |

**範例轉換**:
```sql
-- PostgreSQL
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- SQLite (D1)
CREATE TABLE customers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,  -- JSON 字串
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_customers_user_id ON customers(user_id);
```

**執行 Migration**:
```bash
# 本地測試
npx wrangler d1 execute quotation-system-db --local --file=./migrations/d1/001_initial_schema.sql

# 遠端部署
npx wrangler d1 execute quotation-system-db --remote --file=./migrations/d1/001_initial_schema.sql
```

#### 3.2 建立 D1 客戶端抽象層（2 小時）

**建立 `lib/db/d1-client.ts`**:
```typescript
export interface D1Result<T> {
  results: T[]
  success: boolean
  meta: {
    duration: number
  }
}

export class D1Client {
  constructor(private db: D1Database) {}

  async query<T>(sql: string, params: any[] = []): Promise<T[]> {
    const stmt = this.db.prepare(sql).bind(...params)
    const result = await stmt.all<T>()

    if (!result.success) {
      throw new Error('D1 query failed')
    }

    return result.results
  }

  async queryOne<T>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params)
    return results[0] || null
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    const stmt = this.db.prepare(sql).bind(...params)
    await stmt.run()
  }

  async transaction<T>(fn: (client: D1Client) => Promise<T>): Promise<T> {
    // D1 batch API
    return fn(this)
  }
}

export function getD1Client(): D1Client {
  return new D1Client(env.DB)
}
```

#### 3.3 建立資料存取層（DAL）（4 小時）

**為每個實體建立 DAL**（每個約 30 分鐘）:

1. `lib/dal/customers.ts`
2. `lib/dal/products.ts`
3. `lib/dal/quotations.ts`
4. `lib/dal/companies.ts`
5. `lib/dal/contracts.ts`
6. `lib/dal/payments.ts`
7. `lib/dal/rbac.ts`
8. `lib/dal/exchange-rates.ts`

**範例 DAL** (`lib/dal/customers.ts`):
```typescript
import { D1Client } from '@/lib/db/d1-client'

export interface Customer {
  id: string
  userId: string
  companyId: string | null
  name: { zh: string; en: string }
  email: string
  phone: string | null
  createdAt: string
  updatedAt: string
}

export async function getCustomers(
  client: D1Client,
  userId: string
): Promise<Customer[]> {
  const results = await client.query<Customer>(
    'SELECT * FROM customers WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  )

  return results.map(parseCustomer)
}

export async function getCustomerById(
  client: D1Client,
  id: string,
  userId: string
): Promise<Customer | null> {
  const result = await client.queryOne<Customer>(
    'SELECT * FROM customers WHERE id = ? AND user_id = ?',
    [id, userId]
  )

  return result ? parseCustomer(result) : null
}

export async function createCustomer(
  client: D1Client,
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  userId: string
): Promise<Customer> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  await client.execute(
    `INSERT INTO customers (id, user_id, company_id, name, email, phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, data.companyId, JSON.stringify(data.name), data.email, data.phone, now, now]
  )

  return { ...data, id, userId, createdAt: now, updatedAt: now }
}

// Helper: 解析 JSON 欄位
function parseCustomer(raw: any): Customer {
  return {
    ...raw,
    name: typeof raw.name === 'string' ? JSON.parse(raw.name) : raw.name
  }
}
```

---

### 第四階段：整合 KV 快取層（9 小時）

**優先級**: P2（優化）

#### 4.1 建立 KV Namespace（1 小時）

```bash
# 生產環境
npx wrangler kv:namespace create "CACHE"

# 測試環境
npx wrangler kv:namespace create "CACHE" --preview
```

**更新 `wrangler.jsonc`**:
```json
{
  "name": "quotation-system",
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "quotation-system-db",
      "database_id": "..."
    }
  ],
  "kv_namespaces": [
    {
      "binding": "CACHE",
      "id": "...",
      "preview_id": "..."
    }
  ]
}
```

#### 4.2 建立 KV 快取抽象層（2 小時）

**建立 `lib/cache/kv-cache.ts`**:
```typescript
export interface CacheOptions {
  ttl?: number
  metadata?: Record<string, any>
}

export class KVCache {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json')
    return value as T | null
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const { ttl, metadata } = options

    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
      metadata
    })
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key)
  }

  async deleteMany(keys: string[]): Promise<void> {
    await Promise.all(keys.map(k => this.kv.delete(k)))
  }

  async list(prefix: string): Promise<string[]> {
    const list = await this.kv.list({ prefix })
    return list.keys.map(k => k.name)
  }
}

export function getKVCache(): KVCache {
  return new KVCache(env.CACHE)
}

// 通用快取包裝器
export async function getCached<T>(
  cache: KVCache,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = await cache.get<T>(key)

  if (cached !== null) {
    return cached
  }

  const data = await fetchFn()
  await cache.set(key, data, { ttl })

  return data
}
```

#### 4.3 實作快取服務（6 小時）

**1. 匯率快取** (`lib/services/exchange-rate-cached.ts`):
```typescript
import { D1Client } from '@/lib/db/d1-client'
import { KVCache, getCached } from '@/lib/cache/kv-cache'

export async function getExchangeRate(
  db: D1Client,
  cache: KVCache,
  from: string,
  to: string,
  date: string
): Promise<number> {
  const key = `exchange_rate:${from}:${to}:${date}`

  return getCached(
    cache,
    key,
    async () => {
      const result = await db.queryOne<{ rate: number }>(
        'SELECT rate FROM exchange_rates WHERE from_currency = ? AND to_currency = ? AND date = ?',
        [from, to, date]
      )

      if (!result) {
        throw new Error(`Exchange rate not found: ${from} -> ${to}`)
      }

      return result.rate
    },
    86400 // 24 小時
  )
}

export async function syncExchangeRates(
  db: D1Client,
  cache: KVCache
): Promise<void> {
  const rates = await fetchFromExternalAPI()

  for (const rate of rates) {
    await Promise.all([
      db.execute(
        'INSERT OR REPLACE INTO exchange_rates (from_currency, to_currency, date, rate, source) VALUES (?, ?, ?, ?, ?)',
        [rate.from, rate.to, rate.date, rate.rate, 'API']
      ),
      cache.set(`exchange_rate:${rate.from}:${rate.to}:${rate.date}`, rate.rate, { ttl: 86400 })
    ])
  }
}
```

**2. 權限快取** (`lib/services/rbac-cached.ts`):
```typescript
export async function getUserPermissions(
  db: D1Client,
  cache: KVCache,
  userId: string
): Promise<UserPermissions> {
  const key = `user_permissions:${userId}`

  return getCached(
    cache,
    key,
    async () => {
      const [roles, permissions] = await Promise.all([
        db.query<Role>(`
          SELECT r.* FROM roles r
          JOIN user_roles ur ON r.id = ur.role_id
          WHERE ur.user_id = ?
        `, [userId]),

        db.query<Permission>(`
          SELECT DISTINCT p.* FROM permissions p
          JOIN role_permissions rp ON p.id = rp.permission_id
          JOIN user_roles ur ON rp.role_id = ur.role_id
          WHERE ur.user_id = ?
        `, [userId])
      ])

      return {
        userId,
        roles: roles.map(r => r.name),
        permissions: permissions.map(p => `${p.action}:${p.resource}`),
        updatedAt: new Date().toISOString()
      }
    },
    3600 // 1 小時
  )
}

// 權限更新時失效快取
export async function invalidateUserPermissions(
  cache: KVCache,
  userId: string
): Promise<void> {
  await cache.delete(`user_permissions:${userId}`)
}
```

**3. 公司設定快取** (`lib/services/company-cached.ts`):
```typescript
export async function getCompanyById(
  db: D1Client,
  cache: KVCache,
  companyId: string
): Promise<Company | null> {
  const key = `company:${companyId}`

  return getCached(
    cache,
    key,
    async () => {
      const company = await db.queryOne<Company>(
        'SELECT * FROM companies WHERE id = ?',
        [companyId]
      )

      if (company) {
        return {
          ...company,
          name: JSON.parse(company.name as any),
          address: JSON.parse(company.address as any)
        }
      }

      return null
    },
    7200 // 2 小時
  )
}

export async function updateCompany(
  db: D1Client,
  cache: KVCache,
  companyId: string,
  data: CompanyUpdate
): Promise<void> {
  await db.execute(
    'UPDATE companies SET ... WHERE id = ?',
    [/* ... */, companyId]
  )

  // 立即失效快取
  await cache.delete(`company:${companyId}`)
}
```

---

### 第五階段：更新服務層與 API（7 小時）

#### 5.1 更新服務層（4 小時）

**更新 `lib/services/company.ts`**:
```typescript
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import * as companiesDal from '@/lib/dal/companies'
import * as companyCached from '@/lib/services/company-cached'

export async function getUserCompanies(userId: string) {
  const db = getD1Client()
  return companiesDal.getUserCompanies(db, userId)
}

export async function getCompanyById(companyId: string) {
  const db = getD1Client()
  const cache = getKVCache()
  return companyCached.getCompanyById(db, cache, companyId)
}

// ... 其他函式
```

**同樣更新**:
- `lib/services/rbac.ts`
- `lib/services/contracts.ts`
- `lib/services/analytics.ts`
- `lib/services/payments.ts`

#### 5.2 更新 API 路由（3 小時）

**範例**: `app/api/customers/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { getD1Client } from '@/lib/db/d1-client'
import { getKVCache } from '@/lib/cache/kv-cache'
import * as customersDal from '@/lib/dal/customers'
import { getUserPermissions } from '@/lib/services/rbac-cached'

export async function GET(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const db = getD1Client()
    const cache = getKVCache()

    // 檢查權限（使用 KV 快取）
    const permissions = await getUserPermissions(db, cache, userId)
    if (!permissions.permissions.includes('read:customers')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 查詢客戶（從 D1）
    const customers = await customersDal.getCustomers(db, userId)

    return NextResponse.json({ customers })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireAuth()
    const db = getD1Client()
    const cache = getKVCache()
    const body = await request.json()

    // 權限檢查
    const permissions = await getUserPermissions(db, cache, userId)
    if (!permissions.permissions.includes('write:customers')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 建立客戶
    const customer = await customersDal.createCustomer(db, body, userId)

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

**批次更新所有 API 路由**（35 個檔案）:
- `app/api/customers/**`
- `app/api/products/**`
- `app/api/quotations/**`
- `app/api/companies/**`
- `app/api/contracts/**`
- `app/api/payments/**`
- `app/api/analytics/**`

---

### 第六階段：資料遷移（4 小時）

#### 6.1 從 Supabase 導出資料（1 小時）

```bash
# 導出所有業務表
pg_dump "$SUPABASE_DB_URL" \
  --data-only \
  --table=customers \
  --table=products \
  --table=quotations \
  --table=quotation_items \
  --table=companies \
  --table=company_members \
  --table=roles \
  --table=permissions \
  --table=role_permissions \
  --table=user_roles \
  --table=user_profiles \
  --table=customer_contracts \
  --table=payments \
  --table=payment_terms \
  --table=payment_schedules \
  --table=exchange_rates \
  --table=audit_logs \
  > supabase-data-backup.sql
```

#### 6.2 轉換資料格式（2 小時）

**建立轉換腳本** (`scripts/convert-pg-to-d1.ts`):

```typescript
import * as fs from 'fs'

// 讀取 PostgreSQL dump
const pgDump = fs.readFileSync('supabase-data-backup.sql', 'utf-8')

// 轉換規則
function convertPgToD1(sql: string): string {
  let converted = sql

  // 1. 移除 PostgreSQL 特定語法
  converted = converted.replace(/SET.*?;/g, '')
  converted = converted.replace(/SELECT pg_catalog\..*?;/g, '')

  // 2. 轉換 COPY 為 INSERT
  converted = converted.replace(
    /COPY (\w+) \((.*?)\) FROM stdin;([\s\S]*?)\\./gm,
    (match, table, columns, data) => {
      const rows = data.trim().split('\n')
      return rows.map(row => {
        const values = row.split('\t').map(v => `'${v.replace(/'/g, "''")}'`).join(', ')
        return `INSERT INTO ${table} (${columns}) VALUES (${values});`
      }).join('\n')
    }
  )

  // 3. 處理 JSONB → TEXT
  // (已在資料中，只需確保引號正確)

  // 4. 處理 UUID → TEXT
  // (UUID 字串格式在兩者中相同)

  // 5. 處理 TIMESTAMP → TEXT (ISO-8601)
  // (PostgreSQL 導出的已是 ISO 格式)

  return converted
}

const d1Sql = convertPgToD1(pgDump)
fs.writeFileSync('d1-data-import.sql', d1Sql)
console.log('轉換完成: d1-data-import.sql')
```

**執行轉換**:
```bash
npx tsx scripts/convert-pg-to-d1.ts
```

#### 6.3 導入 D1（1 小時）

```bash
# 先在本地測試
npx wrangler d1 execute quotation-system-db --local --file=./d1-data-import.sql

# 驗證資料
npx wrangler d1 execute quotation-system-db --local --command="SELECT COUNT(*) FROM customers"

# 導入遠端
npx wrangler d1 execute quotation-system-db --remote --file=./d1-data-import.sql
```

**驗證資料完整性**:
```bash
# 比對記錄數
for table in customers products quotations companies; do
  echo "=== $table ==="
  npx wrangler d1 execute quotation-system-db --remote --command="SELECT COUNT(*) FROM $table"
done
```

---

### 第七階段：測試與驗證（6 小時）

#### 7.1 單元測試（2 小時）

**更新測試設定** (`vitest.config.ts`):
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts']
  }
})
```

**建立 D1 Mock** (`tests/mocks/d1.ts`):
```typescript
import { vi } from 'vitest'

export function createD1Mock() {
  const data = new Map<string, any[]>()

  return {
    prepare: vi.fn((sql: string) => ({
      bind: vi.fn((...params: any[]) => ({
        all: vi.fn(async () => ({
          success: true,
          results: data.get('mock') || []
        })),
        first: vi.fn(async () => data.get('mock')?.[0] || null),
        run: vi.fn(async () => ({ success: true }))
      }))
    })),

    // Test helpers
    setMockData: (key: string, value: any[]) => data.set(key, value),
    clearMockData: () => data.clear()
  }
}
```

**測試範例** (`tests/dal/customers.test.ts`):
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { createD1Mock } from '../mocks/d1'
import * as customersDal from '@/lib/dal/customers'

describe('Customers DAL', () => {
  let db: ReturnType<typeof createD1Mock>

  beforeEach(() => {
    db = createD1Mock()
  })

  it('should get customers by user ID', async () => {
    const mockCustomers = [
      { id: '1', userId: 'user1', name: '{"zh":"客戶A"}' }
    ]
    db.setMockData('mock', mockCustomers)

    const result = await customersDal.getCustomers(db as any, 'user1')

    expect(result).toHaveLength(1)
    expect(result[0].name).toEqual({ zh: '客戶A' })
  })
})
```

**執行測試**:
```bash
pnpm test
```

#### 7.2 本地整合測試（2 小時）

```bash
# 啟動本地開發環境（使用 D1 local）
pnpm run dev
```

**測試清單**:
- [ ] 登入/註冊（Supabase Auth）
- [ ] OAuth 登入（Google）
- [ ] 客戶 CRUD
- [ ] 產品 CRUD
- [ ] 報價單 CRUD
- [ ] 權限檢查（應用層）
- [ ] KV 快取命中（檢查 console.log）
- [ ] 匯率查詢（KV 快取）
- [ ] 公司設定（KV 快取）
- [ ] PDF 生成

#### 7.3 部署到測試環境（2 小時）

```bash
# 建置
pnpm run build

# 部署到 Cloudflare（測試）
pnpm run deploy:cf
```

**效能測試**:
```bash
# 測試 API 回應時間
for endpoint in customers products quotations; do
  echo "=== Testing /$endpoint ==="
  time curl -H "Authorization: Bearer $TOKEN" \
    https://quotation-system.your-subdomain.workers.dev/api/$endpoint
done
```

**負載測試** (可選):
```bash
# 使用 Apache Bench
ab -n 1000 -c 10 -H "Authorization: Bearer $TOKEN" \
  https://quotation-system.your-subdomain.workers.dev/api/customers
```

---

### 第八階段：生產部署（2 小時）

#### 8.1 最終檢查（30 分鐘）

**檢查清單**:
- [ ] 所有環境變數已設定
- [ ] D1 資料庫已建立並導入資料
- [ ] KV Namespace 已建立
- [ ] wrangler.jsonc 配置正確
- [ ] next.config.ts 包含 `output: 'standalone'`
- [ ] 所有測試通過
- [ ] 無 TypeScript 錯誤
- [ ] 無 ESLint 錯誤

#### 8.2 部署到生產環境（30 分鐘）

```bash
# 最後一次從 Supabase 導出資料（確保最新）
./scripts/export-and-convert.sh

# 導入到生產 D1
npx wrangler d1 execute quotation-system-db --remote --file=./d1-data-import.sql

# 部署
pnpm run deploy:cf
```

#### 8.3 監控與驗證（1 小時）

**即時監控**:
```bash
# Terminal 1: 日誌監控
pnpm exec wrangler tail quotation-system --format pretty

# Terminal 2: 執行測試請求
curl -X GET https://quotation-system.your-subdomain.workers.dev/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

**驗證清單**:
- [ ] 所有頁面正常載入
- [ ] 登入流程正常
- [ ] API 端點回應正常
- [ ] 無錯誤日誌
- [ ] 回應時間 < 100ms (p95)
- [ ] KV 快取命中率 > 80%

**設定警報** (Cloudflare Dashboard):
- API 錯誤率 > 1%
- D1 查詢延遲 > 500ms
- Workers CPU 時間 > 50ms

---

## 🔄 回滾計畫

### 情境 1：測試階段發現問題

**回滾步驟**:
1. 停止所有對 D1 的操作
2. 切換回 Supabase（修改環境變數）
3. 分析問題，重新規劃
4. 保留 D1 資料庫（不刪除）

**時間**: 10 分鐘

---

### 情境 2：生產環境出現問題

**緊急回滾**（5 分鐘內）:
```bash
# 1. 立即切換環境變數（使用 Cloudflare Dashboard）
# 將 DATABASE_URL 改回 SUPABASE_DB_URL

# 2. 重新部署（使用 Supabase 的程式碼）
git checkout main  # 切回遷移前的分支
pnpm run deploy:cf

# 3. 驗證
curl https://quotation-system.your-subdomain.workers.dev/api/health
```

**資料修復**（如有資料不一致）:
```bash
# 從備份恢復
psql "$SUPABASE_DB_URL" < supabase-data-backup.sql

# 或手動修復特定記錄
```

---

### 情境 3：部分功能異常

**分階段回滾**:
1. 識別問題功能（如：報價單模組）
2. 只回滾該模組的程式碼
3. 其他模組繼續使用 D1
4. 修復後再次遷移

---

## 📊 成功指標與監控

### 關鍵績效指標 (KPI)

| 指標 | 目標值 | 測量方式 |
|------|--------|---------|
| API p95 回應時間 | < 100ms | Cloudflare Analytics |
| KV 快取命中率 | > 80% | 自定義日誌 |
| D1 查詢延遲 | < 50ms (p95) | Cloudflare D1 Dashboard |
| API 錯誤率 | < 0.1% | Workers Analytics |
| 成本節省 | 100% | 帳單比較 |
| 資料遺失 | 0 筆 | 記錄數比對 |

### 監控設定

#### Cloudflare Workers Analytics
- 自動收集請求量、錯誤率、CPU 時間
- 前往: Dashboard → Workers & Pages → Analytics

#### 自定義指標
```typescript
// lib/monitoring/metrics.ts
export async function trackCacheHit(key: string, hit: boolean) {
  // 記錄到 Analytics Engine 或簡單的 D1 表
  await env.DB.prepare(
    'INSERT INTO cache_metrics (key, hit, timestamp) VALUES (?, ?, ?)'
  ).bind(key, hit ? 1 : 0, Date.now()).run()
}
```

#### 日誌查詢
```bash
# 查看即時日誌
wrangler tail quotation-system

# 過濾錯誤
wrangler tail quotation-system | grep ERROR

# 查看特定時間範圍
wrangler tail quotation-system --since 2025-01-10T10:00:00Z
```

---

## 🛡️ 風險評估與緩解

### 技術風險

#### 風險 1: SQLite 功能限制 ⚠️ 中等
**問題**: SQLite 不支援某些 PostgreSQL 功能（如 JSONB 操作符）

**緩解**:
- 在應用層處理 JSON 解析
- 使用 SQLite JSON 函式（`json_extract`）
- 預先測試所有複雜查詢

---

#### 風險 2: D1 並發寫入限制 ⚠️ 低
**問題**: SQLite 寫入鎖定可能造成瓶頸

**緩解**:
- 使用樂觀鎖定（版本號）
- 實作重試機制（指數退避）
- 批次操作使用 D1 batch API

---

#### 風險 3: KV 最終一致性 ⚠️ 中等
**問題**: 寫入後 60 秒才全球同步，可能讀到舊資料

**緩解**:
- 寫入時主動失效快取
- 設定合理的 TTL
- 關鍵資料（如付款）不使用 KV

---

#### 風險 4: 資料遷移錯誤 ⚠️ 高
**問題**: 資料格式轉換可能遺失或損壞資料

**緩解**:
- 完整備份 Supabase 資料
- 多次測試遷移流程
- 逐表驗證記錄數
- 保留 30 天回滾視窗

---

### 業務風險

#### 風險 5: 服務中斷 ⚠️ 中等
**問題**: 遷移過程可能造成短暫停機

**緩解**:
- 選擇低流量時段（週末凌晨）
- 準備回滾計畫（< 5 分鐘）
- 事先通知使用者

---

#### 風險 6: 學習曲線 ⚠️ 低
**問題**: 團隊需要熟悉 D1 和 KV

**緩解**:
- 完整的文檔和範例程式碼
- 統一的抽象層（DAL）
- 程式碼審查和知識分享

---

## 📚 參考資料與最佳實踐

### Cloudflare 官方文檔
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [Workers KV Documentation](https://developers.cloudflare.com/kv/)
- [OpenNext for Cloudflare](https://opennext.js.org/cloudflare)

### SQLite 最佳實踐
- 使用 `WITHOUT ROWID` 優化小表
- 建立適當的索引（user_id, created_at）
- 使用 `PRAGMA` 優化效能
- 定期 VACUUM（D1 自動處理）

### KV 快取模式
- Cache-Aside（最常用）
- Write-Through（一致性高）
- Write-Behind（效能高）

---

## ✅ 總結與建議

### 為什麼採用這個方案？

1. **成本效益最佳**
   - 完全免費（節省 $40-45/月）
   - 無需額外訂閱

2. **效能提升明顯**
   - KV 快取減少 80-98% 查詢延遲
   - API 總體回應時間改善 50%

3. **架構簡化**
   - 單一平台（Cloudflare）
   - 統一的管理介面

4. **風險可控**
   - 保留 Supabase Auth（零改動）
   - 完整回滾機制
   - 分階段執行

5. **可擴展性**
   - 全球邊緣部署
   - 自動擴展

### 執行建議

**第一週**:
- ✅ 清理 Zeabur 安全問題（P0）
- ✅ 建立 D1 資料庫和 Schema
- ✅ 建立 DAL 層

**第二週**:
- ✅ 整合 KV 快取
- ✅ 更新服務層和 API
- ✅ 資料遷移和測試
- ✅ 生產部署

**後續**:
- 監控效能指標 30 天
- 確認穩定後清理 Supabase 業務表
- 持續優化快取策略

### 聯絡支援

如有問題，參考：
- Cloudflare Community: https://community.cloudflare.com/
- Cloudflare Discord: https://discord.gg/cloudflaredev
- 專案 Issue: [GitHub Issues]

---

**文檔版本**: 1.0
**最後更新**: 2025-01-10
**下次審查**: 遷移完成後 30 天
