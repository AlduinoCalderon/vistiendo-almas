import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout({ user, onLogout }) {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header Superior Minimalista */}
          <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Usuario Activo</p>
              <p className="text-lg font-bold text-gray-900">{user.email}</p>
            </div>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
