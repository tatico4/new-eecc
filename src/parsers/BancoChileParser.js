/**
 * BancoChileParser - Parser para estados de cuenta Banco de Chile
 * Soporta: Tarjeta de Crédito Visa
 */
class BancoChileParser extends AbstractBankParser {
    constructor() {
        super();
        this.rulesManager = window.RulesManager || null;

        // Ubicaciones comunes en estados de cuenta Banco de Chile
        this.UBICACIONES = [
            'SANTIAGO', 'CL', 'PROVIDENCIA', 'LAS CONDES', 'VITACURA',
            'LA FLORIDA', 'MAIPU', 'ÑUÑOA', 'HUECHURABA', 'LA REINA'
        ];
    }

    /**
     * Detecta si el documento es de Banco de Chile
     */
    canParse(text) {
        const upperText = text.toUpperCase();

        // Keywords específicos de Banco de Chile
        const bancoChileKeywords = [
            'BANCO DE CHILE',
            'BANCHILE',
            'ESTADO DE CUENTA NACIONAL DE TARJETA'
        ];

        let matches = 0;
        for (const keyword of bancoChileKeywords) {
            if (upperText.includes(keyword)) {
                matches++;
            }
        }

        // Si tiene al menos 1 keyword, es altamente probable que sea Banco de Chile
        const confidence = Math.min(matches * 50, 100);

        return {
            canParse: confidence >= 50,
            confidence: confidence,
            bankName: 'Banco de Chile'
        };
    }

    /**
     * Información del banco
     */
    getBankInfo() {
        return {
            bankName: 'Banco de Chile',
            productType: 'Tarjeta de Crédito',
            version: '1.0.0'
        };
    }

    /**
     * Parsea una línea de transacción
     * Formato: [LUGAR opcional] DD/MM/YY CÓDIGO DESCRIPCIÓN $ MONTO $ MONTO 01/01 $ MONTO
     * Ejemplo: "CL 28/07/25 290780659639 PEDIDOSYA CL PLUS CL $ 3.990 $ 3.990 01/01 $ 3.990"
     */
    parseTransaction(line) {
        // 1. Verificar si debe filtrarse
        if (this.shouldSkipLine(line)) {
            return null;
        }

        // 2. Buscar patrón de fecha DD/MM/YY
        const dateMatch = line.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/);
        if (!dateMatch) {
            return null;
        }

        const rawDate = dateMatch[1];
        const dateIndex = line.indexOf(rawDate);

        // 3. Extraer el monto (último valor después de $)
        // Patrón: $ seguido de número con puntos como separador de miles, puede ser negativo
        const amountMatches = line.match(/\$\s*(-?\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g);
        if (!amountMatches || amountMatches.length === 0) {
            return null;
        }

        // El último monto es el valor de la cuota/transacción
        const lastAmountStr = amountMatches[amountMatches.length - 1];
        const amount = this.parseAmount(lastAmountStr);

        if (isNaN(amount) || amount === 0) {
            return null;
        }

        // 4. Extraer descripción (después de código de referencia, antes del primer monto)
        // La descripción está entre la fecha+código y el primer $
        const afterDate = line.substring(dateIndex + rawDate.length).trim();

        // Buscar el código de referencia (12 dígitos después de la fecha)
        const codeMatch = afterDate.match(/^(\d{12})\s+(.+?)\s*\$/);

        let description = '';
        if (codeMatch) {
            // Descripción está después del código
            description = codeMatch[2].trim();
        } else {
            // Si no hay código claro, tomar todo hasta el primer $
            const firstDollarIndex = afterDate.indexOf('$');
            if (firstDollarIndex > 0) {
                description = afterDate.substring(0, firstDollarIndex).trim();
                // Remover números iniciales (código de referencia)
                description = description.replace(/^\d+\s+/, '');
            }
        }

        // Limpiar la descripción de ubicaciones duplicadas al final
        description = this.cleanDescription(description);

        if (!description || description.length < 3) {
            description = 'Transacción';
        }

        // 5. Formatear fecha (convertir DD/MM/YY a YYYY-MM-DD)
        let formattedDate;
        try {
            formattedDate = this.formatDateBancoChile(rawDate);
        } catch (error) {
            console.warn(`⚠️ Error formateando fecha: ${rawDate}`, error);
            return null;
        }

        return {
            date: formattedDate,
            description: description,
            amount: amount,
            rawLine: line,
            confidence: 0.90
        };
    }

    /**
     * Convierte fecha DD/MM/YY o DD/MM/YYYY a YYYY-MM-DD
     */
    formatDateBancoChile(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) {
            throw new Error(`Formato de fecha inválido: ${dateStr}`);
        }

        let [day, month, year] = parts;

        // Si el año tiene 2 dígitos, convertir a 4 dígitos
        if (year.length === 2) {
            const yearNum = parseInt(year, 10);
            // Asumimos que 00-49 es 2000-2049, y 50-99 es 1950-1999
            year = yearNum < 50 ? `20${year}` : `19${year}`;
        }

        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

        if (!this.isValidDate(formattedDate)) {
            throw new Error(`Fecha inválida: ${dateStr} -> ${formattedDate}`);
        }

