// src/pages/inventory/AdjustStockModal.tsx
import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { InventoryItem } from "./types";

interface AdjustStockModalProps {
  item: InventoryItem;
  onClose: () => void;
  onAdjusted: () => void;
}

export default function AdjustStockModal({
  item,
  onClose,
  onAdjusted,
}: AdjustStockModalProps): JSX.Element {
  // 1) Guardamos el stock actual (recibido) en un estado de solo lectura:
  const [stockActual] = useState<number>(item.stock);

  // 2) Campo donde el usuario ingresa cuánto quiere AÑADIR (≥ 1)
  const [cantidadAgregar, setCantidadAgregar] = useState<number>(0);

  // 3) Campo obligatorio: número de factura
  const [factura, setFactura] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Cada vez que abrimos el modal con un producto, reiniciamos los campos
  useEffect(() => {
    setCantidadAgregar(0);
    setFactura("");
    setError("");
    setLoading(false);
  }, [item]);

  const handleSave = async () => {
    // Validaciones:
    if (cantidadAgregar <= 0) {
      setError("Ingresa una cantidad mayor a cero para agregar.");
      return;
    }
    if (!factura.trim()) {
      setError("El número de factura es obligatorio.");
      return;
    }

    setLoading(true);

    // Calculamos el nuevo stock
    const nuevoStock = stockActual + cantidadAgregar;

    // Actualizamos en Supabase: stock y status (true si >0)
    const { error: supabaseError } = await supabase
      .from("productos")
      .update({
        stock: nuevoStock,
        status: nuevoStock > 0,
        // Opcionalmente, podrías guardar el número de factura en otro campo o tabla.
        // Aquí solamente validamos que venga factura, pero no la guardamos en la tabla "productos".
      })
      .eq("id", item.id);

    if (supabaseError) {
      setError(supabaseError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onAdjusted();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">Ajustar Stock</h2>

        {error && (
          <p className="text-sm text-red-600 mb-2 animate-pulse">{error}</p>
        )}

        <div className="space-y-4">
          {/* 1) Stock Actual (solo lectura) */}
          <div>
            <label className="block text-sm font-medium">Stock Actual</label>
            <input
              type="number"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-700 cursor-not-allowed"
              value={stockActual}
              readOnly
            />
          </div>

          {/* 2) Cantidad a Agregar */}
          <div>
            <label className="block text-sm font-medium">
              Cantidad a Agregar
            </label>
            <input
              type="number"
              min="1"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ingresa cuántas unidades añadir"
              value={cantidadAgregar}
              onChange={(e) =>
                setCantidadAgregar(
                  Math.max(0, parseInt(e.currentTarget.value, 10) || 0)
                )
              }
            />
          </div>

          {/* 3) Número de Factura */}
          <div>
            <label className="block text-sm font-medium">Número de Factura *</label>
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-400"
              placeholder="Ej: FAC-12345"
              value={factura}
              onChange={(e) => setFactura(e.currentTarget.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Campo obligatorio para poder guardar el ajuste
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700"
            disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
