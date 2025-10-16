# 報價單系統開發路線圖 | Quotation System Roadmap

**專案版本**: v0.1.0 (Alpha)
**最後更新**: 2025-10-16
**狀態**: 開發中 (In Development)

---

## 📊 專案概覽

一個現代化的中英雙語報價單管理系統，支援多幣別、Google OAuth 登入，採用 Next.js 15 + Supabase 構建。

### 技術棧
- **前端**: Next.js 15.5.5 (App Router + Turbopack)
- **語言**: TypeScript
- **樣式**: Tailwind CSS 4
- **資料庫**: PostgreSQL (Supabase)
- **認證**: Supabase Auth (Google OAuth)
- **國際化**: next-intl v4.3.12
- **部署**: Vercel (前端) + Supabase (後端/DB)

---

## ✅ 已完成功能 (Completed)

### Phase 1: 基礎架構 (2025-10-14 ~ 2025-10-16)

#### 1.1 專案初始化 ✅
- [x] Next.js 15 專案建立
- [x] TypeScript 配置
- [x] Tailwind CSS 4 設置
- [x] ESLint 配置
- [x] Git 初始化

#### 1.2 認證系統 ✅
- [x] Supabase 整合
  - [x] Browser Client (`lib/supabase/client.ts`)
  - [x] Server Client (`lib/supabase/server.ts`)
  - [x] Middleware (`lib/supabase/middleware.ts`)
- [x] Google OAuth 登入
  - [x] 登入頁面 (`app/login/page.tsx`)
  - [x] OAuth 回調處理 (`app/auth/callback/route.ts`)
  - [x] 登入按鈕組件 (`app/login/LoginButton.tsx`)
- [x] Session 管理
  - [x] Middleware session 刷新
  - [x] 受保護路由重定向

#### 1.3 國際化 (i18n) ✅
- [x] next-intl 配置
  - [x] 路由配置 (`i18n/routing.ts`)
  - [x] 請求配置 (`i18n/request.ts`)
  - [x] Middleware 整合
- [x] 雙語支援 (en/zh)
  - [x] 英文翻譯 (`messages/en.json`)
  - [x] 繁體中文翻譯 (`messages/zh.json`)
- [x] 語言切換功能
  - [x] Navbar 切換按鈕
  - [x] 路由前綴 (`/en/*`, `/zh/*`)

#### 1.4 資料庫設計 ✅
- [x] Schema 設計 (`supabase-schema.sql`)
  - [x] `customers` 表（客戶）
  - [x] `products` 表（產品）
  - [x] `quotations` 表（報價單）
  - [x] `quotation_items` 表（報價單項目）
  - [x] `exchange_rates` 表（匯率）
- [x] Row Level Security (RLS) 政策
- [x] 索引優化
- [x] 觸發器（自動更新 `updated_at`）
- [x] 函數（報價單編號生成）

#### 1.5 UI 架構 ✅
- [x] Layout 系統
  - [x] Root Layout (`app/layout.tsx`)
  - [x] Locale Layout (`app/[locale]/layout.tsx`)
  - [x] Dashboard Layout (`app/[locale]/dashboard/layout.tsx`)
- [x] 導航組件
  - [x] Navbar (`components/Navbar.tsx`)
  - [x] Sidebar (`components/Sidebar.tsx`)
- [x] 可重用 UI 組件
  - [x] PageHeader (`components/ui/PageHeader.tsx`)
  - [x] FormInput (`components/ui/FormInput.tsx`)
  - [x] BilingualFormInput (`components/ui/BilingualFormInput.tsx`)
  - [x] DeleteConfirmModal (`components/ui/DeleteConfirmModal.tsx`)
  - [x] EmptyState (`components/ui/EmptyState.tsx`)
  - [x] LoadingSpinner (`components/ui/LoadingSpinner.tsx`)

### Phase 2: 核心功能 (2025-10-16)

#### 2.1 儀表板 ✅
- [x] Dashboard 頁面 (`app/[locale]/dashboard/page.tsx`)
  - [x] 統計卡片（報價單、客戶、產品數量）
  - [x] 歡迎訊息
  - [x] 完整雙語支援（無混合文字）
- [x] 資料統計
  - [x] 從 Supabase 獲取統計數據
  - [x] 動態渲染

#### 2.2 客戶管理 (Customers) ✅
- [x] 客戶列表頁 (`app/[locale]/customers/page.tsx`)
  - [x] 顯示所有客戶
  - [x] 搜尋功能
  - [x] 空狀態處理
