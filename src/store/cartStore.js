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
        return true;
      },

      /**
       * Cambia la cantidad en +1/-1. Elimina el item si llega a 0.
       * No bloquea por stock — se permite vender más del stock registrado.
       */
      updateCantidad: (variante_id, delta) => {
        set((state) => ({
          items: state.items.flatMap(i => {
            if (i.variante_id !== variante_id) return [i];
            const newCant = i.cantidad + delta;
            if (newCant <= 0) return [];
            return [{ ...i, cantidad: newCant }];
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

      /** Stock disponible real = stock - cantidad ya en carrito */
      stockDisponible: (variante_id, stockDB) => {
        const item = get().items.find(i => i.variante_id === variante_id);
        return stockDB - (item?.cantidad ?? 0);
      },
    }),
    { name: 'va-carrito' }
  )
);

export default useCartStore;
