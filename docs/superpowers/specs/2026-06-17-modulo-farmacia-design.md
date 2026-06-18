# Módulo de Farmacia Dermatológica - Especificación de Diseño

**Fecha:** 2026-06-17  
**Proyecto:** Elys (Gioval Medicina Estética)  
**Tipo:** Nuevo módulo integrado  
**Estado:** Diseño aprobado

## 1. Visión General

Crear un módulo independiente de farmacia dermatológica especializada que funcione en el mismo edificio que Gioval, con:
- Inventario administrado por 1 empleado dedicado
- Punto de venta (POS) para ventas retail y a pacientes de la clínica
- Visibilidad en dashboard de Giovanna (dueña)

**Principio arquitectónico:** Módulo modular integrado (comparte backend/BD, frontend separado)

---

## 2. Requisitos Funcionales

### 2.1 Usuario: Empleado de Farmacia

**Acceso:** Solo módulo farmacia

**Funcionalidades:**
- Crear/actualizar productos (nombre, código, precio, stock)
- Gestionar inventario (ver stock, alertas de bajo stock)
- Punto de venta: buscar producto → agregar cantidad → procesar pago
- Abrir/cerrar caja (turno diario)
- Ver historial de ventas del turno

**Métodos de pago:**
- Efectivo
- Terminal (tarjeta débito/crédito)
- Transferencia bancaria (manual, registrar después)

### 2.2 Usuario: Giovanna (Admin/Dueña)

**Acceso:** Dashboard principal de Elys + módulo farmacia

**Visibilidad en dashboard:**
- Widget "Farmacia": resumen de ventas (hoy/semana/mes)
- Productos más vendidos
- Alertas: productos con stock bajo
- Ganancias netas (venta - costo)
- Link a "Ver detalles completos"

**Acceso completo a farmacia:**
- Todos los reportes del empleado
- Gestión de proveedores
- Análisis de ganancias y márgenes
- Historial completo de ventas

### 2.3 Tipos de Venta

**Venta retail:** Cliente sin cuenta, solo registro básico (teléfono opcional)

**Venta a paciente:** Paciente registrado en Elys, registro opcional en sistema de farmacia

---

## 3. Modelo de Datos

### Nuevas tablas

#### `farmacia_productos`
```sql
id (PK)
nombre VARCHAR(255) NOT NULL
codigo_proveedor VARCHAR(100) NOT NULL
categoria VARCHAR(100)
precio_costo DECIMAL(10,2) NOT NULL
precio_venta DECIMAL(10,2) NOT NULL
stock INT DEFAULT 0
stock_minimo INT DEFAULT 5
proveedor_id FK(farmacia_proveedores)
activo BOOLEAN DEFAULT true
creado_en TIMESTAMP
actualizado_en TIMESTAMP
```

#### `farmacia_proveedores`
```sql
id (PK)
nombre VARCHAR(255) NOT NULL
email VARCHAR(255)
telefono VARCHAR(20)
contacto VARCHAR(255)
activo BOOLEAN DEFAULT true
creado_en TIMESTAMP
```

#### `farmacia_ventas`
```sql
id (PK)
numero_venta INT AUTO_INCREMENT
fecha DATETIME NOT NULL
subtotal DECIMAL(10,2)
descuento DECIMAL(10,2) DEFAULT 0
total DECIMAL(10,2) NOT NULL
metodo_pago ENUM('efectivo', 'terminal', 'transferencia')
empleado_id FK(usuarios)
cliente_id FK(farmacia_clientes) NULLABLE
paciente_id FK(pacientes) NULLABLE
estado ENUM('abierta', 'pagada', 'cancelada') DEFAULT 'abierta'
observaciones TEXT
creado_en TIMESTAMP
```

#### `farmacia_items_venta`
```sql
id (PK)
venta_id FK(farmacia_ventas)
producto_id FK(farmacia_productos)
cantidad INT NOT NULL
precio_unitario DECIMAL(10,2)
subtotal DECIMAL(10,2)
creado_en TIMESTAMP
```

#### `farmacia_clientes`
```sql
id (PK)
nombre VARCHAR(255)
telefono VARCHAR(20)
email VARCHAR(255)
paciente_id FK(pacientes) NULLABLE
creado_en TIMESTAMP
ultima_compra TIMESTAMP
```