        return formattedDate;
    }

    /**
     * Parsea monto en formato chileno
     * Ejemplo: "$ 3.990" -> 3990, "$ -70.113" -> -70113
     */
    parseAmount(amountStr) {
        const cleaned = amountStr
            .replace(/\$/g, '')      // Remover símbolo $
            .replace(/\./g, '')      // Remover separadores de miles
            .replace(/,/g, '.')      // Convertir coma decimal a punto (si existe)
            .trim();

        return parseFloat(cleaned);
    }

    /**
     * Limpia la descripción removiendo ubicaciones duplicadas
     */
    cleanDescription(description) {
        let cleaned = description.trim();

        // Remover ubicaciones comunes al final de la descripción
        for (const ubicacion of this.UBICACIONES) {
            const regex = new RegExp(`\\s+${ubicacion}\\s*$`, 'i');
            cleaned = cleaned.replace(regex, '');
        }

        // Remover espacios múltiples
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }

    /**
     * Determina si una línea debe ser filtrada
     */
    shouldSkipLine(line) {
        // Usar RulesManager si está disponible
        if (this.rulesManager) {
            const ruleResult = this.rulesManager.shouldFilterLine(line, 'BancoChile');
            if (ruleResult.shouldFilter) {
                console.log(`🎯 [RULES MANAGER] Línea filtrada: "${line}"`);
                return true;
            }
        }

        const lowerLine = line.toLowerCase();

        // Filtros básicos de metadata (backup/fallback)
        const metadataKeywords = [
            'cupo total',
            'cupo utilizado',
            'cupo disponible',
            'tasa interes',
            'cae',
            'periodo facturado',
            'pagar hasta',
            'saldo adeudado',
            'total operaciones',
            'total pagos',
            'total pat',
            'total tarjeta',
            'total transacciones',
            'total cargos',
            'total productos',
            'sin movimientos',
            'monto facturado',
            'monto minimo',
            'monto pagado',
            'vencimiento',
            'impuesto decreto',
            'nombre del titular',
            'fecha estado de cuenta',
            'informacion general',
            'periodo anterior',
            'periodo actual',
            'lugar de operacion',
            'descripcion operacion',
            'valor cuota',
            'cargos del mes'
        ];

        for (const keyword of metadataKeywords) {
            if (lowerLine.includes(keyword)) {
                return true;
            }
        }

        // Filtrar líneas muy cortas
        if (line.trim().length < 15) {
            return true;
        }

        // Filtrar líneas que son solo headers de tabla
        const headerPatterns = [
            /^\s*[A-Z\s]{5,}\s*$/i,  // Solo mayúsculas y espacios
            /^\s*\d+\s+de\s+\d+\s*$/i,  // "1 de 3", "2 de 3"
            /^\s*página/i,
            /^={3,}/,  // Líneas de separación
            /^-{3,}/
        ];

        for (const pattern of headerPatterns) {
            if (pattern.test(line)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Testing del parser
     */
    static runTests() {
        console.log('🧪 === TESTING BANCO CHILE PARSER ===');

        const parser = new BancoChileParser();

        const testCases = [
            {
                name: 'Pago automático (negativo)',
                line: '07/08/25 070800000000 PAGO AUTOMATICO $ -70.113 $ -70.113 01/01 $ -70.113',
                expected: { date: '2025-08-07', amount: -70113, description: 'PAGO AUTOMATICO' }
            },
            {
                name: 'Compra con ubicación',
                line: 'CL 28/07/25 290780659639 PEDIDOSYA CL PLUS CL $ 3.990 $ 3.990 01/01 $ 3.990',
                expected: { date: '2025-07-28', amount: 3990, description: 'PEDIDOSYA CL PLUS' }
            },
            {
                name: 'Compra con ubicación Santiago',
                line: 'SANTIAGO 08/08/25 120811439124 BANCHILE SEGUROS(RE SANTIAGO $ 9.867 $ 9.867 01/01 $ 9.867',
                expected: { date: '2025-08-08', amount: 9867, description: 'BANCHILE SEGUROS(RE' }
            },
            {
                name: 'Comisión bancaria',
                line: '22/08/25 220800000000 COMISION MENSUAL POR MANTENCION $ 1.650 $ 1.650 01/01 $ 1.650',
                expected: { date: '2025-08-22', amount: 1650, description: 'COMISION MENSUAL POR MANTENCION' }
            },
            {
                name: 'Metadata - debe filtrarse',
                line: 'CUPO TOTAL $ 18.930.000',
                expected: null
            }
        ];

        let passed = 0;
        let failed = 0;

        for (const testCase of testCases) {
            console.log(`\n📝 Test: ${testCase.name}`);
            console.log(`   Línea: "${testCase.line}"`);

            const result = parser.parseTransaction(testCase.line);

            if (testCase.expected === null) {
                if (result === null) {
                    console.log(`   ✅ Correctamente filtrada`);
                    passed++;
                } else {
                    console.log(`   ❌ Debería filtrarse pero se parseó:`, result);
                    failed++;
                }
            } else {
                if (result) {
                    const dateMatch = result.date === testCase.expected.date;
                    const amountMatch = result.amount === testCase.expected.amount;
                    const descMatch = result.description.includes(testCase.expected.description);

                    if (dateMatch && amountMatch && descMatch) {
                        console.log(`   ✅ PASS`);
                        console.log(`      Fecha: ${result.date}, Monto: ${result.amount}, Descripción: ${result.description}`);
                        passed++;
                    } else {
                        console.log(`   ❌ FAIL`);
                        console.log(`      Esperado: ${JSON.stringify(testCase.expected)}`);
                        console.log(`      Obtenido: ${JSON.stringify(result)}`);
                        failed++;
                    }
                } else {
                    console.log(`   ❌ FAIL - No se pudo parsear`);
                    failed++;
                }
            }
        }

        console.log(`\n📊 Resultados: ${passed} passed, ${failed} failed`);
        return failed === 0;
    }
}
