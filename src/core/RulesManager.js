/**
 * RulesManager - Sistema centralizado de gestión de reglas TO-BE
 * Diseñado para escalabilidad: App móvil + Web + Multi-organización
 *
 * Arquitectura:
 * - Reglas globales (todos los bancos)
 * - Reglas específicas por banco
 * - Persistencia JSON preparada para sincronización
 * - Analytics y métricas
 * - Multi-usuario y multi-organización ready
 */
class RulesManager {
    constructor() {
        // Implementar singleton
        if (RulesManager.instance) {
            console.log('🔄 [RULES] Devolviendo instancia existente de RulesManager');
            return RulesManager.instance;
        }

        console.log('🚀 Iniciando RulesManager v2.0.0 (Supabase)');

        this.organizationId = 'default'; // Para multi-org futuro
        this.config = null;
        this.analytics = null;

        // Storage keys preparados para escalabilidad
        this.storageKeys = {
            config: `parserConfig_${this.organizationId}`,
            analytics: `parserAnalytics_${this.organizationId}`,
            version: `configVersion_${this.organizationId}`
        };

        // Versión para sincronización futura
        this.configVersion = '2.0.0';

        // Inicializar SupabaseClient
        this.supabaseClient = null;
        if (typeof SupabaseClient !== 'undefined') {
            this.supabaseClient = SupabaseClient.getInstance();
            console.log('✅ [RULES] SupabaseClient inicializado');
        } else {
            console.warn('⚠️ [RULES] SupabaseClient no disponible, usando solo localStorage');
        }

        // Guardar instancia singleton
        RulesManager.instance = this;

        this.init();
    }

    // Método estático para obtener instancia
    static getInstance() {
        if (!RulesManager.instance) {
            RulesManager.instance = new RulesManager();
        }
        return RulesManager.instance;
    }

    /**
     * Inicialización del sistema
     */
    async init() {

        await this.loadConfig();
        this.setupDefaultConfig();
        this.initializeAnalytics();

        console.log('✅ RulesManager inicializado correctamente');
    }

    /**
     * Carga configuración desde Supabase
     */
    async loadConfig() {
        try {
            // Si Supabase está disponible, cargar desde allí
            if (this.supabaseClient) {
                console.log('📡 [RULES] Cargando reglas desde Supabase...');
                await this.loadFromSupabase();
            } else {
                // Fallback a localStorage
                console.log('📂 [RULES] Cargando reglas desde localStorage (fallback)...');
                await this.loadFromLocalStorage();
            }

            // Cargar analytics (siempre desde localStorage)
            const analyticsData = localStorage.getItem(this.storageKeys.analytics);
            if (analyticsData) {
                this.analytics = JSON.parse(analyticsData);
                console.log('📊 Analytics cargados');
            }

        } catch (error) {
            console.error('❌ Error cargando configuración:', error);
            this.config = null;
            this.analytics = null;
        }
    }

