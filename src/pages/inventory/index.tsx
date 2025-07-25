import React, { useEffect, useState, DragEvent, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Select,
  SelectItem,
} from "@heroui/react";

import { Icon } from "@iconify/react";
import { MetricCard } from "../../components/ui/metric-card";

import {
  Eye,
  Edit,
  Trash2,
  ListChecks,
  Filter,
  Plus,
  ChevronDown,
  X,
  Box,
} from "lucide-react";

import CreateInventoryItem from "./CreateInventoryItem";
import ViewInventoryItem from "./ViewInventoryItem";
import EditInventoryItem from "./EditInventoryItem";
import DeleteInventoryItemModal from "./DeleteInventoryItemModal";
import CreateCategoryModal from "./CreateCategoryModal";
import CategoryModal from "./CategoryModal";

import { ActionToolbar } from "../../components/ui/action-toolbar";
import type { InventoryItem } from "./types";
import { useAuth } from "../../Context/AuthContext";

type ColumnKey =
  | "id"
  | "nombre"
  | "categoria"
  | "stock"
  | "precio_compra"
  | "precio_venta"
  | "proveedor"
  | "status"
  | "acciones";

type DataColumnKey = Exclude<ColumnKey, "acciones">;

interface ColumnMeta {
  key: ColumnKey;
  label: string;
  isFilterable?: boolean;
}

const ALL_COLUMNS: ColumnMeta[] = [
  { key: "id", label: "ID PRODUCTO", isFilterable: true },
  { key: "nombre", label: "NOMBRE", isFilterable: true },
  { key: "categoria", label: "CATEGORÍA", isFilterable: true },
  { key: "stock", label: "STOCK", isFilterable: true },
  { key: "precio_compra", label: "COSTO UNIT.", isFilterable: false },
  { key: "precio_venta", label: "PRECIO VENTA", isFilterable: false },
  { key: "proveedor", label: "PROVEEDOR", isFilterable: true },
  { key: "status", label: "ESTADO", isFilterable: true },
  { key: "acciones", label: "ACCIONES", isFilterable: false },
];

const FILTERABLE_OPTIONS = [
  { key: "categoria", label: "CATEGORÍA" },
  { key: "proveedor", label: "PROVEEDOR" },
  { key: "status", label: "ESTADO" },
] as const;

const STATUS_OPTIONS = [
  { key: "en stock", label: "En Stock" },
  { key: "stock bajo", label: "Stock Bajo" },
  { key: "stock agotado", label: "Stock Agotado" },
  { key: "sobre stock", label: "Sobre Stock" },
  { key: "inactivo", label: "Inactivo" },
];

