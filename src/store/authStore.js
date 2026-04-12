import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  perfil: null,
  loading: true,

  /**
   * Inicialización híbrida (la más robusta con Supabase v2):
   * 1. getSession()  → resuelve el estado inmediatamente en F5 / reload (evita spinner infinito)
   * 2. onAuthStateChange → maneja cambios futuros: login, logout, refresh de token
   *
   * NO confiamos solo en onAuthStateChange porque INITIAL_SESSION puede llegar
   * con retraso variable, dejando loading=true indefinidamente.
   */
  init: async () => {
    // ── 1. Estado inicial (síncrono desde localStorage de Supabase) ──────────
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      await get()._loadPerfil(session.user);
    } else {
      set({ loading: false });
    }

    // ── 2. Eventos futuros ───────────────────────────────────────────────────
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, perfil: null, loading: false });
        return;
      }

      if (event === 'SIGNED_IN' && session?.user) {
        // Evitar doble carga si el usuario ya es el mismo (ej: TOKEN_REFRESHED implícito)
        if (get().user?.id !== session.user.id) {
          await get()._loadPerfil(session.user);
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Solo actualizar el objeto user con el token nuevo; perfil no cambia
        set({ user: session.user });
        return;
      }

      // INITIAL_SESSION ya fue manejado por getSession() — se omite aquí
    });
  },

  /** Cargar perfil desde public.perfiles y actualizar store */
  _loadPerfil: async (user) => {
    const { data: perfil, error } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('[authStore] No se pudo cargar el perfil:', error.message);
    }

    set({ user, perfil: perfil ?? null, loading: false });
  },

  /** Cerrar sesión — onAuthStateChange se encarga de limpiar el estado */
  signOut: async () => {
    await supabase.auth.signOut();
  },
}));

export default useAuthStore;