    /**
     * Carga reglas desde Supabase
     */
    async loadFromSupabase() {
        try {
            this.config = {
                metadata: {
                    organizationId: this.organizationId,
                    version: this.configVersion,
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    source: 'supabase'
                },
                globalRules: [],
                bankSpecificRules: {},
                descriptionCorrections: {
                    global: []
                }
            };

            // 1. Cargar reglas de filtrado globales desde categorization_rules
            const { data: globalFilteringRules, error: error1 } = await this.supabaseClient.supabase
                .from('categorization_rules')
                .select('*')
                .is('bank_id', null)
                .in('rule_type', ['filter_line', 'filter_line_regex'])
                .eq('is_active', true);

            if (error1) {
                console.error('Error cargando reglas globales:', error1);
            } else {
                this.config.globalRules = (globalFilteringRules || []).map(rule => ({
                    id: rule.id,
                    type: rule.rule_type,
                    text: rule.pattern,  // En categorization_rules se llama 'pattern', no 'text_pattern'
                    description: rule.description,
                    active: rule.is_active,
                    created: rule.created_at,
                    author: rule.created_by
                }));
                console.log(`✅ [RULES] ${this.config.globalRules.length} reglas globales cargadas`);
            }

            // 2. Cargar reglas de filtrado por banco
            const { data: banks, error: error2 } = await this.supabaseClient.supabase
                .from('banks')
                .select('id, code, name');

            if (error2) {
                console.error('Error cargando bancos:', error2);
            } else {
                for (const bank of banks || []) {
                    const { data: bankRules, error: error3 } = await this.supabaseClient.supabase
                        .from('categorization_rules')
                        .select('*')
                        .eq('bank_id', bank.id)
                        .in('rule_type', ['filter_line', 'filter_line_regex'])
                        .eq('is_active', true);

                    if (!error3 && bankRules && bankRules.length > 0) {
                        this.config.bankSpecificRules[bank.code] = bankRules.map(rule => ({
                            id: rule.id,
                            type: rule.rule_type,
                            text: rule.pattern,
                            description: rule.description,
                            active: rule.is_active,
                            created: rule.created_at,
                            author: rule.created_by
                        }));
                        console.log(`✅ [RULES] ${bankRules.length} reglas de ${bank.name} cargadas`);
                    } else {
                        this.config.bankSpecificRules[bank.code] = [];
                    }
                }
            }

            // 3. Cargar correcciones globales
            const { data: globalCorrections, error: error4 } = await this.supabaseClient.supabase
                .from('description_corrections')
                .select('*')
                .is('bank_id', null)
                .eq('is_active', true);

            if (error4) {
                console.error('Error cargando correcciones globales:', error4);
            } else {
                this.config.descriptionCorrections.global = (globalCorrections || []).map(correction => ({
                    id: correction.id,
                    pattern: correction.pattern,
                    replacement: correction.replacement,
                    type: correction.correction_type,
                    caseInsensitive: correction.case_insensitive,
                    description: correction.description,
                    active: correction.is_active,
                    created: correction.created_at,
                    author: correction.created_by
                }));
                console.log(`✅ [RULES] ${this.config.descriptionCorrections.global.length} correcciones globales cargadas`);
            }

            // 4. Cargar correcciones por banco
            for (const bank of banks || []) {
                const { data: bankCorrections, error: error5 } = await this.supabaseClient.supabase
                    .from('description_corrections')
                    .select('*')
                    .eq('bank_id', bank.id)
                    .eq('is_active', true);

                if (!error5 && bankCorrections && bankCorrections.length > 0) {
                    this.config.descriptionCorrections[bank.code] = bankCorrections.map(correction => ({
                        id: correction.id,
                        pattern: correction.pattern,
                        replacement: correction.replacement,
                        type: correction.correction_type,
                        caseInsensitive: correction.case_insensitive,
                        description: correction.description,
                        active: correction.is_active,
                        created: correction.created_at,
                        author: correction.created_by
                    }));
                    console.log(`✅ [RULES] ${bankCorrections.length} correcciones de ${bank.name} cargadas`);
                } else {
                    this.config.descriptionCorrections[bank.code] = [];
                }
            }

            console.log('✅ [RULES] Configuración cargada desde Supabase exitosamente');

        } catch (error) {
            console.error('❌ Error cargando desde Supabase:', error);
            // Fallback a localStorage
            await this.loadFromLocalStorage();
        }
    }

    /**
     * Carga reglas desde localStorage (fallback)
     */
    async loadFromLocalStorage() {
        const configData = localStorage.getItem(this.storageKeys.config);

        if (configData) {
            this.config = JSON.parse(configData);
            console.log('📂 Configuración cargada desde localStorage:', Object.keys(this.config));
        }
    }

