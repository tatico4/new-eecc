-- ===================================================
-- CREAR REGLAS BÁSICAS - VERSIÓN SIMPLE
-- ===================================================

-- PASO 1: Obtener IDs que vamos a usar
SELECT 'IDs disponibles:' as info;

SELECT 'Bancos:' as tipo, id, name, code FROM banks WHERE is_active = true;
SELECT 'Categorías:' as tipo, id, name FROM categories WHERE is_active = true;
SELECT 'Admin:' as tipo, id, email FROM admin_users WHERE email = 'franciscobravo@live.cl';

-- PASO 2: Crear reglas para ALIMENTACIÓN - FALABELLA
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Alimentación'),
    'contains',
    'UBER EATS',
    90,
    0.98,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Delivery de comida'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Alimentación')
    AND pattern = 'UBER EATS'
);

INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Alimentación'),
    'contains',
    'RAPPI',
    90,
    0.98,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Delivery de comida'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Alimentación')
    AND pattern = 'RAPPI'
);

INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Alimentación'),
    'contains',
    'MCDONALDS',
    85,
    0.95,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Restaurante comida rápida'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Alimentación')
    AND pattern = 'MCDONALDS'
);

INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Alimentación'),
    'contains',
    'LIDER',
    85,
    0.95,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Supermercado'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Alimentación')
    AND pattern = 'LIDER'
);

-- PASO 3: Crear reglas para TRANSPORTE - FALABELLA
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Transporte'),
    'contains',
    'UBER',
    85,
    0.95,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Transporte Uber'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Transporte')
    AND pattern = 'UBER'
);

INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Transporte'),
    'contains',
    'COPEC',
    80,
    0.90,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Combustible'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Transporte')
    AND pattern = 'COPEC'
);

-- PASO 4: Crear reglas para TRANSFERENCIAS
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Transferencias'),
    'contains',
    'TRANSFERENCIA',
    95,
    0.99,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Transferencias generales'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Transferencias')
    AND pattern = 'TRANSFERENCIA'
);

-- PASO 5: Crear reglas para COMISIONES
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Comisiones Bancarias'),
    'contains',
    'COMISION',
    100,
    0.99,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Comisiones bancarias'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Comisiones Bancarias')
    AND pattern = 'COMISION'
);

-- PASO 6: Crear reglas para ENTRETENIMIENTO
INSERT INTO categorization_rules (bank_id, category_id, rule_type, pattern, priority, confidence, created_by, notes)
SELECT
    (SELECT id FROM banks WHERE code = 'FALABELLA'),
    (SELECT id FROM categories WHERE name = 'Entretenimiento'),
    'contains',
    'NETFLIX',
    90,
    0.98,
    (SELECT id FROM admin_users WHERE email = 'franciscobravo@live.cl'),
    'Streaming'
WHERE NOT EXISTS (
    SELECT 1 FROM categorization_rules
    WHERE bank_id = (SELECT id FROM banks WHERE code = 'FALABELLA')
    AND category_id = (SELECT id FROM categories WHERE name = 'Entretenimiento')
    AND pattern = 'NETFLIX'
);

-- VERIFICAR REGLAS CREADAS
SELECT
    'Reglas creadas por banco:' as resumen,
    b.name as banco,
    COUNT(cr.*) as total_reglas
FROM banks b
LEFT JOIN categorization_rules cr ON b.id = cr.bank_id
WHERE b.is_active = true
GROUP BY b.id, b.name
ORDER BY b.name;

SELECT '🎉 Reglas básicas creadas exitosamente!' as status;