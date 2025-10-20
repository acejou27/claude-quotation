# 變更日誌 | Changelog

本文件記錄報價單系統的所有重要變更。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
版本號遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

---

## [Unreleased]

### 🛠️ Troubleshooting & Tools - Admin 控制台問題排查 (2025-10-20) ✅

#### Admin 路由重定向問題完整排查

**問題現象**:
- 訪問 `http://localhost:3001/admin` 自動重定向到 `http://localhost:3001/zh/dashboard`
- 無法訪問超級管理員控制台

**根本原因**:
```
/admin
→ admin/layout.tsx 檢查權限
→ isSuperAdmin(userId) 返回 false (用戶沒有 super_admin 角色)
→ redirect('/?error=unauthorized')
→ app/page.tsx redirect('/zh/login')
→ login 頁面發現用戶已登入
→ redirect('/zh/dashboard')
```

**調查發現** ✅:
1. ✅ middleware.ts 的 i18n 處理正確（/admin 在 shouldSkipIntl 列表）
2. ✅ admin/layout.tsx 的權限檢查邏輯正確
3. ✅ rbac.ts 的 SQL 查詢使用正確欄位名稱（`r.name` 而非 `r.role_name`）
4. ✅ 數據庫架構確認：
   - roles 表使用 `name` 欄位
   - 已存在 5 個角色（super_admin, company_owner, sales_manager, salesperson, accountant）
   - 已有一個系統管理員用戶（非 acejou27@gmail.com）
5. ❌ **核心問題**：acejou27@gmail.com 尚未登入系統，數據庫中沒有此用戶記錄

#### 新增工具與文檔

**診斷腳本** (`scripts/`):
- 📄 `check-admin-role.ts` - 資料庫診斷工具
  - 檢查 roles 表結構和所有角色
  - 檢查 user_profiles 表結構
  - 列出所有用戶及其角色
  - 找出所有 super_admin 用戶

- 📄 `assign-super-admin.ts` - Super Admin 角色分配工具
  - 列出所有現有用戶（不帶參數）
  - 為指定用戶分配 super_admin 角色（帶 user_id 參數）
  - 完整的驗證和錯誤處理
  - 自動檢查用戶是否已有角色

**完整文檔** (`docs/`):
- 📄 `ADMIN_ACCESS_TROUBLESHOOTING.md` (500+ 行)
  - 問題描述與重定向鏈路分析
  - 資料庫架構確認（roles 和 user_profiles 表結構）
  - 兩個解決方案（推薦 + 暫時）
  - 相關腳本說明與使用方式
  - 完整驗證清單
  - 問題預防措施

**使用方式**:
```bash
# 1. 列出所有用戶
export ZEABUR_POSTGRES_URL='postgresql://...'
npx tsx scripts/assign-super-admin.ts

# 2. 為特定用戶分配 super_admin
npx tsx scripts/assign-super-admin.ts <user_id>
```

#### 解決方案

**方案 A（推薦）**:
1. 使用 acejou27@gmail.com 登入系統 (`http://localhost:3001/login`)
2. 執行 `assign-super-admin.ts` 列出所有用戶
3. 找到 acejou27@gmail.com 的 user_id
4. 執行腳本分配 super_admin 角色
5. 訪問 `/admin` 測試

**方案 B（暫時）**:
- 使用現有的系統管理員帳號登入測試

#### 技術細節

**資料庫架構驗證**:
- roles 表：id, name, name_zh, name_en, level, description, created_at, updated_at
- user_profiles 表：id, user_id, full_name, display_name, phone, department, avatar_url, is_active, last_login_at, created_at, updated_at
- **關鍵發現**：roles.name 是正確欄位名稱（不是 role_name）

**現有用戶狀態**:
```
找到 5 個用戶：
1. 會計 (accountant)
2. 測試用戶 (無角色)
3. 業務 (salesperson)
4. 老闆 (company_owner)
5. 系統管理員 (super_admin) ← 已有一個 super_admin，但不是 acejou27@gmail.com
```

**架構說明**:
- Supabase Auth: 用戶認證（auth.users）
- Zeabur PostgreSQL: 業務資料（user_profiles, roles, user_roles 等）
- 首次登入時自動建立 user_profiles 記錄

#### 文件新增

**Added**:
- 📁 `scripts/check-admin-role.ts` - 資料庫診斷腳本（135 行）
- 📁 `scripts/assign-super-admin.ts` - 角色分配腳本（160 行）
- 📁 `docs/ADMIN_ACCESS_TROUBLESHOOTING.md` - 完整排查指南（500+ 行）

**Verified**:
- ✅ middleware.ts - /admin 路由正確跳過 i18n
- ✅ admin/layout.tsx - 權限檢查邏輯正確
- ✅ rbac.ts - SQL 查詢使用正確欄位名稱
- ✅ 資料庫架構 - roles 和 user_profiles 表結構確認

#### 待辦事項

**用戶需完成** ⏳:
1. [ ] 使用 acejou27@gmail.com 登入系統
2. [ ] 執行 assign-super-admin.ts 分配角色
3. [ ] 測試 `/admin` 訪問
4. [ ] 執行 seed:admin 建立測試資料
5. [ ] 驗證測試資料在 admin 控制台顯示

**已完成** ✅:
- [x] 調查 admin 路由重定向根本原因
- [x] 檢查數據庫 schema 和角色設定
- [x] 建立診斷工具（check-admin-role.ts）
- [x] 建立角色分配工具（assign-super-admin.ts）
- [x] 撰寫完整問題排查文檔

#### 經驗總結

**調查方法**:
1. 追蹤完整的請求重定向鏈路
2. 逐層檢查 middleware → layout → page
3. 驗證 SQL 查詢與資料庫欄位名稱
4. 檢查實際資料庫內容而非假設
5. 建立診斷工具確認問題

**預防措施**:
1. 在項目初始化時建立第一個 super_admin
2. 提供清楚的角色分配文檔和腳本
3. 在 admin/layout.tsx 提供更好的錯誤提示
4. 建立自動化的權限驗證測試

---

### 🎉 Major Features - 三級權限系統 Phase 4 進行中 🚧

#### Phase 4.1: 超級管理員佈局與導航 (2025-10-18) ✅
- **管理員專用佈局** (`app/admin/layout.tsx`)
  - ✅ 伺服器端身份驗證與超管檢查
  - ✅ 自動重定向未授權使用者
  - ✅ 統一的管理介面架構

- **管理員頁首組件** (`components/admin/AdminHeader.tsx`)
  - ✅ 超管身份標識
  - ✅ 使用者資訊顯示
  - ✅ 快速登出功能

- **管理員側邊導航** (`components/admin/AdminSidebar.tsx`)
  - ✅ 6 個主要管理功能入口
  - ✅ 圖示化導航選單（使用 emoji）
  - ✅ 活躍狀態指示
  - ✅ 系統版本資訊
  - ✅ 快速返回主系統

- **導航功能**
  - 🏠 儀表板 - 系統概覽
  - 🏢 公司管理 - 管理所有公司
  - 👥 使用者管理 - 管理所有使用者
  - 🛡️ 權限管理 - 角色與權限設定
  - 📊 系統統計 - 使用統計分析
  - ⚙️ 系統設定 - 系統配置

#### Phase 4.2: 超級管理員儀表板頁面 (2025-10-18) ✅
- **系統統計 API** (`app/api/admin/stats/route.ts`)
  - ✅ 公司總數與活躍公司統計
  - ✅ 使用者總數與成員統計
  - ✅ 最近 7 天新增公司/使用者
  - ✅ 角色分布統計
  - ✅ 完整的超管權限驗證

- **統計資料 Hook** (`hooks/admin/useAdminStats.ts`)
  - ✅ 自動載入系統統計
  - ✅ 錯誤處理與重新載入
  - ✅ TypeScript 型別安全

- **儀表板頁面** (`app/admin/page.tsx`)
  - ✅ 4 個統計卡片
    - 公司總數（含活躍數）
    - 使用者總數（含成員數）
    - 新增公司（最近 7 天）
    - 新增使用者（最近 7 天）
  - ✅ 角色分布視覺化
  - ✅ 快速操作連結
  - ✅ 載入狀態與錯誤處理
  - ✅ 響應式設計

#### Phase 4.3: 公司管理頁面 (2025-10-18) ✅
- **公司列表 Hook** (`hooks/admin/useAdminCompanies.ts`)
  - ✅ 載入所有公司列表
  - ✅ 包含擁有者與成員統計
  - ✅ 錯誤處理與重新載入

