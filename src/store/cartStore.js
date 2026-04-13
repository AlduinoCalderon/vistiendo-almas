import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],

      /**
       * Agrega un item al carrito.
       * Requiere { variante_id, nombre, talla, color, precio, stock }
       * HARD LIMIT: no agrega más del stock disponible. Retorna false si no pudo.
       */
      addItem: (product) => {
        let added = false;
        set((state) => {
          const existing = state.items.find(i => i.variante_id === product.variante_id);
          const stockMax  = product.stock ?? existing?.stock ?? Infinity;

          if (existing) {
            if (existing.cantidad >= stockMax) return state; // límite duro
            added = true;
            return {
              items: state.items.map(i =>
                i.variante_id === product.variante_id
                  ? { ...i, cantidad: i.cantidad + 1 }
                  : i
              ),
            };
          }

          if (stockMax <= 0) return state; // sin stock: bloqueado
          added = true;
          return { items: [{ ...product, cantidad: 1 }, ...state.items] };
        });
        return added;
      },

      /**
       * Cambia la cantidad en +1 / -1.
       * No supera el stock almacenado — elimina el item si llega a 0.
       */
      updateCantidad: (variante_id, delta) => {
        set((state) => ({
          items: state.items.flatMap(i => {
            if (i.variante_id !== variante_id) return [i];
            const newCant = i.cantidad + delta;
            if (newCant <= 0) return [];
            if (newCant > (i.stock ?? Infinity)) return [i]; // tope en stock
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

      /** Unidades aún disponibles para agregar (stock - ya en carrito) */
      stockDisponible: (variante_id, stockDB) => {
        const item = get().items.find(i => i.variante_id === variante_id);
        return stockDB - (item?.cantidad ?? 0);
      },
    }),
    { name: 'va-carrito' }
  )
);

export default useCartStore;
