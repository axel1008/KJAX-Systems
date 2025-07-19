// src/pages/inventory/DeleteInventoryItemModal.tsx

import { useState } from "react";
import { supabase } from "../../supabaseClient";
import { InventoryItem } from "./types";

interface DeleteInventoryItemModalProps {
  item: InventoryItem;
  onClose: () => void;
  onDeleted: () => void;
}

export default function DeleteInventoryItemModal({
  item,
  onClose,
  onDeleted,
}: DeleteInventoryItemModalProps): JSX.Element {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleDelete = async () => {
    setLoading(true);
    const { error: supabaseError } = await supabase
      .from("productos")
      .delete()
      .eq("id", item.id);

    if (supabaseError) {
      setError(supabaseError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onDeleted();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xs p-6">
        <h2 className="text-xl font-semibold mb-4">Confirmar Eliminación</h2>
        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
        <p className="mb-6">
          ¿Está seguro de que desea eliminar el item{" "}
          <span className="font-semibold">"{item.nombre}"</span>? Esta acción no se
          puede deshacer.
        </p>
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
            disabled={loading}
          >
            {loading ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
