-- Tabla de proveedores
CREATE TABLE farmacia_proveedores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefono VARCHAR(20),
    contacto VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de productos
CREATE TABLE farmacia_productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    codigo_proveedor VARCHAR(100) NOT NULL,
    categoria VARCHAR(100),
    precio_costo DECIMAL(10,2) NOT NULL,
    precio_venta DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    stock_minimo INT DEFAULT 5,
    proveedor_id INT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proveedor_id) REFERENCES farmacia_proveedores(id),
    INDEX idx_nombre (nombre),
    INDEX idx_codigo (codigo_proveedor),
    INDEX idx_stock (stock)
);

-- Tabla de clientes
CREATE TABLE farmacia_clientes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255),
    telefono VARCHAR(20),
    email VARCHAR(255),
    paciente_id INT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultima_compra TIMESTAMP,
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    INDEX idx_nombre (nombre)
);

-- Tabla de ventas
CREATE TABLE farmacia_ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_venta INT AUTO_INCREMENT UNIQUE,
    fecha DATETIME NOT NULL,
    subtotal DECIMAL(10,2),
    descuento DECIMAL(10,2) DEFAULT 0,
    total DECIMAL(10,2) NOT NULL,
    metodo_pago ENUM('efectivo', 'terminal', 'transferencia'),
    empleado_id INT NOT NULL,
    cliente_id INT,
    paciente_id INT,
    estado ENUM('abierta', 'pagada', 'cancelada') DEFAULT 'abierta',
    observaciones TEXT,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES usuarios(id),
    FOREIGN KEY (cliente_id) REFERENCES farmacia_clientes(id),
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
    INDEX idx_empleado (empleado_id),
    INDEX idx_fecha (fecha),
    INDEX idx_estado (estado)
);

-- Tabla de items de venta
CREATE TABLE farmacia_items_venta (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2),
    subtotal DECIMAL(10,2),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venta_id) REFERENCES farmacia_ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES farmacia_productos(id),
    INDEX idx_venta (venta_id)
);

-- Tabla de caja
CREATE TABLE farmacia_caja (
    id INT PRIMARY KEY AUTO_INCREMENT,
    empleado_id INT NOT NULL,
    fecha_apertura DATETIME NOT NULL,
    fecha_cierre DATETIME,
    efectivo_inicial DECIMAL(10,2),
    efectivo_final DECIMAL(10,2),
    diferencia DECIMAL(10,2),
    estado ENUM('abierta', 'cerrada') DEFAULT 'abierta',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (empleado_id) REFERENCES usuarios(id),
    UNIQUE KEY uq_empleado_abierta (empleado_id, estado),
    INDEX idx_fecha (fecha_apertura)
);
