import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onLoginData }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Credenciales inválidas o error de conexión.");
    } else {
      onLoginData(data.user);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-blue-900 mb-2">Vistiendo Almas</h2>
          <p className="text-gray-500 font-medium tracking-wide">PUNTO DE VENTA</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email del Cajero</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
              placeholder="cajero@vistiendoalmas.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200"
            />
          </div>
          {error && <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-lg">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg focus:ring-4 focus:ring-blue-200 text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-4">
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
