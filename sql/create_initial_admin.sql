-- ===================================================
-- CREAR USUARIO ADMIN INICIAL
-- ===================================================
-- Este script crea un usuario administrador inicial para acceder al panel admin
-- Por defecto: admin@analisisec.com / admin123
-- ⚠️ IMPORTANTE: Cambiar la contraseña después del primer login

-- Verificar que la función hash_password existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc WHERE proname = 'hash_password'
    ) THEN
        RAISE EXCEPTION 'La función hash_password no existe. Ejecuta setup_admin_tables_fixed.sql primero.';
    END IF;
END $$;

-- Insertar usuario admin si no existe
INSERT INTO admin_users (
    email,
    password_hash,
    full_name,
    role,
    is_active
)
SELECT
    'admin@analisisec.com',
    hash_password('admin123'),
    'Administrador Principal',
    'super_admin',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM admin_users WHERE email = 'admin@analisisec.com'
);

-- Mensaje de confirmación
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM admin_users WHERE email = 'admin@analisisec.com') THEN
        RAISE NOTICE '✅ Usuario admin creado/verificado exitosamente';
        RAISE NOTICE '📧 Email: admin@analisisec.com';
        RAISE NOTICE '🔑 Password: admin123';
        RAISE NOTICE '⚠️  IMPORTANTE: Cambiar esta contraseña después del primer login';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear el usuario admin';
    END IF;
END $$;

-- Verificar permisos
SELECT
    '📊 Usuario Admin Registrado:' as status,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM admin_users
WHERE email = 'admin@analisisec.com';
