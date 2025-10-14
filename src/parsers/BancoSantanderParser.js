/**
 * BancoSantanderParser - Parser específico para Banco Santander Tarjeta de Crédito
 * Optimizado para el formato de estado de cuenta VISA GOLD LATAM
 *
 * FORMATO BANCO SANTANDER:
 * [Lugar] [Fecha] [Descripción] [Monto]
 * Ejemplo: SANTIAGO 23/07/25 PAYU *UBER TRIP $4.693
 */
class BancoSantanderParser extends AbstractBankParser {
    constructor() {
        super();

        // Ubicaciones identificadas en los estados de cuenta (más flexibles)
        this.UBICACIONES = ['SANTIAGO', 'LAS CONDES', 'PROVIDENCIA', 'VITACURA', 'MAIPÚ', 'ÑUÑOA', 'HUECHURABA'];

        // Prefijos de comercio identificados
        this.PREFIJOS_COMERCIO = [
            'PAYU *', 'DL RAPPI', 'MERPAGO*', 'PPRO', 'ADOBE', 'DL*GOOGLE',
            'DLOCAL *', 'MERPAGO*CABIFY', 'MERPAGO*ALIPAY'
        ];

        // Palabras clave de cargos bancarios
        this.CARGOS_BANCARIOS = [
            'INTERESES', 'IMPUESTOS', 'IVA USO INTERNACIONAL',
            'SERVICIO USO INTERNACIONAL', 'COMISION DE MANTENCION',
            'MONTO CANCELADO'
        ];

        // Patrones regex específicos para Santander
        this.patterns = {
            // Fecha DD/MM/YY o DD/MM/YYYY (soporte para ambos formatos)
            fecha: /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,

            // Monto con signo de pesos: $123.456 o $-123.456 o $ -123.456
            monto: /\$\s*(-?\d{1,3}(?:\.\d{3})*)/g,

            // Línea de transacción completa con lugar (soporte para fechas YY y YYYY)
            transaccionCompleta: /^([A-Z\s]+?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\$\s*(-?\d{1,3}(?:\.\d{3})*)$/,

            // Línea de cargo bancario (sin lugar) - soporte para ambos formatos de fecha
            cargoBancario: /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+(?:\d+[,\.]\d+\s*%\s+)?\$\s*(-?\d{1,3}(?:\.\d{3})*)(?:\s+\$.*)?$/,

            // Patrón específico para transacciones complejas - soporte para ambos formatos de fecha
            transaccionCompleja: /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([A-Z\s]+?)\s+\d+[,\.]\d+\s*%.*?\$\s*(-?\d{1,3}(?:\.\d{3})*)(?:\s+\$.*)?$/,

            // Patrón simple: FECHA DESCRIPCION $ MONTO (formato más común)
            transaccionSimple: /^(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(.+?)\s+\$\s*(-?\d{1,3}(?:\.\d{3})*)$/
        };

        // Inicializar RulesManager si está disponible
        this.rulesManager = null;
        this.initializeRulesManager();
    }

    /**
     * Inicializa el RulesManager para filtrado avanzado
     */
    async initializeRulesManager() {
        try {
            if (typeof RulesManager !== 'undefined') {
                this.rulesManager = RulesManager.getInstance();
                await this.rulesManager.init();
                console.log('✅ RulesManager integrado con BancoSantanderParser');
            }
        } catch (error) {
            console.warn('⚠️ RulesManager no disponible, usando filtros básicos:', error);
        }
    }

    /**
     * Identifica si puede parsear el texto del documento
     */
    canParse(text) {
        const indicators = [
            'BANCO SANTANDER',
            'SANTANDER',
            'VISA GOLD LATAM',
            'ESTADO DE CUENTA EN MONEDA NACIONAL DE TARJETA DE CRÉDITO',
            'PAYU *UBER TRIP',
            'DL RAPPI CHILE',
            'MERPAGO*'
        ];

        let score = 0;
        const lowerText = text.toLowerCase();

        indicators.forEach(indicator => {
            if (lowerText.includes(indicator.toLowerCase())) {
                if (indicator === 'BANCO SANTANDER' || indicator === 'SANTANDER') {
                    score += 50;
                } else if (indicator === 'VISA GOLD LATAM') {
                    score += 30;
                } else {
                    score += 10;
                }
            }
        });

        // Bonus por patrones específicos de Santander
        if (lowerText.includes('payu *') && lowerText.includes('merpago*')) {
            score += 20;
        }

        return {
            canParse: score >= 30,
            confidence: Math.min(score, 100),
            bankName: 'Banco Santander'
        };
    }

    /**
     * Información del banco
     */
    getBankInfo() {
        return {
            bankName: 'Banco Santander',
            productType: 'Tarjeta de Crédito VISA GOLD LATAM',
            version: '1.0.0'
        };
    }

    /**
     * Parser principal para una línea de transacción
     */
    parseTransaction(line) {
        if (!line || typeof line !== 'string' || line.trim().length < 10) {
            return null;
        }

        try {
            const cleanLine = line.trim();

            console.log(`🔍 [SANTANDER DEBUG] Procesando: "${cleanLine}"`);

            // Filtrar líneas que no son transacciones
            if (this.isNonTransactionLine(cleanLine)) {
                console.log(`  ❌ Filtrada como no-transacción`);
                return null;
            }

            // Intentar parsear como transacción con lugar
            let result = this.parseTransactionWithLocation(cleanLine);
            if (result) {
                console.log(`  ✅ Parseada como transacción con ubicación: ${JSON.stringify(result)}`);
            } else {
                console.log(`  ❌ No se pudo parsear como transacción con ubicación`);
            }

            // Si no funciona, intentar como transacción compleja (TRASP A CUOTAS, etc.)
            if (!result) {
                result = this.parseComplexTransaction(cleanLine);
                if (result) {
                    console.log(`  ✅ Parseada como transacción compleja: ${JSON.stringify(result)}`);
                } else {
                    console.log(`  ❌ No se pudo parsear como transacción compleja`);
                }
            }

            // Si no funciona, intentar como cargo bancario (sin lugar)
            if (!result) {
                result = this.parseBankCharge(cleanLine);
                if (result) {
                    console.log(`  ✅ Parseada como cargo bancario: ${JSON.stringify(result)}`);
                } else {
                    console.log(`  ❌ No se pudo parsear como cargo bancario`);
                }
            }

            // Si no funciona, intentar como transacción simple (FECHA DESCRIPCION $ MONTO)
            if (!result) {
                result = this.parseSimpleTransaction(cleanLine);
                if (result) {
                    console.log(`  ✅ Parseada como transacción simple: ${JSON.stringify(result)}`);
                } else {
                    console.log(`  ❌ No se pudo parsear como transacción simple`);
                }
            }

            if (result) {
                // Aplicar filtros y correcciones si RulesManager está disponible
                if (this.rulesManager) {
                    const correctionResult = this.rulesManager.applyDescriptionCorrections(
                        result.description,
                        'BancoSantander'
                    );
                    if (correctionResult.wasChanged) {
                        result.description = correctionResult.newDescription;
                        result.correctionApplied = correctionResult.appliedCorrection;
                    }
                }

                result.rawLine = cleanLine;
                result.confidence = this.calculateConfidence(result);
            }

            return result;

        } catch (error) {
            console.warn('Error parseando línea Santander:', line, error);
            return null;
        }
    }

    /**
     * Parsea transacción con ubicación (formato normal)
     */
    parseTransactionWithLocation(line) {
        const match = line.match(this.patterns.transaccionCompleta);
        if (!match) {
            console.log(`    🔍 No coincide con patrón transaccionCompleta: ${this.patterns.transaccionCompleta}`);
            return null;
        }

        const [, lugar, fecha, descripcion, montoStr] = match;
        console.log(`    🔍 Match encontrado: lugar="${lugar}", fecha="${fecha}", descripcion="${descripcion}", monto="${montoStr}"`);

        // Validar que el lugar sea una ubicación conocida (más flexible)
        const lugarTrimmed = lugar.trim().toUpperCase();
        const isValidLocation = this.UBICACIONES.some(ubicacion =>
            lugarTrimmed.includes(ubicacion) || ubicacion.includes(lugarTrimmed)
        );

        if (!isValidLocation) {
            // Log para debugging
            console.warn(`    🚨 Ubicación no reconocida: "${lugarTrimmed}" (ubicaciones válidas: ${this.UBICACIONES.join(', ')})`);
            return null;
        }

        const date = this.parseDate(fecha);
        const amount = this.parseAmount(montoStr);

        if (!date || amount === null) return null;

        return {
            date,
            description: this.cleanDescription(descripcion.trim()),
            amount,
            location: lugarTrimmed,
            type: amount < 0 ? 'payment' : 'purchase'
        };
    }

    /**
     * Parsea transacciones complejas como TRASP A CUOTAS
     */
    parseComplexTransaction(line) {
        const match = line.match(this.patterns.transaccionCompleja);
        if (!match) {
            console.log(`    🔍 No coincide con patrón transaccionCompleja: ${this.patterns.transaccionCompleja}`);
            return null;
        }

        const [, fecha, descripcion, montoStr] = match;
        console.log(`    🔍 Transacción compleja match: fecha="${fecha}", descripcion="${descripcion}", monto="${montoStr}"`);

        const desc = descripcion.trim();
        const date = this.parseDate(fecha);
        const amount = this.parseAmount(montoStr);

        if (!date || amount === null) return null;

        return {
            date,
            description: this.cleanDescription(desc),
            amount,
            location: null,
            type: amount < 0 ? 'payment' : 'purchase'
        };
    }

    /**
     * Parsea cargos bancarios (sin ubicación)
     */
    parseBankCharge(line) {
        const match = line.match(this.patterns.cargoBancario);
        if (!match) {
            console.log(`    🔍 No coincide con patrón cargoBancario: ${this.patterns.cargoBancario}`);
            return null;
        }

        const [, fecha, descripcion, montoStr] = match;
        console.log(`    🔍 Cargo bancario match: fecha="${fecha}", descripcion="${descripcion}", monto="${montoStr}"`);

        const desc = descripcion.trim();

        // Filtro de exclusión para metadata
        if (this.isMetadataLine(line, fecha, desc, montoStr)) {
            console.log(`    🚫 Línea rechazada por filtro de metadata`);
            return null;
        }

        const date = this.parseDate(fecha);
        const amount = this.parseAmount(montoStr);

        if (!date || amount === null) return null;

        // Determinar si es un cargo bancario conocido
        const isBankCharge = this.CARGOS_BANCARIOS.some(cargo =>
            desc.toUpperCase().includes(cargo)
        );

        return {
            date,
            description: this.cleanDescription(desc),
            amount,
            location: null,
            type: amount < 0 ? 'payment' : (isBankCharge ? 'charge' : 'purchase')
        };
    }

    /**
     * Parsea transacciones simples (FECHA DESCRIPCION $ MONTO)
     */
    parseSimpleTransaction(line) {
        const match = line.match(this.patterns.transaccionSimple);
        if (!match) {
            console.log(`    🔍 No coincide con patrón transaccionSimple: ${this.patterns.transaccionSimple}`);
            return null;
        }

        const [, fecha, descripcion, montoStr] = match;
        console.log(`    🔍 Transacción simple match: fecha="${fecha}", descripcion="${descripcion}", monto="${montoStr}"`);

        const desc = descripcion.trim();

        // Filtro de exclusión para metadata
        if (this.isMetadataLine(line, fecha, desc, montoStr)) {
            console.log(`    🚫 Línea rechazada por filtro de metadata`);
            return null;
        }

        const date = this.parseDate(fecha);
        const amount = this.parseAmount(montoStr);

        if (!date || amount === null) return null;

        // Determinar tipo de transacción basado en descripción y monto
        const isCharge = this.CARGOS_BANCARIOS.some(cargo =>
            desc.toUpperCase().includes(cargo)
        );

        return {
            date,
            description: this.cleanDescription(desc),
            amount,
            location: null,
            type: amount < 0 ? 'payment' : (isCharge ? 'charge' : 'purchase')
        };
    }

    /**
     * Determina si una línea es metadata y no una transacción real
     */
    isMetadataLine(line, fecha, descripcion, montoStr) {
        // 1. Rechazar si la descripción contiene la misma fecha que se extrajo
        if (descripcion.includes(fecha)) {
            console.log(`    📝 Metadata: descripción contiene fecha duplicada`);
            return true;
        }

        // 2. Rechazar si hay múltiples montos en la línea (formato $ X.XXX repetido)
        const montoPattern = /\$\s*\d{1,3}(?:\.\d{3})*/g;
        const montos = line.match(montoPattern);
        if (montos && montos.length > 1) {
            // Verificar si los montos son iguales (típico de metadata)
            const montosUnicos = [...new Set(montos)];
            if (montosUnicos.length === 1) {
                console.log(`    📝 Metadata: múltiples montos idénticos detectados`);
                return true;
            }
        }

        // 3. Rechazar si la descripción es principalmente números y símbolos
        const soloNumerosYSimbolos = /^[\d\s\$\.\,\/\-]+$/.test(descripcion);
        if (soloNumerosYSimbolos) {
            console.log(`    📝 Metadata: descripción solo contiene números y símbolos`);
            return true;
        }

        // 4. Rechazar patrones típicos de información de cuenta/facturación
        const patronesMetadata = [
            /MONTO\s+TOTAL/i,
            /CUPO\s+TOTAL/i,
            /COSTO\s+MONETARIO/i,
            /FACTURADO\s+A\s+PAGAR/i,
            /PRÓXIMO\s+PERÍODO/i,
            /PERÍODO\s+DE\s+FACTURACIÓN/i
        ];

        for (const patron of patronesMetadata) {
            if (patron.test(descripcion) || patron.test(line)) {
                console.log(`    📝 Metadata: patrón de información detectado`);
                return true;
            }
        }

        return false;
    }

    /**
     * Convierte fecha DD/MM/YY a formato YYYY-MM-DD
     */
    parseDate(dateStr) {
        try {
            const [day, month, year] = dateStr.split('/');

            // Convertir año de 2 dígitos a 4 dígitos (asumiendo 20XX)
            const fullYear = year.length === 2 ? `20${year}` : year;

            const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));

            // Validar fecha
            if (isNaN(date.getTime())) return null;

            return date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        } catch (error) {
            return null;
        }
    }

