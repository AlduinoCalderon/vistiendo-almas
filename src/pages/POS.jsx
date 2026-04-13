import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import useCajaStore from '../store/cajaStore';
import CajaSession from '../components/CajaSession';
import Scanner from '../components/Scanner';
import Checkout from '../components/Checkout';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function POS() {
  const { user } = useAuthStore();
  const { items, addItem, updateCantidad, removeItem } = useCartStore();
  const { sesion, setSesion } = useCajaStore();

  // ── Escáner HID ───────────────────────────────────────────────────
  const barcodeBufferRef = useRef('');
  const barcodeTimerRef = useRef(null);

  const [sinStockMsg, setSinStockMsg]       = useState(null);
  const [unknownBarcode, setUnknownBarcode] = useState(null); // barcode HID no encontrado

  const handleBarcodeScan = useCallback(async (barcode) => {
    if (!barcode || !sesion) return;
    try {
      const { data } = await supabase
        .from('variantes')
        .select('id, precio, talla, color, stock, codigo_barras, productos!inner(nombre)')
        .eq('codigo_barras', barcode.trim())
        .maybeSingle();

      // No encontrado → delegar Alta Rápida al Scanner
      if (!data) {
        setUnknownBarcode(barcode.trim());
        return;
      }

      // Sin stock → el Scanner lo maneja inline (sinStockItem)
      if (data.stock <= 0) {
        setUnknownBarcode(null);
        setSinStockMsg(`Sin stock: ${data.productos.nombre}. Búscalo y registra existencias.`);
        setTimeout(() => setSinStockMsg(null), 3500);
        return;
      }

      const added = addItem({
        variante_id: data.id,
        nombre: data.productos.nombre,
        talla:  data.talla,
        color:  data.color,
        precio: data.precio,
        stock:  data.stock,
      });

      if (!added) {
        setSinStockMsg(`Máximo alcanzado: ${data.productos.nombre} (stock: ${data.stock})`);
        setTimeout(() => setSinStockMsg(null), 3000);
      }
    } catch (e) { /* escáner no debe bloquear UI */ }
  }, [sesion, addItem]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
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
        barcodeTimerRef.current = setTimeout(() => { barcodeBufferRef.current = ''; }, 80);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); clearTimeout(barcodeTimerRef.current); };
  }, [handleBarcodeScan]);

  // Si no hay sesión activa → pantalla de apertura
  if (!sesion) {
    return <CajaSession user={user} onSessionActive={setSesion} />;
  }

  const fechaApertura = new Date(sesion.fecha_apertura);
  const fechaStr = fechaApertura.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaStr = fechaApertura.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      {/* Toast HID sin stock / máximo */}
      {sinStockMsg && (
        <div className="fixed top-6 right-6 z-50 bg-amber-50 border border-amber-300 rounded-2xl shadow-lg px-5 py-4 text-amber-800 font-semibold text-sm max-w-xs animate-slide-in">
          ⚠️ {sinStockMsg}
        </div>
      )}

      <Scanner
        onProductScanned={addItem}
        unknownBarcode={unknownBarcode}
        onUnknownBarcodeHandled={() => setUnknownBarcode(null)}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              Caja abierta — {fechaStr} {horaStr}
            </h2>
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

      <Checkout cart={items} cajeroId={user.id} sesionId={sesion.id} />
    </div>
  );
}
