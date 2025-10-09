/**
 * CategoryEngine - Motor inteligente de categorización de transacciones
 * Categoriza transacciones basándose en keywords y patrones aprendidos
 */
class CategoryEngine {
    constructor() {
        this.categories = getAllCategories();
        this.customPatterns = new Map(); // Patrones aprendidos por el sistema de entrenamiento
        this.confidenceThreshold = 60; // Umbral mínimo de confianza para categorización automática

        // Cargar patrones personalizados guardados
        this.loadCustomPatterns();
    }

    /**
     * Carga patrones personalizados desde localStorage
     */
    loadCustomPatterns() {
        try {
            // Cargar patrones de categorización personalizados
            const savedPatterns = localStorage.getItem('categoryEngine_customPatterns');
            if (savedPatterns) {
                const patternsData = JSON.parse(savedPatterns);
                for (const [pattern, categoryInfo] of Object.entries(patternsData)) {
                    this.customPatterns.set(pattern, categoryInfo);
                }
                console.log(`✅ Cargados ${this.customPatterns.size} patrones personalizados`);
            }

            // También cargar keywords dinámicas del admin si existen
            const savedKeywords = localStorage.getItem('adminCategories_dynamicKeywords');
            if (savedKeywords) {
                const keywordsData = JSON.parse(savedKeywords);
                for (const [category, keywords] of Object.entries(keywordsData)) {
                    keywords.forEach(keyword => {
                        this.customPatterns.set(keyword.toLowerCase(), {
                            category: category,
                            source: 'admin_dynamic',
                            addedDate: new Date().toISOString()
                        });
                    });
                }
                console.log(`✅ Cargadas keywords dinámicas del admin`);
            }
        } catch (error) {
            console.warn('⚠️ Error cargando patrones personalizados:', error);
        }
    }

    /**
     * Guarda patrones personalizados en localStorage
     */
    saveCustomPatterns() {
        try {
            const patternsObject = {};
            for (const [pattern, categoryInfo] of this.customPatterns) {
                patternsObject[pattern] = categoryInfo;
            }
            localStorage.setItem('categoryEngine_customPatterns', JSON.stringify(patternsObject));
            console.log(`💾 Guardados ${this.customPatterns.size} patrones personalizados`);
        } catch (error) {
            console.warn('⚠️ Error guardando patrones personalizados:', error);
        }
    }

    /**
     * Categoriza una transacción basándose en su descripción
     * @param {string} description - Descripción de la transacción
     * @param {number} amount - Monto de la transacción (opcional, para lógica adicional)
     * @returns {Object} - {category: string, confidence: number, reason: string}
     */
    categorizeTransaction(description, amount = null) {
        if (!description || typeof description !== 'string') {
            return this.createResult('Otros', 0, 'Descripción inválida');
        }

        const cleanDescription = this.cleanDescription(description);

        // PASO 1: Verificar patrones personalizados aprendidos (mayor prioridad)
        const customResult = this.checkCustomPatterns(cleanDescription);
        if (customResult.confidence >= this.confidenceThreshold) {
            return customResult;
        }

        // PASO 2: Categorización por keywords predefinidas
        const keywordResult = this.categorizeByKeywords(cleanDescription);
        if (keywordResult.confidence >= this.confidenceThreshold) {
            return keywordResult;
        }

        // PASO 3: Lógica especial basada en monto para casos específicos
        const amountBasedResult = this.categorizeByAmount(cleanDescription, amount);
        if (amountBasedResult.confidence >= this.confidenceThreshold) {
            return amountBasedResult;
        }

        // PASO 4: Categorización por patrones fuzzy (coincidencias parciales)
        const fuzzyResult = this.categorizeByFuzzyMatch(cleanDescription);
        if (fuzzyResult.confidence >= 30) { // Umbral más bajo para fuzzy matching
            return fuzzyResult;
        }

        // PASO 5: Por defecto, categorizar como "Otros"
        return this.createResult('Otros', 20, 'No se encontró patrón específico');
    }

    /**
     * Categoriza múltiples transacciones en lote
     * @param {Array} transactions - Array de transacciones con descripción
     * @returns {Array} - Array de transacciones con categoría asignada
     */
    categorizeMultipleTransactions(transactions) {
        const results = [];

        for (const transaction of transactions) {
            const categorization = this.categorizeTransaction(
                transaction.description,
                transaction.amount
            );

            const categorizedTransaction = {
                ...transaction,
                category: categorization.category,
                categoryConfidence: categorization.confidence,
                categoryReason: categorization.reason,
                categoryColor: this.categories[categorization.category]?.color || '#9ca3af',
                categoryIcon: this.categories[categorization.category]?.icon || '❓'
            };

            results.push(categorizedTransaction);
        }

        return results;
    }

