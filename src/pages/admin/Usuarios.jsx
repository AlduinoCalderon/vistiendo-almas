import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, ShieldOff, ChevronDown } from 'lucide-react';

export default function Usuarios() {
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID del perfil en acción
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchPerfiles = async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('perfiles')
      .select('id, nombre, rol, activo, created_at')
      .order('created_at', { ascending: false });

    if (err) setError('Error al cargar usuarios: ' + err.message);
    else setPerfiles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchPerfiles(); }, []);

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const activar = async (userId) => {
    setActionLoading(userId);
    setError(null);
    const { error: err } = await supabase.rpc('activar_usuario', { p_user_id: userId });
    if (err) setError(err.message);
    else { showSuccess('Usuario activado correctamente.'); await fetchPerfiles(); }
    setActionLoading(null);
  };

  const desactivar = async (userId) => {
    setActionLoading(userId);
    setError(null);
    const { error: err } = await supabase.rpc('desactivar_usuario', { p_user_id: userId });
    if (err) setError(err.message);
    else { showSuccess('Usuario dado de baja.'); await fetchPerfiles(); }
    setActionLoading(null);
  };

  const cambiarRol = async (userId, nuevoRol) => {
    setActionLoading(userId);
    setError(null);
    const { error: err } = await supabase.rpc('cambiar_rol', { p_user_id: userId, p_nuevo_rol: nuevoRol });
    if (err) setError(err.message);
    else { showSuccess('Rol actualizado.'); await fetchPerfiles(); }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Administración de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona los accesos y roles del sistema.</p>
        </div>
        <span className="bg-blue-100 text-blue-800 text-sm font-bold px-4 py-1.5 rounded-full">
          {perfiles.length} usuarios
        </span>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm font-medium">
          ✅ {successMsg}
        </div>
      )}

      {/* Tabla */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Usuario</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Rol</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {perfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    {/* Nombre + email (id truncado) */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{p.nombre || '—'}</p>
                        <p className="text-xs text-gray-400 font-mono">{p.id.substring(0, 16)}…</p>
                      </div>
                    </td>

                    {/* Estado */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        p.activo
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* Rol (selector) */}
                    <td className="px-6 py-4">
                      <div className="relative inline-block">
                        <select
                          value={p.rol}
                          onChange={(e) => cambiarRol(p.id, e.target.value)}
                          disabled={!!actionLoading}
                          className="appearance-none bg-gray-100 text-gray-700 font-semibold text-sm px-3 py-1.5 pr-8 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none cursor-pointer disabled:opacity-50"
                        >
                          <option value="cajero">Cajero</option>
                          <option value="admin">Admin</option>
                        </select>
                        <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {p.activo ? (
                          <button
                            onClick={() => desactivar(p.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === p.id
                              ? <div className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin"></div>
                              : <ShieldOff size={13} />
                            }
                            Dar de baja
                          </button>
                        ) : (
                          <button
                            onClick={() => activar(p.id)}
                            disabled={!!actionLoading}
                            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {actionLoading === p.id
                              ? <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin"></div>
                              : <ShieldCheck size={13} />
                            }
                            Aprobar / Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {perfiles.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-6 py-16 text-center text-gray-400">
                      No hay usuarios registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
