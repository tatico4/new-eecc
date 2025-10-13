-- ===================================================================
-- MIGRACIÓN COMPLETA: Categorización, Tooltips y Training
-- ===================================================================

-- 1. TABLA: custom_categorization_patterns
-- ===================================================================
CREATE TABLE IF NOT EXISTS custom_categorization_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Patrón
  pattern TEXT NOT NULL UNIQUE,
  category_code VARCHAR(50) NOT NULL,

  -- Configuración
  confidence DECIMAL(3,2) DEFAULT 0.95,
  case_sensitive BOOLEAN DEFAULT false,

  -- Metadatos
  source VARCHAR(50) DEFAULT 'admin',
  description TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: transaction_tooltips
-- ===================================================================
CREATE TABLE IF NOT EXISTS transaction_tooltips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificador de transacción
  transaction_code TEXT NOT NULL UNIQUE,

  -- Contenido del tooltip
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  category_code VARCHAR(50),
  examples TEXT[], -- Array de ejemplos

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: tooltip_exceptions
-- ===================================================================
CREATE TABLE IF NOT EXISTS tooltip_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Patrón de excepción
  pattern TEXT NOT NULL UNIQUE,
  reason TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: training_sessions
-- ===================================================================
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Datos de la sesión
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  transactions_processed INTEGER DEFAULT 0,
  corrections_applied INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),

  -- Metadatos
  notes TEXT,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===================================================================
-- ÍNDICES PARA PERFORMANCE
-- ===================================================================

-- Patrones de categorización
CREATE INDEX IF NOT EXISTS idx_custom_patterns_category
  ON custom_categorization_patterns(category_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_patterns_pattern
  ON custom_categorization_patterns(pattern) WHERE is_active = true;

-- Tooltips
CREATE INDEX IF NOT EXISTS idx_tooltips_code
  ON transaction_tooltips(transaction_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tooltips_category
  ON transaction_tooltips(category_code) WHERE is_active = true;

-- Excepciones de tooltips
CREATE INDEX IF NOT EXISTS idx_tooltip_exceptions_pattern
  ON tooltip_exceptions(pattern) WHERE is_active = true;

-- Training sessions
CREATE INDEX IF NOT EXISTS idx_training_sessions_date
  ON training_sessions(session_date DESC);

-- ===================================================================
-- CONFIGURACIÓN COMPLETADA
-- ===================================================================

-- Verificar instalación
SELECT
  'COMPLETE MIGRATION SETUP' as status,
  (SELECT COUNT(*) FROM custom_categorization_patterns) as custom_patterns_count,
  (SELECT COUNT(*) FROM transaction_tooltips) as tooltips_count,
  (SELECT COUNT(*) FROM tooltip_exceptions) as exceptions_count,
  (SELECT COUNT(*) FROM training_sessions) as training_sessions_count;
