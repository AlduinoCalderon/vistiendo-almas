-- 1. Tabla: perfiles (roles y nombres)
CREATE TABLE perfiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    rol TEXT DEFAULT 'cajero' CHECK (rol IN ('admin', 'cajero')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura de perfiles" ON perfiles FOR SELECT TO authenticated USING (true);

-- 2. Tabla: sesiones_caja (control de turnos)
CREATE TABLE sesiones_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cajero_id UUID REFERENCES perfiles(id) NOT NULL,
    monto_inicial NUMERIC(10, 2) NOT NULL DEFAULT 0,
    monto_final NUMERIC(10, 2),
    fecha_apertura TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    fecha_cierre TIMESTAMP WITH TIME ZONE,
    estado TEXT DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada'))
);

ALTER TABLE sesiones_caja ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura y Update de sesiones" ON sesiones_caja FOR ALL TO authenticated USING (auth.uid() = cajero_id);
CREATE POLICY "Insercion de sesiones" ON sesiones_caja FOR INSERT TO authenticated WITH CHECK (auth.uid() = cajero_id);

-- 3. Modificaciones a Tablas Existentes (Si la primera ventas ya tiene datos, la sesion podría ser null, 
-- pero para ventas nuevas exigiremos sesion_id)
ALTER TABLE ventas ADD COLUMN sesion_id UUID REFERENCES sesiones_caja(id);

-- 4. Actualización del RPC procesar_venta
-- Eliminamos el antiguo (ya que cambian los parametros)
DROP FUNCTION IF EXISTS procesar_venta(UUID, TEXT, JSON);

CREATE OR REPLACE FUNCTION procesar_venta(
    p_sesion_id UUID,
    p_cajero_id UUID,
    p_metodo_pago TEXT,
    p_items JSON
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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
    v_estado_sesion TEXT;
BEGIN
    IF json_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta no contiene articulos';
    END IF;

    -- Validar sesión de caja
    SELECT estado INTO v_estado_sesion FROM sesiones_caja WHERE id = p_sesion_id AND cajero_id = p_cajero_id;
    IF v_estado_sesion IS NULL OR v_estado_sesion != 'abierta' THEN
        RAISE EXCEPTION 'La sesión de caja referenciada no existe o ya fue cerrada.';
    END IF;

    v_venta_id := uuid_generate_v4();

    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_variante_id := (v_item.value->>'variante_id')::UUID;
        v_cantidad := (v_item.value->>'cantidad')::INT;
        v_precio_unitario := (v_item.value->>'precio_unitario')::NUMERIC;

        SELECT stock, precio INTO v_stock_actual, v_precio_db
        FROM variantes
        WHERE id = v_variante_id
        FOR UPDATE;

        IF NOT FOUND THEN RAISE EXCEPTION 'Variante % no encontrada', v_variante_id; END IF;
        IF v_stock_actual < v_cantidad THEN RAISE EXCEPTION 'Stock insuficiente para la variante %', v_variante_id; END IF;
        IF v_precio_db != v_precio_unitario THEN RAISE EXCEPTION 'Discrepancia de precios en variante %', v_variante_id; END IF;

        UPDATE variantes SET stock = stock - v_cantidad WHERE id = v_variante_id;

        INSERT INTO detalle_venta (venta_id, variante_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_variante_id, v_cantidad, v_precio_unitario, v_cantidad * v_precio_unitario);

        v_total := v_total + (v_cantidad * v_precio_unitario);
    END LOOP;

    INSERT INTO ventas (id, sesion_id, cajero_id, total, metodo_pago)
    VALUES (v_venta_id, p_sesion_id, p_cajero_id, v_total, p_metodo_pago);

    RETURN v_venta_id;
END;
$$;
