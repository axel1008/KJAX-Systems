// src/components/DataTable.tsx
import React, { useState } from "react";

// Tipado genérico: T representa el tipo de cada registro (por ejemplo: Client, Provider, InventoryItem…)
export interface ColumnMeta<T> {
  key: keyof T;
  label: string;
}

export interface DataTableProps<T> {
  columns: ColumnMeta<T>[];
  data: T[]; // arreglo de registros ya filtrado (o no)
  renderRow: (item: T) => React.ReactNode;
  // Opcional: si no se pasa nada, toma [10,15,20,50,75,100]
  pageSizeOptions?: number[];
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  renderRow,
  pageSizeOptions = [10, 15, 20, 50, 75, 100],
}: DataTableProps<T>): JSX.Element {
  // Estado de paginación
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(pageSizeOptions[0]);

  // Calcular cuántas páginas
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

  // Cada vez que cambie pageSize, reiniciamos la página a 1
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(1);
  };

  // Extraemos únicamente el “fragmento” de data correspondiente a la página actual
  const paginatedData = data.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Cambia de página (se asegura de no salirse de [1..totalPages])
  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
  };

  return (
    <div className="w-full">
      {/* ───── Tabla ───── */}
      <div className="overflow-x-auto rounded-lg shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className="px-4 py-2 font-medium text-center"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedData.map((item) => (
              // renderRow debe devolver un <tr> con <td>…</td>
              <React.Fragment key={String(item[columns[0].key])}>
                {renderRow(item)}
              </React.Fragment>
            ))}

            {paginatedData.length === 0 && data.length > 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-6 text-center text-gray-500"
                >
                  No hay datos disponibles en esta página.
                </td>
              </tr>
            )}

            {data.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-6 text-center text-gray-500"
                >
                  No hay registros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ───── Controles de paginación ───── */}
      <div className="flex items-center justify-between py-4 px-2 bg-gray-50">
        {/* Selector “Rows per page” */}
        <div className="flex items-center space-x-2 text-sm">
          <label>Rows per page:</label>
          <select
            className="border border-gray-300 rounded px-2 py-1 focus:outline-none"
            value={pageSize}
            onChange={handlePageSizeChange}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Botones de páginas */}
        <div className="flex items-center space-x-1 text-sm">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className={`px-2 py-1 rounded ${
              page === 1
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            ◀
          </button>

          {/* Generar array [1, 2, …, totalPages] */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              className={`px-2 py-1 rounded ${
                p === page
                  ? "bg-sky-500 text-white"
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className={`px-2 py-1 rounded ${
              page === totalPages
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-200"
            }`}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
