import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../store/authStore';
import useCajaStore from '../store/cajaStore';
import { supabase } from '../lib/supabase';
import { Banknote } from 'lucide-react';

export default function Layout() {
  const { perfil } = useAuthStore();
  const { sesion } = useCajaStore();
  const [efectivoEnCaja, setEfectivoEnCaja] = useState(null);

  useEffect(() => {
    if (!sesion) { setEfectivoEnCaja(null); return; }
    fetchEfectivo();
  }, [sesion]);

  const fetchEfectivo = async () => {
    const { data } = await supabase
      .from('ventas')
      .select('total')
      .eq('sesion_id', sesion.id)
      .eq('metodo_pago', 'efectivo');

    const ventasEfectivo = (data || []).reduce((s, v) => s + parseFloat(v.total), 0);
    setEfectivoEnCaja(parseFloat(sesion.monto_inicial || 0) + ventasEfectivo);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Superior */}
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            {sesion && efectivoEnCaja !== null ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Banknote size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dinero en Caja</p>
                  <p className="text-xl font-black text-amber-700">${efectivoEnCaja.toFixed(2)}</p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Usuario Activo</p>
                <p className="text-lg font-bold text-gray-900">{perfil?.nombre || '—'}</p>
              </div>
            )}
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              perfil?.rol === 'admin'
                ? 'bg-purple-100 text-purple-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              {perfil?.rol === 'admin' ? '⚡ Administrador' : '💼 Cajero'}
            </span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
