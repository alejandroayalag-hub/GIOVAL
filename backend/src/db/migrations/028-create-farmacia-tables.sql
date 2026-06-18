-- Tabla de proveedores
CREATE TABLE farmacia_proveedores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    contacto VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_farmacia_prov_nombre ON farmacia_proveedores(nombre);

-- Tabla de productos
CREATE TABLE farmacia_productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    codigo_proveedor VARCHAR(100) NOT NULL,
    categoria VARCHAR(100),
    precio_costo NUMERIC(10,2) NOT NULL,
    precio_venta NUMERIC(10,2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    proveedor_id INT REFERENCES farmacia_proveedores(id),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_farmacia_prod_nombre ON farmacia_productos(nombre);
CREATE INDEX idx_farmacia_prod_codigo ON farmacia_productos(codigo_proveedor);
CREATE INDEX idx_farmacia_prod_stock ON farmacia_productos(stock);

-- Tabla de clientes
CREATE TABLE farmacia_clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(255),
    paciente_id INT REFERENCES pacientes(id),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_compra TIMESTAMP
);

CREATE INDEX idx_farmacia_clientes_nombre ON farmacia_clientes(nombre);

-- Tabla de ventas
CREATE TABLE farmacia_ventas (
    id SERIAL PRIMARY KEY,
    numero_venta SERIAL UNIQUE,
    fecha TIMESTAMP NOT NULL,
    subtotal NUMERIC(10,2),
    descuento NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) NOT NULL,
    metodo_pago VARCHAR(20),
    empleado_id INT NOT NULL REFERENCES usuarios(id),
    cliente_id INT REFERENCES farmacia_clientes(id),
    paciente_id INT REFERENCES pacientes(id),
    estado VARCHAR(20) DEFAULT 'abierta',
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_farmacia_ventas_empleado ON farmacia_ventas(empleado_id);
CREATE INDEX idx_farmacia_ventas_fecha ON farmacia_ventas(fecha);
CREATE INDEX idx_farmacia_ventas_estado ON farmacia_ventas(estado);

-- Tabla de items de venta
CREATE TABLE farmacia_items_venta (
    id SERIAL PRIMARY KEY,
    venta_id INT NOT NULL REFERENCES farmacia_ventas(id) ON DELETE CASCADE,
    producto_id INT NOT NULL REFERENCES farmacia_productos(id),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10,2),
    subtotal NUMERIC(10,2),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_farmacia_items_venta ON farmacia_items_venta(venta_id);

-- Tabla de caja
CREATE TABLE farmacia_caja (
    id SERIAL PRIMARY KEY,
    empleado_id INT NOT NULL REFERENCES usuarios(id),
    fecha_apertura TIMESTAMP NOT NULL,
    fecha_cierre TIMESTAMP,
    efectivo_inicial NUMERIC(10,2),
    efectivo_final NUMERIC(10,2),
    diferencia NUMERIC(10,2),
    estado VARCHAR(20) DEFAULT 'abierta',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(empleado_id, estado)
);

CREATE INDEX idx_farmacia_caja_fecha ON farmacia_caja(fecha_apertura);
