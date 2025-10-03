-- ===================================================================
-- REGLAS ESPECÍFICAS PARA BANCO SANTANDER - TARJETA DE CRÉDITO
-- ===================================================================

-- Reglas específicas para Banco Santander basadas en transacciones reales
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, description, created_by)
SELECT
  b.id,
  c.id,
  'contains',
  rules.pattern,
  rules.priority,
  rules.rule_description,
  'system_santander'
FROM banks b
CROSS JOIN categories c
CROSS JOIN (VALUES
  -- Transporte específico Santander
  ('transporte', 'PAYU *UBER TRIP', 5, 'Uber a través de PayU (Santander)'),
  ('transporte', 'MERPAGO*CABIFY', 8, 'Cabify a través de MercadoPago (Santander)'),

  -- Alimentación específico Santander
  ('alimentacion', 'DL RAPPI CHILE RAPP', 5, 'Rappi Chile delivery (Santander)'),
  ('alimentacion', 'DLOCAL *RAPPI PRO CHILE', 5, 'Rappi Pro Chile (Santander)'),

  -- Servicios específico Santander
  ('servicios', 'PPRO ADOBE', 10, 'Adobe a través de PPRO (Santander)'),
  ('servicios', 'ADOBE ADOBE', 10, 'Adobe directo (Santander)'),
  ('servicios', 'DL*GOOGLE YOUTUBE', 12, 'YouTube Premium (Santander)'),

  -- Comercio específico Santander
  ('alimentacion', 'LA BURGUESIA', 15, 'Restaurante La Burguesía (Santander)'),

  -- Pagos específico Santander
  ('transferencias', 'MERPAGO*ALIPAYSINGAPOREEC', 8, 'Pagos internacionales MercadoPago (Santander)'),

  -- Cargos bancarios específicos Santander
  ('servicios', 'COMISION DE MANTENCION', 1, 'Comisión mantenimiento tarjeta Santander'),
  ('servicios', 'SERVICIO USO INTERNACIONAL', 1, 'Servicio uso internacional Santander'),
  ('servicios', 'IVA USO INTERNACIONAL', 1, 'IVA uso internacional Santander')
) AS rules(category_code, pattern, priority, rule_description)
WHERE b.code = 'BancoSantander' AND c.code = rules.category_code
ON CONFLICT (bank_id, product_id, pattern, rule_type) DO NOTHING;

-- Reglas para el producto específico de Tarjeta de Crédito Santander
INSERT INTO categorization_rules (bank_id, product_id, category_id, rule_type, pattern, priority, description, created_by)
SELECT
  b.id,
  p.id,
  c.id,
  'exact_match',
  rules.pattern,
  rules.priority,
  rules.rule_description,
  'system_santander_tc'
FROM banks b
CROSS JOIN products p
CROSS JOIN categories c
CROSS JOIN (VALUES
  -- Patrones exactos para tarjeta de crédito Santander
  ('otros', 'MONTO CANCELADO', 1, 'Pago realizado tarjeta Santander'),
  ('servicios', 'INTERESES', 1, 'Intereses por saldo tarjeta Santander'),
  ('servicios', 'IMPUESTOS', 1, 'Impuestos tarjeta Santander')
) AS rules(category_code, pattern, priority, rule_description)
WHERE b.code = 'BancoSantander'
  AND p.code = 'TarjetaCredito'
  AND c.code = rules.category_code
ON CONFLICT (bank_id, product_id, pattern, rule_type) DO NOTHING;

-- Verificar la inserción
SELECT
  'SANTANDER RULES ADDED' as status,
  COUNT(*) as rules_count
FROM categorization_rules cr
JOIN banks b ON cr.bank_id = b.id
WHERE b.code = 'BancoSantander';