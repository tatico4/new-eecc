/**
 * PDFProcessor - Utilidad para extraer texto de archivos PDF usando PDF.js
 * Maneja la extracción de texto de documentos PDF en el navegador
 */
class PDFProcessor {
    constructor() {
        this.supportedTypes = ['application/pdf'];
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.isInitialized = false;
        this.initializePdfJs();
    }

    /**
     * Inicializa PDF.js
     */
    initializePdfJs() {
        if (typeof pdfjsLib !== 'undefined') {
            // Configurar PDF.js
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            this.isInitialized = true;
        } else {
            console.warn('PDF.js no está disponible. Asegúrate de incluir la biblioteca en tu página.');
        }
    }

    /**
     * Valida si el archivo es un PDF válido
     * @param {File} file - Archivo a validar
     * @returns {Object} - {isValid: boolean, error: string}
     */
    validateFile(file) {
        if (!file) {
            return { isValid: false, error: 'No se proporcionó archivo' };
        }

        if (!this.supportedTypes.includes(file.type)) {
            return { isValid: false, error: 'El archivo debe ser un PDF' };
        }

        if (file.size > this.maxFileSize) {
            return { isValid: false, error: 'El archivo es muy grande (máximo 10MB)' };
        }

        if (file.size === 0) {
            return { isValid: false, error: 'El archivo está vacío' };
        }

        return { isValid: true, error: null };
    }

    /**
     * Extrae texto de un archivo PDF usando PDF.js
     * @param {File} file - Archivo PDF
     * @param {Function} progressCallback - Callback para mostrar progreso (opcional)
     * @param {string} password - Contraseña del PDF (opcional)
     * @returns {Promise<string>} - Texto extraído del PDF
     */
    async extractTextFromFile(file, progressCallback = null, password = null) {
        // Validar archivo
        const validation = this.validateFile(file);
        if (!validation.isValid) {
            throw new Error(validation.error);
        }

        if (!this.isInitialized) {
            throw new Error('PDF.js no está inicializado correctamente.');
        }

        try {
            if (progressCallback) progressCallback(10, 'Leyendo archivo...');

            // Convertir archivo a ArrayBuffer
            const arrayBuffer = await this.fileToArrayBuffer(file);

            if (progressCallback) progressCallback(30, 'Cargando PDF...');

            // Usar PDF.js para extraer texto
            const text = await this.extractTextWithPdfJs(arrayBuffer, progressCallback, password);

            if (progressCallback) progressCallback(100, 'Extracción completada');

            return text;

        } catch (error) {
            console.error('Error extrayendo texto del PDF:', error);

            // Propagar errores específicos sin envolver
            if (error.name === 'PDFPasswordRequired') {
                throw error;
            }

            throw new Error(`Error procesando PDF: ${error.message}`);
        }
    }

