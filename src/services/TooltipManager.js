/**
 * TooltipManager - Gestión de tooltips/explicaciones de transacciones
 * v2.0 - Con soporte Supabase
 */
class TooltipManager {
    constructor() {
        this.supabaseClient = null;
        if (typeof SupabaseClient !== 'undefined') {
            this.supabaseClient = SupabaseClient.getInstance();
            console.log('✅ [TOOLTIP] SupabaseClient inicializado');
        } else {
            console.warn('⚠️ [TOOLTIP] SupabaseClient no disponible, usando solo localStorage');
        }
    }

    /**
     * Carga todos los tooltips
     */
    async loadTooltips() {
        try {
            if (this.supabaseClient) {
                console.log('📡 [TOOLTIP] Cargando tooltips desde Supabase...');
                return await this.loadFromSupabase();
            } else {
                console.log('📂 [TOOLTIP] Cargando tooltips desde localStorage...');
                return this.loadFromLocalStorage();
            }
        } catch (error) {
            console.error('❌ Error cargando tooltips:', error);
            // Fallback a localStorage
            return this.loadFromLocalStorage();
        }
    }

    /**
     * Carga tooltips desde Supabase
     */
    async loadFromSupabase() {
        try {
            const { data: tooltips, error } = await this.supabaseClient.supabase
                .from('transaction_tooltips')
                .select('*')
                .eq('is_active', true);

            if (error) {
                console.error('Error cargando tooltips de Supabase:', error);
                throw error;
            }

            // Convertir a formato del sistema actual
            const tooltipsMap = {};
            if (tooltips) {
                for (const tooltip of tooltips) {
                    tooltipsMap[tooltip.transaction_code] = {
                        id: tooltip.id,
                        translatedName: tooltip.title,
                        icon: '🏦', // Valor por defecto
                        explanation: tooltip.explanation,
                        category: tooltip.category_code,
                        examples: tooltip.examples || []
                    };
                }
            }

            console.log(`✅ [TOOLTIP] ${Object.keys(tooltipsMap).length} tooltips cargados desde Supabase`);

            // Cache local
            this.saveToLocalStorageCache(tooltipsMap);

            return tooltipsMap;

        } catch (error) {
            console.error('❌ Error cargando desde Supabase:', error);
            throw error;
        }
    }

