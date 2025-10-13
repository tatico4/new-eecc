/**
 * SupabaseClient - Cliente para gestión de reglas de categorización
 * Integra con Supabase para persistencia en la nube
 */
class SupabaseClient {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.cache = {
            banks: null,
            products: null,
            categories: null,
            rules: null,
            lastUpdate: null
        };

        // Configuración por defecto (sobrescribir con variables de entorno)
        this.config = {
            url: null, // Se configurará dinámicamente
            key: null, // Se configurará dinámicamente
            cacheDuration: 5 * 60 * 1000 // 5 minutos
        };
    }

    /**
     * Método estático para obtener la instancia global (Singleton)
     */
    static getInstance() {
        if (!window.supabaseClient) {
            window.supabaseClient = new SupabaseClient();
        }
        return window.supabaseClient;
    }

    /**
     * Inicializa la conexión con Supabase
     */
    async init(supabaseUrl, supabaseKey) {
        try {
            if (!supabaseUrl || !supabaseKey) {
                console.warn('🟡 [SUPABASE] Credenciales no configuradas - funcionando en modo local');
                return false;
            }

            // Verificar si Supabase está disponible
            if (typeof window.supabase === 'undefined') {
                console.warn('🟡 [SUPABASE] Cliente Supabase no disponible - funcionando en modo local');
                return false;
            }

            this.config.url = supabaseUrl;
            this.config.key = supabaseKey;

            // Crear cliente
            this.supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

            // Verificar conexión
            const { data, error } = await this.supabase.from('banks').select('count', { count: 'exact' });

            if (error) {
                console.error('❌ [SUPABASE] Error de conexión:', error);
                return false;
            }

            this.isConnected = true;
            console.log('✅ [SUPABASE] Conexión establecida exitosamente');
            return true;

        } catch (error) {
            console.error('❌ [SUPABASE] Error inicializando:', error);
            return false;
        }
    }

    /**
     * Verifica si el cache es válido
     */
    isCacheValid() {
        if (!this.cache.lastUpdate) return false;
        const now = Date.now();
        return (now - this.cache.lastUpdate) < this.config.cacheDuration;
    }

    /**
     * Obtiene todos los bancos
     */
    async getBanks() {
        if (!this.isConnected) return this.getLocalBanks();

        try {
            if (this.cache.banks && this.isCacheValid()) {
                return this.cache.banks;
            }

            const { data, error } = await this.supabase
                .from('banks')
                .select('*')
                .eq('is_active', true)
                .order('name');

            if (error) throw error;

            this.cache.banks = data;
            this.cache.lastUpdate = Date.now();

            console.log(`📊 [SUPABASE] Bancos cargados: ${data.length}`);
            return data;

        } catch (error) {
            console.error('❌ [SUPABASE] Error obteniendo bancos:', error);
            return this.getLocalBanks();
        }
    }

    /**
     * Obtiene productos de un banco
     */
    async getProducts(bankId = null) {
        if (!this.isConnected) return this.getLocalProducts();

        try {
            let query = this.supabase
                .from('products')
                .select('*, banks(code, name)')
                .eq('is_active', true);

            if (bankId) {
                query = query.eq('bank_id', bankId);
            }

            const { data, error } = await query.order('name');

            if (error) throw error;

            console.log(`📊 [SUPABASE] Productos cargados: ${data.length}`);
            return data;

        } catch (error) {
            console.error('❌ [SUPABASE] Error obteniendo productos:', error);
            return this.getLocalProducts();
        }
    }

    /**
     * Obtiene todas las categorías
     */
    async getCategories() {
        if (!this.isConnected) return this.getLocalCategories();

        try {
            if (this.cache.categories && this.isCacheValid()) {
                return this.cache.categories;
            }

            const { data, error } = await this.supabase
                .from('categories')
                .select('*')
                .eq('is_active', true)
                .order('sort_order');

            if (error) throw error;

            this.cache.categories = data;
            this.cache.lastUpdate = Date.now();

            console.log(`📊 [SUPABASE] Categorías cargadas: ${data.length}`);
            return data;

        } catch (error) {
            console.error('❌ [SUPABASE] Error obteniendo categorías:', error);
            return this.getLocalCategories();
        }
    }

    /**
     * Obtiene reglas de categorización con jerarquía
     */
    async getCategorizationRules(bankCode = null, productCode = null) {
        if (!this.isConnected) return this.getLocalRules();

        try {
            let query = this.supabase
                .from('categorization_rules')
                .select(`
                    *,
                    banks(code, name),
                    products(code, name),
                    categories(code, name, icon, color)
                `)
                .eq('is_active', true);

            // Aplicar filtros jerárquicos
            if (bankCode && productCode) {
                // Específico: banco + producto, banco general, y global
                query = query.or(`and(banks.code.eq.${bankCode},products.code.eq.${productCode}),and(banks.code.eq.${bankCode},product_id.is.null),and(bank_id.is.null,product_id.is.null)`);
            } else if (bankCode) {
                // Banco específico y global
                query = query.or(`and(banks.code.eq.${bankCode},product_id.is.null),and(bank_id.is.null,product_id.is.null)`);
            } else {
                // Solo global
                query = query.and(query.is('bank_id', null), query.is('product_id', null));
            }

            const { data, error } = await query.order('priority');

            if (error) throw error;

            console.log(`📊 [SUPABASE] Reglas cargadas: ${data.length} para ${bankCode || 'global'}/${productCode || 'todos'}`);
            return data;

        } catch (error) {
            console.error('❌ [SUPABASE] Error obteniendo reglas:', error);
            return this.getLocalRules();
        }
    }

    /**
     * Crea una nueva regla de categorización
     */
    async createRule(rule) {
        if (!this.isConnected) {
            console.warn('🟡 [SUPABASE] No conectado - regla no guardada en la nube');
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('categorization_rules')
                .insert([{
                    bank_id: rule.bankId,
                    product_id: rule.productId,
                    category_id: rule.categoryId,
                    rule_type: rule.ruleType,
                    pattern: rule.pattern,
                    case_sensitive: rule.caseSensitive || false,
                    priority: rule.priority || 100,
                    confidence: rule.confidence || 0.95,
                    description: rule.description,
                    created_by: rule.createdBy || 'admin'
                }])
                .select()
                .single();

            if (error) throw error;

            console.log('✅ [SUPABASE] Regla creada:', data.id);
            this.invalidateCache();
            return data;

        } catch (error) {
            console.error('❌ [SUPABASE] Error creando regla:', error);
            throw error;
        }
    }

    /**
     * Actualiza una regla existente
     */
    async updateRule(ruleId, updates) {
        if (!this.isConnected) {
            console.warn('🟡 [SUPABASE] No conectado - regla no actualizada en la nube');
            return null;
        }

        try {
            const { data, error } = await this.supabase
                .from('categorization_rules')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', ruleId)
                .select()
                .single();

            if (error) throw error;

            console.log('✅ [SUPABASE] Regla actualizada:', ruleId);
            this.invalidateCache();
            return data;

        } catch (error) {
            console.error('❌ [SUPABASE] Error actualizando regla:', error);
            throw error;
        }
    }

    /**
     * Elimina una regla (soft delete)
     */
    async deleteRule(ruleId) {
        if (!this.isConnected) {
            console.warn('🟡 [SUPABASE] No conectado - regla no eliminada de la nube');
            return false;
        }

        try {
            const { error } = await this.supabase
                .from('categorization_rules')
                .update({ is_active: false })
                .eq('id', ruleId);

            if (error) throw error;

            console.log('✅ [SUPABASE] Regla eliminada:', ruleId);
            this.invalidateCache();
            return true;

        } catch (error) {
            console.error('❌ [SUPABASE] Error eliminando regla:', error);
            return false;
        }
    }

    /**
     * Registra uso de una regla para auditoría
     */
    async auditRuleUsage(usage) {
        if (!this.isConnected) return;

        try {
            await this.supabase
                .from('categorization_audit')
                .insert([{
                    rule_id: usage.ruleId,
                    original_description: usage.originalDescription,
                    matched_pattern: usage.matchedPattern,
                    assigned_category: usage.assignedCategory,
                    confidence_score: usage.confidenceScore,
                    bank_detected: usage.bankDetected,
                    product_detected: usage.productDetected,
                    parser_version: usage.parserVersion || '1.0.0',
                    user_session: usage.userSession || 'anonymous'
                }]);

            // No loggeamos esto para evitar spam
        } catch (error) {
            console.error('❌ [SUPABASE] Error en auditoría:', error);
        }
    }

    /**
     * Invalida el cache
     */
    invalidateCache() {
        this.cache = {
            banks: null,
            products: null,
            categories: null,
            rules: null,
            lastUpdate: null
        };
    }

    /**
     * Fallbacks locales cuando Supabase no está disponible
     */
    getLocalBanks() {
        return [
            { id: '1', code: 'BancoFalabella', name: 'Banco Falabella' },
            { id: '2', code: 'BancoChile', name: 'Banco de Chile' }
        ];
    }

    getLocalProducts() {
        return [
            { id: '1', code: 'TarjetaCredito', name: 'Tarjeta de Crédito', type: 'credit_card' },
            { id: '2', code: 'CuentaCorriente', name: 'Cuenta Corriente', type: 'checking_account' }
        ];
    }

    getLocalCategories() {
        return [
            { id: '1', code: 'alimentacion', name: 'Alimentación', icon: '🍽️', color: '#FF6384' },
            { id: '2', code: 'transporte', name: 'Transporte', icon: '🚗', color: '#36A2EB' },
            { id: '3', code: 'servicios', name: 'Servicios', icon: '💡', color: '#FF9F40' },
            { id: '4', code: 'otros', name: 'Otros', icon: '📦', color: '#C9CBCF' }
        ];
    }

    getLocalRules() {
        return []; // LocalStorage será manejado por RulesManager
    }

    /**
     * Estado de la conexión
     */
    getStatus() {
        return {
            connected: this.isConnected,
            url: this.config.url,
            cacheValid: this.isCacheValid(),
            lastUpdate: this.cache.lastUpdate
        };
    }
}

