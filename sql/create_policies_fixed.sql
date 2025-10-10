-- ===================================================
-- CREAR POLÍTICAS RLS - VERSIÓN CORREGIDA
-- ===================================================

-- Eliminar políticas existentes si existen (sin error si no existen)
DROP POLICY IF EXISTS "admin_users_policy" ON admin_users;
DROP POLICY IF EXISTS "admin_sessions_policy" ON admin_sessions;
DROP POLICY IF EXISTS "admin_logs_policy" ON admin_activity_logs;
DROP POLICY IF EXISTS "banks_policy" ON banks;
DROP POLICY IF EXISTS "categories_policy" ON categories;
DROP POLICY IF EXISTS "rules_policy" ON categorization_rules;

-- Crear nuevas políticas (permitir acceso público para funcionamiento)
CREATE POLICY "admin_users_policy" ON admin_users FOR ALL USING (true);
CREATE POLICY "admin_sessions_policy" ON admin_sessions FOR ALL USING (true);
CREATE POLICY "admin_logs_policy" ON admin_activity_logs FOR ALL USING (true);
CREATE POLICY "banks_policy" ON banks FOR ALL USING (true);
CREATE POLICY "categories_policy" ON categories FOR ALL USING (true);
CREATE POLICY "rules_policy" ON categorization_rules FOR ALL USING (true);

SELECT '✅ Políticas RLS creadas exitosamente!' as status;