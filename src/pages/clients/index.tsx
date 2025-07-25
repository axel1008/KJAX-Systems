import { useState, useEffect, DragEvent, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import type { Cliente } from "./types";
import { toast } from "react-hot-toast";

// --- Importaciones de componentes de UI y de tu proyecto ---
import {
  Button,
  Select,
  SelectItem,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  TagIcon,
  Users,
  Edit,
  X,
} from "lucide-react";
import { useAuth } from "../../Context/AuthContext";
import { StatusBadge } from "../../components/ui/status-badge";
import CreateClient from "./CreateClient";
import ViewClient from "./ViewClient";
import EditClient from "./EditClient";
import { DeleteClientModal } from "./DeleteClientModal";
import ListDiscounts from "./Discounts/ListDiscounts";
import EditDiscountModal from "./Discounts/EditDiscountModal";
import type { ClienteProducto } from "./Discounts/types";

// --- Tipos para la tabla ---
type ColumnKey =
  | "id"
  | "nombre"
  | "email"
  | "telefono"
  | "status"
  | "acciones";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  width?: string;
}

// --- Componente principal ---
export default function ClientsPage() {
  const { role, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("q") || ""
  );
  const [filterStatus, setFilterStatus] = useState<"todos" | "activos" | "inactivos">("todos");
  
  // Estados de los modales
  const [isAddOpen, setAddOpen] = useState(false);
  const [isViewOpen, setViewOpen] = useState(false);
  const [isEditOpen, setEditOpen] = useState(false);
  const [isDeleteOpen, setDeleteOpen] = useState(false);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [isListDiscountsOpen, setListDiscountsOpen] = useState(false);
  const [isEditDiscountOpen, setEditDiscountOpen] = useState(false);

  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [discountToEdit, setDiscountToEdit] = useState<ClienteProducto | null>(null);
  const [reloadDiscountsKey, setReloadDiscountsKey] = useState(0);
  
  // Estados de la tabla y paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
    "id", "nombre", "email", "telefono", "status", "acciones"
  ]);
  const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("*")
      .order("id", { ascending: true });
    setClients(data || []);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Lógica de filtrado y paginación
  const filteredClients = useMemo(() =>
    clients.filter((c) => {
      const txt = searchQuery.toLowerCase();
      const matchText = c.nombre.toLowerCase().includes(txt) || (c.email ?? "").toLowerCase().includes(txt);
      let matchStatus = true;
      if (filterStatus === "activos") matchStatus = c.status === true;
      if (filterStatus === "inactivos") matchStatus = c.status === false;
      return matchText && matchStatus;
    }),
    [clients, searchQuery, filterStatus]
  );

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize);
  const goToPage = (n: number) => { if (n >= 1 && n <= totalPages) setPage(n); };

  // Lógica de Drag & Drop para columnas
  const onDragStart = (e: DragEvent<HTMLTableHeaderCellElement>, key: ColumnKey) => {
    setDraggedKey(key);
    if(e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
  const onDrop = (e: DragEvent<HTMLTableHeaderCellElement>, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;
    setColumnOrder((cols) => {
      const arr = [...cols];
      const from = arr.indexOf(draggedKey);
      const to = arr.indexOf(targetKey);
      arr.splice(from, 1);
      arr.splice(to, 0, draggedKey);
      return arr;
    });
    setDraggedKey(null);
  };

  const allColumns: Record<ColumnKey, ColumnDef> = {
    id: { key: "id", label: "ID CLIENTE", width: "120px" },
    nombre: { key: "nombre", label: "NOMBRE", width: "220px" },
    email: { key: "email", label: "EMAIL", width: "250px" },
    telefono: { key: "telefono", label: "TELÉFONO", width: "130px" },
    status: { key: "status", label: "ESTADO", width: "100px" },
    acciones: { key: "acciones", label: "ACCIONES", width: "180px" },
  };

  return (
    <div className="p-4 md:p-6 min-h-screen font-sans">
      <div className="mb-4">
        <h1 className="flex items-center text-2xl font-bold text-gray-900">
          <Users className="h-6 w-6 text-black mr-2" />
          Clientes
        </h1>
        <p className="text-gray-600 text-base">
          Gestiona la información de tus clientes
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between mb-4 space-y-3 md:space-y-0">
        <div className="relative w-full md:w-1/4">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={20} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Buscar por nombre o email..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="flex space-x-2 w-full md:w-auto justify-end">
          <Button
            onPress={() => setFilterOpen(true)}
            variant="bordered"
            startContent={<Filter className="h-4 w-4 mr-2 text-gray-500" />}
            endContent={<ChevronDown className="h-4 w-4 ml-1 text-gray-500" />}
            className="hover:bg-gray-200 border border-gray-300"
            style={{ height: "38px", backgroundColor: "white" }}
          >
            Filtrar
          </Button>
          {(role === "admin" || role === "gerente") && (
            <Button
              onPress={() => setAddOpen(true)}
              color="primary"
              startContent={<Plus className="h-5 w-5 mr-1" />}
            >
              Añadir Cliente
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
        <table className="min-w-full text-center table-fixed">
          <thead className="bg-gray-200 border-b border-gray-300">
            <tr>
              {columnOrder.map((colKey) => (
                <th
                  key={colKey}
                  draggable
                  onDragStart={(e) => onDragStart(e, colKey)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, colKey)}
                  onDragEnd={() => setDraggedKey(null)}
                  style={{ width: allColumns[colKey].width }}
                  className={`px-4 py-3 text-center text-xs uppercase tracking-wider cursor-move select-none font-bold text-gray-800 ${
                    draggedKey === colKey ? "opacity-50" : ""
                  }`}
                >
                  {allColumns[colKey].label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedClients.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                {columnOrder.map((colKey) => (
                  <td key={colKey} className="px-4 py-3 text-center text-gray-700 whitespace-nowrap font-normal">
                    {colKey === "acciones" ? (
                      <div className="flex justify-center space-x-1">
                        <Button isIconOnly variant="light" onPress={() => { setSelectedClient(c); setViewOpen(true); }} title="Ver detalles">
                          <Eye size={18} />
                        </Button>
                        {(role === "admin" || role === "gerente") && (
                          <>
                            <Button isIconOnly variant="light" onPress={() => { setSelectedClient(c); setEditOpen(true); }} title="Editar">
                              <Edit size={18} />
                            </Button>
                            <Button isIconOnly variant="light" onPress={() => { setSelectedClient(c); setListDiscountsOpen(true); }} title="Descuentos">
                              <TagIcon size={18} />
                            </Button>
                          </>
                        )}
                      </div>
                    ) : colKey === "id" ? (
                      `CL-${String(c.id).padStart(3, "0")}`
                    ) : colKey === "status" ? (
                      <StatusBadge text={c.status ? "Activo" : "Inactivo"} type={c.status ? "active" : "inactive"} />
                    ) : (
                      c[colKey] ?? "—"
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {paginatedClients.length === 0 && (
              <tr>
                <td colSpan={columnOrder.length} className="py-8 text-center text-gray-500">
                  {filteredClients.length ? "No hay clientes en esta página." : "No se encontraron clientes."}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-gray-100 border-t border-gray-300">
            <tr>
              <td colSpan={columnOrder.length - 1} className="px-4 py-2 text-left text-sm text-gray-700">
                <label htmlFor="pageSizeClients" className="mr-2">Filas:</label>
                <select
                  id="pageSizeClients"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-gray-300 rounded px-2 py-1 focus:outline-none"
                >
                  {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </td>
              <td className="px-4 py-2">
                <div className="flex justify-end items-center space-x-2">
                  <Button size="sm" variant="light" onPress={() => goToPage(page - 1)} isDisabled={page === 1}>&lt;</Button>
                  <span className="text-sm font-medium">{page} de {totalPages}</span>
                  <Button size="sm" variant="light" onPress={() => goToPage(page + 1)} isDisabled={page === totalPages}>&gt;</Button>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* --- MODALES --- */}
      <CreateClient
        isOpen={isAddOpen}
        onClose={() => setAddOpen(false)}
        onCreated={async (nuevo) => {
          try {
            if (!user) { throw new Error("Usuario no autenticado."); }
            const { data, error } = await supabase
              .from("clientes")
              .insert({ ...nuevo, status: true, user_id: user.id })
              .select("*")
              .single();
            if (error) throw error;
            if (data) {
              setClients((cs) => [data, ...cs]);
              setAddOpen(false);
              toast.success("Cliente creado con éxito.");
            }
          } catch (err: any) {
            console.error("Error detallado al crear cliente:", err);
            toast.error("Error al crear cliente: " + err.message);
            console.error(err);
          }
        }}
      />
      
      {selectedClient && (
        <ViewClient isOpen={isViewOpen} onClose={() => setViewOpen(false)} client={selectedClient} />
      )}

      {selectedClient && (
        <EditClient
          isOpen={isEditOpen}
          onClose={() => setEditOpen(false)}
          client={selectedClient}
          onSaved={async (u) => {
            const { data, error } = await supabase
              .from("clientes")
              .update({ ...u, updated_at: new Date().toISOString() })
              .eq("id", u.id)
              .select("*")
              .single();
            if(error) { toast.error("Error al actualizar: " + error.message); }
            else if (data) {
              setClients((cs) => cs.map((c) => (c.id === data.id ? data : c)));
              setEditOpen(false);
              toast.success("Cliente actualizado.");
            }
          }}
        />
      )}

      {selectedClient && (
        <DeleteClientModal
            isOpen={isDeleteOpen}
            onClose={() => setDeleteOpen(false)}
            client={selectedClient}
            onDeleted={async (id) => {
                const { error } = await supabase.from('clientes').update({ status: false }).eq('id', id);
                if (error) { toast.error("Error al desactivar: " + error.message); }
                else {
                    toast.success("Cliente desactivado.");
                    fetchClients();
                    setDeleteOpen(false);
                }
            }}
        />
      )}
      
      {selectedClient && (
        <ListDiscounts
          isOpen={isListDiscountsOpen}
          onClose={() => setListDiscountsOpen(false)}
          clienteId={selectedClient.id}
          reloadKey={reloadDiscountsKey}
          openEditModal={(row) => { setDiscountToEdit(row); setEditDiscountOpen(true); }}
        />
      )}

      {selectedClient && isEditDiscountOpen && (
        <EditDiscountModal
          isOpen={isEditDiscountOpen}
          onClose={() => setEditDiscountOpen(false)}
          clienteId={selectedClient.id}
          editing={discountToEdit}
          onSaved={() => {
            setEditDiscountOpen(false);
            setReloadDiscountsKey((k) => k + 1);
            toast.success("Descuento guardado.");
          }}
        />
      )}

      {isFilterOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      
      {/* 1. Header con ícono y botón de cierre azul */}
      <div className="flex items-center justify-between p-4 border-b relative">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Filter className="text-sky-500" />
          Filtrar Clientes
        </h2>
        <button
          onClick={() => setFilterOpen(false)}
          aria-label="Cerrar filtro"
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
      </div>

      {/* 2. Cuerpo del modal (sin cambios) */}
      <div className="p-4">
        <label className="block text-sm mb-1">Estado</label>
        <Select
          selectedKeys={new Set([filterStatus])}
          onSelectionChange={(keys) =>
            setFilterStatus(Array.from(keys)[0] as any)
          }
          className="w-full"
          items={[
            { key: "todos", label: "Todos" },
            { key: "activos", label: "Activos" },
            { key: "inactivos", label: "Inactivos" },
          ]}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
      </div>

      {/* 3. Footer con botones estilizados */}
      <div className="flex justify-end p-4 border-t space-x-2">
        <Button
          variant="bordered"
          onPress={() => {
            setFilterStatus("todos");
            setFilterOpen(false);
          }}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
        >
          Limpiar
        </Button>
        <Button color="primary" onPress={() => setFilterOpen(false)}>
          Aplicar
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}