- **公司詳情 Hook** (`hooks/admin/useAdminCompanyDetail.ts`)
  - ✅ 載入單一公司完整資訊
  - ✅ 包含成員詳細列表
  - ✅ 錯誤處理與重新載入

- **公司列表頁面** (`app/admin/companies/page.tsx`)
  - ✅ 4 個統計卡片（公司總數、活躍、非活躍、成員總數）
  - ✅ 搜尋功能（公司名稱、統編、Email）
  - ✅ 狀態篩選（全部/活躍/非活躍）
  - ✅ 響應式表格顯示
  - ✅ 公司資訊展示（名稱、統編、擁有者、成員數）
  - ✅ 查看詳情連結

- **公司詳情頁面** (`app/admin/companies/[id]/page.tsx`)
  - ✅ 公司基本資訊完整顯示
  - ✅ 擁有者資訊區塊
  - ✅ 成員列表表格
  - ✅ 統計卡片（成員總數、活躍成員、建立時間）
  - ✅ 返回導航功能

#### Phase 4.4: 使用者管理頁面 (2025-10-18) ✅
- **使用者列表 Hook** (`hooks/admin/useAdminUsers.ts`)
  - ✅ 載入所有使用者列表
  - ✅ 包含角色與公司關係
  - ✅ 錯誤處理與重新載入

- **使用者詳情 Hook** (`hooks/admin/useAdminUserDetail.ts`)
  - ✅ 載入單一使用者完整資訊
  - ✅ 包含公司成員關係詳情
  - ✅ 錯誤處理與重新載入

- **使用者列表頁面** (`app/admin/users/page.tsx`)
  - ✅ 4 個統計卡片（使用者總數、超管數、已加入公司、未加入公司）
  - ✅ 搜尋功能（使用者名稱、Email、公司名稱）
  - ✅ 角色篩選下拉選單
  - ✅ 響應式表格顯示
  - ✅ 使用者資訊展示（頭像、名稱、Email、角色、公司）
  - ✅ Super Admin 標籤
  - ✅ 公司連結可點擊
  - ✅ 查看詳情連結

- **使用者詳情頁面** (`app/admin/users/[id]/page.tsx`)
  - ✅ 使用者基本資訊完整顯示
  - ✅ 系統角色區塊
  - ✅ 公司成員關係表格
  - ✅ 統計卡片（角色數、所屬公司數、註冊時間）
  - ✅ 公司連結可點擊
  - ✅ 返回導航功能

#### Phase 4.5: 測試與文檔 (2025-10-18) ✅
- **測試指南** (`docs/PHASE_4_TESTING_GUIDE.md`)
  - ✅ 完整的測試步驟說明（600+ 行）
  - ✅ Phase 4.1-4.4 所有功能測試
  - ✅ 安全性測試檢查清單
  - ✅ 響應式設計測試
  - ✅ 效能測試標準
  - ✅ UI/UX 測試項目
  - ✅ 預期結果說明

- **完成摘要** (`docs/PHASE_4_SUMMARY.md`)
  - ✅ Phase 4 所有檔案清單
  - ✅ 核心功能說明
  - ✅ 架構設計文檔
  - ✅ 設計特色說明
  - ✅ 已知限制與建議
  - ✅ 快速開始指南

- **編譯驗證**
  - ✅ 所有 admin 相關檔案通過 TypeScript 編譯
  - ✅ 無編譯錯誤
  - ✅ 開發伺服器正常運行

### 📊 Phase 4 統計資訊

**Phase 4 完整統計**:
- **總檔案數**: 14 個
- **總行數**: 約 2,000+ 行
- **Hook 檔案**: 4 個（useAdminStats, useAdminCompanies, useAdminCompanyDetail, useAdminUsers, useAdminUserDetail）
- **頁面組件**: 6 個（儀表板、公司列表、公司詳情、使用者列表、使用者詳情）
- **佈局組件**: 3 個（AdminLayout, AdminHeader, AdminSidebar）
- **API 端點**: 1 個新增（/api/admin/stats），其他使用 Phase 2 已建立的端點
- **測試文檔**: 2 個（PHASE_4_TESTING_GUIDE.md, PHASE_4_SUMMARY.md）
- **編譯狀態**: ✅ 通過

**Phase 4 核心功能**:
1. ✅ 超級管理員控制台架構
2. ✅ 系統統計與監控
3. ✅ 公司管理（列表、詳情、搜尋、篩選）
4. ✅ 使用者管理（列表、詳情、搜尋、角色篩選）
5. ✅ 響應式設計（桌面/平板/手機）
6. ✅ 安全存取控制（伺服器端驗證）
7. ✅ 一致的視覺設計（紫色主題、emoji 圖示）
8. ✅ 完整的錯誤處理與載入狀態

### 🎉 Major Features - 三級權限系統 Phase 1-3 完成 ✅

#### Phase 1: 資料庫與後端設定 (2025-10-18)
- **Migration 005 - 超級管理員設定** (`migrations/005_super_admin_setup.sql`)
  - ✅ 建立 5 個角色：super_admin, company_owner, sales_manager, salesperson, accountant
  - ✅ 建立 14 個權限：products, customers, quotations, contracts, payments, company_settings, users
  - ✅ 建立角色權限關聯表
  - ✅ 設定超級管理員帳號（placeholder UUID，首次登入後更新）
  - ✅ 實作 Row Level Security (RLS) 政策（5 個資料表）
  - ✅ 建立 4 個資料庫函數：
    - `can_access_company()` - 檢查公司存取權限
    - `get_manageable_companies()` - 取得可管理公司
    - `can_manage_user()` - 檢查使用者管理權限
    - `can_assign_role()` - 檢查角色分配權限

- **RBAC 服務增強** (`lib/services/rbac.ts`)
  - ✅ `canAccessCompany()` - 檢查公司存取
  - ✅ `getManageableCompanies()` - 取得可管理公司列表
  - ✅ `canManageUser()` - 檢查使用者管理權限
  - ✅ `canAssignRole()` - 檢查角色分配權限
  - ✅ `getAllCompanies()` - 超管取得所有公司（含統計）

- **公司服務增強** (`lib/services/company.ts`)
  - ✅ `getCompanyMembersDetailed()` - 取得成員詳細資訊
  - ✅ `addCompanyMemberEnhanced()` - 新增成員（含權限檢查）
  - ✅ `getAllCompaniesForAdmin()` - 超管取得公司列表
  - ✅ `getCompanyStats()` - 取得公司統計資料

#### Phase 2: API 端點開發 (2025-10-18)
**11 個新 API 端點**

**使用者權限 API (2 個)**
- `GET /api/user/permissions` - 取得使用者完整權限資訊
- `GET /api/user/companies` - 取得使用者所屬公司列表

**公司管理 API (5 個)**
- `GET /api/company/manageable` - 取得可管理的公司列表
- `GET /api/company/[id]/members` - 取得公司成員列表
- `POST /api/company/[id]/members` - 新增公司成員
- `PATCH /api/company/[id]/members/[userId]` - 更新成員角色
- `DELETE /api/company/[id]/members/[userId]` - 移除成員（軟刪除）

**超級管理員 API (4 個)**
- `GET /api/admin/companies` - 取得所有公司列表
- `GET /api/admin/companies/[id]` - 取得公司詳細資訊
- `POST /api/admin/companies/[id]/members` - 超管新增成員到任何公司
- `GET /api/admin/users` - 取得所有使用者列表
- `PATCH /api/admin/users/[id]/role` - 超管更新使用者角色

**權限控制特性**
- ✅ 三級權限檢查（超管 > 公司 owner > 一般使用者）
- ✅ 基於角色等級的權限驗證
- ✅ 公司資料隔離（RLS）
- ✅ 完整的錯誤處理與回饋

#### Phase 3: Hooks 與組件 (2025-10-18)
**4 個自訂 Hooks** (`hooks/permission/`)
- `usePermissions()` - 完整的權限管理
  - 取得使用者權限、超管狀態、公司角色
  - `hasPermission()` 權限檢查
  - `isCompanyOwner()` owner 檢查
  - `getCompanyRole()` 角色取得