    /**
     * Carga tooltips desde localStorage
     */
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('financeAnalyzer_customExplanations') || '{}';
            const tooltips = JSON.parse(saved);
            console.log(`✅ [TOOLTIP] ${Object.keys(tooltips).length} tooltips cargados desde localStorage`);
            return tooltips;
        } catch (error) {
            console.error('❌ Error cargando desde localStorage:', error);
            return {};
        }
    }

    /**
     * Guarda cache local
     */
    saveToLocalStorageCache(tooltips) {
        try {
            localStorage.setItem('financeAnalyzer_customExplanations', JSON.stringify(tooltips));
            console.log(`💾 [TOOLTIP] Cache local guardado`);
        } catch (error) {
            console.warn('⚠️ Error guardando cache local:', error);
        }
    }

    /**
     * Agrega un nuevo tooltip
     */
    async addTooltip(pattern, data) {
        try {
            // Guardar en Supabase
            if (this.supabaseClient && this.supabaseClient.isConnected) {
                const { data: result, error } = await this.supabaseClient.supabase
                    .from('transaction_tooltips')
                    .insert({
                        transaction_code: pattern.toLowerCase(),
                        title: data.translatedName,
                        explanation: data.explanation,
                        category_code: data.category || null,
                        examples: data.examples || [],
                        created_by: 'admin'
                    })
                    .select()
                    .single();

                if (error) {
                    console.error('❌ Error guardando tooltip en Supabase:', error);
                    throw error;
                } else {
                    console.log(`✅ [SUPABASE] Tooltip guardado con ID: ${result.id}`);
                    data.id = result.id;
                }
            }

            // Actualizar cache local
            const tooltips = this.loadFromLocalStorage();
            tooltips[pattern.toLowerCase()] = data;
            this.saveToLocalStorageCache(tooltips);

            return { success: true, data };

        } catch (error) {
            console.error('❌ Error en addTooltip:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Actualiza un tooltip existente
     */
    async updateTooltip(pattern, data) {
        try {
            // Actualizar en Supabase si tiene ID
            if (this.supabaseClient && this.supabaseClient.isConnected && data.id) {
                const { error } = await this.supabaseClient.supabase
                    .from('transaction_tooltips')
                    .update({
                        title: data.translatedName,
                        explanation: data.explanation,
                        category_code: data.category || null,
                        examples: data.examples || []
                    })
                    .eq('id', data.id);

                if (error) {
                    console.error('❌ Error actualizando tooltip en Supabase:', error);
                } else {
                    console.log(`✅ [SUPABASE] Tooltip actualizado: ${data.id}`);
                }
            }

            // Actualizar cache local
            const tooltips = this.loadFromLocalStorage();
            tooltips[pattern.toLowerCase()] = data;
            this.saveToLocalStorageCache(tooltips);

            return { success: true };

        } catch (error) {
            console.error('❌ Error en updateTooltip:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Elimina un tooltip
     */
    async deleteTooltip(pattern) {
        try {
            // Cargar para obtener ID
            const tooltips = this.loadFromLocalStorage();
            const data = tooltips[pattern];

            // Eliminar de Supabase si tiene ID
            if (this.supabaseClient && this.supabaseClient.isConnected && data && data.id) {
                const { error } = await this.supabaseClient.supabase
                    .from('transaction_tooltips')
                    .delete()
                    .eq('id', data.id);

                if (error) {
                    console.error('❌ Error eliminando tooltip en Supabase:', error);
                } else {
                    console.log(`✅ [SUPABASE] Tooltip eliminado: ${data.id}`);
                }
            }

            // Eliminar de cache local
            delete tooltips[pattern];
            this.saveToLocalStorageCache(tooltips);

            return { success: true };

        } catch (error) {
            console.error('❌ Error en deleteTooltip:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Carga excepciones de tooltips
     */
    async loadExceptions() {
        try {
            if (this.supabaseClient && this.supabaseClient.isConnected) {
                const { data: exceptions, error } = await this.supabaseClient.supabase
                    .from('tooltip_exceptions')
                    .select('*')
                    .eq('is_active', true);

                if (error) throw error;

                const exceptionsList = exceptions ? exceptions.map(e => e.pattern) : [];

                // Cache local
                localStorage.setItem('financeAnalyzer_tooltipExceptions', JSON.stringify(exceptionsList));

                return exceptionsList;
            } else {
                const stored = localStorage.getItem('financeAnalyzer_tooltipExceptions');
                return stored ? JSON.parse(stored) : [];
            }
        } catch (error) {
            console.error('❌ Error cargando excepciones:', error);
            const stored = localStorage.getItem('financeAnalyzer_tooltipExceptions');
            return stored ? JSON.parse(stored) : [];
        }
    }

    /**
     * Agrega una excepción
     */
    async addException(pattern, reason = '') {
        try {
            if (this.supabaseClient && this.supabaseClient.isConnected) {
                const { error } = await this.supabaseClient.supabase
                    .from('tooltip_exceptions')
                    .insert({
                        pattern: pattern,
                        reason: reason,
                        created_by: 'admin'
                    });

                if (error && error.code !== '23505') { // Ignorar duplicados
                    console.error('❌ Error guardando excepción:', error);
                }
            }

            // Actualizar cache local
            const exceptions = await this.loadExceptions();
            if (!exceptions.includes(pattern)) {
                exceptions.push(pattern);
                localStorage.setItem('financeAnalyzer_tooltipExceptions', JSON.stringify(exceptions));
            }

            return { success: true };

        } catch (error) {
            console.error('❌ Error en addException:', error);
            return { success: false, error: error.message };
        }
    }
}

// Hacer disponible globalmente
if (typeof window !== 'undefined') {
    window.TooltipManager = TooltipManager;
}
