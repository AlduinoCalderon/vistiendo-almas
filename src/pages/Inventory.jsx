import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Save, X, ChevronDown, Package, EyeOff, Eye, RotateCcw } from 'lucide-react';

const REGIONES = ['Centro', 'Norte', 'Sur', 'Costa', 'Sierra', 'Internacional', 'General'];

// Modal para agregar nuevo producto con todos los datos del SKU inicial obligatorio
function NuevoProductoModal({ onClose, onSaved }) {
  const [step, setStep] = useState(1); // Step 1: datos del producto, Step 2: primer SKU
  const [producto, setProducto] = useState({ nombre: '', categoria: '' });
  const [sku, setSku] = useState({ talla: '', color: '', codigo_barras: '', precio: '', stock: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const validProducto = producto.nombre.trim() && producto.categoria;
  const validSku = sku.talla.trim() && sku.color.trim() && sku.codigo_barras.trim() && Number(sku.precio) > 0 && Number(sku.stock) >= 0;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Insertar producto
      const { data: prod, error: prodErr } = await supabase
        .from('productos')
        .insert([{ nombre: producto.nombre.trim(), categoria: producto.categoria }])
        .select().single();
      if (prodErr) throw prodErr;

      // Insertar SKU inicial obligatorio
      const { error: varErr } = await supabase
        .from('variantes')
        .insert([{
          producto_id: prod.id,
          talla: sku.talla.trim(),
          color: sku.color.trim(),
          codigo_barras: sku.codigo_barras.trim(),
          precio: parseFloat(sku.precio),
          stock: parseInt(sku.stock),
        }]);
      if (varErr) throw varErr;

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold text-gray-900">Nuevo Producto</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X /></button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-gray-100">
          {[{ n: 1, label: 'Datos del Producto' }, { n: 2, label: 'Variante / SKU' }].map(s => (
            <button key={s.n} onClick={() => s.n === 2 && validProducto ? setStep(s.n) : s.n === 1 && setStep(s.n)}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${step === s.n ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
              {s.n}. {s.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Producto *</label>
                <input type="text" value={producto.nombre} onChange={e => setProducto({ ...producto, nombre: e.target.value })}
                  placeholder="ej. Pantalón de Lino" className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Región *</label>
                <div className="relative">
                  <select value={producto.categoria} onChange={e => setProducto({ ...producto, categoria: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 appearance-none">
                    <option value="">Selecciona la región de origen...</option>
                    {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-3.5 text-gray-400 pointer-events-none" size={20} />
                </div>
              </div>
              <button onClick={() => setStep(2)} disabled={!validProducto}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2">
                Siguiente: Agregar primer SKU →
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg font-medium">
                ⚠️ Un SKU (variante) inicial es obligatorio. No se pueden crear productos sin inventario.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Talla *</label>
                  <input type="text" value={sku.talla} onChange={e => setSku({ ...sku, talla: e.target.value })}
                    placeholder="XS, S, M, L, XL..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Color *</label>
                  <input type="text" value={sku.color} onChange={e => setSku({ ...sku, color: e.target.value })}
                    placeholder="Rojo, Azul..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Código de Barras *</label>
                  <input type="text" value={sku.codigo_barras} onChange={e => setSku({ ...sku, codigo_barras: e.target.value })}
                    placeholder="Escanea o escribe el código" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 font-mono" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Precio ($) *</label>
                  <input type="number" step="0.01" min="0.01" value={sku.precio} onChange={e => setSku({ ...sku, precio: e.target.value })}
                    placeholder="0.00" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Stock Inicial *</label>
                  <input type="number" min="0" value={sku.stock} onChange={e => setSku({ ...sku, stock: e.target.value })}
                    placeholder="0" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                </div>
              </div>

              {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  ← Atrás
                </button>
                <button onClick={handleSave} disabled={!validSku || saving}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// Modal para gestionar los SKUs de un producto existente
function VariantesPanel({ producto, onClose }) {
  const [variantes, setVariantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nuevo, setNuevo] = useState({ talla: '', color: '', codigo_barras: '', precio: '', stock: '' });
  const [saving, setSaving] = useState(false);
  const [editStock, setEditStock] = useState({}); // { [id]: newStockValue }

  const validNuevo = nuevo.talla && nuevo.color && nuevo.codigo_barras && Number(nuevo.precio) > 0 && Number(nuevo.stock) >= 0;

  useEffect(() => { fetchVariantes(); }, []);

  const fetchVariantes = async () => {
    setLoading(true);
    const { data } = await supabase.from('variantes').select('*').eq('producto_id', producto.id).order('created_at');
    if (data) setVariantes(data);
    setLoading(false);
  };

  const agregarVariante = async (e) => {
    e.preventDefault();
    setSaving(true);
    await supabase.from('variantes').insert([{ ...nuevo, producto_id: producto.id, precio: parseFloat(nuevo.precio), stock: parseInt(nuevo.stock) }]);
    setNuevo({ talla: '', color: '', codigo_barras: '', precio: '', stock: '' });
    setSaving(false);
    fetchVariantes();
  };

  const guardarStock = async (id) => {
    const val = editStock[id];
    if (val === undefined || val === '' || isNaN(Number(val))) return;
    await supabase.from('variantes').update({ stock: parseInt(val) }).eq('id', id);
    setEditStock(prev => { const n = { ...prev }; delete n[id]; return n; });
    fetchVariantes();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900">SKUs de: <span className="text-blue-600">{producto.nombre}</span>
            <span className="ml-2 text-sm font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{producto.categoria}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X /></button>
        </div>

        {/* Formulario nuevo SKU */}
        <form onSubmit={agregarVariante} className="p-6 border-b border-gray-100 flex-shrink-0 bg-gray-50/50">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Nueva Variante / SKU</p>
          <div className="grid grid-cols-5 gap-3 items-end">
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Talla *</label>
              <input required value={nuevo.talla} onChange={e => setNuevo({ ...nuevo, talla: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Color *</label>
              <input required value={nuevo.color} onChange={e => setNuevo({ ...nuevo, color: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Cód. Barras *</label>
              <input required value={nuevo.codigo_barras} onChange={e => setNuevo({ ...nuevo, codigo_barras: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white font-mono" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Precio *</label>
              <input required type="number" step="0.01" min="0.01" value={nuevo.precio} onChange={e => setNuevo({ ...nuevo, precio: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white" /></div>
            <div><label className="block text-xs font-semibold text-gray-500 mb-1">Stock *</label>
              <div className="flex gap-1">
                <input required type="number" min="0" value={nuevo.stock} onChange={e => setNuevo({ ...nuevo, stock: e.target.value })} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-400 text-sm bg-white" />
                <button type="submit" disabled={!validNuevo || saving} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg disabled:opacity-40"><Plus size={18} /></button>
              </div>
            </div>
          </div>
        </form>

        {/* Listado */}
        <div className="overflow-y-auto flex-1">
          {loading ? <div className="p-8 text-center text-gray-400">Cargando...</div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left">Talla / Color</th>
                  <th className="px-6 py-3 text-left font-mono">Código Barras</th>
                  <th className="px-6 py-3 text-right">Precio</th>
                  <th className="px-6 py-3 text-center">Stock Actual</th>
                  <th className="px-6 py-3 text-center">Ajustar Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {variantes.map(v => (
                  <tr key={v.id} className="hover:bg-blue-50/30">
                    <td className="px-6 py-3 font-semibold">
                      <span className="bg-gray-100 px-2 py-0.5 rounded mr-2 text-gray-700">{v.talla}</span>
                      <span className="border border-gray-200 px-2 py-0.5 rounded text-gray-600">{v.color}</span>
                    </td>
                    <td className="px-6 py-3 font-mono text-gray-500">{v.codigo_barras}</td>
                    <td className="px-6 py-3 text-right font-bold text-blue-700">${v.precio.toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`font-bold text-lg ${v.stock <= 0 ? 'text-red-500' : v.stock <= 5 ? 'text-amber-500' : 'text-emerald-600'}`}>{v.stock}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input type="number" min="0"
                          value={editStock[v.id] !== undefined ? editStock[v.id] : v.stock}
                          onChange={e => setEditStock(prev => ({ ...prev, [v.id]: e.target.value }))}
                          className="w-20 px-2 py-1.5 border rounded-lg text-center text-sm outline-none focus:ring-2 focus:ring-blue-400" />
                        <button onClick={() => guardarStock(v.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg transition-colors"><Save size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {variantes.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400">Sin variantes — usa el formulario de arriba para agregar.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inventory() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNuevoModal, setShowNuevoModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchProd, setSearchProd] = useState('');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);

  useEffect(() => { fetchProductos(); }, []);

  const fetchProductos = async () => {
    setLoading(true);
    // Cargamos TODOS (activos e inactivos) para que el admin pueda reactivarlos
    const { data } = await supabase
      .from('productos')
      .select('*, variantes(count)')
      .order('nombre');
    if (data) setProductos(data);
    setLoading(false);
  };

  const darDeBajaProducto = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Dar de baja este producto? Se ocultará del catálogo y del POS, pero no se eliminará permanentemente.')) return;
    await supabase.from('productos').update({ activo: false }).eq('id', id);
    if (selectedProduct?.id === id) setSelectedProduct(null);
    fetchProductos();
  };

  const reactivarProducto = async (id, e) => {
    e.stopPropagation();
    await supabase.from('productos').update({ activo: true }).eq('id', id);
    fetchProductos();
  };

  const filtrados = productos.filter(p => {
    const textoOk = p.nombre.toLowerCase().includes(searchProd.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchProd.toLowerCase());
    const activoOk = mostrarInactivos ? true : p.activo !== false;
    return textoOk && activoOk;
  });

  return (
    <div className="space-y-6">
      {showNuevoModal && <NuevoProductoModal onClose={() => setShowNuevoModal(false)} onSaved={fetchProductos} />}
      {selectedProduct && <VariantesPanel producto={selectedProduct} onClose={() => setSelectedProduct(null)} />}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><Package className="text-blue-600" /> Catálogo de Productos</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMostrarInactivos(v => !v)}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border transition-colors ${
              mostrarInactivos
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {mostrarInactivos ? <Eye size={16} /> : <EyeOff size={16} />}
            {mostrarInactivos ? 'Ocultar inactivos' : 'Ver inactivos'}
          </button>
          <button onClick={() => setShowNuevoModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm transition-colors">
            <Plus size={20} /> Nuevo Producto
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <input type="text" value={searchProd} onChange={e => setSearchProd(e.target.value)}
            placeholder="Buscar producto o región..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-4">Nombre</th>
              <th className="px-6 py-4">Región</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">SKUs / Variantes</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-400">Cargando catálogo...</td></tr>
            ) : filtrados.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay productos. Agrega el primero.</td></tr>
            ) : filtrados.map(p => (
              <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.activo === false ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 font-bold text-gray-900">{p.nombre}</td>
                <td className="px-6 py-4">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">{p.categoria || '—'}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    p.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${p.activo !== false ? 'bg-emerald-500' : 'bg-red-400'}`} />
                    {p.activo !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-gray-700">{p.variantes?.[0]?.count ?? 0} SKUs</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {p.activo !== false && (
                      <button onClick={() => setSelectedProduct(p)} className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors">
                        Gestionar SKUs
                      </button>
                    )}
                    {p.activo !== false ? (
                      <button onClick={e => darDeBajaProducto(p.id, e)} title="Dar de baja (Soft Delete)" className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <EyeOff size={18} />
                      </button>
                    ) : (
                      <button onClick={e => reactivarProducto(p.id, e)} title="Reactivar producto" className="text-gray-400 hover:text-emerald-600 p-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
