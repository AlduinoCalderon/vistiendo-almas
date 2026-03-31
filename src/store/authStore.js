import { create } from 'zustand';
import { supabase } from '../lib/supabase';

const useAuthStore = create((set, get) => ({
  user: null,
  perfil: null,
  loading: true,

  /**
   * Inicializar: suscribirse a onAuthStateChange.
   * En Supabase v2, este listener dispara 'INITIAL_SESSION' inmediatamente
   * si hay una sesión guardada en localStorage, por lo que NO necesitamos
   * llamar a getSession() por separado. Esto evita la race condition que
   * causaba la pérdida de sesión en F5.
   */
  init: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session?.user) {
          set({ user: null, perfil: null, loading: false });
          return;
        }

        // Maneja: INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED
        await get()._loadPerfil(session.user);
      }
    );

    // Retorna la función de cleanup para desuscribir (opcional pero buena práctica)
    return () => subscription.unsubscribe();
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
    // onAuthStateChange disparará SIGNED_OUT y limpiará el estado
  },
}));

export default useAuthStore;
