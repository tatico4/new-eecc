-- ===================================================
-- CREAR USUARIO ADMINISTRADOR PERSONAL
-- ===================================================

-- Insertar tu usuario admin personal
-- IMPORTANTE: Cambia estos datos por los tuyos
INSERT INTO admin_users (
    email,
    password_hash,
    full_name,
    role,
    is_active
) VALUES (
    'fandbravo@gmail.com',  -- TU EMAIL AQUÍ
    hash_password('admin123456'),  -- TU CONTRASEÑA AQUÍ (cámbiala después)
    'Francisco Bravo',  -- TU NOMBRE COMPLETO
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
WHERE email = 'fandbravo@gmail.com';

-- ===================================================
-- REGLAS Y DATOS INICIALES
-- ===================================================

-- Asegurar que las categorías principales existen
INSERT INTO categories (name, color, icon, sort_order) VALUES
    ('Alimentación', '#EF4444', 'fas fa-utensils', 1),
    ('Transporte', '#3B82F6', 'fas fa-car', 2),
    ('Entretenimiento', '#8B5CF6', 'fas fa-gamepad', 3),
    ('Salud', '#10B981', 'fas fa-heart-pulse', 4),
    ('Educación', '#F59E0B', 'fas fa-graduation-cap', 5),
    ('Servicios', '#6B7280', 'fas fa-cog', 6),
    ('Compras', '#EC4899', 'fas fa-shopping-bag', 7),
    ('Transferencias', '#06B6D4', 'fas fa-exchange-alt', 8),
    ('Comisiones Bancarias', '#DC2626', 'fas fa-university', 9),
    ('Otros', '#9CA3AF', 'fas fa-question-circle', 10)
ON CONFLICT (name) DO NOTHING;

-- Reglas básicas de categorización (ejemplos)
-- NOTA: Estas son las reglas que ya tienes funcionando localmente

-- Obtener IDs de bancos y categorías para las reglas
DO $$
DECLARE
    banco_falabella_id UUID;
    banco_santander_id UUID;
    cat_alimentacion_id UUID;
    cat_transporte_id UUID;
    cat_servicios_id UUID;
    cat_transferencias_id UUID;
    cat_comisiones_id UUID;
    admin_user_id UUID;
BEGIN
    -- Obtener IDs
    SELECT id INTO banco_falabella_id FROM banks WHERE code = 'FALABELLA';
    SELECT id INTO banco_santander_id FROM banks WHERE code = 'SANTANDER';
    SELECT id INTO cat_alimentacion_id FROM categories WHERE name = 'Alimentación';
    SELECT id INTO cat_transporte_id FROM categories WHERE name = 'Transporte';
    SELECT id INTO cat_servicios_id FROM categories WHERE name = 'Servicios';
    SELECT id INTO cat_transferencias_id FROM categories WHERE name = 'Transferencias';
    SELECT id INTO cat_comisiones_id FROM categories WHERE name = 'Comisiones Bancarias';
    SELECT id INTO admin_user_id FROM admin_users WHERE email = 'fandbravo@gmail.com';

    -- Reglas para alimentación
    INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
    VALUES
        (banco_falabella_id, cat_alimentacion_id, 'contains', 'UBER EATS', 90, 0.98, admin_user_id, 'Delivery de comida'),
        (banco_falabella_id, cat_alimentacion_id, 'contains', 'RAPPI', 90, 0.98, admin_user_id, 'Delivery de comida'),
        (banco_falabella_id, cat_alimentacion_id, 'contains', 'MCDONALDS', 85, 0.95, admin_user_id, 'Restaurante comida rápida'),
        (banco_falabella_id, cat_alimentacion_id, 'contains', 'SUBWAY', 85, 0.95, admin_user_id, 'Restaurante comida rápida'),
        (banco_santander_id, cat_alimentacion_id, 'contains', 'UBER EATS', 90, 0.98, admin_user_id, 'Delivery de comida'),
        (banco_santander_id, cat_alimentacion_id, 'contains', 'RAPPI', 90, 0.98, admin_user_id, 'Delivery de comida')
    ON CONFLICT DO NOTHING;

    -- Reglas para transporte
    INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
    VALUES
        (banco_falabella_id, cat_transporte_id, 'contains', 'UBER', 85, 0.95, admin_user_id, 'Transporte Uber'),
        (banco_falabella_id, cat_transporte_id, 'contains', 'COPEC', 80, 0.90, admin_user_id, 'Combustible'),
        (banco_falabella_id, cat_transporte_id, 'contains', 'SHELL', 80, 0.90, admin_user_id, 'Combustible'),
        (banco_santander_id, cat_transporte_id, 'contains', 'UBER', 85, 0.95, admin_user_id, 'Transporte Uber'),
        (banco_santander_id, cat_transporte_id, 'contains', 'COPEC', 80, 0.90, admin_user_id, 'Combustible')
    ON CONFLICT DO NOTHING;

    -- Reglas para transferencias
    INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
    VALUES
        (banco_falabella_id, cat_transferencias_id, 'contains', 'TRANSFERENCIA', 95, 0.99, admin_user_id, 'Transferencias generales'),
        (banco_falabella_id, cat_transferencias_id, 'contains', 'TRF BCO', 95, 0.99, admin_user_id, 'Transferencias bancarias'),
        (banco_santander_id, cat_transferencias_id, 'contains', 'TRANSFERENCIA', 95, 0.99, admin_user_id, 'Transferencias generales'),
        (banco_santander_id, cat_transferencias_id, 'contains', 'TRF BCO', 95, 0.99, admin_user_id, 'Transferencias bancarias')
    ON CONFLICT DO NOTHING;

    -- Reglas para comisiones bancarias
    INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
    VALUES
        (banco_falabella_id, cat_comisiones_id, 'contains', 'COMISION', 100, 0.99, admin_user_id, 'Comisiones bancarias'),
        (banco_falabella_id, cat_comisiones_id, 'contains', 'SEGURO', 90, 0.95, admin_user_id, 'Seguros bancarios'),
        (banco_falabella_id, cat_comisiones_id, 'contains', 'MANTENCIÓN', 95, 0.98, admin_user_id, 'Mantención de cuenta'),
        (banco_santander_id, cat_comisiones_id, 'contains', 'COMISION', 100, 0.99, admin_user_id, 'Comisiones bancarias'),
        (banco_santander_id, cat_comisiones_id, 'contains', 'SEGURO', 90, 0.95, admin_user_id, 'Seguros bancarios')
    ON CONFLICT DO NOTHING;

END $$;

-- Mensaje de confirmación
SELECT 'Usuario admin creado y reglas básicas configuradas! 🎉' as status;

-- Mostrar resumen
SELECT
    'Reglas creadas por banco:' as resumen,
    b.name as banco,
    COUNT(cr.*) as total_reglas
FROM banks b
LEFT JOIN categorization_rules cr ON b.id = cr.bank_id
WHERE b.is_active = true
GROUP BY b.id, b.name
ORDER BY b.name;