// Instancia global
window.SupabaseClient = SupabaseClient;

// Inicialización automática
(async function initializeSupabase() {
    try {
        // Esperar a que CONFIG esté disponible
        if (typeof window.CONFIG === 'undefined') {
            console.log('🟡 [SUPABASE] Esperando configuración...');
            setTimeout(initializeSupabase, 100);
            return;
        }

        // Crear instancia global
        window.supabaseClient = new SupabaseClient();

        // Intentar conectar si está configurado
        if (window.CONFIG.isSupabaseConfigured()) {
            console.log('🔄 [SUPABASE] Iniciando conexión...');
            const connected = await window.supabaseClient.init(
                window.CONFIG.supabase.url,
                window.CONFIG.supabase.anonKey
            );

            if (connected) {
                // Cargar datos iniciales para verificar conexión
                const banks = await window.supabaseClient.getBanks();
                const categories = await window.supabaseClient.getCategories();

                console.log(`✅ [SUPABASE] Sistema listo con ${banks.length} bancos y ${categories.length} categorías`);
            }
        } else {
            console.log('🟡 [SUPABASE] No configurado - funcionando en modo local');
            window.supabaseClient = new SupabaseClient(); // Instancia sin conexión
        }

    } catch (error) {
        console.error('❌ [SUPABASE] Error en inicialización automática:', error);
        window.supabaseClient = new SupabaseClient(); // Fallback
    }
})();