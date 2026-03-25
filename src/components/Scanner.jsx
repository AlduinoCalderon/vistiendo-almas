import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Scanner({ onProductScanned }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
    
    const handleClick = () => {
      // Si hay resultados mostrándose, no forzamos el focus para permitir el clic libre
      if (inputRef.current && searchResults.length === 0) {
        inputRef.current.focus();
      }
    };
    
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [searchResults.length]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    
    setError(null);
    setSearchResults([]);
    setIsSearching(true);
    const term = searchTerm.trim();

    try {
      // 1. Intentar buscar exactamente por código de barras primero
      // Se usa maybeSingle para evitar el error 406 Not Acceptable si no existe
      const { data: barcodeData, error: barcodeError } = await supabase
        .from('variantes')
        .select(`
          id, precio, talla, color, stock, codigo_barras,
          productos!inner ( nombre, categoria )
        `)
        .eq('codigo_barras', term)
        .maybeSingle();

      if (barcodeError) throw barcodeError;

      if (barcodeData) {
        // Encontrado por código exacto!
        addScannedProduct(barcodeData);
        return;
      }

      // 2. Si no es un código de barras válido, buscamos por coincidencias parciales en el nombre del producto
      const { data: nameData, error: nameError } = await supabase
        .from('variantes')
        .select(`
          id, precio, talla, color, stock, codigo_barras,
          productos!inner ( nombre, categoria )
        `)
        .ilike('productos.nombre', `%${term}%`);

      if (nameError) throw nameError;

      if (!nameData || nameData.length === 0) {
        setError('No se encontró ningún producto con ese código de barras o nombre.');
      } else if (nameData.length === 1) {
        // Si solo arrojó una variante, la agregamos directo
        addScannedProduct(nameData[0]);
      } else {
        // Múltiples variantes encontradas, mostramos selector
        setSearchResults(nameData);
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al buscar el producto.');
    } finally {
      setIsSearching(false);
    }
  };

  const addScannedProduct = (data) => {
    onProductScanned({
      variante_id: data.id,
      nombre: data.productos.nombre,
      talla: data.talla,
      color: data.color,
      precio: data.precio,
    });
    setSearchTerm('');
    setSearchResults([]);
    setError(null);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4 items-center relative">
        <div className="flex-1 w-full relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Escanee código de barras o escriba el nombre del producto..."
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
          />
        </div>
        <button type="submit" disabled={isSearching} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition duration-200 whitespace-nowrap shadow-md disabled:bg-blue-300">
          {isSearching ? 'Buscando...' : 'Buscar / Agregar'}
        </button>
      </form>

      {error && (
        <div className="mt-4 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
          {error}
        </div>
      )}

      {/* Resultados de Búsqueda por Nombre (Múltiples Variantes) */}
      {searchResults.length > 0 && (
        <div className="mt-6 border border-gray-200 rounded-xl overflow-hidden shadow-md bg-white">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100 flex justify-between items-center text-sm font-bold text-blue-900">
            <span>Resultados para "{searchTerm}": Seleccione la variante correcta</span>
            <button onClick={() => setSearchResults([])} className="text-blue-500 hover:text-blue-800">Cerrar</button>
          </div>
          <ul className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
            {searchResults.map((variante) => (
              <li 
                key={variante.id} 
                onClick={() => addScannedProduct(variante)}
                className="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition-colors group"
              >
                <div>
                  <p className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">
                    {variante.productos.nombre}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-medium mr-2">Talla: {variante.talla}</span> 
                    <span className="inline-block border border-gray-200 px-2 py-0.5 rounded text-gray-600 mr-2">Color: {variante.color}</span>
                    <span className="font-mono text-xs text-gray-400">Cód: {variante.codigo_barras || 'N/A'}</span>
                  </p>
                </div>
                <div className="text-right flex flex-col items-end">
                   <p className="font-bold text-gray-900 text-xl">${variante.precio.toFixed(2)}</p>
                   <p className={`text-xs font-bold mt-1 px-2 py-0.5 rounded ${variante.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                     Stock: {variante.stock}
                   </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
