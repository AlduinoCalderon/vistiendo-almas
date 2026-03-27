-- fix_ventas_rls.sql
-- Políticas de lectura para la tabla ventas según rol.
-- EJECUTAR en Supabase SQL Editor.

-- ① Admin ve TODAS las ventas del negocio
CREATE POLICY "Admin lee todas las ventas" ON ventas
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- ② Cajero ve únicamente SUS propias ventas
CREATE POLICY "Cajero lee sus ventas" ON ventas
  FOR SELECT
  TO authenticated
  USING (
    cajero_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM perfiles
      WHERE id = auth.uid() AND rol = 'cajero'
    )
  );
