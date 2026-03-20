import React, { useState } from 'react';
import Login from './components/Login';
import Scanner from './components/Scanner';
import Checkout from './components/Checkout';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);

  // Si no hay usuario, mostrar login
  if (!user) {
    return <Login onLoginData={setUser} />;
  }

  const handleProductScanned = (product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.variante_id === product.variante_id);
      if (existing) {
        return prevCart.map((item) =>
          item.variante_id === product.variante_id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prevCart, { ...product, cantidad: 1 }];
    });
  };

  const handleRemoveItem = (id) => {
    setCart(cart.filter(item => item.variante_id !== id));
  };

  const handleCheckoutComplete = () => {
    // Vaciar el carrito en venta finalizada con éxito
    setCart([]);
  };

  const handleLogout = async () => {
    setUser(null);
    setCart([]);
  };

  return (
    <div className="container">
      <div className="header flex-between">
        <h1>POS Vistiendo Almas</h1>
        <button onClick={handleLogout} style={{ width: 'auto', backgroundColor: '#ef4444' }}>Salir</button>
      </div>

      <Scanner onProductScanned={handleProductScanned} />

      <div className="card">
        <h2>Carrito Actual</h2>
        {cart.length === 0 ? (
          <p>No hay productos en el carrito.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Talla/Color</th>
                <th>Precio</th>
                <th>Cant.</th>
                <th>Subtotal</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item) => (
                <tr key={item.variante_id}>
                  <td>{item.nombre}</td>
                  <td>{item.talla} / {item.color}</td>
                  <td>${item.precio.toFixed(2)}</td>
                  <td>{item.cantidad}</td>
                  <td>${(item.precio * item.cantidad).toFixed(2)}</td>
                  <td>
                    <button style={{ backgroundColor: '#f59e0b', padding: '0.4rem 0.8rem', width: 'auto' }} onClick={() => handleRemoveItem(item.variante_id)}>
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Checkout cart={cart} cajeroId={user.id} onCheckoutComplete={handleCheckoutComplete} />
    </div>
  );
}
