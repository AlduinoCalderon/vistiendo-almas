import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useCartStore from '../store/cartStore';
import useCajaStore from '../store/cajaStore';
import { CheckCircle, XCircle } from 'lucide-react';

/**
 * Enfoca el input del scanner después de una venta exitosa.
 */
function focusScanner() {
  setTimeout(() => {
    document.getElementById('scanner-input')?.focus();
  }, 100);
}

export default function Checkout({ cart, cajeroId, sesionId }) {
  const { clearCart } = useCartStore();
  const { sesion }    = useCajaStore();
  const [metodoPago, setMetodoPago]   = useState('efectivo');
  const [pagoCliente, setPagoCliente] = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [ticketExito, setTicketExito] = useState(null);
  const [efectivoCaja, setEfectivoCaja] = useState(null); // efectivo disponible en caja

  const total  = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  const cambio = parseFloat(pagoCliente) - total;
  const pagoValido = metodoPago !== 'efectivo' || parseFloat(pagoCliente) >= total;

  // Re-calcular efectivo en caja cada vez que cambia el carrito (tras venta se vacía)
  useEffect(() => {
    if (!sesion) return;
    const fetchEfectivo = async () => {
      const { data } = await supabase
        .from('ventas')
        .select('total')
        .eq('sesion_id', sesion.id)
        .eq('metodo_pago', 'efectivo');
      const ventasEf = (data || []).reduce((s, v) => s + parseFloat(v.total), 0);
      setEfectivoCaja(parseFloat(sesion.monto_inicial || 0) + ventasEf);
    };
    fetchEfectivo();
  }, [sesion, cart]); // cart cambia al limpiar tras venta

  const procesarCheckout = async () => {
    if (cart.length === 0) return;
    if (!pagoValido) return;

    setLoading(true);
    setError(null);
    setTicketExito(null);

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

      clearCart();
      setPagoCliente('');
      setTicketExito({
        id: data,
        cambio: metodoPago === 'efectivo' ? cambio : null,
      });

      // Auto-dismiss toast y enfoque al scanner
      setTimeout(() => {
        setTicketExito(null);
        focusScanner();
      }, 4000);

      focusScanner();
    } catch (err) {
      setError(err.message || 'Error al procesar la venta. El carrito se conserva para reintentar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Toast de ÉXITO — fixed top-right ───────────────────────── */}
      {ticketExito && (
        <div className="fixed top-6 right-6 z-50 w-80 bg-white border border-emerald-200 rounded-2xl shadow-2xl p-5 animate-slide-in">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={24} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">¡Venta registrada!</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Ticket #{ticketExito.id.substring(0, 8).toUpperCase()}
              </p>
              {ticketExito.cambio !== null && ticketExito.cambio >= 0 && (
                <div className="mt-2 bg-emerald-50 rounded-lg px-3 py-2">
                  <p className="text-emerald-700 font-bold text-lg">
                    Cambio: ${ticketExito.cambio.toFixed(2)}
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">Se cierra en 4 segundos…</p>
            </div>
            <button
              onClick={() => { setTicketExito(null); focusScanner(); }}
              className="text-gray-300 hover:text-gray-500 transition-colors text-lg leading-none"
            >✕</button>
          </div>
          {/* Barra de progreso */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full animate-shrink-bar" />
          </div>
        </div>
      )}

      {/* ── Panel principal de pago ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-start gap-6">

          {/* Método de pago + calculadora de cambio */}
          <div className="w-full md:w-1/2 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pago</label>
              <div className="relative">
                <select
                  value={metodoPago}
                  onChange={(e) => { setMetodoPago(e.target.value); setPagoCliente(''); }}
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

            {/* Calculadora de cambio — solo en efectivo */}
            {metodoPago === 'efectivo' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <label className="block text-sm font-semibold text-amber-800 mb-2">
                  💵 ¿Con cuánto paga el cliente?
                </label>
                <input
                  type="number"
                  step="1"
                  min={total}
                  value={pagoCliente}
                  onChange={e => setPagoCliente(e.target.value)}
                  placeholder={`$${total.toFixed(2)} o más`}
                  className="w-full px-4 py-3 text-2xl font-bold text-center text-gray-900 bg-white border border-amber-300 rounded-xl outline-none focus:ring-2 focus:ring-amber-400"
                />
                {pagoCliente !== '' && (
                  <div className={`mt-3 text-center rounded-lg py-2 px-4 ${cambio >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {cambio >= 0
                      ? (
                        <>
                          <p className="font-bold text-emerald-700 text-xl">Cambio: ${cambio.toFixed(2)}</p>
                          {/* Advertencia si el cambio supera el efectivo disponible */}
                          {efectivoCaja !== null && cambio > efectivoCaja && (
                            <p className="text-amber-700 text-xs font-semibold mt-1">
                              ⚠️ El cambio supera el efectivo en caja (${efectivoCaja.toFixed(2)})
                            </p>
                          )}
                        </>
                      )
                      : <p className="font-bold text-red-600 text-sm">Faltan ${Math.abs(cambio).toFixed(2)} para completar el pago</p>
                    }
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="text-right w-full md:w-auto">
            <div className="text-sm text-gray-500 font-bold mb-1 tracking-widest">TOTAL A PAGAR</div>
            <div className="text-5xl font-black text-blue-900">${total.toFixed(2)}</div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 text-red-600 font-semibold bg-red-50 p-4 rounded-xl border border-red-100 text-sm flex items-start gap-3">
            <XCircle className="flex-shrink-0 mt-0.5" size={18} />
            <span>
              <strong>Error en la transacción:</strong> {error}
              <br />
              <span className="font-normal text-red-500">El carrito se conserva. Verifica el stock e intenta de nuevo.</span>
            </span>
          </div>
        )}

        <button
          onClick={procesarCheckout}
          disabled={loading || cart.length === 0 || !pagoValido}
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
    </>
  );
}