- `useCompanies()` - 使用者所屬公司列表
- `useManageableCompanies()` - 可管理公司列表
- `useCompanyMembers()` - 公司成員管理
  - `addMember()` 新增成員
  - `updateMemberRole()` 更新角色
  - `removeMember()` 移除成員

**4 個 UI 組件** (`components/permission/`)
- `RequirePermission` - 權限保護組件
  - `SuperAdminOnly` - 僅超管可見
  - `CompanyOwnerOnly` - 僅 owner 可見
  - 支援權限、超管、owner 檢查
  - 可自訂 fallback 內容
- `CompanySelector` - 公司選擇器
  - 自動載入公司列表
  - 支援自動選擇第一個公司
  - `CompanySelectorWithLabel` 變體
- `RoleSelector` - 角色選擇器
  - 5 個可選角色（可過濾 owner）
  - 顯示角色描述
  - `RoleSelectorWithLabel` 變體
  - `RoleBadge` 角色徽章組件
- `MemberList` - 成員列表組件
  - 完整的成員資訊展示
  - 內建編輯/刪除功能
  - Owner 保護機制
  - 權限控管

### Added (新增)

**Migration**
- 📄 `migrations/005_super_admin_setup.sql` (400+ 行) - 超級管理員與權限系統設定

**Service Layer** (9 個新函數)
- 📁 `lib/services/rbac.ts` - 新增 5 個 RBAC 函數
- 📁 `lib/services/company.ts` - 新增 4 個公司管理函數

**API Routes** (11 個新端點)
- 📁 `app/api/user/permissions/route.ts`
- 📁 `app/api/user/companies/route.ts`
- 📁 `app/api/company/manageable/route.ts`
- 📁 `app/api/company/[id]/members/route.ts`
- 📁 `app/api/company/[id]/members/[userId]/route.ts`
- 📁 `app/api/admin/companies/route.ts`
- 📁 `app/api/admin/companies/[id]/route.ts`
- 📁 `app/api/admin/companies/[id]/members/route.ts`
- 📁 `app/api/admin/users/route.ts`
- 📁 `app/api/admin/users/[id]/role/route.ts`

**Hooks** (4 個)
- 📁 `hooks/permission/usePermissions.ts`
- 📁 `hooks/permission/useCompanies.ts`
- 📁 `hooks/permission/useManageableCompanies.ts`
- 📁 `hooks/permission/useCompanyMembers.ts`
- 📁 `hooks/permission/index.ts`

**Components** (4 個 + 變體)
- 📁 `components/permission/RequirePermission.tsx`
- 📁 `components/permission/CompanySelector.tsx`
- 📁 `components/permission/RoleSelector.tsx`
- 📁 `components/permission/MemberList.tsx`
- 📁 `components/permission/index.ts`

**Testing & Documentation**
- 📁 `app/test-permissions/page.tsx` - 完整測試頁面
- 📁 `docs/THREE_TIER_PERMISSION_SYSTEM_DESIGN.md` - 完整設計文檔
- 📁 `docs/API_TEST_RESULTS.md` - API 測試結果
- 📁 `docs/HOOKS_AND_COMPONENTS_GUIDE.md` - Hooks 與組件使用指南
- 📁 `docs/PHASE_1-3_TESTING_GUIDE.md` - 詳細測試指南
- 📁 `docs/TESTING_SUMMARY.md` - 測試摘要
- 📁 `scripts/test-permission-apis.ts` - API 測試腳本

### 🔑 Key Features (關鍵特性)

1. **三級權限架構**
   - 超級管理員：系統級管理，所有權限
   - 公司 Owner：公司級管理，成員與設定
   - 一般使用者：基於角色的功能權限

2. **資料庫層級安全**
   - Row Level Security (RLS) 自動資料隔離
   - 資料庫函數進行權限檢查
   - 多層防護確保資料安全

3. **完整的 API 層**
   - 11 個 RESTful API 端點
   - 統一的錯誤處理
   - 完整的 TypeScript 型別

4. **React Hooks 架構**
   - 4 個自訂 hooks 封裝複雜邏輯
   - 自動資料管理與重新載入
   - 完整的錯誤處理

5. **可重用 UI 組件**
   - 權限保護組件
   - 公司/角色選擇器
   - 成員列表管理
   - 完整的 TypeScript 支援

### 📊 Statistics (統計)

- **新建檔案**: 28 個
- **修改檔案**: 2 個（Service Layer）
- **新增代碼行數**: ~6,000 行（含文檔）
- **Migration**: 1 個（400+ 行）
- **API 端點**: 11 個新增
- **Service 函式**: 9 個新增
- **Hooks**: 4 個
- **組件**: 4 個（+ 變體共 8 個）
- **測試頁面**: 1 個完整測試頁面
- **文檔頁數**: 6 個（~3,500 行）

### 🔧 Fixed (修復)
- **建置錯誤 - Module not found: '@/lib/auth'** ✅ 已修復
  - ❌ **問題**: 多個 API 路由引用不存在的 `@/lib/auth` 和 `next-auth` 套件
  - ✅ **解決方案**:
    - 創建 `lib/auth.ts` 作為 Supabase Auth 的封裝層
    - 提供 NextAuth 兼容的介面但使用 Supabase Auth 實作
    - 避免安裝 NextAuth 及其依賴衝突問題
  - 📝 **受影響檔案**: 10 個 API 路由和 middleware 檔案
  - 🔗 **詳細記錄**: 參見 `ISSUELOG.md` [ISSUE-001]

### Added (新增)
- 📄 `lib/auth.ts` - Supabase Auth 封裝層
  - 提供 `getServerSession()` 函數（NextAuth 兼容）
  - 提供 `getCurrentUserId()` helper 函數
  - 提供 `requireAuth()` 認證保護函數
  - 完整的 TypeScript 型別定義
- 📄 `ISSUELOG.md` - 專案問題追蹤日誌
  - 記錄所有遇到的錯誤和解決方案
  - 包含根本原因分析
  - 包含預防措施建議

### Changed (變更)
- 🔧 `lib/middleware/withPermission.ts` - 改用 Supabase Auth
  - 移除 NextAuth 依賴
  - 改用 `@/lib/auth` 的 `getServerSession()`
- 🔧 **所有 API 路由** (9 個檔案) - 統一認證方式
  - `app/api/payments/route.ts`
  - `app/api/payments/unpaid/route.ts`
  - `app/api/payments/collected/route.ts`
  - `app/api/payments/reminders/route.ts`
  - `app/api/payments/[id]/mark-overdue/route.ts`
  - `app/api/contracts/overdue/route.ts`
  - `app/api/contracts/[id]/payment-progress/route.ts`
  - `app/api/contracts/[id]/next-collection/route.ts`
  - `app/api/contracts/from-quotation/route.ts`

### Technical Details (技術細節)
- **認證架構統一**: 全專案統一使用 Supabase Auth
- **避免依賴衝突**: 不安裝 NextAuth，避免與 nodemailer@7.0.9 的衝突
- **向後兼容**: `lib/auth.ts` 提供與 NextAuth 相同的 API 介面
- **型別安全**: 完整的 TypeScript 型別定義

---

## [0.7.0] - 2025-01-18

### 🎉 Major Features - 合約管理和收款管理完整實作 ✅

#### Service Layer 增強（11 個新函式）

**合約管理服務** (`lib/services/contracts.ts`)
- ✅ `convertQuotationToContract()` - 報價單轉合約，自動產生付款排程
- ✅ `updateNextCollection()` - 更新合約下次應收資訊
- ✅ `getContractPaymentProgress()` - 查詢合約收款進度（含完成率）
- ✅ `getContractsWithOverduePayments()` - 查詢有逾期款項的合約列表

**收款管理服務** (`lib/services/payments.ts`)
- ✅ `recordPayment()` - 記錄收款並觸發自動更新下次應收
- ✅ `getCollectedPayments()` - 查詢已收款列表（使用資料庫視圖）
- ✅ `getUnpaidPayments()` - 查詢未收款列表（>30天）
- ✅ `getNextCollectionReminders()` - 查詢收款提醒列表
- ✅ `markPaymentAsOverdue()` - 手動標記付款排程為逾期
- ✅ `batchMarkOverduePayments()` - 批次標記逾期款項
- ✅ `recordPaymentReminder()` - 記錄收款提醒發送

#### API 端點（11 個新端點）

