import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Ruta protegida que verifica sesión activa y opcionalmente un rol requerido.
 * @param {string} [requiredRole] - Si se especifica, el perfil debe tener ese rol.
 */
export default function ProtectedRoute({ children, requiredRole }) {
  const { user, perfil, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Sin sesión → al login
  if (!user || !perfil) return <Navigate to="/" replace />;

  // Sin rol requerido o inactivo → al login
  if (!perfil.activo) return <Navigate to="/" replace />;

  // Rol insuficiente → al inicio del app
  if (requiredRole && perfil.rol !== requiredRole) return <Navigate to="/pos" replace />;

  return children;
}
