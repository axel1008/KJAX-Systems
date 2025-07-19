import { useEffect, useState } from "react";
import { supabase } from "../../../supabaseClient";
import type { ClienteProducto } from "./types";
import { TagIcon, Trash2Icon } from "lucide-react";
import EditDiscountModal from "./EditDiscountModal";

interface ListDiscountsProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  reloadKey: number;
  openEditModal?: (row: ClienteProducto | null) => void; // opcional!
}

export default function ListDiscounts({
  isOpen,
  onClose,
  clienteId,
  reloadKey,
  openEditModal,
}: ListDiscountsProps) {
  const [rows, setRows] = useState<ClienteProducto[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados solo usados en modo "local"
  const [isEditOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ClienteProducto | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    loadDiscounts();
    // eslint-disable-next-line
  }, [isOpen, reloadKey]);

  async function loadDiscounts() {
    setLoading(true);
    const { data: cpData, error: cpError } = await supabase
      .from("cliente_producto")
      .select("id, cliente_id, producto_id, descuento, precio_fijo")
      .eq("cliente_id", clienteId)
      .order("id", { ascending: true });
    if (cpError) {
      console.error(cpError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const prodIds = Array.from(
      new Set((cpData || []).map((r: any) => r.producto_id))
    );
    const { data: pData, error: pError } = await supabase
      .from("productos")
      .select("id, nombre, precio_venta, precio_compra")
      .in("id", prodIds)
      .eq("status", true);
    if (pError) {
      console.error(pError.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const prodMap = Object.fromEntries(
      (pData || []).map((p: any) => [p.id, { nombre: p.nombre, precio_venta: p.precio_venta }])
    );

    const joined: ClienteProducto[] = (cpData || []).map((r: any) => {
      const info = prodMap[r.producto_id] || { nombre: "(no encontrado)", precio_venta: null };
      return {
        id: r.id,
        cliente_id: r.cliente_id,
        producto_id: r.producto_id,
        descuento: Number(r.descuento),
        precio_fijo: r.precio_fijo !== null ? Number(r.precio_fijo) : null,
        producto_nombre: info.nombre,
        producto_precio_venta: info.precio_venta,
        producto_precio_compra:
          pData?.find((p: any) => p.id === r.producto_id)?.precio_compra || null,
      };
    });

    setRows(joined);
    setLoading(false);
  }

  const handleDelete = async (row: ClienteProducto) => {
    if (!window.confirm(`¿Eliminar descuento de "${row.producto_nombre}"?`)) return;
    const { error } = await supabase
      .from("cliente_producto")
      .delete()
      .eq("id", row.id);
    if (error) {
      console.error(error.message);
      alert("Error eliminando. Mira la consola.");
    } else {
      loadDiscounts();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="relative bg-white rounded-xl shadow-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Botón “X” azul en la esquina superior */}
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 flex items-center justify-center transition-colors"
          style={{ width: 24, height: 24 }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Descuentos del Cliente #{clienteId}
          </h2>
        </div>

        {/* Botón Añadir */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              if (openEditModal) openEditModal(null);
              else {
                setEditing(null);
                setEditOpen(true);
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
          >
            <TagIcon size={18} className="mr-2" />
            Añadir Descuento
          </button>
        </div>

        {/* Tabla / Loader */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <span className="ml-3 text-gray-700">Cargando…</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-extrabold uppercase text-gray-600">
                    Producto
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-gray-600">
                    Precio venta
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-gray-600">
                    Precio Compra
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-gray-600">
                    % Descuento
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-extrabold uppercase text-gray-600">
                    Precio Fijo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-extrabold uppercase text-gray-600">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{row.producto_nombre}</td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.producto_precio_venta != null
                        ? `₡${row.producto_precio_venta.toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {row.producto_precio_compra != null
                        ? `₡${row.producto_precio_compra.toFixed(2)}`
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {row.descuento.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-blue-600">
                      {row.precio_fijo != null ? `₡${row.precio_fijo.toFixed(2)}` : "N/A"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center space-x-2">
                        {/* Editar */}
                        <button
                          onClick={() => {
                            if (openEditModal) openEditModal(row);
                            else {
                              setEditing(row);
                              setEditOpen(true);
                            }
                          }}
                          title="Editar Descuento"
                          className="text-gray-600 hover:text-yellow-600 transition"
                        >
                          <TagIcon size={18} />
                        </button>
                        {/* Eliminar */}
                        <button
                          onClick={() => handleDelete(row)}
                          title="Eliminar Descuento"
                          className="text-gray-600 hover:text-red-600 transition"
                        >
                          <Trash2Icon size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && !loading && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-500">
                      No hay descuentos asignados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal de creación/edición interno */}
        {!openEditModal && (
          <EditDiscountModal
            isOpen={isEditOpen}
            onClose={() => setEditOpen(false)}
            clienteId={clienteId}
            editing={editing}
            onSaved={async () => {
              setEditOpen(false);
              await loadDiscounts();
            }}
          />
        )}
      </div>
    </div>
  );
}