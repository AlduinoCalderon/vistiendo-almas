import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Scanner({ onProductScanned }) {
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    
    const handleClick = () => {
      if (inputRef.current) inputRef.current.focus();
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!barcode.trim()) return;
    
    setError(null);
    const codigo = barcode.trim();
    setBarcode(''); 

    try {
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

      onProductScanned({
        variante_id: data.id,
        nombre: data.productos.nombre,
        talla: data.talla,
        color: data.color,
        precio: data.precio,
      });

    } catch (err) {
      setError('Error al procesar el código de barras');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <form onSubmit={handleScan} className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Escanee código de barras o escriba y presione Enter..."
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
          />
        </div>
        <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition duration-200 whitespace-nowrap shadow-md">
          Agregar
        </button>
      </form>
      {error && <div className="mt-4 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg flex items-center">
        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
        {error}
      </div>}
    </div>
  );
}
