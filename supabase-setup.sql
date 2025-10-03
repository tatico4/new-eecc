-- ===================================================================
-- SCRIPT DE CONFIGURACIÓN SUPABASE - SISTEMA DE CATALOGACIÓN DE GLOSAS
-- ===================================================================

-- 1. TABLA: banks (Catálogo de Bancos)
-- ===================================================================
CREATE TABLE IF NOT EXISTS banks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(3) DEFAULT 'CL',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: products (Productos Financieros)
-- ===================================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bank_id, code)
);

-- 3. TABLA: categories (Categorías de Transacciones)
-- ===================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(10),
  color VARCHAR(7),
  parent_id UUID REFERENCES categories(id),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: categorization_rules (Reglas de Categorización)
-- ===================================================================
CREATE TABLE IF NOT EXISTS categorization_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Jerarquía (NULL = global)
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,

  -- Categorización
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,

  -- Regla
  rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('exact_match', 'contains', 'starts_with', 'ends_with', 'regex')),
  pattern TEXT NOT NULL,
  case_sensitive BOOLEAN DEFAULT false,

  -- Metadatos
  priority INTEGER DEFAULT 100,
  confidence DECIMAL(3,2) DEFAULT 0.95,
  description TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Evitar duplicados
  UNIQUE(bank_id, product_id, pattern, rule_type)
);

-- 5. TABLA: categorization_audit (Auditoría de Uso)
-- ===================================================================
CREATE TABLE IF NOT EXISTS categorization_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES categorization_rules(id),

  -- Contexto
  original_description TEXT NOT NULL,
  matched_pattern TEXT,
  assigned_category VARCHAR(50),
  confidence_score DECIMAL(3,2),

  -- Metadatos de uso
  bank_detected VARCHAR(50),
  product_detected VARCHAR(50),
  parser_version VARCHAR(20),

  -- Control
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_session VARCHAR(100)
);

