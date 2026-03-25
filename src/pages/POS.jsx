import React, { useState } from 'react';
import CajaSession from '../components/CajaSession';
import Scanner from '../components/Scanner';
import Checkout from '../components/Checkout';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function POS({ user }) {
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState([]);

  if (!session) return <CajaSession user={user} onSessionActive={setSession} />;

  const handleProductScanned = (product) => {
    setCart((prev) => {
      const existing = prev.find(i => i.variante_id === product.variante_id);
      if (existing) return prev.map(i => i.variante_id === product.variante_id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [{ ...product, cantidad: 1 }, ...prev];
    });
  };

  const updateCantidad = (id, delta) => {
    setCart(prev =>
      prev.flatMap(i => {
        if (i.variante_id !== id) return [i];
        const newCant = i.cantidad + delta;
        return newCant <= 0 ? [] : [{ ...i, cantidad: newCant }];
      })
    );
  };

  const removeItem = (id) => setCart(prev => prev.filter(i => i.variante_id !== id));

  const handleCheckoutComplete = () => setCart([]);

  return (
    <div className="space-y-4">
      <Scanner onProductScanned={handleProductScanned} />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">Carrito — Turno #{session.id.substring(0, 8)}</h2>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{cart.length} artículos</span>
        </div>

        {cart.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="font-medium text-lg">Escribe el nombre o escanea un código de barras para comenzar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Producto</th>
                  <th className="px-6 py-3">Variante</th>
                  <th className="px-6 py-3 text-right">Precio u.</th>
                  <th className="px-6 py-3 text-center">Cantidad</th>
                  <th className="px-6 py-3 text-right">Subtotal</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map(item => (
                  <tr key={item.variante_id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-3 font-bold text-gray-900">{item.nombre}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">
                      <span className="bg-gray-100 px-2 py-0.5 rounded mr-1 text-gray-700 font-medium">{item.talla}</span>
                      <span className="border border-gray-200 px-2 py-0.5 rounded text-gray-600">{item.color}</span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-600 font-medium">${item.precio.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => updateCantidad(item.variante_id, -1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors">
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center font-bold text-gray-900">{item.cantidad}</span>
                        <button onClick={() => updateCantidad(item.variante_id, +1)}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-emerald-100 hover:text-emerald-600 flex items-center justify-center transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-gray-900">${(item.precio * item.cantidad).toFixed(2)}</td>
                    <td className="px-6 py-3 text-center">
                      <button onClick={() => removeItem(item.variante_id)}
                        className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Checkout
        cart={cart}
        cajeroId={user.id}
        sesionId={session.id}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </div>
  );
}