    /**
     * Verifica patrones personalizados aprendidos por el sistema
     */
    checkCustomPatterns(description) {
        for (const [pattern, categoryInfo] of this.customPatterns) {
            if (description.toLowerCase().includes(pattern.toLowerCase())) {
                return this.createResult(
                    categoryInfo.category,
                    95, // Alta confianza para patrones aprendidos
                    `Patrón aprendido: "${pattern}"`
                );
            }
        }

        return this.createResult('Otros', 0, 'Sin patrones personalizados');
    }

    /**
     * Categorización principal por keywords predefinidas
     */
    categorizeByKeywords(description) {
        const lowerDescription = description.toLowerCase();
        let bestMatch = null;
        let bestScore = 0;
        let matchedKeywords = [];

        // Buscar en todas las categorías (excluyendo "Otros")
        for (const [categoryName, categoryConfig] of Object.entries(this.categories)) {
            if (categoryName === 'Otros') continue;

            let categoryScore = 0;
            let foundKeywords = [];

            // Verificar cada keyword de la categoría
            for (const keyword of categoryConfig.keywords) {
                const keywordLower = keyword.toLowerCase();

                if (lowerDescription.includes(keywordLower)) {
                    // Puntaje basado en longitud del keyword (keywords más específicos = mayor puntaje)
                    let keywordScore = Math.min(keyword.length * 5, 50);

                    // Bonus especial para keywords importantes de transferencias
                    if (keywordLower === 'transf' && lowerDescription.startsWith('transf')) {
                        keywordScore += 10; // Bonus especial para "transf" al inicio
                    }

                    categoryScore += keywordScore;
                    foundKeywords.push(keyword);

                    // Bonus por coincidencia exacta
                    if (lowerDescription === keywordLower) {
                        categoryScore += 30;
                    }

                    // Bonus por keyword al inicio de la descripción
                    if (lowerDescription.startsWith(keywordLower)) {
                        keywordScore += 25; // Incrementado de 15 a 25
                    }

                    // Bonus por keyword como palabra completa (evita "fork" en "forklifts")
                    const wordPattern = new RegExp(`\\b${keywordLower}\\b`, 'i');
                    if (wordPattern.test(lowerDescription)) {
                        keywordScore += 15; // Bonus por palabra completa
                    }
                }
            }

            // Evaluar si es la mejor coincidencia hasta ahora
            if (categoryScore > bestScore) {
                bestScore = categoryScore;
                bestMatch = categoryName;
                matchedKeywords = foundKeywords;
            }
        }

        if (bestMatch && bestScore > 0) {
            const confidence = Math.min(bestScore, 100);
            const reason = `Keywords encontradas: ${matchedKeywords.join(', ')}`;
            return this.createResult(bestMatch, confidence, reason);
        }

        return this.createResult('Otros', 0, 'Sin keywords coincidentes');
    }

    /**
     * Categorización especial basada en monto
     */
    categorizeByAmount(description, amount) {
        if (!amount || typeof amount !== 'number') {
            return this.createResult('Otros', 0, 'Sin monto para análisis');
        }

        // Lógica especial para montos positivos (probables ingresos)
        if (amount > 0) {
            const lowerDesc = description.toLowerCase();

            // Palabras que indican ingreso
            const ingresoKeywords = ['anulacion', 'devolucion', 'reembolso', 'abono', 'transferencia recibida'];
            for (const keyword of ingresoKeywords) {
                if (lowerDesc.includes(keyword)) {
                    return this.createResult('Ingresos', 75, `Monto positivo + keyword: "${keyword}"`);
                }
            }

            // Montos muy altos podrían ser salarios o pagos importantes
            if (amount > 500000) { // Más de 500.000 CLP
                return this.createResult('Ingresos', 40, 'Monto alto sugiere ingreso');
            }
        }

        // Montos típicos para ciertas categorías
        if (amount < 0) { // Gastos
            const absAmount = Math.abs(amount);

            // Rangos típicos para transporte (combustible)
            if (absAmount >= 20000 && absAmount <= 80000) {
                if (description.toLowerCase().includes('shell') ||
                    description.toLowerCase().includes('petrobras') ||
                    description.toLowerCase().includes('copec')) {
                    return this.createResult('Transporte', 60, 'Monto típico de combustible');
                }
            }

            // Rangos típicos para servicios básicos
            if (absAmount >= 10000 && absAmount <= 100000) {
                if (description.toLowerCase().includes('agua') ||
                    description.toLowerCase().includes('luz') ||
                    description.toLowerCase().includes('gas')) {
                    return this.createResult('Servicios Básicos', 50, 'Monto típico de servicios');
                }
            }
        }

        return this.createResult('Otros', 0, 'Sin patrones de monto específicos');
    }

