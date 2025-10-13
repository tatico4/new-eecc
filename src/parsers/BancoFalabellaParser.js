/**
 * BancoFalabellaParser - Parser específico para Banco Falabella Tarjeta de Crédito
 * Optimizado para el formato único del estado de cuenta real
 *
 * FORMATO BANCO FALABELLA:
 * [Ubicación_Opcional][Fecha][Descripción][Código_T/A][Montos_Triplicados][Fecha_Proceso][Monto_Final]
 */
class BancoFalabellaParser extends AbstractBankParser {
    constructor() {
        super();

        // Ubicaciones reales identificadas en el estado de cuenta
        this.UBICACIONES = ['Santiago', 'Las Condes', 'S/I', 'Nunoa', 'Huechuraba'];

        // Códigos de transacción identificados
        this.CODIGOS_TRANSACCION = ['T', 'A2'];

        // Patrones regex específicos para Falabella
        this.patterns = {
            // Fecha DD/MM/YYYY
            fecha: /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,

            // Montos (pueden ser negativos): números con puntos como separadores de miles
            monto: /(-?\d{1,3}(?:\.\d{3})*)/g,

            // Fecha de proceso específica: "01/01 sep-2025" o "01/01sep-2025"
            fechaProceso: /\b\d{1,2}\/\d{1,2}\s*[a-z]{3}-\d{4}\b/gi,

            // Códigos de transacción
            codigoTransaccion: /\b(T|A2)\b/g
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
                console.log('✅ RulesManager integrado con BancoFalabellaParser');
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
            'BANCO FALABELLA',
            'TARJETA CMR',
            'falabella',
            'T 37.905 37.905 01/01 sep-', // Patrón típico de monto triplicado
            'sodimac'
        ];

        let score = 0;
        const lowerText = text.toLowerCase();

        indicators.forEach(indicator => {
            if (lowerText.includes(indicator.toLowerCase())) {
                score += indicator === 'BANCO FALABELLA' ? 50 : 10;
            }
        });

        return {
            canParse: score >= 20,
            confidence: Math.min(score, 100),
            bankName: 'Banco Falabella'
        };
    }