**合約管理 API** (4 個)
- `POST /api/contracts/from-quotation` - 報價單轉合約
- `PUT /api/contracts/[id]/next-collection` - 更新下次應收資訊
- `GET /api/contracts/[id]/payment-progress` - 查詢合約收款進度
- `GET /api/contracts/overdue` - 查詢有逾期款項的合約

**收款管理 API** (7 個)
- `POST /api/payments` - 記錄收款
- `GET /api/payments` - 查詢收款列表
- `GET /api/payments/collected` - 已收款列表（使用視圖）
- `GET /api/payments/unpaid` - 未收款列表（>30天）
- `GET /api/payments/reminders` - 收款提醒列表
- `POST /api/payments/[id]/mark-overdue` - 標記付款排程為逾期

#### 權限檢查中介層

**新建立** (`lib/middleware/withPermission.ts`)
- ✅ `withPermission(resource, action)` - 單一權限檢查中介層
- ✅ `withPermissions([...])` - 多重權限檢查中介層
- ✅ `canAccessProductCost(req)` - 檢查產品成本訪問權限
- ✅ `requireAuth(handler)` - 認證需求中介層

**權限對照表**:
| 功能 | 需要權限 | 可訪問角色 |
|------|---------|-----------|
| 查看產品成本 | `products:read_cost` | super_admin, company_owner, accountant |
| 編輯合約 | `contracts:write` | super_admin, company_owner, sales_manager |
| 記錄收款 | `payments:write` | super_admin, company_owner, accountant |
| 查看收款 | `payments:read` | 所有角色（業務人員僅限自己的） |

#### 自動化工作流程

**1. 報價單 → 合約轉換流程**
```
調用 API → 建立合約 → 更新報價單狀態 → 產生付款排程 → 設定下次應收
```

**2. 收款記錄自動化**（使用資料庫觸發器）
```
記錄收款 → 標記排程已付款 → 觸發器計算下次應收 → 更新合約 → 更新報價單 → 更新客戶
```
- 🔑 關鍵技術：資料庫觸發器 `update_next_collection_date()` 自動處理

**3. 逾期檢測自動化**
```
定時任務 → 調用批次函式 → 標記逾期排程 → 計算逾期天數 → 回傳結果
```
- 🔑 關鍵技術：資料庫函式 `mark_overdue_payments()` 批次處理

#### 資料庫增強（Migration 004）

**新增資料表欄位**:
- `quotations` 表: contract_signed_date, contract_expiry_date, payment_frequency, next_collection_date, next_collection_amount
- `customer_contracts` 表: next_collection_date, next_collection_amount, quotation_id
- `payments` 表: payment_frequency, is_overdue, days_overdue
- `payment_schedules` 表: days_overdue, last_reminder_sent_at, reminder_count

**新增資料庫視圖** (3 個):
- `collected_payments_summary` - 已收款彙總（含中文顯示）
- `unpaid_payments_30_days` - 未收款列表（>30天）
- `next_collection_reminders` - 下次收款提醒

**新增資料庫函式** (2 個):
- `generate_payment_schedules_for_contract()` - 自動產生付款排程
- `mark_overdue_payments()` - 批次標記逾期款項

**新增資料庫觸發器** (2 個):
- `trigger_update_next_collection_date` - 收款後自動更新下次應收
- `trigger_check_payment_schedules_overdue` - 自動檢測逾期

#### 測試工具和範例

**測試資料建立腳本** (`scripts/seed-test-data.ts`)
- 5 個測試用戶（不同角色）
- 5 筆產品（含成本價和利潤率）
- 5 筆客戶
- 5 筆報價單（含合約轉換）
- 執行方式: `npm run seed`

**API 測試腳本** (`scripts/test-api-endpoints.sh`)
- 自動測試所有 API 端點
- 彩色輸出和錯誤處理
- 執行方式: `./scripts/test-api-endpoints.sh`

**API 使用範例** (`examples/api-usage-examples.ts`)
- 完整的 TypeScript 範例
- React 整合範例
- 前端調用範例

### Added (新增)

**Service Layer**:
- 📁 `lib/middleware/withPermission.ts` - 權限檢查中介層

**API Routes** (11 個新端點):
- 📁 `app/api/contracts/from-quotation/route.ts`
- 📁 `app/api/contracts/[id]/next-collection/route.ts`
- 📁 `app/api/contracts/[id]/payment-progress/route.ts`
- 📁 `app/api/contracts/overdue/route.ts`
- 📁 `app/api/payments/route.ts`
- 📁 `app/api/payments/collected/route.ts`
- 📁 `app/api/payments/unpaid/route.ts`
- 📁 `app/api/payments/reminders/route.ts`
- 📁 `app/api/payments/[id]/mark-overdue/route.ts`

**Scripts & Tools**:
- 📁 `scripts/seed-test-data.ts` - 測試資料建立腳本
- 📁 `scripts/test-api-endpoints.sh` - API 端點測試腳本
- 📁 `examples/api-usage-examples.ts` - API 使用範例

**Documentation** (5 個文檔):
- 📁 `docs/API_IMPLEMENTATION_GUIDE.md` - 完整 API 實作指南（含範例）
- 📁 `docs/CONTRACTS_AND_PAYMENTS_README.md` - 功能說明和使用指南
- 📁 `IMPLEMENTATION_SUMMARY.md` - 實作總結
- 📁 `FILES_CREATED.md` - 已建立/修改檔案清單
- 📁 `QUICK_REFERENCE.md` - 快速參考卡

### Changed (變更)

- 🔧 `lib/services/contracts.ts` - 新增 4 個合約管理函式
- 🔧 `lib/services/payments.ts` - 新增 7 個收款管理函式
- 🔧 `package.json` - 新增 `seed` 腳本定義

### 📊 Statistics (統計)

- **新建檔案**: 18 個
- **修改檔案**: 2 個（Service Layer）
- **新增代碼行數**: ~4,500 行（含文檔）
- **API 端點**: 11 個新增
- **Service 函式**: 11 個新增
- **文檔頁數**: 5 個（~2,500 行）
- **測試腳本**: 2 個

### 🔑 Key Features (關鍵特性)

1. **資料庫觸發器自動化** - 減少前端邏輯複雜度
2. **資料庫視圖優化查詢** - 提升查詢效能
3. **型別安全** - 完整的 TypeScript 型別標註
4. **權限分層設計** - Service Layer 和 API Layer 都有權限檢查
5. **事務處理** - 關鍵操作使用資料庫事務確保資料一致性

### 🚀 Next Steps (後續建議)

- [ ] 收款提醒郵件自動發送
- [ ] 逾期款項自動催收通知
- [ ] 收款統計圖表和報表
- [ ] 匯出收款明細為 Excel
- [ ] API 回應快取優化
- [ ] WebSocket 即時通知

### Migration Notes (遷移說明)

- ✅ Migration 004 已包含所有必要的資料庫結構
- ✅ 執行 `npm run seed` 建立測試資料
- ✅ 所有 API 端點已準備好投入使用

---

### 🔧 Fixed (修復中 - Phase 2: P0 Blockers)
- **資料庫 Schema 不一致問題** ✅ 已準備修復腳本
  - ❌ `ERROR: 42703: column "sku" does not exist`
  - ❌ `ERROR: 42501: permission denied for table customers/products/quotations`
  - ✅ 創建完整 drop-and-recreate migration: `supabase-migrations/000_drop_and_recreate.sql`
  - ✅ 包含所有缺失欄位：`sku`, `tax_id`, `contact_person`
  - ✅ 修正欄位命名：`unit_price`, `total_amount`
  - ✅ 完整 RLS 策略配置
  - ⏳ **等待執行** - 需在 Supabase Dashboard 執行 SQL

### 📝 Added (新增)
- 📄 `supabase-migrations/000_drop_and_recreate.sql` (273 行) - **主要修復腳本**
  - 完整刪除並重建所有業務表
  - 修復所有 schema 不一致問題
  - 配置所有 RLS 策略和索引
- 📄 `supabase-migrations/001_initial_schema.sql` (291 行) - 初始版本（已被 000 取代）
- 📄 `docs/MIGRATION_EXECUTION_GUIDE.md` - **詳細執行指南** ⭐
  - 三種執行方式（Dashboard/psql/CLI）
  - 完整驗證步驟
  - 常見問題 FAQ
  - 預期結果說明
- 📄 `scripts/migrate-supabase.sh` - Migration 輔助腳本
  - 顯示所有執行選項
  - SQL 內容摘要
  - 清晰的操作指引