    /**
     * Convierte File a ArrayBuffer
     * @param {File} file - Archivo a convertir
     * @returns {Promise<ArrayBuffer>} - ArrayBuffer del archivo
     */
    async fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                resolve(event.target.result);
            };

            reader.onerror = () => {
                reject(new Error('Error leyendo el archivo'));
            };

            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Extrae texto usando PDF.js
     * @param {ArrayBuffer} arrayBuffer - Buffer del PDF
     * @param {Function} progressCallback - Callback de progreso
     * @param {string} password - Contraseña del PDF (opcional)
     * @returns {Promise<string>} - Texto extraído
     */
    async extractTextWithPdfJs(arrayBuffer, progressCallback = null, password = null) {
        try {
            if (progressCallback) progressCallback(40, 'Cargando documento PDF...');

            console.log('🔑 [PDF DEBUG] Intentando cargar PDF con contraseña:', password ? 'SÍ (' + password.length + ' caracteres)' : 'NO');

            // Preparar configuración para cargar el documento PDF
            const config = { data: arrayBuffer };

            // Solo agregar password si existe y no está vacío
            if (password && password.trim()) {
                config.password = password.trim();
                console.log('🔑 [PDF DEBUG] Password agregado a config:', config.password.length, 'caracteres');
            }

            const loadingTask = pdfjsLib.getDocument(config);

            // Cargar el documento PDF (PDF.js lanzará PasswordException si no hay contraseña)
            const pdf = await loadingTask.promise;
            const numPages = pdf.numPages;

            if (progressCallback) progressCallback(50, `Procesando ${numPages} páginas...`);

            let extractedText = '';

            // Procesar cada página
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                if (progressCallback) {
                    const progress = 50 + (pageNum / numPages) * 40;
                    progressCallback(progress, `Procesando página ${pageNum}/${numPages}...`);
                }

                // Obtener la página
                const page = await pdf.getPage(pageNum);

                // Extraer el contenido de texto
                const textContent = await page.getTextContent();

                // Procesar los elementos de texto
                const pageText = this.processTextContent(textContent);
                extractedText += pageText + '\n';
            }

            if (progressCallback) progressCallback(95, 'Finalizando extracción...');

            console.log(`✅ [PDF DEBUG] Texto final extraído con ${extractedText.split('\n').length} líneas`);

            // NO usar cleanExtractedText que daña la separación de líneas
            return extractedText.trim();

        } catch (error) {
            console.error('Error con PDF.js:', error);

            // Verificar si es un error de contraseña
            if (error.name === 'PasswordException' ||
                error.message?.includes('password') ||
                error.message?.includes('encrypted') ||
                error.message?.includes('No password given') ||
                error.code === 1) { // PDF.js error code for password required

                console.log('🔑 [PDF DEBUG] Error de contraseña detectado:', error.name, error.code, error.message);

                // Crear un error específico para contraseña
                const passwordError = new Error('PDF_PASSWORD_REQUIRED');
                passwordError.name = 'PDFPasswordRequired';
                passwordError.originalError = error;
                throw passwordError;
            }

            throw new Error(`Error extrayendo texto del PDF: ${error.message}`);
        }
    }

    /**
     * Procesa el contenido de texto de una página
     * @param {Object} textContent - Contenido de texto de PDF.js
     * @returns {string} - Texto procesado de la página
     */
    processTextContent(textContent) {
        let pageText = '';
        let currentY = null;
        let lineText = '';

        // Ordenar elementos por posición Y (de arriba a abajo) y luego por X (izquierda a derecha)
        const sortedItems = textContent.items.sort((a, b) => {
            // Primero por Y (coordenada vertical)
            const yDiff = Math.abs(a.transform[5] - b.transform[5]);
            if (yDiff > 1) { // Tolerancia más estricta para elementos en la misma línea
                return b.transform[5] - a.transform[5]; // Orden descendente (de arriba a abajo)
            }
            // Si están en la misma línea, ordenar por X (izquierda a derecha)
            return a.transform[4] - b.transform[4];
        });

        console.log(`📝 [PDF DEBUG] Procesando ${sortedItems.length} elementos de texto`);

        for (let i = 0; i < sortedItems.length; i++) {
            const item = sortedItems[i];
            const itemY = Math.round(item.transform[5]);

            // Verificar si cambió la línea Y
            if (currentY !== null && Math.abs(currentY - itemY) > 1) {
                // Agregar la línea anterior al texto si no está vacía
                if (lineText.trim()) {
                    pageText += lineText.trim() + '\n';

                    // Debug: mostrar primeras 10 líneas
                    const lineCount = pageText.split('\n').length;
                    if (lineCount <= 10) {
                        console.log(`📄 [PDF DEBUG] Línea ${lineCount}: "${lineText.trim()}"`);
                    }
                }
                lineText = '';
            }

            currentY = itemY;

            // Agregar el texto del elemento a la línea actual
            if (lineText && !lineText.endsWith(' ') && !item.str.startsWith(' ')) {
                lineText += ' ';
            }
            lineText += item.str;
        }

        // Agregar la última línea
        if (lineText.trim()) {
            pageText += lineText.trim() + '\n';
            const lineCount = pageText.split('\n').length;
            if (lineCount <= 10) {
                console.log(`📄 [PDF DEBUG] Línea final ${lineCount}: "${lineText.trim()}"`);
            }
        }

        // Post-procesamiento: dividir líneas muy largas que contengan múltiples transacciones
        pageText = this.splitLongTransactionLines(pageText);

        return pageText;
    }

    /**
     * Divide líneas muy largas que pueden contener múltiples transacciones
     * @param {string} text - Texto de la página
     * @returns {string} - Texto con líneas divididas apropiadamente
     */
    splitLongTransactionLines(text) {
        const lines = text.split('\n');
        const processedLines = [];

        for (const line of lines) {
            if (line.length > 500) { // Líneas muy largas
                console.log(`🔨 [PDF DEBUG] Dividiendo línea larga (${line.length} chars)`);

                // Buscar patrones de transacciones para dividir
                // Patrón típico: [Ubicación] DD/MM/YYYY [Descripción] [Código] [Montos]
                const transactionPattern = /([A-Za-z\s]*\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+([^T\d]+)\s+([TA]\d?\s+)?(\d{1,3}(?:\.\d{3})*)/g;

                let lastIndex = 0;
                let match;

                while ((match = transactionPattern.exec(line)) !== null) {
                    const matchStart = match.index;

                    // Si hay texto antes de esta transacción, agregarlo
                    if (matchStart > lastIndex) {
                        const beforeText = line.substring(lastIndex, matchStart).trim();
                        if (beforeText) {
                            processedLines.push(beforeText);
                        }
                    }

                    // Encontrar el final de esta transacción (hasta la siguiente fecha o final de línea)
                    const nextMatch = transactionPattern.exec(line);
                    let transactionEnd;

                    if (nextMatch) {
                        transactionEnd = nextMatch.index;
                        // Retroceder el índice para el próximo ciclo
                        transactionPattern.lastIndex = nextMatch.index;
                    } else {
                        transactionEnd = line.length;
                    }

                    const transaction = line.substring(matchStart, transactionEnd).trim();
                    if (transaction) {
                        processedLines.push(transaction);
                        console.log(`✂️ [PDF DEBUG] Transacción extraída: "${transaction}"`);
                    }

                    lastIndex = transactionEnd;

                    if (!nextMatch) break;
                }

                // Agregar cualquier texto restante
                if (lastIndex < line.length) {
                    const remainingText = line.substring(lastIndex).trim();
                    if (remainingText) {
                        processedLines.push(remainingText);
                    }
                }
            } else {
                // Línea normal, agregar tal como está
                processedLines.push(line);
            }
        }

        const result = processedLines.join('\n');
        console.log(`📏 [PDF DEBUG] Líneas originales: ${lines.length}, Líneas procesadas: ${processedLines.length}`);

        return result;
    }

    /**
     * Limpia y normaliza el texto extraído
     * @param {string} text - Texto raw extraído
     * @returns {string} - Texto limpio
     */
    cleanExtractedText(text) {
        if (!text || typeof text !== 'string') {
            return '';
        }

        return text
            // Remover caracteres de control y no imprimibles
            .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
            // Normalizar espacios en blanco múltiples
            .replace(/\s+/g, ' ')
            // Normalizar saltos de línea múltiples
            .replace(/\n\s*\n/g, '\n')
            // Remover espacios al inicio y final de cada línea
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            // Remover espacios al inicio y final del texto completo
            .trim();
    }

    /**
     * Procesa un archivo y extrae líneas candidatas para parsing
     * @param {File} file - Archivo PDF
     * @param {Function} progressCallback - Callback de progreso
     * @param {string} password - Contraseña del PDF (opcional)
     * @returns {Promise<Object>} - {text: string, lines: string[], metadata: Object}
     */
    async processFile(file, progressCallback = null, password = null) {
        try {
            console.log('🔑 [PROCESS DEBUG] processFile iniciado con contraseña:', password ? 'SÍ (' + password.length + ' chars)' : 'NO');

            if (progressCallback) progressCallback(0, 'Iniciando procesamiento...');

            const text = await this.extractTextFromFile(file, (progress, message) => {
                if (progressCallback) progressCallback(progress * 0.8, message);
            }, password);

            if (progressCallback) progressCallback(85, 'Extrayendo líneas candidatas...');

            // Extraer líneas candidatas
            const lines = this.extractCandidateLines(text);

            if (progressCallback) progressCallback(95, 'Generando metadatos...');

            // Generar metadatos
            const metadata = {
                fileName: file.name,
                fileSize: file.size,
                extractedTextLength: text.length,
                totalLines: lines.length,
                processedAt: new Date().toISOString()
            };

            if (progressCallback) progressCallback(100, 'Procesamiento completado');

            return {
                text: text,
                lines: lines,
                metadata: metadata
            };

        } catch (error) {
            console.error('Error procesando archivo:', error);
            throw error;
        }
    }

    /**
     * Extrae líneas candidatas para ser procesadas por los parsers
     * @param {string} text - Texto completo del PDF
     * @returns {string[]} - Array de líneas candidatas
     */
    extractCandidateLines(text) {
        if (!text) return [];

        const allLines = text.split(/\r?\n/);
        const candidateLines = [];

        console.log(`🔍 [PDF DEBUG] Evaluando ${allLines.length} líneas del PDF`);

        for (let i = 0; i < allLines.length; i++) {
            const line = allLines[i];
            const cleanLine = line.trim();

            // Mostrar primeras 20 líneas para debug
            if (i < 20) {
                console.log(`📄 [PDF DEBUG] Línea ${i + 1}: "${cleanLine}"`);
            }

            // Buscar específicamente MONTO CANCELADO para debug
            if (cleanLine.includes('MONTO CANCELADO')) {
                console.log(`🎯 [PDF DEBUG] ENCONTRADO MONTO CANCELADO en línea ${i + 1}: "${cleanLine}"`);
            }

            // Buscar montos negativos para debug
            if (cleanLine.includes('$ -') || cleanLine.includes('$-')) {
                console.log(`💸 [PDF DEBUG] MONTO NEGATIVO en línea ${i + 1}: "${cleanLine}"`);
            }

            // Filtrar líneas muy cortas
            if (cleanLine.length < 10) {
                if (i < 20) console.log(`  ❌ Muy corta (${cleanLine.length} chars)`);
                continue;
            }

            // Verificar si es header
            const isHeader = this.isHeaderLine(cleanLine);
            if (isHeader) {
                if (i < 20) console.log(`  ❌ Es header/metadato`);
                continue;
            }

            // Verificar patrones
            const hasDate = this.hasDatePattern(cleanLine);
            const hasAmount = this.hasAmountPattern(cleanLine);

            if (i < 20) {
                console.log(`  📅 Tiene fecha: ${hasDate}`);
                console.log(`  💰 Tiene monto: ${hasAmount}`);
            }

            // Si tiene patrón de fecha, es candidata
            if (hasDate) {
                candidateLines.push(cleanLine);
                if (i < 20) console.log(`  ✅ Agregada como candidata (fecha)`);
            }

            // También incluir líneas que tengan patrones de montos (números con puntos o comas)
            else if (hasAmount) {
                candidateLines.push(cleanLine);
                if (i < 20) console.log(`  ✅ Agregada como candidata (monto)`);
            }

            if (i < 20 && !hasDate && !hasAmount) {
                console.log(`  ❌ Sin patrones válidos`);
            }
        }

        console.log(`📋 [PDF DEBUG] Total líneas candidatas: ${candidateLines.length}`);

        // Eliminar duplicados manteniendo el orden
        return [...new Set(candidateLines)];
    }

    /**
     * Determina si una línea es un header o metadato
     * @param {string} line - Línea a evaluar
     * @returns {boolean} - true si es header
     */
    isHeaderLine(line) {
        const lowerLine = line.toLowerCase();

        const headerKeywords = [
            'página', 'page', 'fecha emisión', 'rut', 'nombre titular',
            'dirección', 'estado de cuenta', 'resumen', 'detalle',
            'banco falabella', 'periodo', 'cliente', 'tarjeta', 'cuenta corriente',
            'cupon de pago', 'cliente elite', 'fecha facturación', 'monto total facturado',
            'monto mínimo', 'cmr puntos', 'información general', 'cupo total',
            'cupo utilizado', 'cupo disponible', 'cupo compras', 'cupo avance',
            'tasa interés', 'período facturado', 'pagar hasta'
        ];

        // No filtrar líneas que contengan "total" al final, ya que pueden ser transacciones
        const isTransactionLike = lowerLine.includes('total') && (
            this.hasDatePattern(line) || this.hasAmountPattern(line)
        );

        if (isTransactionLike) {
            return false; // No es header, podría ser transacción
        }

        return headerKeywords.some(keyword => lowerLine.includes(keyword));
    }

    /**
     * Verifica si una línea tiene patrón de fecha
     * @param {string} line - Línea a verificar
     * @returns {boolean} - true si tiene fecha
     */
    hasDatePattern(line) {
        const datePatterns = [
            /\b\d{1,2}\/\d{1,2}\/\d{4}\b/,  // dd/mm/yyyy
            /\b\d{1,2}\/\d{1,2}\/\d{2}\b/,  // dd/mm/yy (Santander)
            /^\d{1,2}\/\d{1,2}\s/,          // dd/mm al inicio de línea (Cuenta Corriente)
            /\b\d{4}-\d{1,2}-\d{1,2}\b/,    // yyyy-mm-dd
            /\b\d{1,2}-\d{1,2}-\d{4}\b/     // dd-mm-yyyy
        ];

        return datePatterns.some(pattern => pattern.test(line));
    }

    /**
     * Verifica si una línea tiene patrón de monto
     * @param {string} line - Línea a verificar
     * @returns {boolean} - true si tiene monto
     */
    hasAmountPattern(line) {
        // Patrones para detectar montos (números con separadores de miles)
        const amountPatterns = [
            /\b\d{1,3}(?:\.\d{3})*(?:,\d{2})?\b/,  // 1.000,00 o 1.000
            /\b\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b/,  // 1,000.00 o 1,000
            /\b\d+\.\d{3}\b/,                       // 37.905
            /\b\d+,\d{3}\b/                         // 37,905
        ];

        return amountPatterns.some(pattern => pattern.test(line));
    }

    /**
     * Obtiene información sobre las capacidades del processor
     * @returns {Object} - Información sobre capacidades
     */
    getCapabilities() {
        return {
            supportedTypes: this.supportedTypes,
            maxFileSize: this.maxFileSize,
            maxFileSizeMB: Math.round(this.maxFileSize / (1024 * 1024)),
            hasNativeSupport: this.isInitialized,
            library: 'PDF.js',
            version: typeof pdfjsLib !== 'undefined' ? pdfjsLib.version : 'No disponible'
        };
    }

    /**
     * Testing del processor con casos simulados
     */
    static async runTests() {
        console.log('🧪 === TESTING PDF PROCESSOR ===');

        const processor = new PDFProcessor();

        // Test 1: Verificar capacidades
        console.log('\n📋 Capacidades del processor:');
        const capabilities = processor.getCapabilities();
        console.log(capabilities);

        // Test 2: Validación de archivos
        console.log('\n📁 Test de validación de archivos:');

        // Simular archivo inválido
        const invalidFile = { type: 'text/plain', size: 1000 };
        const validation1 = processor.validateFile(invalidFile);
        console.log(`Archivo inválido: ${validation1.isValid ? '❌ ERROR' : '✅ CORRECTAMENTE RECHAZADO'}`);

        // Simular archivo muy grande
        const largeFile = { type: 'application/pdf', size: 20 * 1024 * 1024 };
        const validation2 = processor.validateFile(largeFile);
        console.log(`Archivo muy grande: ${validation2.isValid ? '❌ ERROR' : '✅ CORRECTAMENTE RECHAZADO'}`);

        // Simular archivo válido
        const validFile = { type: 'application/pdf', size: 1000 };
        const validation3 = processor.validateFile(validFile);
        console.log(`Archivo válido: ${validation3.isValid ? '✅ CORRECTAMENTE ACEPTADO' : '❌ ERROR'}`);

        // Test 3: Limpieza de texto
        console.log('\n🧹 Test de limpieza de texto:');
        const dirtyText = '  Hola\x00\x01mundo\n\n\ncon    espacios  ';
        const cleanText = processor.cleanExtractedText(dirtyText);
        console.log(`Texto sucio: "${dirtyText}"`);
        console.log(`Texto limpio: "${cleanText}"`);

        // Test 4: Extracción de líneas candidatas
        console.log('\n📄 Test de extracción de líneas:');
        const sampleText = `
        BANCO FALABELLA
        Estado de Cuenta
        Página 1

        27/07/2025 Compra falabella plaza vespucio T 37.905
        Esta línea es muy corta
        05/08/2025 Colmena golden cross A2 351.357
        TOTAL MOVIMIENTOS
        19/07/2025 Uber eats T 27.437
        `;

        const lines = processor.extractCandidateLines(sampleText);
        console.log(`Líneas candidatas extraídas: ${lines.length}`);
        lines.forEach((line, index) => {
            console.log(`  ${index + 1}. "${line}"`);
        });

        // Test 5: Verificar disponibilidad de PDF.js
        console.log('\n🔧 Test de PDF.js:');
        if (processor.isInitialized) {
            console.log('✅ PDF.js está inicializado correctamente');
        } else {
            console.log('❌ PDF.js no está disponible');
        }

        return true;
    }
}