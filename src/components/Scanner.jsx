import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search } from 'lucide-react';

export default function Scanner({ onProductScanned }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (term) => {
    if (!term.trim() || term.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    setSearching(true);
    setError(null);

    try {
      // Primero intenta exacto por codigo de barras
      const { data: barcodeHit } = await supabase
        .from('variantes')
        .select('id, precio, talla, color, stock, codigo_barras, productos!inner(nombre, categoria)')
        .eq('codigo_barras', term.trim())
        .maybeSingle();

      if (barcodeHit) {
        addProduct(barcodeHit);
        setSearchTerm('');
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      // Busqueda parcial por nombre
      const { data, error: err } = await supabase
        .from('variantes')
        .select('id, precio, talla, color, stock, codigo_barras, productos!inner(nombre, categoria)')
        .ilike('productos.nombre', `%${term}%`)
        .order('productos(nombre)', { ascending: true })
        .limit(30);

      if (err) throw err;
      setSuggestions(data || []);
      setShowDropdown((data || []).length > 0);
    } catch (e) {
      setError('Error al buscar.');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setError(null);
    clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => doSearch(val), 300);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounceRef.current);
      doSearch(searchTerm);
    }
    if (e.key === 'Escape') { setShowDropdown(false); }
  };

  const addProduct = (variante) => {
    onProductScanned({
      variante_id: variante.id,
      nombre: variante.productos.nombre,
      talla: variante.talla,
      color: variante.color,
      precio: variante.precio,
    });
    setSearchTerm('');
    setSuggestions([]);
    setShowDropdown(false);
    setError(null);
    if (inputRef.current) inputRef.current.focus();
  };

  const selectSuggestion = (variante) => {
    if (variante.stock <= 0) {
      setError(`Sin stock: ${variante.productos.nombre} (${variante.talla} / ${variante.color})`);
      return;
    }
    addProduct(variante);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          {searching
            ? <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            : <Search className="h-6 w-6 text-gray-400" />
          }
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          placeholder="Escanea código de barras o escribe para buscar... (ej: Pant)"
          autoFocus
          className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />

        {/* Dropdown de sugerencias */}
        {showDropdown && suggestions.length > 0 && (
          <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
              {suggestions.length} resultados — click para agregar al carrito
            </div>
            {suggestions.map(v => (
              <button key={v.id} onClick={() => selectSuggestion(v)}
                className="w-full px-4 py-3 hover:bg-blue-50 text-left transition-colors flex justify-between items-center border-b border-gray-50 last:border-0"
                disabled={v.stock <= 0}>
                <div>
                  <p className={`font-bold ${v.stock <= 0 ? 'text-gray-400' : 'text-gray-900'}`}>{v.productos.nombre}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    <span className="bg-gray-100 px-1.5 rounded text-xs mr-1">{v.talla}</span>
                    <span className="border border-gray-200 px-1.5 rounded text-xs mr-2">{v.color}</span>
                    {v.codigo_barras && <span className="font-mono text-xs text-gray-400">· {v.codigo_barras}</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="font-bold text-blue-700">${v.precio.toFixed(2)}</p>
                  <p className={`text-xs font-bold ${v.stock <= 0 ? 'text-red-500' : v.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {v.stock <= 0 ? 'Sin stock' : `Stock: ${v.stock}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
