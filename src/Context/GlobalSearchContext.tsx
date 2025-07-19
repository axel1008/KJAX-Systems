// RUTA: src/Context/GlobalSearchContext.tsx

import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

// Define los posibles ámbitos de búsqueda
export type SearchScope =
  | 'all'
  | 'clientes'
  | 'inventario'
  | 'facturacion'
  | 'proveedores'
  | 'cuentas-por-pagar'
  | 'reportes'
  | 'auditoria';

// Define la estructura del contexto
interface GlobalSearchContextType {
  globalQuery: string;
  setGlobalQuery: (query: string) => void;
  globalScope: SearchScope;
  setGlobalScope: (scope: SearchScope) => void;
  executeSearch: (query: string, scope: SearchScope) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextType | undefined>(undefined);

// Mapea el valor del scope a la ruta de la página correspondiente
const scopeToPathMap: Record<SearchScope, string> = {
  all: '/',
  clientes: '/clients',
  inventario: '/inventory',
  facturacion: '/invoicing',
  proveedores: '/providers',
  'cuentas-por-pagar': '/accounts-payable',
  reportes: '/reports',
  auditoria: '/audit-log',
};

// Componente Proveedor del Contexto
export const GlobalSearchProvider = ({ children }: { children: ReactNode }) => {
  const [globalQuery, setGlobalQuery] = useState('');
  const [globalScope, setGlobalScope] = useState<SearchScope>('all');
  const navigate = useNavigate();

  const executeSearch = (query: string, scope: SearchScope) => {
    // No hacer nada si la búsqueda está vacía
    if (!query.trim()) return;

    const path = scopeToPathMap[scope] || '/';
    
    // Navega a la página correspondiente, pasando la búsqueda como un parámetro en la URL
    // Ejemplo: /proveedores?q=dos%20pinos
    navigate(`${path}?q=${encodeURIComponent(query)}`);
  };

  const value = {
    globalQuery,
    setGlobalQuery,
    globalScope,
    setGlobalScope,
    executeSearch,
  };

  return (
    <GlobalSearchContext.Provider value={value}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

// Hook personalizado para usar el contexto fácilmente
export const useGlobalSearch = () => {
  const context = useContext(GlobalSearchContext);
  if (!context) {
    throw new Error('useGlobalSearch debe ser usado dentro de un GlobalSearchProvider');
  }
  return context;
};