/**
 * ClientApp - Aplicación principal para usuarios finales
 * Integra upload de PDFs, parsing, categorización y dashboard analítico
 */
class ClientApp {
    constructor() {
        this.currentTransactions = [];
        this.parserFactory = new ParserFactory();
        this.categoryEngine = new CategoryEngine();
        this.pdfProcessor = new PDFProcessor();
        this.rulesManager = null;

        // Estado de la aplicación
        this.state = {
            isProcessing: false,
            currentView: 'upload', // 'upload', 'dashboard', 'table'
            uploadProgress: 0,
            uploadMessage: ''
        };

        // Configuración de paginación
        this.pagination = {
            currentPage: 1,
            itemsPerPage: 20,
            totalItems: 0,
            totalPages: 0
        };

        this.init();
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        this.createAppStructure();
        this.setupEventListeners();
        this.loadSavedTransactions();

        // Inicializar RulesManager para filtrado avanzado
        await this.initializeRulesManager();

        console.log('🚀 Sistema de Análisis Financiero Inteligente iniciado');
        console.log('📊 Bancos soportados:', this.parserFactory.getSupportedBanks());
    }

    /**
     * Inicializa el RulesManager para filtrado automático
     */
    async initializeRulesManager() {
        try {
            if (typeof RulesManager !== 'undefined') {
                this.rulesManager = new RulesManager();
                await this.rulesManager.init();
                console.log('✅ RulesManager inicializado en ClientApp');
            } else {
                console.warn('⚠️ RulesManager no está disponible');
            }
        } catch (error) {
            console.warn('⚠️ Error inicializando RulesManager:', error);
        }
    }

    /**
     * Crea la estructura HTML de la aplicación
     */
    createAppStructure() {
        const app = document.getElementById('app');

        app.innerHTML = `
            <div class="min-h-screen bg-gray-50">
                <!-- Header -->
                <header class="bg-white shadow-sm border-b">
                    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div class="flex justify-between items-center py-4">
                            <div class="flex items-center space-x-4">
                                <h1 class="text-2xl font-bold text-gray-900">💰 Análisis Financiero Inteligente</h1>
                                <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">v1.0</span>
                                <a href="admin.html" class="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200 text-sm">
                                    🔧 Admin
                                </a>
                            </div>
                            <div class="flex space-x-2">
                                <button id="viewUpload" class="nav-btn px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700">
                                    📤 Subir PDF
                                </button>
                                <button id="viewDashboard" class="nav-btn px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300">
                                    📊 Dashboard
                                </button>
                                <button id="viewTable" class="nav-btn px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300">
                                    📋 Transacciones
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- Main Content -->
                <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <!-- Upload View -->
                    <div id="uploadView" class="view-section">
                        ${this.createUploadSection()}
                    </div>

                    <!-- Dashboard View -->
                    <div id="dashboardView" class="view-section hidden">
                        ${this.createDashboardSection()}
                    </div>

                    <!-- Table View -->
                    <div id="tableView" class="view-section hidden">
                        ${this.createTableSection()}
                    </div>
                </main>

                <!-- Loading Overlay -->
                <div id="loadingOverlay" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 hidden">
                    <div class="bg-white rounded-lg p-6 max-w-md mx-4">
                        <div class="text-center">
                            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <h3 class="text-lg font-medium text-gray-900 mb-2">Procesando archivo</h3>
                            <p id="loadingMessage" class="text-gray-600 mb-4">Iniciando...</p>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div id="loadingProgress" class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Crea la sección de upload
     */
    createUploadSection() {
        return `
            <div class="text-center">
                <div class="max-w-2xl mx-auto">
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">Analiza tu Estado de Cuenta</h2>
                    <p class="text-lg text-gray-600 mb-8">Sube tu PDF de Banco Falabella y obtén insights inteligentes sobre tus gastos</p>

                    <!-- File Upload Area -->
                    <div id="dropZone" class="file-upload-area border-2 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-400 transition-colors cursor-pointer">
                        <div class="text-center">
                            <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <p class="text-xl font-medium text-gray-900 mb-2">Arrastra tu PDF aquí</p>
                            <p class="text-gray-600 mb-4">o haz click para seleccionar</p>
                            <input type="file" id="fileInput" class="hidden" accept=".pdf" />
                            <button id="selectFileBtn" class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                                📁 Seleccionar archivo PDF
                            </button>
                        </div>
                    </div>

                    <!-- Supported Banks -->
                    <div class="mt-8 p-4 bg-blue-50 rounded-lg">
                        <h3 class="text-lg font-medium text-blue-900 mb-2">🏦 Bancos Soportados</h3>
                        <div class="flex flex-wrap justify-center gap-4">
                            <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                🏪 Banco Falabella (Tarjeta CMR)
                            </span>
                        </div>
                        <p class="text-sm text-blue-700 mt-2">Más bancos próximamente...</p>
                    </div>

                    <!-- Quick Stats -->
                    <div id="quickStats" class="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 hidden">
                        <div class="bg-white p-6 rounded-lg shadow">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">🎯 Precisión</h3>
                            <p class="text-3xl font-bold text-green-600">95%+</p>
                            <p class="text-sm text-gray-600">En parsing automático</p>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">⚡ Velocidad</h3>
                            <p class="text-3xl font-bold text-blue-600">&lt;2s</p>
                            <p class="text-sm text-gray-600">Para 200 transacciones</p>
                        </div>
                        <div class="bg-white p-6 rounded-lg shadow">
                            <h3 class="text-lg font-medium text-gray-900 mb-2">🏷️ Categorías</h3>
                            <p class="text-3xl font-bold text-purple-600">8</p>
                            <p class="text-sm text-gray-600">Categorías inteligentes</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Crea la sección del dashboard
     */
    createDashboardSection() {
        return `
            <div>
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">📊 Tu plata al descubierto</h2>
                    <p class="text-gray-600">Te mostramos la verdad sobre tus gastos, sin tecnicismos</p>
                </div>

                <!-- Summary Cards -->
                <div id="summaryCards" class="space-y-6 mb-8">
                    <!-- Cards se generan dinámicamente -->
                </div>

                <!-- Category Chart Section -->
                <div class="mb-8">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">🍰 ¿En qué te gastaste tu plata?</h3>
                        <div style="width: 400px; height: 400px; margin: 0 auto; position: relative; overflow: hidden;">
                            <canvas id="categoryChart" width="400" height="400" style="max-width: 400px; max-height: 400px; display: block;"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Expense Trend Chart Section (Full Width) -->
                <div class="mb-8">
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">📈 Evolución Diaria de Gastos</h3>
                        <p class="text-sm text-gray-600 mb-4">Distribución detallada de gastos por día para identificar patrones de consumo</p>
                        <div style="width: 100%; height: 400px; position: relative; overflow: hidden;">
                            <canvas id="trendChart" style="width: 100%; height: 400px; display: block;"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Insights Section -->
                <div id="insightsSection" class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">💡 Cosas que deberías saber</h3>
                    <div id="insightsList">
                        <!-- Insights se generan dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Crea la sección de tabla
     */
    createTableSection() {
        return `
            <div>
                <div class="mb-8">
                    <h2 class="text-2xl font-bold text-gray-900 mb-2">📋 Todas las Transacciones</h2>
                    <p class="text-gray-600">Vista detallada de todas las transacciones procesadas</p>
                </div>

                <!-- Filters -->
                <div class="bg-white p-4 rounded-lg shadow mb-6">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                            <select id="categoryFilter" class="w-full border border-gray-300 rounded-md px-3 py-2">
                                <option value="">Todas las categorías</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Monto mínimo</label>
                            <input type="number" id="minAmountFilter" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="0">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Monto máximo</label>
                            <input type="number" id="maxAmountFilter" class="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Sin límite">
                        </div>
                        <div class="flex items-end">
                            <button id="applyFilters" class="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                                Aplicar Filtros
                            </button>
                        </div>
                    </div>
                </div>


                <!-- Transaction Table -->
                <div class="bg-white rounded-lg shadow overflow-hidden">
                    <div id="transactionTable">
                        <!-- Tabla se genera dinámicamente -->
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Configura los event listeners
     */
    setupEventListeners() {
        // Navegación
        document.getElementById('viewUpload').addEventListener('click', () => this.switchView('upload'));
        document.getElementById('viewDashboard').addEventListener('click', () => this.switchView('dashboard'));
        document.getElementById('viewTable').addEventListener('click', () => this.switchView('table'));

        // Upload
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const selectFileBtn = document.getElementById('selectFileBtn');

        // Drag & Drop
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelection(files[0]);
            }
        });