    /**
     * Configuración por defecto TO-BE
     */
    setupDefaultConfig() {
        if (!this.config) {
            this.config = {
                // Metadatos para escalabilidad
                metadata: {
                    organizationId: this.organizationId,
                    version: this.configVersion,
                    created: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                },

                // Reglas globales (para todos los bancos)
                globalRules: [
                    {
                        id: 'global_1',
                        type: 'contains',
                        text: 'página',
                        description: 'Filtrar numeración de páginas',
                        active: true,
                        created: new Date().toISOString(),
                        author: 'system'
                    },
                    {
                        id: 'global_2',
                        type: 'contains',
                        text: 'www.',
                        description: 'Filtrar URLs web',
                        active: true,
                        created: new Date().toISOString(),
                        author: 'system'
                    }
                ],

                // Reglas específicas por banco
                bankSpecificRules: {
                    'BancoFalabella': [
                        {
                            id: 'falabella_1',
                            type: 'contains',
                            text: 'CMR Puntos',
                            description: 'Filtrar notificaciones de puntos CMR',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        }
                    ],
                    // Preparado para expansión
                    'BancoChile': [],
                    'BCI': [],
                    'Santander': []
                },

                // Sistema de correcciones de descripciones
                descriptionCorrections: {
                    // Correcciones globales (aplicadas a todos los bancos)
                    global: [
                        {
                            id: 'global_caps_1',
                            pattern: 'falabella',
                            replacement: 'Falabella',
                            type: 'word_replace',
                            caseInsensitive: true,
                            description: 'Capitalizar nombre Falabella',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        },
                        {
                            id: 'global_caps_2',
                            pattern: 'sodimac',
                            replacement: 'Sodimac',
                            type: 'word_replace',
                            caseInsensitive: true,
                            description: 'Capitalizar nombre Sodimac',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        }
                    ],
                    // Correcciones específicas por banco
                    'BancoFalabella': [
                        {
                            id: 'falabella_desc_1',
                            pattern: 'compra falabella plaza vespucio t',
                            replacement: 'Compra Falabella Plaza Vespucio',
                            type: 'exact_replace',
                            caseInsensitive: true,
                            description: 'Limpiar descripción Falabella Plaza Vespucio',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        },
                        {
                            id: 'falabella_desc_2',
                            pattern: 'anulacion pago tarjeta cmr eec 0 01/01',
                            replacement: 'Anulación pago tarjeta CMR',
                            type: 'exact_replace',
                            caseInsensitive: true,
                            description: 'Limpiar anulación CMR',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        },
                        {
                            id: 'falabella_desc_3',
                            pattern: '09-12 seg cesantia 75489 784 784 784',
                            replacement: 'Seguro cesantía',
                            type: 'exact_replace',
                            caseInsensitive: true,
                            description: 'Limpiar seguro cesantía',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        },
                        {
                            id: 'falabella_desc_4',
                            pattern: 'uber eats uber eats 500 500 500',
                            replacement: 'Uber Eats',
                            type: 'exact_replace',
                            caseInsensitive: true,
                            description: 'Limpiar Uber Eats duplicado',
                            active: true,
                            created: new Date().toISOString(),
                            author: 'system'
                        }
                    ]
                },

                // Configuraciones avanzadas
                settings: {
                    enableAnalytics: true,
                    autoSync: false, // Para futuro
                    debugMode: false,
                    maxRulesPerBank: 50,
                    cacheTimeout: 3600000 // 1 hora
                }
            };

            this.saveConfig();
            console.log('⚙️ Configuración por defecto inicializada');
        }
    }

    /**
     * Inicializa sistema de analytics
     */
    initializeAnalytics() {
        if (!this.analytics) {
            this.analytics = {
                metadata: {
                    organizationId: this.organizationId,
                    created: new Date().toISOString()
                },
                usage: {
                    totalRulesApplied: 0,
                    transactionsFiltered: 0,
                    totalDocumentsProcessed: 0,
                    averageProcessingTime: 0,
                    lastProcessed: null
                },
                ruleEffectiveness: {},
                bankStats: {},
                dailyStats: {}
            };

            this.saveAnalytics();
            console.log('📊 Sistema de analytics inicializado');
        }
    }

    /**
     * Obtiene todas las reglas globales
     */
    getGlobalRules() {
        return this.config?.globalRules || [];
    }

    /**
     * Obtiene reglas específicas de un banco
     */
    getBankRules(bankName) {
        return this.config?.bankSpecificRules?.[bankName] || [];
    }

    /**
     * Obtiene TODAS las reglas aplicables para un banco
     * (globales + específicas del banco)
     */
    getAllRulesForBank(bankName) {
        const globalRules = this.getGlobalRules();
        const bankRules = this.getBankRules(bankName);

        return [...globalRules, ...bankRules].filter(rule => rule.active);
    }

