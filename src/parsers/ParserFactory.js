/**
 * ParserFactory - Factory para seleccionar automáticamente el parser adecuado
 * basado en el contenido del documento
 */
class ParserFactory {
    constructor() {
        // Registro de parsers disponibles
        this.availableParsers = [
            BancoFalabellaParser,
            BancoSantanderParser,
            BancoSantanderCuentaCorrienteParser
            // Aquí se pueden agregar más parsers: BancoChileParser, BancoEstadoParser, etc.
        ];
    }

    /**
     * Selecciona automáticamente el mejor parser para el texto dado
     * @param {string} text - Texto completo del documento
     * @returns {Object} - {parser: ParserInstance, confidence: number, bankName: string}
     */
    selectParser(text) {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Texto vacío o inválido');
        }

        let bestParser = null;
        let bestScore = 0;
        let bestBankName = 'Desconocido';

        // Probar cada parser disponible
        for (const ParserClass of this.availableParsers) {
            try {
                const parser = new ParserClass();
                const result = parser.canParse(text);

                console.log(`🔍 Probando ${parser.getBankInfo().bankName}: ${result.confidence}% confianza`);

                if (result.canParse && result.confidence > bestScore) {
                    bestParser = parser;
                    bestScore = result.confidence;
                    bestBankName = result.bankName;
                }
            } catch (error) {
                console.warn(`Error evaluando parser ${ParserClass.name}:`, error);
            }
        }

        if (!bestParser) {
            throw new Error('No se encontró un parser compatible con este documento');
        }

        console.log(`✅ Parser seleccionado: ${bestBankName} (${bestScore}% confianza)`);

