import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function SignUp() {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre }, // el trigger lo leerá de raw_user_meta_data
        emailRedirectTo: undefined, // no redirigir automáticamente
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } else {
      setDone(true);
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
          <h2 className="text-2xl font-extrabold text-gray-900 mb-3">¡Cuenta creada exitosamente!</h2>
          <p className="text-gray-500 mb-6 leading-relaxed">
            Tu solicitud de acceso fue recibida. Un administrador deberá <strong>aprobar tu cuenta</strong> antes de que puedas iniciar sesión.
          </p>
          <p className="text-sm text-gray-400 mb-6">Recibirás acceso una vez que el administrador active tu perfil.</p>
          <Link
            to="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition duration-200"
          >
            Volver al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-blue-900 mb-1">Vistiendo Almas</h2>
          <p className="text-gray-500 font-medium tracking-wide">CREAR CUENTA</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Mínimo 6 caracteres"
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
            {loading ? 'Creando cuenta...' : 'Crear mi cuenta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link to="/" className="text-blue-600 font-semibold hover:underline">
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