#### `farmacia_caja`
```sql
id (PK)
empleado_id FK(usuarios)
fecha_apertura DATETIME NOT NULL
fecha_cierre DATETIME NULLABLE
efectivo_inicial DECIMAL(10,2)
efectivo_final DECIMAL(10,2)
diferencia DECIMAL(10,2)
estado ENUM('abierta', 'cerrada')
creado_en TIMESTAMP
```

### Tablas reutilizadas

- `usuarios` (agregar rol `FARMACISTA`)
- `pacientes` (opcional para ventas internas)

---

## 4. Arquitectura Backend

### Rutas API

```
/api/farmacia/

# Productos
GET    /productos                    - Listar productos (filtro: nombre, stock bajo)
POST   /productos                    - Crear producto
PUT    /productos/:id                - Actualizar producto
DELETE /productos/:id                - Desactivar producto
GET    /productos/:id                - Obtener detalle

# Proveedores
GET    /proveedores                  - Listar proveedores
POST   /proveedores                  - Crear proveedor
PUT    /proveedores/:id              - Actualizar
DELETE /proveedores/:id              - Desactivar

# Ventas
GET    /ventas                       - Listar ventas (filtro: fecha, empleado, estado)
POST   /ventas                       - Crear venta nueva (retorna venta_id)
GET    /ventas/:id                   - Obtener venta con items
POST   /ventas/:id/items             - Agregar item a venta abierta
DELETE /ventas/:id/items/:item_id    - Remover item
PUT    /ventas/:id/items/:item_id    - Actualizar cantidad
POST   /ventas/:id/pagar             - Procesar pago y cerrar venta
POST   /ventas/:id/cancelar          - Cancelar venta

# Caja
GET    /caja/turno-actual            - Obtener caja abierta del empleado
POST   /caja/abrir                   - Abrir caja (efectivo inicial)
PUT    /caja/:id/cerrar              - Cerrar caja (efectivo final)
GET    /caja/historial               - Historial de cajas

# Reportes (Admin/Giovanna)
GET    /reportes/resumen             - Resumen ventas (rango fechas)
GET    /reportes/stock-bajo          - Productos con bajo stock
GET    /reportes/ganancias           - Ganancias netas (periodo)
GET    /reportes/top-productos       - Productos más vendidos
GET    /reportes/por-empleado        - Ventas por empleado
```

### Estructura de carpetas

```
backend/src/
├── models/
│   ├── farmaciaProducto.js
│   ├── farmaciaVenta.js
│   ├── farmaciaProveedor.js
│   ├── farmaciaCaja.js
│   └── farmaciaCliente.js
├── controllers/
│   ├── farmaciaProductos.js
│   ├── farmaciaVentas.js
│   ├── farmaciaCaja.js
│   ├── farmaciaProveedores.js
│   └── farmaciaReportes.js
├── routes/
│   └── farmacia.js
├── middleware/
│   └── authFarmacia.js (verificar rol FARMACISTA)
└── services/
    └── farmaciaService.js (lógica de descuento de stock, cálculos)
```

### Permisos y Autenticación

**Middleware `authFarmacia`:** Verifica `req.user.rol === 'FARMACISTA'` en rutas de módulo farmacia

**Rutas públicas (no requieren rol específico):**
- Ninguna (todo requiere autenticación)

**Rutas solo FARMACISTA:**
- GET/POST/PUT productos
- POST ventas, items, caja abierta
- GET ventas del turno, caja actual

**Rutas solo ADMIN:**
- DELETE productos
- Todos los /reportes/
- Gestión de proveedores
- Cierre de cajas

---

## 5. Arquitectura Frontend

### Estructura de módulo

```
frontend/src/
├── views/
│   └── farmacia/
│       ├── FarmaciaPOS.vue          - Interface principal de venta
│       ├── FarmaciaInventario.vue   - Gestión de productos
│       ├── FarmaciaCaja.vue         - Abrir/cerrar turno
│       ├── FarmaciaHistorial.vue    - Historial de ventas
│       ├── FarmaciaProveedores.vue  - Gestión de proveedores (admin)
│       └── FarmaciaReportes.vue     - Reportes y análisis
├── components/
│   └── farmacia/
│       ├── BuscadorProductos.vue
│       ├── CarritoVenta.vue
│       ├── FormaPagoModal.vue
│       └── AlertaStockBajo.vue
├── stores/
│   └── farmaciaPOS.js               - Estado de venta en progreso
└── routes/
    └── farmacia-routes.js
```

