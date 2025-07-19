// RUTA: src/pages/audit-log/index.tsx (VERSIÓN FINAL CORREGIDA)

import React, { useState, useEffect, useMemo, DragEvent } from 'react';
import { supabase } from '../../supabaseClient';
import { PageHeader } from '../../components/ui/page-header';
import { StatusBadge } from '../../components/ui/status-badge';
import { Eye, ShieldCheck, X } from 'lucide-react';

// Interfaz para el tipo de dato del log
interface AuditLog {
  id: number;
  timestamp: string;
  user_email: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
}

// Definición de las columnas y sus propiedades
type ColumnKey = 'timestamp' | 'user_email' | 'action' | 'table_name' | 'record_id' | 'detalles';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  width?: string;
}

const ALL_COLUMNS: Record<ColumnKey, ColumnDef> = {
  timestamp: { key: 'timestamp', label: 'Fecha y Hora', width: '200px' },
  user_email: { key: 'user_email', label: 'Usuario', width: '220px' },
  action: { key: 'action', label: 'Acción', width: '120px' },
  table_name: { key: 'table_name', label: 'Tabla', width: '160px' },
  record_id: { key: 'record_id', label: 'ID Registro', width: 'auto' },
  detalles: { key: 'detalles', label: 'Detalles', width: '100px' },
};

// --- Componente para ver los detalles de un log ---
const AuditDetailView = ({ log, onClose }: { log: AuditLog; onClose: () => void }) => {
  const oldData = log.old_values || {};
  const newData = log.new_values || {};
  const allKeys = Array.from(new Set([...Object.keys(oldData), ...Object.keys(newData)]));

  const changes = allKeys
    .map(key => ({
      field: key,
      oldValue: oldData[key],
      newValue: newData[key],
    }))
    .filter(({ oldValue, newValue }) => JSON.stringify(oldValue) !== JSON.stringify(newValue))
    .filter(({ field }) => !['updated_at', 'created_at'].includes(field));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-start p-4 pt-16" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-slate-800">Detalles del Cambio (ID: {log.id})</h2>
          <button onClick={onClose} className="p-2 rounded-full text-slate-500 hover:bg-gray-200 hover:text-slate-800">
            <X className="h-6 w-6"/>
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {changes.length > 0 ? (
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Campo</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor Anterior</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Valor Nuevo</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {changes.map(({ field, oldValue, newValue }) => (
                    <tr key={field}>
                      <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800 bg-gray-50">{field}</td>
                      <td className="px-4 py-2 text-sm text-red-700">{JSON.stringify(oldValue)}</td>
                      <td className="px-4 py-2 text-sm text-green-700">{JSON.stringify(newValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <p className="text-gray-500 italic text-sm">No se detectaron cambios en los campos o solo se actualizaron metadatos.</p>
          )}
        </div>
        <div className="p-4 border-t bg-gray-50 rounded-b-xl text-right">
          <button onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal ---
export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Estados para Drag & Drop de columnas
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
    'timestamp', 'user_email', 'action', 'table_name', 'record_id', 'detalles'
  ]);
  const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      setError(null);
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error: fetchError, count } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(from, to);
      
      if (fetchError) {
        setError(`Error al cargar la auditoría: ${fetchError.message}.`);
      } else {
        setLogs(data || []);
        setTotalCount(count || 0);
      }
      setIsLoading(false);
    };

    fetchLogs().catch(console.error);
  }, [page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const onDragStart = (e: DragEvent<HTMLTableHeaderCellElement>, key: ColumnKey) => {
    setDraggedKey(key);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
  const onDrop = (e: DragEvent<HTMLTableHeaderCellElement>, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedKey || draggedKey === targetKey) return;
    setColumnOrder(prev => {
      const newOrder = [...prev];
      const fromIdx = newOrder.indexOf(draggedKey);
      const toIdx = newOrder.indexOf(targetKey);
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, draggedKey);
      return newOrder;
    });
    setDraggedKey(null);
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen">
      <PageHeader
        title={<div className="flex items-center gap-2"><ShieldCheck />Auditoría</div>}
        subtitle="Registro de todos los cambios realizados en el sistema."
      />
      
      {/* SECCIÓN CORREGIDA: La paginación ahora va DENTRO de este div */}
      <div className="bg-white shadow rounded-lg border overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-200">
              <tr>
                {columnOrder.map(colKey => {
                  const col = ALL_COLUMNS[colKey];
                  return (
                    <th
                      key={col.key}
                      draggable
                      onDragStart={(e) => onDragStart(e, col.key)}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, col.key)}
                      onDragEnd={() => setDraggedKey(null)}
                      style={{ width: col.width }}
                      className={`px-4 py-3 text-center text-gray-900 text-xs font-semibold uppercase tracking-wider cursor-move select-none border-b ${
                        draggedKey === col.key ? "opacity-50 bg-gray-300" : ""
                      }`}
                    >
                      {col.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={columnOrder.length} className="py-10 text-center text-gray-500">Cargando registros...</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  {columnOrder.map(colKey => {
                    switch (colKey) {
                      case 'timestamp':
                        return <td key={colKey} className="px-4 py-3 text-center whitespace-nowrap text-gray-700">{new Date(log.timestamp).toLocaleString('es-CR')}</td>;
                      case 'user_email':
                        return <td key={colKey} className="px-4 py-3 text-center whitespace-nowrap text-gray-600">{log.user_email || 'Sistema'}</td>;
                      case 'action':
                        return <td key={colKey} className="px-4 py-3 text-center"><StatusBadge text={log.action} type={log.action.toLowerCase()} /></td>;
                      case 'table_name':
                        return <td key={colKey} className="px-4 py-3 text-center font-medium text-gray-800">{log.table_name}</td>;
                      case 'record_id':
                        return <td key={colKey} className="px-4 py-3 text-center text-gray-600 font-mono text-xs">{log.record_id}</td>;
                      case 'detalles':
                        return <td key={colKey} className="px-4 py-3 text-center"><button onClick={() => setSelectedLog(log)} className="p-2 rounded-full hover:bg-gray-200 transition-colors"><Eye className="h-5 w-5 text-gray-500" /></button></td>;
                      default:
                        return <td key={colKey}></td>;
                    }
                  })}
                </tr>
              ))}
              {!isLoading && logs.length === 0 && (
                <tr><td colSpan={columnOrder.length} className="py-10 text-center text-gray-500">No hay registros de auditoría.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- Controles de Paginación Corregidos (idénticos a Proveedores) --- */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t">
          <div className="flex items-center space-x-2 text-sm">
            <label htmlFor="audit-rows-per-page" className="text-gray-700">
              Filas por página:
            </label>
            <select
              id="audit-rows-per-page"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
            >
              {[10, 25, 50, 100].map(size => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1 rounded ${
                page === 1
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
              {page}
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || totalPages === 0}
              className={`px-3 py-1 rounded ${
                page >= totalPages || totalPages === 0
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      {selectedLog && <AuditDetailView log={selectedLog} onClose={() => setSelectedLog(null)} />}
    </div>
  );
}