import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldCheck, ShieldOff, ChevronDown, UserPlus, X } from 'lucide-react';

// ── Modal Alta de Cajero ─────────────────────────────────────────
function NuevoCajeroModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'cajero' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('crear-cajero', {
        body: {
          email:    form.email.trim(),
          password: form.password,
          nombre:   form.nombre.trim(),
          rol:      form.rol,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Error al crear el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <UserPlus className="text-blue-600" size={22} />
            Alta de Cajero
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo *</label>
            <input
              type="text" required value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })}
              placeholder="ej. María García"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Correo electrónico *</label>
            <input
              type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="cajero@vistiendoalmas.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña inicial *</label>
            <input
              type="password" required minLength={8} value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 8 caracteres"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Rol</label>
            <div className="relative">
              <select
                value={form.rol}
                onChange={e => setForm({ ...form, rol: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-semibold"
              >
                <option value="cajero">Cajero</option>
                <option value="admin">Administrador</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-medium">
              ⚠️ {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <UserPlus size={16} />}
              {loading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Página Usuarios ──────────────────────────────────────────────
export default function Usuarios() {
  const [perfiles, setPerfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showNuevo, setShowNuevo] = useState(false);

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
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const activar = async (userId) => {
    setActionLoading(userId); setError(null);
    const { error: err } = await supabase.rpc('activar_usuario', { p_user_id: userId });
    if (err) setError(err.message);
    else { showSuccess('Usuario activado correctamente.'); await fetchPerfiles(); }
    setActionLoading(null);
  };

  const desactivar = async (userId) => {
    setActionLoading(userId); setError(null);
    const { error: err } = await supabase.rpc('desactivar_usuario', { p_user_id: userId });
    if (err) setError(err.message);
    else { showSuccess('Usuario dado de baja.'); await fetchPerfiles(); }
    setActionLoading(null);
  };

  const cambiarRol = async (userId, nuevoRol) => {
    setActionLoading(userId); setError(null);
    const { error: err } = await supabase.rpc('cambiar_rol', { p_user_id: userId, p_nuevo_rol: nuevoRol });
    if (err) setError(err.message);
    else { showSuccess('Rol actualizado.'); await fetchPerfiles(); }
    setActionLoading(null);
  };

  return (
    <div className="space-y-6">
      {showNuevo && (
        <NuevoCajeroModal
          onClose={() => setShowNuevo(false)}
          onCreated={() => { showSuccess('Usuario creado exitosamente.'); fetchPerfiles(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Administración de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">Gestiona accesos, roles y da de alta nuevos cajeros.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-blue-100 text-blue-800 text-sm font-bold px-4 py-1.5 rounded-full">
            {perfiles.length} usuarios
          </span>
          <button
            onClick={() => setShowNuevo(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            Nuevo Cajero
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {error    && <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">⚠️ {error}</div>}
      {successMsg && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl text-sm font-medium">✅ {successMsg}</div>}

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
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{p.nombre || '—'}</p>
                      <p className="text-xs text-gray-400 font-mono">{p.id.substring(0, 16)}…</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        p.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.activo ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
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
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {p.activo ? (
                          <button onClick={() => desactivar(p.id)} disabled={!!actionLoading}
                            className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === p.id
                              ? <div className="w-3 h-3 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
                              : <ShieldOff size={13} />}
                            Dar de baja
                          </button>
                        ) : (
                          <button onClick={() => activar(p.id)} disabled={!!actionLoading}
                            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50">
                            {actionLoading === p.id
                              ? <div className="w-3 h-3 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                              : <ShieldCheck size={13} />}
                            Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {perfiles.length === 0 && (
                  <tr><td colSpan="4" className="px-6 py-16 text-center text-gray-400">No hay usuarios registrados.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
