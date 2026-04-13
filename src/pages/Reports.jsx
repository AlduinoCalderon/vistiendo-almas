import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, CalendarDays, DollarSign, Banknote } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCajaStore from '../store/cajaStore';

export default function Reports() {
  const { user, perfil } = useAuthStore();
  const { sesion } = useCajaStore();
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('semana');
  const [efectivoEnCaja, setEfectivoEnCaja] = useState(null);

  const esAdmin = perfil?.rol === 'admin';

  useEffect(() => { fetchVentas(); }, [filtro]);
  useEffect(() => { fetchEfectivoEnCaja(); }, [sesion]);

  const fetchVentas = async () => {
    setLoading(true);
    let dateLimit = new Date();

    let query = supabase
      .from('ventas')
      .select('id, total, created_at, metodo_pago, cajero_id, sesion_id')
      .order('created_at', { ascending: false });

    if (filtro !== 'todos') {
      if (filtro === 'hoy') {
        dateLimit.setHours(0, 0, 0, 0);
      } else if (filtro === 'semana') {
        dateLimit.setDate(dateLimit.getDate() - 7);
      } else if (filtro === 'mes') {
        dateLimit.setMonth(dateLimit.getMonth() - 1);
      }
      query = query.gte('created_at', dateLimit.toISOString());
    }

    if (!esAdmin) query = query.eq('cajero_id', user.id);

    const { data, error } = await query;
    if (error) console.error('[Reports]', error);
    if (data) setVentas(data);
    setLoading(false);
  };

  /**
   * Efectivo en caja = monto_inicial de la sesión activa
   *                  + sum de ventas en efectivo de esa sesión
   */
  const fetchEfectivoEnCaja = async () => {
    if (!sesion) { setEfectivoEnCaja(null); return; }

    const { data } = await supabase
      .from('ventas')
      .select('total')
      .eq('sesion_id', sesion.id)
      .eq('metodo_pago', 'efectivo');

    const ventasEfectivo = (data || []).reduce((s, v) => s + parseFloat(v.total), 0);
    const montoInicial = parseFloat(sesion.monto_inicial || 0);
    setEfectivoEnCaja(montoInicial + ventasEfectivo);
  };

  const totalRecaudado = ventas.reduce((acc, v) => acc + parseFloat(v.total), 0);
  const totalTransacciones = ventas.length;
  const ticketPromedio = totalTransacciones > 0 ? (totalRecaudado / totalTransacciones) : 0;

  const filtroLabel = filtro === 'hoy' ? 'Hoy'
    : filtro === 'semana' ? 'Últimos 7 días'
    : filtro === 'mes' ? 'Últimos 30 días'
    : 'Todos los tiempos';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="mr-3 text-blue-600" />
            Balance de Ventas
          </h2>
          {!esAdmin && <p className="text-sm text-gray-500 mt-1">Mostrando únicamente tus ventas registradas.</p>}
          {esAdmin  && <p className="text-sm text-blue-500 font-medium mt-1">Vista administrador — Todas las ventas del negocio.</p>}
        </div>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          className="bg-white border text-gray-700 px-4 py-2 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold shadow-sm"
        >
          <option value="hoy">Hoy</option>
          <option value="semana">Últimos 7 días</option>
          <option value="mes">Últimos 30 días</option>
          <option value="todos">Todo el histórico</option>
        </select>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-500 flex justify-center items-center">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : (
        <>
          {/* ── Tarjetas de métricas ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
              <div className="p-4 bg-emerald-100 text-emerald-600 rounded-xl mr-4"><DollarSign size={28} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ingresos Totales</p>
                <p className="text-3xl font-bold text-gray-900">${totalRecaudado.toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-xl mr-4"><TrendingUp size={28} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Transacciones</p>
                <p className="text-3xl font-bold text-gray-900">{totalTransacciones}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center">
              <div className="p-4 bg-purple-100 text-purple-600 rounded-xl mr-4"><CalendarDays size={28} /></div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Ticket Promedio</p>
                <p className="text-3xl font-bold text-gray-900">${ticketPromedio.toFixed(2)}</p>
              </div>
            </div>

            {/* Efectivo en caja — solo si hay sesión activa */}
            <div className={`bg-white p-6 rounded-2xl shadow-sm border flex items-center ${
              efectivoEnCaja !== null ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 opacity-60'
            }`}>
              <div className={`p-4 rounded-xl mr-4 ${efectivoEnCaja !== null ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                <Banknote size={28} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Dinero en Caja</p>
                {efectivoEnCaja !== null
                  ? <p className="text-3xl font-bold text-amber-700">${efectivoEnCaja.toFixed(2)}</p>
                  : <p className="text-sm text-gray-400 mt-1">Sin turno activo</p>
                }
              </div>
            </div>
          </div>

          {/* ── Tabla histórico ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-8">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Registro Histórico ({filtroLabel})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="p-4 font-semibold">Ticket ID</th>
                    <th className="p-4 font-semibold">Fecha y Hora</th>
                    <th className="p-4 font-semibold text-center">Método Pago</th>
                    <th className="p-4 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ventas.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-xs text-gray-500">{v.id.split('-')[0]}</td>
                      <td className="p-4 font-medium text-gray-800">{new Date(v.created_at).toLocaleString('es-MX')}</td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase">{v.metodo_pago}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-green-600">${parseFloat(v.total).toFixed(2)}</td>
                    </tr>
                  ))}
                  {ventas.length === 0 && (
                    <tr><td colSpan="4" className="p-8 text-center text-gray-400">Sin ventas en este periodo.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