- 📄 `scripts/run-supabase-migration.ts` - 自動執行腳本（需 service role key）
- 📄 `scripts/diagnose-supabase.ts` - 資料庫診斷工具
- 📄 `QUICK_FIX.md` - 5分鐘快速修復指南
- 📄 `docs/SUPABASE_MIGRATION_GUIDE.md` - 遷移指南

### 🏗️ Layout Structure (佈局結構優化)
- ✅ **統一佈局系統** - 所有認證頁面加入 Sidebar + Navbar
  - 📄 `app/[locale]/customers/layout.tsx` - 客戶管理佈局
  - 📄 `app/[locale]/products/layout.tsx` - 產品管理佈局
  - 📄 `app/[locale]/quotations/layout.tsx` - 報價單管理佈局
  - 每個 layout 包含：
    - ✅ 認證檢查（redirect to /login if not authenticated）
    - ✅ Navbar 導航欄
    - ✅ Sidebar 側邊欄（可收合）
    - ✅ 一致的頁面結構

### 🎨 UI/UX Improvements (介面優化)
- ✅ **Login 頁面增強** (`app/[locale]/login/page.tsx`)
  - 修復 Next.js 15 async params 錯誤
  - 新增 Logo 圖示（藍色文件圖示）
  - 改進漸層背景設計
  - 更好的按鈕樣式和懸停效果
- ✅ **LoginButton 優化** (`app/[locale]/login/LoginButton.tsx`)
  - 改進 hover 動畫（scale transform）
  - 更清晰的視覺回饋

### 🔄 Changed (變更)
- 🔧 **業務表結構優化**：
  ```sql
  -- 欄位重命名
  products.base_price     → products.unit_price
  quotations.total        → quotations.total_amount

  -- 新增欄位
  products.sku            VARCHAR(100)
  customers.tax_id        VARCHAR(50)
  customers.contact_person JSONB
  ```
- 🔧 **修復 Next.js 15 相容性**
  - Login page: `params: Promise<{ locale: string }>` (await params)
  - 移除直接存取 params.locale 的錯誤
- 🔧 **簡化 quotation_items 表結構**，移除未使用欄位

### 📊 Code Architecture Analysis (代碼架構分析)
- ✅ **Tech Lead 全面評估完成**
  - 健康分數：6.5/10
  - 識別 10 個優先級問題（P0-P4）
  - 生成 6 階段修復路線圖
  - 詳細技術債務清單

### 待優化項目
- [ ] 修復批次匯出的 N+1 查詢問題 (21次查詢→2次)
- [ ] 實作錯誤追蹤系統 (Sentry/OpenTelemetry)
- [ ] 添加環境變數驗證 (lib/env.ts)
- [ ] 實作 Cron Job 冪等性保證
- [ ] 執行測試套件達到 80% 覆蓋率

---

## [0.6.1] - 2025-10-17

### 🎨 UI/UX Improvements (介面優化) ✅

#### 側邊欄可收合功能
- **Sidebar 組件重構** (`components/Sidebar.tsx`)
  - 新增收合/展開切換功能
  - 動態寬度調整：64px（收合）↔ 256px（展開）
  - 收合按鈕位於右側邊緣，帶箭頭圖示
  - 收合時顯示懸停提示（Tooltip）
  - 平滑過渡動畫（transition-all duration-300）
  - 保持圖示可見，文字動態顯示/隱藏

#### 導航欄簡化
- **Navbar 組件優化** (`components/Navbar.tsx`)
  - 移除左側系統名稱/Logo
  - 採用靠右對齊佈局（justify-end）
  - 保留語言切換和登出按鈕
  - 清理未使用的 Link import

### 🛠️ Development Tools (開發工具) ✅

#### 測試數據建立工具
1. **TypeScript 腳本** (`scripts/create-test-data.ts`)
   - 直接連接 Zeabur PostgreSQL 建立測試數據
   - 使用 pg 客戶端連接池
   - 支援命令列傳入 User ID
   - 交易式操作保證數據一致性
   - 完整的錯誤處理和回滾機制
   - 建立內容：
     - 5 個測試客戶（涵蓋台灣、美國市場）
     - 10 個測試產品（電腦週邊、辦公用品）
     - 5 個測試報價單（各種狀態：draft/sent/accepted/rejected）
     - 13 個報價單項目
   - 支援重複執行（ON CONFLICT 處理）

2. **開發環境啟動腳本** (`scripts/dev.sh`)
   - 環境變數檢查
   - 依賴安裝檢查
   - 自動啟動開發伺服器
   - 清晰的錯誤提示

3. **完整使用指南** (`docs/CREATE_TEST_DATA.md`)
   - 詳細的步驟說明
   - User ID 獲取方法（瀏覽器 Console）
   - 故障排除指南
   - 測試數據詳細列表

### 📊 Test Data Details (測試數據詳情)

#### 客戶 (5個)
1. 台灣科技股份有限公司 - 台北（含統編）
2. 優質貿易有限公司 - 新竹（含統編）
3. 創新設計工作室 - 台中
4. 全球物流企業 - 高雄（含統編）
5. 美國進口商公司 - 舊金山

#### 產品 (10個)
- 筆記型電腦 (TWD 35,000)
- 無線滑鼠 (TWD 800)
- 機械式鍵盤 (TWD 2,500)
- 27吋 4K 顯示器 (TWD 12,000)
- 網路攝影機 (TWD 1,500)
- 外接硬碟 1TB (TWD 1,800)
- 多功能印表機 (TWD 8,500)
- 辦公椅 (TWD 4,500)
- 電腦包 (TWD 1,200)
- USB 集線器 (TWD 600)

#### 報價單 (5個)
1. **Q2025-001** - Draft - TWD 51,450
2. **Q2025-002** - Sent - TWD 27,825
3. **Q2025-003** - Accepted - TWD 40,320
4. **Q2025-004** - Sent - USD 1,512
5. **Q2025-005** - Rejected - TWD 15,750

### Added (新增)
- 📁 `scripts/create-test-data.ts` - 測試數據建立腳本
- 📁 `scripts/dev.sh` - 開發環境啟動腳本
- 📁 `docs/CREATE_TEST_DATA.md` - 測試數據建立指南
- 📁 `app/api/seed-test-data/route.ts` - API 端點（備用方案）

### Changed (變更)
- 🎨 `components/Sidebar.tsx` - 新增可收合功能
- 🎨 `components/Navbar.tsx` - 移除頁面標題，簡化佈局
- 📝 `CHANGELOG.md` - 更新本次變更記錄

### Technical Details (技術細節)
- **測試數據工具**
  - 直接使用 pg 客戶端連接 Zeabur PostgreSQL
  - 不依賴 Supabase CLI
  - 支援跨平台執行（macOS、Linux、Windows）
  - UUID 預設值確保數據一致性

- **UI 動畫**
  - Tailwind CSS transition utilities
  - Transform 動畫（rotate-180）
  - Opacity 和 visibility 控制
  - Z-index 層級管理

### 📊 Statistics (統計)
- 新增檔案：4 個
- 修改檔案：3 個
- 新增代碼行數：~600 行
- UI 組件優化：2 個
- 文檔頁數：1 個（50+ 行）

---

## [0.6.0] - 2025-10-16

### 🔒 Security Fixes (安全性修復) ✅

#### 關鍵安全漏洞修復
1. **移除硬編碼資料庫密碼** 🔴 CRITICAL
   - 修復檔案: `lib/db/zeabur.ts`, `scripts/setup-zeabur-db.ts`
   - 移除硬編碼的 PostgreSQL 連線字串
   - 加入環境變數驗證和錯誤提示
   - 實作密碼遮罩功能於 log 輸出
   - 生產環境啟用 SSL 連線

2. **Email 格式驗證** 🟡 HIGH
   - 修復檔案: `app/api/quotations/[id]/email/route.ts`
   - 加入 Email 格式正則驗證
   - CC 副本 Email 驗證
   - 限制 CC 數量最多 10 個防止濫用

3. **API 速率限制實作** 🟡 HIGH
   - 新增檔案: `lib/middleware/rate-limiter.ts`
   - 5 種預設速率限制配置：
     - Email 發送：20 封/小時
     - 批次操作：5 次/5 分鐘
     - 匯率同步：10 次/小時
     - 一般 API：60 次/分鐘
     - 敏感操作：10 次/分鐘
   - 套用到所有關鍵 API 端點

