import React, { useState, useEffect, useMemo, DragEvent } from "react";
import { supabase } from "../../supabaseClient";
import type { Cliente } from "./types";
import { useAuth } from "../../Context/AuthContext";
import { toast } from "react-hot-toast";
import CreateClient from "./CreateClient";
import EditClient from "./EditClient";
import ViewClient from "./ViewClient";
import { DeleteClientModal } from "./DeleteClientModal";
import ListDiscounts from "./Discounts/ListDiscounts";
import EditDiscountModal from "./Discounts/EditDiscountModal";
import type { ClienteProducto } from "./Discounts/types";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  Button,
  Select,
  SelectItem,
} from "@heroui/react";
import {
  Trash2,
  Plus,
  Search,
  Filter,
  ChevronDown,
  Eye,
  Edit,
  Users,
  TagIcon,
  X,
} from "lucide-react";

type ColumnKey =
  | "id"
  | "nombre"
  | "nombre_comercial"
  | "email"
  | "telefono"
  | "status"
  | "acciones";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  width?: string;
}

export default function ClientsPage() {
  const { role, user } = useAuth();
  const [clients, setClients] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "activos" | "inactivos">("todos");
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
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
    "id", "nombre", "nombre_comercial", "email", "telefono", "status", "acciones"
  ]);
  const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      toast.error("Error cargando clientes: " + error.message);
      setClients([]);
    } else {
      setClients(data || []);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);
