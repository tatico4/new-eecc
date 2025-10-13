# 📋 Plan de Migración Completo: localStorage → Supabase

## 🔍 Análisis de Datos Actuales en localStorage

### ✅ YA MIGRADO
1. **RulesManager**
   - `parserConfig_default` → Tablas `filtering_rules` y `description_corrections`
   - Reglas de filtrado de líneas PDF
   - Correcciones de descripciones

### ❌ PENDIENTE DE MIGRACIÓN

#### 1. **CategoryEngine - Patrones de Categorización Personalizados**
**localStorage keys:**
- `categoryEngine_customPatterns`: Patrones personalizados para categorizar transacciones
- `adminCategories_dynamicKeywords`: Keywords dinámicas agregadas por categoría

**Datos que contiene:**
```javascript
{
  "patrón de búsqueda": {
    category: "nombre_categoria",
    confidence: 0.95,
    source: "admin",
    addedDate: "2024-01-01T00:00:00.000Z"
  }
}
```

**Tabla Supabase necesaria:** `custom_categorization_patterns`

---

#### 2. **Tooltips/Explicaciones Personalizadas**
**localStorage key:**
- `financeAnalyzer_customExplanations`: Explicaciones personalizadas para códigos de transacciones
- `financeAnalyzer_tooltipExceptions`: Excepciones de tooltips (transacciones que no deben mostrar tooltip)

**Datos que contiene:**
```javascript
{
  "CODIGO_TRANSACCION": {
    title: "Título del tooltip",
    explanation: "Explicación detallada",
    category: "categoria",
    examples: ["ejemplo1", "ejemplo2"],
    created: "2024-01-01"
  }
}
```

**Tabla Supabase necesaria:** `transaction_tooltips`

---

#### 3. **Training History - Historial de Entrenamiento**
**localStorage key:**
- `trainingHistory`: Historial de sesiones de entrenamiento del CategoryManager

**Datos que contiene:**
```javascript
[
  {
    sessionId: "uuid",
    date: "2024-01-01T00:00:00.000Z",
    transactionsProcessed: 150,
    correctionsApplied: 45,
    accuracy: 0.89
  }
]
```

**Tabla Supabase necesaria:** `training_sessions`

---

### 🚫 NO MIGRAR (Datos Temporales/Sesión)

#### 4. **Transacciones del Usuario (Cliente)**
- `financeAnalyzer_transactions`: Transacciones del análisis actual
- `financeAnalyzer_lastUpdate`: Timestamp de última actualización
- **Razón:** Son datos temporales de la sesión del usuario, no configuración

#### 5. **Autenticación Admin**
- `admin_session_token`: Token de sesión temporal
- `admin_user`: Datos de usuario en sesión
- **Razón:** Son datos de sesión, manejados por Supabase Auth

---

## 📊 Tablas a Crear en Supabase

### 1. `custom_categorization_patterns`
```sql
CREATE TABLE IF NOT EXISTS custom_categorization_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Patrón
  pattern TEXT NOT NULL UNIQUE,
  category_code VARCHAR(50) NOT NULL REFERENCES categories(code) ON DELETE CASCADE,

  -- Configuración
  confidence DECIMAL(3,2) DEFAULT 0.95,
  case_sensitive BOOLEAN DEFAULT false,

  -- Metadatos
  source VARCHAR(50) DEFAULT 'admin',
  description TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_patterns_category ON custom_categorization_patterns(category_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_patterns_pattern ON custom_categorization_patterns(pattern) WHERE is_active = true;
```

### 2. `transaction_tooltips`
```sql
CREATE TABLE IF NOT EXISTS transaction_tooltips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identificador de transacción
  transaction_code TEXT NOT NULL UNIQUE,

  -- Contenido del tooltip
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  category_code VARCHAR(50) REFERENCES categories(code),
  examples TEXT[], -- Array de ejemplos

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tooltips_code ON transaction_tooltips(transaction_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tooltips_category ON transaction_tooltips(category_code) WHERE is_active = true;
```

### 3. `tooltip_exceptions`
```sql
CREATE TABLE IF NOT EXISTS tooltip_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Patrón de excepción
  pattern TEXT NOT NULL UNIQUE,
  reason TEXT,

  -- Control
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tooltip_exceptions_pattern ON tooltip_exceptions(pattern) WHERE is_active = true;
```

