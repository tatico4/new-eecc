-- ===================================================
-- PASO 1: CREAR SOLO EL USUARIO ADMIN
-- ===================================================

-- CREAR TU USUARIO ADMIN (CAMBIA ESTOS DATOS POR LOS TUYOS)
INSERT INTO admin_users (
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'franciscobravo@live.cl',  -- TU EMAIL AQUÍ
    hash_password('admin123456'),  -- TU CONTRASEÑA AQUÍ
    'Francisco Bravo',  -- TU NOMBRE AQUÍ
    'super_admin',
    true
) ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active;

-- Verificar que se creó correctamente
SELECT
    id,
    email,
    full_name,
    role,
    is_active,
    created_at
FROM admin_users
WHERE email = 'franciscobravo@live.cl';

SELECT '✅ Usuario admin creado exitosamente!' as status;