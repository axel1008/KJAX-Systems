// src/components/ui/action-toolbar.tsx
import React from 'react';
import { Icon } from '@iconify/react'; // Assuming you use @iconify/react for icons

interface ActionToolbarProps {
  searchPlaceholder?: string;
  currentSearchQuery?: string;
  onSearchChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilter?: () => void;
  onExport?: () => void;
  onCreateNew?: () => void; // Made optional
  filterButtonText?: string;
  exportButtonText?: string;
  createNewButtonText?: string;
  showCreateNewButton?: boolean; // Explicitly control visibility of create new
  showFilterButton?: boolean;
  showExportButton?: boolean;
}

export function ActionToolbar({
  searchPlaceholder = "Buscar...",
  currentSearchQuery,
  onSearchChange,
  onFilter,
  onExport,
  onCreateNew,
  filterButtonText = "Filtrar",
  exportButtonText = "Exportar",
  createNewButtonText = "Crear Nuevo",
  showCreateNewButton = true, // Default to true if onCreateNew is provided
  showFilterButton = true,
  showExportButton = true,
}: ActionToolbarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative w-full sm:w-auto sm:flex-grow max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon icon="lucide:search" className="w-5 h-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={currentSearchQuery}
            onChange={onSearchChange}
            className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm transition-shadow"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-2 flex-wrap justify-center sm:justify-end">
        {onFilter && showFilterButton && (
          <button
            onClick={onFilter}
            className="flex items-center text-sm bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Icon icon="lucide:filter" className="w-4 h-4 mr-2" />
            {filterButtonText}
          </button>
        )}
        {onExport && showExportButton && (
          <button
            onClick={onExport}
            className="flex items-center text-sm bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Icon icon="lucide:download" className="w-4 h-4 mr-2" />
            {exportButtonText}
          </button>
        )}
        {onCreateNew && showCreateNewButton && (
          <button
            onClick={onCreateNew}
            className="flex items-center text-sm bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Icon icon="lucide:plus" className="w-4 h-4 mr-2" />
            {createNewButtonText}
          </button>
        )}
      </div>
    </div>
  );
}
