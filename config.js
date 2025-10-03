/**
 * Configuración del Sistema - Archivo Principal
 *
 * IMPORTANTE:
 * 1. Reemplaza las credenciales de Supabase con las tuyas
 * 2. No subas este archivo a repositorios públicos con credenciales reales
 * 3. Para producción, usar variables de entorno
 */

const CONFIG = {
    // =================================================================
    // CONFIGURACIÓN SUPABASE
    // =================================================================
    supabase: {
        // 🔧 REEMPLAZA ESTAS CREDENCIALES CON LAS TUYAS:
        url: 'https://zmdurcynvxdsvzjdcpgi.supabase.co', // PEGA TU URL AQUÍ
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZHVyY3ludnhkc3Z6amRjcGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzgxMjYsImV4cCI6MjA3NDkxNDEyNn0.iC8OxMXA5k5tITY4Q3mrNoOOac7fVBoSjpAC6rCMF-E', // PEGA TU ANON KEY AQUÍ

        // Configuración opcional
        options: {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        }
    },

    // =================================================================
    // CONFIGURACIÓN GENERAL
    // =================================================================
    app: {
        name: 'Sistema de Análisis Financiero',
        version: '2.0.0',
        environment: 'development', // 'development' | 'production'

        // Configuración de cache
        cache: {
            duration: 5 * 60 * 1000, // 5 minutos
            maxSize: 1000 // Máximo de elementos en cache
        },

        // Configuración de logs
        logging: {
            level: 'debug', // 'debug' | 'info' | 'warn' | 'error'
            supabaseOperations: true // Log operaciones de Supabase
        }
    },

    // =================================================================
    // CONFIGURACIÓN DE CATEGORIZACIÓN
    // =================================================================
    categorization: {
        // Jerarquía de precedencia
        hierarchy: ['product', 'bank', 'global'],

        // Configuración por defecto para nuevas reglas
        defaults: {
            priority: 100,
            confidence: 0.95,
            caseSensitive: false,
            ruleType: 'contains'
        },

        // Configuración de auditoría
        audit: {
            enabled: true,
            sampleRate: 1.0 // 1.0 = 100% de eventos auditados
        }
    },

    // =================================================================
    // CONFIGURACIÓN DE FALLBACKS (cuando Supabase no está disponible)
    // =================================================================
    fallback: {
        useLocalStorage: true,
        autoSync: true, // Sincronizar cuando Supabase esté disponible
        maxLocalRules: 1000 // Máximo de reglas en localStorage
    }
};

// =================================================================
// FUNCIONES DE UTILIDAD PARA CONFIGURACIÓN
// =================================================================

/**
 * Valida si la configuración de Supabase está lista
 */
CONFIG.isSupabaseConfigured = function() {
    return this.supabase.url &&
           this.supabase.url !== 'TU_SUPABASE_URL_AQUI' &&
           this.supabase.anonKey &&
           this.supabase.anonKey !== 'TU_SUPABASE_ANON_KEY_AQUI';
};

/**
 * Obtiene la configuración para el ambiente actual
 */
CONFIG.getEnvironmentConfig = function() {
    const baseConfig = { ...this };

    if (this.app.environment === 'production') {
        // Configuración específica de producción
        baseConfig.app.logging.level = 'warn';
        baseConfig.app.logging.supabaseOperations = false;
        baseConfig.categorization.audit.sampleRate = 0.1; // 10% en producción
    }

    return baseConfig;
};

/**
 * Log de configuración inicial
 */
CONFIG.logStatus = function() {
    const status = {
        supabaseConfigured: this.isSupabaseConfigured(),
        environment: this.app.environment,
        version: this.app.version,
        fallbackEnabled: this.fallback.useLocalStorage
    };

    console.log('⚙️ [CONFIG] Estado de configuración:', status);

    if (!status.supabaseConfigured) {
        console.warn('🟡 [CONFIG] Supabase no configurado - funcionando en modo local');
        console.warn('🔧 [CONFIG] Para habilitar sincronización, configura las credenciales en config.js');
    }

    return status;
};

// Hacer disponible globalmente
window.CONFIG = CONFIG;

// Log inicial
if (typeof console !== 'undefined') {
    CONFIG.logStatus();
}