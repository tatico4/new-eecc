-- ===================================================
-- INSPECCIONAR Y CORREGIR TABLA BANKS EXISTENTE
-- ===================================================

-- PASO 1: Verificar estructura actual de la tabla banks
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'banks'
ORDER BY ordinal_position;