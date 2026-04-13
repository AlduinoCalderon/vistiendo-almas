import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

/**
 * cajaStore — sesión de caja global y persistente.
 * Una sola sesión activa por cajero. Persiste en localStorage
 * para sobrevivir F5 sin volver a consultar la BD innecesariamente.
 * La BD es la fuente de verdad; siempre se puede re-sincronizar con loadSesion().
 */
const useCajaStore = create(
  persist(
    (set) => ({
      sesion: null,

      setSesion: (s) => set({ sesion: s }),
      clearSesion: () => set({ sesion: null }),

      /**
       * Carga la sesión abierta del cajero desde la BD.
       * Llamar al montar POS o al hacer login para re-sincronizar.
       */
      loadSesion: async (cajeroId) => {
        const { data } = await supabase
          .from('sesiones_caja')
          .select('*')
          .eq('cajero_id', cajeroId)
          .eq('estado', 'abierta')
          .maybeSingle();

        set({ sesion: data ?? null });
        return data ?? null;
      },
    }),
    {
      name: 'caja-sesion-store', // clave en localStorage
    }
  )
);

export default useCajaStore;