    /**
     * Convierte string de monto a número
     * En Santander todos los montos positivos son gastos
     * Los negativos son pagos/abonos
     */
    parseAmount(amountStr) {
        try {
            // Remover puntos (separadores de miles) y convertir
            const cleanAmount = amountStr.replace(/\./g, '');
            const numericAmount = parseInt(cleanAmount, 10);

            if (isNaN(numericAmount)) return null;

            // En Santander: positivos = gastos, negativos = pagos
            return numericAmount;
        } catch (error) {
            return null;
        }
    }

    /**
     * Limpia la descripción removiendo prefijos comerciales innecesarios
     */
    cleanDescription(description) {
        let cleaned = description;

        // Limpiar prefijos comerciales comunes
        this.PREFIJOS_COMERCIO.forEach(prefijo => {
            if (cleaned.startsWith(prefijo)) {
                cleaned = cleaned.substring(prefijo.length).trim();
            }
        });

        // Limpiar caracteres especiales al final
        cleaned = cleaned.replace(/\s*(COMPRAS\s*P\.A\.T\.|P\.A\.T\.)$/i, '');

        return cleaned || description; // Fallback al original si queda vacío
    }

    /**
     * Determina si una línea NO es una transacción
     */
    isNonTransactionLine(line) {
        const nonTransactionPatterns = [
            /^TOTAL OPERACIONES/i,
            /^MOVIMIENTOS TARJETA/i,
            /^PRODUCTOS O SERVICIOS/i,
            /^CARGOS, COMISIONES/i,
            /^INFORMACION COMPRAS/i,
            /^\d+\.\s*(TOTAL|PRODUCTOS|CARGOS|INFORMACION)/i,
            /^MONTO$/i,
            /^ORIGEN$/i,
            /^OPERACIÓN$/i,
            /^O COBRO$/i,
            /^FECHA DE$/i,
            /^OPERACIÓN$/i,
            /^LUGAR DE$/i,
            /^OPERACIÓN$/i,
            /^DESCRIPCIÓN OPERACIÓN O COBRO$/i,
            /^VALOR CUOTA$/i,
            /^MENSUAL$/i,
            /^CARGO DEL MES$/i,
            /^PERÍODO ACTUAL$/i,
            /^[\$\d\.\s,%-]+$/,  // Solo números, signos de peso y porcentajes
            /^\$[\d\.]+$/,       // Solo monto (totales)
            /^\d{1,2}\s*DE\s*\d{1,2}$/i  // Numeración de páginas
        ];

        return nonTransactionPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Calcula confianza del parsing basado en la calidad de los datos extraídos
     */
    calculateConfidence(transaction) {
        let confidence = 70; // Base

        // Bonus por tener fecha válida
        if (transaction.date) confidence += 10;

        // Bonus por descripción limpia
        if (transaction.description && transaction.description.length > 3) {
            confidence += 10;
        }

        // Bonus por ubicación válida
        if (transaction.location && this.UBICACIONES.includes(transaction.location)) {
            confidence += 5;
        }

        // Penalty por montos muy pequeños (posible error)
        if (Math.abs(transaction.amount) < 100) {
            confidence -= 5;
        }

        return Math.min(confidence, 95);
    }

    /**
     * Extrae datos adicionales del estado de cuenta
     */
    extractAdditionalData(text) {
        const additionalData = {
            bankCode: 'BancoSantander',
            productCode: 'TarjetaCredito'
        };

        try {
            // Extraer monto total facturado
            const montoTotalMatch = text.match(/MONTO TOTAL FACTURADO A PAGAR\s+\$(\d{1,3}(?:\.\d{3})*)/);
            if (montoTotalMatch) {
                additionalData.montoFacturado = montoTotalMatch[1];
            }

            // Extraer monto facturado período anterior (ESPECÍFICO SANTANDER)
            const montoFacturadoPeriodoAnteriorMatch = text.match(/MONTO FACTURADO A PAGAR \(PERÍODO ANTERIOR\)\s+\$\s*(\d{1,3}(?:\.\d{3})*)/);
            if (montoFacturadoPeriodoAnteriorMatch) {
                additionalData.montoFacturadoPeriodoAnterior = montoFacturadoPeriodoAnteriorMatch[1];
            }

            // Extraer monto pagado período anterior (ESPECÍFICO SANTANDER)
            const montoPagadoPeriodoAnteriorMatch = text.match(/MONTO PAGADO PERÍODO ANTERIOR\s+\$\s*(-?\d{1,3}(?:\.\d{3})*)/);
            if (montoPagadoPeriodoAnteriorMatch) {
                additionalData.montoPagadoPeriodoAnterior = montoPagadoPeriodoAnteriorMatch[1];
            }

            // Extraer monto mínimo a pagar
            const montoMinimoMatch = text.match(/MONTO MÍNIMO A PAGAR\s+\$(\d{1,3}(?:\.\d{3})*)/);
            if (montoMinimoMatch) {
                additionalData.montoMinimo = montoMinimoMatch[1];
            }

            // Extraer fecha de vencimiento
            const vencimientoMatch = text.match(/PAGAR HASTA\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
            if (vencimientoMatch) {
                additionalData.fechaVencimiento = vencimientoMatch[1];
            }

            // Extraer número de tarjeta (parcial)
            const tarjetaMatch = text.match(/XXXX XXXX XXXX (\d{4})/);
            if (tarjetaMatch) {
                additionalData.numeroTarjeta = `****-****-****-${tarjetaMatch[1]}`;
            }

            // Extraer titular (account holder)
            const titularMatch = text.match(/NOMBRE DEL TITULAR\s+([A-ZÁÉÍÓÚÑ\s\.]+)/i);
            if (titularMatch) {
                additionalData.accountHolder = titularMatch[1].trim();
                console.log(`👤 [TITULAR] ${additionalData.accountHolder}`);
            }

        } catch (error) {
            console.warn('Error extrayendo datos adicionales Santander:', error);
        }

        return additionalData;
    }

    /**
     * Método de testing específico para Santander
     */
    static runTests() {
        console.log('🧪 === TESTING BANCO SANTANDER PARSER ===');

        const parser = new BancoSantanderParser();

        // Test 1: Transacción normal con ubicación
        const testLine1 = "SANTIAGO 23/07/25 PAYU *UBER TRIP $4.693";
        console.log('\n📋 Test 1 - Transacción normal:');
        console.log(`Input: "${testLine1}"`);
        const result1 = parser.parseTransaction(testLine1);
        console.log('Output:', result1);

        // Test 2: Compra en comercio
        const testLine2 = "LAS CONDES 26/07/25 DL RAPPI CHILE RAPP COMPRAS P.A.T. $9.160";
        console.log('\n📋 Test 2 - Compra en comercio:');
        console.log(`Input: "${testLine2}"`);
        const result2 = parser.parseTransaction(testLine2);
        console.log('Output:', result2);

        // Test 3: Cargo bancario
        const testLine3 = "25/08/25 INTERESES $14.614";
        console.log('\n📋 Test 3 - Cargo bancario:');
        console.log(`Input: "${testLine3}"`);
        const result3 = parser.parseTransaction(testLine3);
        console.log('Output:', result3);

        // Test 4: Pago (monto negativo)
        const testLine4 = "05/08/25 MONTO CANCELADO $-251.900";
        console.log('\n📋 Test 4 - Pago:');
        console.log(`Input: "${testLine4}"`);
        const result4 = parser.parseTransaction(testLine4);
        console.log('Output:', result4);

        // Test 5: canParse
        const sampleDocument = `
        BANCO SANTANDER
        ESTADO DE CUENTA EN MONEDA NACIONAL DE TARJETA DE CRÉDITO
        VISA GOLD LATAM
        SANTIAGO 23/07/25 PAYU *UBER TRIP $4.693
        `;
        console.log('\n📋 Test 5 - canParse:');
        const canParseResult = parser.canParse(sampleDocument);
        console.log('canParse result:', canParseResult);

        return true;
    }
}