    /**
     * Categorización por coincidencias parciales (fuzzy matching)
     */
    categorizeByFuzzyMatch(description) {
        const lowerDescription = description.toLowerCase();

        // Buscar coincidencias parciales en ejemplos reales
        for (const [categoryName, categoryConfig] of Object.entries(this.categories)) {
            if (categoryName === 'Otros') continue;

            for (const ejemplo of categoryConfig.ejemplos_reales) {
                const similarity = this.calculateSimilarity(lowerDescription, ejemplo.toLowerCase());

                if (similarity >= 0.6) { // 60% de similitud
                    const confidence = Math.round(similarity * 50); // Convertir a escala 0-50
                    return this.createResult(
                        categoryName,
                        confidence,
                        `Similitud con: "${ejemplo}" (${Math.round(similarity * 100)}%)`
                    );
                }
            }
        }

        return this.createResult('Otros', 0, 'Sin coincidencias fuzzy');
    }

    /**
     * Calcula similitud entre dos strings usando Levenshtein distance
     */
    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    /**
     * Calcula distancia de Levenshtein entre dos strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Limpia y normaliza descripción para categorización
     */
    cleanDescription(description) {
        return description
            .trim()
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ') // Remover caracteres especiales
            .replace(/\s+/g, ' ') // Normalizar espacios
            .trim();
    }

    /**
     * Crea objeto de resultado estándar
     */
    createResult(category, confidence, reason) {
        return {
            category: category,
            confidence: Math.round(confidence),
            reason: reason
        };
    }

    /**
     * Añade patrón personalizado aprendido
     * @param {string} pattern - Patrón a reconocer
     * @param {string} category - Categoría a asignar
     * @param {string} source - Fuente del aprendizaje
     */
    addCustomPattern(pattern, category, source = 'admin') {
        if (!pattern || !category || !isValidCategory(category)) {
            throw new Error('Patrón o categoría inválidos');
        }

        this.customPatterns.set(pattern.toLowerCase(), {
            category: category,
            source: source,
            addedDate: new Date().toISOString()
        });

        // Guardar en localStorage
        this.saveCustomPatterns();

        console.log(`✅ Patrón personalizado agregado: "${pattern}" → ${category}`);
    }

    /**
     * Obtiene estadísticas de categorización para un conjunto de transacciones
     */
    getCategorizationStats(transactions) {
        const stats = {};
        const categoryNames = getCategoryNames();

        // Inicializar contadores
        categoryNames.forEach(name => {
            stats[name] = {
                count: 0,
                totalAmount: 0,
                avgConfidence: 0,
                confidences: []
            };
        });

        // Procesar transacciones
        for (const transaction of transactions) {
            const result = this.categorizeTransaction(transaction.description, transaction.amount);
            const category = result.category;

            stats[category].count++;
            stats[category].totalAmount += Math.abs(transaction.amount || 0);
            stats[category].confidences.push(result.confidence);
        }

        // Calcular promedios
        for (const [categoryName, categoryStats] of Object.entries(stats)) {
            if (categoryStats.confidences.length > 0) {
                categoryStats.avgConfidence = Math.round(
                    categoryStats.confidences.reduce((a, b) => a + b, 0) / categoryStats.confidences.length
                );
            }
        }

        return stats;
    }

    /**
     * Testing del motor de categorización
     */
    static runTests() {
        console.log('🧪 === TESTING CATEGORY ENGINE ===');

        const engine = new CategoryEngine();

        // Tests con ejemplos reales del prompt
        const testCases = [
            {description: "Compra falabella plaza vespucio", expected: "Compras"},
            {description: "Colmena golden cross", expected: "Salud y Médicos"},
            {description: "Uber eats", expected: "Comida y Restaurantes"},
            {description: "Shell.irarrazabal.f580", expected: "Transporte"},
            {description: "09-12 seg cesantia 75489", expected: "Bancarios y Finanzas"},
            {description: "Aguas andinas", expected: "Servicios Básicos"},
            {description: "Apple.com/bi", expected: "Entretenimiento"},
            {description: "Anulacion pago automatico abono", expected: "Ingresos"},
            {description: "Mercadopago *sociedad", expected: "Otros"} // Este debería ir a Otros
        ];

        let passed = 0;
        let failed = 0;

        console.log('\n📝 Probando casos de test específicos:');

        testCases.forEach((testCase, index) => {
            const result = engine.categorizeTransaction(testCase.description);

            console.log(`\nTest ${index + 1}: "${testCase.description}"`);
            console.log(`  Esperado: ${testCase.expected}`);
            console.log(`  Obtenido: ${result.category} (${result.confidence}% confianza)`);
            console.log(`  Razón: ${result.reason}`);

            if (result.category === testCase.expected) {
                console.log(`  ✅ PASSED`);
                passed++;
            } else {
                console.log(`  ❌ FAILED`);
                failed++;
            }
        });

        console.log(`\n🎯 === RESULTADOS CATEGORIZACIÓN ===`);
        console.log(`✅ Passed: ${passed}/${testCases.length}`);
        console.log(`❌ Failed: ${failed}/${testCases.length}`);
        console.log(`📊 Success Rate: ${Math.round((passed / testCases.length) * 100)}%`);

        return passed >= 7; // Esperar al menos 7/9 correctos (78%)
    }
}