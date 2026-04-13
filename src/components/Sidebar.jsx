import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, LogOut, Shield, User } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useCajaStore from '../store/cajaStore';
import { supabase } from '../lib/supabase';

export default function Sidebar() {
  const { perfil, signOut } = useAuthStore();
  const { sesion, clearSesion } = useCajaStore();
  const [showCorte, setShowCorte] = useState(false);
  const [montoFinal, setMontoFinal] = useState('');
  const [cortando, setCortando] = useState(false);
  const [corteError, setCorteError] = useState(null);

  const links = [
    { to: "/pos",       icon: <ShoppingCart size={22} />, label: "Caja POS"   },
    { to: "/inventory", icon: <Package size={22} />,      label: "Inventario" },
    { to: "/reports",   icon: <BarChart3 size={22} />,    label: "Reportes"   },
  ];

  const handleSalir = () => {
    if (sesion) {
      setMontoFinal('');
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
      const { error } = await supabase.rpc('cerrar_sesion_caja', {
        p_sesion_id: sesion.id,
        p_monto_final: parseFloat(montoFinal) || 0,
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
              Registra el dinero que queda en caja antes de cerrar el turno. Esto cerrará tu sesión.
            </p>

            {sesion && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 text-sm text-gray-600">
                <p>📅 Apertura: <strong>{new Date(sesion.fecha_apertura).toLocaleString('es-MX')}</strong></p>
                <p>💵 Monto inicial: <strong>${parseFloat(sesion.monto_inicial || 0).toFixed(2)}</strong></p>
              </div>
            )}

            <form onSubmit={confirmarCorte} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2 text-center">
                  ¿Cuánto dinero queda en caja? ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={montoFinal}
                  onChange={(e) => setMontoFinal(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-4 py-4 text-4xl font-bold text-center text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent outline-none"
                  placeholder="0.00"
                />
              </div>

              {corteError && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg text-center font-medium">
                  ⚠️ {corteError}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCorte(false)}
                  disabled={cortando}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cortando}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {cortando
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <LogOut size={16} />}
                  {cortando ? 'Cerrando...' : 'Registrar Corte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sidebar principal ───────────────────────────────────── */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm relative z-20">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Vistiendo Almas</h1>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">POS System</p>
          </div>
        </div>

        {/* User info */}
        {perfil && (
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{perfil.nombre || 'Usuario'}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  perfil.rol === 'admin'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {perfil.rol === 'admin' ? '⚡ Admin' : '💼 Cajero'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 p-4 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}

          {perfil?.rol === 'admin' && (
            <>
              <div className="pt-3 pb-1 px-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Administración</p>
              </div>
              <NavLink
                to="/admin/usuarios"
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                    isActive ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <Shield size={22} />
                <span>Usuarios</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Corte / Salir */}
        <div className="p-4 border-t border-gray-100">
          {sesion && (
            <p className="text-xs text-gray-400 text-center mb-2">
              Turno activo desde {new Date(sesion.fecha_apertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          <button
            onClick={handleSalir}
            className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl font-semibold transition-colors ${
              sesion
                ? 'text-amber-700 hover:bg-amber-50'
                : 'text-red-600 hover:bg-red-50'
            }`}
          >
            <LogOut size={22} />
            <span>{sesion ? 'Hacer Corte de Caja' : 'Salir del Sistema'}</span>
          </button>
        </div>
      </div>
    </>
  );
}
