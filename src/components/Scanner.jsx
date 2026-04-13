import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus } from 'lucide-react';
import useCartStore from '../store/cartStore';

// ── Modal Alta Rápida ──────────────────────────────────────────────────────────
function AltaRapidaModal({ barcode, onClose, onAdded }) {
  const [form, setForm] = useState({ nombre: '', talla: '', color: '', precio: '', stock: '1' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [productosBusq, setProductosBusq] = useState([]);
  const [productoId, setProductoId] = useState(null); // si seleccionó uno existente
  const debRef = useRef(null);

  const buscarProducto = async (q) => {
    if (!q || q.length < 2) { setProductosBusq([]); return; }
    const { data } = await supabase.from('productos').select('id, nombre').ilike('nombre', `%${q}%`).limit(6);
    setProductosBusq(data || []);
  };

  const handleNombre = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, nombre: val }));
    setProductoId(null);
    clearTimeout(debRef.current);
    debRef.current = setTimeout(() => buscarProducto(val), 300);
  };

  const seleccionarProducto = (p) => {
    setForm(f => ({ ...f, nombre: p.nombre }));
    setProductoId(p.id);
    setProductosBusq([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let pid = productoId;

      if (!pid) {
        // Crear nuevo producto
        const { data: newP, error: pErr } = await supabase
          .from('productos')
          .insert({ nombre: form.nombre.trim(), activo: true })
          .select('id')
          .single();
        if (pErr) throw pErr;
        pid = newP.id;
      }

      // Crear variante
      const { data: newV, error: vErr } = await supabase
        .from('variantes')
        .insert({
          producto_id: pid,
          talla:          form.talla.trim()  || 'Única',
          color:          form.color.trim()  || 'Único',
          codigo_barras:  barcode,
          precio:         parseFloat(form.precio),
          stock:          parseInt(form.stock) || 1,
          activo:         true,
        })
        .select('id, talla, color, precio, stock, codigo_barras, productos!inner(nombre)')
        .single();
      if (vErr) throw vErr;

      onAdded(newV);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Plus className="text-blue-600" size={20} />
            Alta Rápida de Producto
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-4 font-mono text-sm text-gray-600">
          📦 Código escaneado: <strong>{barcode}</strong>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Nombre con autocomplete */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del producto *</label>
            <input
              type="text" required value={form.nombre} onChange={handleNombre}
              placeholder="Escribe o busca uno existente"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              autoFocus
            />
            {productosBusq.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {productosBusq.map(p => (
                  <button key={p.id} type="button" onClick={() => seleccionarProducto(p)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 font-medium transition-colors">
                    {p.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Talla</label>
              <input type="text" value={form.talla} onChange={e => setForm(f => ({ ...f, talla: e.target.value }))}
                placeholder="Única"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Color</label>
              <input type="text" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                placeholder="Único"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio *</label>
              <input type="number" required step="0.01" min="0.01" value={form.precio}
                onChange={e => setForm(f => ({ ...f, precio: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Stock inicial</label>
              <input type="number" min="1" value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-xs bg-red-50 border border-red-200 p-2.5 rounded-lg">{error}</div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-sm transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Plus size={14} />}
              {loading ? 'Guardando...' : 'Dar de alta y agregar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Scanner principal ──────────────────────────────────────────────────────────
export default function Scanner({ onProductScanned, unknownBarcode, onUnknownBarcodeHandled }) {
  const [searchTerm, setSearchTerm]             = useState('');
  const [suggestions, setSuggestions]           = useState([]);
  const [searching, setSearching]               = useState(false);
  const [showDropdown, setShowDropdown]         = useState(false);
  const [error, setError]                       = useState(null);
  const [sinStockItem, setSinStockItem]         = useState(null);   // variante con stock=0
  const [cantidadRegistrar, setCantidadRegistrar] = useState('1');
  const [guardandoStock, setGuardandoStock]     = useState(false);
  const [altaRapidaBarcode, setAltaRapidaBarcode] = useState(null); // barcode no encontrado
  const inputRef    = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);
  const { items }   = useCartStore();

  // Recibir barcode desconocido desde HID scanner en POS.jsx
  useEffect(() => {
    if (unknownBarcode) {
      setAltaRapidaBarcode(unknownBarcode);
    }
  }, [unknownBarcode]);

  // Cerrar dropdown al clickear fuera
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
    setSinStockItem(null);
    setAltaRapidaBarcode(null);

    try {
      // Exacto por código de barras
      const { data: hit } = await supabase
        .from('variantes')
        .select('id, precio, talla, color, stock, codigo_barras, productos!inner(nombre, categoria)')
        .eq('codigo_barras', term.trim())
        .maybeSingle();

      if (hit) {
        addProduct(hit);
        setSearchTerm('');
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      // Sin espacios y largo: parece código de barras → ofrecer alta rápida si tampoco hay resultados por nombre
      const looksLikeCode = !term.includes(' ') && term.length >= 4;

      // Búsqueda por nombre
      const { data, error: err } = await supabase
        .from('variantes')
        .select('id, precio, talla, color, stock, codigo_barras, productos!inner(nombre, categoria)')
        .ilike('productos.nombre', `%${term}%`)
        .order('productos(nombre)', { ascending: true })
        .limit(30);

      if (err) throw err;

      const results = data || [];
      setSuggestions(results);
      setShowDropdown(results.length > 0);

      // No encontrado como barcode ni por nombre → Alta Rápida
      if (looksLikeCode && results.length === 0) {
        setAltaRapidaBarcode(term.trim());
      }
    } catch {
      setError('Error al buscar.');
    } finally {
      setSearching(false);
    }
  }, [items]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setError(null);
    setSinStockItem(null);
    setAltaRapidaBarcode(null);
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
    if (e.key === 'Escape') { setShowDropdown(false); setSinStockItem(null); }
  };

  // Lógica central para agregar producto al carrito
  const addProduct = (variante) => {
    // Sin stock en BD → mostrar formulario de registro inline (antes de agregar)
    if (variante.stock <= 0) {
      setSinStockItem(variante);
      setCantidadRegistrar('1');
      setShowDropdown(false);
      return;
    }

    // Sobre stock: agregar de todas formas con advertencia visual
    const enCarrito = items.find(i => i.variante_id === variante.id);
    const cantidadActual = enCarrito?.cantidad ?? 0;
    if (cantidadActual >= variante.stock) {
      setError(`⚠ Atención: superando el stock registrado (${variante.stock} pzas). Se vendes bajo pedido.`);
    } else {
      setError(null);
    }

    onProductScanned({
      variante_id: variante.id,
      nombre:       variante.productos.nombre,
      talla:        variante.talla,
      color:        variante.color,
      precio:       variante.precio,
      stock:        variante.stock,
    });
    setSearchTerm('');
    setSuggestions([]);
    setShowDropdown(false);
    setError(null);
    setSinStockItem(null);
    if (inputRef.current) inputRef.current.focus();
  };

  // Registrar stock para item sin existencias y agregarlo al carrito
  const registrarStockYAgregar = async (e) => {
    e.preventDefault();
    const cantidad = Math.max(1, parseInt(cantidadRegistrar) || 1);
    setGuardandoStock(true);
    try {
      const { error: upErr } = await supabase
        .from('variantes')
        .update({ stock: cantidad })
        .eq('id', sinStockItem.id);
      if (upErr) throw upErr;

      onProductScanned({
        variante_id: sinStockItem.id,
        nombre:       sinStockItem.productos.nombre,
        talla:        sinStockItem.talla,
        color:        sinStockItem.color,
        precio:       sinStockItem.precio,
        stock:        cantidad,
      });
      setSinStockItem(null);
      setSearchTerm('');
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      setError('Error al actualizar stock: ' + err.message);
    } finally {
      setGuardandoStock(false);
    }
  };

  const handleAltaRapidaAdded = (variante) => {
    onProductScanned({
      variante_id: variante.id,
      nombre:       variante.productos.nombre,
      talla:        variante.talla,
      color:        variante.color,
      precio:       variante.precio,
      stock:        variante.stock,
    });
    setAltaRapidaBarcode(null);
    if (onUnknownBarcodeHandled) onUnknownBarcodeHandled();
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const cerrarAltaRapida = () => {
    setAltaRapidaBarcode(null);
    if (onUnknownBarcodeHandled) onUnknownBarcodeHandled();
    setSearchTerm('');
    if (inputRef.current) inputRef.current.focus();
  };

  const stockEnCarrito = (vid) => items.find(i => i.variante_id === vid)?.cantidad ?? 0;

  return (
    <>
      {/* Modal Alta Rápida */}
      {altaRapidaBarcode && (
        <AltaRapidaModal
          barcode={altaRapidaBarcode}
          onClose={cerrarAltaRapida}
          onAdded={handleAltaRapidaAdded}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        {/* Input principal */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {searching
              ? <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              : <Search className="h-6 w-6 text-gray-400" />
            }
          </div>
          <input
            id="scanner-input"
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder="Escanea código de barras o escribe para buscar..."
            autoFocus
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 text-lg rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />

          {/* Dropdown de sugerencias */}
          {showDropdown && suggestions.length > 0 && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 max-h-80 overflow-y-auto">
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                {suggestions.length} resultados
              </div>
              {suggestions.map(v => {
                const enCarrito   = stockEnCarrito(v.id);
                const sinStock    = v.stock <= 0;
                const maxAlcanzado = enCarrito >= v.stock && v.stock > 0;
                return (
                  <button key={v.id} onClick={() => addProduct(v)}
                    className="w-full px-4 py-3 hover:bg-blue-50 text-left transition-colors flex justify-between items-center border-b border-gray-50 last:border-0">
                    <div>
                      <p className={`font-bold ${(sinStock || maxAlcanzado) ? 'text-gray-400' : 'text-gray-900'}`}>
                        {v.productos.nombre}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        <span className="bg-gray-100 px-1.5 rounded text-xs mr-1">{v.talla}</span>
                        <span className="border border-gray-200 px-1.5 rounded text-xs mr-2">{v.color}</span>
                        {v.codigo_barras && <span className="font-mono text-xs text-gray-400">· {v.codigo_barras}</span>}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-bold text-blue-700">${v.precio.toFixed(2)}</p>
                      <p className={`text-xs font-bold ${
                        sinStock ? 'text-amber-600' : maxAlcanzado ? 'text-red-500' : v.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'
                      }`}>
                        {sinStock ? '+ Registrar stock' : maxAlcanzado ? `Máx. en carrito` : `${v.stock - enCarrito} disp.`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Aviso de error / máximo */}
        {error && (
          <div className="mt-3 text-amber-700 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-200">
            ⚠️ {error}
          </div>
        )}

        {/* Formulario inline: registrar stock cuando la variante existe pero stock=0 */}
        {sinStockItem && (
          <form onSubmit={registrarStockYAgregar}
            className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="mb-3">
              <p className="font-bold text-blue-900 text-sm">
                {sinStockItem.productos.nombre}
                <span className="ml-2 text-blue-500 font-normal text-xs">
                  {sinStockItem.talla} / {sinStockItem.color}
                </span>
              </p>
              <p className="text-blue-600 text-xs mt-0.5">Sin existencias. ¿Cuántas unidades ingresan?</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number" min="1" required
                value={cantidadRegistrar}
                onChange={e => setCantidadRegistrar(e.target.value)}
                autoFocus
                className="w-24 px-3 py-2 text-center text-2xl font-bold border border-blue-300 bg-white rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-blue-700 font-medium text-sm">pzas</span>
              <button type="submit" disabled={guardandoStock}
                className="ml-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50 text-sm">
                {guardandoStock
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Plus size={16} />}
                Registrar y agregar
              </button>
              <button type="button" onClick={() => setSinStockItem(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg text-lg leading-none">✕</button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
