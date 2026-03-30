-- ============================================================
-- MIGRACIÓN 003: Fix procesar_venta — validar activo = true
-- en variantes antes de descontar stock.
-- Ejecutar en Supabase SQL Editor (es idempotente).
-- ============================================================

-- Eliminar versión anterior primero (firma debe coincidir)
DROP FUNCTION IF EXISTS procesar_venta(UUID, UUID, TEXT, JSON);

CREATE OR REPLACE FUNCTION procesar_venta(
    p_sesion_id UUID,
    p_cajero_id UUID,
    p_metodo_pago TEXT,
    p_items JSON
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    v_activo_variante BOOLEAN;
BEGIN
    -- Validar que la lista de items no esté vacía
    IF json_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta no contiene artículos';
    END IF;

    -- Validar sesión de caja: debe existir y estar abierta
    SELECT estado INTO v_estado_sesion
    FROM sesiones_caja
    WHERE id = p_sesion_id AND cajero_id = p_cajero_id;

    IF v_estado_sesion IS NULL OR v_estado_sesion != 'abierta' THEN
        RAISE EXCEPTION 'La sesión de caja no existe o ya fue cerrada.';
    END IF;

    -- ============================================================
    -- PASO 1: Validar TODOS los ítems primero (sin insertar nada)
    --         Esto garantiza el Rollback total si algo falla.
    -- ============================================================
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_variante_id    := (v_item.value->>'variante_id')::UUID;
        v_cantidad       := (v_item.value->>'cantidad')::INT;
        v_precio_unitario := (v_item.value->>'precio_unitario')::NUMERIC;

        -- Bloquear fila para lectura atómica (FOR UPDATE evita race conditions)
        SELECT stock, precio, activo
        INTO v_stock_actual, v_precio_db, v_activo_variante
        FROM variantes
        WHERE id = v_variante_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variante % no encontrada.', v_variante_id;
        END IF;

        -- ✅ Requisito: solo variantes con activo = true pueden venderse
        IF NOT v_activo_variante THEN
            RAISE EXCEPTION 'La variante % está inactiva y no puede venderse.', v_variante_id;
        END IF;

        IF v_stock_actual < v_cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para la variante %. Disponible: %, Solicitado: %.',
                v_variante_id, v_stock_actual, v_cantidad;
        END IF;

        IF v_precio_db != v_precio_unitario THEN
            RAISE EXCEPTION 'Discrepancia de precio en variante %. Precio real: $%, Precio enviado: $%.',
                v_variante_id, v_precio_db, v_precio_unitario;
        END IF;

        v_total := v_total + (v_cantidad * v_precio_unitario);
    END LOOP;

    -- ============================================================
    -- PASO 2: Insertar cabecera de venta PRIMERO (FK constraint)
    -- ============================================================
    v_venta_id := uuid_generate_v4();
    INSERT INTO ventas (id, sesion_id, cajero_id, total, metodo_pago)
    VALUES (v_venta_id, p_sesion_id, p_cajero_id, v_total, p_metodo_pago);

    -- ============================================================
    -- PASO 3: Insertar detalles y descontar stock atomicamente
    -- ============================================================
    FOR v_item IN SELECT * FROM json_array_elements(p_items)
    LOOP
        v_variante_id    := (v_item.value->>'variante_id')::UUID;
        v_cantidad       := (v_item.value->>'cantidad')::INT;
        v_precio_unitario := (v_item.value->>'precio_unitario')::NUMERIC;

        -- Descontar stock
        UPDATE variantes
        SET stock = stock - v_cantidad
        WHERE id = v_variante_id;

        -- Insertar detalle vinculado a la venta ya existente
        INSERT INTO detalle_venta (venta_id, variante_id, cantidad, precio_unitario, subtotal)
        VALUES (v_venta_id, v_variante_id, v_cantidad, v_precio_unitario, v_cantidad * v_precio_unitario);
    END LOOP;

    -- Retornar el UUID de la venta → Commit implícito de PostgreSQL
    RETURN v_venta_id;
END;
$$;

-- Grant de ejecución para usuarios autenticados
-- (la seguridad del cajero/sesión se valida dentro de la función)
GRANT EXECUTE ON FUNCTION public.procesar_venta(UUID, UUID, TEXT, JSON) TO authenticated;

-- ============================================================
-- FIN DE MIGRACIÓN 003
-- ============================================================
