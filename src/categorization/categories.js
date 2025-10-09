/**
 * Definición de categorías para análisis financiero
 * Basado en ejemplos reales del estado de cuenta Banco Falabella
 */

const CATEGORIAS_CON_EJEMPLOS_REALES = {
    'Comida y Restaurantes': {
        keywords: [
            'uber eats', 'jumbo', 'rappi', 'lider', 'hip lider', 'miyaco',
            'cafe caribe', 'la burguesia', 'dominos', 'pizza', 'restaurant',
            'comida', 'almuerzo', 'cena', 'desayuno', 'delivery', 'food',
            'mc donald', 'burger king', 'kfc', 'subway', 'fork'
        ],
        ejemplos_reales: [
            'Uber eats', 'Hip lider vespucio sur', 'Jumbo oneclick', 'Rappi',
            'Dominos pizza', 'Cafe caribe', 'La burguesia'
        ],
        color: '#ef4444',
        description: 'Gastos en comida, restaurantes y delivery',
        icon: '🍽️'
    },

    'Transporte': {
        keywords: [
            'shell', 'petrobras', 'servicentro', 'copec', 'combustible', 'gasolina',
            'enex', 'esso', 'terpel', 'taxi', 'uber', 'cabify', 'metro',
            'transantiago', 'bip', 'peaje', 'autopista', 'estacionamiento',
            'parking', 'garage',
            // Específicos de cuenta corriente
            'parking alto las conde', 'alto las condes'
        ],
        ejemplos_reales: [
            'Shell.irarrazabal.f580', 'Servicentro ecco', 'Petrobras stand alone',
            'Copec', 'Enex', 'Parking Alto Las Conde'
        ],
        color: '#3b82f6',
        description: 'Combustible, transporte público y servicios de movilidad',
        icon: '🚗'
    },

    'Salud y Médicos': {
        keywords: [
            'colmena', 'salcobrand', 'farmacia', 'cruz verde', 'clinica', 'meds',
            'alemana', 'las condes', 'uc', 'hospital', 'consulta', 'medico',
            'doctor', 'dentista', 'odontologo', 'laboratorio', 'examenes',
            'medicamentos', 'remedios', 'pastillas', 'isapre', 'fonasa',
            // Específicos de cuenta corriente
            'cruzverde', 'cv', 'golden cross', 'pago proveedor colmena',
            // Organizaciones de salud
            'liga ch', 'contra la e', 'liga chilena'
        ],
        ejemplos_reales: [
            'Colmena golden cross', 'Salcobrand estado 56', 'Clinica meds la dehesa',
            'Dr. clinica alemana', 'Cruz verde', 'Farmacia',
            'Cruzverde CV 9061', 'Pago Proveedor Colmena Gol'
        ],
        color: '#10b981',
        description: 'Gastos médicos, farmacias y salud',
        icon: '🏥'
    },

    'Entretenimiento': {
        keywords: [
            'netflix', 'spotify', 'apple.com', 'microsoft', 'streaming', 'disney',
            'amazon prime', 'hbo', 'paramount', 'cine', 'cinema', 'teatro',
            'concierto', 'museo', 'parque', 'juegos', 'steam', 'playstation',
            'xbox', 'nintendo', 'app store', 'google play',
            // Deportes y actividades específicos de cuenta corriente
            'liga', 'deporte', 'futbol', 'club', 'gym', 'gimnasio',
            'campeonato', 'torneo'
        ],
        ejemplos_reales: [
            'Apple.com/bi', 'Microsoft cl microsoft', 'Netflix', 'Spotify',
            'Steam games', 'Playstation store', 'Liga CH Contra La E LA'
        ],
        color: '#a855f7',
        description: 'Streaming, juegos, cine, deportes y entretenimiento',
        icon: '🎬'
    },

    'Servicios Básicos': {
        keywords: [
            'vtr', 'aguas andinas', 'entel', 'movistar', 'agua', 'gas', 'internet',
            'telefono', 'celular', 'luz', 'electricidad', 'enel', 'cge', 'metrogas',
            'lipigas', 'cable', 'tv', 'television', 'claro', 'wom', 'virgin'
        ],
        ejemplos_reales: [
            'Vtr pago express', 'Aguas andinas', 'Enel distribucion',
            'Metrogas', 'Entel', 'Movistar'
        ],
        color: '#6b7280',
        description: 'Servicios básicos como agua, luz, gas, internet y telefonía',
        icon: '🏠'
    },

    'Compras': {
        keywords: [
            'falabella', 'sodimac', 'zara', 'mall', 'plaza', 'comercial', 'tienda',
            'paris', 'ripley', 'hites', 'la polar', 'easy', 'homecenter',
            'linio', 'mercadolibre', 'aliexpress', 'amazon', 'h&m', 'nike',
            'adidas', 'retail', 'shopping', 'compra',
            // Marcas específicas de cuenta corriente
            'casa ideas', 'starken', 'merpago', 'josekid', 'covita', 'boulevard',
            'apumanque', 'egana', 'nunoa', 'vespucio', 'las condes', 'mall plaza'
        ],
        ejemplos_reales: [
            'Compra falabella plaza vespucio', 'Compra sodimac hc nunoa la rein',
            'Zara mall plaza egana', 'Paris', 'Ripley', 'Easy homecenter',
            'Casa Ideas Plaza Egana', 'H&M Mall Plaza Egana', 'Boulevard Plaza Nunoa',
            'Sodimac Nunoa Ugarte', 'Covita Egana SPA'
        ],
        color: '#ec4899',
        description: 'Compras en tiendas retail, mall y comercio',
        icon: '🛍️'
    },

    'Bancarios y Finanzas': {
        keywords: [
            'pago automatico', 'seguro', 'seg auto', 'seg cesantia', 'seg desgravamen',
            'notaria', 'banco', 'credito', 'prestamo', 'comision', 'interes',
            'mantencion', 'cuota', 'dividendo', 'hipotecario', 'automotriz',
            'seguros', 'vida', 'hogar', 'responsabilidad',
            // Seguros específicos
            'seguro cesantia', 'seguro desgravamen', 'desgravamen', 'cesantia',
            // Específicos de cuenta corriente
            'traspaso internet', 'fondo mutuo', 'sistematico', 'pai',
            'intereses linea', 'impuesto sobregiro', 'uso lca', 'pac seg fraude',
            'seg fraude', 'egreso compra divisas', 'compra divisas'
        ],
        ejemplos_reales: [
            'Pago automatico seg auto subaru', '09-12 seg cesantia 75489',
            'Notaria leiva', 'Seg desgravamen', 'Comision banco',
            'Traspaso Internet a T. Crédito', 'Fondo Mutuo Stgo.Sistemático',
            'Intereses Línea de Crédito', 'PAC Seg. Fraude', 'Egreso por Compra de Divisas'
        ],
        color: '#06b6d4',
        description: 'Seguros, créditos, comisiones bancarias y servicios financieros',
        icon: '🏦'
    },

    'Transferencias': {
        keywords: [
            'transf a', 'transf de', 'transf.', 'transf ', 'transf', 'transferencia', 'khipu', 'clbs',
            'trading company', 'gastronomia', 'kaudat spa', 'transferencia bancaria',
            'transferencia electronica'
        ],
        ejemplos_reales: [
            'Transf a Angeles Hernandez', 'Transf de TRADING COMPANY WM',
            'Transf a GASTRONOMIA KARINA', 'Transf a KAUDAT SPA'
        ],
        color: '#f59e0b',
        description: 'Transferencias a terceros y entre cuentas',
        icon: '💸'
    },

    'Ingresos': {
        keywords: [
            'anulacion', 'pago tarjeta cmr', 'abono', 'transferencia recibida',
            'devolucion', 'reembolso', 'sueldo', 'salario', 'honorarios',
            'deposito', 'ingreso', 'credito', 'reversa', 'ajuste',
            // Solo transferencias recibidas (ingresos)
            'transf de'
        ],
        ejemplos_reales: [
            'Anulacion pago automatico abono', 'Anulacion pago tarjeta cmr abon',
            'Transferencia recibida', 'Devolucion compra', 'Transf de TRADING COMPANY WM'
        ],
        color: '#22c55e',
        description: 'Ingresos, devoluciones, anulaciones y abonos positivos',
        icon: '💰'
    }
};