    /**
     * Información del banco
     */
    getBankInfo() {
        return {
            bankName: 'Banco Falabella',
            productType: 'Tarjeta de Crédito CMR',
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
            const originalLine = line;
            let workingLine = this.cleanText(line);

            // FILTRO PREVIO: Descartar líneas que claramente no son transacciones
            if (this.shouldSkipLine(workingLine)) {
                return null;
            }

            console.log(`🔍 [FALABELLA DEBUG] Parseando línea: "${workingLine}"`);

            // PASO 1: Extraer todas las fechas de la línea
            const fechas = this.extractFechas(workingLine);
            console.log(`📅 [FALABELLA DEBUG] Fechas encontradas: [${fechas.join(', ')}]`);
            if (fechas.length === 0) {
                console.log(`❌ [FALABELLA DEBUG] Sin fechas válidas en: "${workingLine}"`);
                return null; // Sin fecha válida, no es una transacción
            }

            // La primera fecha es la fecha de la transacción
            const fechaTransaccion = fechas[0];

            // PASO 2: Extraer todos los montos de la línea
            const montos = this.extractMontos(workingLine);
            console.log(`💰 [FALABELLA DEBUG] Montos encontrados: [${montos.join(', ')}]`);
            if (montos.length === 0) {
                console.log(`❌ [FALABELLA DEBUG] Sin montos válidos en: "${workingLine}"`);
                return null; // Sin monto válido
            }

            // Buscar el monto final más apropiado (evitar fechas como 01/01)
            const montoFinal = this.selectBestAmount(montos, workingLine);
            console.log(`💎 [FALABELLA DEBUG] Monto final seleccionado: "${montoFinal}"`);
            if (!montoFinal) {
                console.log(`❌ [FALABELLA DEBUG] No se pudo determinar monto final en: "${workingLine}"`);
                return null;
            }

            // PASO 3: Extraer descripción limpiando elementos específicos de Falabella
            const descripcion = this.extractDescripcion(workingLine, fechaTransaccion, montoFinal);
            console.log(`📝 [FALABELLA DEBUG] Descripción extraída: "${descripcion}"`);
            if (!descripcion || descripcion.trim().length === 0) {
                console.log(`❌ [FALABELLA DEBUG] Sin descripción válida en: "${workingLine}"`);
                return null; // Sin descripción válida
            }

            // VALIDACIÓN ADICIONAL: La descripción debe tener sentido
            if (!this.isValidTransactionDescription(descripcion)) {
                console.log(`❌ [FALABELLA DEBUG] Descripción no válida: "${descripcion}"`);
                return null;
            }

            // PASO 4: Aplicar correcciones de descripción si RulesManager está disponible
            let finalDescription = descripcion.trim();
            let correctionResult = null;

            if (this.rulesManager) {
                correctionResult = this.rulesManager.applyDescriptionCorrections(finalDescription, 'BancoFalabella');
                finalDescription = correctionResult.correctedDescription;

                if (correctionResult.wasModified) {
                    console.log(`🔧 [CORRECTIONS] Descripción corregida: "${correctionResult.originalDescription}" → "${correctionResult.correctedDescription}"`);
                }
            }

            // PASO 5: Crear objeto de transacción
            const formattedDate = this.formatDate(fechaTransaccion);
            console.log(`🗓️ [DATE DEBUG] Fecha original: "${fechaTransaccion}" → Formateada: "${formattedDate}"`);

            // Detectar si es una anulación para aplicar lógica especial
            const isAnulacion = this.isAnulacion(finalDescription);
            console.log(`🔄 [ANULACION DEBUG] Es anulación: ${isAnulacion ? 'SÍ' : 'NO'}`);

            const transaction = {
                date: formattedDate,
                description: finalDescription,
                amount: this.parseAmountToNumber(montoFinal, isAnulacion),
                rawLine: originalLine,
                confidence: 95, // Alta confianza para parser específico
                bankName: 'Banco Falabella',
                parsedData: {
                    fechaOriginal: fechaTransaccion,
                    montoOriginal: montoFinal,
                    todasLasFechas: fechas,
                    todosLosMontos: montos,
                    originalDescription: descripcion.trim(),
                    correctionApplied: correctionResult?.wasModified || false,
                    appliedCorrections: correctionResult?.appliedCorrections || [],
                    isAnulacion: isAnulacion
                }
            };

            // Validar resultado
            if (this.validateTransaction(transaction)) {
                return transaction;
            }

            return null;

        } catch (error) {
            console.warn(`Error parseando línea Falabella: ${line}`, error);
            return null;
        }
    }

    /**
     * Extrae todas las fechas de la línea
     */
    extractFechas(line) {
        const fechas = [];
        const matches = [...line.matchAll(this.patterns.fecha)];

        for (const match of matches) {
            const fecha = match[1];
            if (this.isValidDateFormat(fecha)) {
                fechas.push(fecha);
            }
        }

        return fechas;
    }

    /**
     * Extrae todos los montos de la línea
     */
    extractMontos(line) {
        const montos = [];
        const matches = [...line.matchAll(this.patterns.monto)];

        for (const match of matches) {
            const monto = match[1];
            if (this.isValidAmount(monto)) {
                montos.push(monto);
            }
        }

        return montos;
    }

