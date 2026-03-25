import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PackageSearch, Plus, Trash2, X, AlertTriangle, Edit3, Save } from 'lucide-react';

export default function Inventory() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantes, setVariantes] = useState([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState(null);
  const [addForm, setAddForm] = useState({
    nombre: '',
    categoria: '', // Mostrado como Región en la UI
    talla: '',
    color: '',
    codigo_barras: '',
    precio: '',
    stock: ''
  });

  const [deleteConfirm, setDeleteConfirm] = useState(null); // id del producto a borrar
  const [stockAdjust, setStockAdjust] = useState(null); // { id, actual_stock }
  const [newStock, setNewStock] = useState('');

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    const { data } = await supabase.from('productos').select('*').order('created_at', { ascending: false });
    if (data) setProductos(data);
    setLoading(false);
  };

  const fetchVariantes = async (productoId) => {
    const { data } = await supabase.from('variantes').select('*').eq('producto_id', productoId).order('created_at', { ascending: true });
    if (data) setVariantes(data);
  };

  const handleCreateUnifiedProduct = async (e) => {
    e.preventDefault();
    setAddError(null);
    setIsAdding(true);

    try {
      // 1. Validar que no haya otro del mismo codigo de barras para prever error
      const { data: existeCodigo } = await supabase.from('variantes').select('id').eq('codigo_barras', addForm.codigo_barras).maybeSingle();
      if (existeCodigo) throw new Error("Ese código de barras ya está registrado.");

      // 2. Crear producto contenedor
      const { data: prodData, error: prodError } = await supabase
        .from('productos')
        .insert([{ nombre: addForm.nombre, categoria: addForm.categoria }])
        .select()
        .single();
      
      if (prodError) throw prodError;

      // 3. Crear primera variante / SKU obligatorio
      const { error: varError } = await supabase
        .from('variantes')
        .insert([{
           producto_id: prodData.id,
           talla: addForm.talla,
           color: addForm.color,
           codigo_barras: addForm.codigo_barras,
           precio: parseFloat(addForm.precio),
           stock: parseInt(addForm.stock, 10)
        }]);

      if (varError) {
         // Si falla, el producto queda huérfano, borralo por limpieza
         await supabase.from('productos').delete().eq('id', prodData.id);
         throw varError;
      }

      // Éxito
      setIsAddModalOpen(false);
      setAddForm({ nombre: '', categoria: '', talla: '', color: '', codigo_barras: '', precio: '', stock: '' });
      fetchProductos();
    } catch (error) {
       console.error(error);
       setAddError(error.message || "Error inesperado al registrar el producto.");
    } finally {
       setIsAdding(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirm) return;
    await supabase.from('productos').delete().eq('id', deleteConfirm);
    if (selectedProduct?.id === deleteConfirm) setSelectedProduct(null);
    setDeleteConfirm(null);
    fetchProductos();
  };

  const handleStockAdjustSubmit = async (e) => {
     e.preventDefault();
     if (!stockAdjust) return;
     const stockVal = parseInt(newStock, 10);
     if (isNaN(stockVal)) return;

     await supabase.from('variantes').update({ stock: stockVal }).eq('id', stockAdjust.id);
     setStockAdjust(null);
     setNewStock('');
     fetchVariantes(selectedProduct.id);
  };

  // Formulario rápido para añadir variante a producto existente
  const [nuevaVariante, setNuevaVariante] = useState({ talla: '', color: '', codigo_barras: '', precio: '', stock: '' });
  const [varError, setVarError] = useState(null);
  
  const agregarVarianteExistente = async (e) => {
    e.preventDefault();
    setVarError(null);
    try {
      const { error } = await supabase.from('variantes').insert([{ 
        ...nuevaVariante, 
        precio: parseFloat(nuevaVariante.precio),
        stock: parseInt(nuevaVariante.stock, 10),
        producto_id: selectedProduct.id 
      }]);
      if(error) throw error;
      setNuevaVariante({ talla: '', color: '', codigo_barras: '', precio: '', stock: '' });
      fetchVariantes(selectedProduct.id);
    } catch(err) {
      setVarError(err.message || 'Error al guardar variante.');
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
      
      {/* Columna Izquierda: Listado de Productos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[calc(100vh-140px)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center"><PackageSearch className="mr-2" /> Catálogo</h2>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-colors shadow-sm" title="Agregar Producto Completo">
            <Plus size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {loading ? (
            <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-b-2 border-blue-600 rounded-full"></div></div>
          ) : productos.map(p => (
            <div key={p.id} 
              onClick={() => { setSelectedProduct(p); fetchVariantes(p.id); setVarError(null); }}
              className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${
                selectedProduct?.id === p.id 
                ? 'border-blue-500 bg-blue-50 shadow-sm ring-1 ring-blue-500' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}>
              <div>
                <span className="font-bold text-gray-800 block">{p.nombre}</span>
                <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full mt-1 inline-block">Región: {p.categoria}</span>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p.id); }} 
                className="text-gray-400 hover:bg-red-50 hover:text-red-500 p-2 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {productos.length === 0 && !loading && <p className="text-center text-gray-400 pt-10">Agrega un producto para comenzar.</p>}
        </div>
      </div>

      {/* Columna Derecha: Variantes del Producto Seleccionado */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[calc(100vh-140px)]">
        {!selectedProduct ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <PackageSearch size={64} className="mb-4 text-gray-200" />
            <p className="text-lg font-medium text-gray-500">Selecciona o crea un producto para administrar su inventario</p>
          </div>
        ) : (
          <>
            <div className="mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-2xl font-black text-gray-900">{selectedProduct.nombre}</h2>
              <p className="text-sm text-gray-500">Gestiona los SKU asociados a este producto.</p>
            </div>
            
            {/* Formulario Añadir Variante Secundaria */}
            <form onSubmit={agregarVarianteExistente} className="bg-gray-50 p-4 rounded-xl mb-6 grid grid-cols-2 lg:grid-cols-6 gap-3 items-end border border-gray-200">
              <div className="col-span-2 lg:col-span-6 mb-1 text-xs font-bold text-gray-600 uppercase tracking-wider">Añadir otro Tamaño/Color (SKU Adicional)</div>
              <div><input type="text" placeholder="Talla" required value={nuevaVariante.talla} onChange={e=>setNuevaVariante({...nuevaVariante, talla: e.target.value})} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 outline-none focus:ring-emerald-500"/></div>
              <div><input type="text" placeholder="Color" required value={nuevaVariante.color} onChange={e=>setNuevaVariante({...nuevaVariante, color: e.target.value})} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 outline-none focus:ring-emerald-500"/></div>
              <div><input type="text" placeholder="Cód. Barras" required value={nuevaVariante.codigo_barras} onChange={e=>setNuevaVariante({...nuevaVariante, codigo_barras: e.target.value})} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 outline-none focus:ring-emerald-500"/></div>
              <div><input type="number" step="0.01" placeholder="Precio ($)" required value={nuevaVariante.precio} onChange={e=>setNuevaVariante({...nuevaVariante, precio: e.target.value})} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 outline-none focus:ring-emerald-500"/></div>
              <div><input type="number" placeholder="Stock" required value={nuevaVariante.stock} onChange={e=>setNuevaVariante({...nuevaVariante, stock: e.target.value})} className="w-full text-sm px-3 py-2.5 border rounded-lg focus:ring-2 outline-none focus:ring-emerald-500"/></div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center transition-colors shadow-sm">
                 <Save size={16} className="mr-1"/> SKU
              </button>
            </form>
            {varError && <p className="text-red-500 text-sm -mt-4 mb-4 font-semibold">{varError}</p>}

            <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0 shadow-sm">
                  <tr>
                    <th className="p-4 font-semibold">Talla / Color</th>
                    <th className="p-4 font-semibold">Cód. Barras</th>
                    <th className="p-4 font-semibold text-right">Precio</th>
                    <th className="p-4 font-semibold text-center">Existencias Físicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variantes.map(v => (
                    <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded mr-2">{v.talla}</span>
                        <span className="text-gray-600 border px-2 py-1 rounded">{v.color}</span>
                      </td>
                      <td className="p-4 font-mono text-sm text-gray-500">{v.codigo_barras}</td>
                      <td className="p-4 text-right font-black text-blue-600">${v.precio.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-3">
                          <span className={`font-bold text-lg ${v.stock > 0 ? 'text-gray-800' : 'text-red-500'}`}>{v.stock}</span>
                          <button 
                            onClick={() => { setStockAdjust(v); setNewStock(v.stock.toString()); }} 
                            className="text-emerald-600 hover:bg-emerald-100 p-2 rounded-lg font-semibold transition-colors flex items-center"
                            title="Ajustar Inventario Manual"
                          >
                             <Edit3 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {variantes.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-gray-400">Sin inventario. Añade un SKU arriba.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* MODALES SUPERPUESTOS (TAILWIND UI) */}

      {/* Modal 1: Añadir Producto Unificado */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
               <h3 className="font-bold text-lg text-gray-900">Alta de Nuevo Producto en Sistema</h3>
               <button onClick={() => {setIsAddModalOpen(false); setAddError(null)}} className="text-gray-400 hover:text-gray-600"><X /></button>
             </div>
             
             <form onSubmit={handleCreateUnifiedProduct} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nombre Comercial</label>
                    <input type="text" required value={addForm.nombre} onChange={e=>setAddForm({...addForm, nombre: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Blusa de Seda Artesanal" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Región (Categoría)</label>
                    <input type="text" required value={addForm.categoria} onChange={e=>setAddForm({...addForm, categoria: e.target.value})} className="w-full px-4 py-2 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Oaxaca" />
                  </div>
                  
                  <div className="col-span-2 mt-2 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-bold text-blue-900 mb-4">Detalles del Primer Lote (Variante Original)</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Talla</label>
                    <input type="text" required value={addForm.talla} onChange={e=>setAddForm({...addForm, talla: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. M" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Color</label>
                    <input type="text" required value={addForm.color} onChange={e=>setAddForm({...addForm, color: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej. Rojo" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Código de Barras (Único)</label>
                    <input type="text" required value={addForm.codigo_barras} onChange={e=>setAddForm({...addForm, codigo_barras: e.target.value})} className="w-full px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none font-mono" placeholder="Escanee o escriba..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Precio Compra/Venta ($)</label>
                    <input type="number" step="0.01" min="0.01" required value={addForm.precio} onChange={e=>setAddForm({...addForm, precio: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Stock Inicial Físico</label>
                    <input type="number" min="0" required value={addForm.stock} onChange={e=>setAddForm({...addForm, stock: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-700 bg-emerald-50" placeholder="Ej. 10" />
                  </div>
                </div>

                {addError && <p className="text-red-500 text-sm font-semibold p-2 bg-red-50 rounded text-center">{addError}</p>}
                
                <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-2">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                  <button type="submit" disabled={isAdding} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50">
                    {isAdding ? 'Procesando...' : 'Crear Producto y Lote'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* Modal 2: Confirmación Eliminar */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                 <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">¿Borrar todo el Producto?</h3>
              <p className="text-gray-500 mb-6 text-sm">Se eliminará el producto y <strong>todas sus variantes locales irrevocablemente.</strong> ¿Estás seguro de continuar?</p>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-bold transition-colors">Cancelar</button>
                <button onClick={handleDeleteProduct} className="flex-1 py-3 text-white bg-red-600 hover:bg-red-700 rounded-xl font-bold transition-colors shadow-sm">Sí, Eliminar</button>
              </div>
           </div>
        </div>
      )}

      {/* Modal 3: Ajustar Stock */}
      {stockAdjust && (
        <div className="fixed inset-0 bg-gray-900/40 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Ajuste de Inventario Físico</h3>
              <p className="text-sm text-gray-500 mb-5">Ingresa el total exacto que corroboraste en tienda para la variante <span className="font-bold text-gray-800">{stockAdjust.talla} - {stockAdjust.color}</span>.</p>
              
              <form onSubmit={handleStockAdjustSubmit}>
                <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Nuevo Stock Físico Valido</label>
                <input 
                  type="number" 
                  min="0" 
                  required 
                  autoFocus
                  value={newStock} 
                  onChange={e => setNewStock(e.target.value)} 
                  className="w-full text-center text-4xl font-black text-emerald-700 p-4 border-2 border-emerald-200 bg-emerald-50 rounded-xl focus:outline-none focus:border-emerald-500 mb-6"
                />
                
                <div className="flex gap-3 justify-end">
                  <button type="button" onClick={() => setStockAdjust(null)} className="px-5 py-3 text-gray-700 hover:bg-gray-100 rounded-xl font-semibold transition-colors">Cancelar</button>
                  <button type="submit" className="px-6 py-3 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold transition-colors shadow-sm flex items-center">
                    <Save size={18} className="mr-2" /> Guardar Ajuste
                  </button>
                </div>
              </form>
           </div>
        </div>
      )}

    </div>
  );
}
