/**
 * AdminAuth - Sistema de Autenticación para Administradores
 * Maneja login, logout y verificación de sesiones admin
 */
class AdminAuth {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
        this.sessionCheckInterval = null;
    }

    /**
     * Inicializa el sistema de autenticación
     */
    async init() {
        try {
            // Verificar si CONFIG está disponible
            if (typeof CONFIG === 'undefined') {
                throw new Error('CONFIG no está disponible');
            }

            // Verificar configuración de Supabase
            if (!CONFIG.isSupabaseConfigured()) {
                throw new Error('Supabase no está configurado');
            }

            // Inicializar cliente Supabase
            this.supabase = window.supabase.createClient(
                CONFIG.supabase.url,
                CONFIG.supabase.anonKey,
                CONFIG.supabase.options
            );

            // Verificar sesión actual
            await this.checkCurrentSession();

            // Configurar verificación periódica de sesión
            this.setupSessionCheck();

            this.isInitialized = true;
            console.log('✅ [AUTH] Sistema de autenticación inicializado');

            return true;

        } catch (error) {
            console.error('❌ [AUTH] Error inicializando:', error);
            return false;
        }
    }

    /**
     * Login de administrador
     */
    async login(email, password) {
        try {
            if (!this.isInitialized) {
                throw new Error('Sistema de autenticación no inicializado');
            }

            // Buscar usuario admin
            const { data: adminUser, error: userError } = await this.supabase
                .from('admin_users')
                .select('*')
                .eq('email', email.toLowerCase())
                .eq('is_active', true)
                .single();

            if (userError || !adminUser) {
                throw new Error('Credenciales inválidas');
            }

            // Verificar contraseña usando función de la BD
            const { data: passwordCheck, error: passwordError } = await this.supabase
                .rpc('verify_password', {
                    password: password,
                    hash: adminUser.password_hash
                });

            if (passwordError || !passwordCheck) {
                throw new Error('Credenciales inválidas');
            }

            // Crear sesión
            const sessionToken = this.generateSessionToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 8); // 8 horas

            const { error: sessionError } = await this.supabase
                .from('admin_sessions')
                .insert({
                    admin_user_id: adminUser.id,
                    session_token: sessionToken,
                    expires_at: expiresAt.toISOString(),
                    ip_address: await this.getClientIP(),
                    user_agent: navigator.userAgent
                });

            if (sessionError) {
                throw new Error('Error creando sesión');
            }

            // Actualizar último login
            await this.supabase
                .from('admin_users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', adminUser.id);

            // Guardar sesión localmente
            this.currentUser = adminUser;
            localStorage.setItem('admin_session_token', sessionToken);
            localStorage.setItem('admin_user', JSON.stringify({
                id: adminUser.id,
                email: adminUser.email,
                full_name: adminUser.full_name,
                role: adminUser.role
            }));

            // Log de actividad
            await this.logActivity('login', 'session', null, {
                ip: await this.getClientIP(),
                user_agent: navigator.userAgent
            });

            console.log('✅ [AUTH] Login exitoso para:', email);
            return {
                success: true,
                user: {
                    id: adminUser.id,
                    email: adminUser.email,
                    full_name: adminUser.full_name,
                    role: adminUser.role
                }
            };

        } catch (error) {
            console.error('❌ [AUTH] Error en login:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Logout de administrador
     */
    async logout() {
        try {
            const sessionToken = localStorage.getItem('admin_session_token');

            if (sessionToken && this.supabase) {
                // Desactivar sesión en BD
                await this.supabase
                    .from('admin_sessions')
                    .update({ is_active: false })
                    .eq('session_token', sessionToken);

                // Log de actividad
                await this.logActivity('logout', 'session');
            }

            // Limpiar datos locales
            this.currentUser = null;
            localStorage.removeItem('admin_session_token');
            localStorage.removeItem('admin_user');

            // Detener verificación de sesión
            if (this.sessionCheckInterval) {
                clearInterval(this.sessionCheckInterval);
                this.sessionCheckInterval = null;
            }

            console.log('✅ [AUTH] Logout exitoso');
            return true;

        } catch (error) {
            console.error('❌ [AUTH] Error en logout:', error);
            return false;
        }
    }

    /**
     * Verificar sesión actual
     */
    async checkCurrentSession() {
        try {
            const sessionToken = localStorage.getItem('admin_session_token');
            const userData = localStorage.getItem('admin_user');

            if (!sessionToken || !userData) {
                return false;
            }

            // Verificar sesión en BD
            const { data: session, error } = await this.supabase
                .from('admin_sessions')
                .select(`
                    *,
                    admin_users!inner(*)
                `)
                .eq('session_token', sessionToken)
                .eq('is_active', true)
                .gt('expires_at', new Date().toISOString())
                .single();

            if (error || !session) {
                await this.logout();
                return false;
            }

            // Restaurar usuario
            this.currentUser = session.admin_users;
            return true;

        } catch (error) {
            console.error('❌ [AUTH] Error verificando sesión:', error);
            await this.logout();
            return false;
        }
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Verificar si está autenticado
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Verificar si es super admin
     */
    isSuperAdmin() {
        return this.currentUser && this.currentUser.role === 'super_admin';
    }

    /**
     * Configurar verificación periódica de sesión
     */
    setupSessionCheck() {
        // Verificar cada 5 minutos
        this.sessionCheckInterval = setInterval(async () => {
            const isValid = await this.checkCurrentSession();
            if (!isValid && this.currentUser) {
                console.warn('🟡 [AUTH] Sesión expirada, cerrando...');
                await this.logout();
                // Redirigir a login si estamos en admin
                if (window.location.pathname.includes('admin')) {
                    this.redirectToLogin();
                }
            }
        }, 5 * 60 * 1000); // 5 minutos
    }

    /**
     * Generar token de sesión
     */
    generateSessionToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Obtener IP del cliente (aproximada)
     */
    async getClientIP() {
        try {
            // En producción, esto debería venir del servidor
            return 'client_ip';
        } catch {
            return 'unknown';
        }
    }

    /**
     * Log de actividad
     */
    async logActivity(action, resourceType = null, resourceId = null, details = {}) {
        try {
            if (!this.currentUser || !this.supabase) return;

            await this.supabase
                .from('admin_activity_logs')
                .insert({
                    admin_user_id: this.currentUser.id,
                    action,
                    resource_type: resourceType,
                    resource_id: resourceId,
                    details,
                    ip_address: await this.getClientIP(),
                    user_agent: navigator.userAgent
                });

        } catch (error) {
            console.error('❌ [AUTH] Error logging activity:', error);
        }
    }

    /**
     * Redirigir a login
     */
    redirectToLogin() {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('admin-login')) {
            window.location.href = 'admin-login.html';
        }
    }

    /**
     * Middleware para proteger rutas admin
     */
    async requireAuth() {
        if (!this.isInitialized) {
            await this.init();
        }

        const isValid = await this.checkCurrentSession();

        if (!isValid) {
            this.redirectToLogin();
            return false;
        }

        return true;
    }
}

// Crear instancia global
window.AdminAuth = new AdminAuth();