export default function InventoryPage(): JSX.Element {
  const { role } = useAuth();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get("q") || ""
  );
  const [isInventoryFilterOpen, setIsInventoryFilterOpen] = useState<boolean>(false);
  const [tempFilterColumn, setTempFilterColumn] = useState<DataColumnKey | "">("");
  const [tempFilterValue, setTempFilterValue] = useState<string>("");
  const [appliedFilter, setAppliedFilter] = useState<{
    column: DataColumnKey | null;
    value: string;
  }>({ column: null, value: "" });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);
  const [isCreateCategoryModalOpen, setIsCreateCategoryModalOpen] = useState<boolean>(false);
  const [isManageCategoriesModalOpen, setIsManageCategoriesModalOpen] = useState<boolean>(false);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
    "id",
    "nombre",
    "categoria",
    "stock",
    "precio_compra",
    "precio_venta",
    "proveedor",
    "status",
    "acciones",
  ]);
  const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);

  // Estadísticas para las tarjetas
  const alertStockCount = useMemo(
    () =>
      items.filter(
        (i) => i.stock > i.stock_minimo && i.stock <= i.stock_alert
      ).length,
    [items]
  );
  const sinStockCount = useMemo(
    () => items.filter((i) => (i.stock ?? 0) === 0).length,
    [items]
  );
  const inventoryValue = useMemo(
    () =>
      items.reduce((sum, i) => sum + (i.stock ?? 0) * i.precio_compra, 0),
    [items]
  );

  const formatCRC = (value: number): string =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0,
    }).format(value);

  const onDragStart = (
    e: DragEvent<HTMLTableHeaderCellElement>,
    key: ColumnKey
  ) => {
    setDraggedKey(key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) =>
    e.preventDefault();
  const onDrop = (
    e: DragEvent<HTMLTableHeaderCellElement>,
    targetKey: ColumnKey
  ) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;
    setColumnOrder((prev) => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedKey);
      const toIdx = newOrder.indexOf(targetKey);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedKey);
      return newOrder;
    });
    setDraggedKey(null);
  };

  const fetchItems = async () => {
    setLoading(true);
    const selectQuery = `
      id,
      nombre,
      categoria,
      stock,
      stock_minimo,
      stock_alert,
      stock_maximo,
      unidad,
      precio_compra,
      precio_venta,
      status,
      proveedor_id,
      cabys_code,
      providers!productos_proveedor_id_fkey(id, nombre)
    `;
    const { data, error } = await supabase
      .from("productos")
      .select(selectQuery)
      .order("id", { ascending: true });

    if (error) {
      console.error("Error al obtener productos:", error.message);
      setItems([]);
    } else if (data) {
      const transformed = (data as any[]).map((row: any) => ({
        id: row.id,
        nombre: row.nombre,
        categoria: row.categoria,
        stock: row.stock,
        stock_minimo: row.stock_minimo ?? 0,
        stock_alert: row.stock_alert ?? 0,
        stock_maximo: row.stock_maximo ?? 100,
        unidad: row.unidad ?? "unidad",
        precio_compra: parseFloat(row.precio_compra) || 0,
        precio_venta:
          row.precio_venta !== null ? parseFloat(row.precio_venta) : null,
        proveedor_id: row.proveedor_id,
        proveedor: row.providers?.nombre ?? null,
        status: row.status,
        cabys_code: row.cabys_code ?? null,
      })) as InventoryItem[];
      setItems(transformed);
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setSearchQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const categoriaOptions = useMemo(() => {
    const cats = Array.from(
      new Set(items.map((i) => i.categoria).filter(Boolean))
    );
    return cats.map((cat) => ({ key: cat!, label: cat! }));
  }, [items]);

  const proveedorOptions = useMemo(() => {
    const provs = Array.from(
      new Set(items.map((i) => i.proveedor).filter(Boolean))
    );
    return provs.map((prov) => ({ key: prov!, label: prov! }));
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        const q = searchQuery.toLowerCase();
        let matches =
          i.nombre.toLowerCase().includes(q) ||
          (i.categoria ?? "").toLowerCase().includes(q) ||
          (i.proveedor ?? "").toLowerCase().includes(q) ||
          (i.cabys_code ?? "").includes(q) ||
          `prod-${String(i.id).padStart(3, "0")}`.includes(q);
        if (!matches) return false;

        if (appliedFilter.column && appliedFilter.value) {
          if (appliedFilter.column === "categoria") {
            return i.categoria === appliedFilter.value;
          }
          if (appliedFilter.column === "proveedor") {
            return i.proveedor === appliedFilter.value;
          }
          if (appliedFilter.column === "status") {
            let statusLabel = "En Stock";
            if (i.stock! <= i.stock_minimo) statusLabel = "Stock Agotado";
            else if (i.stock! <= i.stock_alert) statusLabel = "Stock Bajo";
            else if (!i.status) statusLabel = "Inactivo";
            else if (i.stock! > i.stock_maximo) statusLabel = "Sobre Stock";
            return (
              statusLabel.toLowerCase() === appliedFilter.value.toLowerCase()
            );
          }
        }
        return true;
      }),
    [items, searchQuery, appliedFilter]
  );

  const indexOfLast = currentPage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const pagedItems = filteredItems.slice(indexOfFirst, indexOfLast);
  const totalPagesCount = Math.max(
    1,
    Math.ceil(filteredItems.length / rowsPerPage)
  );

  useEffect(() => {
    if (currentPage > totalPagesCount && totalPagesCount > 0)
      setCurrentPage(totalPagesCount);
    else if (totalPagesCount === 0 && currentPage !== 1) setCurrentPage(1);
  }, [currentPage, totalPagesCount]);

  const handleChangeRowsPerPage = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNextPage = () =>
    setCurrentPage((p) => Math.min(p + 1, totalPagesCount));
  const handleOpenFilterModal = () => {
    setIsInventoryFilterOpen(true);
    setTempFilterColumn(appliedFilter.column || "");
    setTempFilterValue(appliedFilter.value);
  };
  const handleApplyFilters = () => {
    setAppliedFilter({ column: tempFilterColumn || null, value: tempFilterValue });
    setCurrentPage(1);
    setIsInventoryFilterOpen(false);
  };
  const handleClearFiltersWithoutClose = () => {
    setTempFilterColumn("");
    setTempFilterValue("");
    setAppliedFilter({ column: null, value: "" });
    setCurrentPage(1);
  };

  const renderRow = (item: InventoryItem) => {
    const porcentajeStock =
      item.stock_maximo > item.stock_minimo
        ? Math.min(
            100,
            Math.max(
              0,
              ((item.stock - item.stock_minimo) /
                (item.stock_maximo - item.stock_minimo)) *
                100
            )
          )
        : item.stock > 0
        ? 100
        : 0;
    let colorBar = "bg-green-300";
    if (item.stock <= item.stock_minimo) colorBar = "bg-red-300";
    else if (item.stock <= item.stock_alert) colorBar = "bg-yellow-300";
    else if (item.stock > item.stock_maximo) colorBar = "bg-blue-300";

    let statusLabel = "En Stock";
    let statusColor = "bg-green-100 text-green-800";
    if (item.stock <= item.stock_minimo) {
      statusLabel = "Stock Agotado";
      statusColor = "bg-red-100 text-red-800";
    } else if (item.stock <= item.stock_alert) {
      statusLabel = "Stock Bajo";
      statusColor = "bg-yellow-100 text-yellow-800";
    } else if (item.stock > item.stock_maximo) {
      statusLabel = "Sobre Stock";
      statusColor = "bg-blue-100 text-blue-800";
    }
    if (!item.status && statusLabel === "En Stock") {
      statusLabel = "Inactivo";
      statusColor = "bg-slate-100 text-slate-800";
    }

    return (
      <tr key={item.id} className="border-t hover:bg-gray-50">
        {columnOrder.map((colKey) => {
          const colMeta = ALL_COLUMNS.find((c) => c.key === colKey)!;
          const width = colMeta.key === "acciones"
            ? "160px"
            : colMeta.key === "id"
            ? "100px"
            : colMeta.key === "nombre"
            ? "200px"
            : colMeta.key === "categoria"
            ? "200px"
            : colMeta.key === "stock"
            ? "120px"
            : colMeta.key === "precio_compra"
            ? "140px"
            : colMeta.key === "precio_venta"
            ? "140px"
            : colMeta.key === "proveedor"
            ? "180px"
            : colMeta.key === "status"
            ? "120px"
            : "auto";
          const cellStyle = { width };

          switch (colKey) {
            case "id":
              return (
                <td
                  key="id"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center whitespace-nowrap"
                >
                  {`PROD-${String(item.id).padStart(3, "0")}`}
                </td>
              );
            case "nombre":
              return (
                <td
                  key="nombre"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center"
                >
                  {item.nombre}
                </td>
              );
            case "categoria":
              return (
                <td
                  key="categoria"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center"
                >
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {item.categoria ?? "N/A"}
                  </span>
                </td>
              );
            case "stock":
              return (
                <td
                  key="stock"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center"
                >
                  <div className="flex flex-col items-center space-y-1">
                    <span className="text-sm font-medium text-gray-700">
                      {item.stock}
                    </span>
                    <span className="text-xs font-semibold text-gray-600">{`${Math.round(
                      porcentajeStock
                    )}%`}</span>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`${colorBar} h-full transition-all duration-500`}
                        style={{ width: `${porcentajeStock}%` }}
                      />
                    </div>
                  </div>
                </td>
              );
            case "precio_compra":
              return (
                <td
                  key="precio_compra"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center whitespace-nowrap"
                >
                  {formatCRC(item.precio_compra)}
                </td>
              );
            case "precio_venta":
              return (
                <td
                  key="precio_venta"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center whitespace-nowrap"
                >
                  {item.precio_venta !== null
                    ? formatCRC(item.precio_venta)
                    : "N/A"}
                </td>
              );
            case "proveedor":
              return (
                <td
                  key="proveedor"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm text-center"
                >
                  {item.proveedor ?? "—"}
                </td>
              );
            case "status":
              return (
                <td
                  key="status"
                  style={cellStyle}
                  className="px-4 py-3 text-sm text-center"
                >
                  <span
                    className={`inline-block ${statusColor} text-xs px-2 py-1 rounded`}
                  >
                    {statusLabel}
                  </span>
                </td>
              );
            case "acciones":
              return (
                <td
                  key="acciones"
                  style={cellStyle}
                  className="px-4 py-3 text-gray-800 text-sm"
                >
                  <div className="flex justify-center space-x-2">
                    <Button
                      isIconOnly
                      variant="shadow-none"
                      size="sm"
                      className="text-gray-600 hover:text-blue-500"
                      onPress={() => setViewItem(item)}
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </Button>
                    {(role === "admin" || role === "gerente") && (
                      <>
                        <Button
                          isIconOnly
                          variant="shadow-none"
                          size="sm"
                          className="text-gray-600 hover:text-blue-600"
                          onPress={() => setEditItem(item)}
                          title="Editar"
                        >
                          <Edit size={18} />
                        </Button>
                        <Button
                          isIconOnly
                          variant="shadow-none"
                          size="sm"
                          className="text-gray-600 hover:text-red-600"
                          onPress={() => setDeleteItem(item)}
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              );
            default:
              return (
                <td
                  key={colMeta.key}
                  style={cellStyle}
                  className="px-4 py-3 text-center text-gray-800"
                >
                  —
                </td>
              );
          }
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-6 p-4">
      <div>
        <h1 className="flex items-center text-2xl font-bold">
          <Box className="h-6 w-6 text-black mr-2" />
          Inventario
        </h1>
        <p className="text-gray-600">
          Gestiona el stock de productos terminados e ingredientes
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <MetricCard
          title="Stock en Alerta"
          value={alertStockCount}
          icon={
            <Icon
              icon="lucide:alert-triangle"
              className="text-yellow-500"
              width={24}
              height={24}
            />
          }
        />
        <MetricCard
          title="Sin Stock"
          value={sinStockCount}
          icon={
            <Icon
              icon="lucide:x-circle"
              className="text-red-500"
              width={24}
              height={24}
            />
          }
        />
        <MetricCard
          title="Valor de Inventario"
          value={formatCRC(inventoryValue)}
          icon={
            <Icon
              icon="heroicons:banknotes-solid"
              className="text-green-500"
              width={24}
              height={24}
            />
          }
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 my-2">
        <div className="flex-1">
          <ActionToolbar
            searchPlaceholder="Buscar por ID, nombre, categoría, proveedor, código CABYS..."
            currentSearchQuery={searchQuery}
            onSearchChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            showFilterButton={false}
          />
        </div>

        {/* --- INICIO: CAMBIO DE ORDEN DE BOTONES --- */}
        <div className="flex space-x-2 w-full sm:w-auto justify-end">
          {(role === "admin" || role === "gerente") && (
            <>
              <Button
                onPress={() => setIsManageCategoriesModalOpen(true)}
                variant="ghost"
                color="warning"
                startContent={<ListChecks className="mr-1" size={20} />}
              >
                Categorías
              </Button>
              <Button
                onPress={handleOpenFilterModal}
                variant="bordered"
                startContent={<Filter className="h-4 w-4 mr-2 text-gray-500" />}
                endContent={<ChevronDown className="h-4 w-4 ml-1 text-gray-500" />}
                className="hover:bg-gray-300 border border-gray-300"
                style={{
                  height: "38px",
                  paddingTop: 0,
                  paddingBottom: 0,
                  backgroundColor: "white",
                }}
              >
                Filtrar
              </Button>
              <Button
                color="primary"
                onPress={() => setIsCreateOpen(true)}
                startContent={<Plus className="mr-1" size={20} />}
              >
                Añadir Producto
              </Button>
            </>
          )}
          {/* Si el rol no es admin/gerente, el botón de filtrar aún debe mostrarse */}
          {!(role === "admin" || role === "gerente") && (
               <Button
                onPress={handleOpenFilterModal}
                variant="bordered"
                startContent={<Filter className="h-4 w-4 mr-2 text-gray-500" />}
                endContent={<ChevronDown className="h-4 w-4 ml-1 text-gray-500" />}
                className="hover:bg-gray-300 border border-gray-300"
                style={{
                  height: "38px",
                  paddingTop: 0,
                  paddingBottom: 0,
                  backgroundColor: "white",
                }}
              >
                Filtrar
              </Button>
          )}
        </div>
        {/* --- FIN: CAMBIO DE ORDEN DE BOTONES --- */}
      </div>

      {appliedFilter.column && appliedFilter.value && (
        <div className="mb-4 text-sm text-gray-600">
          Filtro activo:{" "}
          <span className="font-semibold">
            {ALL_COLUMNS.find((c) => c.key === appliedFilter.column)?.label}
          </span>{" "}
          = <span className="font-semibold">"{appliedFilter.value}"</span>
          <Button
            variant="light"
            size="sm"
            onPress={handleClearFiltersWithoutClose}
            className="ml-2 !p-0 text-sky-600 hover:text-sky-800 text-xs"
          >
            (Limpiar)
          </Button>
        </div>
      )}

      <div className="bg-white shadow rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-10 flex justify-center">
              <svg
                className="animate-spin h-8 w-8 text-sky-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
            </div>
          ) : (
            <table className="min-w-full text-center table-fixed">
              <thead className="bg-gray-200 border-b border-gray-300">
                <tr>
                  {columnOrder.map((colKey) => {
                    const colMeta = ALL_COLUMNS.find((c) => c.key === colKey)!;
                    const width =
                      colMeta.key === "acciones"
                        ? "160px"
                        : colMeta.key === "id"
                        ? "100px"
                        : colMeta.key === "nombre"
                        ? "200px"
                        : colMeta.key === "categoria"
                        ? "200px"
                        : colMeta.key === "stock"
                        ? "120px"
                        : colMeta.key === "precio_compra"
                        ? "140px"
                        : colMeta.key === "precio_venta"
                        ? "140px"
                        : colMeta.key === "proveedor"
                        ? "180px"
                        : colMeta.key === "status"
                        ? "120px"
                        : "auto";
                    return (
                      <th
                        key={colMeta.key}
                        draggable
                        onDragStart={(e) => onDragStart(e, colMeta.key)}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, colMeta.key)}
                        onDragEnd={() => setDraggedKey(null)}
                        style={{ width }}
                        className="px-4 py-3 text-gray-900 text-xs font-bold uppercase tracking-wider cursor-move select-none border-b text-center"
                      >
                        {colMeta.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((item) => renderRow(item))}
                {pagedItems.length === 0 && filteredItems.length > 0 && (
                  <tr>
                    <td
                      colSpan={columnOrder.length}
                      className="py-6 text-center text-gray-500"
                    >
                      No hay datos en esta página.
                    </td>
                  </tr>
                )}
                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={columnOrder.length}
                      className="py-6 text-center text-gray-500"
                    >
                      No hay registros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t">
          <div className="flex items-center space-x-2 text-sm">
            <label htmlFor="rowsPerPageInventory" className="text-gray-700">
              Filas por página:
            </label>
            <select
              id="rowsPerPageInventory"
              value={rowsPerPage}
              onChange={(e) => handleChangeRowsPerPage(e)}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm"
            >
              {[10, 15, 20, 50, 75, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
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
            <button
              disabled
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
            >
              {currentPage}
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPagesCount || totalPagesCount === 0}
              className={`px-3 py-1 rounded ${
                currentPage === totalPagesCount || totalPagesCount === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(modalOnClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1 text-lg font-semibold">
                Agregar Nuevo Producto
              </ModalHeader>
              <ModalBody className="p-0 sm:p-1 md:p-2 lg:p-4">
                <div className="bg-white p-4 rounded-lg shadow-inner">
                  <CreateInventoryItem
                    onClose={() => {
                      modalOnClose();
                      fetchItems();
                    }}
                    onCreated={() => {
                      modalOnClose();
                      fetchItems();
                    }}
                  />
                </div>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>

      <CreateCategoryModal
        isOpen={isCreateCategoryModalOpen}
        onClose={() => setIsCreateCategoryModalOpen(false)}
        onCategoryCreated={fetchItems}
      />

      {isManageCategoriesModalOpen && (
        <CategoryModal onClose={() => setIsManageCategoriesModalOpen(false)} />
      )}

      {isInventoryFilterOpen && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      
      {/* HEADER con título + botón X */}
     <div className="flex items-center justify-between p-4 border-b relative">
  <h2 className="text-lg font-semibold flex items-center gap-2">
    <Filter className="text-sky-500" />
    Filtrar Inventario
  </h2>
  <button
    onClick={() => setIsInventoryFilterOpen(false)}
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

      {/* BODY: tus Select de columna y valor */}
      <div className="p-4 space-y-4">
        <Select
          label="Seleccionar Columna"
          placeholder="Elige una opción"
          selectedKeys={tempFilterColumn ? new Set([tempFilterColumn]) : new Set()}
          onSelectionChange={(keys) => {
            setTempFilterColumn(Array.from(keys)[0] as DataColumnKey);
            setTempFilterValue("");
          }}
          className="w-full"
          items={FILTERABLE_OPTIONS}
        >
          {(col) => <SelectItem key={col.key}>{col.label}</SelectItem>}
        </Select>

        {tempFilterColumn && (
          <Select
            label="Selecciona un valor"
            placeholder="Elige un valor"
            selectedKeys={tempFilterValue ? new Set([tempFilterValue]) : new Set()}
            onSelectionChange={(keys) =>
              setTempFilterValue(Array.from(keys)[0] as string)
            }
            className="w-full"
            items={
              tempFilterColumn === "categoria"
                ? categoriaOptions
                : tempFilterColumn === "proveedor"
                ? proveedorOptions
                : STATUS_OPTIONS
            }
            disabled={!tempFilterColumn}
          >
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
        )}
      </div>

      {/* FOOTER: botones Limpiar / Aplicar */}
      <div className="flex justify-end p-4 border-t space-x-2">
        <Button
          variant="bordered"
          onPress={handleClearFiltersWithoutClose}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
        >
          Limpiar
        </Button>
        <Button
          color="primary"
          onPress={handleApplyFilters}
          disabled={!tempFilterColumn || !tempFilterValue}
        >
          Aplicar
        </Button>
      </div>
    </div>
  </div>
)}

      {viewItem && <ViewInventoryItem item={viewItem} onClose={() => setViewItem(null)} />}
      {editItem && (
        <EditInventoryItem
          isOpen={true}
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            fetchItems();
          }}
        />
      )}
      {deleteItem && (
        <DeleteInventoryItemModal
          item={deleteItem}
          onClose={() => setDeleteItem(null)}
          onDeleted={() => {
            setDeleteItem(null);
            fetchItems();
          }}
        />
      )}
    </div>
  );
}