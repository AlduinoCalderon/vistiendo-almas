import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PackageSearch, Plus, Save, Trash2 } from 'lucide-react';

export default function Inventory() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantes, setVariantes] = useState([]);
  
  // States para forms rápidos (ejemplo simplificado)
  const [nuevoProducto, setNuevoProducto] = useState('');
  
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

  const agregarProducto = async (e) => {
    e.preventDefault();
    if (!nuevoProducto.trim()) return;
    await supabase.from('productos').insert([{ nombre: nuevoProducto }]);
    setNuevoProducto('');
    fetchProductos();
  };

  const eliminarProducto = async (id) => {
    if (confirm("¿Seguro que deseas eliminar este producto y TODAS SUS VARIANTES DE STOCK?")) {
      await supabase.from('productos').delete().eq('id', id);
      if (selectedProduct?.id === id) setSelectedProduct(null);
      fetchProductos();
    }
  };

  // Variantes
  const [nuevaVariante, setNuevaVariante] = useState({ talla: '', color: '', codigo_barras: '', precio: 0, stock: 0 });
  const agregarVariante = async (e) => {
    e.preventDefault();
    await supabase.from('variantes').insert([{ ...nuevaVariante, producto_id: selectedProduct.id }]);
    setNuevaVariante({ talla: '', color: '', codigo_barras: '', precio: 0, stock: 0 });
    fetchVariantes(selectedProduct.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna Izquierda: Productos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[calc(100vh-140px)]">
        <h2 className="text-xl font-bold text-gray-900 flex items-center mb-4"><PackageSearch className="mr-2" /> Catálogo de Productos</h2>
        
        <form onSubmit={agregarProducto} className="flex mb-4 gap-2">
          <input type="text" value={nuevoProducto} onChange={(e)=>setNuevoProducto(e.target.value)} placeholder="Nuevo Producto..." className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors"><Plus /></button>
        </form>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? <p className="text-gray-400">Cargando...</p> : productos.map(p => (
            <div key={p.id} 
              onClick={() => { setSelectedProduct(p); fetchVariantes(p.id); }}
              className={`p-4 border rounded-xl cursor-pointer transition-all flex justify-between items-center ${selectedProduct?.id === p.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:bg-gray-50'}`}>
              <span className="font-semibold text-gray-800">{p.nombre}</span>
              <button onClick={(e) => { e.stopPropagation(); eliminarProducto(p.id); }} className="text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Columna Derecha: Variantes del Producto Seleccionado */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col h-[calc(100vh-140px)]">
        {!selectedProduct ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <PackageSearch size={64} className="mb-4 text-gray-200" />
            <p className="text-lg">Selecciona o crea un producto para administrar sus variantes y stock</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6 border-b pb-4">Variantes y Stock de: <span className="text-blue-600">{selectedProduct.nombre}</span></h2>
            
            <form onSubmit={agregarVariante} className="bg-gray-50 p-4 rounded-xl mb-6 grid grid-cols-5 gap-3 items-end border border-gray-200">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Talla</label><input type="text" required value={nuevaVariante.talla} onChange={e=>setNuevaVariante({...nuevaVariante, talla: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none focus:ring-blue-500"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Color</label><input type="text" required value={nuevaVariante.color} onChange={e=>setNuevaVariante({...nuevaVariante, color: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none focus:ring-blue-500"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Cód. Barras</label><input type="text" required value={nuevaVariante.codigo_barras} onChange={e=>setNuevaVariante({...nuevaVariante, codigo_barras: e.target.value})} className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none focus:ring-blue-500"/></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Precio ($)</label><input type="number" step="0.01" required value={nuevaVariante.precio} onChange={e=>setNuevaVariante({...nuevaVariante, precio: parseFloat(e.target.value)})} className="w-full mt-1 px-3 py-2 border rounded-lg focus:ring-2 outline-none focus:ring-blue-500"/></div>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center">Añadir SKU</button>
            </form>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 sticky top-0">
                  <tr>
                    <th className="p-3">Talla/Color</th>
                    <th className="p-3">Código Barras</th>
                    <th className="p-3">Precio</th>
                    <th className="p-3 text-center">Stock Físico</th>
                    <th className="p-3 text-center">Modificar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {variantes.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{v.talla} | {v.color}</td>
                      <td className="p-3 font-mono text-xs text-gray-500">{v.codigo_barras}</td>
                      <td className="p-3 text-blue-600 font-bold">${v.precio}</td>
                      <td className="p-3 text-center font-bold text-gray-800">{v.stock}</td>
                      <td className="p-3 text-center">
                        <button onClick={async () => {
                           // Ejemplo rápido de actualización de stock (sumar o actualizar)
                           const actStock = prompt("Ingresa el nuevo total de stock disponible:", v.stock);
                           if (actStock !== null && !isNaN(actStock)) {
                             await supabase.from('variantes').update({ stock: parseInt(actStock) }).eq('id', v.id);
                             fetchVariantes(selectedProduct.id);
                           }
                        }} className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg font-semibold text-sm">Ajustar</button>
                      </td>
                    </tr>
                  ))}
                  {variantes.length===0 && <tr><td colSpan="5" className="p-6 text-center text-gray-400">Sin variantes agregadas. Registra el primer SKU.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
