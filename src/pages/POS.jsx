import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import CajaSession from '../components/CajaSession';
import Scanner from '../components/Scanner';
import Checkout from '../components/Checkout';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function POS() {
  const { user } = useAuthStore();
  const { items, addItem, updateCantidad, removeItem } = useCartStore();
  const [session, setSession] = useState(null);

  // ----------------------------------------------------------------
  // Escáner de código de barras mediante listener global de teclado.
  // Los scanners HID envían caracteres rápidamente y terminan con Enter.
  // Acumulamos solo si el foco NO está en un input/textarea para no
  // interferir con tipeo normal del usuario.
  // ----------------------------------------------------------------
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef(null);

  const handleBarcodeScan = useCallback(async (barcode) => {
    if (!barcode || !session) return;
    try {
      const { data } = await supabase
        .from('variantes')
        .select('id, precio, talla, color, stock, codigo_barras, productos!inner(nombre)')
        .eq('codigo_barras', barcode.trim())
        .maybeSingle();

      if (data && data.stock > 0) {
        addItem({
          variante_id: data.id,
          nombre: data.productos.nombre,
          talla: data.talla,
          color: data.color,
          precio: data.precio,
        });
      }
    } catch (e) {
      // Ignorar errores silenciosamente – el escáner no debe bloquear la UI
    }
  }, [session, addItem]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      // Si el foco está en un campo de texto, no interceptar
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Enter') {
        clearTimeout(barcodeTimerRef.current);
        const code = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        if (code.length >= 3) handleBarcodeScan(code);
        return;
      }

      if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
        clearTimeout(barcodeTimerRef.current);
        // Si no llega Enter en 80ms asumimos que no es escáner
        barcodeTimerRef.current = setTimeout(() => {
          barcodeBufferRef.current = '';
        }, 80);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearTimeout(barcodeTimerRef.current);
    };
  }, [handleBarcodeScan]);

  if (!session) {
    return <CajaSession user={user} onSessionActive={setSession} />;
  }

  return (
    <div className="space-y-4">
      {/* Búsqueda manual / escáner visual */}
      <Scanner onProductScanned={addItem} />

      {/* Carrito */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Carrito — Turno #{session.id.substring(0, 8)}</h2>
            <p className="text-xs text-gray-400 mt-0.5">El carrito persiste aunque recargues la página 💾</p>
          </div>
          <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
            {items.length} artículos
          </span>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <p className="font-medium text-lg">Escanea un código o busca un producto para comenzar</p>
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
                {items.map(item => (
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
        cart={items}
        cajeroId={user.id}
        sesionId={session.id}
      />
    </div>
  );
}
