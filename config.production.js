/**
 * Configuración para Producción
 * Este archivo usa variables de entorno de Netlify
 */

// Función para obtener variables de entorno (Netlify las inyecta en window)
function getEnvVar(name, defaultValue = null) {
    // En Netlify, las variables de entorno se inyectan como window.ENV
    if (typeof window !== 'undefined' && window.ENV && window.ENV[name]) {
        return window.ENV[name];
    }

    // Fallback a variables locales para desarrollo
    const localConfig = {
        'SUPABASE_URL': 'https://zmdurcynvxdsvzjdcpgi.supabase.co',
        'SUPABASE_ANON_KEY': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InptZHVyY3ludnhkc3Z6amRjcGdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzgxMjYsImV4cCI6MjA3NDkxNDEyNn0.iC8OxMXA5k5tITY4Q3mrNoOOac7fVBoSjpAC6rCMF-E'
    };

    return localConfig[name] || defaultValue;
}

const CONFIG = {
    // =================================================================
    // CONFIGURACIÓN SUPABASE (PRODUCCIÓN)
    // =================================================================
    supabase: {
        url: getEnvVar('SUPABASE_URL'),
        anonKey: getEnvVar('SUPABASE_ANON_KEY'),

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
        name: 'AnalisisEC',
        version: '1.0.0',
        environment: 'production',

        // Configuración de cache para producción
        cache: {
            duration: 10 * 60 * 1000, // 10 minutos en producción
            maxSize: 500
        },

        // Logging reducido en producción
        logging: {
            level: 'warn',
            supabaseOperations: false
        }
    },

    // =================================================================
    // CONFIGURACIÓN DE CATEGORIZACIÓN
    // =================================================================
    categorization: {
        hierarchy: ['product', 'bank', 'global'],

        defaults: {
            priority: 100,
            confidence: 0.95,
            caseSensitive: false,
            ruleType: 'contains'
        },

        // Auditoría reducida en producción
        audit: {
            enabled: true,
            sampleRate: 0.1 // 10% en producción
        }
    },

    // =================================================================
    // CONFIGURACIÓN DE FALLBACKS
    // =================================================================
    fallback: {
        useLocalStorage: true,
        autoSync: true,
        maxLocalRules: 500
    }
};

// =================================================================
// FUNCIONES DE UTILIDAD
// =================================================================

CONFIG.isSupabaseConfigured = function() {
    return this.supabase.url &&
           this.supabase.url !== 'TU_SUPABASE_URL_AQUI' &&
           this.supabase.anonKey &&
           this.supabase.anonKey !== 'TU_SUPABASE_ANON_KEY_AQUI';
};

CONFIG.getEnvironmentConfig = function() {
    return { ...this };
};

CONFIG.logStatus = function() {
    const status = {
        supabaseConfigured: this.isSupabaseConfigured(),
        environment: this.app.environment,
        version: this.app.version,
        fallbackEnabled: this.fallback.useLocalStorage
    };

    console.log('⚙️ [CONFIG] Configuración de producción cargada:', status);

    if (!status.supabaseConfigured) {
        console.warn('🟡 [CONFIG] Supabase no configurado - verificar variables de entorno');
    } else {
        console.log('✅ [CONFIG] Supabase configurado correctamente');
    }

    return status;
};

// Hacer disponible globalmente
window.CONFIG = CONFIG;

// Log inicial solo en desarrollo
if (typeof console !== 'undefined' && window.location.hostname === 'localhost') {
    CONFIG.logStatus();
}