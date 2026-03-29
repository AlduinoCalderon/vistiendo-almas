import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  perfil: null,
  loading: true,

  /** Inicializar: leer sesión existente y suscribirse a cambios */
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await get()._loadPerfil(session.user);
    } else {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get()._loadPerfil(session.user);
      } else if (event === 'SIGNED_OUT') {
        set({ user: null, perfil: null, loading: false });
      }
    });
  },

  /** Cargar perfil desde public.perfiles */
  _loadPerfil: async (user) => {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('*')
      .eq('id', user.id)
      .single();
    set({ user, perfil, loading: false });
  },

  /** Cerrar sesión */
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, perfil: null });
  },
}));

export default useAuthStore;
