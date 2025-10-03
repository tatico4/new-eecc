/**
 * BancoSantanderCuentaCorrienteParser - Parser específico para cartolas de cuenta corriente de Banco Santander
 *
 * Formato esperado: DD/MM SUCURSAL [N° DOCUMENTO] DESCRIPCIÓN [CÓDIGO] MONTO [SALDO]
 * Ejemplo: "02/05 O.Gerencia 0160136375 Transf a Angeles Hernandez 25.000"
 */
class BancoSantanderCuentaCorrienteParser extends AbstractBankParser {
    constructor() {
        super();
        this.bankName = 'Banco Santander - Cuenta Corriente';
        this.productType = 'Cuenta Corriente';
        this.version = '1.0.0';

        // Patrones de líneas de transacciones
        this.patterns = {
            // Patrón principal: DD/MM SUCURSAL [CODIGO] DESCRIPCIÓN MONTO
            transaction: /^(\d{1,2}\/\d{1,2})\s+([A-Za-z\.]+)\s+([^\s]+\s+)?(.+?)\s+(\d{1,3}(?:\.\d{3})*)\s*(\d{1,3}(?:\.\d{3})*)?$/,

            // Patrón alternativo para transferencias con código de documento
            transferenciaConCodigo: /^(\d{1,2}\/\d{1,2})\s+([A-Za-z\.]+)\s+(\d+)\s+(.+?)\s+(\d{1,3}(?:\.\d{3})*)\s*(\d{1,3}(?:\.\d{3})*)?$/,

            // Patrón para compras nacionales con código
            compraNacional: /^(\d{1,2}\/\d{1,2})\s+([A-Za-z\.]+)\s+Compra Nacional\s+(.+?)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*)\s*(\d{1,3}(?:\.\d{3})*)?$/,

            // Detección de fechas DD/MM (cuenta corriente usa año actual implícito)
            fecha: /^\d{1,2}\/\d{1,2}\s/
        };
    }

    /**
     * Determina si este parser puede procesar el texto dado
     */
    canParse(text) {
        if (!text || typeof text !== 'string') {
            return { canParse: false, confidence: 0, bankName: this.bankName };
        }

        const lowerText = text.toLowerCase();
        let confidence = 0;

        // Indicadores específicos de cuenta corriente Santander
        const indicators = [
            { text: 'cuenta corriente ml', weight: 30 },
            { text: 'banco santander chile', weight: 25 },
            { text: 'cartola desde hasta', weight: 20 },
            { text: 'o.gerencia', weight: 15 },
            { text: 'compra nacional', weight: 15 },
            { text: 'saldos diarios', weight: 10 },
            { text: 'detalle de movimientos', weight: 10 },
            { text: 'informacion de cuenta corriente', weight: 15 }
        ];

        // Calcular confianza basada en indicadores
        indicators.forEach(indicator => {
            if (lowerText.includes(indicator.text)) {
                confidence += indicator.weight;
            }
        });

        // Verificar presencia de patrones de transacciones
        const lines = text.split(/\r?\n/);
        let transactionLines = 0;

        for (const line of lines) {
            const cleanLine = line.trim();
            if (this.patterns.fecha.test(cleanLine)) {
                transactionLines++;
                if (transactionLines >= 3) {
                    confidence += 20;
                    break;
                }
            }
        }

        const canParse = confidence >= 50;

        console.log(`🏦 BancoSantanderCuentaCorrienteParser - Confianza: ${confidence}% - ${canParse ? 'PUEDE PARSEAR' : 'NO PUEDE PARSEAR'}`);

        return {
            canParse,
            confidence: Math.min(confidence, 100),
            bankName: this.bankName
        };
    }

    /**
     * Parsea una línea individual de transacción
     */
    parseTransaction(line) {
        if (!line || typeof line !== 'string') {
            return null;
        }

        const cleanLine = line.trim();

        // Intentar con diferentes patrones
        const patterns = [
            { name: 'compraNacional', pattern: this.patterns.compraNacional },
            { name: 'transferenciaConCodigo', pattern: this.patterns.transferenciaConCodigo },
            { name: 'transaction', pattern: this.patterns.transaction }
        ];

        for (const { name, pattern } of patterns) {
            const match = cleanLine.match(pattern);
            if (match) {
                console.log(`✅ Patrón ${name} coincide: "${cleanLine}"`);
                return this.extractTransactionData(match, name);
            }
        }

        console.log(`❌ No hay patrón que coincida: "${cleanLine}"`);
        return null;
    }

    /**
     * Extrae datos de la transacción según el patrón identificado
     */
    extractTransactionData(match, patternName) {
        try {
            let fecha, sucursal, codigo, descripcion, monto, saldo;

            switch (patternName) {
                case 'compraNacional':
                    [, fecha, sucursal, descripcion, codigo, monto, saldo] = match;
                    descripcion = `Compra Nacional ${descripcion}`;
                    break;

                case 'transferenciaConCodigo':
                    [, fecha, sucursal, codigo, descripcion, monto, saldo] = match;
                    break;

                case 'transaction':
                    [, fecha, sucursal, codigo, descripcion, monto, saldo] = match;
                    // Si hay código al inicio de descripción, lo separamos
                    if (codigo && codigo.trim()) {
                        descripcion = descripcion.trim();
                    }
                    break;

                default:
                    return null;
            }

            // Limpiar descripción
            descripcion = descripcion.trim();

            // Convertir fecha DD/MM a formato completo (agregar año actual)
            const currentYear = new Date().getFullYear();
            const [day, month] = fecha.split('/');
            const fullDate = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            // Limpiar y convertir monto
            const cleanMonto = parseInt(monto.replace(/\./g, ''), 10);

            // Determinar tipo de transacción
            const type = this.determineTransactionType(descripcion);

            // LÓGICA CUENTA CORRIENTE: Aplicar signo según tipo de transacción
            // - Depósitos/Ingresos = positivo (suma dinero)
            // - Compras/Gastos = negativo (resta dinero)
            const finalAmount = type === 'deposit' ? cleanMonto : -cleanMonto;

            const transaction = {
                date: fullDate,
                description: descripcion,
                amount: finalAmount,
                place: sucursal || 'No especificado',
                type: type,
                rawLine: match[0],
                documentCode: codigo || null,
                balance: saldo ? parseInt(saldo.replace(/\./g, ''), 10) : null
            };

            console.log(`✅ Transacción parseada:`, transaction);
            return transaction;

        } catch (error) {
            console.error('Error parseando transacción:', error);
            return null;
        }
    }

    /**
     * Determina el tipo de transacción basado en la descripción
     */
    determineTransactionType(description) {
        const lowerDesc = description.toLowerCase();

        // Transferencias y abonos (ingresos)
        if (lowerDesc.includes('transf de') ||
            lowerDesc.includes('fondo mutuo') ||
            lowerDesc.includes('deposito')) {
            return 'deposit';
        }

        // Compras y gastos (egresos)
        if (lowerDesc.includes('compra nacional') ||
            lowerDesc.includes('transf a') ||
            lowerDesc.includes('traspaso') ||
            lowerDesc.includes('egreso') ||
            lowerDesc.includes('pago') ||
            lowerDesc.includes('intereses') ||
            lowerDesc.includes('impuesto')) {
            return 'purchase';
        }

        // Por defecto, considerar como gasto si no se puede determinar
        return 'purchase';
    }

    /**
     * Extrae datos adicionales específicos del banco
     */
    extractAdditionalData(text) {
        const data = {};

        try {
            // Extraer información de cuenta corriente
            const cuentaMatch = text.match(/INFORMACION DE CUENTA CORRIENTE[\s\S]*?SALDO INICIAL\s+DEPOSITOS\s+OTROS ABONOS\s+CHEQUES\s+OTROS CARGOS\s+IMPUESTOS\s+SALDO FINAL\s+(\d{1,3}(?:\.\d{3})*)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*)/);

            if (cuentaMatch) {
                data.saldoInicial = cuentaMatch[1];
                data.depositos = cuentaMatch[2];
                data.otrosAbonos = cuentaMatch[3];
                data.cheques = cuentaMatch[4];
                data.otrosCargos = cuentaMatch[5];
                data.impuestos = cuentaMatch[6];
                data.saldoFinal = cuentaMatch[7];

                // Campos calculados para el dashboard
                data.totalAbonos = parseInt(cuentaMatch[3].replace(/\./g, ''), 10); // OTROS ABONOS
                data.totalCargos = parseInt(cuentaMatch[5].replace(/\./g, ''), 10) + parseInt(cuentaMatch[6].replace(/\./g, ''), 10); // OTROS CARGOS + IMPUESTOS
                data.saldoInicialNumerico = parseInt(cuentaMatch[1].replace(/\./g, ''), 10);
                data.saldoFinalNumerico = parseInt(cuentaMatch[7].replace(/\./g, ''), 10);

                // Variación del saldo
                data.variacionSaldo = data.saldoFinalNumerico - data.saldoInicialNumerico;
                data.porcentajeVariacion = data.saldoInicialNumerico > 0 ?
                    Math.round((data.variacionSaldo / data.saldoInicialNumerico) * 100) : 0;
            }

            // Extraer información de línea de crédito
            const lineaMatch = text.match(/INFORMACION DE LINEA DE[\s\S]*?CUPO APROBADO\s+MONTO UTILIZADO\s+SALDO DISPONIBLE\s+FECHA VENCIMIENTO\s+(\d{1,3}(?:\.\d{3})*)\s+(\d+)\s+(\d{1,3}(?:\.\d{3})*)\s+(\d{1,2}\/\d{1,2}\/\d{4})/);

            if (lineaMatch) {
                data.cupoAprobado = lineaMatch[1];
                data.montoUtilizado = lineaMatch[2];
                data.saldoDisponible = lineaMatch[3];
                data.fechaVencimiento = lineaMatch[4];
            }

            // Extraer período de la cartola
            const periodoMatch = text.match(/CARTOLA\s+DESDE\s+HASTA\s+PAGINA\s+(\d+)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})/);

            if (periodoMatch) {
                data.numeroCartola = periodoMatch[1];
                data.fechaDesde = periodoMatch[2];
                data.fechaHasta = periodoMatch[3];
            }

        } catch (error) {
            console.warn('Error extrayendo datos adicionales:', error);
        }

        return data;
    }

    /**
     * Obtiene información del banco
     */
    getBankInfo() {
        return {
            bankName: this.bankName,
            productType: this.productType,
            version: this.version,
            supportedFormats: ['Cartola Cuenta Corriente DD/MM'],
            features: ['Transferencias', 'Compras Nacionales', 'Fondos Mutuos', 'Línea de Crédito']
        };
    }

    /**
     * Testing del parser con datos de ejemplo
     */
    static runTests() {
        console.log('🧪 === TESTING BANCO SANTANDER CUENTA CORRIENTE PARSER ===');

        const parser = new BancoSantanderCuentaCorrienteParser();

        // Test con líneas de ejemplo del documento
        const testLines = [
            "02/05 O.Gerencia 0160136375 Transf a Angeles Hernandez 25.000",
            "02/05 O.Gerencia Compra Nacional CASA IDEAS PLAZA EGANA 512066 19.990",
            "05/05 Agustinas Traspaso Internet a T. Crédito 400.000",
            "05/05 O.Gerencia Compra Nacional NP SCOTIABANK CAE 512556 78.506",
            "27/05 Agustinas 077680794K Transf de TRADING COMPANY WM 466.666 648.170"
        ];

        console.log('\\n📋 Probando líneas de transacciones:');
        testLines.forEach((line, index) => {
            console.log(`\\n${index + 1}. Probando: "${line}"`);
            const result = parser.parseTransaction(line);
            if (result) {
                console.log(`   ✅ Parseado exitosamente:`, {
                    fecha: result.date,
                    descripcion: result.description,
                    monto: result.amount,
                    tipo: result.type
                });
            } else {
                console.log(`   ❌ No se pudo parsear`);
            }
        });

        return true;
    }
}