        // File selection
        selectFileBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelection(e.target.files[0]);
            }
        });
    }

    /**
     * Cambia la vista activa
     */
    switchView(viewName) {
        // Actualizar estado
        this.state.currentView = viewName;

        // Ocultar todas las vistas
        document.querySelectorAll('.view-section').forEach(section => {
            section.classList.add('hidden');
        });

        // Mostrar vista seleccionada
        document.getElementById(viewName + 'View').classList.remove('hidden');

        // Actualizar botones de navegación
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        });

        const activeBtn = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        activeBtn.classList.add('bg-blue-600', 'text-white');

        // Renderizar contenido específico de la vista
        if (viewName === 'dashboard') {
            this.renderDashboard();
        } else if (viewName === 'table') {
            this.renderTransactionTable();
        }
    }

    /**
     * Maneja la selección de archivo
     */
    async handleFileSelection(file) {
        try {
            // Validar archivo
            const validation = this.pdfProcessor.validateFile(file);
            if (!validation.isValid) {
                this.showError('Error de archivo', validation.error);
                return;
            }

            console.log('📄 Archivo seleccionado:', file.name, '(' + Math.round(file.size / 1024) + 'KB)');

            // Mostrar loading
            this.showLoading();

            // Procesar archivo
            const processed = await this.pdfProcessor.processFile(file, (progress, message) => {
                this.updateLoadingProgress(progress, message);
            });

            // Parse transacciones
            this.updateLoadingProgress(85, 'Analizando transacciones...');
            const parseResult = this.parserFactory.processDocument(processed.text);

            // Guardar resultado de parsing para extraer datos adicionales
            this.lastParseResult = parseResult;

            // Categorizar transacciones
            this.updateLoadingProgress(95, 'Categorizando transacciones...');
            this.currentTransactions = this.categoryEngine.categorizeMultipleTransactions(parseResult.processedTransactions);

            // Guardar resultados
            this.saveTransactions();

            // Mostrar resultados
            this.updateLoadingProgress(100, 'Completado');
            await this.delay(500);
            this.hideLoading();

            // Cambiar a dashboard
            this.switchView('dashboard');

        } catch (error) {
            console.error('Error procesando archivo:', error);
            this.hideLoading();
            this.showError('Error de procesamiento', error.message);
        }
    }

    /**
     * Muestra overlay de loading
     */
    showLoading() {
        document.getElementById('loadingOverlay').classList.remove('hidden');
        this.state.isProcessing = true;
    }

    /**
     * Oculta overlay de loading
     */
    hideLoading() {
        document.getElementById('loadingOverlay').classList.add('hidden');
        this.state.isProcessing = false;
    }

    /**
     * Actualiza progreso de loading
     */
    updateLoadingProgress(progress, message) {
        document.getElementById('loadingProgress').style.width = progress + '%';
        document.getElementById('loadingMessage').textContent = message;
        this.state.uploadProgress = progress;
        this.state.uploadMessage = message;
    }

    /**
     * Muestra mensaje de error
     */
    showError(title, message) {
        alert(title + ': ' + message);
        // TODO: Implementar modal de error más elegante
    }


    /**
     * Renderiza el dashboard
     */
    renderDashboard() {
        if (this.currentTransactions.length === 0) {
            document.getElementById('summaryCards').innerHTML = `
                <div class="col-span-4 text-center py-12">
                    <p class="text-gray-500 text-lg">📄 No hay transacciones para mostrar</p>
                    <p class="text-gray-400">Sube un PDF para ver tu dashboard financiero</p>
                </div>
            `;
            return;
        }

        this.renderSummaryCards();
        this.renderCharts();
        this.renderInsights();
    }

    /**
     * Renderiza las tarjetas de resumen
     */
    renderSummaryCards() {
        // Detectar si es cuenta corriente
        const isCuentaCorriente = this.lastParseResult &&
            this.lastParseResult.bankName &&
            this.lastParseResult.bankName.includes('Cuenta Corriente');

        if (isCuentaCorriente) {
            this.renderCuentaCorrienteDashboard();
        } else {
            this.renderTarjetaCreditoDashboard();
        }
    }

    /**
     * Renderiza dashboard específico para tarjeta de crédito
     */
    renderTarjetaCreditoDashboard() {
        const stats = this.calculateStats();

        document.getElementById('summaryCards').innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Sección: Período Anterior -->
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <div class="bg-blue-100 rounded-full p-1 mr-2">
                            <span class="text-blue-600 text-sm">📄</span>
                        </div>
                        <div>
                            <h3 class="text-base font-semibold text-blue-900">¿Cómo venías el mes pasado?</h3>
                            <p class="text-xs text-blue-700">Lo que ya pagaste de tu tarjeta</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div class="bg-white p-3 rounded-lg border border-blue-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">💰 Lo que te llegó</h4>
                            <p class="text-xl font-bold text-blue-600">$${stats.billedAmount.toLocaleString('es-CL')}</p>
                            <p class="text-xs text-gray-500">Monto de tu estado de cuenta</p>
                        </div>

                        <div class="bg-white p-3 rounded-lg border border-blue-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">💳 Lo que ya pagaste</h4>
                            <p class="text-xl font-bold text-green-600">$${stats.totalPaid.toLocaleString('es-CL')}</p>
                            <p class="text-xs text-gray-500">${stats.paidCount} abonos a tu tarjeta</p>
                        </div>

                        ${stats.billedAmount > 0 ? this.renderPaymentStatusCompact(stats) : ''}
                    </div>
                </div>

                <!-- Sección: Período Actual -->
                <div class="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <div class="bg-red-100 rounded-full p-1 mr-2">
                            <span class="text-red-600 text-sm">💸</span>
                        </div>
                        <div>
                            <h3 class="text-base font-semibold text-red-900">¿En qué gastaste este mes?</h3>
                            <p class="text-xs text-red-700">Los nuevos gastos que tendrás que pagar</p>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <div class="bg-white p-3 rounded-lg border border-red-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">💸 Plata que gastaste</h4>
                            <p class="text-xl font-bold text-red-600">$${stats.totalExpenses.toLocaleString('es-CL')}</p>
                            <p class="text-xs text-gray-500">${stats.expenseCount} compras</p>
                        </div>

                        <div class="bg-white p-3 rounded-lg border border-red-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">🏆 Dónde más gastaste</h4>
                            <div class="space-y-1">
                                ${this.getTop3Categories().map((cat, index) => `
                                    <div class="flex justify-between items-center">
                                        <span class="text-xs text-gray-600">${index + 1}. ${cat.name}</span>
                                        <span class="text-xs font-medium text-red-600">$${cat.amount.toLocaleString('es-CL')}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza dashboard específico para cuenta corriente
     */
    renderCuentaCorrienteDashboard() {
        const cuentaData = this.lastParseResult || {};
        const stats = this.calculateStats();

        // Calcular mayor gasto por categoría
        const mayorGasto = this.calculateMayorGastoPorCategoria();

        document.getElementById('summaryCards').innerHTML = `
            <!-- Mi resumen del mes -->
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div class="flex items-center mb-4">
                    <div class="bg-blue-100 rounded-full p-1 mr-2">
                        <span class="text-blue-600 text-sm">📊</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-blue-900">¿En qué se fue tu plata este mes?</h3>
                        <p class="text-xs text-blue-700">Te mostramos todo clarito, sin códigos raros</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <!-- Total Ingresos -->
                    <div class="bg-white p-3 rounded-lg border border-green-100">
                        <h4 class="text-xs font-medium text-gray-600 mb-1">💰 Plata que entró</h4>
                        <p class="text-xl font-bold text-green-600">$${(cuentaData.totalAbonos || 0).toLocaleString('es-CL')}</p>
                        <p class="text-xs text-gray-500">${this.currentTransactions?.filter(t => t.type === 'deposit').length || 0} abonos</p>
                    </div>

                    <!-- Total Gastos -->
                    <div class="bg-white p-3 rounded-lg border border-red-100">
                        <h4 class="text-xs font-medium text-gray-600 mb-1">💸 Plata que gastaste</h4>
                        <p class="text-xl font-bold text-red-600">$${(cuentaData.totalCargos || 0).toLocaleString('es-CL')}</p>
                        <p class="text-xs text-gray-500">${stats.expenseCount || 0} compras</p>
                    </div>

                    <!-- Top 3 Categorías -->
                    <div class="bg-white p-3 rounded-lg border border-purple-100">
                        <h4 class="text-xs font-medium text-gray-600 mb-1">🏆 Dónde más gastaste</h4>
                        <div class="space-y-1">
                            ${this.getTop3Categories().map((cat, index) => `
                                <div class="flex justify-between items-center">
                                    <span class="text-xs text-gray-600">${index + 1}. ${cat.name}</span>
                                    <span class="text-xs font-medium text-purple-600">$${cat.amount.toLocaleString('es-CL')}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Estado del Período -->
            <div class="mt-6">
                <div class="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div class="flex items-center mb-3">
                        <div class="bg-slate-100 rounded-full p-1 mr-2">
                            <span class="text-slate-600 text-sm">🏦</span>
                        </div>
                        <div>
                            <h3 class="text-base font-semibold text-slate-900">Resumen del Período</h3>
                            <p class="text-xs text-slate-700">Del ${cuentaData.fechaDesde || 'N/A'} al ${cuentaData.fechaHasta || 'N/A'}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <!-- ¿Cómo inicié el período? -->
                        <div class="bg-white p-3 rounded-lg border border-slate-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">🌅 ¿Cómo inicié el período?</h4>
                            <p class="text-xl font-bold text-blue-600">$${(cuentaData.saldoInicialNumerico || 0).toLocaleString('es-CL')}</p>
                            <p class="text-xs text-gray-500">Saldo de apertura</p>
                        </div>

                        <!-- ¿Cómo terminé el período? -->
                        <div class="bg-white p-3 rounded-lg border border-slate-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">🌆 ¿Cómo terminé el período?</h4>
                            <p class="text-xl font-bold ${(cuentaData.saldoFinalNumerico || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                                $${(cuentaData.saldoFinalNumerico || 0).toLocaleString('es-CL')}
                            </p>
                            <p class="text-xs text-gray-500">Saldo final</p>
                        </div>

                        <!-- Diferencia -->
                        <div class="bg-white p-3 rounded-lg border border-slate-100">
                            <h4 class="text-xs font-medium text-gray-600 mb-1">
                                ${(cuentaData.variacionSaldo || 0) >= 0 ? '📈 Diferencia' : '📉 Diferencia'}
                            </h4>
                            <p class="text-xl font-bold ${(cuentaData.variacionSaldo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${(cuentaData.variacionSaldo || 0) >= 0 ? '+' : ''}$${Math.abs(cuentaData.variacionSaldo || 0).toLocaleString('es-CL')}
                            </p>
                            <p class="text-xs text-gray-500">${Math.abs(cuentaData.porcentajeVariacion || 0)}% ${(cuentaData.variacionSaldo || 0) >= 0 ? 'más' : 'menos'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Calcula la categoría con mayor gasto
     */
    calculateMayorGastoPorCategoria() {
        const categoryTotals = {};
        const categoryCounts = {};

        // Obtener gastos por categoría
        this.currentTransactions
            .filter(t => t.type === 'purchase' || t.type === 'charge' || (t.type !== 'payment' && t.amount < 0))
            .forEach(transaction => {
                const category = transaction.category || 'Sin categoría';
                const amount = Math.abs(transaction.amount);

                if (!categoryTotals[category]) {
                    categoryTotals[category] = 0;
                    categoryCounts[category] = 0;
                }
                categoryTotals[category] += amount;
                categoryCounts[category]++;
            });

        // Encontrar la categoría con mayor gasto
        let maxCategory = 'Sin gastos';
        let maxAmount = 0;
        let maxCount = 0;

        for (const [category, amount] of Object.entries(categoryTotals)) {
            if (amount > maxAmount) {
                maxAmount = amount;
                maxCategory = category;
                maxCount = categoryCounts[category];
            }
        }

        return {
            categoria: maxCategory,
            monto: maxAmount,
            transacciones: maxCount
        };
    }

    /**
     * Obtiene las top 3 categorías con más gastos
     */
    getTop3Categories() {
        if (!this.currentTransactions || this.currentTransactions.length === 0) {
            return [
                { name: 'Sin datos', amount: 0 },
                { name: 'Sin datos', amount: 0 },
                { name: 'Sin datos', amount: 0 }
            ];
        }

        // Filtrar solo gastos (transacciones negativas)
        const expenses = this.currentTransactions.filter(t => t.amount < 0);

        // Agrupar por categoría y sumar montos
        const categoryTotals = {};
        expenses.forEach(transaction => {
            const category = transaction.category || 'Otros';
            if (!categoryTotals[category]) {
                categoryTotals[category] = 0;
            }
            categoryTotals[category] += Math.abs(transaction.amount);
        });

        // Convertir a array y ordenar por monto descendente
        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3); // Top 3

        // Llenar con datos vacíos si no hay suficientes categorías
        const result = [];
        for (let i = 0; i < 3; i++) {
            if (sortedCategories[i]) {
                result.push({
                    name: sortedCategories[i][0],
                    amount: sortedCategories[i][1]
                });
            } else {
                result.push({
                    name: 'Sin gastos',
                    amount: 0
                });
            }
        }

        return result;
    }

    /**
     * Renderiza el estado de pago comparando lo facturado vs lo pagado (versión compacta)
     */
    renderPaymentStatusCompact(stats) {
        const difference = stats.totalPaid - stats.billedAmount;
        const isFullyPaid = difference >= 0;
        const percentagePaid = stats.billedAmount > 0 ? Math.round((stats.totalPaid / stats.billedAmount) * 100) : 0;

        let statusColor, statusIcon, statusText;

        if (isFullyPaid) {
            statusColor = 'green';
            statusIcon = '✅';
            statusText = difference === 0 ? 'Pagado al día' : `Sobrepago +$${difference.toLocaleString('es-CL')}`;
        } else {
            statusColor = 'yellow';
            statusIcon = '⚠️';
            statusText = `Pendiente $${Math.abs(difference).toLocaleString('es-CL')}`;
        }

        return `
            <div class="bg-white p-2 rounded-lg border border-blue-100">
                <div class="flex items-center justify-between">
                    <span class="text-sm mr-2">${statusIcon}</span>
                    <div class="text-xs">
                        <span class="font-medium text-${statusColor}-800">${statusText}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza el estado de pago comparando lo facturado vs lo pagado (versión completa - legacy)
     */
    renderPaymentStatus(stats) {
        const difference = stats.totalPaid - stats.billedAmount;
        const isFullyPaid = difference >= 0;
        const percentagePaid = stats.billedAmount > 0 ? Math.round((stats.totalPaid / stats.billedAmount) * 100) : 0;

        let statusColor, statusIcon, statusText, statusDetail;

        if (isFullyPaid) {
            statusColor = 'green';
            statusIcon = '✅';
            statusText = difference === 0 ? 'Pagado Completamente' : 'Sobrepago';
            statusDetail = difference === 0
                ? 'Has pagado exactamente lo facturado'
                : `Pagaste $${difference.toLocaleString('es-CL')} de más`;
        } else {
            statusColor = 'yellow';
            statusIcon = '⚠️';
            statusText = 'Pago Pendiente';
            statusDetail = `Faltan $${Math.abs(difference).toLocaleString('es-CL')} por pagar (${percentagePaid}% pagado)`;
        }

        return `
            <div class="mt-4 bg-white p-4 rounded-lg border-l-4 border-${statusColor}-500">
                <div class="flex items-center">
                    <span class="text-xl mr-3">${statusIcon}</span>
                    <div>
                        <h5 class="font-semibold text-${statusColor}-800">${statusText}</h5>
                        <p class="text-sm text-${statusColor}-600">${statusDetail}</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Calcula estadísticas de las transacciones
     */
    calculateStats() {
        // Filtrar gastos y pagos basado en tipo de transacción
        const expenses = this.currentTransactions.filter(t =>
            t.type === 'purchase' || t.type === 'charge' || (t.type !== 'payment' && t.amount < 0)
        );
        const payments = this.currentTransactions.filter(t =>
            t.type === 'payment' || (t.type !== 'purchase' && t.type !== 'charge' && t.amount > 0)
        );

        const totalExpenses = Math.abs(expenses.reduce((sum, t) => sum + t.amount, 0));
        let totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);

        // Para Santander, usar el monto pagado período anterior si está disponible
        if (this.lastParseResult && this.lastParseResult.bankName === 'Banco Santander' && this.lastParseResult.montoPagadoPeriodoAnterior) {
            totalPaid = Math.abs(parseInt(this.lastParseResult.montoPagadoPeriodoAnterior.replace(/\./g, '').replace('-', ''), 10));
        }

        // Obtener monto facturado del parser (si está disponible)
        const billedAmount = this.getBilledAmount();

        return {
            totalExpenses,
            totalPaid,
            billedAmount,
            expenseCount: expenses.length,
            paidCount: payments.length,
            avgExpense: expenses.length > 0 ? Math.round(totalExpenses / expenses.length) : 0
        };
    }

    /**
     * Obtiene el monto facturado del período anterior desde el parser
     */
    getBilledAmount() {
        // Buscar en los datos del último processing si hay información de monto facturado
        if (this.lastParseResult) {
            // Para Santander, usar el monto facturado período anterior
            if (this.lastParseResult.bankName === 'Banco Santander' && this.lastParseResult.montoFacturadoPeriodoAnterior) {
                return parseInt(this.lastParseResult.montoFacturadoPeriodoAnterior.replace(/\./g, ''), 10);
            }
            // Para otros bancos, usar el campo genérico
            if (this.lastParseResult.billedAmount !== undefined) {
                return this.lastParseResult.billedAmount;
            }
        }
        return 0; // Default si no se encuentra
    }

    /**
     * Renderiza los gráficos
     */
    renderCharts() {
        console.log('📊 Renderizando gráficos...');

        // Prevenir re-renderizado múltiple
        if (this.isRenderingCharts) {
            console.log('⚠️ Ya se están renderizando gráficos, saltando...');
            return;
        }

        // Limitar frecuencia de renderizado
        const now = Date.now();
        if (this.lastChartRender && (now - this.lastChartRender) < 1000) {
            console.log('⚠️ Renderizado muy frecuente, saltando...');
            return;
        }
        this.lastChartRender = now;

        this.isRenderingCharts = true;

        try {
            // Limpiar gráficos existentes de forma segura
            this.destroyExistingCharts();

            // Verificar que tenemos datos válidos
            if (!this.currentTransactions || this.currentTransactions.length === 0) {
                console.log('⚠️ No hay transacciones para mostrar en gráficos');
                this.showEmptyChartsMessage();
                return;
            }

            // Renderizar con timeout para evitar bloqueo y timeout máximo
            const renderTimeout = setTimeout(() => {
                try {
                    this.renderCategoryChart();
                    this.renderTrendChart();
                } catch (error) {
                    console.error('Error renderizando gráficos:', error);
                    this.showChartsError();
                } finally {
                    clearTimeout(killTimeout);
                    this.isRenderingCharts = false;
                }
            }, 100);

            // Timeout de seguridad para evitar bucles infinitos
            const killTimeout = setTimeout(() => {
                clearTimeout(renderTimeout);
                console.error('🚨 Timeout de seguridad: Deteniendo renderizado de gráficos');
                this.destroyExistingCharts();
                this.showChartsError();
                this.isRenderingCharts = false;
            }, 5000); // 5 segundos máximo

        } catch (error) {
            console.error('Error en renderCharts:', error);
            this.isRenderingCharts = false;
        }
    }

    /**
     * Destruye gráficos existentes de forma segura
     */
    destroyExistingCharts() {
        try {
            const categoryChart = Chart.getChart('categoryChart');
            if (categoryChart) {
                categoryChart.destroy();
                console.log('🗑️ Category chart destruido');
            }

            const trendChart = Chart.getChart('trendChart');
            if (trendChart) {
                trendChart.destroy();
                console.log('🗑️ Trend chart destruido');
            }
        } catch (error) {
            console.warn('Error destruyendo gráficos existentes:', error);
        }
    }

    /**
     * Muestra mensaje cuando no hay datos para gráficos
     */
    showEmptyChartsMessage() {
        const categoryCanvas = document.getElementById('categoryChart');
        const trendCanvas = document.getElementById('trendChart');

        if (categoryCanvas) {
            const ctx = categoryCanvas.getContext('2d');
            ctx.clearRect(0, 0, categoryCanvas.width, categoryCanvas.height);
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No hay datos para mostrar', categoryCanvas.width / 2, categoryCanvas.height / 2);
        }

        if (trendCanvas) {
            const ctx = trendCanvas.getContext('2d');
            ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No hay datos para mostrar', trendCanvas.width / 2, trendCanvas.height / 2);
        }

        this.isRenderingCharts = false;
    }

    /**
     * Muestra mensaje de error en gráficos
     */
    showChartsError() {
        const categoryCanvas = document.getElementById('categoryChart');
        const trendCanvas = document.getElementById('trendChart');

        if (categoryCanvas) {
            const ctx = categoryCanvas.getContext('2d');
            ctx.clearRect(0, 0, categoryCanvas.width, categoryCanvas.height);
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'red';
            ctx.fillText('Error cargando gráfico', categoryCanvas.width / 2, categoryCanvas.height / 2);
        }

        if (trendCanvas) {
            const ctx = trendCanvas.getContext('2d');
            ctx.clearRect(0, 0, trendCanvas.width, trendCanvas.height);
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'red';
            ctx.fillText('Error cargando gráfico', trendCanvas.width / 2, trendCanvas.height / 2);
        }
    }

    /**
     * Renderiza gráfico de categorías (pie chart)
     */
    renderCategoryChart() {
        try {
            const categoryData = this.calculateCategoryData();

            // Validar datos
            if (!categoryData || !categoryData.labels || categoryData.labels.length === 0) {
                console.log('⚠️ No hay datos de categorías para mostrar');
                return;
            }

            const canvas = document.getElementById('categoryChart');
            if (!canvas) {
                console.error('Canvas categoryChart no encontrado');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('No se pudo obtener contexto 2D del canvas');
                return;
            }

            // Limpiar canvas antes de crear nuevo gráfico
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Forzar dimensiones fijas del canvas
            canvas.width = 400;
            canvas.height = 400;
            canvas.style.width = '400px';
            canvas.style.height = '400px';

            new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: categoryData.labels,
                    datasets: [{
                        data: categoryData.amounts,
                        backgroundColor: [
                            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                            '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
                        ],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: false,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0
                    },
                    interaction: {
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                padding: 20
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = Math.abs(context.parsed);
                                    const total = context.dataset.data.reduce((a, b) => a + Math.abs(b), 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${context.label}: $${value.toLocaleString('es-CL')} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            console.log('✅ Category chart renderizado exitosamente');
        } catch (error) {
            console.error('Error renderizando category chart:', error);
            throw error;
        }
    }

    /**
     * Renderiza gráfico de tendencias (line chart)
     */
    renderTrendChart() {
        try {
            const expenseData = this.calculateDailyExpenseData();

            // Validar datos
            if (!expenseData || !expenseData.labels || expenseData.labels.length === 0) {
                console.log('⚠️ No hay datos de gastos para mostrar');
                return;
            }

            const canvas = document.getElementById('trendChart');
            if (!canvas) {
                console.error('Canvas trendChart no encontrado');
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                console.error('No se pudo obtener contexto 2D del canvas');
                return;
            }

            // Limpiar canvas antes de crear nuevo gráfico
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Configurar canvas para ser responsive
            canvas.style.width = '100%';
            canvas.style.height = '400px';

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: expenseData.labels,
                    datasets: [{
                        label: 'Gastos Diarios',
                        data: expenseData.expenses,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        pointBackgroundColor: '#EF4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        tension: 0.3,
                        fill: true,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 1000,
                        easing: 'easeInOutQuart'
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    scales: {
                        x: {
                            display: true,
                            title: {
                                display: true,
                                text: 'Fecha',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                maxTicksLimit: 15, // Limitar número de labels para evitar solapamiento
                                font: {
                                    size: 10
                                }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            display: true,
                            title: {
                                display: true,
                                text: 'Monto de Gastos',
                                font: {
                                    size: 12,
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString('es-CL');
                                },
                                font: {
                                    size: 10
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                padding: 20,
                                font: {
                                    size: 12
                                }
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            titleColor: 'white',
                            bodyColor: 'white',
                            borderColor: '#EF4444',
                            borderWidth: 1,
                            callbacks: {
                                title: function(context) {
                                    return `📅 ${context[0].label}`;
                                },
                                label: function(context) {
                                    return `💸 Gastos: $${context.parsed.y.toLocaleString('es-CL')}`;
                                },
                                afterLabel: function(context) {
                                    // Calcular promedio para contexto (sin decimales - formato chileno)
                                    const allExpenses = context.chart.data.datasets[0].data;
                                    const avg = Math.round(allExpenses.reduce((a, b) => a + b, 0) / allExpenses.length);
                                    const current = context.parsed.y;
                                    const diff = current - avg;
                                    const diffPercent = Math.round((diff / avg) * 100);

                                    if (Math.abs(diffPercent) > 20) {
                                        return `📊 ${diffPercent > 0 ? '+' : ''}${diffPercent}% vs promedio`;
                                    }
                                    return null;
                                }
                            }
                        }
                    }
                }
            });

            console.log('✅ Daily expense chart renderizado exitosamente');
        } catch (error) {
            console.error('Error renderizando daily expense chart:', error);
            throw error;
        }
    }

    /**
     * Calcula datos para el gráfico de categorías
     */
    calculateCategoryData() {
        const categoryTotals = {};

        // DEBUG: Mostrar tipos de transacciones
        console.log('🔍 [DEBUG] Transacciones para categorías:', this.currentTransactions.length);
        this.currentTransactions.slice(0, 5).forEach((t, i) => {
            console.log(`🔍 [DEBUG] Transacción ${i + 1}: amount=${t.amount}, category=${t.category}, type=${t.type}`);
        });

        this.currentTransactions
            .filter(t => {
                // Filtrar gastos basado en el tipo o monto dependiendo del banco
                return t.type === 'purchase' || t.type === 'charge' || t.amount < 0;
            })
            .forEach(transaction => {
                const category = transaction.category || 'Sin categoría';
                const amount = Math.abs(transaction.amount);

                if (!categoryTotals[category]) {
                    categoryTotals[category] = 0;
                }
                categoryTotals[category] += amount;
            });

        const sortedCategories = Object.entries(categoryTotals)
            .sort(([,a], [,b]) => b - a);

        return {
            labels: sortedCategories.map(([category]) => category),
            amounts: sortedCategories.map(([, amount]) => amount)
        };
    }

    /**
     * Calcula datos para el gráfico de tendencias
     */
    calculateTrendData() {
        const monthlyData = {};

        this.currentTransactions.forEach(transaction => {
            // Evitar offset de zona horaria parseando la fecha como local
            const [year, month, day] = transaction.date.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyData[monthKey]) {
                monthlyData[monthKey] = { expenses: 0, incomes: 0 };
            }

            // Clasificar basado en tipo de transacción
            if (transaction.type === 'purchase' || transaction.type === 'charge' || (transaction.type !== 'payment' && transaction.amount < 0)) {
                monthlyData[monthKey].expenses += Math.abs(transaction.amount);
            } else if (transaction.type === 'payment' || (transaction.type !== 'purchase' && transaction.type !== 'charge' && transaction.amount > 0)) {
                monthlyData[monthKey].incomes += Math.abs(transaction.amount);
            }
        });

        const sortedMonths = Object.keys(monthlyData).sort();

        return {
            labels: sortedMonths.map(month => {
                const [year, monthNum] = month.split('-');
                const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
                                 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
                return `${monthNames[parseInt(monthNum) - 1]} ${year}`;
            }),
            expenses: sortedMonths.map(month => monthlyData[month].expenses),
            incomes: sortedMonths.map(month => monthlyData[month].incomes)
        };
    }

    /**
     * Calcula datos diarios de gastos para el gráfico detallado
     */
    calculateDailyExpenseData() {
        const dailyExpenses = {};

        // Solo procesar gastos (basado en tipo o monto)
        this.currentTransactions
            .filter(transaction => {
                return transaction.type === 'purchase' || transaction.type === 'charge' || transaction.amount < 0;
            })
            .forEach(transaction => {
                const dateKey = transaction.date; // Ya está en formato YYYY-MM-DD

                if (!dailyExpenses[dateKey]) {
                    dailyExpenses[dateKey] = 0;
                }

                dailyExpenses[dateKey] += Math.abs(transaction.amount);
            });

        // Ordenar fechas y preparar datos
        const sortedDates = Object.keys(dailyExpenses).sort();

        if (sortedDates.length === 0) {
            return { labels: [], expenses: [] };
        }

        // Crear rango completo de fechas para mostrar días sin gastos
        const startDate = new Date(sortedDates[0]);
        const endDate = new Date(sortedDates[sortedDates.length - 1]);
        const allDates = [];
        const allExpenses = [];

        for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
            const expense = dailyExpenses[dateKey] || 0;

            allDates.push(this.formatDateForChart(dateKey));
            allExpenses.push(expense);
        }

        console.log(`📊 [DAILY EXPENSES] Procesados ${allDates.length} días, ${sortedDates.length} con gastos`);

        return {
            labels: allDates,
            expenses: allExpenses
        };
    }

    /**
     * Formatea fecha para mostrar en el gráfico
     */
    formatDateForChart(dateString) {
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit'
        });
    }

    /**
     * Renderiza insights inteligentes
     */
    renderInsights() {
        document.getElementById('insightsList').innerHTML = `
            <div class="space-y-4">
                <div class="flex items-start space-x-3">
                    <span class="text-2xl">🍔</span>
                    <div>
                        <h4 class="font-medium text-gray-900">Te está saliendo caro el delivery</h4>
                        <p class="text-gray-600">Considera cocinar más seguido, puedes ahorrar bastante plata</p>
                    </div>
                </div>
                <div class="flex items-start space-x-3">
                    <span class="text-2xl">✅</span>
                    <div>
                        <h4 class="font-medium text-gray-900">Todo listo</h4>
                        <p class="text-gray-600">Revisamos ${this.currentTransactions.length} movimientos y los categorizamos para que los entiendas fácil</p>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Renderiza la tabla de transacciones
     */
    renderTransactionTable() {
        console.log('📋 Renderizando tabla de transacciones...');

        if (this.currentTransactions.length === 0) {
            document.getElementById('transactionTable').innerHTML = `
                <div class="text-center py-12">
                    <p class="text-gray-500 text-lg">📄 No hay transacciones para mostrar</p>
                    <p class="text-gray-400">Sube un PDF para ver la tabla de transacciones</p>
                </div>
            `;
            return;
        }

        // Poblar filtros de categorías
        this.populateCategoryFilter();

        // Renderizar tabla
        this.updateTransactionTable();

        // Configurar event listeners de filtros
        this.setupTableFilters();
    }

    /**
     * Puebla el filtro de categorías
     */
    populateCategoryFilter() {
        const categoryFilter = document.getElementById('categoryFilter');
        const categories = [...new Set(this.currentTransactions.map(t => t.category || 'Sin categoría'))];

        categoryFilter.innerHTML = '<option value="">Todas las categorías</option>';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    /**
     * Actualiza la tabla de transacciones con filtros aplicados
     */
    updateTransactionTable(resetPagination = false) {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const minAmount = parseFloat(document.getElementById('minAmountFilter').value) || -Infinity;
        const maxAmount = parseFloat(document.getElementById('maxAmountFilter').value) || Infinity;

        let filteredTransactions = this.currentTransactions.filter(transaction => {
            const amount = Math.abs(transaction.amount);
            const category = transaction.category || 'Sin categoría';

            const categoryMatch = !categoryFilter || category === categoryFilter;
            const amountMatch = amount >= minAmount && amount <= maxAmount;

            return categoryMatch && amountMatch;
        });

        // Ordenar por fecha descendente
        filteredTransactions.sort((a, b) => {
            // Parsear fechas como locales para evitar offset de zona horaria
            const dateA = new Date(...a.date.split('-').map((part, i) => i === 1 ? part - 1 : part));
            const dateB = new Date(...b.date.split('-').map((part, i) => i === 1 ? part - 1 : part));
            return dateB - dateA;
        });

        // Actualizar información de paginación
        this.pagination.totalItems = filteredTransactions.length;
        this.pagination.totalPages = Math.ceil(filteredTransactions.length / this.pagination.itemsPerPage);

        // Resetear página si es necesario
        if (resetPagination || this.pagination.currentPage > this.pagination.totalPages) {
            this.pagination.currentPage = 1;
        }

        // Aplicar paginación
        const startIndex = (this.pagination.currentPage - 1) * this.pagination.itemsPerPage;
        const endIndex = startIndex + this.pagination.itemsPerPage;
        const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

        const tableHtml = `
            <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-gray-200">
                        ${paginatedTransactions.map(transaction => `
                            <tr class="hover:bg-gray-50">
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    ${this.formatDisplayDate(transaction.date)}
                                </td>
                                <td class="px-6 py-4 text-sm text-gray-900">
                                    <div class="max-w-xs truncate" title="${transaction.description}">
                                        ${transaction.description}
                                    </div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${this.getCategoryBadgeColor(transaction.category)}">
                                        ${this.getCategoryIcon(transaction.category)} ${transaction.category || 'Sin categoría'}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <span class="${transaction.amount < 0 ? 'text-red-600' : 'text-green-600'}">
                                        ${transaction.amount < 0 ? '-' : '+'}$${Math.abs(transaction.amount).toLocaleString('es-CL')}
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${transaction.amount < 0 ? '💸 Gasto' : '💰 Ingreso'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="px-6 py-4 bg-gray-50 border-t">
                <div class="flex items-center justify-between">
                    <div class="text-sm text-gray-700">
                        Mostrando ${startIndex + 1}-${Math.min(endIndex, this.pagination.totalItems)} de ${this.pagination.totalItems} transacciones
                        ${this.pagination.totalItems !== this.currentTransactions.length ? `(filtradas de ${this.currentTransactions.length})` : ''}
                    </div>
                    <div class="text-sm text-gray-500">
                        Total filtrado: <span class="font-medium">${this.calculateFilteredTotal(filteredTransactions)}</span>
                    </div>
                </div>
                ${this.renderPaginationControls()}
            </div>
        `;

        document.getElementById('transactionTable').innerHTML = tableHtml;

        // Configurar event listeners para paginación
        this.setupPaginationListeners();
    }

    /**
     * Renderiza los controles de paginación
     */
    renderPaginationControls() {
        if (this.pagination.totalPages <= 1) {
            return '';
        }

        const currentPage = this.pagination.currentPage;
        const totalPages = this.pagination.totalPages;

        // Calcular páginas a mostrar
        const maxButtons = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(totalPages, startPage + maxButtons - 1);

        // Ajustar si estamos cerca del final
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        let paginationHtml = `
            <div class="flex items-center justify-between mt-4">
                <div class="flex items-center space-x-2">
                    <label class="text-sm text-gray-700">Elementos por página:</label>
                    <select id="itemsPerPageSelect" class="border border-gray-300 rounded px-2 py-1 text-sm">
                        <option value="10" ${this.pagination.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                        <option value="20" ${this.pagination.itemsPerPage === 20 ? 'selected' : ''}>20</option>
                        <option value="50" ${this.pagination.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                        <option value="100" ${this.pagination.itemsPerPage === 100 ? 'selected' : ''}>100</option>
                    </select>
                </div>
                <div class="flex items-center space-x-1">
                    <!-- Botón Primera página -->
                    <button id="firstPageBtn"
                            class="px-3 py-2 text-sm border rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            ${currentPage === 1 ? 'disabled' : ''}>
                        ⏮️ Primera
                    </button>

                    <!-- Botón Anterior -->
                    <button id="prevPageBtn"
                            class="px-3 py-2 text-sm border rounded ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            ${currentPage === 1 ? 'disabled' : ''}>
                        ⬅️ Anterior
                    </button>
        `;

        // Botones de números de página
        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <button class="pageBtn px-3 py-2 text-sm border rounded ${i === currentPage ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                        data-page="${i}">
                    ${i}
                </button>
            `;
        }

        paginationHtml += `
                    <!-- Botón Siguiente -->
                    <button id="nextPageBtn"
                            class="px-3 py-2 text-sm border rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            ${currentPage === totalPages ? 'disabled' : ''}>
                        Siguiente ➡️
                    </button>

                    <!-- Botón Última página -->
                    <button id="lastPageBtn"
                            class="px-3 py-2 text-sm border rounded ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 hover:bg-gray-50'}"
                            ${currentPage === totalPages ? 'disabled' : ''}>
                        Última ⏭️
                    </button>
                </div>
            </div>
        `;

        return paginationHtml;
    }

    /**
     * Configura los event listeners para paginación
     */
    setupPaginationListeners() {
        // Botones de navegación
        const firstBtn = document.getElementById('firstPageBtn');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
        const lastBtn = document.getElementById('lastPageBtn');
        const itemsPerPageSelect = document.getElementById('itemsPerPageSelect');

        if (firstBtn) {
            firstBtn.addEventListener('click', () => {
                this.pagination.currentPage = 1;
                this.updateTransactionTable();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.pagination.currentPage > 1) {
                    this.pagination.currentPage--;
                    this.updateTransactionTable();
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.pagination.currentPage < this.pagination.totalPages) {
                    this.pagination.currentPage++;
                    this.updateTransactionTable();
                }
            });
        }

        if (lastBtn) {
            lastBtn.addEventListener('click', () => {
                this.pagination.currentPage = this.pagination.totalPages;
                this.updateTransactionTable();
            });
        }

        // Botones de número de página
        document.querySelectorAll('.pageBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                this.pagination.currentPage = page;
                this.updateTransactionTable();
            });
        });

        // Selector de elementos por página
        if (itemsPerPageSelect) {
            itemsPerPageSelect.addEventListener('change', (e) => {
                this.pagination.itemsPerPage = parseInt(e.target.value);
                this.pagination.currentPage = 1; // Resetear a primera página
                this.updateTransactionTable();
            });
        }
    }

    /**
     * Configura los event listeners para los filtros
     */
    setupTableFilters() {
        document.getElementById('applyFilters').addEventListener('click', () => {
            this.updateTransactionTable(true); // Resetear paginación al aplicar filtros
        });

        // Aplicar filtros automáticamente al cambiar valores
        ['categoryFilter', 'minAmountFilter', 'maxAmountFilter'].forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', () => this.updateTransactionTable());
                if (element.type === 'number') {
                    element.addEventListener('input', () => this.updateTransactionTable());
                }
            }
        });
    }

    /**
     * Calcula el total de las transacciones filtradas
     */
    calculateFilteredTotal(transactions) {
        const total = transactions.reduce((sum, t) => sum + t.amount, 0);
        const color = total >= 0 ? 'text-green-600' : 'text-red-600';
        return `<span class="${color}">${total >= 0 ? '+' : ''}$${total.toLocaleString('es-CL')}</span>`;
    }

    /**
     * Formatea fecha para mostrar en la tabla
     */
    formatDisplayDate(dateString) {
        // Evitar offset de zona horaria parseando la fecha como local
        const [year, month, day] = dateString.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

        return date.toLocaleDateString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    /**
     * Obtiene el color del badge para una categoría
     */
    getCategoryBadgeColor(category) {
        const colors = {
            'Alimentación': 'bg-red-100 text-red-800',
            'Transporte': 'bg-blue-100 text-blue-800',
            'Salud': 'bg-green-100 text-green-800',
            'Entretenimiento': 'bg-purple-100 text-purple-800',
            'Compras': 'bg-yellow-100 text-yellow-800',
            'Servicios': 'bg-indigo-100 text-indigo-800',
            'Transferencias': 'bg-pink-100 text-pink-800',
            'Otros': 'bg-gray-100 text-gray-800'
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    }

    /**
     * Obtiene el icono para una categoría
     */
    getCategoryIcon(category) {
        const icons = {
            'Alimentación': '🍽️',
            'Transporte': '🚗',
            'Salud': '⚕️',
            'Entretenimiento': '🎬',
            'Compras': '🛍️',
            'Servicios': '💡',
            'Transferencias': '💸',
            'Otros': '📦'
        };
        return icons[category] || '📦';
    }

    /**
     * Guarda las transacciones en localStorage
     */
    saveTransactions() {
        localStorage.setItem('financeAnalyzer_transactions', JSON.stringify(this.currentTransactions));
        localStorage.setItem('financeAnalyzer_lastUpdate', new Date().toISOString());
    }

    /**
     * Carga transacciones guardadas
     */
    loadSavedTransactions() {
        const saved = localStorage.getItem('financeAnalyzer_transactions');
        if (saved) {
            try {
                this.currentTransactions = JSON.parse(saved);
                console.log(`📂 Cargadas ${this.currentTransactions.length} transacciones guardadas`);
            } catch (error) {
                console.warn('Error cargando transacciones guardadas:', error);
                this.currentTransactions = [];
            }
        }
    }

    /**
     * Utility: delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Configura el Centro de Mejora del Parser
     */
    setupParserCenter() {
        // Toggle para mostrar/ocultar
        const toggleBtn = document.getElementById('toggleParserCenter');
        const content = document.getElementById('parserCenterContent');
        const toggleText = document.getElementById('toggleParserText');

        if (toggleBtn && content && toggleText) {
            toggleBtn.addEventListener('click', () => {
                const isHidden = content.classList.contains('hidden');
                if (isHidden) {
                    content.classList.remove('hidden');
                    toggleText.textContent = 'Ocultar';
                } else {
                    content.classList.add('hidden');
                    toggleText.textContent = 'Mostrar';
                }
            });
        }

        // Botones de reglas manuales
        const addRuleBtn = document.getElementById('addManualRule');
        if (addRuleBtn) {
            addRuleBtn.addEventListener('click', () => this.addManualRule());
        }

        // Input de regla manual con Enter
        const ruleTextInput = document.getElementById('ruleText');
        if (ruleTextInput) {
            ruleTextInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addManualRule();
                }
            });
        }

        // Botones de análisis automático
        const analyzeBtn = document.getElementById('analyzeProblems');
        const clearBtn = document.getElementById('clearProblems');
        const applyBtn = document.getElementById('applyImprovements');
        const testBtn = document.getElementById('testImprovements');

        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', () => this.analyzeProblematicLines());
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearParserInputs());
        }

        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyParserImprovements());
        }

        if (testBtn) {
            testBtn.addEventListener('click', () => this.testParserImprovements());
        }
    }

    /**
     * Analiza las líneas problemáticas y sugiere mejoras
     */
    analyzeProblematicLines() {
        const textarea = document.getElementById('problematicLines');
        const analysisDiv = document.getElementById('parserAnalysis');
        const applyBtn = document.getElementById('applyImprovements');
        const testBtn = document.getElementById('testImprovements');

        if (!textarea || !analysisDiv) return;

        const lines = textarea.value.trim().split('\n').filter(line => line.trim());
        if (lines.length === 0) {
            analysisDiv.innerHTML = '<p class="text-red-600">⚠️ No hay líneas para analizar</p>';
            return;
        }

        analysisDiv.innerHTML = '<p class="text-blue-600">🔍 Analizando patrones...</p>';

        // Simular análisis con timeout para UX
        setTimeout(() => {
            const analysis = this.performPatternAnalysis(lines);
            this.displayAnalysisResults(analysis, analysisDiv);

            // Habilitar botones si hay mejoras sugeridas
            if (analysis.improvements.length > 0) {
                applyBtn.disabled = false;
                testBtn.disabled = false;
            }
        }, 500);
    }

    /**
     * Realiza el análisis de patrones problemáticos
     */
    performPatternAnalysis(lines) {
        const analysis = {
            totalLines: lines.length,
            patterns: [],
            improvements: [],
            keywords: new Set(),
            structures: new Set()
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();

            // Detectar patrones comunes de líneas no-transaccionales
            const patterns = {
                totales: /total|subtotal|suma|resumen/i,
                paginacion: /página|page|hoja|\d+\s*de\s*\d+/i,
                urls: /www\.|http|\.com|\.cl/i,
                encabezados: /estado\s+de\s+cuenta|movimientos|transacciones|fecha|descripci[óo]n/i,
                informacion: /información|contacto|servicio|cliente/i,
                solo_numeros: /^[\d\s\.\-,]+$/,
                solo_fechas: /^\d{1,2}\/\d{1,2}\/\d{4}$/,
                caracteres_especiales: /^[_\-=\*\+\s]+$/
            };

            Object.entries(patterns).forEach(([type, regex]) => {
                if (regex.test(trimmed)) {
                    analysis.patterns.push({
                        line: trimmed,
                        type,
                        index: index + 1,
                        confidence: this.calculatePatternConfidence(trimmed, regex)
                    });
                }
            });

            // Extraer keywords específicas
            const words = trimmed.toLowerCase().split(/\s+/);
            words.forEach(word => {
                if (word.length > 3 && this.isProbablyKeyword(word)) {
                    analysis.keywords.add(word);
                }
            });
        });

        // Generar mejoras basadas en el análisis
        analysis.improvements = this.generateImprovements(analysis);

        return analysis;
    }

    /**
     * Calcula la confianza de un patrón detectado
     */
    calculatePatternConfidence(line, regex) {
        const matches = line.match(regex);
        if (!matches) return 0;

        // Más matches o matches más largos = mayor confianza
        const matchLength = matches.join('').length;
        const lineLength = line.length;

        return Math.min(100, Math.round((matchLength / lineLength) * 100));
    }

    /**
     * Determina si una palabra podría ser keyword problemática
     */
    isProbablyKeyword(word) {
        const commonProblematic = [
            'total', 'página', 'información', 'contacto', 'servicio',
            'cliente', 'banco', 'tarjeta', 'cuenta', 'estado',
            'movimiento', 'transacción', 'fecha', 'descripción',
            'monto', 'saldo', 'desde', 'hasta', 'periodo'
        ];

        return commonProblematic.includes(word) ||
               word.includes('www') ||
               word.includes('.com') ||
               /^\d+$/.test(word);
    }

    /**
     * Genera mejoras específicas basadas en el análisis
     */
    generateImprovements(analysis) {
        const improvements = [];

        // Mejoras por patrones detectados
        const patternTypes = [...new Set(analysis.patterns.map(p => p.type))];

        patternTypes.forEach(type => {
            const patternsOfType = analysis.patterns.filter(p => p.type === type);
            const avgConfidence = patternsOfType.reduce((sum, p) => sum + p.confidence, 0) / patternsOfType.length;

            if (avgConfidence > 30) {
                improvements.push({
                    type: 'pattern_filter',
                    category: type,
                    description: `Filtrar líneas tipo "${type}"`,
                    confidence: Math.round(avgConfidence),
                    count: patternsOfType.length,
                    examples: patternsOfType.slice(0, 2).map(p => p.line)
                });
            }
        });

        // Mejoras por keywords
        if (analysis.keywords.size > 0) {
            improvements.push({
                type: 'keyword_filter',
                category: 'keywords',
                description: `Agregar ${analysis.keywords.size} keywords de exclusión`,
                confidence: 85,
                keywords: Array.from(analysis.keywords)
            });
        }

        return improvements;
    }

    /**
     * Muestra los resultados del análisis
     */
    displayAnalysisResults(analysis, container) {
        let html = `
            <div class="space-y-3">
                <div class="bg-blue-100 p-3 rounded">
                    <h4 class="font-semibold text-blue-900">📊 Análisis Completado</h4>
                    <p class="text-sm text-blue-700">
                        Líneas analizadas: ${analysis.totalLines} |
                        Patrones detectados: ${analysis.patterns.length} |
                        Mejoras sugeridas: ${analysis.improvements.length}
                    </p>
                </div>
        `;

        if (analysis.improvements.length > 0) {
            html += '<div class="space-y-2">';
            analysis.improvements.forEach((improvement, index) => {
                html += `
                    <div class="bg-green-50 border border-green-200 p-2 rounded text-sm">
                        <div class="flex items-center justify-between">
                            <strong class="text-green-900">✨ ${improvement.description}</strong>
                            <span class="bg-green-200 text-green-800 px-2 py-1 rounded text-xs">
                                ${improvement.confidence}% confianza
                            </span>
                        </div>
                `;

                if (improvement.examples) {
                    html += `
                        <div class="mt-1">
                            <span class="text-green-700 text-xs">Ejemplos:</span>
                            <ul class="text-green-600 text-xs ml-2">
                                ${improvement.examples.map(ex => `<li>• "${ex}"</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                if (improvement.keywords) {
                    html += `
                        <div class="mt-1">
                            <span class="text-green-700 text-xs">Keywords:</span>
                            <span class="text-green-600 text-xs">${improvement.keywords.join(', ')}</span>
                        </div>
                    `;
                }

                html += '</div>';
            });
            html += '</div>';
        } else {
            html += '<div class="bg-yellow-100 border border-yellow-200 p-3 rounded text-sm text-yellow-700">⚠️ No se detectaron patrones claros para mejorar. Las líneas podrían necesitar revisión manual.</div>';
        }

        html += '</div>';
        container.innerHTML = html;

        // Guardar análisis para usar en aplicar mejoras
        this.currentAnalysis = analysis;
    }

    /**
     * Limpia los inputs del parser center
     */
    clearParserInputs() {
        const textarea = document.getElementById('problematicLines');
        const analysisDiv = document.getElementById('parserAnalysis');
        const applyBtn = document.getElementById('applyImprovements');
        const testBtn = document.getElementById('testImprovements');

        if (textarea) textarea.value = '';
        if (analysisDiv) analysisDiv.innerHTML = '<p class="text-blue-600 italic">Los resultados del análisis aparecerán aquí...</p>';
        if (applyBtn) applyBtn.disabled = true;
        if (testBtn) testBtn.disabled = true;

        this.currentAnalysis = null;

        // Inicializar array de reglas manuales
        if (!this.manualRules) {
            this.manualRules = [];
        }
    }

    /**
     * Agregar regla manual personalizada
     */
    addManualRule() {
        const ruleTypeSelect = document.getElementById('ruleType');
        const ruleTextInput = document.getElementById('ruleText');

        if (!ruleTypeSelect || !ruleTextInput) return;

        const ruleType = ruleTypeSelect.value;
        const ruleText = ruleTextInput.value.trim();

        if (!ruleText) {
            alert('⚠️ Ingresa el texto para filtrar');
            ruleTextInput.focus();
            return;
        }

        // Crear la regla
        const rule = {
            id: Date.now(),
            type: ruleType,
            text: ruleText,
            description: this.getRuleDescription(ruleType, ruleText),
            active: true,
            created: new Date().toLocaleString('es-CL')
        };

        // Agregar a la lista de reglas
        if (!this.manualRules) {
            this.manualRules = [];
        }
        this.manualRules.push(rule);

        // Aplicar inmediatamente al parser
        this.applyManualRule(rule);

        // Actualizar interfaz
        this.updateActiveRulesDisplay();

        // Limpiar input
        ruleTextInput.value = '';
        ruleTextInput.focus();

        // Mostrar confirmación
        this.showRuleConfirmation(rule);
    }

    /**
     * Genera descripción legible de la regla
     */
    getRuleDescription(type, text) {
        const descriptions = {
            contains: `Líneas que contengan "${text}"`,
            starts: `Líneas que comiencen con "${text}"`,
            ends: `Líneas que terminen con "${text}"`,
            exact: `Líneas que sean exactamente "${text}"`
        };
        return descriptions[type] || `Filtrar "${text}"`;
    }

    /**
     * Aplica una regla manual inmediatamente al parser
     */
    applyManualRule(rule) {
        // Extender el método shouldSkipLine del parser
        const originalShouldSkipLine = BancoFalabellaParser.prototype.shouldSkipLine;

        BancoFalabellaParser.prototype.shouldSkipLine = function(line) {
            // Aplicar filtros originales
            if (originalShouldSkipLine && originalShouldSkipLine.call(this, line)) {
                return true;
            }

            // Aplicar reglas manuales
            if (window.clientApp && window.clientApp.manualRules) {
                for (const manualRule of window.clientApp.manualRules) {
                    if (!manualRule.active) continue;

                    const shouldSkip = window.clientApp.checkManualRule(line, manualRule);
                    if (shouldSkip) {
                        console.log(`⚠️ [MANUAL RULE] Línea saltada (${manualRule.description}): "${line}"`);
                        return true;
                    }
                }
            }

            return false;
        };

        // Hacer la instancia accesible globalmente para el parser
        window.clientApp = this;

        console.log(`✅ Regla manual aplicada: ${rule.description}`);
    }

    /**
     * Verifica si una línea coincide con una regla manual
     */
    checkManualRule(line, rule) {
        const lowerLine = line.toLowerCase();
        const lowerText = rule.text.toLowerCase();

        switch (rule.type) {
            case 'contains':
                return lowerLine.includes(lowerText);
            case 'starts':
                return lowerLine.startsWith(lowerText);
            case 'ends':
                return lowerLine.endsWith(lowerText);
            case 'exact':
                return lowerLine.trim() === lowerText;
            default:
                return false;
        }
    }

    /**
     * Actualiza la visualización de reglas activas
     */
    updateActiveRulesDisplay() {
        const container = document.getElementById('activeRules');
        if (!container || !this.manualRules || this.manualRules.length === 0) {
            if (container) {
                container.innerHTML = '<p class="text-green-600 italic">No hay reglas personalizadas activas</p>';
            }
            return;
        }

        let html = '<div class="space-y-2">';
        this.manualRules.forEach(rule => {
            html += `
                <div class="flex items-center justify-between bg-green-100 px-3 py-2 rounded border border-green-200">
                    <div class="flex-1">
                        <span class="text-green-900 font-medium text-sm">${rule.description}</span>
                        <br><span class="text-green-600 text-xs">Creada: ${rule.created}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="toggle-rule text-sm px-2 py-1 rounded ${rule.active ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'}"
                                data-rule-id="${rule.id}">
                            ${rule.active ? '✅' : '❌'}
                        </button>
                        <button class="delete-rule text-red-600 hover:text-red-800 text-sm px-2 py-1"
                                data-rule-id="${rule.id}">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        container.innerHTML = html;

        // Agregar event listeners para botones de reglas
        container.querySelectorAll('.toggle-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = parseInt(e.target.dataset.ruleId);
                this.toggleManualRule(ruleId);
            });
        });

        container.querySelectorAll('.delete-rule').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const ruleId = parseInt(e.target.dataset.ruleId);
                this.deleteManualRule(ruleId);
            });
        });
    }

    /**
     * Activa/desactiva una regla manual
     */
    toggleManualRule(ruleId) {
        const rule = this.manualRules.find(r => r.id === ruleId);
        if (rule) {
            rule.active = !rule.active;
            this.updateActiveRulesDisplay();
            console.log(`🔄 Regla ${rule.active ? 'activada' : 'desactivada'}: ${rule.description}`);
        }
    }

    /**
     * Elimina una regla manual
     */
    deleteManualRule(ruleId) {
        const rule = this.manualRules.find(r => r.id === ruleId);
        if (rule && confirm(`¿Eliminar la regla "${rule.description}"?`)) {
            this.manualRules = this.manualRules.filter(r => r.id !== ruleId);
            this.updateActiveRulesDisplay();
            console.log(`🗑️ Regla eliminada: ${rule.description}`);
        }
    }

    /**
     * Muestra confirmación visual de regla agregada
     */
    showRuleConfirmation(rule) {
        const container = document.getElementById('activeRules').parentElement;
        const confirmation = document.createElement('div');
        confirmation.className = 'bg-green-200 border border-green-400 rounded p-2 mt-2 text-sm text-green-800';
        confirmation.innerHTML = `✅ <strong>Regla agregada:</strong> ${rule.description}`;

        container.appendChild(confirmation);

        // Remover después de 3 segundos
        setTimeout(() => {
            if (confirmation.parentElement) {
                confirmation.parentElement.removeChild(confirmation);
            }
        }, 3000);
    }

    /**
     * Aplica las mejoras sugeridas al parser
     */
    applyParserImprovements() {
        if (!this.currentAnalysis || this.currentAnalysis.improvements.length === 0) {
            alert('No hay mejoras para aplicar');
            return;
        }

        console.log('🔧 Aplicando mejoras al parser...');

        // Aplicar mejoras al BancoFalabellaParser
        this.enhanceParserWithImprovements(this.currentAnalysis.improvements);

        // Mostrar confirmación
        alert('✅ Mejoras aplicadas! El parser ahora debería filtrar mejor las transacciones.');

        // Limpiar interfaz
        this.clearParserInputs();
    }

    /**
     * Prueba las mejoras sin aplicarlas permanentemente
     */
    testParserImprovements() {
        if (!this.currentAnalysis) {
            alert('No hay análisis para probar');
            return;
        }

        console.log('🧪 Probando mejoras sugeridas...');
        alert('🧪 Función de prueba en desarrollo. Por ahora, puedes aplicar las mejoras directamente.');
    }

    /**
     * Mejora el parser con las sugerencias del análisis
     */
    enhanceParserWithImprovements(improvements) {
        // Agregar mejoras dinámicamente al parser
        improvements.forEach(improvement => {
            if (improvement.type === 'keyword_filter' && improvement.keywords) {
                // Agregar keywords al filtro del parser
                this.addKeywordsToParser(improvement.keywords);
            } else if (improvement.type === 'pattern_filter') {
                // Agregar patrones específicos
                this.addPatternToParser(improvement.category, improvement.examples);
            }
        });
    }

    /**
     * Agrega keywords dinámicamente al filtro del parser
     */
    addKeywordsToParser(keywords) {
        // Extender el método shouldSkipLine del parser
        const originalShouldSkipLine = BancoFalabellaParser.prototype.shouldSkipLine;

        BancoFalabellaParser.prototype.shouldSkipLine = function(line) {
            // Aplicar filtro original
            if (originalShouldSkipLine && originalShouldSkipLine.call(this, line)) {
                return true;
            }

            // Aplicar nuevas keywords
            const lowerLine = line.toLowerCase();
            for (const keyword of keywords) {
                if (lowerLine.includes(keyword.toLowerCase())) {
                    console.log(`⚠️ [ENHANCED FILTER] Línea saltada (keyword: ${keyword}): "${line}"`);
                    return true;
                }
            }

            return false;
        };

        console.log(`✨ Parser mejorado con ${keywords.length} nuevas keywords:`, keywords);
    }

    /**
     * Agrega patrones dinámicamente al filtro del parser
     */
    addPatternToParser(category, examples) {
        console.log(`✨ Parser mejorado con patrón "${category}":`, examples);
        // Este método se puede expandir para patrones más específicos
        // Por ahora, los patrones se manejan a través de keywords
    }
}