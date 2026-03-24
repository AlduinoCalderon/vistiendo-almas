import React, { useState } from 'react';
import Login from './components/Login';
import CajaSession from './components/CajaSession';
import Scanner from './components/Scanner';
import Checkout from './components/Checkout';
import './index.css';

export default function App() {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState([]);

  if (!user) {
    return <Login onLoginData={setUser} />;
  }

  if (!session) {
    return <CajaSession user={user} onSessionActive={setSession} />;
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
      return [{ ...product, cantidad: 1 }, ...prevCart]; // nuevo al top
    });
  };

  const handleRemoveItem = (id) => {
    setCart(cart.filter(item => item.variante_id !== id));
  };

  const handleCheckoutComplete = () => {
    setCart([]);
  };

  const handleLogout = async () => {
    setUser(null);
    setSession(null);
    setCart([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 mb-8 shadow-sm relative z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
             <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-inner">
               <span className="text-white font-bold text-xl">V</span>
             </div>
             <div>
               <h1 className="text-xl font-bold text-gray-900 leading-tight">Vistiendo Almas POS</h1>
               <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wide">
                 Caja Abierta • Email: {user.email}
               </p>
             </div>
          </div>
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-500 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Cerrar Sesión / Turno
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6">
        <Scanner onProductScanned={handleProductScanned} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Carrito Actual</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{cart.length} Artículos</span>
          </div>
          
          {cart.length === 0 ? (
            <div className="px-6 py-16 text-center text-gray-400">
               <svg className="w-16 h-16 mx-auto mb-4 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
               </svg>
              <p className="text-lg font-medium">Bip Bip! Escanea un código de barras para añadir productos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="px-6 py-4 font-semibold">Producto</th>
                    <th className="px-6 py-4 font-semibold">Variante</th>
                    <th className="px-6 py-4 font-semibold text-right">Precio unit.</th>
                    <th className="px-6 py-4 font-semibold text-center">Cant.</th>
                    <th className="px-6 py-4 font-semibold text-right">Subtotal</th>
                    <th className="px-6 py-4 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map((item) => (
                    <tr key={item.variante_id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-gray-900">{item.nombre}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-medium bg-gray-100 text-gray-800 mr-2">{item.talla}</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md font-medium border border-gray-200 text-gray-600">{item.color}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-gray-600">
                        ${item.precio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-100">
                          {item.cantidad}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button onClick={() => handleRemoveItem(item.variante_id)} className="text-gray-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 p-2 rounded-lg" title="Quitar item">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Checkout cart={cart} cajeroId={user.id} sesionId={session.id} onCheckoutComplete={handleCheckoutComplete} />
      </main>
    </div>
  );
}
