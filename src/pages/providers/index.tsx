import React, { useState, useEffect, useMemo, DragEvent } from "react";
import { supabase } from "../../supabaseClient";
import type { Proveedor } from "./types";
import CrearProveedor from "./CreateProvider";
import EditarProveedor from "./EditProvider";
import VerProveedor from "./ViewProvider";
import EliminarProveedorModal from "./DeleteProviderModal";
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
  Truck,
} from "lucide-react";
import { useAuth } from "../../Context/AuthContext";

type ClaveColumna =
  | "id"
  | "nombre"
  | "contacto"
  | "correo"
  | "telefono"
  | "estado"
  | "acciones";

interface DefinicionColumna {
  key: ClaveColumna;
  label: string;
  width?: string;
}

export default function ProveedoresPage() {
  const { role } = useAuth();

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [consulta, setConsulta] = useState<string>("");
  const [abiertoCrear, setAbiertoCrear] = useState(false);
  const [abiertoEditar, setAbiertoEditar] = useState(false);
  const [abiertoVer, setAbiertoVer] = useState(false);
  const [abiertoEliminar, setAbiertoEliminar] = useState(false);
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [isFilterOpen, setFilterOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"todos" | "activo" | "inactivo">("todos");
  const [ordenColumnas, setOrdenColumnas] = useState<ClaveColumna[]>([
    "id",
    "nombre",
    "contacto",
    "correo",
    "telefono",
    "estado",
    "acciones",
  ]);
  const [claveArrastrada, setClaveArrastrada] = useState<ClaveColumna | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  useEffect(() => {
    cargarProveedores();
  }, []);

  async function cargarProveedores() {
    const { data, error } = await supabase
      .from("providers")
      .select("*")
      .order("id", { ascending: true });
    if (error) {
      console.error("Error cargando proveedores:", error.message);
      setProveedores([]);
    } else {
      const parseados: Proveedor[] = (data || []).map((fila: any) => ({
        id: fila.id,
        nombre: fila.nombre,
        contacto: fila.contacto,
        correo: fila.correo,
        telefono: String(fila.telefono),
        estado: fila.estado,
      }));
      setProveedores(parseados);
    }
  }

  const alCambiarBusqueda = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConsulta(e.target.value);
    setCurrentPage(1);
  };

  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((p) => {
      const nombreMinus = (p.nombre || "").toLowerCase();
      const contactoMinus = (p.contacto || "").toLowerCase();
      const correoMinus = (p.correo || "").toLowerCase();
      const textoBusqueda = consulta.toLowerCase();

      const coincideTexto =
        nombreMinus.includes(textoBusqueda) ||
        contactoMinus.includes(textoBusqueda) ||
        correoMinus.includes(textoBusqueda) ||
        String(p.id).includes(textoBusqueda);

      let coincideEstado = true;
      if (filterStatus === "activo") coincideEstado = p.estado === true;
      else if (filterStatus === "inactivo") coincideEstado = p.estado === false;

      return coincideTexto && coincideEstado;
    });
  }, [proveedores, consulta, filterStatus]);

  const alIniciarArrastre = (e: DragEvent<HTMLTableHeaderCellElement>, clave: ClaveColumna) => {
    setClaveArrastrada(clave);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };
  const alArrastrarSobre = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
  const alSoltarEncabezado = (e: DragEvent<HTMLTableHeaderCellElement>, claveDestino: ClaveColumna) => {
    e.preventDefault();
    if (!claveArrastrada || claveArrastrada === claveDestino) return;
    setOrdenColumnas((prev) => {
      const nuevoOrden = [...prev];
      const desdeIdx = nuevoOrden.indexOf(claveArrastrada);
      const hastaIdx = nuevoOrden.indexOf(claveDestino);
      nuevoOrden.splice(desdeIdx, 1);
      nuevoOrden.splice(hastaIdx, 0, claveArrastrada);
      return nuevoOrden;
    });
    setClaveArrastrada(null);
  };

  const todasColumnas: Record<ClaveColumna, DefinicionColumna> = {
    id: { key: "id", label: "ID PROVEEDOR", width: "100px" },
    nombre: { key: "nombre", label: "NOMBRE", width: "200px" },
    contacto: { key: "contacto", label: "CONTACTO", width: "180px" },
    correo: { key: "correo", label: "CORREO", width: "220px" },
    telefono: { key: "telefono", label: "TELÉFONO", width: "140px" },
    estado: { key: "estado", label: "ESTADO", width: "100px" },
    acciones: { key: "acciones", label: "ACCIONES", width: "120px" },
  };

  const filteredList = proveedoresFiltrados;
  const totalPages = Math.max(1, Math.ceil(filteredList.length / rowsPerPage));
  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pagedProveedores = filteredList.slice(indexOfFirst, indexOfLast);

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  return (
    <div className="p-4 md:p-6 min-h-screen font-sans">
      {/* ─── Encabezado personalizado ─────────────────────────────── */}
      <div className="mb-4">
        <h1 className="flex items-center text-2xl font-bold text-gray-900">
          <Truck className="h-6 w-6 text-black mr-2" />
          Proveedores
        </h1>
        <p className="text-gray-600 text-base">
          Gestiona tus relaciones con proveedores
        </p>
      </div>

      {/* ─── Barra de búsqueda y acciones ─────────────────────────── */}
      <div className="flex flex-col md:flex-row items-center justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex-1">
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
              <Search className="h-5 w-5" />
            </span>
            <input
              type="text"
              value={consulta}
              onChange={alCambiarBusqueda}
              placeholder="Buscar por ID,nombre,contacto..."
              className="w-full border border-gray-200 rounded-lg px-10 py-2 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 hover:border-gray-200 transition"
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
            style={{ height: "38px", paddingTop: 0, paddingBottom: 0, backgroundColor: "white" }}
          >
            Filtrar
          </Button>

          {(role === "admin" || role === "gerente") && (
            <Button
              onPress={() => setAbiertoCrear(true)}
              color="primary"
              startContent={<Plus className="h-5 w-5 mr-1" />}
            >
              Añadir Proveedor
            </Button>
          )}
        </div>
      </div>
      {/* ─────────────────────────────────────────────────────────────── */}

      <div className="bg-white shadow rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                {ordenColumnas.map((clave) => {
                  const col = todasColumnas[clave];
                  return (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={(e) => alIniciarArrastre(e, col.key)}
                      onDragOver={alArrastrarSobre}
                      onDrop={(e) => alSoltarEncabezado(e, col.key)}
                      onDragEnd={() => setClaveArrastrada(null)}
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
              {pagedProveedores.map((prov) => (
                <tr key={prov.id} className="border-t hover:bg-gray-50">
                  {ordenColumnas.map((clave) => {
                    switch (clave) {
                      case "acciones":
                        return (
                          <td
                            key="acciones"
                            className="px-4 py-3 text-gray-800 text-sm flex justify-center space-x-1 items-center"
                          >
                            <button
                              onClick={() => {
                                setProveedorSeleccionado(prov);
                                setAbiertoVer(true);
                              }}
                              title="Ver detalles"
                              className="text-gray-600 hover:text-sky-600 p-1"
                            >
                              <Eye size={18} />
                            </button>

                            {(role === "admin" || role === "gerente") && (
                              <>
                                <button
                                  onClick={() => {
                                    setProveedorSeleccionado(prov);
                                    setAbiertoEditar(true);
                                  }}
                                  title="Editar"
                                  className="text-gray-600 hover:text-blue-600 p-1"
                                >
                                  <Edit size={18} />
                                </button>
                                <button
                                  onClick={() => {
                                    setProveedorSeleccionado(prov);
                                    setAbiertoEliminar(true);
                                  }}
                                  title="Eliminar"
                                  className="text-gray-600 hover:text-red-600 p-1"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </>
                            )}
                          </td>
                        );
                      case "id":
                        return (
                          <td
                            key="id"
                            className="px-4 py-3 text-center text-gray-800 text-sm"
                          >{`SUP-${String(prov.id).padStart(3, "0")}`}</td>
                        );
                      case "nombre":
                        return (
                          <td
                            key="nombre"
                            className="px-4 py-3 text-center text-gray-800 text-sm"
                          >
                            {prov.nombre}
                          </td>
                        );
                      case "contacto":
                        return (
                          <td
                            key="contacto"
                            className="px-4 py-3 text-center text-gray-800 text-sm"
                          >
                            {prov.contacto}
                          </td>
                        );
                      case "correo":
                        return (
                          <td
                            key="correo"
                            className="px-4 py-3 text-center text-gray-800 text-sm"
                          >
                            {prov.correo}
                          </td>
                        );
                      case "telefono":
                        return (
                          <td
                            key="telefono"
                            className="px-4 py-3 text-center text-gray-800 text-sm"
                          >
                            {prov.telefono}
                          </td>
                        );
                      case "estado":
                        return (
                          <td key="estado" className="px-4 py-3 text-center text-sm">
                            {prov.estado ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                Inactivo
                              </span>
                            )}
                          </td>
                        );
                      default:
                        return <td key={clave} className="px-4 py-3 text-center text-sm"></td>;
                    }
                  })}
                </tr>
              ))}

              {pagedProveedores.length === 0 && filteredList.length > 0 && (
                <tr>
                  <td colSpan={ordenColumnas.length} className="px-4 py-6 text-center text-gray-500">
                    No hay proveedores en esta página.
                  </td>
                </tr>
              )}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={ordenColumnas.length} className="px-4 py-6 text-center text-gray-500">
                    No se encontraron proveedores.
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
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
            >
              {[10, 15, 20, 50, 75, 100].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className={`px-3 py-1 rounded ${
                currentPage === 1
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              &lt;
            </button>
            <button disabled className="px-3 py-1 text-sm bg-blue-500 text-white rounded">
              {currentPage}
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ${
                currentPage === totalPages || totalPages === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
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
                Filtrar Proveedores
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
            <div className="p-4">
              <label className="block text-sm mb-1">Estado</label>
              <Select
                selectedKeys={new Set([filterStatus])}
                onSelectionChange={(keys) => {
                  setFilterStatus(Array.from(keys)[0] as any);
                }}
                className="w-full"
                items={[
                  { key: "todos", label: "Todos" },
                  { key: "activo", label: "Activo" },
                  { key: "inactivo", label: "Inactivo" },
                ]}
              >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
            <div className="flex justify-end p-4 border-t space-x-2">
              <Button
                variant="bordered"
                onPress={() => setFilterStatus("todos")}
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

      <CrearProveedor
        isOpen={abiertoCrear}
        onClose={() => setAbiertoCrear(false)}
        onCreated={async (nuevo: Omit<Proveedor, "id" | "estado">) => {
          const { data, error } = await supabase
            .from("providers")
            .insert({ ...nuevo, estado: true })
            .select("*")
            .single();
          if (error) {
            console.error("Error creando proveedor:", error.message);
          } else {
            const creado: Proveedor = {
              id: (data as any).id,
              nombre: (data as any).nombre,
              contacto: (data as any).contacto,
              correo: (data as any).correo,
              telefono: String((data as any).telefono),
              estado: (data as any).estado,
            };
            setProveedores((ant) => [creado, ...ant]);
          }
          setAbiertoCrear(false);
        }}
      />

      {proveedorSeleccionado && (
        <EditarProveedor
          isOpen={abiertoEditar}
          onClose={() => setAbiertoEditar(false)}
          proveedor={proveedorSeleccionado}
          onSaved={async (actualizado: Proveedor) => {
            const { data, error } = await supabase
              .from("providers")
              .update({
                nombre: actualizado.nombre,
                contacto: actualizado.contacto,
                correo: actualizado.correo,
                telefono: actualizado.telefono,
                estado: actualizado.estado,
              })
              .eq("id", actualizado.id)
              .select("*")
              .single();
            if (error) {
              console.error("Error al actualizar proveedor:", error.message);
            } else {
              const provActualizado: Proveedor = {
                id: (data as any).id,
                nombre: (data as any).nombre,
                contacto: (data as any).contacto,
                correo: (data as any).correo,
                telefono: String((data as any).telefono),
                estado: (data as any).estado,
              };
              setProveedores((prev) =>
                prev.map((p) => (p.id === provActualizado.id ? provActualizado : p))
              );
            }
            setAbiertoEditar(false);
          }}
        />
      )}

      {proveedorSeleccionado && (
        <VerProveedor
          isOpen={abiertoVer}
          onClose={() => setAbiertoVer(false)}
          proveedor={proveedorSeleccionado}
        />
      )}

      {proveedorSeleccionado && (
        <EliminarProveedorModal
          isOpen={abiertoEliminar}
          onClose={() => setAbiertoEliminar(false)}
          proveedor={proveedorSeleccionado}
          onDeleted={async (idBorrado: number) => {
            const { error } = await supabase.from("providers").delete().eq("id", idBorrado);
            if (error) {
              console.error("Error al eliminar proveedor:", error.message);
            } else {
              setProveedores((prev) => prev.filter((p) => p.id !== idBorrado));
            }
            setAbiertoEliminar(false);
          }}
        />
      )}
    </div>
  );
}