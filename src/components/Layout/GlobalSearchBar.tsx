// RUTA: src/components/Layout/GlobalSearchBar.tsx

import React from 'react';
import { Icon } from '@iconify/react';
import { useGlobalSearch, SearchScope } from '../../Context/GlobalSearchContext';

const searchScopes: { key: SearchScope; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'facturacion', label: 'Facturación' },
  { key: 'proveedores', label: 'Proveedores' },
  { key: 'cuentas-por-pagar', label: 'Cuentas x Pagar' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'auditoria', label: 'Auditoría' },
];

export const GlobalSearchBar: React.FC = () => {
  const { globalQuery, setGlobalQuery, globalScope, setGlobalScope, executeSearch } = useGlobalSearch();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      executeSearch(globalQuery, globalScope);
    }
  };

  return (
    <div className="flex-1 max-w-2xl mx-4 hidden sm:flex">
      <div className="relative w-full flex items-center border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all shadow-sm">
        {/* Dropdown de Scopes */}
        <div className="relative">
          <select
            value={globalScope}
            onChange={(e) => setGlobalScope(e.target.value as SearchScope)}
            className="h-full pl-4 pr-8 border-none bg-transparent text-slate-600 sm:text-sm focus:ring-0 appearance-none font-medium"
            aria-label="Área de búsqueda"
          >
            {searchScopes.map(scope => (
              <option key={scope.key} value={scope.key}>{scope.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400">
            <Icon icon="lucide:chevron-down" width={16} />
          </div>
        </div>

        {/* Divisor vertical */}
        <div className="h-5 border-l border-slate-300 mx-2" />
        
        {/* Input de Búsqueda */}
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon icon="lucide:search" className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="search"
            name="search"
            id="global-search"
            value={globalQuery}
            onChange={(e) => setGlobalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="block w-full h-full pl-10 pr-3 py-2 border-none rounded-r-lg leading-5 bg-transparent placeholder-slate-400 focus:outline-none focus:ring-0 sm:text-sm"
            placeholder="Buscar y presionar Enter..."
          />
        </div>
      </div>
    </div>
  );
};