    /**
     * Extrae descripción limpiando elementos específicos de Falabella
     */
    extractDescripcion(line, fecha, monto) {
        let descripcion = line;

        // PASO 1: Remover ubicaciones al inicio SOLAMENTE si están al principio
        for (const ubicacion of this.UBICACIONES) {
            const regex = new RegExp(`^\\s*${this.escapeRegex(ubicacion)}\\s+`, 'i');
            descripcion = descripcion.replace(regex, '');
        }

        // PASO 2: Remover la fecha de transacción específica
        const fechaRegex = new RegExp(`\\b${this.escapeRegex(fecha)}\\b`, 'g');
        descripcion = descripcion.replace(fechaRegex, '');

        // PASO 3: Remover códigos de transacción SOLAMENTE si están aislados
        for (const codigo of this.CODIGOS_TRANSACCION) {
            const regex = new RegExp(`\\s+${codigo}\\s+`, 'g');
            descripcion = descripcion.replace(regex, ' ');
        }

        // PASO 4: Remover fechas de proceso específicas (01/01 sep-2025)
        descripcion = descripcion.replace(this.patterns.fechaProceso, '');

        // PASO 5: Remover fechas cortas aisladas (01/01, 02/02, etc.)
        const beforeShortDates = descripcion;
        descripcion = descripcion.replace(/\s+\d{1,2}\/\d{1,2}(?=\s|$)/g, '');
        if (beforeShortDates !== descripcion) {
            console.log(`🔧 [CLEANUP] Fechas cortas removidas: "${beforeShortDates}" → "${descripcion}"`);
        }

        // PASO 6: Remover ceros aislados al final
        const beforeZeros = descripcion;
        descripcion = descripcion.replace(/\s+0(?=\s|$)/g, '');
        if (beforeZeros !== descripcion) {
            console.log(`🔧 [CLEANUP] Ceros removidos: "${beforeZeros}" → "${descripcion}"`);
        }

        // PASO 7: Detectar y remover montos triplicados (patrón Falabella)
        descripcion = this.removeTripledAmounts(descripcion, monto);

        // PASO 8: Remover montos finales aislados
        const montosExactos = this.extractMontosExactos(line);
        for (const montoStr of montosExactos) {
            // Solo remover si el monto está aislado (rodeado de espacios o al final/inicio)
            const montoRegex = new RegExp(`\\s+${this.escapeRegex(montoStr)}(?=\\s|$)`, 'g');
            descripcion = descripcion.replace(montoRegex, '');
        }

        // PASO 9: Remover fechas adicionales SOLAMENTE si están aisladas
        const fechasAdicionales = this.extractFechas(descripcion);
        for (const fechaAdicional of fechasAdicionales) {
            if (fechaAdicional !== fecha) { // No remover la fecha principal dos veces
                const fechaRegex = new RegExp(`\\s+${this.escapeRegex(fechaAdicional)}(?=\\s|$)`, 'g');
                descripcion = descripcion.replace(fechaRegex, '');
            }
        }

        // PASO 10: Limpiar espacios múltiples y caracteres al inicio/final
        descripcion = this.cleanText(descripcion);

        return descripcion;
    }

    /**
     * Extrae montos de forma más precisa para limpieza de descripción
     */
    extractMontosExactos(line) {
        const montos = [];
        const matches = [...line.matchAll(this.patterns.monto)];

        for (const match of matches) {
            const monto = match[1];
            const cleanMonto = monto.replace(/[^\d]/g, '');

            // Incluir montos válidos de 3+ dígitos o con puntos, pero excluir fechas obvias
            if (this.isValidAmount(monto) &&
                (cleanMonto.length >= 3 || monto.includes('.')) &&
                !this.looksLikeDate(monto)) {
                montos.push(monto);
            }
        }

        return montos;
    }

    /**
     * Verifica si un string parece ser una fecha en lugar de un monto
     */
    looksLikeDate(str) {
        // Patrones comunes de fechas que podrían confundirse con montos
        return /^\d{1,2}\/\d{1,2}$/.test(str) ||  // 01/01, 12/12
               /^\d{4}$/.test(str) ||             // 2025
               /^\d{1,2}$/.test(str);             // 01, 12 (días/meses)
    }

    /**
     * Valida formato de fecha DD/MM/YYYY
     */
    isValidDateFormat(dateStr) {
        const parts = dateStr.split('/');
        if (parts.length !== 3) return false;

        const [day, month, year] = parts.map(Number);

        return day >= 1 && day <= 31 &&
               month >= 1 && month <= 12 &&
               year >= 2020 && year <= 2030;
    }

    /**
     * Valida si un string es un monto válido
     */
    isValidAmount(amountStr) {
        // Debe ser un número válido (puede ser negativo)
        const cleaned = amountStr.replace(/\./g, ''); // Remover puntos (separadores de miles)
        const num = parseInt(cleaned, 10);

        return !isNaN(num) && Math.abs(num) > 0;
    }