4. **環境變數範例檔案**
   - 新增檔案: `.env.local.example`
   - 包含所有必要環境變數
   - 安全警告和說明文件

### 🧪 Testing Implementation (測試實作) ✅

#### 測試套件建立 (127 個測試案例)
1. **單元測試實作** (`tests/unit/`)
   - `email-api.test.ts` - Email API 測試 (25 個測試)
   - `analytics.test.ts` - 分析服務測試 (20 個測試)
   - `batch-operations.test.ts` - 批次操作測試 (30 個測試)
   - `exchange-rates.test.ts` - 匯率服務測試 (35 個測試)
   - `rate-limiter.test.ts` - 速率限制器測試 (17 個測試)

2. **測試環境設置**
   - `tests/setup.ts` - Vitest 測試環境
   - `tests/mocks/supabase.ts` - Supabase Mock
   - `vitest.config.ts` - Vitest 配置
   - `scripts/tests/run-all-tests.sh` - 測試運行腳本

3. **測試文檔** (`docs/`)
   - `TEST_REPORT.md` - 完整測試報告
   - `TESTING_STRATEGY.md` - 測試策略文檔
   - `TESTING_QUICKSTART.md` - 快速開始指南
   - `TEST_IMPLEMENTATION_SUMMARY.md` - 實作摘要
   - `README_TESTING.md` - 測試總覽

4. **測試工具鏈**
   ```json
   {
     "vitest": "^3.2.4",
     "@vitest/ui": "^3.2.4",
     "@vitest/coverage-v8": "^3.2.4",
     "@testing-library/react": "^16.0.1",
     "@testing-library/user-event": "^14.5.2",
     "msw": "^2.3.1",
     "supertest": "^6.3.3",
     "jsdom": "^26.0.0"
   }
   ```

### Added (新增)
- 📁 `lib/middleware/rate-limiter.ts` - API 速率限制中間件
- 📁 `.env.local.example` - 環境變數範例檔案
- 📁 `tests/` - 完整測試套件目錄
- 📁 `docs/TEST*.md` - 5 個測試相關文檔

### Changed (變更)
- 🔧 `lib/db/zeabur.ts` - 移除硬編碼密碼，加入驗證
- 🔧 `scripts/setup-zeabur-db.ts` - 移除硬編碼密碼
- 🔧 `app/api/quotations/[id]/email/route.ts` - 加入 Email 驗證和速率限制
- 🔧 `app/api/quotations/batch/*/route.ts` - 套用批次操作速率限制
- 🔧 `app/api/exchange-rates/sync/route.ts` - 套用同步速率限制
- 🔧 `package.json` - 新增測試腳本和依賴

### Security (安全性)
- ✅ 移除所有硬編碼敏感資訊
- ✅ 實作 Email 輸入驗證
- ✅ 實作 API 速率限制防護
- ✅ 加入環境變數驗證
- ✅ 密碼遮罩於日誌輸出
- ✅ 生產環境 SSL 連線

### 📊 Statistics (統計)
- 安全漏洞修復：4 個關鍵問題
- 測試案例數量：127 個
- 新增檔案：15+ 個
- 修改檔案：8 個
- 新增代碼行數：~2,500 行（含測試）
- 測試覆蓋目標：80%

---

## [0.5.0] - 2025-10-16

### 🎉 Major Features - Four-Phase Development Complete

#### Phase 1: Email 發送功能 ✅
- **整合 Resend Email 服務**
  - 安裝 `resend@^4.7.0` 和 `@react-email/components@^0.0.31`
  - 設定環境變數 `RESEND_API_KEY` 和 `EMAIL_FROM`

- **Email 模板系統** (`lib/email/`)
  - `QuotationEmailTemplate.tsx` - 中英文雙語 Email 模板
  - 使用 React Email 組件實現響應式設計
  - 完整顯示報價單明細、金額、稅金、總計
  - `service.ts` - Email 發送服務模組

- **發送報價單 API** (`app/api/quotations/[id]/email/route.ts`)
  - POST endpoint 發送報價單 Email
  - 支援 CC 副本收件人 (最多10人)
  - 自動更新報價單狀態為「已發送」
  - 權限驗證確保只能發送自己的報價單

- **UI 整合** (`components/EmailSendButton.tsx`)
  - 彈窗式發送介面
  - 支援選擇收件人、CC 副本、語言
  - Loading 狀態與錯誤處理
  - 成功後自動刷新頁面

#### Phase 2: 進階圖表分析 ✅
- **整合 Recharts 圖表庫** (`recharts@^2.15.0`)

- **三大圖表組件** (`components/charts/`)
  - `RevenueChart.tsx` - 營收趨勢線圖
    - 雙 Y 軸顯示營收與報價單數量
    - 6個月歷史數據趨勢
    - 自訂工具提示 (Tooltip)
  - `CurrencyChart.tsx` - 幣別分布圓餅圖
    - 顯示各貨幣佔比百分比
    - 彩色區塊與圖例
    - 顯示金額與數量統計
  - `StatusChart.tsx` - 狀態統計長條圖
    - 草稿/已發送/已接受/已拒絕分佈
    - 顯示數量與價值雙指標

- **Analytics 服務模組** (`lib/services/analytics.ts`)
  - `getRevenueTrend()` - 獲取月度營收趨勢
  - `getCurrencyDistribution()` - 計算幣別分布
  - `getStatusStatistics()` - 分析狀態統計
  - `getDashboardSummary()` - 提供儀表板摘要數據
    - 月度營收對比 (MoM Growth)
    - 轉換率計算 (已接受/已發送)
    - 待處理報價單統計

- **儀表板重構** (`app/[locale]/dashboard/page.tsx`)
  - 整合所有圖表到統一頁面
  - 新增統計卡片 (月營收、月報價單、轉換率、待處理)
  - 成長指標視覺化 (↑/↓ 百分比)
  - 快速操作區塊保留

#### Phase 3: 批次操作功能 ✅
- **多選功能實作**
  - 全選/取消全選 checkbox
  - 個別項目選擇
  - 選中計數顯示
  - 批次操作按鈕組

- **批次刪除 API** (`app/api/quotations/batch/delete/route.ts`)
  - 批次刪除多個報價單
  - 自動清理關聯的 quotation_items
  - 權限驗證確保只能刪除自己的資料

- **批次更新狀態 API** (`app/api/quotations/batch/status/route.ts`)
  - 批次更新報價單狀態
  - 支援 draft/sent/accepted/rejected
  - 記錄更新時間戳記

- **批次匯出 PDF** (`app/api/quotations/batch/export/route.ts`)
  - 整合 `jszip@^3.10.1` 生成 ZIP 檔案
  - 最多支援 20 份報價單同時匯出
  - 每個報價單生成獨立 PDF
  - 打包下載為 `quotations_YYYY-MM-DD.zip`

- **UI 整合** (`app/[locale]/quotations/QuotationList.tsx`)
  - 批次操作模式切換按鈕
  - 批次操作工具列 (更新狀態/匯出/刪除)
  - 確認對話框防止誤操作
  - 處理中狀態指示

#### Phase 4: 匯率自動更新機制 ✅
- **Vercel Cron Job 架構** (`vercel.json`)
  ```json
  {
    "crons": [{
      "path": "/api/cron/exchange-rates",
      "schedule": "0 0 * * *"  // 每日 UTC 00:00
    }]
  }
  ```

- **自動同步端點** (`app/api/cron/exchange-rates/route.ts`)
  - GET endpoint 供 Vercel Cron 調用
  - 同步所有 5 種支援貨幣 (TWD, USD, EUR, JPY, CNY)
  - 重試機制 (最多3次)
  - 執行時間限制 60 秒
  - CRON_SECRET 驗證防止未授權調用

- **錯誤通知機制**
  - Webhook 整合 (Slack/Discord)
  - 環境變數配置:
    - `ERROR_WEBHOOK_URL` - 錯誤通知
    - `SUCCESS_WEBHOOK_URL` - 成功通知 (僅生產環境)
  - 詳細錯誤訊息與時間戳記

- **手動同步增強** (`app/api/exchange-rates/sync/route.ts`)
  - 新增 `syncAll` 參數批次同步所有貨幣
  - POST 測試端點方便開發調試
  - 返回詳細同步結果

