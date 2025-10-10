-- ===================================================
-- CONFIGURACIÓN COMPLETA PARA PRODUCCIÓN - VERSION CORREGIDA
-- ===================================================

-- 1. Tabla de usuarios administradores
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de sesiones admin
CREATE TABLE IF NOT EXISTS admin_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de logs de actividad admin
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de bancos - VERIFICAR ESTRUCTURA EXISTENTE PRIMERO
DO $$
BEGIN
    -- Verificar si la tabla banks existe
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'banks') THEN
        -- Crear tabla banks desde cero
        CREATE TABLE banks (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            code VARCHAR(50) UNIQUE NOT NULL,
            is_active BOOLEAN DEFAULT true,
            parser_class VARCHAR(255),
            config JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE 'Tabla banks creada desde cero';
    ELSE
        -- Tabla existe, agregar columnas faltantes si es necesario
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'banks' AND column_name = 'parser_class'
        ) THEN
            ALTER TABLE banks ADD COLUMN parser_class VARCHAR(255);
            RAISE NOTICE 'Columna parser_class agregada a banks';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'banks' AND column_name = 'config'
        ) THEN
            ALTER TABLE banks ADD COLUMN config JSONB DEFAULT '{}';
            RAISE NOTICE 'Columna config agregada a banks';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'banks' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE banks ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Columna created_at agregada a banks';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'banks' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE banks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE 'Columna updated_at agregada a banks';
        END IF;
    END IF;
END $$;

-- 5. Tabla de categorías
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

-- 6. Tabla de reglas de categorización
CREATE TABLE IF NOT EXISTS categorization_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('contains', 'starts_with', 'ends_with', 'regex', 'equals')),
    pattern TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    confidence DECIMAL(3,2) DEFAULT 0.95,
    case_sensitive BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- POLÍTICAS RLS (Row Level Security)
-- ===================================================

-- Habilitar RLS en tablas admin
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users (acceso público para login, luego se puede restringir)
DROP POLICY IF EXISTS "admin_users_select_policy" ON admin_users;
CREATE POLICY "admin_users_select_policy" ON admin_users
    FOR SELECT USING (true);  -- Permitir lectura para login

DROP POLICY IF EXISTS "admin_users_update_policy" ON admin_users;
CREATE POLICY "admin_users_update_policy" ON admin_users
    FOR UPDATE USING (true);  -- Permitir actualización para last_login

-- Políticas para sesiones (acceso público para manejo de sesiones)
DROP POLICY IF EXISTS "admin_sessions_policy" ON admin_sessions;
CREATE POLICY "admin_sessions_policy" ON admin_sessions
    FOR ALL USING (true);

-- Políticas para logs (acceso público para registro de actividad)
DROP POLICY IF EXISTS "admin_logs_policy" ON admin_activity_logs;
CREATE POLICY "admin_logs_policy" ON admin_activity_logs
    FOR ALL USING (true);

-- Políticas para tablas públicas (banks, categories, rules)
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banks_policy" ON banks;
CREATE POLICY "banks_policy" ON banks FOR ALL USING (true);

DROP POLICY IF EXISTS "categories_policy" ON categories;
CREATE POLICY "categories_policy" ON categories FOR ALL USING (true);

DROP POLICY IF EXISTS "rules_policy" ON categorization_rules;
CREATE POLICY "rules_policy" ON categorization_rules FOR ALL USING (true);

-- ===================================================
-- FUNCIONES AUXILIARES
-- ===================================================

-- Función para hash de contraseñas
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(password || 'analisisec_salt_2024', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Función para verificar contraseñas
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash_password(password) = hash;
END;
$$ LANGUAGE plpgsql;

-- Función para limpiar sesiones expiradas
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM admin_sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===================================================
-- ÍNDICES PARA PERFORMANCE
-- ===================================================

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_bank ON categorization_rules(bank_id);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_active ON categorization_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_priority ON categorization_rules(priority DESC);
CREATE INDEX IF NOT EXISTS idx_banks_code ON banks(code);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);

-- ===================================================
-- MENSAJE DE ÉXITO
-- ===================================================

SELECT 'Tablas admin y estructura base creadas exitosamente! 🎉' as status;

-- Mostrar estructura de banks para verificar
SELECT 'Estructura de tabla banks:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'banks'
ORDER BY ordinal_position;