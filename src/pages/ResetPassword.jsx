import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase detecta el token en el hash de la URL automáticamente.
    // El evento PASSWORD_RECOVERY confirma que el token es válido.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Error al actualizar la contraseña.');
    } else {
      setDone(true);
      setTimeout(() => navigate('/'), 3000);
    }
  };

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">¡Contraseña actualizada!</h2>
          <p className="text-gray-500 mb-2">Tu contraseña fue cambiada correctamente.</p>
          <p className="text-sm text-gray-400">Redirigiendo al login en 3 segundos...</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Verificando enlace de recuperación...</p>
          <p className="text-sm text-gray-400 mt-2">
            Si esto tarda mucho,{' '}
            <Link to="/forgot-password" className="text-blue-600 hover:underline">
              solicita un nuevo enlace
            </Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Nueva contraseña</h2>
          <p className="text-gray-500 text-sm">Ingresa tu nueva contraseña para continuar.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Repite la contraseña"
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm font-medium text-center bg-red-50 p-3 rounded-lg">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 shadow-md text-white font-bold py-3.5 px-4 rounded-xl transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Actualizando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