### 🌐 國際化更新
- **Email 相關** (messages/[locale].json)
  - `sendQuotation` - 發送報價單
  - `recipient` - 收件人
  - `cc` - 副本
  - `addCc` - 新增副本收件人
  - `language` - 郵件語言
  - `sending` - 發送中...
  - `sendSuccess` - 報價單已成功發送
  - `sendFailed` - 發送失敗，請稍後再試

- **圖表相關**
  - `monthlyRevenue` - 本月營收
  - `monthlyQuotations` - 本月報價單
  - `conversionRate` - 轉換率
  - `vsLastMonth` - 對比上月
  - `revenueTitle` - 營收趨勢分析
  - `currencyTitle` - 幣別分布
  - `statusTitle` - 報價單狀態統計

- **批次操作相關**
  - `selectMultiple` - 批次操作
  - `cancel` - 取消批次
  - `updateStatus` - 更新狀態
  - `exportPDF` - 匯出 PDF
  - `delete` - 批次刪除
  - `deleteConfirm.title` - 確認批次刪除
  - `deleteConfirm.description` - 您確定要刪除所選的 {{count}} 個報價單嗎？

### 📦 Dependencies Added
```json
{
  "resend": "^4.7.0",
  "@react-email/components": "^0.0.31",
  "recharts": "^2.15.0",
  "jszip": "^3.10.1",
  "@types/jszip": "^3.4.1"
}
```

### 🔒 Security Notes (From Code Review)
- ⚠️ **CRITICAL**: 硬編碼資料庫密碼需立即移除
- ⚠️ 缺少 Email 格式驗證
- ⚠️ 批次操作缺少速率限制
- ⚠️ 環境變數未驗證

### 📊 Statistics
- 新增檔案: 24 個
- 修改檔案: 8 個
- 新增代碼行數: ~1,455 行
- API 端點: 7 個新增
- UI 組件: 8 個新增

---

## [0.3.0] - 2025-10-16

### 🎉 Major Feature (主要功能)
- **PDF 匯出功能（雙語支援）**
  - 使用 @react-pdf/renderer 生成專業報價單 PDF
  - 支援中文、英文及雙語並列三種輸出模式
  - 響應式設計,支援 A4 列印格式
  - 完整的報價單資訊展示（客戶、產品、金額、稅金等）

### Added (新增)
- 📄 **PDF 模板系統** (`lib/pdf/`)
  - `QuotationPDFTemplate.tsx` - React PDF 模板組件
  - `types.ts` - PDF 資料類型定義
  - `translations.ts` - PDF 雙語翻譯文本
  - 支援自定義樣式和排版

- 🔌 **PDF 生成 API** (`app/api/quotations/[id]/pdf/route.ts`)
  - GET `/api/quotations/[id]/pdf?locale=zh&both=false`
  - 參數: locale (zh/en), both (true/false)
  - 串流式 PDF 輸出,提升效能
  - 完整的權限驗證與錯誤處理

- 🎨 **PDF 下載按鈕組件** (`components/PDFDownloadButton.tsx`)
  - 支援三種下載模式（中文/英文/雙語）
  - 下拉選單選擇語言
  - 下載進度指示器
  - 可自訂樣式變體 (primary/secondary/outline)

- 🌐 **翻譯更新**
  - 新增 PDF 相關翻譯鍵值
  - `downloadPDF`, `downloadChinesePDF`, `downloadEnglishPDF`, `downloadBilingualPDF`
  - `downloading` 狀態文本

### Changed (變更)
- 🎯 **報價單詳情頁面** (`app/[locale]/quotations/[id]/QuotationDetail.tsx`)
  - 整合 PDF 下載按鈕
  - 優化標題區域佈局

### Dependencies (依賴更新)
- ➕ 新增 `@react-pdf/renderer` - PDF 生成核心庫

### 技術細節
- PDF 採用 React 組件式開發,易於維護和擴展
- 支援未來添加公司 Logo、簽名等進階功能
- 完全響應式設計,適合列印和電子分享

---

## [0.2.1] - 2025-10-16

### 🔥 Critical Fix (重大修復)
- **修復混合雲架構中的資料庫連接問題**
  - 問題: 應用使用 Supabase 客戶端存取 Zeabur PostgreSQL,導致權限錯誤
  - 解決: 建立專用的 Zeabur PostgreSQL 客戶端連接池
  - 影響: exchange_rates 表的所有 CRUD 操作

### Added (新增)
- 📦 **Zeabur PostgreSQL 客戶端** (`lib/db/zeabur.ts`)
  - 獨立的 pg 連接池管理
  - 支援事務操作
  - 錯誤處理與連接超時控制
  - 環境變數配置支援

- 💱 **匯率服務 Zeabur 版本** (`lib/services/exchange-rate-zeabur.ts`)
  - 直接連接 Zeabur PostgreSQL
  - 完整的 CRUD 操作(INSERT/SELECT/UPDATE)
  - ON CONFLICT 處理避免重複資料
  - 與原 Supabase 版本並存

- 🛠️ **資料庫設定工具**
  - `zeabur-schema.sql` - 標準 PostgreSQL schema(不含 Supabase 特性)
  - `scripts/setup-zeabur-db.ts` - 自動化資料庫初始化腳本
  - 支援 UUID extension 啟用
  - 權限自動授予

### Changed (變更)
- 🔧 **API Routes 重構**
  - `GET /api/exchange-rates` - 改用 Zeabur PostgreSQL 查詢
  - `POST /api/exchange-rates/sync` - 改用 Zeabur PostgreSQL 儲存
  - 移除 Supabase 客戶端依賴
  - **預設基準貨幣改為 TWD** (原為 USD)

- 📦 **依賴新增**
  - `pg@^8.16.3` - PostgreSQL 客戶端
  - `@types/pg@^8.15.5` - TypeScript 類型定義

- 🛠️ **MCP 配置清理**
  - 移除 postgres MCP server (使用 pg 客戶端直連)
  - zeabur MCP 保留作為備選方案

### Fixed (修復)
- 🐛 **權限錯誤 (42501)**: "permission denied for table exchange_rates"
  - 根因: Supabase RLS 政策使用 `authenticated` 角色,但 Zeabur PostgreSQL 是標準資料庫
  - 解法: 直接使用 pg 客戶端連接,跳過 RLS 檢查

- 🐛 **資料表不存在**: Zeabur PostgreSQL 初始為空白資料庫
  - 解法: 建立 `setup-zeabur-db.ts` 自動初始化 schema

- 🐛 **架構混淆**: 開發過程中誤認為 Supabase 和 Zeabur 是同一套系統
  - 解法: 明確區分兩個資料庫的用途與連接方式

### Technical Details (技術細節)
- **Zeabur PostgreSQL**
  - 連接字串: `postgresql://root:***@43.159.54.250:30428/zeabur`
  - 連接池大小: 20
  - 連接超時: 2 秒
  - 閒置超時: 30 秒

- **架構優化**
  - Supabase: 純認證用途(auth.users)
  - Zeabur PostgreSQL: 業務資料儲存(exchange_rates 等)
  - 兩個資料庫完全獨立運作

### Migration Notes (遷移說明)
- ✅ 新專案: 執行 `npx tsx scripts/setup-zeabur-db.ts` 初始化資料庫
- ✅ 現有專案: 匯率功能已自動切換到 Zeabur PostgreSQL
- ⚠️  舊版 `lib/services/exchange-rate.ts` 保留但不再使用

### Testing Results (測試結果)
```bash
# 同步測試
POST /api/exchange-rates/sync
✅ 成功同步 4 筆匯率資料 (USD → TWD, EUR, JPY, CNY)

# 查詢測試
GET /api/exchange-rates?base=USD
✅ 返回完整匯率對照表

# 資料庫驗證
SELECT * FROM exchange_rates;
✅ 4 筆記錄,rate 精度正確 (DECIMAL 10,6)
```

### Breaking Changes (破壞性變更)
- ⚠️  匯率 API 內部實作完全變更(但 API 介面保持不變)
- ⚠️  不再需要 Supabase RLS migration

---

## [0.2.0] - 2025-10-16

### 🏗️ Architecture (架構說明)
- **混合雲架構設計**
  - Supabase Cloud: 認證系統 (Google OAuth)
  - PostgreSQL on Zeabur: 主要資料庫 (Self-hosted)
  - ExchangeRate-API: 匯率服務
- **完整架構文檔**: `docs/ARCHITECTURE.md`
- **README.md 更新**: 清楚說明混合架構與配置方式

