-- Fase 1: Creación de Tablas con Identidad y Claves Foráneas

-- Habilitar extensión UUID si no está presente
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla: productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    categoria TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: variantes
CREATE TABLE variantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
    talla TEXT,
    color TEXT,
    codigo_barras TEXT UNIQUE,
    precio NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: ventas
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cajero_id UUID REFERENCES auth.users(id) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    metodo_pago TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: detalle_venta
CREATE TABLE detalle_venta (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID REFERENCES ventas(id) ON DELETE CASCADE,
    variante_id UUID REFERENCES variantes(id),
    cantidad INT NOT NULL,
    precio_unitario NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- Fase 2: Configuración de Seguridad (RLS)

-- Ninguna tabla es de acceso público
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalle_venta ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura para productos (sólo autenticados)
CREATE POLICY "Lectura de productos para autenticados" 
    ON productos FOR SELECT 
    TO authenticated 
    USING (true);

-- Políticas de lectura para variantes (sólo autenticados)
CREATE POLICY "Lectura de variantes para autenticados" 
    ON variantes FOR SELECT 
    TO authenticated 
    USING (true);

-- Políticas de inserción para ventas (sólo autenticados)
CREATE POLICY "Inserción de ventas para autenticados" 
    ON ventas FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = cajero_id);

-- Políticas de inserción para detalle_venta (sólo autenticados)
CREATE POLICY "Inserción de detalle_venta para autenticados" 
    ON detalle_venta FOR INSERT 
    TO authenticated 
    WITH CHECK (true); -- El RPC controla que sea válido


-- Fase 3: Función Atómica (RPC)
-- Lógica transaccional para evitar condiciones de carrera

CREATE OR REPLACE FUNCTION procesar_venta(
    p_cajero_id UUID,
    p_metodo_pago TEXT,
    p_items JSON
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Ejecuta con permisos del creador para bypass temporal RLS en inserts/updates
AS $$
DECLARE
    v_venta_id UUID;
    v_total NUMERIC(10, 2) := 0;
    v_item RECORD;
    v_variante_id UUID;
    v_cantidad INT;
    v_precio_unitario NUMERIC(10, 2);
    v_stock_actual INT;
    v_precio_db NUMERIC(10, 2);
BEGIN
    -- 1. Validar que la tienda de items no esté vacía
    IF json_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta no contiene articulos';
    END IF;

    -- 2. Crear cabecera de la venta (id temporal para enlazar detalles)
    v_venta_id := uuid_generate_v4();

    -- Iterar sobre el array JSON
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_variante_id := (v_item.value->>'variante_id')::UUID;
        v_cantidad := (v_item.value->>'cantidad')::INT;
        v_precio_unitario := (v_item.value->>'precio_unitario')::NUMERIC;

        -- BLOQUEO ATOMICO: Verificar la disponibilidad del stock con bloqueo de concurrencia
        SELECT stock, precio INTO v_stock_actual, v_precio_db
        FROM variantes
        WHERE id = v_variante_id
        FOR UPDATE; -- Bloquea la fila hasta que acabe la transacción

        -- Validaciones
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variante % no encontrada', v_variante_id;
        END IF;

        IF v_stock_actual < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para la variante %', v_variante_id;
        END IF;

        IF v_precio_db != v_precio_unitario THEN
             RAISE EXCEPTION 'Discrepancia de precios en variante %', v_variante_id;
        END IF;

        -- Actualizar (descontar) stock de la base de datos
        UPDATE variantes
        SET stock = stock - v_cantidad
        WHERE id = v_variante_id;

        -- Insertar el detalle de la venta
        INSERT INTO detalle_venta (venta_id, variante_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_variante_id, v_cantidad, v_precio_unitario, v_cantidad * v_precio_unitario);

        -- Ir sumando al total general
        v_total := v_total + (v_cantidad * v_precio_unitario);
    END LOOP;

    -- 3. Insertar registro maestro en ventas
    INSERT INTO ventas (id, cajero_id, total, metodo_pago)
    VALUES (v_venta_id, p_cajero_id, v_total, p_metodo_pago);

    -- Postgres hace COMMIT implícito si se llega al final sin RAISE EXCEPTION
    RETURN v_venta_id;
END;
$$;
