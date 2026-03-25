import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, BarChart3, LogOut } from 'lucide-react';

export default function Sidebar({ onLogout }) {
  const links = [
    { to: "/", icon: <ShoppingCart size={24} />, label: "Caja POS" },
    { to: "/inventory", icon: <Package size={24} />, label: "Inventario" },
    { to: "/reports", icon: <BarChart3 size={24} />, label: "Reportes" }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-sm relative z-20">
      <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
          <span className="text-white font-bold text-xl">V</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">Vistiendo Almas</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Panel Auth</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3.5 rounded-xl font-semibold transition-colors ${
                isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {link.icon}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-100">
        <button onClick={onLogout} className="flex items-center space-x-3 text-red-600 hover:bg-red-50 w-full px-4 py-3 rounded-xl font-semibold transition-colors">
          <LogOut size={24} />
          <span>Salir del Sistema</span>
        </button>
      </div>
    </div>
  );
}