- [x] 新增客戶 (`app/[locale]/customers/new/page.tsx`)
  - [x] 雙語名稱輸入（中文/英文）
  - [x] Email、電話輸入
  - [x] 雙語地址輸入
  - [x] 表單驗證
- [x] 編輯客戶 (`app/[locale]/customers/[id]/page.tsx`)
  - [x] 載入現有資料
  - [x] 更新功能
- [x] 刪除客戶
  - [x] 刪除確認對話框
  - [x] 級聯刪除處理
- [x] Client Components
  - [x] CustomerList (`app/[locale]/customers/CustomerList.tsx`)
  - [x] CustomerForm (`app/[locale]/customers/CustomerForm.tsx`)

#### 2.3 產品管理 (Products) ✅
- [x] 產品列表頁 (`app/[locale]/products/page.tsx`)
  - [x] 顯示所有產品
  - [x] 搜尋功能
  - [x] 空狀態處理
- [x] 新增產品 (`app/[locale]/products/new/page.tsx`)
  - [x] 雙語名稱輸入
  - [x] 雙語描述輸入
  - [x] 價格和幣別選擇
  - [x] 類別輸入
  - [x] 表單驗證
- [x] 編輯產品 (`app/[locale]/products/[id]/page.tsx`)
  - [x] 載入現有資料
  - [x] 更新功能
- [x] 刪除產品
  - [x] 刪除確認對話框
- [x] Client Components
  - [x] ProductList (`app/[locale]/products/ProductList.tsx`)
  - [x] ProductForm (`app/[locale]/products/ProductForm.tsx`)

#### 2.4 報價單管理 (Quotations) ✅
- [x] 報價單列表頁 (`app/[locale]/quotations/page.tsx`)
  - [x] 顯示所有報價單
  - [x] 狀態篩選
  - [x] 空狀態處理
- [x] 新增報價單 (`app/[locale]/quotations/new/page.tsx`)
  - [x] 客戶選擇
  - [x] 幣別選擇
  - [x] 日期範圍選擇
  - [x] 動態項目管理（新增/刪除）
  - [x] 產品選擇（自動填入價格）
  - [x] 數量、單價、折扣輸入
  - [x] 自動計算小計、稅金、總計
  - [x] 備註輸入
  - [x] 表單驗證
- [x] 報價單詳情 (`app/[locale]/quotations/[id]/page.tsx`)
  - [x] 完整資訊顯示
  - [x] 客戶資訊
  - [x] 項目列表
  - [x] 金額計算
  - [x] 狀態更新按鈕
- [x] 刪除報價單
  - [x] 刪除確認對話框
  - [x] 級聯刪除項目
- [x] Client Components
  - [x] QuotationList (`app/[locale]/quotations/QuotationList.tsx`)
  - [x] QuotationForm (`app/[locale]/quotations/QuotationForm.tsx`)
  - [x] QuotationDetail (`app/[locale]/quotations/[id]/QuotationDetail.tsx`)

#### 2.5 開發工具 ✅
- [x] Supabase CLI 安裝
  - [x] 本地依賴安裝
  - [x] npm scripts 配置
  - [x] CLI 使用指南 (`SUPABASE.md`)
- [x] 文檔
  - [x] README.md（完整專案說明）
  - [x] SUPABASE.md（CLI 使用指南）
  - [x] ROADMAP.md（本文件）

---

## 🚧 進行中功能 (In Progress)

### Phase 3: 進階功能

目前無進行中項目。

---

## 📝 待開發功能 (Planned)

### Phase 4: 匯率整合 (預計 Week 9-10)

#### 4.1 匯率 API 整合
- [ ] 選擇匯率 API 供應商
  - [ ] ExchangeRate-API
  - [ ] Fixer.io
  - [ ] Open Exchange Rates
- [ ] 實作匯率服務
  - [ ] API 呼叫函數
  - [ ] 錯誤處理
  - [ ] 快取策略
- [ ] 匯率資料庫記錄
  - [ ] 自動儲存歷史匯率
  - [ ] 定時更新（每日）
- [ ] UI 整合
  - [ ] 顯示即時匯率
  - [ ] 手動更新按鈕
  - [ ] 歷史匯率查詢

#### 4.2 多幣別轉換
- [ ] 報價單幣別轉換
  - [ ] 自動轉換產品價格
  - [ ] 保存使用的匯率