### Rutas en frontend

```
/farmacia                    - Dashboard/Home farmacia
/farmacia/pos                - Point of Sale
/farmacia/inventario         - Gestión de stock
/farmacia/proveedores        - Gestión de proveedores (admin)
/farmacia/ventas             - Historial de ventas
/farmacia/reportes           - Reportes y análisis
/farmacia/caja               - Abrir/cerrar turno
```

### Flujo de POS (Empleado)

1. Abre sesión → accede a `/farmacia/pos`
2. Sistema verifica caja abierta (si no, redirige a abrir caja)
3. Busca producto por nombre/código
4. Agrega cantidad al carrito
5. Repite hasta terminar venta
6. Selecciona método de pago
7. Confirma → sistema procesa pago y limpia carrito
8. Muestra recibo/comprobante

### Widget en Dashboard Principal (Giovanna)

Ubicación: Panel dashboard existente de Gioval

**Contenido:**
```
┌─ FARMACIA ──────────────────────┐
│ Hoy: $1,250.00                  │
│ Semana: $8,750.00               │
│ Mes: $35,000.00                 │
│                                 │
│ ⚠ 3 productos con bajo stock    │
│ Top: Retinol 0.5% x5            │
│                                 │
│ [Ver detalles completos] →       │
└─────────────────────────────────┘
```

---

## 6. Flujo de Datos

### Venta Completa

```
Empleado abre POS
  ↓
Busca producto (GET /productos?nombre=...)
  ↓
Agrega cantidad (POST /ventas → crea venta en estado "abierta")
  ↓
Agrega items (POST /ventas/:id/items)
  ↓
Selecciona forma de pago
  ↓
Confirma venta (POST /ventas/:id/pagar)
  ↓
Sistema:
  - Valida stock disponible
  - Descuenta stock (UPDATE farmacia_productos.stock)
  - Cierra venta (UPDATE farmacia_ventas.estado = 'pagada')
  - Actualiza caja
  - Retorna recibo
  ↓
Genera recibo (PDF o print)
```

### Reporte para Giovanna

```
Dashboard de Giovanna (admin)
  ↓
Carga widget farmacia (GET /reportes/resumen?periodo=hoy)
  ↓
Backend calcula:
  - SUM(total) de ventas
  - SUM(cantidad*precio_costo) para costo
  - Ganancia = total - costo
  - Productos con stock < stock_minimo
  - Top productos por cantidad vendida
  ↓
Frontend renderiza widget
```

---

## 7. Validaciones y Reglas de Negocio

**Venta:**
- No se puede agregar cantidad mayor a stock disponible
- Precio de venta ≥ precio de costo (validar al crear producto)
- Venta abierta solo por 1 empleado a la vez (no se puede reabrir)
- Caja debe estar abierta para vender

**Stock:**
- Descuento ocurre solo al pagar (no al agregar a carrito)
- Alerta cuando stock < stock_minimo
- No se puede vender si stock = 0

**Métodos de pago:**
- Transferencia: registro manual, marcar como "pendiente confirmación"
- Efectivo/Terminal: inmediato

**Caja:**
- Un empleado solo puede tener 1 caja abierta
- Debe cerrar antes de abrir nueva
- Diferencia = efectivo_final - efectivo_inicial

---

## 8. Consideraciones de Integración

**Con módulo de Pacientes:**
- Venta a paciente es opcional (no duplica datos)
- Campo `paciente_id` solo para rastreo

**Con módulo de Finanzas:**
- Ganancias de farmacia se registran en finanzas (aparte)
- Reportes de farmacia independientes

**Con Dashboard de Giovanna:**
- Widget no afecta rendimiento (consulta cacheable)
- Actualización cada 5 minutos o manual

---

## 9. Scope Out (No incluir)

- Integración con recetas (solo registro manual)
- Compra automática a proveedores
- Multi-sucursal (solo una farmacia por ahora)
- Reportes PDF generados (usar frontend print)

---

## 10. Próximos Pasos

1. ✅ Diseño aprobado
2. → Plan de implementación (backend → frontend → testing)
3. → Desarrollo
4. → Testing
5. → Deploy en Hetzner
