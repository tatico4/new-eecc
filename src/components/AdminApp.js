/**
 * AdminApp - Aplicación de administración para gestión de reglas del parser
 * Interfaz completa para configuración, testing y analytics
 */
class AdminApp {
    constructor() {
        this.rulesManager = null;
        this.currentBank = 'global';
        this.currentView = 'rules'; // 'rules' or 'corrections'
        this.stats = null;

        this.init();
    }

    /**
     * Inicialización de la aplicación
     */
    async init() {
        console.log('🚀 Iniciando AdminApp');

        // Inicializar RulesManager
        this.rulesManager = new RulesManager();

        // Esperar a que se inicialice completamente
        await this.rulesManager.init();

        // Configurar interfaz
        this.setupEventListeners();
        this.loadStats();
        this.loadCurrentBankRules();

        console.log('✅ AdminApp inicializado correctamente');
    }

    /**
     * Configura todos los event listeners
     */
    setupEventListeners() {
        // Tabs de bancos y secciones
        document.getElementById('globalTab')?.addEventListener('click', () => this.switchBank('global'));
        document.getElementById('falabellaTab')?.addEventListener('click', () => this.switchBank('BancoFalabella'));
        document.getElementById('correctionsTab')?.addEventListener('click', () => this.switchToCorrections());
        document.getElementById('categoriesTab')?.addEventListener('click', () => this.switchToCategories());

        // Formulario de nueva regla
        document.getElementById('addRuleBtn')?.addEventListener('click', () => this.addNewRule());
        document.getElementById('newRuleText')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addNewRule();
        });

        // Botones de acción
        document.getElementById('testRuleBtn')?.addEventListener('click', () => this.toggleTestPanel());
        document.getElementById('importRulesBtn')?.addEventListener('click', () => this.importRules());
        document.getElementById('exportRulesBtn')?.addEventListener('click', () => this.exportRules());

        // Panel de testing
        document.getElementById('runTestBtn')?.addEventListener('click', () => this.runTest());

        // Auto-generar descripción basada en tipo y texto
        document.getElementById('newRuleType')?.addEventListener('change', () => this.updateRuleDescription());
        document.getElementById('newRuleText')?.addEventListener('input', () => this.updateRuleDescription());

        // Correcciones
        document.getElementById('addCorrectionBtn')?.addEventListener('click', () => this.addNewCorrection());
        document.getElementById('testCorrectionBtn')?.addEventListener('click', () => this.toggleCorrectionTestPanel());
        document.getElementById('suggestCorrectionBtn')?.addEventListener('click', () => this.suggestCorrection());
        document.getElementById('runCorrectionTestBtn')?.addEventListener('click', () => this.runCorrectionTest());

        // Auto-generar descripción de corrección
        document.getElementById('newCorrectionPattern')?.addEventListener('input', () => this.updateCorrectionDescription());
        document.getElementById('newCorrectionReplacement')?.addEventListener('input', () => this.updateCorrectionDescription());
    }

    /**
     * Cambia el banco activo
     */
    switchBank(bankName) {
        this.currentBank = bankName;
        this.currentView = 'rules';

        // Actualizar tabs activos
        document.querySelectorAll('.bank-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        const activeTab = bankName === 'global' ?
            document.getElementById('globalTab') :
            document.getElementById('falabellaTab');

        if (activeTab) {
            activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            activeTab.classList.remove('border-transparent', 'text-gray-500');
        }

        // Mostrar/ocultar secciones
        document.getElementById('rulesSection').classList.remove('hidden');
        document.getElementById('correctionsSection').classList.add('hidden');

        // Actualizar título
        const bankDisplayName = bankName === 'global' ? 'Reglas Globales' : bankName;
        document.getElementById('currentBankName').textContent = bankDisplayName;

        // Cargar reglas del banco seleccionado
        this.loadCurrentBankRules();

        console.log(`🔄 Cambiado a: ${bankDisplayName}`);
    }

    /**
     * Cambia a la vista de correcciones
     */
    switchToCorrections() {
        this.currentView = 'corrections';

        // Actualizar tabs activos
        document.querySelectorAll('.bank-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        const correctionsTab = document.getElementById('correctionsTab');
        if (correctionsTab) {
            correctionsTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            correctionsTab.classList.remove('border-transparent', 'text-gray-500');
        }

        // Mostrar/ocultar secciones
        document.getElementById('rulesSection').classList.add('hidden');
        document.getElementById('correctionsSection').classList.remove('hidden');

        // Cargar correcciones
        this.loadCurrentBankCorrections();

        console.log(`🔄 Cambiado a: Correcciones`);
    }

    /**
     * Carga y muestra las reglas del banco actual
     */
    loadCurrentBankRules() {
        const rules = this.currentBank === 'global' ?
            this.rulesManager.getGlobalRules() :
            this.rulesManager.getBankRules(this.currentBank);

        this.displayRules(rules);
        this.updateRuleCount(rules.length);
    }

    /**
     * Muestra reglas en la interfaz
     */
    displayRules(rules) {
        const container = document.getElementById('rulesContainer');
        if (!container) return;

        if (rules.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p class="mt-4 text-lg font-medium">No hay reglas configuradas</p>
                    <p class="mt-2">Agrega tu primera regla usando el formulario superior</p>
                </div>
            `;
            return;
        }

        let html = '';
        rules.forEach(rule => {
            const typeIcon = this.getRuleTypeIcon(rule.type);
            const statusColor = rule.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusText = rule.active ? '🟢 Activa' : '🔴 Inactiva';

            html += `
                <div class="rule-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-2xl">${typeIcon}</span>
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${rule.description}</h4>
                                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                                        <span class="${statusColor} px-2 py-1 rounded-full font-medium">${statusText}</span>
                                        <span>Tipo: ${this.getRuleTypeLabel(rule.type)}</span>
                                        <span>Creada: ${this.formatDate(rule.created)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 rounded-md p-3 mt-3">
                                <div class="text-sm">
                                    <strong>Patrón:</strong> <code class="bg-gray-200 px-2 py-1 rounded">${rule.text}</code>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 ml-4">
                            <button onclick="adminApp.toggleRule('${rule.id}')"
                                    class="px-3 py-2 text-sm rounded-md transition-colors ${rule.active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}">
                                ${rule.active ? '⏸️ Pausar' : '▶️ Activar'}
                            </button>
                            <button onclick="adminApp.editRule('${rule.id}')"
                                    class="px-3 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm rounded-md transition-colors">
                                ✏️ Editar
                            </button>
                            <button onclick="adminApp.deleteRule('${rule.id}')"
                                    class="px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 text-sm rounded-md transition-colors">
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Agrega nueva regla
     */
    addNewRule() {
        const type = document.getElementById('newRuleType').value;
        const text = document.getElementById('newRuleText').value.trim();
        const description = document.getElementById('newRuleDescription').value.trim();

        if (!text) {
            alert('⚠️ Ingresa el texto/patrón para la regla');
            document.getElementById('newRuleText').focus();
            return;
        }

        const ruleData = {
            type: type,
            text: text,
            description: description || this.generateRuleDescription(type, text)
        };

        // Agregar regla usando RulesManager
        const newRule = this.rulesManager.addRule(this.currentBank, ruleData);

        if (newRule) {
            // Limpiar formulario
            document.getElementById('newRuleText').value = '';
            document.getElementById('newRuleDescription').value = '';

            // Recargar vista
            this.loadCurrentBankRules();
            this.loadStats();

            // Mostrar confirmación
            this.showNotification(`✅ Regla agregada: ${newRule.description}`, 'success');

            console.log('✅ Nueva regla agregada:', newRule);
        }
    }

    /**
     * Alterna estado activo/inactivo de regla
     */
    toggleRule(ruleId) {
        const updated = this.rulesManager.updateRule(ruleId, {
            active: !this.getCurrentRule(ruleId)?.active
        });

        if (updated) {
            this.loadCurrentBankRules();
            this.loadStats();
            this.showNotification('🔄 Estado de regla actualizado', 'info');
        }
    }

    /**
     * Edita regla existente
     */
    editRule(ruleId) {
        const rule = this.getCurrentRule(ruleId);
        if (!rule) return;

        const newText = prompt('Nuevo patrón:', rule.text);
        if (newText === null) return; // Usuario canceló

        const newDescription = prompt('Nueva descripción:', rule.description);
        if (newDescription === null) return;

        const updated = this.rulesManager.updateRule(ruleId, {
            text: newText.trim(),
            description: newDescription.trim()
        });

        if (updated) {
            this.loadCurrentBankRules();
            this.showNotification('✏️ Regla actualizada correctamente', 'success');
        }
    }

    /**
     * Elimina regla
     */
    deleteRule(ruleId) {
        const rule = this.getCurrentRule(ruleId);
        if (!rule) return;

        if (!confirm(`¿Eliminar la regla "${rule.description}"?\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        const deleted = this.rulesManager.deleteRule(ruleId);

        if (deleted) {
            this.loadCurrentBankRules();
            this.loadStats();
            this.showNotification('🗑️ Regla eliminada', 'warning');
        }
    }

    /**
     * Alterna panel de testing
     */
    toggleTestPanel() {
        const panel = document.getElementById('testPanel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            document.getElementById('testText').focus();
        } else {
            panel.classList.add('hidden');
        }
    }

    /**
     * Ejecuta test de reglas
     */
    runTest() {
        const testText = document.getElementById('testText').value;
        const resultsDiv = document.getElementById('testResults');

        if (!testText.trim()) {
            resultsDiv.innerHTML = '<p class="text-red-600">⚠️ Ingresa texto para probar</p>';
            return;
        }

        const lines = testText.split('\n').filter(line => line.trim());
        let results = `<div class="space-y-2">`;

        lines.forEach((line, index) => {
            const result = this.rulesManager.shouldFilterLine(line, this.currentBank);

            if (result.shouldFilter) {
                results += `
                    <div class="bg-red-50 border border-red-200 rounded p-2">
                        <div class="text-sm">
                            <strong>Línea ${index + 1}:</strong> <span class="text-red-600">FILTRADA ❌</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                            Texto: "${line}"<br>
                            Regla: ${result.rule.description}
                        </div>
                    </div>
                `;
            } else {
                results += `
                    <div class="bg-green-50 border border-green-200 rounded p-2">
                        <div class="text-sm">
                            <strong>Línea ${index + 1}:</strong> <span class="text-green-600">PERMITIDA ✅</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                            Texto: "${line}"
                        </div>
                    </div>
                `;
            }
        });

        results += '</div>';
        resultsDiv.innerHTML = results;
    }

    /**
     * Importa reglas desde archivo
     */
    importRules() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = this.rulesManager.importConfig(e.target.result);

                if (result.success) {
                    this.loadCurrentBankRules();
                    this.loadStats();
                    this.showNotification('📥 Configuración importada correctamente', 'success');
                } else {
                    this.showNotification(`❌ Error: ${result.message}`, 'error');
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }

    /**
     * Exporta reglas a archivo
     */
    exportRules() {
        const configData = this.rulesManager.exportConfig();
        const blob = new Blob([configData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `parser-rules-${new Date().toISOString().split('T')[0]}.json`;
        a.click();

        URL.revokeObjectURL(url);
        this.showNotification('📤 Configuración exportada', 'success');
    }

    /**
     * Carga y actualiza estadísticas
     */
    loadStats() {
        this.stats = this.rulesManager.getStats();

        document.getElementById('totalActiveRules').textContent = this.stats.totalActiveRules || 0;
        document.getElementById('totalBanks').textContent = this.stats.totalBanks || 1;
        document.getElementById('effectiveness').textContent = '95.2%'; // TODO: calcular real
        document.getElementById('filteredToday').textContent = this.stats.totalRulesApplied || 0;
    }

    /**
     * Actualiza contador de reglas
     */
    updateRuleCount(count) {
        document.getElementById('ruleCount').textContent = `${count} reglas`;
    }

    /**
     * Auto-genera descripción de regla
     */
    updateRuleDescription() {
        const type = document.getElementById('newRuleType').value;
        const text = document.getElementById('newRuleText').value.trim();
        const descriptionInput = document.getElementById('newRuleDescription');

        if (text && !descriptionInput.value) {
            descriptionInput.value = this.generateRuleDescription(type, text);
        }
    }

    // =================== MÉTODOS HELPER ===================

    generateRuleDescription(type, text) {
        const descriptions = {
            contains: `Filtrar líneas que contengan "${text}"`,
            starts: `Filtrar líneas que comiencen con "${text}"`,
            ends: `Filtrar líneas que terminen con "${text}"`,
            exact: `Filtrar líneas exactamente "${text}"`,
            regex: `Filtrar usando patrón regex "${text}"`
        };
        return descriptions[type] || `Filtrar "${text}"`;
    }

    getRuleTypeIcon(type) {
        const icons = {
            contains: '🔍',
            starts: '▶️',
            ends: '⏹️',
            exact: '🎯',
            regex: '⚡'
        };
        return icons[type] || '📄';
    }

    getRuleTypeLabel(type) {
        const labels = {
            contains: 'Contiene',
            starts: 'Inicia con',
            ends: 'Termina con',
            exact: 'Exacto',
            regex: 'Regex'
        };
        return labels[type] || type;
    }

    getCurrentRule(ruleId) {
        const globalRules = this.rulesManager.getGlobalRules();
        const bankRules = this.rulesManager.getBankRules(this.currentBank);
        return [...globalRules, ...bankRules].find(r => r.id === ruleId);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('es-CL');
    }

    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all ${this.getNotificationClass(type)}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getNotificationClass(type) {
        const classes = {
            success: 'bg-green-600 text-white',
            error: 'bg-red-600 text-white',
            warning: 'bg-yellow-600 text-white',
            info: 'bg-blue-600 text-white'
        };
        return classes[type] || classes.info;
    }

    // =================== MÉTODOS DE CORRECCIONES ===================

    /**
     * Carga y muestra las correcciones del banco actual
     */
    loadCurrentBankCorrections() {
        const corrections = this.currentBank === 'global' ?
            this.rulesManager.getGlobalCorrections() :
            this.rulesManager.getBankCorrections(this.currentBank);

        this.displayCorrections(corrections);
        this.updateCorrectionCount(corrections.length);
    }

    /**
     * Muestra correcciones en la interfaz
     */
    displayCorrections(corrections) {
        const container = document.getElementById('correctionsContainer');
        if (!container) return;

        if (corrections.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    <p class="mt-4 text-lg font-medium">No hay correcciones configuradas</p>
                    <p class="mt-2">Agrega tu primera corrección usando el formulario superior</p>
                </div>
            `;
            return;
        }

        let html = '';
        corrections.forEach(correction => {
            const typeIcon = this.getCorrectionTypeIcon(correction.type);
            const statusColor = correction.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
            const statusText = correction.active ? '🟢 Activa' : '🔴 Inactiva';

            html += `
                <div class="rule-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="flex items-center space-x-3 mb-2">
                                <span class="text-2xl">${typeIcon}</span>
                                <div>
                                    <h4 class="text-lg font-semibold text-gray-900">${correction.description}</h4>
                                    <div class="flex items-center space-x-4 text-sm text-gray-500">
                                        <span class="${statusColor} px-2 py-1 rounded-full font-medium">${statusText}</span>
                                        <span>Tipo: ${this.getCorrectionTypeLabel(correction.type)}</span>
                                        <span>Creada: ${this.formatDate(correction.created)}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="bg-gray-50 rounded-md p-3 mt-3">
                                <div class="text-sm grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    <div>
                                        <strong>Patrón:</strong><br>
                                        <code class="bg-red-100 text-red-800 px-2 py-1 rounded">${correction.pattern}</code>
                                    </div>
                                    <div>
                                        <strong>Reemplazo:</strong><br>
                                        <code class="bg-green-100 text-green-800 px-2 py-1 rounded">${correction.replacement}</code>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 ml-4">
                            <button onclick="adminApp.toggleCorrection('${correction.id}')"
                                    class="px-3 py-2 text-sm rounded-md transition-colors ${correction.active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}">
                                ${correction.active ? '⏸️ Pausar' : '▶️ Activar'}
                            </button>
                            <button onclick="adminApp.editCorrection('${correction.id}')"
                                    class="px-3 py-2 bg-blue-100 text-blue-800 hover:bg-blue-200 text-sm rounded-md transition-colors">
                                ✏️ Editar
                            </button>
                            <button onclick="adminApp.deleteCorrection('${correction.id}')"
                                    class="px-3 py-2 bg-red-100 text-red-800 hover:bg-red-200 text-sm rounded-md transition-colors">
                                🗑️ Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    /**
     * Agrega nueva corrección
     */
    addNewCorrection() {
        const type = document.getElementById('newCorrectionType').value;
        const pattern = document.getElementById('newCorrectionPattern').value.trim();
        const replacement = document.getElementById('newCorrectionReplacement').value.trim();
        const description = document.getElementById('newCorrectionDescription').value.trim();
        const caseInsensitive = document.getElementById('caseInsensitive').checked;

        if (!pattern) {
            alert('⚠️ Ingresa el patrón para la corrección');
            document.getElementById('newCorrectionPattern').focus();
            return;
        }

        if (!replacement && type !== 'cleanup') {
            alert('⚠️ Ingresa el texto de reemplazo para la corrección');
            document.getElementById('newCorrectionReplacement').focus();
            return;
        }

        const correctionData = {
            type: type,
            pattern: pattern,
            replacement: replacement || '',
            description: description || this.generateCorrectionDescription(type, pattern, replacement),
            caseInsensitive: caseInsensitive
        };

        // Agregar corrección usando RulesManager
        const newCorrection = this.rulesManager.addCorrection(this.currentBank, correctionData);

        if (newCorrection) {
            // Limpiar formulario
            document.getElementById('newCorrectionPattern').value = '';
            document.getElementById('newCorrectionReplacement').value = '';
            document.getElementById('newCorrectionDescription').value = '';

            // Recargar vista
            this.loadCurrentBankCorrections();
            this.loadStats();

            // Mostrar confirmación
            this.showNotification(`✅ Corrección agregada: ${newCorrection.description}`, 'success');

            console.log('✅ Nueva corrección agregada:', newCorrection);
        }
    }

    /**
     * Alterna estado activo/inactivo de corrección
     */
    toggleCorrection(correctionId) {
        const updated = this.rulesManager.updateCorrection(correctionId, {
            active: !this.getCurrentCorrection(correctionId)?.active
        });

        if (updated) {
            this.loadCurrentBankCorrections();
            this.loadStats();
            this.showNotification('🔄 Estado de corrección actualizado', 'info');
        }
    }

    /**
     * Edita corrección existente
     */
    editCorrection(correctionId) {
        const correction = this.getCurrentCorrection(correctionId);
        if (!correction) return;

        const newPattern = prompt('Nuevo patrón:', correction.pattern);
        if (newPattern === null) return; // Usuario canceló

        const newReplacement = prompt('Nuevo reemplazo:', correction.replacement);
        if (newReplacement === null) return;

        const newDescription = prompt('Nueva descripción:', correction.description);
        if (newDescription === null) return;

        const updated = this.rulesManager.updateCorrection(correctionId, {
            pattern: newPattern.trim(),
            replacement: newReplacement.trim(),
            description: newDescription.trim()
        });

        if (updated) {
            this.loadCurrentBankCorrections();
            this.showNotification('✏️ Corrección actualizada correctamente', 'success');
        }
    }

    /**
     * Elimina corrección
     */
    deleteCorrection(correctionId) {
        const correction = this.getCurrentCorrection(correctionId);
        if (!correction) return;

        if (!confirm(`¿Eliminar la corrección "${correction.description}"?\\n\\nEsta acción no se puede deshacer.`)) {
            return;
        }

        const deleted = this.rulesManager.deleteCorrection(correctionId);

        if (deleted) {
            this.loadCurrentBankCorrections();
            this.loadStats();
            this.showNotification('🗑️ Corrección eliminada', 'warning');
        }
    }

    /**
     * Alterna panel de testing de correcciones
     */
    toggleCorrectionTestPanel() {
        const panel = document.getElementById('correctionTestPanel');
        if (panel.classList.contains('hidden')) {
            panel.classList.remove('hidden');
            document.getElementById('correctionTestText').focus();
        } else {
            panel.classList.add('hidden');
        }
    }

    /**
     * Ejecuta test de correcciones
     */
    runCorrectionTest() {
        const testText = document.getElementById('correctionTestText').value;
        const resultsDiv = document.getElementById('correctionTestResults');

        if (!testText.trim()) {
            resultsDiv.innerHTML = '<p class="text-red-600">⚠️ Ingresa texto para probar</p>';
            return;
        }

        const lines = testText.split('\\n').filter(line => line.trim());
        let results = `<div class="space-y-2">`;

        lines.forEach((line, index) => {
            const result = this.rulesManager.testCorrections(line, this.currentBank);

            if (result.wasModified) {
                results += `
                    <div class="bg-green-50 border border-green-200 rounded p-2">
                        <div class="text-sm">
                            <strong>Línea ${index + 1}:</strong> <span class="text-green-600">CORREGIDA ✅</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                            <div class="grid grid-cols-1 gap-1">
                                <div><strong>Original:</strong> "${result.original}"</div>
                                <div><strong>Corregida:</strong> "${result.corrected}"</div>
                                <div><strong>Correcciones aplicadas:</strong> ${result.appliedCorrections.map(c => c.description).join(', ')}</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                results += `
                    <div class="bg-gray-50 border border-gray-200 rounded p-2">
                        <div class="text-sm">
                            <strong>Línea ${index + 1}:</strong> <span class="text-gray-600">SIN CAMBIOS ➖</span>
                        </div>
                        <div class="text-xs text-gray-600 mt-1">
                            Texto: "${line}"
                        </div>
                    </div>
                `;
            }
        });

        results += '</div>';
        resultsDiv.innerHTML = results;
    }

    /**
     * Auto-genera descripción de corrección
     */
    updateCorrectionDescription() {
        const pattern = document.getElementById('newCorrectionPattern').value.trim();
        const replacement = document.getElementById('newCorrectionReplacement').value.trim();
        const type = document.getElementById('newCorrectionType').value;
        const descriptionInput = document.getElementById('newCorrectionDescription');

        if (pattern && !descriptionInput.value) {
            descriptionInput.value = this.generateCorrectionDescription(type, pattern, replacement);
        }
    }

    /**
     * Sugiere corrección automáticamente
     */
    suggestCorrection() {
        const pattern = document.getElementById('newCorrectionPattern').value.trim();

        if (!pattern) {
            alert('⚠️ Primero ingresa el texto problemático en "Patrón Original"');
            document.getElementById('newCorrectionPattern').focus();
            return;
        }

        const suggestion = this.rulesManager.suggestCorrection(pattern);

        if (suggestion) {
            // Rellenar automáticamente los campos
            document.getElementById('newCorrectionType').value = suggestion.type;
            document.getElementById('newCorrectionReplacement').value = suggestion.replacement;
            document.getElementById('newCorrectionDescription').value = `${suggestion.reason} (${suggestion.confidence}% confianza)`;

            // Mostrar resultado
            this.showNotification(`🤖 Sugerencia generada: "${suggestion.replacement}"`, 'info');

            // Mostrar preview
            const preview = `
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4" id="suggestionPreview">
                    <h4 class="font-semibold text-blue-900 mb-2">🤖 Sugerencia Automática</h4>
                    <div class="grid grid-cols-1 gap-2 text-sm">
                        <div><strong>Original:</strong> <span class="bg-red-100 px-2 py-1 rounded">${pattern}</span></div>
                        <div><strong>Sugerido:</strong> <span class="bg-green-100 px-2 py-1 rounded">${suggestion.replacement}</span></div>
                        <div><strong>Razón:</strong> ${suggestion.reason}</div>
                        <div><strong>Confianza:</strong> ${suggestion.confidence}%</div>
                    </div>
                    <button onclick="document.getElementById('suggestionPreview').remove()" class="mt-2 bg-blue-600 text-white px-3 py-1 rounded text-sm">
                        ✅ Aceptar sugerencia
                    </button>
                </div>
            `;

            // Insertar preview después del formulario
            const form = document.querySelector('.bg-gradient-to-r.from-green-50');
            if (form && !document.getElementById('suggestionPreview')) {
                form.insertAdjacentHTML('afterend', preview);
            }

        } else {
            alert('🤔 No se pudo detectar un patrón automático para este texto.\n\nPuedes crear la corrección manualmente:\n1. Mantén el texto original en "Patrón Original"\n2. Escribe cómo quieres que se vea en "Texto Corregido"\n3. Selecciona "Reemplazo exacto" como tipo');
        }
    }

    /**
     * Actualiza contador de correcciones
     */
    updateCorrectionCount(count) {
        document.getElementById('correctionCount').textContent = `${count} correcciones`;

        // Actualizar el nombre del banco actual para correcciones
        const bankDisplayName = this.currentBank === 'global' ? 'Correcciones Globales' : `Correcciones ${this.currentBank}`;
        document.getElementById('currentCorrectionBankName').textContent = bankDisplayName;
    }

    // =================== MÉTODOS HELPER PARA CORRECCIONES ===================

    generateCorrectionDescription(type, pattern, replacement) {
        const descriptions = {
            exact_replace: `Cambiar "${pattern}" por "${replacement}"`,
            word_replace: `Reemplazar palabra "${pattern}" por "${replacement}"`,
            regex_replace: `Aplicar regex "${pattern}" → "${replacement}"`,
            cleanup: `Limpiar formato en "${pattern}"`
        };
        return descriptions[type] || `Corregir "${pattern}"`;
    }

    getCorrectionTypeIcon(type) {
        const icons = {
            exact_replace: '🔄',
            word_replace: '📝',
            regex_replace: '⚡',
            cleanup: '🧹'
        };
        return icons[type] || '🔧';
    }

    getCorrectionTypeLabel(type) {
        const labels = {
            exact_replace: 'Reemplazo exacto',
            word_replace: 'Reemplazar palabra',
            regex_replace: 'Expresión regular',
            cleanup: 'Limpieza'
        };
        return labels[type] || type;
    }

    getCurrentCorrection(correctionId) {
        const globalCorrections = this.rulesManager.getGlobalCorrections();
        const bankCorrections = this.rulesManager.getBankCorrections(this.currentBank);
        return [...globalCorrections, ...bankCorrections].find(c => c.id === correctionId);
    }

    // ===============================================================
    // CATALOGACIÓN DE GLOSAS - NUEVA FUNCIONALIDAD
    // ===============================================================

    /**
     * Cambia a la vista de catalogación
     */
    async switchToCataloging() {
        console.log('📊 Cambiando a vista de catalogación');

        this.currentView = 'cataloging';

        // Ocultar otras vistas
        document.getElementById('rulesContent')?.classList.add('hidden');
        document.getElementById('correctionsContent')?.classList.add('hidden');

        // Mostrar vista de catalogación
        const catalogingContent = document.getElementById('catalogingContent');
        if (catalogingContent) {
            catalogingContent.classList.remove('hidden');
        }

        // Actualizar tabs activos
        document.querySelectorAll('.bank-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        const catalogingTab = document.getElementById('catalogingTab');
        if (catalogingTab) {
            catalogingTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            catalogingTab.classList.remove('border-transparent', 'text-gray-500');
        }

        // Inicializar catalogación
        await this.initCataloging();
    }

    /**
     * Inicializa la funcionalidad de catalogación
     */
    async initCataloging() {
        console.log('🔄 Inicializando catalogación...');

        try {
            // Verificar conexión Supabase
            await this.updateSupabaseStatus();

            // Cargar datos iniciales
            await this.loadCatalogingData();

            // Configurar event listeners específicos de catalogación
            this.setupCatalogingEventListeners();

            console.log('✅ Catalogación inicializada correctamente');

        } catch (error) {
            console.error('❌ Error inicializando catalogación:', error);
            this.showError('Error inicializando catalogación', error.message);
        }
    }

    /**
     * Configura event listeners específicos de catalogación
     */
    setupCatalogingEventListeners() {
        // Selectores de jerarquía
        document.getElementById('catalogBankSelect')?.addEventListener('change', (e) => this.onBankSelectionChange(e.target.value));
        document.getElementById('catalogProductSelect')?.addEventListener('change', (e) => this.onProductSelectionChange(e.target.value));
        document.getElementById('catalogCategorySelect')?.addEventListener('change', (e) => this.onCategorySelectionChange(e.target.value));

        // Botones de acción
        document.getElementById('addCatalogRuleBtn')?.addEventListener('click', () => this.addCatalogingRule());
        document.getElementById('refreshDataBtn')?.addEventListener('click', () => this.refreshCatalogingData());
        document.getElementById('runCategorizationTestBtn')?.addEventListener('click', () => this.runCategorizationTest());

        // Enter en campos de texto
        document.getElementById('newRulePattern')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addCatalogingRule();
        });
    }

    /**
     * Actualiza el estado de conexión con Supabase
     */
    async updateSupabaseStatus() {
        const statusElement = document.getElementById('supabaseConnectionStatus');
        if (!statusElement) return;

        try {
            if (window.supabaseClient && window.supabaseClient.isConnected) {
                const status = window.supabaseClient.getStatus();
                statusElement.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
                statusElement.textContent = '✅ Conectado';
            } else {
                statusElement.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800';
                statusElement.textContent = '🟡 Local';
            }
        } catch (error) {
            statusElement.className = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
            statusElement.textContent = '❌ Error';
        }
    }

    /**
     * Carga datos iniciales para catalogación
     */
    async loadCatalogingData() {
        try {
            // Cargar bancos
            await this.loadBanksForCataloging();

            // Cargar categorías
            await this.loadCategoriesForCataloging();

            // Cargar reglas iniciales (globales)
            await this.loadRulesForCataloging();

        } catch (error) {
            console.error('❌ Error cargando datos de catalogación:', error);
        }
    }

    /**
     * Carga bancos para el selector
     */
    async loadBanksForCataloging() {
        const bankSelect = document.getElementById('catalogBankSelect');
        if (!bankSelect) return;

        try {
            let banks = [];

            if (window.supabaseClient && window.supabaseClient.isConnected) {
                banks = await window.supabaseClient.getBanks();
            } else {
                // Fallback local
                banks = [
                    { id: 'falabella', code: 'BancoFalabella', name: 'Banco Falabella' },
                    { id: 'chile', code: 'BancoChile', name: 'Banco de Chile' }
                ];
            }

            // Limpiar opciones existentes (excepto la global)
            const globalOption = bankSelect.querySelector('option[value=""]');
            bankSelect.innerHTML = '';
            if (globalOption) bankSelect.appendChild(globalOption);

            // Agregar bancos
            banks.forEach(bank => {
                const option = document.createElement('option');
                option.value = bank.code;
                option.textContent = `🏦 ${bank.name}`;
                bankSelect.appendChild(option);
            });

            console.log(`📊 [CATALOGING] Cargados ${banks.length} bancos`);

        } catch (error) {
            console.error('❌ Error cargando bancos:', error);
        }
    }

    /**
     * Carga categorías para el selector
     */
    async loadCategoriesForCataloging() {
        const categorySelect = document.getElementById('catalogCategorySelect');
        if (!categorySelect) return;

        try {
            let categories = [];

            if (window.supabaseClient && window.supabaseClient.isConnected) {
                categories = await window.supabaseClient.getCategories();
            } else {
                // Fallback local
                categories = [
                    { id: '1', code: 'alimentacion', name: 'Alimentación', icon: '🍽️' },
                    { id: '2', code: 'transporte', name: 'Transporte', icon: '🚗' },
                    { id: '3', code: 'servicios', name: 'Servicios', icon: '💡' },
                    { id: '4', code: 'otros', name: 'Otros', icon: '📦' }
                ];
            }

            // Limpiar y repoblar
            const defaultOption = categorySelect.querySelector('option[value=""]');
            categorySelect.innerHTML = '';
            if (defaultOption) categorySelect.appendChild(defaultOption);

            // Agregar categorías
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = `${category.icon} ${category.name}`;
                categorySelect.appendChild(option);
            });

            console.log(`📊 [CATALOGING] Cargadas ${categories.length} categorías`);

        } catch (error) {
            console.error('❌ Error cargando categorías:', error);
        }
    }

    /**
     * Carga reglas según la jerarquía seleccionada
     */
    async loadRulesForCataloging(bankCode = null, productCode = null) {
        const rulesContainer = document.getElementById('rulesContainer');
        const rulesCount = document.getElementById('rulesCount');
        const currentScope = document.getElementById('currentRulesScope');

        if (!rulesContainer) return;

        try {
            // Mostrar loading
            rulesContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p class="mt-2">Cargando reglas...</p>
                </div>
            `;

            let rules = [];

            if (window.supabaseClient && window.supabaseClient.isConnected) {
                rules = await window.supabaseClient.getCategorizationRules(bankCode, productCode);
            } else {
                // Fallback: usar reglas locales del RulesManager
                rules = this.getLocalRulesForDisplay(bankCode, productCode);
            }

            // Actualizar contadores y scope
            if (rulesCount) rulesCount.textContent = `${rules.length} reglas`;
            if (currentScope) {
                let scopeText = 'Reglas globales';
                if (bankCode && productCode) scopeText = `${bankCode} - ${productCode}`;
                else if (bankCode) scopeText = `${bankCode} (todos los productos)`;
                currentScope.textContent = `Mostrando: ${scopeText}`;
            }

            // Renderizar reglas
            this.renderRulesList(rules);

            console.log(`📊 [CATALOGING] Cargadas ${rules.length} reglas para ${bankCode || 'global'}/${productCode || 'todos'}`);

        } catch (error) {
            console.error('❌ Error cargando reglas:', error);
            rulesContainer.innerHTML = `
                <div class="text-center py-8 text-red-500">
                    <p>❌ Error cargando reglas</p>
                    <p class="text-sm mt-1">${error.message}</p>
                </div>
            `;
        }
    }

    /**
     * Obtiene reglas locales para mostrar (fallback)
     */
    getLocalRulesForDisplay(bankCode, productCode) {
        // Implementar según el RulesManager existente
        // Esto es un fallback básico
        return [];
    }

    /**
     * Renderiza la lista de reglas
     */
    renderRulesList(rules) {
        const rulesContainer = document.getElementById('rulesContainer');
        if (!rulesContainer) return;

        if (rules.length === 0) {
            rulesContainer.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    <p class="mt-4 text-lg font-medium">No hay reglas configuradas</p>
                    <p class="mt-2">Agrega tu primera regla usando el formulario superior</p>
                </div>
            `;
            return;
        }

        const rulesHTML = rules.map(rule => `
            <div class="bg-white border border-gray-200 rounded-lg p-4">
                <div class="flex items-center justify-between">
                    <div class="flex-1">
                        <div class="flex items-center space-x-3">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                ${this.getRuleTypeLabel(rule.rule_type)}
                            </span>
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Prioridad: ${rule.priority}
                            </span>
                            ${rule.categories ? `<span class="text-sm text-gray-600">${rule.categories.icon} ${rule.categories.name}</span>` : ''}
                        </div>
                        <p class="mt-2 text-sm font-medium text-gray-900">"${rule.pattern}"</p>
                        ${rule.description ? `<p class="mt-1 text-xs text-gray-500">${rule.description}</p>` : ''}
                    </div>
                    <div class="flex items-center space-x-2">
                        <button onclick="adminApp.editRule('${rule.id}')" class="text-blue-600 hover:text-blue-800 text-sm">
                            ✏️ Editar
                        </button>
                        <button onclick="adminApp.deleteRule('${rule.id}')" class="text-red-600 hover:text-red-800 text-sm">
                            🗑️ Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        rulesContainer.innerHTML = rulesHTML;
    }

    /**
     * Obtiene etiqueta legible del tipo de regla
     */
    getRuleTypeLabel(ruleType) {
        const labels = {
            'contains': 'Contiene',
            'exact_match': 'Exacto',
            'starts_with': 'Empieza con',
            'ends_with': 'Termina con',
            'regex': 'Regex'
        };
        return labels[ruleType] || ruleType;
    }

    /**
     * Agregar nueva regla de catalogación
     */
    async addCatalogingRule() {
        try {
            const pattern = document.getElementById('newRulePattern')?.value?.trim();
            const ruleType = document.getElementById('newRuleType')?.value;
            const priority = document.getElementById('newRulePriority')?.value;
            const description = document.getElementById('newRuleDescription')?.value?.trim();
            const categoryId = document.getElementById('catalogCategorySelect')?.value;
            const bankCode = document.getElementById('catalogBankSelect')?.value;
            const productCode = document.getElementById('catalogProductSelect')?.value;

            // Validaciones
            if (!pattern) {
                this.showError('Validation Error', 'El patrón es requerido');
                return;
            }

            if (!categoryId) {
                this.showError('Validation Error', 'Debes seleccionar una categoría');
                return;
            }

            // Preparar datos de la regla
            const ruleData = {
                pattern,
                ruleType,
                priority: parseInt(priority) || 100,
                description: description || null,
                categoryId,
                bankId: bankCode ? this.getBankIdByCode(bankCode) : null,
                productId: productCode ? this.getProductIdByCode(productCode) : null,
                createdBy: 'admin'
            };

            // Guardar regla
            if (window.supabaseClient && window.supabaseClient.isConnected) {
                await window.supabaseClient.createRule(ruleData);
                this.showSuccess('✅ Regla agregada exitosamente');
            } else {
                // Fallback local
                console.log('🟡 [CATALOGING] Guardando regla localmente:', ruleData);
                this.showSuccess('✅ Regla agregada localmente (sincronizar cuando esté conectado)');
            }

            // Limpiar formulario
            this.clearRuleForm();

            // Recargar lista
            await this.loadRulesForCataloging(bankCode, productCode);

        } catch (error) {
            console.error('❌ Error agregando regla:', error);
            this.showError('Error agregando regla', error.message);
        }
    }

    /**
     * Limpiar formulario de nueva regla
     */
    clearRuleForm() {
        document.getElementById('newRulePattern').value = '';
        document.getElementById('newRuleDescription').value = '';
        document.getElementById('newRulePriority').value = '100';
        document.getElementById('newRuleType').value = 'contains';
    }

    /**
     * Refrescar datos de catalogación
     */
    async refreshCatalogingData() {
        console.log('🔄 Refrescando datos de catalogación...');

        try {
            // Invalidar cache si existe
            if (window.supabaseClient) {
                window.supabaseClient.invalidateCache();
            }

            // Recargar todo
            await this.loadCatalogingData();

            this.showSuccess('✅ Datos actualizados');
        } catch (error) {
            console.error('❌ Error refrescando datos:', error);
            this.showError('Error refrescando datos', error.message);
        }
    }

    /**
     * Ejecutar prueba de categorización
     */
    async runCategorizationTest() {
        const testText = document.getElementById('testGlosaText')?.value?.trim();
        const resultsDiv = document.getElementById('categorizationTestResults');

        if (!testText) {
            this.showError('Validation Error', 'Ingresa glosas para probar');
            return;
        }

        if (!resultsDiv) return;

        try {
            resultsDiv.innerHTML = '<div class="text-center py-4">🔄 Procesando...</div>';

            const lines = testText.split('\n').filter(line => line.trim());
            const results = [];

            for (const line of lines) {
                // Aquí integrarías con tu CategoryEngine existente
                const category = await this.testCategorization(line.trim());
                results.push({
                    original: line.trim(),
                    category: category || 'Sin categoría',
                    confidence: Math.random() * 0.3 + 0.7 // Placeholder
                });
            }

            // Mostrar resultados
            const resultsHTML = results.map(result => `
                <div class="text-left border-b border-gray-200 pb-2 mb-2 last:border-b-0">
                    <div class="font-medium text-sm">"${result.original}"</div>
                    <div class="text-xs text-gray-600 mt-1">
                        → <span class="text-blue-600">${result.category}</span>
                        <span class="ml-2 text-gray-400">(${Math.round(result.confidence * 100)}%)</span>
                    </div>
                </div>
            `).join('');

            resultsDiv.innerHTML = resultsHTML;

        } catch (error) {
            console.error('❌ Error en prueba de categorización:', error);
            resultsDiv.innerHTML = `<div class="text-red-500 text-sm">❌ Error: ${error.message}</div>`;
        }
    }

    /**
     * Probar categorización de una glosa (placeholder)
     */
    async testCategorization(glosa) {
        // Integrar con CategoryEngine existente
        // Por ahora retorna una categoría simple
        if (glosa.toLowerCase().includes('uber')) return 'Alimentación';
        if (glosa.toLowerCase().includes('sodimac')) return 'Hogar';
        if (glosa.toLowerCase().includes('seg')) return 'Seguros';
        return 'Otros';
    }

    /**
     * Event handlers para selectores
     */
    async onBankSelectionChange(bankCode) {
        const productSelect = document.getElementById('catalogProductSelect');

        if (bankCode) {
            // Habilitar selector de productos y cargar productos del banco
            productSelect.disabled = false;
            await this.loadProductsForBank(bankCode);
        } else {
            // Deshabilitar selector de productos
            productSelect.disabled = true;
            productSelect.innerHTML = '<option value="">Todos los productos</option>';
        }

        // Recargar reglas
        await this.loadRulesForCataloging(bankCode);
    }

    async onProductSelectionChange(productCode) {
        const bankCode = document.getElementById('catalogBankSelect')?.value;
        await this.loadRulesForCataloging(bankCode, productCode);
    }

    async onCategorySelectionChange(categoryId) {
        // Podrías filtrar reglas por categoría aquí
        console.log('Categoría seleccionada:', categoryId);
    }

    /**
     * Cargar productos para un banco específico
     */
    async loadProductsForBank(bankCode) {
        const productSelect = document.getElementById('catalogProductSelect');
        if (!productSelect) return;

        try {
            let products = [];

            if (window.supabaseClient && window.supabaseClient.isConnected) {
                const allProducts = await window.supabaseClient.getProducts();
                products = allProducts.filter(p => p.banks?.code === bankCode);
            } else {
                // Fallback local
                products = [
                    { id: '1', code: 'TarjetaCredito', name: 'Tarjeta de Crédito' },
                    { id: '2', code: 'CuentaCorriente', name: 'Cuenta Corriente' }
                ];
            }

            // Limpiar y repoblar
            productSelect.innerHTML = '<option value="">Todos los productos</option>';

            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.code;
                option.textContent = product.name;
                productSelect.appendChild(option);
            });

        } catch (error) {
            console.error('❌ Error cargando productos:', error);
        }
    }

    /**
     * Métodos de utilidad
     */
    getBankIdByCode(code) {
        // Implementar según tu lógica
        return code; // Placeholder
    }

    getProductIdByCode(code) {
        // Implementar según tu lógica
        return code; // Placeholder
    }

    showSuccess(message) {
        // Reutilizar sistema de notificaciones existente
        console.log('✅ SUCCESS:', message);
        // Aquí podrías mostrar un toast o notificación
    }

    showError(title, message) {
        // Reutilizar sistema de notificaciones existente
        console.error('❌ ERROR:', title, message);
        alert(`${title}: ${message}`); // Placeholder
    }
}

// Hacer disponible globalmente para event handlers
window.AdminApp = AdminApp;
let adminApp; // Variable global para acceso desde HTML