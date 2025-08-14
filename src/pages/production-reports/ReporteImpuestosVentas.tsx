import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Button, Select, SelectItem, Input } from '@heroui/react';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface FacturaAgregada {
  factura_id: string;
  consecutivo: string;
  fecha_emision: string;
  total_factura: number;     // base + impuesto (acumulado de las líneas mostradas)
  total_impuesto: number;    // impuesto (acumulado de las líneas mostradas)
  iva_pct: number | 'mixed';
}

interface LineaVista {
  factura_id: string;
  consecutivo: string;
  fecha_emision: string;
  iva_pct: number;
  base_imponible: number;
  impuesto_monto: number;
}

export const ReporteImpuestosVentas: React.FC = () => {
  const [reportData, setReportData] = useState<FacturaAgregada[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTax, setSelectedTax] = useState<string>('all');
  const [taxRates, setTaxRates] = useState<number[]>([]);
  const [desde, setDesde] = useState<string>(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().slice(0,10);
  });
  const [hasta, setHasta] = useState<string>(() => {
    const d = new Date(); d.setMonth(d.getMonth()+1); d.setDate(1);
    return d.toISOString().slice(0,10);
  });

  const toISOStart = (yyyy_mm_dd: string) => new Date(`${yyyy_mm_dd}T00:00:00.000Z`).toISOString();
  const toISOEnd   = (yyyy_mm_dd: string) => new Date(`${yyyy_mm_dd}T00:00:00.000Z`).toISOString();

  // 1) Cargar tasas distintas desde la vista, limitadas por rango de fechas
  useEffect(() => {
    const fetchTaxRates = async () => {
      const desdeISO = toISOStart(desde);
      const hastaISO = toISOEnd(hasta);

      const { data, error } = await supabase
        .from('v_facturas_lineas')
        .select('iva_pct', { distinct: true })
        .gte('fecha_emision', desdeISO)
        .lt('fecha_emision', hastaISO);

      if (error) {
        console.error(error);
        toast.error('Error al cargar las tasas de impuestos');
      } else {
        const rates = Array.from(new Set((data ?? []).map((r: any) => Number(r.iva_pct))))
          .filter(v => !Number.isNaN(v))
          .sort((a, b) => a - b);
        setTaxRates(rates);
      }
    };
    fetchTaxRates();
  }, [desde, hasta]);

  // 2) Consultar la vista y agregar por factura
  const fetchReportData = useCallback(async () => {
    if (!desde || !hasta) {
      toast.error('Seleccione rango de fechas');
      return;
    }

    setLoading(true);
    setReportData([]);

    const desdeISO = toISOStart(desde);
    const hastaISO = toISOEnd(hasta);

    let query = supabase
      .from('v_facturas_lineas')
      .select('factura_id, consecutivo, fecha_emision, iva_pct, base_imponible, impuesto_monto')
      .gte('fecha_emision', desdeISO)
      .lt('fecha_emision', hastaISO);

    if (selectedTax !== 'all') {
      query = query.eq('iva_pct', Number(selectedTax));
    }

    const { data, error } = await query.order('fecha_emision', { ascending: false });

    if (error) {
      console.error(error);
      toast.error(`Error al cargar el reporte: ${error.message}`);
      setLoading(false);
      return;
    }

    const lineas = (data ?? []) as LineaVista[];
    if (lineas.length === 0) {
      toast.success('No se encontraron registros para este reporte.');
      setLoading(false);
      return;
    }

    const agrupado = new Map<string, FacturaAgregada>();
    for (const l of lineas) {
      const base = Number(l.base_imponible) || 0;
      const imp  = Number(l.impuesto_monto) || 0;

      if (!agrupado.has(l.factura_id)) {
        agrupado.set(l.factura_id, {
          factura_id: l.factura_id,
          consecutivo: l.consecutivo,
          fecha_emision: l.fecha_emision,
          total_factura: base + imp,
          total_impuesto: imp,
          iva_pct: selectedTax === 'all' ? 'mixed' : Number(selectedTax),
        });
      } else {
        const acc = agrupado.get(l.factura_id)!;
        acc.total_factura += base + imp;
        acc.total_impuesto += imp;
      }
    }

    setReportData(Array.from(agrupado.values()));
    setLoading(false);
  }, [desde, hasta, selectedTax]);

  const handleDownload = () => {
    if (reportData.length === 0) {
      toast.error('No hay datos para descargar.');
      return;
    }
    const dataToExport = reportData.map(f => ({
      'Consecutivo': f.consecutivo,
      'Fecha de Emisión': new Date(f.fecha_emision).toLocaleString(),
      'Tasa Impuesto': f.iva_pct === 'mixed' ? 'Mixto' : `${f.iva_pct}%`,
      'Total Impuesto': formatCurrency(f.total_impuesto),
      'Total (base+IVA filtrado)': formatCurrency(f.total_factura),
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Impuestos');
    XLSX.writeFile(wb, `Reporte_Impuestos_${selectedTax}_${desde}_a_${hasta}.xlsx`);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(value);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-bold mb-4 text-slate-800">Reporte de Ventas por Impuesto</h2>

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <Input
          type="date"
          label="Desde"
          value={desde}
          onChange={(e) => setDesde(e.target.value)}
          className="w-44"
        />
        <Input
          type="date"
          label="Hasta (exclusivo)"
          value={hasta}
          onChange={(e) => setHasta(e.target.value)}
          className="w-44"
        />
        <div className="flex-grow">
          <Select
            id="taxRate"
            label="Tasa de Impuesto"
            selectedKeys={new Set([selectedTax])}
            onSelectionChange={(keys) => setSelectedTax(Array.from(keys as Set<React.Key>)[0] as string)}
            className="w-full"
          >
            <SelectItem key="all" value="all">Todos (mezcla de tasas)</SelectItem>
            {taxRates.map(rate => (
              <SelectItem key={rate} value={rate}>{rate}%</SelectItem>
            ))}
          </Select>
        </div>

        <Button color="primary" variant="solid" onClick={fetchReportData} disabled={loading}>
          <Icon icon="lucide:search" className="mr-2" /> Generar Reporte
        </Button>

        {reportData.length > 0 && (
          <Button color="success" variant="solid" onClick={handleDownload} disabled={loading}>
            <Icon icon="lucide:download" className="mr-2" /> Descargar Excel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando reporte...</div>
      ) : reportData.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Consecutivo</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha Emisión</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Tasa</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total Impuesto</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-700">Total (base+IVA)</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y">
              {reportData.map((f) => (
                <tr key={f.factura_id}>
                  <td className="px-4 py-3 text-gray-800">{f.consecutivo}</td>
                  <td className="px-4 py-3 text-gray-600">{new Date(f.fecha_emision).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-sky-600 font-semibold">
                    {f.iva_pct === 'mixed' ? 'Mixto' : `${f.iva_pct}%`}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-800 font-medium">{formatCurrency(f.total_impuesto)}</td>
                  <td className="px-4 py-3 text-right text-gray-800 font-medium">{formatCurrency(f.total_factura)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          Seleccione fechas y (opcional) una tasa, luego “Generar Reporte”.
        </div>
      )}
    </div>
  );
};
