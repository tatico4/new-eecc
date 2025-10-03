# 📋 Guía para Mejorar la Categorización de Transacciones

## 🎯 **¿Cómo funciona el sistema actual?**

El sistema de categorización usa **tres métodos en orden de prioridad**:

### 1. **Patrones Personalizados** (Mayor prioridad)
- Patrones aprendidos por el usuario
- Se almacenan en `customPatterns`
- Confianza >= 60% para aplicarse automáticamente

### 2. **Keywords por Categoría** (Prioridad media)
- Definidas en `src/categorization/categories.js`
- Busca coincidencias en la descripción de la transacción
- Calcula score de confianza basado en coincidencias

### 3. **Categoría "Otros"** (Por defecto)
- Cuando no hay coincidencias suficientes
- Confianza < 60%

---

## 🔧 **Cómo mejorar las categorías**

### **Método 1: Agregar Keywords a Categorías Existentes**

**Archivo:** `src/categorization/categories.js`

```javascript
'Compras': {
    keywords: [
        'falabella', 'sodimac', 'zara',
        // ⭐ AGREGAR NUEVAS MARCAS AQUÍ
        'nueva_marca', 'otro_retail', 'tienda_nueva'
    ],
    // ...
}
```

### **Método 2: Crear Nueva Categoría**

```javascript
'Nueva Categoría': {
    keywords: [
        'palabra1', 'palabra2', 'marca_especifica'
    ],
    ejemplos_reales: [
        'Ejemplo 1', 'Ejemplo 2'
    ],
    color: '#hexcolor',
    description: 'Descripción de la categoría',
    icon: '🎯'
},
```

---

## 📊 **Categorías Mejoradas para Cuenta Corriente**

### ✅ **Ya Mejoradas:**

1. **Compras** - Agregadas: `casa ideas`, `starken`, `merpago`, `h&m`, `zara`
2. **Salud y Médicos** - Agregadas: `cruzverde`, `cv`, `golden cross`
3. **Transporte** - Agregadas: `parking alto las conde`
4. **Bancarios y Finanzas** - Agregadas: `traspaso internet`, `fondo mutuo`, `pac seg fraude`
5. **Transferencias** - NUEVA categoría para `transf a/de`
6. **Entretenimiento** - Agregadas: `liga ch`, `deportes`

---

## 🚀 **Próximos pasos para mejorar**

### **1. Analizar transacciones no categorizadas**

```javascript
// En la consola del navegador:
const uncategorized = transactions.filter(t => t.category === 'Otros');
console.log(uncategorized.map(t => t.description));
```

### **2. Identificar patrones comunes**

- **Marcas frecuentes** que aparecen como "Otros"
- **Palabras clave** que se repiten
- **Prefijos/sufijos** comunes (ej: "Compra Nacional")

### **3. Agregar keywords específicos**

**Ejemplos de mejoras pendientes:**
```javascript
// Para MOVISTAR (telecomunicaciones)
'Servicios Básicos': {
    keywords: [...existing, 'movistar', 'telefonia']
}

// Para SCOTIABANK (servicios financieros)
'Bancarios y Finanzas': {
    keywords: [...existing, 'scotiabank', 'cae']
}
```

---

## 🎯 **Sistema de Entrenamiento Inteligente**

### **¿Cómo entrenar el sistema?**

1. **Categorización Manual:**
   - Usuario corrige categorías incorrectas
   - Sistema aprende patrones personalizados
   - Se almacenan en `customPatterns`

2. **Aprendizaje Adaptativo:**
   - Algoritmo detecta patrones recurrentes
   - Mejora automáticamente la confianza
   - Prioriza patrones del usuario

### **Implementar entrenamiento:**

```javascript
// En CategoryEngine.js
learnFromCorrection(description, correctCategory) {
    const pattern = this.extractPattern(description);
    this.customPatterns.set(pattern, {
        category: correctCategory,
        confidence: 90,
        source: 'user_correction'
    });
}
```

---

## 📈 **Métricas para monitorear**

### **KPIs importantes:**
- **% de transacciones en "Otros"** (objetivo: <20%)
- **Tasa de correcciones manuales** (objetivo: <10%)
- **Confianza promedio** (objetivo: >70%)

### **Debug y análisis:**
```javascript
// Estadísticas de categorización
const stats = {
    total: transactions.length,
    categorized: transactions.filter(t => t.category !== 'Otros').length,
    avgConfidence: transactions.reduce((sum, t) => sum + t.confidence, 0) / transactions.length
};
```

---

## 🔄 **Flujo de mejora continua**

1. **📊 Analizar** → Identificar transacciones en "Otros"
2. **🔍 Investigar** → Buscar patrones comunes
3. **➕ Agregar** → Nuevas keywords o categorías
4. **🧪 Probar** → Usar `debug-categorization.html`
5. **📈 Medir** → Verificar mejora en tasas
6. **🔄 Repetir** → Ciclo continuo

---

## ⚡ **Herramientas disponibles**

- **`debug-categorization.html`** - Prueba categorización en tiempo real
- **`categories.js`** - Definición de todas las categorías
- **`CategoryEngine.js`** - Motor de categorización
- **Consola del navegador** - Para análisis de datos

---

## 💡 **Tips prácticos**

1. **Usa variaciones:** `'movistar'`, `'moví'`, `'mov'`
2. **Incluye acrónimos:** `'cv'` para CruzVerde
3. **Considera ubicaciones:** `'egana'`, `'nunoa'`, `'las condes'`
4. **Busca patrones:** `'compra nacional'` siempre es compra
5. **Prioriza frecuencia:** Mejora primero las marcas más comunes

**¿Necesitas agregar una nueva categoría o mejorar keywords? ¡Solo edita `categories.js` y recarga la página!**