### 4. `training_sessions`
```sql
CREATE TABLE IF NOT EXISTS training_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Datos de la sesión
  session_date TIMESTAMP WITH TIME ZONE NOT NULL,
  transactions_processed INTEGER DEFAULT 0,
  corrections_applied INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),

  -- Metadatos
  notes TEXT,
  created_by VARCHAR(100) DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date DESC);
```

---

## 🔧 Modificaciones de Código Necesarias

### 1. **CategoryEngine.js**
**Métodos a modificar:**
- `loadCustomPatterns()` → Cargar desde Supabase
- `saveCustomPatterns()` → Guardar en Supabase
- `addCustomPattern()` → Insert en Supabase
- `removeCustomPattern()` → Delete en Supabase

### 2. **AdminApp.js**
**Métodos a modificar:**
- `loadTooltips()` → Cargar desde Supabase
- `saveTooltip()` → Insert/Update en Supabase
- `deleteTooltip()` → Delete en Supabase
- `loadTooltipExceptions()` → Cargar desde Supabase
- `saveTooltipException()` → Insert en Supabase

### 3. **CategoryManager.js**
**Métodos a modificar:**
- `saveTrainingSession()` → Insert en Supabase
- `getTrainingHistory()` → Query desde Supabase

---

## 📝 Scripts de Migración Necesarios

### 1. `migrate-categorization-patterns.html`
- Leer `categoryEngine_customPatterns` y `adminCategories_dynamicKeywords`
- Insertar en tabla `custom_categorization_patterns`

### 2. `migrate-tooltips.html`
- Leer `financeAnalyzer_customExplanations` y `financeAnalyzer_tooltipExceptions`
- Insertar en tablas `transaction_tooltips` y `tooltip_exceptions`

### 3. `migrate-training-history.html`
- Leer `trainingHistory`
- Insertar en tabla `training_sessions`

### 4. `migrate-all.html` (Unificado)
- Script que ejecuta todas las migraciones anteriores en orden
- Con rollback automático si algo falla

---

## 🚀 Orden de Ejecución

### Fase 1: Preparación
1. ✅ Backup completo de localStorage actual
2. ✅ Crear tablas en Supabase (ejecutar SQL)
3. ✅ Verificar que las tablas se crearon correctamente

### Fase 2: Migración
1. ✅ Ejecutar migración de patrones de categorización
2. ✅ Ejecutar migración de tooltips
3. ✅ Ejecutar migración de training history
4. ✅ Verificar que todos los datos se migraron

### Fase 3: Modificación de Código
1. ⏳ Modificar CategoryEngine para usar Supabase
2. ⏳ Modificar AdminApp para usar Supabase
3. ⏳ Modificar CategoryManager para usar Supabase

### Fase 4: Testing
1. ⏳ Probar en local que todo funciona
2. ⏳ Hacer commit y push
3. ⏳ Probar en producción

### Fase 5: Limpieza
1. ⏳ Verificar que todo funciona correctamente
2. ⏳ (Opcional) Limpiar localStorage antiguo

---

## 📊 Resumen de Impacto

| Componente | Estado Actual | Después de Migración | Prioridad |
|------------|---------------|----------------------|-----------|
| RulesManager | ✅ Supabase | ✅ Supabase | Alta |
| CategoryEngine | ❌ localStorage | ✅ Supabase | Alta |
| Tooltips | ❌ localStorage | ✅ Supabase | Media |
| Training History | ❌ localStorage | ✅ Supabase | Baja |

---

## ⚠️ Consideraciones Importantes

1. **Backup**: Antes de cualquier migración, exportar todo localStorage
2. **Rollback**: Mantener funcionalidad de fallback a localStorage durante período de transición
3. **Performance**: Las reglas de categorización se usan en cada análisis, optimizar queries
4. **Cache**: Implementar cache local de reglas de Supabase para mejor performance
5. **Sincronización**: Definir estrategia para refrescar cache cuando haya cambios

---

## 🎯 Siguiente Paso Inmediato

¿Quieres que proceda con la implementación completa siguiendo este plan?

**Opciones:**
A) Implementar TODO ahora (patrones + tooltips + training)
B) Solo patrones de categorización (lo más crítico)
C) Revisar/ajustar el plan primero
