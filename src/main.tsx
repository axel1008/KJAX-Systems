// RUTA: src/main.tsx (versión actualizada)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './assets/index.css';

// Se importan todos los proveedores necesarios
import { AuthProvider } from './Context/AuthContext.tsx';
import { NotificationProvider } from './Context/NotificationContext.tsx';
import { WelcomeProvider } from './Context/WelcomeContext.tsx';
import { GlobalSearchProvider } from './Context/GlobalSearchContext.tsx'; // <-- 1. IMPORTAR
import { HeroUIProvider } from './HeroUIProvider.tsx';
import { Toaster } from 'react-hot-toast';

const container = document.getElementById('root');
if (!container) throw new Error('No se encontró el elemento #root');

const root = ReactDOM.createRoot(container);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <HeroUIProvider>
        <AuthProvider>
          {/* 2. ENVOLVER LOS PROVEEDORES QUE NECESITAN NAVEGACIÓN */}
          <GlobalSearchProvider>
            <NotificationProvider>
              <WelcomeProvider>
                <Toaster position="top-right" reverseOrder={false} />
                <App />
              </WelcomeProvider>
            </NotificationProvider>
          </GlobalSearchProvider>
        </AuthProvider>
      </HeroUIProvider>
    </BrowserRouter>
  </React.StrictMode>
);