    /**
     * Agrega nueva regla
     */
    async addRule(bankName, ruleData) {
        const rule = {
            id: this.generateRuleId(bankName),
            type: ruleData.type,
            text: ruleData.text,
            description: ruleData.description || `Filtrar "${ruleData.text}"`,
            active: true,
            created: new Date().toISOString(),
            author: 'admin', // TODO: obtener de contexto de usuario
            ...ruleData
        };

        // Agregar a config local (caché)
        if (bankName === 'global') {
            this.config.globalRules.push(rule);
        } else {
            if (!this.config.bankSpecificRules[bankName]) {
                this.config.bankSpecificRules[bankName] = [];
            }
            this.config.bankSpecificRules[bankName].push(rule);
        }

        this.updateMetadata();
        this.saveConfig();

        // Guardar en Supabase
        if (this.supabaseClient) {
            try {
                const bankId = bankName !== 'global' ? await this.getBankIdByCode(bankName) : null;

                const { data, error } = await this.supabaseClient.client
                    .from('filtering_rules')
                    .insert({
                        bank_id: bankId,
                        rule_type: rule.type,
                        text_pattern: rule.text,
                        description: rule.description,
                        is_active: rule.active,
                        created_by: rule.author
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('❌ Error guardando regla en Supabase:', error);
                } else {
                    // Actualizar ID local con el de Supabase
                    rule.id = data.id;
                    console.log(`✅ [SUPABASE] Regla guardada con ID: ${data.id}`);
                }
            } catch (error) {
                console.error('❌ Error en addRule Supabase:', error);
            }
        }

        console.log(`✅ Regla agregada (${bankName}):`, rule.description);
        return rule;
    }

    /**
     * Actualiza regla existente
     */
    async updateRule(ruleId, updates) {
        let updated = false;

        // Buscar en reglas globales
        const globalRule = this.config.globalRules.find(r => r.id === ruleId);
        if (globalRule) {
            Object.assign(globalRule, updates);
            updated = true;
        }

        // Buscar en reglas específicas de bancos
        if (!updated) {
            for (const bankName in this.config.bankSpecificRules) {
                const rule = this.config.bankSpecificRules[bankName].find(r => r.id === ruleId);
                if (rule) {
                    Object.assign(rule, updates);
                    updated = true;
                    break;
                }
            }
        }

        if (updated) {
            this.updateMetadata();
            this.saveConfig();

            // Actualizar en Supabase
            if (this.supabaseClient) {
                try {
                    const updateData = {};
                    if (updates.type) updateData.rule_type = updates.type;
                    if (updates.text) updateData.text_pattern = updates.text;
                    if (updates.description) updateData.description = updates.description;
                    if (updates.active !== undefined) updateData.is_active = updates.active;

                    const { error } = await this.supabaseClient.client
                        .from('filtering_rules')
                        .update(updateData)
                        .eq('id', ruleId);

                    if (error) {
                        console.error('❌ Error actualizando regla en Supabase:', error);
                    } else {
                        console.log(`✅ [SUPABASE] Regla actualizada: ${ruleId}`);
                    }
                } catch (error) {
                    console.error('❌ Error en updateRule Supabase:', error);
                }
            }

            console.log(`✅ Regla actualizada: ${ruleId}`);
        }

        return updated;
    }

    /**
     * Elimina regla
     */
    async deleteRule(ruleId) {
        let deleted = false;

        // Eliminar de reglas globales
        const globalIndex = this.config.globalRules.findIndex(r => r.id === ruleId);
        if (globalIndex !== -1) {
            this.config.globalRules.splice(globalIndex, 1);
            deleted = true;
        }

        // Eliminar de reglas específicas de bancos
        if (!deleted) {
            for (const bankName in this.config.bankSpecificRules) {
                const bankIndex = this.config.bankSpecificRules[bankName].findIndex(r => r.id === ruleId);
                if (bankIndex !== -1) {
                    this.config.bankSpecificRules[bankName].splice(bankIndex, 1);
                    deleted = true;
                    break;
                }
            }
        }

        if (deleted) {
            this.updateMetadata();
            this.saveConfig();

            // Eliminar de Supabase
            if (this.supabaseClient) {
                try {
                    const { error } = await this.supabaseClient.client
                        .from('filtering_rules')
                        .delete()
                        .eq('id', ruleId);

                    if (error) {
                        console.error('❌ Error eliminando regla en Supabase:', error);
                    } else {
                        console.log(`✅ [SUPABASE] Regla eliminada: ${ruleId}`);
                    }
                } catch (error) {
                    console.error('❌ Error en deleteRule Supabase:', error);
                }
            }

            console.log(`🗑️ Regla eliminada: ${ruleId}`);
        }

        return deleted;
    }

    /**
     * Obtiene el ID de un banco por su código
     */
    async getBankIdByCode(bankCode) {
        if (!this.supabaseClient) return null;

        try {
            const { data, error } = await this.supabaseClient.client
                .from('banks')
                .select('id')
                .eq('code', bankCode)
                .single();

            if (error) {
                console.error(`Error obteniendo ID de banco ${bankCode}:`, error);
                return null;
            }

            return data?.id || null;
        } catch (error) {
            console.error(`Error en getBankIdByCode:`, error);
            return null;
        }
    }

    /**
     * Verifica si una línea debe ser filtrada por las reglas
     */
    shouldFilterLine(line, bankName) {
        const rules = this.getAllRulesForBank(bankName);

        for (const rule of rules) {
            if (this.testRule(rule, line)) {
                // Registrar uso para analytics
                this.recordRuleUsage(rule.id);
                return {
                    shouldFilter: true,
                    rule: rule,
                    reason: rule.description
                };
            }
        }

        return {
            shouldFilter: false,
            rule: null,
            reason: null
        };
    }

    /**
     * Prueba una regla específica contra un texto
     */
    testRule(rule, text) {
        if (!rule.active) return false;

        const lowerText = text.toLowerCase();
        const lowerRuleText = rule.text.toLowerCase();

        switch (rule.type) {
            case 'contains':
            case 'filter_line':
                return lowerText.includes(lowerRuleText);
            case 'starts':
                return lowerText.startsWith(lowerRuleText);
            case 'ends':
                return lowerText.endsWith(lowerRuleText);
            case 'exact':
            case 'exact_match':
                return lowerText.trim() === lowerRuleText;
            case 'regex':
            case 'filter_line_regex':
                try {
                    const regex = new RegExp(rule.text, 'i');
                    return regex.test(text);
                } catch (error) {
                    console.error('❌ Error en regex:', rule.text, error);
                    return false;
                }
            default:
                return false;
        }
    }

    /**
     * Exporta configuración completa
     */
    exportConfig() {
        const exportData = {
            ...this.config,
            exportMetadata: {
                exportedAt: new Date().toISOString(),
                exportedBy: 'admin', // TODO: contexto de usuario
                version: this.configVersion
            }
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Importa configuración
     */
    importConfig(configString) {
        try {
            const importedConfig = JSON.parse(configString);

            // Validación básica
            if (!importedConfig.globalRules || !importedConfig.bankSpecificRules) {
                throw new Error('Formato de configuración inválido');
            }

            // Backup de configuración actual
            const backup = { ...this.config };

            try {
                this.config = importedConfig;
                this.updateMetadata();
                this.saveConfig();

                console.log('✅ Configuración importada exitosamente');
                return { success: true, message: 'Configuración importada correctamente' };

            } catch (saveError) {
                // Restaurar backup en caso de error
                this.config = backup;
                throw saveError;
            }

        } catch (error) {
            console.error('❌ Error importando configuración:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Obtiene estadísticas generales
     */
    getStats() {
        const globalCount = this.config.globalRules.filter(r => r.active).length;
        const bankCounts = {};
        let totalBankRules = 0;

        for (const bankName in this.config.bankSpecificRules) {
            const activeRules = this.config.bankSpecificRules[bankName].filter(r => r.active).length;
            bankCounts[bankName] = activeRules;
            totalBankRules += activeRules;
        }

        return {
            totalActiveRules: globalCount + totalBankRules,
            globalRules: globalCount,
            bankRules: totalBankRules,
            bankCounts: bankCounts,
            totalBanks: Object.keys(this.config.bankSpecificRules).length,
            ...this.analytics.usage
        };
    }

    // =================== SISTEMA DE CORRECCIONES DE DESCRIPCIONES ===================

    /**
     * Obtiene todas las correcciones globales
     */
    getGlobalCorrections() {
        return this.config?.descriptionCorrections?.global || [];
    }

    /**
     * Obtiene correcciones específicas de un banco
     */
    getBankCorrections(bankName) {
        return this.config?.descriptionCorrections?.[bankName] || [];
    }

    /**
     * Obtiene TODAS las correcciones aplicables para un banco
     * (globales + específicas del banco)
     */
    getAllCorrectionsForBank(bankName) {
        const globalCorrections = this.getGlobalCorrections();
        const bankCorrections = this.getBankCorrections(bankName);

        return [...globalCorrections, ...bankCorrections].filter(correction => correction.active);
    }

    /**
     * Aplica correcciones a una descripción
     */
    applyDescriptionCorrections(description, bankName) {
        if (!description || description.trim().length === 0) {
            return description;
        }

        let correctedDescription = description;
        const corrections = this.getAllCorrectionsForBank(bankName);
        const appliedCorrections = [];

        for (const correction of corrections) {
            const beforeCorrection = correctedDescription;
            correctedDescription = this.applySingleCorrection(correctedDescription, correction);

            if (beforeCorrection !== correctedDescription) {
                appliedCorrections.push(correction);
                // Registrar uso para analytics
                this.recordCorrectionUsage(correction.id);
            }
        }

        return {
            originalDescription: description,
            correctedDescription: correctedDescription,
            appliedCorrections: appliedCorrections,
            wasModified: description !== correctedDescription
        };
    }

    /**
     * Aplica una corrección específica
     */
    applySingleCorrection(text, correction) {
        if (!correction.active) return text;

        try {
            const flags = correction.caseInsensitive ? 'gi' : 'g';

            switch (correction.type) {
                case 'word_replace':
                    // Reemplaza palabras completas
                    const wordRegex = new RegExp(`\\b${this.escapeRegex(correction.pattern)}\\b`, flags);
                    return text.replace(wordRegex, correction.replacement);

                case 'exact_replace':
                    // Reemplaza texto exacto
                    const exactRegex = new RegExp(this.escapeRegex(correction.pattern), flags);
                    return text.replace(exactRegex, correction.replacement);

                case 'regex_replace':
                    // Usa el patrón como regex directamente
                    const regex = new RegExp(correction.pattern, flags);
                    return text.replace(regex, correction.replacement);

                case 'cleanup':
                    // Limpieza general (espacios, caracteres especiales al final)
                    return text
                        .replace(/\s+/g, ' ')                    // Espacios múltiples
                        .replace(/\b[A-Z]{1,2}\s*$/g, '')       // Códigos al final
                        .replace(/\d{2}\/\d{2}\s*[a-z]{3}-\d{4}/gi, '') // Fechas proceso
                        .trim();

                default:
                    console.warn(`Tipo de corrección desconocido: ${correction.type}`);
                    return text;
            }
        } catch (error) {
            console.error(`Error aplicando corrección ${correction.id}:`, error);
            return text;
        }
    }

    /**
     * Agrega nueva corrección
     */
    async addCorrection(bankName, correctionData) {
        const correction = {
            id: this.generateCorrectionId(bankName),
            pattern: correctionData.pattern,
            replacement: correctionData.replacement,
            type: correctionData.type || 'exact_replace',
            caseInsensitive: correctionData.caseInsensitive !== false,
            description: correctionData.description || `Corregir "${correctionData.pattern}"`,
            active: true,
            created: new Date().toISOString(),
            author: 'admin',
            ...correctionData
        };

        // Agregar a config local (caché)
        if (bankName === 'global') {
            this.config.descriptionCorrections.global.push(correction);
        } else {
            if (!this.config.descriptionCorrections[bankName]) {
                this.config.descriptionCorrections[bankName] = [];
            }
            this.config.descriptionCorrections[bankName].push(correction);
        }

        this.updateMetadata();
        this.saveConfig();

        // Guardar en Supabase
        if (this.supabaseClient) {
            try {
                const bankId = bankName !== 'global' ? await this.getBankIdByCode(bankName) : null;

                const { data, error } = await this.supabaseClient.client
                    .from('description_corrections')
                    .insert({
                        bank_id: bankId,
                        correction_type: correction.type,
                        pattern: correction.pattern,
                        replacement: correction.replacement,
                        case_insensitive: correction.caseInsensitive,
                        description: correction.description,
                        is_active: correction.active,
                        created_by: correction.author
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('❌ Error guardando corrección en Supabase:', error);
                } else {
                    // Actualizar ID local con el de Supabase
                    correction.id = data.id;
                    console.log(`✅ [SUPABASE] Corrección guardada con ID: ${data.id}`);
                }
            } catch (error) {
                console.error('❌ Error en addCorrection Supabase:', error);
            }
        }

        console.log(`✅ Corrección agregada (${bankName}):`, correction.description);
        return correction;
    }

    /**
     * Actualiza corrección existente
     */
    async updateCorrection(correctionId, updates) {
        let updated = false;

        // Buscar en correcciones globales
        const globalCorrection = this.config.descriptionCorrections.global.find(c => c.id === correctionId);
        if (globalCorrection) {
            Object.assign(globalCorrection, updates);
            updated = true;
        }

        // Buscar en correcciones específicas de bancos
        if (!updated) {
            for (const bankName in this.config.descriptionCorrections) {
                if (bankName === 'global') continue;
                const correction = this.config.descriptionCorrections[bankName].find(c => c.id === correctionId);
                if (correction) {
                    Object.assign(correction, updates);
                    updated = true;
                    break;
                }
            }
        }

        if (updated) {
            this.updateMetadata();
            this.saveConfig();

            // Actualizar en Supabase
            if (this.supabaseClient) {
                try {
                    const updateData = {};
                    if (updates.type) updateData.correction_type = updates.type;
                    if (updates.pattern) updateData.pattern = updates.pattern;
                    if (updates.replacement) updateData.replacement = updates.replacement;
                    if (updates.caseInsensitive !== undefined) updateData.case_insensitive = updates.caseInsensitive;
                    if (updates.description) updateData.description = updates.description;
                    if (updates.active !== undefined) updateData.is_active = updates.active;

                    const { error } = await this.supabaseClient.client
                        .from('description_corrections')
                        .update(updateData)
                        .eq('id', correctionId);

                    if (error) {
                        console.error('❌ Error actualizando corrección en Supabase:', error);
                    } else {
                        console.log(`✅ [SUPABASE] Corrección actualizada: ${correctionId}`);
                    }
                } catch (error) {
                    console.error('❌ Error en updateCorrection Supabase:', error);
                }
            }

            console.log(`✅ Corrección actualizada: ${correctionId}`);
        }

        return updated;
    }

    /**
     * Elimina corrección
     */
    async deleteCorrection(correctionId) {
        let deleted = false;

        // Eliminar de correcciones globales
        const globalIndex = this.config.descriptionCorrections.global.findIndex(c => c.id === correctionId);
        if (globalIndex !== -1) {
            this.config.descriptionCorrections.global.splice(globalIndex, 1);
            deleted = true;
        }

        // Eliminar de correcciones específicas de bancos
        if (!deleted) {
            for (const bankName in this.config.descriptionCorrections) {
                if (bankName === 'global') continue;
                const bankIndex = this.config.descriptionCorrections[bankName].findIndex(c => c.id === correctionId);
                if (bankIndex !== -1) {
                    this.config.descriptionCorrections[bankName].splice(bankIndex, 1);
                    deleted = true;
                    break;
                }
            }
        }

        if (deleted) {
            this.updateMetadata();
            this.saveConfig();

            // Eliminar de Supabase
            if (this.supabaseClient) {
                try {
                    const { error } = await this.supabaseClient.client
                        .from('description_corrections')
                        .delete()
                        .eq('id', correctionId);

                    if (error) {
                        console.error('❌ Error eliminando corrección en Supabase:', error);
                    } else {
                        console.log(`✅ [SUPABASE] Corrección eliminada: ${correctionId}`);
                    }
                } catch (error) {
                    console.error('❌ Error en deleteCorrection Supabase:', error);
                }
            }

            console.log(`🗑️ Corrección eliminada: ${correctionId}`);
        }

        return deleted;
    }

    /**
     * Prueba correcciones en un texto de ejemplo
     */
    testCorrections(testText, bankName) {
        const result = this.applyDescriptionCorrections(testText, bankName);
        return {
            original: result.originalDescription,
            corrected: result.correctedDescription,
            wasModified: result.wasModified,
            appliedCorrections: result.appliedCorrections.map(c => ({
                id: c.id,
                description: c.description,
                pattern: c.pattern,
                replacement: c.replacement,
                type: c.type
            }))
        };
    }

    /**
     * Analiza un texto y sugiere correcciones automáticamente
     */
    suggestCorrection(description) {
        // Detectar patrones comunes problemáticos
        const suggestions = [];

        // Números repetidos al final (ej: "texto 123 123 123")
        const repeatedNumbers = description.match(/^(.+?)\s+(\d+)(\s+\2){2,}\s*$/);
        if (repeatedNumbers) {
            suggestions.push({
                type: 'exact_replace',
                pattern: description,
                replacement: repeatedNumbers[1].trim(),
                reason: 'Números repetidos al final detectados',
                confidence: 90
            });
        }

        // Texto duplicado (ej: "uber eats uber eats")
        const duplicatedText = description.match(/^(.+?)\s+\1\s/i);
        if (duplicatedText) {
            const cleanText = this.capitalizeWords(duplicatedText[1]);
            suggestions.push({
                type: 'exact_replace',
                pattern: description,
                replacement: cleanText,
                reason: 'Texto duplicado detectado',
                confidence: 85
            });
        }

        // Códigos al final (ej: "texto eec 0 01/01")
        if (description.match(/\s+(eec|cmr)\s+\d+\s+\d{2}\/\d{2}\s*$/i)) {
            const cleaned = description.replace(/\s+(eec|cmr)\s+\d+\s+\d{2}\/\d{2}\s*$/i, '').trim();
            suggestions.push({
                type: 'exact_replace',
                pattern: description,
                replacement: this.capitalizeWords(cleaned),
                reason: 'Códigos innecesarios al final',
                confidence: 95
            });
        }

        // Fechas y números mezclados (ej: "09-12 seg cesantia 75489 784")
        if (description.match(/^\d{2}-\d{2}\s+(.+?)\s+\d+\s+\d+/)) {
            const match = description.match(/^\d{2}-\d{2}\s+(.+?)\s+\d+/);
            if (match) {
                const cleaned = this.capitalizeWords(match[1].replace(/\s+\d+.*$/, ''));
                suggestions.push({
                    type: 'exact_replace',
                    pattern: description,
                    replacement: cleaned,
                    reason: 'Fecha y números innecesarios detectados',
                    confidence: 88
                });
            }
        }

        return suggestions.length > 0 ? suggestions[0] : null;
    }

    /**
     * Capitaliza palabras correctamente
     */
    capitalizeWords(text) {
        return text.toLowerCase()
            .split(' ')
            .map(word => {
                // Excepciones que deben mantenerse en minúsculas
                const lowercase = ['de', 'del', 'la', 'el', 'en', 'con', 'por', 'para', 'y', 'o', 'a'];
                if (lowercase.includes(word) && text.indexOf(word) !== 0) {
                    return word;
                }
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(' ');
    }

    // =================== MÉTODOS INTERNOS ===================

    /**
     * Genera ID único para regla
     */
    generateRuleId(bankName) {
        const prefix = bankName === 'global' ? 'global' : bankName.toLowerCase();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Genera ID único para corrección
     */
    generateCorrectionId(bankName) {
        const prefix = bankName === 'global' ? 'global_corr' : `${bankName.toLowerCase()}_corr`;
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        return `${prefix}_${timestamp}_${random}`;
    }

    /**
     * Escapa caracteres especiales para regex
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Actualiza metadatos de configuración
     */
    updateMetadata() {
        this.config.metadata.lastUpdated = new Date().toISOString();
        this.config.metadata.version = this.configVersion;
    }

    /**
     * Registra uso de regla para analytics
     */
    recordRuleUsage(ruleId) {
        if (!this.config.settings.enableAnalytics) return;

        this.analytics.usage.totalRulesApplied++;

        if (!this.analytics.ruleEffectiveness[ruleId]) {
            this.analytics.ruleEffectiveness[ruleId] = {
                timesUsed: 0,
                firstUsed: new Date().toISOString(),
                lastUsed: null
            };
        }

        this.analytics.ruleEffectiveness[ruleId].timesUsed++;
        this.analytics.ruleEffectiveness[ruleId].lastUsed = new Date().toISOString();

        // Guardar analytics de forma throttled (no en cada uso)
        this.throttledSaveAnalytics();
    }

    /**
     * Registra uso de corrección para analytics
     */
    recordCorrectionUsage(correctionId) {
        if (!this.config.settings.enableAnalytics) return;

        if (!this.analytics.correctionEffectiveness) {
            this.analytics.correctionEffectiveness = {};
        }

        if (!this.analytics.correctionEffectiveness[correctionId]) {
            this.analytics.correctionEffectiveness[correctionId] = {
                timesUsed: 0,
                firstUsed: new Date().toISOString(),
                lastUsed: null
            };
        }

        this.analytics.correctionEffectiveness[correctionId].timesUsed++;
        this.analytics.correctionEffectiveness[correctionId].lastUsed = new Date().toISOString();

        // Incrementar contador general de correcciones aplicadas
        if (!this.analytics.usage.totalCorrectionsApplied) {
            this.analytics.usage.totalCorrectionsApplied = 0;
        }
        this.analytics.usage.totalCorrectionsApplied++;

        // Guardar analytics de forma throttled
        this.throttledSaveAnalytics();
    }

    /**
     * Guarda analytics con throttling
     */
    throttledSaveAnalytics() {
        if (this.analyticsThrottle) return;

        this.analyticsThrottle = setTimeout(() => {
            this.saveAnalytics();
            this.analyticsThrottle = null;
        }, 5000); // Guardar cada 5 segundos máximo
    }

    /**
     * Guarda configuración en storage
     */
    saveConfig() {
        try {
            // Guardar caché local para fallback
            localStorage.setItem(this.storageKeys.config, JSON.stringify(this.config));
            localStorage.setItem(this.storageKeys.version, this.configVersion);
            console.log('💾 Configuración guardada en caché local');

            // Las reglas individuales se guardan en Supabase mediante addRule/updateRule/deleteRule

        } catch (error) {
            console.error('❌ Error guardando configuración:', error);
        }
    }

    /**
     * Guarda analytics en storage
     */
    saveAnalytics() {
        try {
            localStorage.setItem(this.storageKeys.analytics, JSON.stringify(this.analytics));
            console.log('📊 Analytics guardados');
        } catch (error) {
            console.error('❌ Error guardando analytics:', error);
        }
    }

    // =================== MÉTODOS PREPARADOS PARA FUTURO ===================

    /**
     * Sincronización con servidor (placeholder para futuro)
     */
    async syncWithServer() {
        // TODO: Implementar cuando se tenga API REST
        console.log('🔄 Sync con servidor (pendiente implementación)');
    }

    /**
     * Obtiene reglas desde servidor (placeholder para futuro)
     */
    async fetchFromServer() {
        // TODO: Implementar llamada a API REST
        console.log('📡 Fetch desde servidor (pendiente implementación)');
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.RulesManager = RulesManager;
}