-- ===================================================
-- VERIFICAR Y CORREGIR ESTRUCTURA DE TABLA BANKS
-- ===================================================

-- Primero verificar qué columnas existen en la tabla banks
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'banks'
ORDER BY ordinal_position;

-- Si la tabla banks no existe o está incompleta, la creamos/actualizamos
CREATE TABLE IF NOT EXISTS banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    parser_class VARCHAR(255),
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columna parser_class si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'banks' AND column_name = 'parser_class'
    ) THEN
        ALTER TABLE banks ADD COLUMN parser_class VARCHAR(255);
    END IF;
END $$;

-- Agregar columna config si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'banks' AND column_name = 'config'
    ) THEN
        ALTER TABLE banks ADD COLUMN config JSONB DEFAULT '{}';
    END IF;
END $$;

-- Ahora insertar los bancos
INSERT INTO banks (name, code, parser_class, is_active) VALUES
    ('Banco Falabella', 'FALABELLA', 'BancoFalabellaParser', true),
    ('Banco Santander', 'SANTANDER', 'BancoSantanderParser', true),
    ('Banco Santander Cuenta Corriente', 'SANTANDER_CC', 'BancoSantanderCuentaCorrienteParser', true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    parser_class = EXCLUDED.parser_class,
    is_active = EXCLUDED.is_active;

-- Verificar que se insertaron correctamente
SELECT * FROM banks ORDER BY name;

-- Continuar con categorías si todo está bien
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

SELECT 'Tablas banks y categories configuradas correctamente! ✅' as status;