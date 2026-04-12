-- ============================================================
-- MIGRACIÓN 002: Backfill de perfiles para usuarios existentes
--
-- Usuarios creados ANTES del trigger on_auth_user_created no
-- tienen registro en public.perfiles, lo que rompe la FK de
-- sesiones_caja.cajero_id → perfiles(id).
--
-- Este script inserta un perfil para cualquier auth.user que
-- no tenga uno. Es idempotente (ON CONFLICT DO NOTHING).
-- ============================================================

INSERT INTO public.perfiles (id, nombre, rol, activo)
SELECT
    au.id,
    COALESCE(au.raw_user_meta_data->>'nombre', au.email),
    'cajero',   -- rol por defecto; ajusta manualmente después si es admin
    false       -- inactivo por defecto; activa manualmente si es necesario
FROM auth.users au
LEFT JOIN public.perfiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- OPCIONAL: Si sabes el email de tu admin, actívalo aquí:
-- ============================================================
-- UPDATE public.perfiles
-- SET rol = 'admin', activo = true
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'tu-email@ejemplo.com');
-- ============================================================
