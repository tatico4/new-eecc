-- ===================================================
-- CORREGIR TABLA BANKS - BASADO EN ESTRUCTURA ACTUAL
-- ===================================================

-- La tabla banks ya existe con:
-- - id (uuid)
-- - code (varchar(50)) ✅
-- - name (varchar(100)) ✅
-- - country (varchar(3))
-- - is_active (boolean) ✅
-- - created_at (timestamptz) ✅

-- PASO 1: Agregar columnas faltantes
ALTER TABLE banks ADD COLUMN IF NOT EXISTS parser_class VARCHAR(255);
ALTER TABLE banks ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';
ALTER TABLE banks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- PASO 2: Ampliar la columna name si es necesario (de 100 a 255)
ALTER TABLE banks ALTER COLUMN name TYPE VARCHAR(255);

-- PASO 3: Insertar bancos (usar códigos cortos)
INSERT INTO banks (name, code, parser_class, is_active, country) VALUES
    ('Banco Falabella', 'FALABELLA', 'BancoFalabellaParser', true, 'CL'),
    ('Banco Santander', 'SANTANDER', 'BancoSantanderParser', true, 'CL'),
    ('Banco Santander Cuenta Corriente', 'SANTANDER_CC', 'BancoSantanderCuentaCorrienteParser', true, 'CL')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    parser_class = EXCLUDED.parser_class,
    is_active = EXCLUDED.is_active,
    country = EXCLUDED.country;

-- PASO 4: Verificar que se insertaron correctamente
SELECT id, name, code, parser_class, is_active, country
FROM banks
ORDER BY name;

-- PASO 5: Crear tabla de categorías si no existe
CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PASO 6: Insertar categorías
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
ON CONFLICT (name) DO UPDATE SET
    color = EXCLUDED.color,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- PASO 7: Verificar categorías
SELECT id, name, color, icon, sort_order
FROM categories
ORDER BY sort_order;

SELECT '✅ Tabla banks corregida y categorías creadas exitosamente!' as status;