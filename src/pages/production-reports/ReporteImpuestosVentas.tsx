// RUTA: src/pages/reports/ReporteImpuestosVentas.tsx (VERSIÓN FINAL CORREGIDA)

import React, { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient'; // Ajusta la ruta a tu cliente de Supabase
import { Button } from '@heroui/react'; // O el componente de botón que uses
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx'; // Para la descarga en Excel

// --- CORRECCIÓN 1: Se cambia 'total' por 'total_factura' ---
interface FacturaVenta {
  id: string;
  consecutivo: string;
  fecha_emision: string;
  total_factura: number;
  total_impuesto: number;
}

export const ReporteImpuestosVentas: React.FC = () => {
  const [reportData, setReportData] = useState<FacturaVenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'1' | '13' | 'all' | null>(null);

  const fetchReportData = useCallback(async (type: '1' | '13' | 'all') => {
    setLoading(true);
    setReportType(type);
    setReportData([]);

    // --- CORRECCIÓN 2: Se cambia 'total' por 'total_factura' en la consulta ---
    let query = supabase
      .from('facturas') 
      .select('id, consecutivo, fecha_emision, total_factura, total_impuesto');

    if (type === '1') {
      query = query.eq('total_impuesto', 1);
    } else if (type === '13') {
      query = query.eq('total_impuesto', 13);
    } else if (type === 'all') {
      query = query.in('total_impuesto', [1, 13]);
    }

    const { data, error } = await query.order('fecha_emision', { ascending: false });

    if (error) {
      toast.error(`Error al cargar el reporte: ${error.message}`);
    } else {
      setReportData(data as FacturaVenta[] || []);
      if (data.length === 0) {
        toast.success("No se encontraron registros para este reporte.");
      }
    }
    setLoading(false);
  }, []);

  const handleDownload = () => {
    if (reportData.length === 0) {
      toast.error("No hay datos para descargar.");
      return;
    }

    // --- CORRECCIÓN 3: Se cambia 'total' por 'total_factura' para la exportación ---
    const dataToExport = reportData.map(factura => ({
      'Consecutivo': factura.consecutivo,
      'Fecha de Emisión': factura.fecha_emision,
      'Total Factura': factura.total_factura,
      'Impuesto (%)': factura.total_impuesto,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte Impuestos');
    
    XLSX.writeFile(workbook, `Reporte_Impuestos_${reportType}.xlsx`);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("es-CR", { style: "currency", currency: 'CRC' }).format(value);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Reporte de Ventas por Impuesto</h2>
      
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <Button color="primary" variant="solid" onClick={() => fetchReportData('1')} disabled={loading}>
          <Icon icon="lucide:percent-circle" className="mr-2" /> Reporte 1% IVA
        </Button>
        <Button color="primary" variant="solid" onClick={() => fetchReportData('13')} disabled={loading}>
          <Icon icon="lucide:percent-circle" className="mr-2" /> Reporte 13% IVA
        </Button>
        <Button color="secondary" variant="ghost" onClick={() => fetchReportData('all')} disabled={loading}>
          <Icon icon="lucide:combine" className="mr-2" /> Reporte General (1% y 13%)
        </Button>
        
        {reportData.length > 0 && (
           <Button color="success" variant="solid" onClick={handleDownload} disabled={loading} className="ml-auto">
             <Icon icon="lucide:download" className="mr-2" /> Descargar Excel
           </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando reporte...</div>
      ) : reportData.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Consecutivo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Emisión</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Factura</th>
                {reportType === 'all' && (
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">Tasa Impuesto</th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {reportData.map((factura) => (
                <tr key={factura.id}>
                  <td className="px-4 py-3 text-gray-800">{factura.consecutivo}</td>
                  <td className="px-4 py-3 text-gray-600">{factura.fecha_emision}</td>
                  {/* --- CORRECCIÓN 4: Se cambia 'total' por 'total_factura' en la tabla --- */}
                  <td className="px-4 py-3 text-right text-gray-800 font-medium">{formatCurrency(factura.total_factura)}</td>
                  {reportType === 'all' && (
                    <td className="px-4 py-3 text-right text-sky-600 font-semibold">{factura.total_impuesto}%</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};