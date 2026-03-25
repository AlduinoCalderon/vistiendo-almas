-- modificaciones_phase3.sql
-- Corrección para permitir la escritura desde el Módulo de Inventario

-- Borramos las políticas de solo lectura anteriores (para evitar duplicados)
DROP POLICY IF EXISTS "Lectura de productos para autenticados" ON productos;
DROP POLICY IF EXISTS "Lectura de productos" ON productos;
DROP POLICY IF EXISTS "Lectura de variantes para autenticados" ON variantes;
DROP POLICY IF EXISTS "Lectura de variantes" ON variantes;

-- Creamos políticas "ALL" (CRUD completo: SELECT, INSERT, UPDATE, DELETE)
-- para usuarios autenticados en las tablas del catálogo.
CREATE POLICY "Acceso total productos" ON productos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total variantes" ON variantes FOR ALL TO authenticated USING (true) WITH CHECK (true);
