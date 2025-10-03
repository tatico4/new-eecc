/**
 * CategoryManager - Gestión de categorías y keywords para el admin
 * Interfaz simple y fácil de usar para administrar categorías
 */
class CategoryManager {
    constructor() {
        this.categories = {};
        this.selectedCategory = null;
        this.categoryEngine = null;
        this.hasChanges = false;

        this.init();
    }

    async init() {
        console.log('🏷️ Iniciando CategoryManager');

        // Importar categorías actuales
        this.categories = getAllCategories();

        // Inicializar CategoryEngine para pruebas
        this.categoryEngine = new CategoryEngine();

        // Configurar event listeners
        this.setupEventListeners();

        // Cargar categorías en la interfaz
        this.loadCategories();

        console.log('✅ CategoryManager inicializado');
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('categoriesTab')?.addEventListener('click', () => this.show());

        // Category management
        document.getElementById('addCategoryBtn')?.addEventListener('click', () => this.showCategoryModal());
        document.getElementById('categoryForm')?.addEventListener('submit', (e) => this.saveCategory(e));
        document.getElementById('closeCategoryModal')?.addEventListener('click', () => this.hideCategoryModal());
        document.getElementById('cancelCategoryBtn')?.addEventListener('click', () => this.hideCategoryModal());

        // Keywords management
        document.getElementById('addKeywordBtn')?.addEventListener('click', () => this.addKeyword());
        document.getElementById('newKeywordInput')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addKeyword();
        });

        // Actions
        document.getElementById('saveChangesBtn')?.addEventListener('click', () => this.saveChanges());
        document.getElementById('testCategorizationBtn')?.addEventListener('click', () => this.toggleTestSection());
        document.getElementById('runTestBtn')?.addEventListener('click', () => this.runTest());

        // Training system
        document.getElementById('trainBtn')?.addEventListener('click', () => this.toggleTrainingSection());
        document.getElementById('correctCategorizationBtn')?.addEventListener('click', () => this.correctCategorization());
        document.getElementById('trainingTransactionText')?.addEventListener('input', () => this.analyzeForTraining());
    }

    show() {
        console.log('🏷️ Mostrando gestión de categorías');

        // Ocultar otras vistas
        document.getElementById('rulesContent')?.classList.add('hidden');
        document.getElementById('correctionsContent')?.classList.add('hidden');

        // Mostrar vista de categorías
        document.getElementById('categoriesContent')?.classList.remove('hidden');

        // Actualizar tabs activos
        document.querySelectorAll('.bank-tab').forEach(tab => {
            tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
            tab.classList.add('border-transparent', 'text-gray-500');
        });

        const categoriesTab = document.getElementById('categoriesTab');
        if (categoriesTab) {
            categoriesTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            categoriesTab.classList.remove('border-transparent', 'text-gray-500');
        }

        this.loadCategories();
    }

    loadCategories() {
        const container = document.getElementById('categoriesList');
        if (!container) return;

        const categoryEntries = Object.entries(this.categories);

        if (categoryEntries.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="text-4xl">📂</span>
                    <p class="mt-2">No hay categorías configuradas</p>
                    <button class="mt-3 text-blue-600 hover:text-blue-800 text-sm">
                        ➕ Crear primera categoría
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = categoryEntries.map(([name, category]) => {
            const isOtros = name === 'Otros';
            const keywordCount = category.keywords ? category.keywords.length : 0;

            return `
                <div class="category-item p-4 border border-gray-200 rounded-lg hover:border-blue-300 cursor-pointer transition-all
                            ${this.selectedCategory === name ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}"
                     data-category="${name}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                                 style="background-color: ${category.color}20; color: ${category.color}">
                                ${category.icon || '📁'}
                            </div>
                            <div>
                                <h5 class="font-medium text-gray-900">${name}</h5>
                                <p class="text-xs text-gray-500">${category.description || 'Sin descripción'}</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-xs text-gray-400">${keywordCount} keywords</span>
                            ${!isOtros ? `
                                <button class="edit-category-btn text-blue-600 hover:text-blue-800 text-sm" data-category="${name}">
                                    ✏️
                                </button>
                                <button class="delete-category-btn text-red-600 hover:text-red-800 text-sm" data-category="${name}">
                                    🗑️
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Agregar event listeners a las categorías
        container.querySelectorAll('.category-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('edit-category-btn') &&
                    !e.target.classList.contains('delete-category-btn')) {
                    this.selectCategory(item.dataset.category);
                }
            });
        });

        container.querySelectorAll('.edit-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editCategory(btn.dataset.category);
            });
        });

        container.querySelectorAll('.delete-category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCategory(btn.dataset.category);
            });
        });
    }

    selectCategory(categoryName) {
        this.selectedCategory = categoryName;
        this.loadCategories(); // Refrescar para mostrar selección
        this.loadKeywords();

        // Mostrar sección de agregar keywords
        document.getElementById('addKeywordSection').style.display = 'block';
        document.getElementById('selectedCategoryInfo').textContent = `Editando: ${categoryName}`;
    }

    loadKeywords() {
        const container = document.getElementById('keywordsList');
        if (!container || !this.selectedCategory) return;

        const category = this.categories[this.selectedCategory];
        const keywords = category.keywords || [];

        if (keywords.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="text-3xl">🔖</span>
                    <p class="mt-2">No hay keywords para esta categoría</p>
                    <p class="text-xs">Agrega keywords para mejorar la categorización</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="space-y-2">
                ${keywords.map(keyword => `
                    <div class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <span class="text-sm text-gray-700">${keyword}</span>
                        <button class="delete-keyword-btn text-red-600 hover:text-red-800 text-sm" data-keyword="${keyword}">
                            🗑️
                        </button>
                    </div>
                `).join('')}
            </div>
        `;

        // Event listeners para eliminar keywords
        container.querySelectorAll('.delete-keyword-btn').forEach(btn => {
            btn.addEventListener('click', () => this.removeKeyword(btn.dataset.keyword));
        });
    }

    addKeyword() {
        const input = document.getElementById('newKeywordInput');
        const keyword = input.value.trim().toLowerCase();

        if (!keyword || !this.selectedCategory) return;

        const category = this.categories[this.selectedCategory];
        if (!category.keywords) category.keywords = [];

        if (!category.keywords.includes(keyword)) {
            category.keywords.push(keyword);
            this.hasChanges = true;
            this.loadKeywords();
            input.value = '';
            this.updateSaveButton();
        }
    }

    removeKeyword(keyword) {
        if (!this.selectedCategory) return;

        const category = this.categories[this.selectedCategory];
        const index = category.keywords.indexOf(keyword);

        if (index > -1) {
            category.keywords.splice(index, 1);
            this.hasChanges = true;
            this.loadKeywords();
            this.updateSaveButton();
        }
    }

    showCategoryModal(categoryName = null) {
        const modal = document.getElementById('categoryModal');
        const title = document.getElementById('modalTitle');
        const form = document.getElementById('categoryForm');

        if (categoryName) {
            // Modo edición
            const category = this.categories[categoryName];
            title.textContent = 'Editar Categoría';
            document.getElementById('categoryName').value = categoryName;
            document.getElementById('categoryDescription').value = category.description || '';
            document.getElementById('categoryColor').value = category.color || '#3b82f6';
            document.getElementById('categoryIcon').value = category.icon || '';
            form.dataset.editing = categoryName;
        } else {
            // Modo creación
            title.textContent = 'Nueva Categoría';
            form.reset();
            delete form.dataset.editing;
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    hideCategoryModal() {
        const modal = document.getElementById('categoryModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    saveCategory(e) {
        e.preventDefault();

        const form = e.target;
        const name = document.getElementById('categoryName').value.trim();
        const description = document.getElementById('categoryDescription').value.trim();
        const color = document.getElementById('categoryColor').value;
        const icon = document.getElementById('categoryIcon').value.trim();

        if (!name) return;

        const editingCategory = form.dataset.editing;

        // Si estamos editando y el nombre cambió, mover la categoría
        if (editingCategory && editingCategory !== name) {
            const oldCategory = this.categories[editingCategory];
            delete this.categories[editingCategory];
            this.categories[name] = oldCategory;
        }

        // Actualizar o crear categoría
        if (!this.categories[name]) {
            this.categories[name] = {
                keywords: [],
                ejemplos_reales: []
            };
        }

        this.categories[name].description = description;
        this.categories[name].color = color;
        this.categories[name].icon = icon;

        this.hasChanges = true;
        this.hideCategoryModal();
        this.loadCategories();
        this.updateSaveButton();
    }

    editCategory(categoryName) {
        this.showCategoryModal(categoryName);
    }

    deleteCategory(categoryName) {
        if (categoryName === 'Otros') {
            alert('No se puede eliminar la categoría "Otros"');
            return;
        }

        if (confirm(`¿Estás seguro de eliminar la categoría "${categoryName}"?`)) {
            delete this.categories[categoryName];
            this.hasChanges = true;

            if (this.selectedCategory === categoryName) {
                this.selectedCategory = null;
                document.getElementById('addKeywordSection').style.display = 'none';
                document.getElementById('selectedCategoryInfo').textContent = 'Selecciona una categoría';
                document.getElementById('keywordsList').innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <span class="text-4xl">🔖</span>
                        <p class="mt-2">Selecciona una categoría para ver sus keywords</p>
                    </div>
                `;
            }

            this.loadCategories();
            this.updateSaveButton();
        }
    }

    updateSaveButton() {
        const saveBtn = document.getElementById('saveChangesBtn');
        if (saveBtn) {
            if (this.hasChanges) {
                saveBtn.classList.remove('bg-gray-400');
                saveBtn.classList.add('bg-green-600', 'hover:bg-green-700');
                saveBtn.textContent = '💾 Guardar Cambios';
            } else {
                saveBtn.classList.add('bg-gray-400');
                saveBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                saveBtn.textContent = '✅ Sin Cambios';
            }
        }
    }

    async saveChanges() {
        if (!this.hasChanges) return;

        try {
            // Actualizar el archivo categories.js
            const categoriesJS = this.generateCategoriesJS();

            // En un entorno real, aquí enviarías los cambios al servidor
            console.log('💾 Guardando cambios en categories.js:');
            console.log(categoriesJS);

            // Simular guardado exitoso
            this.hasChanges = false;
            this.updateSaveButton();

            // Mostrar confirmación
            alert('✅ Cambios guardados exitosamente!\\n\\nNota: En desarrollo, los cambios se muestran en la consola.');

        } catch (error) {
            console.error('Error guardando cambios:', error);
            alert('❌ Error guardando cambios. Revisa la consola.');
        }
    }

    generateCategoriesJS() {
        const lines = ['const CATEGORIAS_CON_EJEMPLOS_REALES = {'];

        Object.entries(this.categories).forEach(([name, category]) => {
            if (name === 'Otros') return; // Skip "Otros" category

            lines.push(`    '${name}': {`);
            lines.push(`        keywords: [`);

            if (category.keywords && category.keywords.length > 0) {
                const keywordLines = category.keywords.map(k => `            '${k}'`);
                lines.push(keywordLines.join(',\\n'));
            }

            lines.push(`        ],`);
            lines.push(`        ejemplos_reales: [`);

            if (category.ejemplos_reales && category.ejemplos_reales.length > 0) {
                const ejemploLines = category.ejemplos_reales.map(e => `            '${e}'`);
                lines.push(ejemploLines.join(',\\n'));
            }

            lines.push(`        ],`);
            lines.push(`        color: '${category.color || '#3b82f6'}',`);
            lines.push(`        description: '${category.description || ''}',`);
            lines.push(`        icon: '${category.icon || '📁'}'`);
            lines.push(`    },\\n`);
        });

        lines.push('};');

        return lines.join('\\n');
    }

    toggleTestSection() {
        const testSection = document.getElementById('testSection');
        const isHidden = testSection.style.display === 'none';

        testSection.style.display = isHidden ? 'block' : 'none';

        const btn = document.getElementById('testCategorizationBtn');
        btn.textContent = isHidden ? '🔽 Ocultar Pruebas' : '🧪 Probar';
    }

    runTest() {
        const input = document.getElementById('testTransactionText');
        const output = document.getElementById('testResults');
        const text = input.value.trim();

        if (!text) return;

        const lines = text.split('\\n').filter(line => line.trim());
        const results = [];

        lines.forEach(line => {
            const result = this.categoryEngine.categorizeTransaction(line.trim());
            results.push(`📄 "${line}"\\n   → ${result.category} (${result.confidence}% confianza)\\n   Razón: ${result.reason}\\n`);
        });

        output.innerHTML = `<div class="text-sm space-y-2">${results.join('\\n')}</div>`;
    }

    // ============ TRAINING SYSTEM ============

    toggleTrainingSection() {
        const trainingSection = document.getElementById('trainingSection');
        const isHidden = trainingSection.style.display === 'none';

        trainingSection.style.display = isHidden ? 'block' : 'none';

        const btn = document.getElementById('trainBtn');
        btn.textContent = isHidden ? '🔽 Ocultar Entrenamiento' : '🎓 Entrenar';

        // Cargar historial de entrenamientos al abrir
        if (isHidden) {
            this.loadTrainingHistory();
        }
    }

    analyzeForTraining() {
        const input = document.getElementById('trainingTransactionText');
        const analysisDiv = document.getElementById('trainingAnalysis');
        const correctBtn = document.getElementById('correctCategorizationBtn');
        const correctCategorySelect = document.getElementById('trainingCorrectCategory');

        const text = input.value.trim();

        if (!text) {
            analysisDiv.innerHTML = '<p class="text-gray-500 text-sm">Ingresa una descripción de transacción para analizar</p>';
            correctBtn.style.display = 'none';
            document.getElementById('correctionForm').style.display = 'none';
            return;
        }

        // Analizar con el motor actual
        const result = this.categoryEngine.categorizeTransaction(text);

        // Mostrar análisis
        analysisDiv.innerHTML = `
            <div class="bg-gray-50 p-3 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-gray-700">Análisis Actual:</span>
                    <span class="text-sm text-gray-500">${result.confidence}% confianza</span>
                </div>
                <div class="flex items-center space-x-2 mb-2">
                    <span class="inline-block w-3 h-3 rounded-full" style="background-color: ${this.getCategoryColor(result.category)}"></span>
                    <span class="font-medium">${result.category}</span>
                </div>
                <p class="text-sm text-gray-600">${result.reason}</p>
            </div>
        `;

        // Mostrar formulario de corrección
        correctBtn.style.display = 'block';
        document.getElementById('correctionForm').style.display = 'block';

        // Poblar select de categorías
        this.populateCategorySelect(correctCategorySelect, result.category);
    }

    populateCategorySelect(selectElement, currentCategory) {
        if (!selectElement) return;

        const categories = Object.keys(this.categories);
        selectElement.innerHTML = `
            <option value="">-- Seleccionar categoría correcta --</option>
            ${categories.map(cat => `
                <option value="${cat}" ${cat === currentCategory ? 'selected' : ''}>
                    ${this.categories[cat].icon || '📁'} ${cat}
                </option>
            `).join('')}
        `;
    }

    getCategoryColor(categoryName) {
        return this.categories[categoryName]?.color || '#9ca3af';
    }

    correctCategorization() {
        const transactionText = document.getElementById('trainingTransactionText').value.trim();
        const correctCategory = document.getElementById('trainingCorrectCategory').value;

        if (!transactionText || !correctCategory) {
            alert('Por favor completa todos los campos');
            return;
        }

        // Analizar la transacción actual
        const currentResult = this.categoryEngine.categorizeTransaction(transactionText);

        if (currentResult.category === correctCategory) {
            alert('La transacción ya está categorizada correctamente');
            return;
        }

        // Extraer keywords potenciales del texto
        const suggestedKeywords = this.extractPotentialKeywords(transactionText);

        // Mostrar sugerencias
        this.showKeywordSuggestions(transactionText, correctCategory, suggestedKeywords);
    }

    extractPotentialKeywords(text) {
        // Limpiar y procesar el texto
        const cleaned = text.toLowerCase()
            .replace(/compra nacional/gi, '')
            .replace(/\\d+/g, '')
            .replace(/[^\\w\\s]/g, ' ')
            .trim();

        // Dividir en palabras y filtrar
        const words = cleaned.split(/\\s+/).filter(word =>
            word.length >= 3 &&
            !['compra', 'nacional', 'pago', 'automatico'].includes(word)
        );

        // Generar combinaciones de palabras
        const keywords = [];

        // Palabras individuales significativas
        words.forEach(word => {
            if (word.length >= 4) {
                keywords.push(word);
            }
        });

        // Combinaciones de 2 palabras
        for (let i = 0; i < words.length - 1; i++) {
            const combo = `${words[i]} ${words[i + 1]}`;
            if (combo.length >= 6) {
                keywords.push(combo);
            }
        }

        // Combinaciones de 3 palabras si son cortas
        for (let i = 0; i < words.length - 2; i++) {
            const combo = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            if (combo.length <= 20) {
                keywords.push(combo);
            }
        }

        return [...new Set(keywords)]; // Eliminar duplicados
    }

    showKeywordSuggestions(transactionText, correctCategory, suggestedKeywords) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 class="text-lg font-medium mb-4">🎓 Entrenar Categorización</h3>

                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">Transacción:</p>
                    <p class="font-medium bg-gray-50 p-2 rounded text-sm">${transactionText}</p>
                </div>

                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">Categoría correcta:</p>
                    <div class="flex items-center space-x-2">
                        <span class="inline-block w-3 h-3 rounded-full" style="background-color: ${this.getCategoryColor(correctCategory)}"></span>
                        <span class="font-medium">${correctCategory}</span>
                    </div>
                </div>

                <div class="mb-4">
                    <p class="text-sm text-gray-600 mb-2">Keywords sugeridos:</p>
                    <div class="space-y-2 max-h-32 overflow-y-auto">
                        ${suggestedKeywords.map(keyword => `
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" value="${keyword}" class="keyword-checkbox">
                                <span class="text-sm">"${keyword}"</span>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="flex space-x-3">
                    <button id="applyTrainingBtn" class="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                        ✅ Aplicar
                    </button>
                    <button id="cancelTrainingBtn" class="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
                        ❌ Cancelar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners para el modal
        modal.querySelector('#applyTrainingBtn').addEventListener('click', () => {
            const selectedKeywords = Array.from(modal.querySelectorAll('.keyword-checkbox:checked'))
                .map(cb => cb.value);

            this.applyTraining(correctCategory, selectedKeywords, transactionText);
            document.body.removeChild(modal);
        });

        modal.querySelector('#cancelTrainingBtn').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Cerrar al hacer click fuera
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }

    applyTraining(categoryName, keywords, transactionText) {
        const category = this.categories[categoryName];
        if (!category) return;

        if (!category.keywords) category.keywords = [];

        // Agregar keywords únicos
        let addedCount = 0;
        keywords.forEach(keyword => {
            if (!category.keywords.includes(keyword)) {
                category.keywords.push(keyword);
                addedCount++;
            }
        });

        // Marcar cambios
        this.hasChanges = true;
        this.updateSaveButton();

        // Guardar en historial de entrenamiento
        this.saveTrainingRecord(transactionText, categoryName, keywords);

        // Mostrar confirmación
        alert(`✅ Entrenamiento aplicado!\\n\\n` +
              `• ${addedCount} nuevos keywords agregados a "${categoryName}"\\n` +
              `• Recuerda guardar los cambios cuando termines`);

        // Limpiar formulario de entrenamiento
        document.getElementById('trainingTransactionText').value = '';
        document.getElementById('trainingAnalysis').innerHTML = '<p class="text-gray-500 text-sm">Ingresa una descripción de transacción para analizar</p>';
        document.getElementById('correctCategorizationBtn').style.display = 'none';
        document.getElementById('correctionForm').style.display = 'none';

        // Actualizar vista si la categoría está seleccionada
        if (this.selectedCategory === categoryName) {
            this.loadKeywords();
        }

        // Recargar historial
        this.loadTrainingHistory();
    }

    saveTrainingRecord(transactionText, categoryName, keywords) {
        const trainingHistory = JSON.parse(localStorage.getItem('trainingHistory') || '[]');

        const record = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            transaction: transactionText,
            category: categoryName,
            keywords: keywords,
            date: new Date().toLocaleDateString('es-CL')
        };

        trainingHistory.unshift(record); // Agregar al inicio

        // Mantener solo los últimos 50 entrenamientos
        if (trainingHistory.length > 50) {
            trainingHistory.splice(50);
        }

        localStorage.setItem('trainingHistory', JSON.stringify(trainingHistory));
    }

    loadTrainingHistory() {
        const historyContainer = document.getElementById('trainingHistory');
        if (!historyContainer) return;

        const trainingHistory = JSON.parse(localStorage.getItem('trainingHistory') || '[]');

        if (trainingHistory.length === 0) {
            historyContainer.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <span class="text-3xl">📚</span>
                    <p class="mt-2">No hay entrenamientos registrados</p>
                    <p class="text-xs">Los entrenamientos aparecerán aquí conforme los realices</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = `
            <div class="space-y-3">
                ${trainingHistory.map(record => `
                    <div class="bg-gray-50 p-3 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs text-gray-500">${record.date}</span>
                            <div class="flex items-center space-x-2">
                                <span class="inline-block w-2 h-2 rounded-full" style="background-color: ${this.getCategoryColor(record.category)}"></span>
                                <span class="text-sm font-medium">${record.category}</span>
                            </div>
                        </div>
                        <p class="text-sm text-gray-700 mb-2">"${record.transaction}"</p>
                        <div class="text-xs text-gray-500">
                            Keywords: ${record.keywords.join(', ')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

// Inicializar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('admin.html')) {
        window.categoryManager = new CategoryManager();
    }
});