import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/cartStore';

export default function Checkout({ cart, cajeroId, sesionId }) {
  const { clearCart } = useCartStore();
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const procesarCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    setError(null);

    const itemsData = cart.map(item => ({
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio,
    }));

    try {
      const { data, error: rpcError } = await supabase.rpc('procesar_venta', {
        p_sesion_id: sesionId,
        p_cajero_id: cajeroId,
        p_metodo_pago: metodoPago,
        p_items: itemsData,
      });

      if (rpcError) throw rpcError;

      // ✅ Solo limpiar carrito si la venta fue exitosa
      clearCart();
      alert('✅ Venta procesada. Ticket: ' + data.substring(0, 8).toUpperCase());

    } catch (err) {
      // ❌ Error → carrito se mantiene intacto para reintentar
      setError(err.message || 'Error al procesar la venta. El carrito se conserva para reintentar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-6">
        <div className="w-full md:w-1/3">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pago</label>
          <div className="relative">
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-medium text-gray-700"
            >
              <option value="efectivo">💵 Efectivo</option>
              <option value="tarjeta">💳 Tarjeta (Crédito/Débito)</option>
              <option value="transferencia">🏦 Transferencia</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="text-right w-full md:w-auto">
          <div className="text-sm text-gray-500 font-bold mb-1 tracking-widest">TOTAL A PAGAR</div>
          <div className="text-5xl font-black text-blue-900">${total.toFixed(2)}</div>
        </div>
      </div>

      {error && (
        <div className="mt-4 text-red-600 font-semibold bg-red-50 p-4 rounded-xl border border-red-100 text-sm">
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={procesarCheckout}
        disabled={loading || cart.length === 0}
        className="w-full mt-6 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold py-4 px-6 rounded-xl shadow-lg transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
      >
        {loading ? (
          <span className="flex items-center gap-3">
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Procesando venta...
          </span>
        ) : 'Completar y Cobrar'}
      </button>
    </div>
  );
}
