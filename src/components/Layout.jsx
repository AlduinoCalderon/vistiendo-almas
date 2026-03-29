import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import useAuthStore from '../store/authStore';

export default function Layout() {
  const { perfil } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Superior */}
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Usuario Activo</p>
              <p className="text-lg font-bold text-gray-900">{perfil?.nombre || '—'}</p>
            </div>
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
