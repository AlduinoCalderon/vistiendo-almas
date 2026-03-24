import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function CajaSession({ user, onSessionActive }) {
  const [loading, setLoading] = useState(true);
  const [montoInicial, setMontoInicial] = useState('0');
  const [error, setError] = useState(null);

  useEffect(() => {
    verificarSesion();
  }, []);

  const verificarSesion = async () => {
    try {      
      const { data, error } = await supabase
        .from('sesiones_caja')
        .select('*')
        .eq('cajero_id', user.id)
        .eq('estado', 'abierta')
        .maybeSingle(); // maybeSingle para que no arroje error si no hay
      
      if (data) {
        onSessionActive(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const abrirCaja = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('sesiones_caja')
        .insert([{ cajero_id: user.id, monto_inicial: parseFloat(montoInicial) || 0, estado: 'abierta' }])
        .select()
        .single();
      
      if (error) throw error;
      onSessionActive(data);
    } catch (err) {
      setError(err.message || "Error al abrir caja");
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
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">Apertura de Caja</h2>
        <p className="text-gray-500 text-center mb-8">Debes abrir tu turno registrando el monto base disponible (cambio).</p>
        
        <form onSubmit={abrirCaja} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">Monto Inicial Efectivo ($)</label>
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
            Abrir Turno de Caja
          </button>
        </form>
      </div>
    </div>
  );
}