    /**
     * Convierte monto string a número
     * En Falabella, TODOS los puntos son separadores de miles, no decimales
     * LÓGICA ESPECÍFICA BANCO FALABELLA:
     * - Montos SIN "-" = GASTOS (negativo en nuestro sistema)
     * - Montos CON "-" = INGRESOS (positivo en nuestro sistema)
     * - EXCEPCIÓN: ANULACIONES siempre son gastos (negativo) independientemente del signo
     */
    parseAmountToNumber(amountStr, isAnulacion = false) {
        const hasMinusSign = amountStr.includes('-');
        let cleanAmount = amountStr.replace('-', '').trim();

        // Remover todos los puntos (separadores de miles)
        cleanAmount = cleanAmount.replace(/\./g, '');

        const numericAmount = parseInt(cleanAmount, 10);

        if (isNaN(numericAmount)) {
            throw new Error(`Monto inválido: ${amountStr}`);
        }

        // LÓGICA ESPECIAL PARA ANULACIONES: siempre negativas (gastos)
        if (isAnulacion) {
            console.log(`🔄 [ANULACION AMOUNT] Monto ${amountStr} → -${numericAmount} (anulación = gasto)`);
            return -numericAmount;
        }

        // INVERSIÓN DE LÓGICA NORMAL PARA BANCO FALABELLA:
        // Con "-" = ingreso (positivo), Sin "-" = gasto (negativo)
        const finalAmount = hasMinusSign ? numericAmount : -numericAmount;
        console.log(`💰 [AMOUNT DEBUG] Monto ${amountStr} → ${finalAmount} (${hasMinusSign ? 'ingreso' : 'gasto'})`);
        return finalAmount;
    }

    /**
     * Escapa caracteres especiales para regex
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Determina si una línea debe ser saltada (no es una transacción)
     */
    shouldSkipLine(line) {
        const lowerLine = line.toLowerCase();

        // PRIMERA VERIFICACIÓN: Usar RulesManager si está disponible
        if (this.rulesManager) {
            const ruleResult = this.rulesManager.shouldFilterLine(line, 'BancoFalabella');
            if (ruleResult.shouldFilter) {
                console.log(`🎯 [RULES MANAGER] Línea filtrada por regla: "${ruleResult.rule.description}" - "${line}"`);
                return true;
            }
        }

        // SEGUNDA VERIFICACIÓN: Filtros básicos incorporados
        const skipPatterns = [
            // Encabezados y títulos
            /^\s*(movimientos|transacciones|fecha|descripción|monto|saldo)/i,
            /^\s*(estado de cuenta|banco falabella|tarjeta cmr)/i,
            /^\s*(periodo|desde|hasta|total)/i,

            // Líneas de totales y resúmenes
            /^\s*(total\s+gastos|total\s+abonos|saldo\s+anterior|saldo\s+actual)/i,
            /^\s*(pago\s+mínimo|pago\s+contado|fecha\s+vencimiento)/i,

            // Líneas muy cortas o con solo números/caracteres especiales
            /^\s*[\d\.\-\s]*$/,
            /^\s*[_\-=\*\+\s]*$/,

            // Líneas que son solo fechas o montos sin descripción
            /^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/,
            /^\s*[\d\.\-]+\s*$/,

            // Líneas con solo códigos o ubicaciones
            /^\s*(santiago|las condes|s\/i|nunoa|huechuraba)\s*$/i,
            /^\s*(t|a2)\s*$/i,

            // Líneas que comienzan con viñetas (bullets) - generalmente metadata
            /^\s*[•●◦▪▫]\s*/
        ];

        // Verificar patrones de exclusión básicos
        for (const pattern of skipPatterns) {
            if (pattern.test(line)) {
                console.log(`⚠️ [FALABELLA BASIC FILTER] Línea saltada (patrón): "${line}"`);
                return true;
            }
        }

        // Filtros adicionales por contenido específico básico
        const skipKeywords = [
            'página',
            'hoja',
            'continuación',
            'subtotal',
            'resumen',
            'detalle',
            'información',
            'contacto',
            'servicio al cliente',
            'www.',
            'http',
            'email',
            '@',
            'pagar hasta',
            'cmr puntos',
            'puntos acumulados',
            'puntos por vencer',
            'tasa interés',
            'tasa de interés',
            'cae ',
            'período facturado',
            'período de facturación',
            'período a facturar',
            'próximo período',
            'cupo total',
            'cupo disponible',
            'cupo utilizado',
            'cupo avance',
            'cupo súper avance',
            'cupo compras',
            'monto total facturado',
            'monto mínimo',
            'total a pagar',
            'fecha vencimiento',
            'fecha facturación',
            'estado de cuenta',
            'cupón de pago',
            'nombre del titular',
            'número de tarjeta',
            'tarjeta de crédito'
        ];

        for (const keyword of skipKeywords) {
            if (lowerLine.includes(keyword)) {
                console.log(`⚠️ [FALABELLA BASIC FILTER] Línea saltada (keyword): "${line}"`);
                return true;
            }
        }

        return false;
    }

