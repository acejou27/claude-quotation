-- ============================================================================
-- 🔍 快速檢查：確認表是否存在
-- 在 Supabase Dashboard SQL Editor 執行
-- ============================================================================

-- 列出所有 public schema 的表
SELECT
  tablename as "表名",
  schemaname as "Schema"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 如果看到 19+ 個表，表示 migration 成功
-- 如果看到 0 個或很少的表，表示 migration 沒有完全執行
