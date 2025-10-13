-- ===================================================================
-- SCRIPT DE CONFIGURACIÓN: REGLAS DE FILTRADO Y CORRECCIONES
-- ===================================================================

-- 1. TABLA: filtering_rules (Reglas para filtrar líneas del PDF)
-- ===================================================================
CREATE TABLE IF NOT EXISTS filtering_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Jerarquía (NULL = global, aplica a todos los bancos)
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,

  -- Regla de filtrado
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('exact_match', 'contains', 'starts_with', 'ends_with', 'regex')),
  text_pattern TEXT NOT NULL,
  description TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar duplicados
  UNIQUE(bank_id, text_pattern, rule_type)
);

-- 2. TABLA: description_corrections (Correcciones de descripción)
-- ===================================================================
CREATE TABLE IF NOT EXISTS description_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Jerarquía (NULL = global)
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,

  -- Corrección
  correction_type VARCHAR(20) NOT NULL CHECK (correction_type IN ('word_replace', 'exact_replace', 'regex_replace', 'case_normalize')),
  pattern TEXT NOT NULL,
  replacement TEXT NOT NULL,
  case_insensitive BOOLEAN DEFAULT true,
  description TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar duplicados
  UNIQUE(bank_id, pattern, correction_type)
);

-- 3. ÍNDICES PARA PERFORMANCE
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_filtering_rules_bank ON filtering_rules(bank_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_filtering_rules_pattern ON filtering_rules(text_pattern, rule_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_description_corrections_bank ON description_corrections(bank_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_description_corrections_pattern ON description_corrections(pattern) WHERE is_active = true;

-- 4. DATOS INICIALES: Reglas de filtrado globales
-- ===================================================================
INSERT INTO filtering_rules (rule_type, text_pattern, description, created_by)
VALUES
  ('contains', 'página', 'Filtrar numeración de páginas', 'system'),
  ('contains', 'www.', 'Filtrar URLs web', 'system'),
  ('contains', 'http', 'Filtrar URLs HTTP', 'system'),
  ('contains', 'página de', 'Filtrar texto de paginación', 'system')
ON CONFLICT (bank_id, text_pattern, rule_type) DO NOTHING;

-- 5. DATOS INICIALES: Reglas de filtrado Banco Falabella
-- ===================================================================
INSERT INTO filtering_rules (bank_id, rule_type, text_pattern, description, created_by)
SELECT
  b.id,
  'contains',
  'CMR Puntos',
  'Filtrar notificaciones de puntos CMR',
  'system'
FROM banks b
WHERE b.code = 'BancoFalabella'
ON CONFLICT (bank_id, text_pattern, rule_type) DO NOTHING;

-- 6. DATOS INICIALES: Correcciones globales de descripción
-- ===================================================================
INSERT INTO description_corrections (correction_type, pattern, replacement, case_insensitive, description, created_by)
VALUES
  ('word_replace', 'falabella', 'Falabella', true, 'Capitalizar nombre Falabella', 'system'),
  ('word_replace', 'sodimac', 'Sodimac', true, 'Capitalizar nombre Sodimac', 'system'),
  ('word_replace', 'uber', 'Uber', true, 'Capitalizar nombre Uber', 'system'),
  ('word_replace', 'rappi', 'Rappi', true, 'Capitalizar nombre Rappi', 'system'),
  ('word_replace', 'lider', 'Líder', true, 'Capitalizar y corregir Líder', 'system'),
  ('word_replace', 'jumbo', 'Jumbo', true, 'Capitalizar nombre Jumbo', 'system')
ON CONFLICT (bank_id, pattern, correction_type) DO NOTHING;

-- 7. DATOS INICIALES: Correcciones específicas Banco Falabella
-- ===================================================================
INSERT INTO description_corrections (bank_id, correction_type, pattern, replacement, case_insensitive, description, created_by)
SELECT
  b.id,
  'exact_replace',
  'compra falabella plaza vespucio t',
  'Compra Falabella Plaza Vespucio',
  true,
  'Limpiar descripción Falabella Plaza Vespucio',
  'system'
FROM banks b
WHERE b.code = 'BancoFalabella'
ON CONFLICT (bank_id, pattern, correction_type) DO NOTHING;

INSERT INTO description_corrections (bank_id, correction_type, pattern, replacement, case_insensitive, description, created_by)
SELECT
  b.id,
  'exact_replace',
  'anulacion pago tarjeta cmr eec 0 01/01',
  'Anulación pago tarjeta CMR',
  true,
  'Limpiar anulación CMR',
  'system'
FROM banks b
WHERE b.code = 'BancoFalabella'
ON CONFLICT (bank_id, pattern, correction_type) DO NOTHING;

-- ===================================================================
-- CONFIGURACIÓN COMPLETADA
-- ===================================================================

-- Verificar instalación
SELECT
  'FILTERING RULES SETUP COMPLETED' as status,
  (SELECT COUNT(*) FROM filtering_rules) as filtering_rules_count,
  (SELECT COUNT(*) FROM description_corrections) as corrections_count;
