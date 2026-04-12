-- ============================================================
-- SCRIPT DE RESET — Vistiendo Almas POS
-- Ejecutar en Supabase SQL Editor ANTES de entregar el sistema
-- ============================================================
-- ⚠️  ADVERTENCIA: Este script borra datos operativos.
--     Mantiene: estructura de tablas, funciones, RLS, extensiones.
--     Elimina: ventas, sesiones, inventario, productos, usuarios no-admin.
-- ============================================================

-- ── CHECKLIST PREVIO (verificar antes de ejecutar) ───────────
-- [ ] Exportar respaldo desde Supabase: Dashboard → Settings → Database → Backups
-- [ ] Confirmar que todos los reportes finales fueron descargados
-- [ ] Desactivar temporalmente la app (Vercel → Domain → Maintenance)
-- ─────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════
-- OPCIÓN A: SOFT RESET (datos operativos, catálogo permanece)
-- Borra ventas e historial. Mantiene productos/variantes/usuarios.
-- ════════════════════════════════════════════════════════════
/*
BEGIN;

-- Orden correcto para respetar FKs
DELETE FROM detalle_venta;
DELETE FROM ventas;
DELETE FROM sesiones_caja;

-- Resetear stock a 0 (opcional — comentar si se quiere mantener)
-- UPDATE variantes SET stock = 0;

COMMIT;
*/


-- ════════════════════════════════════════════════════════════
-- OPCIÓN B: HARD RESET (limpieza total para entrega)
-- Borra TODO excepto estructura, funciones y extensiones.
-- Los usuarios de auth.users se deben eliminar desde el Dashboard.
-- ════════════════════════════════════════════════════════════
/*
BEGIN;

-- 1. Datos transaccionales
DELETE FROM detalle_venta;
DELETE FROM ventas;
DELETE FROM sesiones_caja;

-- 2. Catálogo de productos
DELETE FROM variantes;
DELETE FROM productos;

-- 3. Perfiles (excepto el admin principal)
DELETE FROM perfiles
WHERE id NOT IN (
    SELECT id FROM auth.users WHERE email = 'aluino@utexas.edu' -- ← tu admin
);

COMMIT;
*/


-- ════════════════════════════════════════════════════════════
-- RE-SEED MÍNIMO (después del hard reset)
-- Ejecutar para crear el estado inicial de "sistema limpio"
-- ════════════════════════════════════════════════════════════
/*
-- Reactivar y confirmar rol del admin principal
UPDATE perfiles
SET activo = true, rol = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'aluino@utexas.edu');

-- Verificar estado post-reset
SELECT 'perfiles' AS tabla, count(*) FROM perfiles
UNION ALL SELECT 'productos', count(*) FROM productos
UNION ALL SELECT 'variantes', count(*) FROM variantes
UNION ALL SELECT 'ventas', count(*) FROM ventas
UNION ALL SELECT 'sesiones_caja', count(*) FROM sesiones_caja;
*/


-- ════════════════════════════════════════════════════════════
-- VALIDACIÓN POST-RESET (copiar y ejecutar después del reset)
-- ════════════════════════════════════════════════════════════
SELECT 'perfiles' AS tabla, count(*) AS total FROM perfiles
UNION ALL SELECT 'productos', count(*) FROM productos
UNION ALL SELECT 'variantes', count(*) FROM variantes
UNION ALL SELECT 'ventas', count(*) FROM ventas
UNION ALL SELECT 'detalle_venta', count(*) FROM detalle_venta
UNION ALL SELECT 'sesiones_caja', count(*) FROM sesiones_caja;