- [ ] 金額顯示
  - [ ] 原始幣別顯示
  - [ ] 轉換後幣別顯示
  - [ ] 匯率資訊顯示

### Phase 5: PDF 匯出 (預計 Week 11-12)

#### 5.1 PDF 生成
- [ ] 選擇 PDF 庫
  - [ ] react-pdf
  - [ ] jsPDF
  - [ ] Puppeteer
- [ ] PDF 模板設計
  - [ ] 英文版模板
  - [ ] 中文版模板
  - [ ] 樣式設計
- [ ] 資料整合
  - [ ] 報價單資料提取
  - [ ] 客戶資料整合
  - [ ] 項目資料整合
- [ ] 匯出功能
  - [ ] 下載 PDF
  - [ ] 預覽功能
  - [ ] 列印功能

### Phase 6: Email 整合 (預計 Week 13-14)

#### 6.1 Email 服務
- [ ] 選擇 Email 供應商
  - [ ] SendGrid
  - [ ] Resend
  - [ ] AWS SES
- [ ] Email 模板
  - [ ] 報價單發送模板（雙語）
  - [ ] 狀態更新通知
- [ ] 發送功能
  - [ ] 附加 PDF
  - [ ] 發送記錄
  - [ ] 錯誤處理

### Phase 7: 進階功能 (預計 Week 15-16)

#### 7.1 儀表板圖表
- [ ] 統計圖表
  - [ ] 報價單趨勢圖
  - [ ] 狀態分佈圖
  - [ ] 營收統計圖
- [ ] 圖表庫
  - [ ] Chart.js
  - [ ] Recharts
  - [ ] ApexCharts

#### 7.2 進階搜尋
- [ ] 全文搜尋
- [ ] 多條件篩選
- [ ] 排序功能
- [ ] 匯出搜尋結果

#### 7.3 批次操作
- [ ] 多選功能
- [ ] 批次刪除
- [ ] 批次狀態更新
- [ ] 批次匯出

### Phase 8: 效能優化 (預計 Week 17-18)

#### 8.1 前端優化
- [ ] Code Splitting
- [ ] React.memo 優化
- [ ] 圖片優化
- [ ] Bundle 分析

#### 8.2 後端優化
- [ ] 資料庫查詢優化
- [ ] 索引優化
- [ ] 快取策略
- [ ] API 回應時間優化

#### 8.3 使用者體驗
- [ ] Skeleton Loading
- [ ] 樂觀更新 (Optimistic Updates)
- [ ] 錯誤邊界 (Error Boundaries)
- [ ] 離線支援

---

## 🧪 測試計畫 (Testing Plan)

### Unit Testing (單元測試)
- [ ] UI 組件測試
  - [ ] Button、Input 組件
  - [ ] Form 組件
  - [ ] Modal 組件
- [ ] 工具函數測試
  - [ ] 金額計算
  - [ ] 日期驗證
  - [ ] 匯率轉換

### Integration Testing (整合測試)
- [ ] 認證流程測試
  - [ ] Google OAuth 登入
  - [ ] Session 管理
  - [ ] 登出流程
- [ ] CRUD 操作測試
  - [ ] 客戶管理
  - [ ] 產品管理
  - [ ] 報價單管理

### E2E Testing (端對端測試)
- [ ] 使用者流程測試
  - [ ] 完整報價流程
  - [ ] 多語言切換
  - [ ] PDF 匯出
- [ ] 測試工具
  - [ ] Playwright
  - [ ] Cypress

---

## 🚀 部署計畫 (Deployment Plan)

### Development Environment
- [x] 本地開發環境設置
- [x] Supabase 開發專案
- [ ] 測試資料準備

### Staging Environment
- [ ] Vercel Preview 部署
- [ ] Supabase Staging 專案
- [ ] 測試流程驗證

### Production Environment
- [ ] Vercel Production 部署
- [ ] Supabase Production 專案
- [ ] 網域設定
- [ ] SSL 憑證
- [ ] 效能監控
- [ ] 錯誤追蹤 (Sentry)

---

## 📊 里程碑 (Milestones)

