-- ===================================================
-- CONFIGURACIÓN DE TABLAS ADMIN PARA PRODUCCIÓN
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

-- 4. Asegurar que las tablas principales existen (verificación)
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

CREATE TABLE IF NOT EXISTS categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    color VARCHAR(7) DEFAULT '#6B7280',
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Políticas para admin_users (solo super_admin puede ver otros admins)
CREATE POLICY "admin_users_own_profile" ON admin_users
    FOR ALL USING (auth.uid()::text = id::text);

CREATE POLICY "admin_users_super_admin_access" ON admin_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id::text = auth.uid()::text
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

-- Políticas para sesiones (solo el propio usuario y super_admin)
CREATE POLICY "admin_sessions_own_access" ON admin_sessions
    FOR ALL USING (admin_user_id::text = auth.uid()::text);

CREATE POLICY "admin_sessions_super_admin_access" ON admin_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id::text = auth.uid()::text
            AND au.role = 'super_admin'
            AND au.is_active = true
        )
    );

-- Políticas para logs (solo lectura para admins)
CREATE POLICY "admin_logs_read_access" ON admin_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id::text = auth.uid()::text
            AND au.is_active = true
        )
    );

-- ===================================================
-- DATOS INICIALES
-- ===================================================

-- Insertar bancos por defecto si no existen
INSERT INTO banks (name, code, parser_class, is_active) VALUES
    ('Banco Falabella', 'FALABELLA', 'BancoFalabellaParser', true),
    ('Banco Santander', 'SANTANDER', 'BancoSantanderParser', true),
    ('Banco Santander Cuenta Corriente', 'SANTANDER_CC', 'BancoSantanderCuentaCorrienteParser', true)
ON CONFLICT (code) DO NOTHING;

-- Insertar categorías por defecto si no existen
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

-- ===================================================
-- FUNCIONES AUXILIARES
-- ===================================================

-- Función para hash de contraseñas (simple, para demo)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    -- En producción real, usar bcrypt o similar
    RETURN encode(digest(password || 'salt_secreto_2024', 'sha256'), 'hex');
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

-- ===================================================
-- MENSAJE DE ÉXITO
-- ===================================================

SELECT 'Tablas admin creadas exitosamente! 🎉' as status;