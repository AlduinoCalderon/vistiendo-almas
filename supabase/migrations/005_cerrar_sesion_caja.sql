-- ============================================================
-- MIGRACIÓN 005: RPC para cerrar sesión de caja con monto final
-- EJECUTAR en Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION cerrar_sesion_caja(
    p_sesion_id  UUID,
    p_monto_final NUMERIC
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE sesiones_caja
    SET
        estado       = 'cerrada',
        monto_final  = p_monto_final,
        fecha_cierre = now()
    WHERE
        id         = p_sesion_id
        AND cajero_id = auth.uid()
        AND estado  = 'abierta';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sesión no encontrada o ya cerrada.';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cerrar_sesion_caja(UUID, NUMERIC) TO authenticated;
