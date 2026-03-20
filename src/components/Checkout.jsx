import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Checkout({ cart, cajeroId, onCheckoutComplete }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const total = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);

  const procesarCheckout = async () => {
    if (cart.length === 0) return;
    
    setLoading(true);
    setError(null);

    // Formatear items para el RPC
    const itemsData = cart.map(item => ({
      variante_id: item.variante_id,
      cantidad: item.cantidad,
      precio_unitario: item.precio
    }));

    try {
      const { data, error: rpcError } = await supabase.rpc('procesar_venta', {
        p_cajero_id: cajeroId,
        p_metodo_pago: metodoPago,
        p_items: itemsData
      });

      if (rpcError) throw rpcError;

      // Éxito limpiamos y avisamos al padre
      alert('Venta Procesada Exitosamente. Ticket ID: ' + data);
      onCheckoutComplete();
      
    } catch (err) {
      console.error("Error procesando venta:", err);
      setError(err.message || 'Ocurrió un error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex-between">
        <div>
          <label style={{ marginRight: '1rem', fontWeight: 'bold' }}>Método de Pago:</label>
          <select 
            value={metodoPago} 
            onChange={(e) => setMetodoPago(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px' }}
          >
            <option value="efectivo">Efectivo</option>
            <option value="tarjeta">Tarjeta (Crédito/Débito)</option>
            <option value="transferencia">Transferencia</option>
          </select>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="total-section">
            Total: ${total.toFixed(2)}
          </div>
        </div>
      </div>

      {error && <div className="error" style={{ marginTop: '1rem' }}>{error}</div>}
      
      <button 
        style={{ marginTop: '1.5rem', backgroundColor: '#10b981' }} 
        onClick={procesarCheckout}
        disabled={loading || cart.length === 0}
      >
        {loading ? 'Procesando Venta...' : 'Completar Venta'}
      </button>
    </div>
  );
}
