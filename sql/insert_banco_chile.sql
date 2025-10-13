-- ===================================================
-- REGISTRAR BANCO DE CHILE EN SUPABASE
-- ===================================================

-- Insertar Banco de Chile en la tabla banks
INSERT INTO banks (name, code, parser_class, is_active, country) VALUES
    ('Banco de Chile', 'BANCOCHILE', 'BancoChileParser', true, 'CL')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    parser_class = EXCLUDED.parser_class,
    is_active = EXCLUDED.is_active,
    country = EXCLUDED.country;

-- Verificar que se insertó correctamente
SELECT id, name, code, parser_class, is_active, country
FROM banks
WHERE code = 'BANCOCHILE';

SELECT '✅ Banco de Chile registrado exitosamente!' as status;