// Categoría por defecto para transacciones no reconocidas
const CATEGORIA_OTROS = {
    name: 'Otros',
    keywords: [],
    ejemplos_reales: [],
    color: '#9ca3af',
    description: 'Transacciones que no se ajustan a ninguna categoría específica',
    icon: '❓'
};

// Función helper para obtener todas las categorías incluyendo "Otros"
function getAllCategories() {
    const categories = { ...CATEGORIAS_CON_EJEMPLOS_REALES };
    categories['Otros'] = CATEGORIA_OTROS;
    return categories;
}

// Función helper para obtener lista de nombres de categorías
function getCategoryNames() {
    return Object.keys(getAllCategories());
}

// Función helper para obtener colores por categoría
function getCategoryColors() {
    const categories = getAllCategories();
    const colors = {};

    for (const [name, config] of Object.entries(categories)) {
        colors[name] = config.color;
    }

    return colors;
}

// Función helper para validar categoría
function isValidCategory(categoryName) {
    return getCategoryNames().includes(categoryName);
}

// Export para uso global
if (typeof window !== 'undefined') {
    window.CATEGORIAS_CON_EJEMPLOS_REALES = CATEGORIAS_CON_EJEMPLOS_REALES;
    window.CATEGORIA_OTROS = CATEGORIA_OTROS;
    window.getAllCategories = getAllCategories;
    window.getCategoryNames = getCategoryNames;
    window.getCategoryColors = getCategoryColors;
    window.isValidCategory = isValidCategory;
}