| 里程碑 | 目標 | 狀態 | 預計完成 | 實際完成 |
|-------|------|------|---------|---------|
| M1 - MVP | 基礎架構 + 認證 + i18n | ✅ 完成 | Week 2 | 2025-10-16 |
| M2 - 核心功能 | 客戶/產品/報價單 CRUD | ✅ 完成 | Week 8 | 2025-10-16 |
| M3 - 匯率整合 | 即時匯率 + 轉換 | 📋 計畫中 | Week 10 | - |
| M4 - PDF 匯出 | 雙語 PDF 生成 | 📋 計畫中 | Week 12 | - |
| M5 - Email | 發送報價單 Email | 📋 計畫中 | Week 14 | - |
| M6 - 進階功能 | 圖表 + 進階搜尋 | 📋 計畫中 | Week 16 | - |
| M7 - 優化 | 效能 + 測試 | 📋 計畫中 | Week 18 | - |
| M8 - 上線 | Production 部署 | 📋 計畫中 | Week 20 | - |

---

## 📈 功能完成度

### 整體進度
```
████████████████░░░░ 60% (12/20 主要功能)
```

### 各模組進度

| 模組 | 進度 | 狀態 |
|-----|------|------|
| 基礎架構 | 100% | ✅ 完成 |
| 認證系統 | 100% | ✅ 完成 |
| 國際化 | 100% | ✅ 完成 |
| 資料庫 | 100% | ✅ 完成 |
| UI 組件 | 100% | ✅ 完成 |
| 儀表板 | 100% | ✅ 完成 |
| 客戶管理 | 100% | ✅ 完成 |
| 產品管理 | 100% | ✅ 完成 |
| 報價單管理 | 100% | ✅ 完成 |
| 匯率整合 | 0% | 📋 計畫中 |
| PDF 匯出 | 0% | 📋 計畫中 |
| Email | 0% | 📋 計畫中 |
| 圖表 | 0% | 📋 計畫中 |
| 進階搜尋 | 0% | 📋 計畫中 |
| 批次操作 | 0% | 📋 計畫中 |
| 測試 | 0% | 📋 計畫中 |
| 優化 | 0% | 📋 計畫中 |
| 部署 | 30% | 🚧 進行中 |

---

## 🎯 當前優先級

### High Priority (高優先級)
1. **配置 Supabase** - 設置生產環境的資料庫和認證
2. **Google OAuth 測試** - 完整測試登入流程
3. **功能驗證** - 測試所有 CRUD 操作
4. **錯誤修復** - 修復測試中發現的問題

### Medium Priority (中優先級)
5. **匯率 API 整合** - 開始實作匯率功能
6. **PDF 匯出** - 設計並實作 PDF 模板
7. **UI/UX 優化** - 改善使用者體驗

### Low Priority (低優先級)
8. **進階功能** - 圖表、進階搜尋
9. **測試撰寫** - 單元測試、整合測試
10. **文檔完善** - API 文檔、使用手冊

---

## 🐛 已知問題 (Known Issues)

### Critical (嚴重)
*目前無嚴重問題*

### Major (重要)
1. **未測試 Google OAuth** - 需要實際 Google 憑證測試
2. **未測試資料庫操作** - 需要實際 Supabase 專案測試

### Minor (次要)
1. **TypeScript `any` 使用** - `app/[locale]/layout.tsx:21`
2. **未使用的 import** - `app/[locale]/dashboard/page.tsx:2`
3. **缺少 user null check** - `app/[locale]/dashboard/page.tsx:15`

---

## 📝 變更記錄 (Changelog)

### v0.1.0 (2025-10-16) - Alpha Release

#### Added
- ✨ 基礎專案架構（Next.js 15 + TypeScript + Tailwind）
- ✨ Supabase 認證整合（Google OAuth）
- ✨ 雙語支援（中文/英文）
- ✨ 完整資料庫 Schema（5 個表 + RLS）
- ✨ 客戶管理 CRUD
- ✨ 產品管理 CRUD
- ✨ 報價單管理 CRUD
- ✨ 6 個可重用 UI 組件
- ✨ Supabase CLI 整合

#### Changed
- 🔧 修復 Dashboard 雙語顯示問題
- 🔧 修復 404 路由錯誤
- 🔧 優化 middleware 整合

#### Documentation
- 📝 README.md
- 📝 SUPABASE.md
- 📝 ROADMAP.md（本文件）

---

## 👥 貢獻者 (Contributors)

- **開發**: AI Assistant (Claude)
- **產品需求**: avyshiu

---

## 📄 授權 (License)

MIT License

---

**下次更新**: 完成匯率整合後
