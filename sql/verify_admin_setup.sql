-- ===================================================
-- VERIFICAR SETUP DE SISTEMA ADMIN
-- ===================================================
-- Este script verifica que todas las tablas y funciones necesarias existan

-- 1. Verificar tablas
SELECT
    'Verificando tablas...' as status;

SELECT
    table_name,
    CASE
        WHEN table_name IN ('admin_users', 'admin_sessions', 'admin_activity_logs') THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('admin_users', 'admin_sessions', 'admin_activity_logs')
ORDER BY table_name;

-- 2. Verificar funciones
SELECT
    'Verificando funciones...' as status;

SELECT
    routine_name as function_name,
    CASE
        WHEN routine_name IN ('hash_password', 'verify_password') THEN '✅ Existe'
        ELSE '❌ No existe'
    END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN ('hash_password', 'verify_password')
ORDER BY routine_name;

-- 3. Verificar políticas RLS
SELECT
    'Verificando políticas RLS...' as status;

SELECT
    schemaname,
    tablename,
    policyname
FROM pg_policies
WHERE tablename IN ('admin_users', 'admin_sessions', 'admin_activity_logs')
ORDER BY tablename, policyname;

-- 4. Verificar usuarios admin existentes
SELECT
    'Verificando usuarios admin...' as status;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        PERFORM email, full_name, role, is_active, created_at
        FROM admin_users;

        RAISE NOTICE 'Total usuarios admin: %', (SELECT COUNT(*) FROM admin_users);
    ELSE
        RAISE NOTICE '⚠️ La tabla admin_users NO EXISTE';
    END IF;
END $$;

SELECT email, full_name, role, is_active, created_at
FROM admin_users
WHERE table_exists('admin_users');

-- Helper function
CREATE OR REPLACE FUNCTION table_exists(table_name text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
            AND tables.table_name = $1
    );
END;
$$ LANGUAGE plpgsql;

-- Ejecutar verificación final
SELECT
    CASE
        WHEN table_exists('admin_users') THEN '✅ admin_users existe'
        ELSE '❌ admin_users NO existe - ejecuta setup_admin_tables_fixed.sql'
    END as admin_users_status,
    CASE
        WHEN table_exists('admin_sessions') THEN '✅ admin_sessions existe'
        ELSE '❌ admin_sessions NO existe'
    END as admin_sessions_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'hash_password') THEN '✅ hash_password existe'
        ELSE '❌ hash_password NO existe'
    END as hash_function_status;
