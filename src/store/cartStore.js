import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find(i => i.variante_id === product.variante_id);
          if (existing) {
            return {
              items: state.items.map(i =>
                i.variante_id === product.variante_id
                  ? { ...i, cantidad: i.cantidad + 1 }
                  : i
              ),
            };
          }
          return { items: [{ ...product, cantidad: 1 }, ...state.items] };
        });
      },

      updateCantidad: (variante_id, delta) => {
        set((state) => ({
          items: state.items.flatMap(i => {
            if (i.variante_id !== variante_id) return [i];
            const newCant = i.cantidad + delta;
            return newCant <= 0 ? [] : [{ ...i, cantidad: newCant }];
          }),
        }));
      },

      removeItem: (variante_id) => {
        set((state) => ({
          items: state.items.filter(i => i.variante_id !== variante_id),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.precio * i.cantidad, 0),
    }),
    {
      name: 'va-carrito', // clave en localStorage
    }
  )
);

export default useCartStore;
