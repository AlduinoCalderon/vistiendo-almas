import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Scanner({ onProductScanned }) {
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  // Mantener siempre el foco en el escáner (ideal para lectores de código de barras)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Autoenfoque al hacer click fuera
    const handleClick = () => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    
    setError(null);
    const codigo = barcode.trim();
    setBarcode(''); // Limpiar para el próximo escaneo de inmediato

    try {
      // Buscar la variante por código de barras
      const { data, error: sbError } = await supabase
        .from('variantes')
        .select(`
          id, precio, talla, color, stock,
          productos ( nombre, categoria )
        `)
        .eq('codigo_barras', codigo)
        .single();

      if (sbError || !data) {
        setError('Producto no encontrado o error de red');
        return;
      }

      if (data.stock <= 0) {
         setError('Atención: Producto sin stock registrado.');
         // Podría dejarse pasar si se permite vender en negativo, pero avisamos.
      }

      onProductScanned({
        variante_id: data.id,
        nombre: data.productos.nombre,
        talla: data.talla,
        color: data.color,
        precio: data.precio,
      });

    } catch (err) {
      setError('Error al procesar el código de barras');
      console.error(err);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <form onSubmit={handleScan} className="flex-between">
        <div style={{ flex: 1, marginRight: '1rem' }}>
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Escanee código de barras aquí..."
            autoFocus
          />
        </div>
        <button type="submit" style={{ width: 'auto' }}>Agregar</button>
      </form>
      {error && <div className="error">{error}</div>}
    </div>
  );
}
