-- ============================================================
-- MIGRACIÓN 001: Auth con Aprobación de Admin
-- Ejecutar en Supabase SQL Editor (es idempotente)
-- ============================================================

-- ============================================================
-- 1. COLUMNA `activo` EN TABLAS DE NEGOCIO
-- ============================================================

ALTER TABLE variantes
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE sesiones_caja
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE ventas
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE detalle_venta
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- 2. PERFILES: nuevos usuarios nacen INACTIVOS
-- ============================================================

-- Cambiamos el default de activo a false para nuevos registros
ALTER TABLE perfiles
  ALTER COLUMN activo SET DEFAULT false;

-- Aseguramos que el campo nombre sea nullable (el trigger lo llenará con el email)
ALTER TABLE perfiles
  ALTER COLUMN nombre DROP NOT NULL;

-- ============================================================
-- 3. TRIGGER: al crear usuario en auth.users → insertar perfil inactivo
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    'cajero',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Eliminar trigger si ya existe para re-crearlo limpio
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 4. ACTUALIZACIÓN DE POLÍTICAS RLS
-- ============================================================

-- ---- perfiles ----
-- Eliminamos política de lectura anterior (sin filtro activo)
DROP POLICY IF EXISTS "Lectura de perfiles" ON perfiles;

-- Cajeros/usuarios normales: solo ven perfiles activos
CREATE POLICY "Lectura de perfiles activos"
  ON perfiles FOR SELECT TO authenticated
  USING (
    activo = true
    OR
    -- los admins ven todos los perfiles
    EXISTS (
      SELECT 1 FROM public.perfiles p
      WHERE p.id = auth.uid() AND p.rol = 'admin' AND p.activo = true
    )
  );

-- Los usuarios pueden ver su propio perfil (activo o no) para el login check
CREATE POLICY "Lectura perfil propio"
  ON perfiles FOR SELECT TO authenticated
  USING (id = auth.uid());

-- ---- productos ----
DROP POLICY IF EXISTS "Lectura de productos" ON productos;
CREATE POLICY "Lectura de productos activos"
  ON productos FOR SELECT TO authenticated
  USING (activo = true);

-- ---- variantes ----
DROP POLICY IF EXISTS "Lectura de variantes" ON variantes;
CREATE POLICY "Lectura de variantes activas"
  ON variantes FOR SELECT TO authenticated
  USING (activo = true);

-- ---- sesiones_caja ----
DROP POLICY IF EXISTS "Lectura y Update de sesiones" ON sesiones_caja;
CREATE POLICY "Acceso sesiones propias activas"
  ON sesiones_caja FOR ALL TO authenticated
  USING (auth.uid() = cajero_id AND activo = true);

-- ---- ventas ----
DROP POLICY IF EXISTS "Inserción de ventas" ON ventas;
CREATE POLICY "Inserción de ventas"
  ON ventas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = cajero_id);

CREATE POLICY "Lectura de ventas propias"
  ON ventas FOR SELECT TO authenticated
  USING (auth.uid() = cajero_id);

-- ---- detalle_venta ----
-- La política anterior ya era permisiva para INSERT, se mantiene

-- ============================================================
-- 5. RPCs SECURITY DEFINER - SOLO PARA ADMINS
-- ============================================================

-- Helper interno: verifica que el ejecutor sea admin activo
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid() AND rol = 'admin' AND activo = true
  );
END;
$$;

-- RPC: activar_usuario
CREATE OR REPLACE FUNCTION public.activar_usuario(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador.';
  END IF;

  UPDATE public.perfiles
  SET activo = true
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario % no encontrado.', p_user_id;
  END IF;
END;
$$;

-- RPC: desactivar_usuario
CREATE OR REPLACE FUNCTION public.desactivar_usuario(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador.';
  END IF;

  -- No permitir que un admin se desactive a sí mismo
  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'No puedes desactivar tu propia cuenta.';
  END IF;

  UPDATE public.perfiles
  SET activo = false
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario % no encontrado.', p_user_id;
  END IF;
END;
$$;

-- RPC: cambiar_rol
CREATE OR REPLACE FUNCTION public.cambiar_rol(p_user_id UUID, p_nuevo_rol TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT es_admin() THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de administrador.';
  END IF;

  IF p_nuevo_rol NOT IN ('admin', 'cajero') THEN
    RAISE EXCEPTION 'Rol inválido: %. Los roles permitidos son: admin, cajero.', p_nuevo_rol;
  END IF;

  -- No permitir que un admin se quite su propio rol de admin
  IF p_user_id = auth.uid() AND p_nuevo_rol != 'admin' THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol de administrador.';
  END IF;

  UPDATE public.perfiles
  SET rol = p_nuevo_rol
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario % no encontrado.', p_user_id;
  END IF;
END;
$$;

-- ============================================================
-- 6. GRANT: los RPCs son accesibles para usuarios autenticados
--    (la seguridad la controla es_admin() internamente)
-- ============================================================

GRANT EXECUTE ON FUNCTION public.activar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desactivar_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cambiar_rol(UUID, TEXT) TO authenticated;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
