-- Correccion crítica: El RPC insertaba en detalle_venta ANTES de insertar la cabecera en ventas,
-- violandola FK constraint. Este script lo corrige definitivamente.
DROP FUNCTION IF EXISTS procesar_venta(UUID, UUID, TEXT, JSON);
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
        RAISE EXCEPTION 'La sesión de caja no existe o ya fue cerrada.';
    END IF;

    -- PASO 1: Validar TODOS los items primero (sin insertar nada aún)
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_variante_id := (v_item.value->>'variante_id')::UUID;
        v_cantidad := (v_item.value->>'cantidad')::INT;
        v_precio_unitario := (v_item.value->>'precio_unitario')::NUMERIC;

        SELECT stock, precio INTO v_stock_actual, v_precio_db
        FROM variantes WHERE id = v_variante_id FOR UPDATE;

        IF NOT FOUND THEN RAISE EXCEPTION 'Variante % no encontrada', v_variante_id; END IF;
        IF v_stock_actual < v_cantidad THEN RAISE EXCEPTION 'Stock insuficiente para la variante %', v_variante_id; END IF;
        IF v_precio_db != v_precio_unitario THEN RAISE EXCEPTION 'Discrepancia de precios en variante %', v_variante_id; END IF;

        v_total := v_total + (v_cantidad * v_precio_unitario);
    END LOOP;

    -- PASO 2: Insertar cabecera PRIMERO (ventas antes que detalles)
    v_venta_id := uuid_generate_v4();
    INSERT INTO ventas (id, sesion_id, cajero_id, total, metodo_pago)
    VALUES (v_venta_id, p_sesion_id, p_cajero_id, v_total, p_metodo_pago);

    -- PASO 3: Insertar detalles y descontar stock
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_variante_id := (v_item.value->>'variante_id')::UUID;
        v_cantidad := (v_item.value->>'cantidad')::INT;
        v_precio_unitario := (v_item.value->>'precio_unitario')::NUMERIC;

        UPDATE variantes SET stock = stock - v_cantidad WHERE id = v_variante_id;

        INSERT INTO detalle_venta (venta_id, variante_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_variante_id, v_cantidad, v_precio_unitario, v_cantidad * v_precio_unitario);
    END LOOP;

    RETURN v_venta_id;
END;
$$;
