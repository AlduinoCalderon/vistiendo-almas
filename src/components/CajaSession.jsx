import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useCajaStore from '../store/cajaStore';

export default function CajaSession({ user, onSessionActive }) {
  const [loading, setLoading] = useState(true);
  const [montoInicial, setMontoInicial] = useState('0');
  const [error, setError] = useState(null);
  const { sesion, setSesion, loadSesion } = useCajaStore();

  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    // Primero revisar el store (localStorage) — evita query innecesaria en F5
    if (sesion && sesion.cajero_id === user.id) {
      onSessionActive(sesion);
      setLoading(false);
      return;
    }
    // Si no hay nada en store, consultar la BD
    const data = await loadSesion(user.id);
    if (data) onSessionActive(data);
    setLoading(false);
  };

  const abrirCaja = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('sesiones_caja')
        .insert([{
          cajero_id: user.id,
          monto_inicial: parseFloat(montoInicial) || 0,
          estado: 'abierta'
        }])
        .select()
        .single();

      if (error) throw error;

      setSesion(data);
      onSessionActive(data);
    } catch (err) {
      setError(err.message || 'Error al abrir caja');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="bg-emerald-100 text-emerald-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Apertura de Caja</h2>
        <p className="text-gray-500 text-center mb-8">Registra el dinero inicial disponible antes de comenzar.</p>

        <form onSubmit={abrirCaja} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
              Monto Inicial en Caja ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              required
              className="w-full px-4 py-4 text-4xl font-bold text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="0.00"
            />
          </div>
          {error && <div className="text-red-500 text-sm font-semibold text-center bg-red-50 p-3 rounded-lg">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 shadow-md text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 disabled:opacity-50 mt-4">
            Abrir Caja e Iniciar Turno
          </button>
        </form>
      </div>
    </div>
  );
}
