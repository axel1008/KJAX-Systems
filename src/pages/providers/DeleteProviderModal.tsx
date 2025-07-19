// src/pages/providers/DeleteProviderModal.tsx

import React from "react";
import type { Proveedor } from "./types";

interface EliminarProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor: Proveedor;
  onDeleted: (id: number) => void;
}

export default function EliminarProveedorModal({
  isOpen,
  onClose,
  proveedor,
  onDeleted,
}: EliminarProveedorModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onDeleted(proveedor.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Eliminar Proveedor</h2>
        <p className="text-gray-700 text-sm mb-6">
          ¿Seguro que deseas eliminar al proveedor “{proveedor.nombre}”? Esta acción no se podrá deshacer.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white text-sm"
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}
