/**
 * Sistema de Analytics y Monitoreo Básico
 * Registra eventos importantes y errores para monitoreo
 */
class Analytics {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.startTime = Date.now();
        this.events = [];
        this.errors = [];
        this.maxEvents = 100; // Límite local

        this.setupErrorHandling();
        this.trackPageLoad();
    }

    /**
     * Generar ID de sesión único
     */
    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Configurar captura automática de errores
     */
    setupErrorHandling() {
        // Errores JavaScript
        window.addEventListener('error', (event) => {
            this.trackError('javascript_error', {
                message: event.message,
                filename: event.filename,
                line: event.lineno,
                column: event.colno,
                stack: event.error?.stack,
                url: window.location.href
            });
        });

        // Errores de promesas no capturadas
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('unhandled_promise_rejection', {
                reason: event.reason?.toString(),
                stack: event.reason?.stack,
                url: window.location.href
            });
        });

        // Errores de recursos (imágenes, scripts, etc.)
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.trackError('resource_error', {
                    type: event.target.tagName,
                    source: event.target.src || event.target.href,
                    url: window.location.href
                });
            }
        }, true);
    }

    /**
     * Rastrear carga de página
     */
    trackPageLoad() {
        this.trackEvent('page_load', {
            url: window.location.href,
            referrer: document.referrer,
            user_agent: navigator.userAgent,
            screen_resolution: `${screen.width}x${screen.height}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });

        // Medir tiempo de carga cuando la página esté lista
        window.addEventListener('load', () => {
            const loadTime = Date.now() - this.startTime;
            this.trackEvent('page_load_complete', {
                load_time_ms: loadTime,
                url: window.location.href
            });
        });
    }

    /**
     * Rastrear evento personalizado
     */
    trackEvent(eventName, data = {}) {
        const event = {
            id: this.generateEventId(),
            session_id: this.sessionId,
            event: eventName,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            data: data
        };

        this.events.push(event);
        this.maintainEventLimit();

        // Log en consola para desarrollo
        if (this.isDevelopment()) {
            console.log('📊 [ANALYTICS]', eventName, data);
        }

        // Enviar a Supabase si está disponible
        this.sendToSupabase(event);

        return event;
    }

    /**
     * Rastrear error
     */
    trackError(errorType, errorData = {}) {
        const error = {
            id: this.generateEventId(),
            session_id: this.sessionId,
            error_type: errorType,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            user_agent: navigator.userAgent,
            data: errorData
        };

        this.errors.push(error);

        // Log en consola
        console.error('❌ [ANALYTICS] Error:', errorType, errorData);

        // Enviar a Supabase
        this.sendErrorToSupabase(error);

        return error;
    }

    /**
     * Rastrear uso de funcionalidades específicas
     */
    trackFileUpload(fileInfo) {
        this.trackEvent('file_upload', {
            file_size: fileInfo.size,
            file_type: fileInfo.type,
            file_name_length: fileInfo.name.length, // No enviamos el nombre completo por privacidad
            has_password: fileInfo.hasPassword || false
        });
    }

    trackFileProcessed(processingInfo) {
        this.trackEvent('file_processed', {
            bank_detected: processingInfo.bank,
            transaction_count: processingInfo.transactionCount,
            processing_time_ms: processingInfo.processingTime,
            categories_used: processingInfo.categoriesUsed,
            success: processingInfo.success
        });
    }

    trackAdminLogin(success, userInfo = {}) {
        this.trackEvent('admin_login', {
            success: success,
            user_role: userInfo.role,
            login_time: new Date().toISOString()
        });
    }

    trackRuleCreated(ruleInfo) {
        this.trackEvent('rule_created', {
            bank: ruleInfo.bank,
            category: ruleInfo.category,
            rule_type: ruleInfo.type,
            pattern_length: ruleInfo.pattern?.length || 0
        });
    }

    /**
     * Enviar evento a Supabase
     */
    async sendToSupabase(event) {
        try {
            if (!window.supabase || !CONFIG?.isSupabaseConfigured()) {
                return;
            }

            const supabase = window.supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.anonKey
            );

            await supabase.from('analytics_events').insert({
                session_id: event.session_id,
                event_name: event.event,
                event_data: event.data,
                url: event.url,
                timestamp: event.timestamp
            });

        } catch (error) {
            console.warn('📊 No se pudo enviar evento a Supabase:', error);
        }
    }

    /**
     * Enviar error a Supabase
     */
    async sendErrorToSupabase(error) {
        try {
            if (!window.supabase || !CONFIG?.isSupabaseConfigured()) {
                return;
            }

            const supabase = window.supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.anonKey
            );

            await supabase.from('error_logs').insert({
                session_id: error.session_id,
                error_type: error.error_type,
                error_data: error.data,
                url: error.url,
                user_agent: error.user_agent,
                timestamp: error.timestamp
            });

        } catch (error) {
            console.warn('❌ No se pudo enviar error a Supabase:', error);
        }
    }

    /**
     * Obtener resumen de sesión
     */
    getSessionSummary() {
        return {
            session_id: this.sessionId,
            start_time: new Date(this.startTime).toISOString(),
            duration_minutes: Math.round((Date.now() - this.startTime) / 60000),
            events_count: this.events.length,
            errors_count: this.errors.length,
            page_url: window.location.href
        };
    }

    /**
     * Exportar datos para depuración
     */
    exportData() {
        return {
            session: this.getSessionSummary(),
            events: this.events,
            errors: this.errors
        };
    }

    /**
     * Utilidades
     */
    generateEventId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    maintainEventLimit() {
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
        if (this.errors.length > this.maxEvents) {
            this.errors = this.errors.slice(-this.maxEvents);
        }
    }

    isDevelopment() {
        return window.location.hostname === 'localhost' ||
               window.location.hostname.includes('127.0.0.1') ||
               CONFIG?.app?.environment === 'development';
    }
}

// Crear instancia global
window.Analytics = new Analytics();

// Agregar eventos de lifecycle
window.addEventListener('beforeunload', () => {
    const summary = window.Analytics.getSessionSummary();
    console.log('📊 [ANALYTICS] Fin de sesión:', summary);
});

// Rastrear navegación SPA
let currentPath = window.location.pathname;
setInterval(() => {
    if (window.location.pathname !== currentPath) {
        currentPath = window.location.pathname;
        window.Analytics.trackEvent('navigation', {
            new_path: currentPath,
            previous_path: currentPath
        });
    }
}, 1000);