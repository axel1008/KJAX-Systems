// src/components/ui/styled-table.tsx

// Interface for column definition, used internally and expected for the 'headers' prop
export interface TableColumn {
  label: string;
  key: string;
  className?: string; // Optional: for custom styling of header cells
}

interface StyledTableProps {
  headers?: TableColumn[]; // Changed from 'columns' to 'headers'
  data?: any[];
  renderRow: (row: any, rowIndex: number) => React.ReactNode; // Added rowIndex
  onView?: (row: any) => void; // Kept for potential direct use, though actions are often in renderRow
  onEdit?: (row: any) => void; // Kept for potential direct use
  onDelete?: (row: any) => void; // Kept for potential direct use
  tableClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  rowClassName?: string;
  cellClassName?: string;
  emptyDataMessage?: string;
}

export function StyledTable({
  headers = [],
  data = [],
  renderRow,
  // onView, // Commented out as actions are typically handled by renderRow
  // onEdit,
  // onDelete,
  tableClassName = "min-w-full divide-y divide-slate-200",
  headerClassName = "bg-slate-50",
  bodyClassName = "bg-white divide-y divide-slate-200",
  // rowClassName = "hover:bg-slate-50/50 transition-colors", // Applied directly in map
  // cellClassName = "px-6 py-4 whitespace-nowrap text-sm text-slate-700", // Applied in renderRow
  emptyDataMessage = "No hay datos para mostrar.",
}: StyledTableProps) {
  if (headers.length === 0 && data.length > 0) {
    // If no headers but data exists, try to infer headers from first data item
    // This is a fallback and might not be ideal for all cases
    const firstItemKeys = Object.keys(data[0]);
    headers = firstItemKeys.map(key => ({ key, label: key.charAt(0).toUpperCase() + key.slice(1) }));
  }


  return (
    <div className="shadow-sm border border-slate-200/60 rounded-xl overflow-hidden">
      <table className={tableClassName}>
        <thead className={headerClassName}>
          <tr>
            {headers.map((header) => (
              <th
                key={header.key}
                scope="col"
                className={`px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider ${header.className || ''}`}
              >
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={bodyClassName}>
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length || 1} className="px-6 py-12 text-center text-sm text-slate-500">
                {emptyDataMessage}
              </td>
            </tr>
          ) : (
            data.map((row: any, rowIndex: number) => renderRow(row, rowIndex))
          )}
        </tbody>
      </table>
    </div>
  );
}