        return {
            parser: bestParser,
            confidence: bestScore,
            bankName: bestBankName
        };
    }

    /**
     * Procesa un documento completo usando el parser más adecuado
     * @param {string} text - Texto completo del documento
     * @returns {Object} - Resultado del procesamiento
     */
    processDocument(text) {
        // LOG: Mostrar el texto extraído para debugging
        console.log('📋 TEXTO EXTRAÍDO DEL PDF:');
        console.log('--- INICIO DEL TEXTO ---');
        console.log(text.substring(0, 1000) + '...');
        console.log('--- FIN DEL TEXTO ---');
        console.log(`Total caracteres: ${text.length}`);

        const selection = this.selectParser(text);
        const parser = selection.parser;

        // Extraer líneas del texto
        const lines = this.extractTransactionLines(text);

        console.log(`📄 Procesando ${lines.length} líneas con ${selection.bankName}`);

        // LOG: Mostrar las líneas candidatas encontradas
        console.log('📋 LÍNEAS CANDIDATAS ENCONTRADAS:');
        lines.forEach((line, index) => {
            console.log(`${index + 1}. "${line}"`);
        });

        // Procesar transacciones
        const transactions = parser.parseMultipleTransactions(lines);

        // Extraer datos adicionales específicos del banco (si están disponibles)
        const additionalData = parser.extractAdditionalData ? parser.extractAdditionalData(text) : {};

        const result = {
            bankName: selection.bankName,
            parserConfidence: selection.confidence,
            totalLines: lines.length,
            processedTransactions: transactions,
            successfullyParsed: transactions.length,
            failedLines: lines.length - transactions.length,
            successRate: lines.length > 0 ? Math.round((transactions.length / lines.length) * 100) : 0,
            processingDate: new Date().toISOString(),
            rawLines: lines,
            ...additionalData // Incluir datos adicionales del parser específico
        };

        console.log(`📊 Resultados: ${result.successfullyParsed}/${result.totalLines} transacciones (${result.successRate}% éxito)`);

        return result;
    }

    /**
     * Extrae líneas que podrían ser transacciones del texto
     * @param {string} text - Texto completo
     * @returns {string[]} - Array de líneas candidatas
     */
    extractTransactionLines(text) {
        const allLines = text.split(/\r?\n/);
        const candidateLines = [];

        for (const line of allLines) {
            const cleanLine = line.trim();

            // Filtrar líneas muy cortas o que claramente no son transacciones
            if (cleanLine.length < 10) {
                continue;
            }

            // Filtrar líneas que son claramente headers, footers o metadatos
            if (this.isHeaderOrFooter(cleanLine)) {
                continue;
            }

            // Si tiene patrón de fecha, es candidata
            if (this.hasDatePattern(cleanLine)) {
                candidateLines.push(cleanLine);
            }
        }

        return candidateLines;
    }

    /**
     * Determina si una línea es header, footer o metadatos
     * @param {string} line - Línea a evaluar
     * @returns {boolean} - true si es header/footer
     */
    isHeaderOrFooter(line) {
        const lowerLine = line.toLowerCase();

        // Si la línea tiene fecha Y monto, probablemente es una transacción, no un header
        if (this.hasDatePattern(line) && line.includes('$')) {
            return false;
        }

        const headerFooterKeywords = [
            'página', 'page', 'fecha emisión', 'rut', 'nombre',
            'dirección', 'total', 'saldo', 'resumen',
            'detalle', 'movimientos', 'estado de cuenta',
            '═', '─', '***', '---', '___'
        ];

        return headerFooterKeywords.some(keyword => lowerLine.includes(keyword));
    }

    /**
     * Verifica si una línea tiene patrón de fecha DD/MM/YYYY o DD/MM/YY
     * @param {string} line - Línea a verificar
     * @returns {boolean} - true si tiene fecha
     */
    hasDatePattern(line) {
        // Patrones que aceptan DD/MM/YYYY, DD/MM/YY y DD/MM al inicio (cuenta corriente)
        const datePatterns = [
            /\b\d{1,2}\/\d{1,2}\/(\d{4}|\d{2})\b/,  // dd/mm/yyyy o dd/mm/yy
            /^\d{1,2}\/\d{1,2}\s/                   // dd/mm al inicio de línea
        ];
        return datePatterns.some(pattern => pattern.test(line));
    }

    /**
     * Obtiene lista de bancos soportados
     * @returns {Array} - Lista de bancos con información
     */
    getSupportedBanks() {
        return this.availableParsers.map(ParserClass => {
            try {
                const parser = new ParserClass();
                return parser.getBankInfo();
            } catch (error) {
                return {
                    bankName: ParserClass.name,
                    productType: 'Error',
                    version: 'N/A',
                    error: error.message
                };
            }
        });
    }

    /**
     * Registra un nuevo parser en el factory
     * @param {Class} ParserClass - Clase del parser a registrar
     */
    registerParser(ParserClass) {
        if (!ParserClass || typeof ParserClass !== 'function') {
            throw new Error('Parser debe ser una clase válida');
        }

        // Verificar que extiende AbstractBankParser
        try {
            const testInstance = new ParserClass();
            if (typeof testInstance.parseTransaction !== 'function' ||
                typeof testInstance.canParse !== 'function' ||
                typeof testInstance.getBankInfo !== 'function') {
                throw new Error('Parser debe implementar la interfaz AbstractBankParser');
            }
        } catch (error) {
            throw new Error(`Parser inválido: ${error.message}`);
        }

        this.availableParsers.push(ParserClass);
        console.log(`✅ Parser registrado: ${ParserClass.name}`);
    }

    /**
     * Testing del factory con documento de prueba
     */
    static runTests() {
        console.log('🧪 === TESTING PARSER FACTORY ===');

        const factory = new ParserFactory();

        // Test 1: Verificar parsers soportados
        console.log('\n📋 Bancos soportados:');
        const supportedBanks = factory.getSupportedBanks();
        supportedBanks.forEach(bank => {
            console.log(`  - ${bank.bankName} (${bank.productType}) v${bank.version}`);
        });

        // Test 2: Documento Banco Falabella
        const falabellaDocument = `
        BANCO FALABELLA
        TARJETA CMR
        Estado de Cuenta

        S/I 27/07/2025 Compra falabella plaza vespucio T 37.905 37.905 01/01 sep-2025 37.905
        Santiago 05/08/2025 Colmena golden cross A2 351.357 351.357 01/01 sep-2025 351.357
        06/08/2025 Anulacion pago automatico abono T 17.040 -17.040 01/01 sep-2025 -17.040
        `;

        console.log('\n🏦 Test con documento Banco Falabella:');
        try {
            const result = factory.processDocument(falabellaDocument);
            console.log(`✅ Procesamiento exitoso:`);
            console.log(`   Banco: ${result.bankName}`);
            console.log(`   Transacciones: ${result.successfullyParsed}/${result.totalLines}`);
            console.log(`   Tasa de éxito: ${result.successRate}%`);
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        // Test 3: Documento desconocido
        console.log('\n❓ Test con documento desconocido:');
        try {
            const unknownDocument = "Este es un texto que no pertenece a ningún banco";
            factory.processDocument(unknownDocument);
        } catch (error) {
            console.log(`✅ Error esperado: ${error.message}`);
        }

        return true;
    }
}