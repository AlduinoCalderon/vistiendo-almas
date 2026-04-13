import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, LogOut, Shield, User, Banknote, ArrowDownCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCajaStore from '../store/cajaStore';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
  const { perfil, signOut } = useAuthStore();
  const { sesion, clearSesion } = useCajaStore();
  const [showCorte, setShowCorte]       = useState(false);
  const [montoRetiro, setMontoRetiro]   = useState('');  // cuánto se RETIRA físicamente
  const [cortando, setCortando]         = useState(false);
  const [corteError, setCorteError]     = useState(null);
  const [efectivoCaja, setEfectivoCaja] = useState(null);

  const links = [
    { to: "/pos",       icon: <ShoppingCart size={22} />, label: "Caja POS"   },
    { to: "/inventory", icon: <Package size={22} />,      label: "Inventario" },
    { to: "/reports",   icon: <BarChart3 size={22} />,    label: "Reportes"   },
  ];

  // Calcular efectivo en caja al abrir el modal
  useEffect(() => {
    if (!showCorte || !sesion) return;
    const fetchEfectivo = async () => {
      const { data } = await supabase
        .from('ventas')
        .select('total')
        .eq('sesion_id', sesion.id)
        .eq('metodo_pago', 'efectivo');
      const ventas = (data || []).reduce((s, v) => s + parseFloat(v.total), 0);
      setEfectivoCaja(parseFloat(sesion.monto_inicial || 0) + ventas);
    };
    fetchEfectivo();
  }, [showCorte, sesion]);

  const montoRetiroNum = parseFloat(montoRetiro) || 0;
  // Lo que queda para el siguiente turno = efectivo actual - retiro
  const quedaParaSiguiente = efectivoCaja !== null
    ? Math.max(0, efectivoCaja - montoRetiroNum)
    : null;

  const handleSalir = () => {
    if (sesion) {
      setMontoRetiro('');
      setCorteError(null);
      setShowCorte(true);
    } else {
      signOut();
    }
  };

  const confirmarCorte = async (e) => {
    e.preventDefault();
    setCortando(true);
    setCorteError(null);
    try {
      // p_monto_final = lo que se RETIRA (sale del cajón)
      // Lo que "queda para el siguiente turno" se computa en CajaSession al abrir
      const { error } = await supabase.rpc('cerrar_sesion_caja', {
        p_sesion_id:   sesion.id,
        p_monto_final: montoRetiroNum,
      });
      if (error) throw error;
      clearSesion();
      setShowCorte(false);
      signOut();
    } catch (err) {
      setCorteError(err.message || 'Error al cerrar la sesión de caja.');
      setCortando(false);
    }
  };

  return (
    <>
      {/* ── Modal Corte de Caja ─────────────────────────────────── */}
      {showCorte && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
            <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-5">
              <LogOut size={28} />
            </div>
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-1">Corte de Caja</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Indica cuánto efectivo retiras del cajón. Esto cerrará tu sesión.
            </p>

            {/* Resumen del turno */}
            {sesion && (
              <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-600 space-y-1">
                <p>📅 Apertura: <strong>{new Date(sesion.fecha_apertura).toLocaleString('es-MX')}</strong></p>
                <p>💵 Efectivo inicial: <strong>${parseFloat(sesion.monto_inicial || 0).toFixed(2)}</strong></p>
                {efectivoCaja !== null && (
                  <p className="text-amber-700 font-bold border-t border-gray-200 pt-2 mt-2">
                    <Banknote size={14} className="inline mr-1" />
                    Total efectivo en caja ahorita: <span className="text-xl">${efectivoCaja.toFixed(2)}</span>
                  </p>
                )}
              </div>
            )}

            <form onSubmit={confirmarCorte} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                  ¿Cuánto retiras de la caja? ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoRetiro}
                  onChange={(e) => setMontoRetiro(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-4 text-4xl font-bold text-center text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
              </div>

              {/* Desglose: retiro y lo que queda */}
              {montoRetiro !== '' && efectivoCaja !== null && (
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <div className="flex justify-between items-center px-5 py-3 bg-red-50">
                    <span className="text-sm text-red-700 font-semibold flex items-center gap-1.5">
                      <ArrowDownCircle size={16} />
                      Retiro de efectivo
                    </span>
                    <span className="text-2xl font-black text-red-600">${montoRetiroNum.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center px-5 py-3 bg-amber-50">
                    <span className="text-sm text-amber-800 font-semibold">Queda para siguiente turno</span>
                    <span className="text-lg font-black text-amber-700">${quedaParaSiguiente.toFixed(2)}</span>
                  </div>
                  {montoRetiroNum > efectivoCaja && (
                    <div className="px-5 py-2 bg-orange-50 text-orange-700 text-xs font-semibold text-center">
                      ⚠️ No puedes retirar más de lo que hay en caja
                    </div>
                  )}
                </div>
              )}

              {corteError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg text-center font-medium">
                  ⚠️ {corteError}
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCorte(false)} disabled={cortando}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={cortando || montoRetiroNum > (efectivoCaja ?? Infinity)}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {cortando
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <LogOut size={18} />}
                  {cortando ? 'Cerrando...' : 'Registrar Corte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col shadow-sm">
        <div className="px-6 py-6 border-b border-gray-100">
          <h1 className="text-xl font-black text-blue-900 tracking-tight">Vistiendo Almas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Sistema de Punto de Venta</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {links.map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {icon}{label}
            </NavLink>
          ))}

          {perfil?.rol === 'admin' && (
            <>
              <div className="pt-4 pb-1 px-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <Shield size={12} /> Administración
                </p>
              </div>
              <NavLink to="/admin/usuarios"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive ? 'bg-purple-600 text-white shadow-md shadow-purple-200' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <User size={22} />Usuarios
              </NavLink>
            </>
          )}
        </nav>

        <div className="px-4 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl mb-3">
            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
              {perfil?.nombre?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{perfil?.nombre || 'Usuario'}</p>
              <p className="text-xs text-gray-400 capitalize">{perfil?.rol || 'cajero'}</p>
            </div>
          </div>
          <button onClick={handleSalir}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              sesion ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <LogOut size={16} />
            {sesion ? 'Hacer Corte de Caja' : 'Cerrar Sesión'}
          </button>
        </div>
      </aside>
    </>
  );
}
