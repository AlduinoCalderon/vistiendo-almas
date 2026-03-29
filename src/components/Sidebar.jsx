import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, LogOut, Shield, User } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Sidebar() {
  const { perfil, signOut } = useAuthStore();

  const links = [
    { to: "/pos", icon: <ShoppingCart size={22} />, label: "Caja POS" },
    { to: "/inventory", icon: <Package size={22} />, label: "Inventario" },
    { to: "/reports", icon: <BarChart3 size={22} />, label: "Reportes" },
  ];

  return (
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

        {/* Admin section – solo admins */}
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

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={signOut}
          className="flex items-center space-x-3 text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-xl font-semibold transition-colors"
        >
          <LogOut size={22} />
          <span>Salir del Sistema</span>
        </button>
      </div>
    </div>
  );
}