-- 6. ÍNDICES PARA PERFORMANCE
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_categorization_rules_hierarchy ON categorization_rules(bank_id, product_id, priority);
CREATE INDEX IF NOT EXISTS idx_categorization_rules_pattern ON categorization_rules(pattern, rule_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categorization_audit_date ON categorization_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_products_bank ON products(bank_id, code);

-- 7. DATOS INICIALES: Bancos
-- ===================================================================
INSERT INTO banks (code, name) VALUES
('BancoFalabella', 'Banco Falabella'),
('BancoChile', 'Banco de Chile'),
('BancoSantander', 'Banco Santander'),
('BCI', 'BCI - Banco de Crédito e Inversiones'),
('BancoEstado', 'Banco Estado'),
('Scotiabank', 'Scotiabank Chile')
ON CONFLICT (code) DO NOTHING;

-- 8. DATOS INICIALES: Productos
-- ===================================================================
INSERT INTO products (bank_id, code, name, type)
SELECT b.id, 'TarjetaCredito', 'Tarjeta de Crédito', 'credit_card'
FROM banks b
ON CONFLICT (bank_id, code) DO NOTHING;

INSERT INTO products (bank_id, code, name, type)
SELECT b.id, 'CuentaCorriente', 'Cuenta Corriente', 'checking_account'
FROM banks b
ON CONFLICT (bank_id, code) DO NOTHING;

INSERT INTO products (bank_id, code, name, type)
SELECT b.id, 'CuentaAhorro', 'Cuenta de Ahorro', 'savings_account'
FROM banks b
ON CONFLICT (bank_id, code) DO NOTHING;

-- 9. DATOS INICIALES: Categorías
-- ===================================================================
INSERT INTO categories (code, name, icon, color, sort_order) VALUES
('alimentacion', 'Alimentación', '🍽️', '#FF6384', 1),
('transporte', 'Transporte', '🚗', '#36A2EB', 2),
('salud', 'Salud', '⚕️', '#4BC0C0', 3),
('entretenimiento', 'Entretenimiento', '🎬', '#9966FF', 4),
('compras', 'Compras', '🛍️', '#FFCE56', 5),
('servicios', 'Servicios', '💡', '#FF9F40', 6),
('transferencias', 'Transferencias', '💸', '#E74C3C', 7),
('seguros', 'Seguros', '🛡️', '#2ECC71', 8),
('educacion', 'Educación', '📚', '#3498DB', 9),
('hogar', 'Hogar', '🏠', '#F39C12', 10),
('otros', 'Otros', '📦', '#95A5A6', 99)
ON CONFLICT (code) DO NOTHING;

-- 10. REGLAS INICIALES: Globales (aplican a todos los bancos)
-- ===================================================================
INSERT INTO categorization_rules (category_id, rule_type, pattern, priority, description, created_by)
SELECT
  c.id,
  'contains',
  rules.pattern,
  rules.priority,
  rules.rule_description,
  'system_init'
FROM categories c
CROSS JOIN (VALUES
  -- Alimentación
  ('alimentacion', 'sodimac', 10, 'Compras en Sodimac (hogar/construcción)'),
  ('alimentacion', 'falabella', 15, 'Compras en Falabella (retail)'),
  ('alimentacion', 'uber eats', 5, 'Delivery de comida Uber Eats'),
  ('alimentacion', 'rappi', 5, 'Delivery de comida Rappi'),
  ('alimentacion', 'pedidos ya', 5, 'Delivery de comida PedidosYa'),
  ('alimentacion', 'supermercado', 8, 'Compras en supermercado'),
  ('alimentacion', 'unimarc', 8, 'Supermercado Unimarc'),
  ('alimentacion', 'lider', 8, 'Supermercado Líder'),
  ('alimentacion', 'jumbo', 8, 'Supermercado Jumbo'),

  -- Transporte
  ('transporte', 'copec', 10, 'Estación de servicio Copec'),
  ('transporte', 'shell', 10, 'Estación de servicio Shell'),
  ('transporte', 'esso', 10, 'Estación de servicio Esso'),
  ('transporte', 'bencina', 5, 'Compra de combustible'),
  ('transporte', 'gasolina', 5, 'Compra de combustible'),
  ('transporte', 'peaje', 15, 'Pago de peaje'),
  ('transporte', 'uber', 8, 'Servicio de transporte Uber'),
  ('transporte', 'taxi', 12, 'Servicio de taxi'),
  ('transporte', 'metro', 20, 'Metro/transporte público'),

  -- Servicios
  ('servicios', 'enel', 5, 'Servicio eléctrico'),
  ('servicios', 'cge', 5, 'Servicio eléctrico CGE'),
  ('servicios', 'metrogas', 5, 'Servicio de gas'),
  ('servicios', 'lipigas', 5, 'Servicio de gas'),
  ('servicios', 'aguas andinas', 5, 'Servicio de agua'),
  ('servicios', 'netflix', 10, 'Streaming Netflix'),
  ('servicios', 'spotify', 10, 'Streaming Spotify'),
  ('servicios', 'movistar', 8, 'Telecomunicaciones'),
  ('servicios', 'entel', 8, 'Telecomunicaciones'),
  ('servicios', 'claro', 8, 'Telecomunicaciones'),
  ('servicios', 'vtr', 8, 'Internet/cable'),

  -- Salud
  ('salud', 'farmacia', 5, 'Compras en farmacia'),
  ('salud', 'cruz verde', 5, 'Farmacia Cruz Verde'),
  ('salud', 'salcobrand', 5, 'Farmacia Salcobrand'),
  ('salud', 'ahumada', 5, 'Farmacia Ahumada'),
  ('salud', 'clinica', 10, 'Atención en clínica'),
  ('salud', 'hospital', 10, 'Atención hospitalaria'),
  ('salud', 'isapre', 8, 'Pago de Isapre'),
  ('salud', 'fonasa', 8, 'Pago Fonasa'),

  -- Seguros
  ('seguros', 'seg desgravamen', 5, 'Seguro de desgravamen'),
  ('seguros', 'seg cesantia', 5, 'Seguro de cesantía'),
  ('seguros', 'seguro', 15, 'Pago de seguro general'),

  -- Entretenimiento
  ('entretenimiento', 'cine', 10, 'Entradas de cine'),
  ('entretenimiento', 'restaurant', 8, 'Restaurantes'),
  ('entretenimiento', 'bar', 12, 'Bares y pubs'),
  ('entretenimiento', 'mall', 15, 'Compras en mall')
) AS rules(category_code, pattern, priority, rule_description)
WHERE c.code = rules.category_code
ON CONFLICT (bank_id, product_id, pattern, rule_type) DO NOTHING;

-- 11. REGLAS ESPECÍFICAS: Banco Falabella
-- ===================================================================
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, description, created_by)
SELECT
  b.id,
  c.id,
  'exact_match',
  rules.pattern,
  rules.priority,
  rules.rule_description,
  'system_init'
FROM banks b
CROSS JOIN categories c
CROSS JOIN (VALUES
  ('otros', 'anulacion pago tarjeta cmr eec', 1, 'Anulación específica CMR'),
  ('seguros', '01-12 seg desgravamen', 5, 'Seguro desgravamen formato específico'),
  ('seguros', '09-12 seg cesantia', 5, 'Seguro cesantía formato específico')
) AS rules(category_code, pattern, priority, rule_description)
WHERE b.code = 'BancoFalabella' AND c.code = rules.category_code
ON CONFLICT (bank_id, product_id, pattern, rule_type) DO NOTHING;

-- ===================================================================
-- CONFIGURACIÓN COMPLETADA
-- ===================================================================

-- Verificar instalación
SELECT
  'SETUP COMPLETED' as status,
  (SELECT COUNT(*) FROM banks) as banks_count,
  (SELECT COUNT(*) FROM products) as products_count,
  (SELECT COUNT(*) FROM categories) as categories_count,
  (SELECT COUNT(*) FROM categorization_rules) as rules_count;