-- ===================================================
-- CREAR TABLAS DE ANALYTICS Y MONITOREO
-- ===================================================

-- 1. Tabla de eventos de analytics
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}',
    url TEXT,
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de logs de errores
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    error_data JSONB DEFAULT '{}',
    url TEXT,
    user_agent TEXT,
    ip_address INET,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de métricas de uso
CREATE TABLE IF NOT EXISTS usage_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    total_visits INTEGER DEFAULT 0,
    unique_sessions INTEGER DEFAULT 0,
    files_processed INTEGER DEFAULT 0,
    admin_logins INTEGER DEFAULT 0,
    avg_processing_time_ms INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date)
);

-- 4. Habilitar RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;

-- 5. Políticas (acceso público para logging, lectura solo admin)
DROP POLICY IF EXISTS "analytics_events_insert" ON analytics_events;
CREATE POLICY "analytics_events_insert" ON analytics_events FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events_select" ON analytics_events;
CREATE POLICY "analytics_events_select" ON analytics_events FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
);

DROP POLICY IF EXISTS "error_logs_insert" ON error_logs;
CREATE POLICY "error_logs_insert" ON error_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "error_logs_select" ON error_logs;
CREATE POLICY "error_logs_select" ON error_logs FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
);

DROP POLICY IF EXISTS "usage_metrics_select" ON usage_metrics;
CREATE POLICY "usage_metrics_select" ON usage_metrics FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
);

DROP POLICY IF EXISTS "usage_metrics_insert" ON usage_metrics;
CREATE POLICY "usage_metrics_insert" ON usage_metrics FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
);

DROP POLICY IF EXISTS "usage_metrics_update" ON usage_metrics;
CREATE POLICY "usage_metrics_update" ON usage_metrics FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
);

DROP POLICY IF EXISTS "usage_metrics_delete" ON usage_metrics;
CREATE POLICY "usage_metrics_delete" ON usage_metrics FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM admin_users
        WHERE email = current_setting('request.jwt.claims', true)::json->>'email'
        AND is_active = true
    )
);

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);

CREATE INDEX IF NOT EXISTS idx_error_logs_session ON error_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_date ON usage_metrics(date);

-- 7. Función para actualizar métricas diarias
CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS void AS $$
DECLARE
    today DATE := CURRENT_DATE;
    total_visits_count INTEGER;
    unique_sessions_count INTEGER;
    files_processed_count INTEGER;
    admin_logins_count INTEGER;
    avg_processing_time INTEGER;
    errors_count INTEGER;
BEGIN
    -- Calcular métricas del día
    SELECT COUNT(*) INTO total_visits_count
    FROM analytics_events
    WHERE DATE(timestamp) = today AND event_name = 'page_load';

    SELECT COUNT(DISTINCT session_id) INTO unique_sessions_count
    FROM analytics_events
    WHERE DATE(timestamp) = today;

    SELECT COUNT(*) INTO files_processed_count
    FROM analytics_events
    WHERE DATE(timestamp) = today AND event_name = 'file_processed';

    SELECT COUNT(*) INTO admin_logins_count
    FROM analytics_events
    WHERE DATE(timestamp) = today AND event_name = 'admin_login';

    SELECT COALESCE(AVG((event_data->>'processing_time_ms')::INTEGER), 0)::INTEGER INTO avg_processing_time
    FROM analytics_events
    WHERE DATE(timestamp) = today
    AND event_name = 'file_processed'
    AND event_data->>'processing_time_ms' IS NOT NULL;

    SELECT COUNT(*) INTO errors_count
    FROM error_logs
    WHERE DATE(timestamp) = today;

    -- Insertar o actualizar métricas
    INSERT INTO usage_metrics (
        date,
        total_visits,
        unique_sessions,
        files_processed,
        admin_logins,
        avg_processing_time_ms,
        errors_count,
        updated_at
    ) VALUES (
        today,
        total_visits_count,
        unique_sessions_count,
        files_processed_count,
        admin_logins_count,
        avg_processing_time,
        errors_count,
        NOW()
    )
    ON CONFLICT (date) DO UPDATE SET
        total_visits = EXCLUDED.total_visits,
        unique_sessions = EXCLUDED.unique_sessions,
        files_processed = EXCLUDED.files_processed,
        admin_logins = EXCLUDED.admin_logins,
        avg_processing_time_ms = EXCLUDED.avg_processing_time_ms,
        errors_count = EXCLUDED.errors_count,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Crear vistas para el dashboard admin
CREATE OR REPLACE VIEW admin_dashboard_stats AS
SELECT
    DATE(timestamp) as date,
    COUNT(*) as total_events,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) FILTER (WHERE event_name = 'file_processed') as files_processed,
    COUNT(*) FILTER (WHERE event_name = 'admin_login') as admin_logins
FROM analytics_events
WHERE timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;

CREATE OR REPLACE VIEW recent_errors AS
SELECT
    id,
    error_type,
    error_data->>'message' as error_message,
    url,
    timestamp,
    resolved
FROM error_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 50;

-- 9. Función para limpiar datos antiguos (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS INTEGER AS $$
DECLARE
    deleted_events INTEGER;
    deleted_errors INTEGER;
BEGIN
    -- Eliminar eventos más antiguos de 90 días
    DELETE FROM analytics_events
    WHERE timestamp < CURRENT_DATE - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_events = ROW_COUNT;

    -- Eliminar errores resueltos más antiguos de 30 días
    DELETE FROM error_logs
    WHERE timestamp < CURRENT_DATE - INTERVAL '30 days'
    AND resolved = true;
    GET DIAGNOSTICS deleted_errors = ROW_COUNT;

    RETURN deleted_events + deleted_errors;
END;
$$ LANGUAGE plpgsql;

SELECT '📊 Tablas de analytics creadas exitosamente!' as status;