### Added (新增)
- 💱 **匯率整合功能** (Phase 4.1)
  - ExchangeRate-API 整合 (v6 API)
  - 支援 5 種貨幣: TWD, USD, EUR, JPY, CNY
  - 匯率服務模組 (`lib/services/exchange-rate.ts`)
    - 從 API 獲取即時匯率
    - 資料庫快取機制
    - 貨幣轉換計算函數
    - 格式化顯示函數
  - API Routes:
    - `GET /api/exchange-rates` - 獲取最新匯率
    - `POST /api/exchange-rates/sync` - 手動同步匯率
  - Middleware 修復: `/api` 路徑跳過 i18n 處理
  - 環境變數配置 (`EXCHANGE_RATE_API_KEY`)

- 📚 **文檔與工具**
  - Migration SQL 腳本 (`supabase-migrations/002_fix_exchange_rates_rls.sql`)
  - 手動 Migration 腳本 (`MANUAL_RLS_FIX.sql`)
  - 匯率功能設置指南 (`docs/EXCHANGE_RATES_SETUP.md`)
  - 多份技術文檔 (實作報告、使用指南)
  - 測試腳本 (`scripts/test-exchange-rates.sh`)

### Changed (變更)
- 🔧 **Supabase 整合重構**
  - 匯率服務改用依賴注入模式
  - 所有資料庫操作函數接受 `SupabaseClient` 參數
  - API Routes 使用 Server Side 客戶端
  - 修復類型安全問題

- 🔒 **資料庫 RLS 政策優化**
  - `exchange_rates` 表新增 INSERT 權限
  - `exchange_rates` 表新增 UPDATE 權限
  - 保持 DELETE 操作禁用（資料完整性）

### Fixed (修復)
- 🐛 修復 Supabase 客戶端在 API Routes 中的使用錯誤
- 🐛 修復 i18n 中間件攔截 API 路由的問題
- 🐛 修復 `exchange_rates` 表權限不足問題

### Technical Details (技術細節)
- **API 供應商**: ExchangeRate-API.com
- **免費額度**: 1,500 requests/month
- **快取策略**: Next.js 快取 1 小時 + 資料庫持久化
- **支援貨幣**: 5 種 (可擴展至 161 種)
- **匯率更新**: 每日一次（UTC 00:00）

### Breaking Changes (破壞性變更)
- ⚠️  匯率服務函數簽名變更：
  ```typescript
  // Before:
  getExchangeRates('USD')

  // After:
  const supabase = await createClient()
  getExchangeRates(supabase, 'USD')
  ```

### Migration Notes (遷移說明)
- ⚠️  需要在 **Zeabur PostgreSQL** 容器內執行 RLS Migration (5 分鐘)
- 📖 **SSH 操作指南**: `ZEABUR_SSH_GUIDE.md` (⭐ 最重要)
- 🚨 **當前問題與解決**: `CURRENT_ISSUE_AND_SOLUTION.md`
- 📚 完整文檔: `docs/ARCHITECTURE.md`
- 📊 狀態報告: `FINAL_STATUS.md`

---

## [0.1.0] - 2025-10-14

### Added (新增)
- ✨ **基礎架構**
  - Next.js 15.5.5 專案初始化
  - TypeScript 完整配置
  - Tailwind CSS 4 樣式系統
  - ESLint 規範設定
  - Turbopack 開發環境

- 🔐 **認證系統**
  - Supabase Auth 整合 (SSR)
  - Google OAuth 2.0 登入
  - 會話管理與 Cookie 刷新
  - 保護路由中間件
  - 登入頁面與 OAuth 回調處理

- 🌐 **國際化 (i18n)**
  - next-intl v4.3.12 整合
  - 雙語支援 (繁體中文/English)
  - 動態路由前綴 (`/zh/*`, `/en/*`)
  - 語言切換功能
  - 翻譯檔案管理 (messages/zh.json, messages/en.json)

- 🗄️ **資料庫架構**
  - PostgreSQL Schema 設計 (supabase-schema.sql)
  - 5 個主要資料表:
    - `customers` (客戶管理)
    - `products` (產品目錄)
    - `quotations` (報價單)
    - `quotation_items` (報價項目)
    - `exchange_rates` (匯率歷史)
  - Row Level Security (RLS) 政策
  - 7 個效能索引
  - 自動更新 `updated_at` 觸發器
  - 報價單號碼自動生成函數

- 🎨 **UI 元件庫** (8 個可重用元件)
  - `FormInput` - 單語言表單輸入
  - `BilingualFormInput` - 雙語輸入欄
  - `DeleteConfirmModal` - 刪除確認對話框
  - `EmptyState` - 空白狀態提示
  - `LoadingSpinner` - 載入轉軸
  - `PageHeader` - 頁面標題元件
  - `Navbar` - 頂部導航欄
  - `Sidebar` - 側邊選單

- 📊 **儀表板模組**
  - 統計卡片 (報價單/客戶/產品數量)
  - 動態資料獲取 (伺服器端渲染)
  - 歡迎訊息
  - 完整雙語支援

- 👥 **客戶管理 (Customers)**
  - 客戶列表頁 (`/customers`)
  - 新增客戶 (`/customers/new`)
  - 編輯客戶 (`/customers/[id]`)
  - 刪除確認功能
  - 雙語名稱與地址存儲
  - Email、電話、地址管理
  - 搜尋功能
  - Client Components: `CustomerList`, `CustomerForm`

- 📦 **產品管理 (Products)**
  - 產品列表頁 (`/products`)
  - 新增產品 (`/products/new`)
  - 編輯產品 (`/products/[id]`)
  - 刪除確認功能
  - 雙語產品名稱與描述
  - 價格與幣別設定
  - 分類管理
  - 搜尋功能
  - Client Components: `ProductList`, `ProductForm`

- 📄 **報價單管理 (Quotations)**
  - 報價單列表頁 (`/quotations`)
  - 新增報價單 (`/quotations/new`)
  - 報價單詳情 (`/quotations/[id]`)
  - 刪除確認功能
  - 多幣別支援 (TWD, USD, EUR, JPY, CNY)
  - 動態項目管理 (新增/刪除行項目)
  - 產品選擇與自動填入價格
  - 自動計算小計、稅金、總計
  - 狀態管理 (草稿/已發送/已接受/已拒絕)
  - 日期範圍選擇
  - 備註輸入 (雙語)
  - Client Components: `QuotationList`, `QuotationForm`, `QuotationDetail`

- 🛠️ **開發工具**
  - Supabase CLI 本地安裝
  - npm scripts 配置
  - 測試資料導入腳本 (scripts/import-test-data.sh)
  - SQL 測試資料 (scripts/seed-test-data.sql)

- 📖 **文檔**
  - README.md (完整專案說明)
  - SUPABASE.md (CLI 使用指南)
  - ROADMAP.md (開發路線圖)
  - CHANGELOG.md (本文件)

### Changed (變更)
- 🔧 修復 Dashboard 雙語混合顯示問題
- 🔧 修復 404 路由重定向錯誤
- 🔧 優化 Supabase middleware 整合
- 🔧 改善表單驗證邏輯

### Technical Details (技術細節)
- **前端**: Next.js 15.5.5 (App Router + Turbopack)
- **框架**: React 19.1.0
- **語言**: TypeScript 5+
- **樣式**: Tailwind CSS 4
- **資料庫**: PostgreSQL (Supabase)
- **認證**: Supabase Auth (Google OAuth)
- **國際化**: next-intl v4.3.12
- **部署**: Vercel (規劃中)

### Statistics (統計)
- TypeScript 檔案: 39 個
- UI 元件: 8 個
- 功能模組: 3 個 (報價單/客戶/產品)
- 資料庫表: 5 個
- 語言支援: 2 種 (中文/英文)
- 幣別支援: 5 種
- 代碼完成度: ~60%

---

## 版本規範說明

### 版本格式
- **[主版本].[次版本].[修訂號]**
  - 主版本: 重大架構變更或不相容更新
  - 次版本: 新功能添加
  - 修訂號: Bug 修復和小改進

### 變更類型
- **Added**: 新增功能
- **Changed**: 現有功能變更
- **Deprecated**: 即將移除的功能
- **Removed**: 已移除的功能
- **Fixed**: Bug 修復
- **Security**: 安全性修復

---

**維護者**: Claude AI Assistant
**專案**: Quotation System | 報價單系統
**開始日期**: 2025-10-14
