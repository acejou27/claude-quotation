# 🧪 測試指南 | Testing Guide

本文檔說明如何執行 Supabase 資料庫和功能測試。

---

## 📋 目錄

1. [測試前準備](#測試前準備)
2. [連接測試](#1-連接測試)
3. [認證測試](#2-認證測試)
4. [CRUD 測試](#3-crud-測試)
5. [常見問題](#常見問題)

---

## 測試前準備

### 1. 確認環境變數

確認 `.env.local` 包含正確的 Supabase 設定：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. 確認 Migration 完成

執行驗證腳本確認所有 19 個表都已建立：

```sql
-- 在 Supabase Dashboard > SQL Editor 執行
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

應該看到 **19+ 個表**（包含系統預設表）。

---

## 1. 連接測試

測試 Supabase 客戶端連接和資料庫可用性。

### 執行測試

```bash
npx tsx scripts/test-supabase-connection.ts
```

### 預期結果

```
✅ 環境變數完整
✅ 客戶端建立成功
✅ 資料庫連接正常
✅ 19/19 個表存在
⚠️ RLS 阻擋匿名查詢（預期行為）

成功率: 80%
```

### 如果失敗

- 檢查 `.env.local` 設定
- 確認 Supabase 專案狀態
- 確認 Migration 已完成

---

## 2. 認證測試

測試使用者註冊、登入、登出流程。

### 選項 A: 使用 Mailinator（推薦）

免費的測試 Email 服務，無需註冊。

#### 步驟

1. **執行測試腳本**

```bash
npx tsx scripts/test-auth-with-mailinator.ts
```

2. **查看測試 Email**

腳本會顯示 Email 地址，例如：
```
Email: quotation-test-1234567890@mailinator.com
```

3. **前往 Mailinator 收信**（如需確認）

- 網址：https://www.mailinator.com/
- 輸入：`quotation-test-1234567890`（去掉 @mailinator.com）
- 點擊確認郵件中的連結

4. **預期結果**

如果 **Email 確認已關閉**：
```
✅ 註冊成功
✅ 登入成功
✅ 取得使用者資訊成功
✅ 登出成功
```

如果 **需要 Email 確認**：
```
✅ 註冊成功
⚠️ Email 需要確認
```

### 選項 B: 手動建立測試使用者

適合快速測試，無需處理 Email 確認。

#### 步驟

1. **前往 Supabase Dashboard**
   - Authentication > Users
   - 點擊 **"Add user"**

2. **建立測試使用者**
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - ✅ 勾選 **"Auto Confirm User"**

3. **測試登入**

```typescript
// 可以用這個帳號執行 CRUD 測試
npx tsx scripts/test-crud-operations.ts test@example.com TestPassword123!
```

### 選項 C: 關閉 Email 確認（開發環境）

**⚠️ 僅限開發環境使用**

1. 前往 **Supabase Dashboard > Authentication > Settings**
2. 找到 **Email Auth** 區塊
3. 關閉 **"Enable email confirmations"**
4. 儲存變更

完成後，可以使用任何 Email 格式註冊測試帳號。

---

## 3. CRUD 測試

測試客戶和產品的建立、讀取、更新、刪除功能。

### 前提條件

需要一個已確認的測試帳號。可使用：
- Mailinator 建立的帳號
- Dashboard 手動建立的帳號

### 執行測試

```bash
npx tsx scripts/test-crud-operations.ts <email> <password>
```

### 範例

```bash
# 使用 Mailinator 帳號
npx tsx scripts/test-crud-operations.ts quotation-test-123@mailinator.com TestPassword123!

# 或使用手動建立的帳號
npx tsx scripts/test-crud-operations.ts test@example.com TestPassword123!
```

### 測試內容

1. **使用者登入** - 驗證認證功能
2. **客戶 CRUD**
   - ✅ 建立客戶
   - ✅ 讀取客戶
   - ✅ 更新客戶
   - ✅ 刪除客戶
3. **產品 CRUD**
   - ✅ 建立產品
   - ✅ 讀取產品
   - ✅ 更新產品
   - ✅ 刪除產品

### 預期結果

```
📊 CRUD 測試結果摘要
總測試數: 9
✅ 通過: 9
❌ 失敗: 0
成功率: 100.0%

🎉 所有 CRUD 測試通過！資料庫操作功能正常！
```

### 測試資料

測試會建立以下資料：

**客戶資料**
- 公司名稱：測試客戶公司
- Email: customer@test.com
- 稅籍編號：12345678

**產品資料**
- 名稱：高效能伺服器
- SKU: SRV-HP-001
- 單價：NT$ 150,000

**清理**：測試結束後會自動刪除所有測試資料。

---

## 常見問題

### Q1: Email 格式無效

**問題**：`Email address "xxx@example.com" is invalid`

**解決方案**：
1. 使用 Mailinator（推薦）
2. 在 Dashboard 手動建立使用者
3. 關閉 Email 確認要求

### Q2: Email 未確認

**問題**：`Email not confirmed`

**解決方案**：
1. 前往 Mailinator 點擊確認連結
2. 在 Dashboard 手動確認使用者
3. 建立新使用者時勾選 "Auto Confirm User"

### Q3: RLS 阻擋查詢

**問題**：`permission denied for table xxx`

**說明**：這是 **正常行為**。RLS（Row Level Security）策略確保：
- 匿名使用者無法存取資料
- 使用者只能存取自己建立的資料

**解決方案**：確保已登入後再進行 CRUD 操作。

### Q4: 連接失敗

**問題**：無法連接到 Supabase

**檢查項目**：
1. `.env.local` 設定正確
2. Supabase 專案狀態正常
3. 網路連線正常
4. API Key 未過期

---

## 測試流程建議

### 第一次測試

```bash
# 1. 測試連接
npx tsx scripts/test-supabase-connection.ts

# 2. 建立測試帳號（選擇一種方式）
#    方式 A: 使用 Mailinator
npx tsx scripts/test-auth-with-mailinator.ts

#    方式 B: 在 Dashboard 手動建立
#    (Authentication > Users > Add user)

# 3. 測試 CRUD
npx tsx scripts/test-crud-operations.ts <email> <password>
```

### 日常開發測試

有了測試帳號後，只需要執行 CRUD 測試：

```bash
npx tsx scripts/test-crud-operations.ts test@example.com TestPassword123!
```

---

## 下一步

完成基本測試後，可以繼續：

1. ✅ 測試 RBAC 權限系統
2. ✅ 測試報價單建立流程
3. ✅ 整合前端認證功能
4. ✅ 建立更多測試案例

---

## 相關文檔

- [認證設定指南](./AUTH_SETUP_GUIDE.md) - 詳細的認證系統設定說明
- [Supabase 官方文檔](https://supabase.com/docs) - Supabase 完整文檔
- [RLS 策略說明](https://supabase.com/docs/guides/auth/row-level-security) - RLS 安全策略

---

**測試愉快！** 🎉

如有問題，請參考：
- `docs/AUTH_SETUP_GUIDE.md` - 認證問題
- `ISSUELOG.md` - 已知問題和解決方案
- Supabase Dashboard Logs - 即時錯誤訊息
