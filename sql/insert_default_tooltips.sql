-- ===================================================
-- INSERTAR TOOLTIPS POR DEFECTO
-- ===================================================
-- Tooltips para transacciones comunes chilenas
-- Especialmente seguros y comisiones bancarias

-- Verificar que la tabla existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_tooltips') THEN
        RAISE EXCEPTION 'La tabla transaction_tooltips no existe. Ejecuta setup_complete_migration.sql primero.';
    END IF;
END $$;

-- Insertar tooltips de seguros (los más solicitados)
INSERT INTO transaction_tooltips (transaction_code, title, explanation, category_code, examples)
VALUES
    -- Seguro de Cesantía
    (
        'seg cesantia',
        'Seguro de Cesantía',
        'El Seguro de Cesantía es un beneficio obligatorio que protege a los trabajadores en caso de pérdida de empleo. Este cargo mensual en tu tarjeta de crédito cubre el pago de tu deuda si quedas cesante. Es opcional para tarjetas de crédito, pero obligatorio para créditos de consumo.',
        'seguros',
        ARRAY['SEG CESANTIA TC', 'SEGURO CESANTIA', 'SEG. CESANTIA']
    ),

    -- Seguro de Desgravamen
    (
        'seg desgravamen',
        'Seguro de Desgravamen',
        'El Seguro de Desgravamen cubre el saldo de tu deuda en caso de fallecimiento o invalidez total y permanente. Es obligatorio para créditos hipotecarios y opcional para tarjetas de crédito y créditos de consumo. Protege a tu familia de heredar deudas.',
        'seguros',
        ARRAY['SEG DESGRAVAMEN', 'SEGURO DESGRAVAMEN', 'SEG. DESGRAVAMEN']
    ),

    -- Seguro de Fraude
    (
        'seg fraude',
        'Seguro contra Fraude',
        'Este seguro te protege contra cargos fraudulentos en tu tarjeta de crédito. Cubre compras no autorizadas y clonación de tarjeta. Es opcional y generalmente tiene un costo mensual bajo.',
        'seguros',
        ARRAY['SEG FRAUDE', 'SEGURO FRAUDE', 'PROTECCION FRAUDE']
    ),

    -- Comisión de Mantención
    (
        'comision mantencion',
        'Comisión de Mantención',
        'Cargo mensual que cobran algunos bancos por mantener activa tu tarjeta de crédito o cuenta. Muchos bancos la condonan si cumples ciertos requisitos como monto mínimo de compras o mantener un saldo promedio.',
        'comisiones',
        ARRAY['COM MANTENCION', 'COMISION MANTENCION', 'MANTENCIÓN TC']
    ),

    -- Comisión por Avance
    (
        'comision avance',
        'Comisión por Avance en Efectivo',
        'Cargo que cobra el banco cuando retiras dinero en efectivo usando tu tarjeta de crédito. Generalmente es entre 3% y 5% del monto retirado, con un mínimo de $3.000 a $5.000. Además, los avances no tienen período de gracia y generan intereses desde el día 1.',
        'comisiones',
        ARRAY['COM AVANCE', 'COMISION AVANCE', 'AVANCE EFECTIVO']
    ),

    -- Comisión por Pago Atrasado
    (
        'cargo por mora',
        'Cargo por Mora / Pago Atrasado',
        'Multa que cobra el banco cuando no pagas tu tarjeta en la fecha de vencimiento. Además de este cargo, se generan intereses moratorios sobre el saldo impago. Para evitarlo, paga al menos el mínimo antes de la fecha de vencimiento.',
        'comisiones',
        ARRAY['CARGO MORA', 'PAGO ATRASADO', 'MORA']
    ),

    -- Comisión por Sobregiro
    (
        'comision sobregiro',
        'Comisión por Sobregiro',
        'Cargo que se aplica cuando gastas más del límite disponible en tu línea de crédito. Algunos bancos ofrecen un cupo de sobregiro limitado, pero cobra una comisión cada vez que lo usas.',
        'comisiones',
        ARRAY['COM SOBREGIRO', 'COMISION SOBREGIRO', 'SOBREGIRO']
    )

ON CONFLICT (transaction_code)
DO UPDATE SET
    title = EXCLUDED.title,
    explanation = EXCLUDED.explanation,
    category_code = EXCLUDED.category_code,
    examples = EXCLUDED.examples,
    updated_at = NOW();

-- Mensaje de confirmación
SELECT
    '✅ Tooltips insertados exitosamente' as status,
    COUNT(*) as total_tooltips
FROM transaction_tooltips
WHERE is_active = true;

-- Mostrar tooltips creados
SELECT
    transaction_code,
    title,
    category_code,
    created_at
FROM transaction_tooltips
WHERE is_active = true
ORDER BY transaction_code;