useEffect(() => {
  setCurrentPage(1);
}, [filterStatus, searchQuery]);

  const filteredClients = useMemo(() =>
    clients.filter((c) => {
      const txt = searchQuery.toLowerCase();
      const matchText =
        c.nombre.toLowerCase().includes(txt) ||
        (c.email ?? "").toLowerCase().includes(txt) ||
        String(c.id).includes(txt) ||
        (c.nombre_comercial ?? "").toLowerCase().includes(txt); // Agregar búsqueda por nombre comercial
      let matchStatus = true;
      if (filterStatus === "activos") matchStatus = c.status === true;
      else if (filterStatus === "inactivos") matchStatus = c.status === false;
      return matchText && matchStatus;
    }),
    [clients, searchQuery, filterStatus]
  );

  const onDragStart = (e: DragEvent<HTMLTableHeaderCellElement>, key: ColumnKey) => {
    setDraggedKey(key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
  const onDrop = (e: DragEvent<HTMLTableHeaderCellElement>, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;
    setColumnOrder((prev) => {
      const arr = [...prev];
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
    nombre_comercial: { key: "nombre_comercial", label: "NOMBRE COMERCIAL", width: "220px" },
    email: { key: "email", label: "EMAIL", width: "250px" },
    telefono: { key: "telefono", label: "TELÉFONO", width: "130px" },
    status: { key: "status", label: "ESTADO", width: "100px" },
    acciones: { key: "acciones", label: "ACCIONES", width: "180px" },
  };

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / rowsPerPage));
const safePage = Math.min(currentPage, totalPages); // asegura que no haya página vacía
const indexOfLast = safePage * rowsPerPage;
const indexOfFirst = indexOfLast - rowsPerPage;
const pagedClients = filteredClients.slice(indexOfFirst, indexOfLast);

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

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

      <div className="flex flex-col md:flex-row items-center justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex-1">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por ID, nombre o email..."
              className="w-full border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 hover:border-gray-200 transition"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onPress={() => setFilterOpen(true)}
            variant="bordered"
            startContent={<Filter className="h-4 w-4 mr-2 text-gray-500" />}
            endContent={<ChevronDown className="h-4 w-4 ml-1 text-gray-500" />}
            className="hover:bg-gray-300 border border-gray-300"
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

      <div className="bg-white shadow rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                {columnOrder.map((key) => {
                  const col = allColumns[key];
                  return (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={(e) => onDragStart(e, col.key)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, col.key)}
                      onDragEnd={() => setDraggedKey(null)}
                      style={{ width: col.width || "auto" }}
                      className="px-4 py-3 text-center text-xs uppercase tracking-wider cursor-move select-none font-bold text-gray-800 border-b border-gray-300"
                    >
                      {col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {pagedClients.map((client) => (
                <tr key={client.id} className="border-t hover:bg-gray-50">
                  {columnOrder.map((key) => {
                    switch (key) {
                      case "acciones":
                        return (
                          <td key="acciones" className="px-4 py-3 text-gray-800 text-sm flex justify-center space-x-1 items-center">
                            <button onClick={() => { setSelectedClient(client); setViewOpen(true); }} title="Ver detalles" className="text-gray-600 hover:text-sky-600 p-1">
                              <Eye size={18} />
                            </button>
                            {(role === "admin" || role === "gerente") && (
                              <>
                                <button onClick={() => { setSelectedClient(client); setEditOpen(true); }} title="Editar" className="text-gray-600 hover:text-blue-600 p-1">
                                  <Edit size={18} />
                                </button>
                                <button onClick={() => { setSelectedClient(client); setListDiscountsOpen(true); }} title="Descuentos" className="text-gray-600 hover:text-green-600 p-1">
                                  <TagIcon size={18} />
                                </button>
                                <button onClick={() => { setSelectedClient(client); setDeleteOpen(true); }} title="Eliminar/Desactivar" className="text-gray-600 hover:text-red-600 p-1">
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </td>
                        );
                      case "id":
                        return <td key="id" className="px-4 py-3 text-center text-gray-800 text-sm">{`CL-${String(client.id).padStart(3, "0")}`}</td>;
                      case "status":
                        return <td key="status" className="px-4 py-3 text-center text-sm"><StatusBadge text={client.status ? "Activo" : "Inactivo"} type={client.status ? "active" : "inactive"} /></td>;
                      default:
                        return <td key={key} className="px-4 py-3 text-center text-gray-800 text-sm">{client[key] ?? '—'}</td>;
                    }
                  })}
                </tr>
              ))}
              {pagedClients.length === 0 && (
                <tr>
                  <td colSpan={columnOrder.length} className="px-4 py-6 text-center text-gray-500">
                    {filteredClients.length > 0 ? "No hay clientes en esta página." : "No se encontraron clientes."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t">
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-700">Filas por página:</span>
            <select
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none text-sm"
            >
              {[10, 15, 20, 50].map((num) => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            <span className="text-sm text-gray-600 pl-4">
              Mostrando {Math.min(indexOfFirst + 1, filteredClients.length)} - {Math.min(indexOfLast, filteredClients.length)} de {filteredClients.length}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${currentPage === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              &lt;
            </button>
            <button disabled className="px-3 py-1 text-sm bg-blue-500 text-white rounded font-medium">
  {safePage}
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ${currentPage === totalPages || totalPages === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {isFilterOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b relative">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="text-sky-500" />
                Filtrar Clientes
              </h2>
              <button onClick={() => setFilterOpen(false)} aria-label="Cerrar filtro" className="absolute top-2 right-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1 flex items-center justify-center transition-colors" style={{ width: 24, height: 24 }}>
                <X size={14} strokeWidth={3} />
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm mb-1">Estado</label>
              <Select selectedKeys={new Set([filterStatus])} onSelectionChange={(keys) => { setFilterStatus(Array.from(keys)[0] as any); }} className="w-full" items={[{ key: "todos", label: "Todos" }, { key: "activos", label: "Activos" }, { key: "inactivos", label: "Inactivos" }]}>
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
            <div className="flex justify-end p-4 border-t space-x-2">
              <Button variant="bordered" onPress={() => setFilterStatus("todos")} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm">Limpiar</Button>
              <Button color="primary" onPress={() => setFilterOpen(false)}>Aplicar</Button>
            </div>
          </div>
        </div>
      )}

     <CreateClient
  isOpen={isAddOpen}
  onClose={() => setAddOpen(false)}
  onCreated={async (nuevo) => {
    try {
      if (!user) throw new Error("Usuario no autenticado.");
      console.log("Datos enviados a Supabase:", nuevo); // Depuración
      const { data, error } = await supabase
        .from("clientes")
        .insert({ ...nuevo, status: true, user_id: user.id })
        .select("*")
        .single();
      if (error) {
        throw error; // Lanza el error para capturarlo en el catch
      }
      if (data) {
        fetchClients();
        setAddOpen(false);
        toast.success("Cliente creado con éxito.");
      }
    } catch (err: any) {
      console.error("Error detallado:", err); // Muestra el error completo
      toast.error("Error al crear cliente: " + (err.message || "Desconocido"));
    }
  }}
/>

      {selectedClient && <ViewClient isOpen={isViewOpen} onClose={() => setViewOpen(false)} client={selectedClient} />}
      {selectedClient && <EditClient isOpen={isEditOpen} onClose={() => setEditOpen(false)} client={selectedClient} onSaved={async (u) => {
        const { data, error } = await supabase.from("clientes").update({ ...u, updated_at: new Date().toISOString() }).eq("id", u.id).select("*").single();
        if (error) { toast.error("Error al actualizar: " + error.message); }
        else if (data) { fetchClients(); setEditOpen(false); toast.success("Cliente actualizado."); }
      }} />}
      {selectedClient && <DeleteClientModal isOpen={isDeleteOpen} onClose={() => setDeleteOpen(false)} client={selectedClient} onDeleted={async (id) => {
        const { error } = await supabase.from('clientes').update({ status: false }).eq('id', id);
        if (error) { toast.error("Error al desactivar: " + error.message); }
        else { toast.success("Cliente desactivado."); fetchClients(); setDeleteOpen(false); }
      }} />}
      {selectedClient && <ListDiscounts isOpen={isListDiscountsOpen} onClose={() => setListDiscountsOpen(false)} clienteId={selectedClient.id} reloadKey={reloadDiscountsKey} openEditModal={(row) => { setDiscountToEdit(row); setEditDiscountOpen(true); }} />}
      {selectedClient && isEditDiscountOpen && <EditDiscountModal isOpen={isEditDiscountOpen} onClose={() => setEditDiscountOpen(false)} clienteId={selectedClient.id} editing={discountToEdit} onSaved={() => {
        setEditDiscountOpen(false);
        setReloadDiscountsKey((k) => k + 1);
        toast.success("Descuento guardado.");
      }} />}
    </div>
  );
}