    /**
     * Valida que una descripción sea válida para una transacción
     */
    isValidTransactionDescription(description) {
        if (!description || description.trim().length === 0) {
            return false;
        }

        const trimmed = description.trim();

        // Muy corta
        if (trimmed.length < 3) {
            return false;
        }

        // Solo números, espacios o caracteres especiales
        if (/^[\d\s\.\-_]+$/.test(trimmed)) {
            return false;
        }

        // Solo códigos conocidos
        if (/^(T|A2)$/i.test(trimmed)) {
            return false;
        }

        // Solo ubicaciones conocidas
        const ubicacionesPattern = new RegExp(`^(${this.UBICACIONES.join('|')})$`, 'i');
        if (ubicacionesPattern.test(trimmed)) {
            return false;
        }

        // Debe contener al menos una letra
        if (!/[a-zA-Z]/.test(trimmed)) {
            return false;
        }

        return true;
    }

    /**
     * Casos de prueba con los ejemplos reales del estado de cuenta
     */
    static runTests() {
        console.log('🧪 === TESTING BANCO FALABELLA PARSER ===');

        const parser = new BancoFalabellaParser();

        const testCases = [
            // Casos reales del estado de cuenta
            {
                input: "S/I 27/07/2025 Compra falabella plaza vespucio T 37.905 37.905 01/01 sep-2025 37.905",
                expected: {date: "2025-07-27", description: "Compra falabella plaza vespucio", amount: 37905}
            },
            {
                input: "S/I 15/08/2025 Compra sodimac hc nunoa la rein T 35.360 35.360 01/01 sep-2025 35.360",
                expected: {date: "2025-08-15", description: "Compra sodimac hc nunoa la rein", amount: 35360}
            },
            {
                input: "Santiago 05/08/2025 Colmena golden cross A2 351.357 351.357 01/01 sep-2025 351.357",
                expected: {date: "2025-08-05", description: "Colmena golden cross", amount: 351357}
            },
            {
                input: "Las Condes 19/07/2025 Mercadopago *sociedad A2 89.990 89.990 01/01 sep-2025 89.990",
                expected: {date: "2025-07-19", description: "Mercadopago *sociedad", amount: 89990}
            },
            {
                input: "27/07/2025 Pago automatico seg auto subaru T 113.678 113.678 01/01 sep-2025 113.678",
                expected: {date: "2025-07-27", description: "Pago automatico seg auto subaru", amount: 113678}
            },
            {
                input: "06/08/2025 Anulacion pago automatico abono T 17.040 -17.040 01/01 sep-2025 -17.040",
                expected: {date: "2025-08-06", description: "Anulacion pago automatico abono", amount: -17040}
            },
            {
                input: "S/I 17/08/2025 Apple.com/bi T 3.290 3.290 01/01 sep-2025 3.290",
                expected: {date: "2025-08-17", description: "Apple.com/bi", amount: 3290}
            },
            {
                input: "Santiago 19/07/2025 Uber eats T 27.437 27.437 01/01 sep-2025 27.437",
                expected: {date: "2025-07-19", description: "Uber eats", amount: 27437}
            }
        ];

        let passed = 0;
        let failed = 0;

        testCases.forEach((testCase, index) => {
            console.log(`\n📝 Test ${index + 1}:`);
            console.log(`Input: "${testCase.input}"`);

            const result = parser.parseTransaction(testCase.input);

            if (!result) {
                console.log(`❌ FAILED: Parser retornó null`);
                failed++;
                return;
            }

            const dateMatch = result.date === testCase.expected.date;
            const descMatch = result.description === testCase.expected.description;
            const amountMatch = result.amount === testCase.expected.amount;

            if (dateMatch && descMatch && amountMatch) {
                console.log(`✅ PASSED`);
                console.log(`   Fecha: ${result.date}`);
                console.log(`   Descripción: "${result.description}"`);
                console.log(`   Monto: ${result.amount}`);
                passed++;
            } else {
                console.log(`❌ FAILED:`);
                console.log(`   Fecha: ${result.date} (esperado: ${testCase.expected.date}) ${dateMatch ? '✅' : '❌'}`);
                console.log(`   Descripción: "${result.description}" (esperado: "${testCase.expected.description}") ${descMatch ? '✅' : '❌'}`);
                console.log(`   Monto: ${result.amount} (esperado: ${testCase.expected.amount}) ${amountMatch ? '✅' : '❌'}`);
                failed++;
            }
        });

        console.log(`\n🎯 === RESULTADOS FINALES ===`);
        console.log(`✅ Passed: ${passed}/${testCases.length}`);
        console.log(`❌ Failed: ${failed}/${testCases.length}`);
        console.log(`📊 Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);

        return passed === testCases.length;
    }

    /**
     * Selecciona el mejor monto de una lista, evitando fechas como 01/01
     */
    selectBestAmount(montos, line) {
        if (!montos || montos.length === 0) return null;

        // Filtrar montos que claramente no son fechas
        const montosValidos = montos.filter(monto => {
            // Evitar patrones como 01/01, 02/02, etc. (fechas DD/MM)
            if (/^\d{2}\/\d{2}$/.test(monto)) return false;

            // Evitar números muy pequeños que podrían ser parte de fechas
            const cleanMonto = monto.replace(/[^\d]/g, '');
            if (cleanMonto.length <= 2 && parseInt(cleanMonto) <= 12) return false;

            return true;
        });

        console.log(`🔍 [MONTO SELECTION] Montos originales: [${montos.join(', ')}]`);
        console.log(`🔍 [MONTO SELECTION] Montos válidos: [${montosValidos.join(', ')}]`);

        if (montosValidos.length === 0) {
            // Si no hay montos válidos, usar el último de la lista original como fallback
            return montos[montos.length - 1];
        }

        // Buscar el monto más significativo (mayor valor numérico)
        let mejorMonto = montosValidos[0];
        let mayorValor = this.getNumericValue(mejorMonto);

        for (const monto of montosValidos) {
            const valor = this.getNumericValue(monto);
            if (valor > mayorValor) {
                mayorValor = valor;
                mejorMonto = monto;
            }
        }

        return mejorMonto;
    }

    /**
     * Obtiene el valor numérico de un monto para comparación
     */
    getNumericValue(montoStr) {
        const cleanAmount = montoStr.replace(/[^\d]/g, '');
        return parseInt(cleanAmount, 10) || 0;
    }

    /**
     * Detecta si una transacción es una anulación
     */
    isAnulacion(description) {
        const anulationKeywords = [
            'anulacion',
            'anulación',
            'reverso',
            'devolucion',
            'devolución',
            'reembolso',
            'cancelacion',
            'cancelación'
        ];

        const lowerDesc = description.toLowerCase();
        return anulationKeywords.some(keyword => lowerDesc.includes(keyword));
    }

    /**
     * Detecta y remueve montos triplicados (patrón específico de Falabella)
     * Ejemplo: "T 824 824 01/01 sep-2025 824" → remover "824 824" y "824" final
     */
    removeTripledAmounts(description, expectedFinalAmount) {
        if (!expectedFinalAmount) return description;

        // Obtener valor limpio del monto esperado
        const cleanExpectedAmount = expectedFinalAmount.replace(/[^\d]/g, '');

        console.log(`🔍 [TRIPLED DEBUG] Buscando montos triplicados de: "${expectedFinalAmount}" (clean: "${cleanExpectedAmount}")`);
        console.log(`🔍 [TRIPLED DEBUG] En descripción: "${description}"`);

        let cleanedDescription = description;

        // Patrón 1: Montos duplicados consecutivos "824 824"
        const duplicatePattern = new RegExp(`\\b${cleanExpectedAmount}\\s+${cleanExpectedAmount}\\b`, 'g');
        const duplicateMatches = cleanedDescription.match(duplicatePattern);
        if (duplicateMatches) {
            console.log(`🔍 [TRIPLED DEBUG] Encontrados duplicados: ${duplicateMatches.join(', ')}`);
            cleanedDescription = cleanedDescription.replace(duplicatePattern, '');
        }

        // Patrón 2: Monto final aislado al final de la línea
        const finalAmountPattern = new RegExp(`\\s+${cleanExpectedAmount}\\s*$`, 'g');
        const finalMatches = cleanedDescription.match(finalAmountPattern);
        if (finalMatches) {
            console.log(`🔍 [TRIPLED DEBUG] Encontrado monto final: ${finalMatches.join(', ')}`);
            cleanedDescription = cleanedDescription.replace(finalAmountPattern, '');
        }

        // Patrón 3: Cualquier otra ocurrencia del monto aislado
        const isolatedPattern = new RegExp(`\\s+${cleanExpectedAmount}(?=\\s|$)`, 'g');
        cleanedDescription = cleanedDescription.replace(isolatedPattern, '');

        // Limpiar espacios múltiples resultantes
        cleanedDescription = cleanedDescription.replace(/\s+/g, ' ').trim();

        if (cleanedDescription !== description) {
            console.log(`🔧 [TRIPLED DEBUG] Descripción limpiada: "${description}" → "${cleanedDescription}"`);
        }

        return cleanedDescription;
    }

    /**
     * Extrae datos adicionales específicos del PDF de Banco Falabella
     */
    extractAdditionalData(text) {
        console.log('📄 [ADDITIONAL DATA] Extrayendo datos adicionales de Banco Falabella...');

        const additionalData = {};

        // Buscar "Monto facturado o a pagar período anterior"
        const billedAmountPattern = /monto\s+facturado\s+o\s+a\s+pagar\s+per[ií]odo\s+anterior[\s\S]*?(\d{1,3}(?:\.\d{3})*)/i;
        const billedMatch = text.match(billedAmountPattern);

        if (billedMatch) {
            const billedAmountStr = billedMatch[1];
            const billedAmount = parseInt(billedAmountStr.replace(/\./g, ''), 10);
            additionalData.billedAmount = billedAmount;

            console.log(`💰 [BILLED AMOUNT] Encontrado: "${billedAmountStr}" → ${billedAmount}`);
        } else {
            console.log('⚠️ [BILLED AMOUNT] No se encontró "Monto facturado período anterior"');
            additionalData.billedAmount = 0;
        }

        // Buscar otros datos relevantes para tarjeta de crédito
        const creditLimitPattern = /l[ií]mite\s+de\s+cr[ée]dito[\s\S]*?(\d{1,3}(?:\.\d{3})*)/i;
        const creditLimitMatch = text.match(creditLimitPattern);

        if (creditLimitMatch) {
            const creditLimitStr = creditLimitMatch[1];
            const creditLimit = parseInt(creditLimitStr.replace(/\./g, ''), 10);
            additionalData.creditLimit = creditLimit;

            console.log(`💳 [CREDIT LIMIT] Encontrado: "${creditLimitStr}" → ${creditLimit}`);
        }

        console.log('📊 [ADDITIONAL DATA] Datos extraídos:', additionalData);
        return additionalData;
    }
}