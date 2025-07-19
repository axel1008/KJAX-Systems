// RUTA: src/pages/production-reports/index.tsx (CORREGIDO)

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, startOfQuarter, endOfQuarter, startOfYear, endOfYear, format } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { toast } from 'react-hot-toast';
import { utils, writeFile } from 'xlsx';
import { Icon } from '@iconify/react';
import { Button, Select, SelectItem } from '@heroui/react';
import { ReporteImpuestosVentas } from './ReporteImpuestosVentas';

import { PageHeader } from '../../components/ui/page-header';
import { MetricCard } from '../../components/ui/metric-card';

import type { 
  SummaryData, DeudaProveedorDetallada, InventarioData, VentaDetallada, 
  ClientInvoiceForReport, SupplierBillForReport, ReporteDescuentoCliente 
} from './types';
import { InventarioPDF } from './pdf/InventarioPDF';
import { VentasPDF } from './pdf/VentasPDF';
import { ProveedoresPDF } from './pdf/ProveedoresPDF';
import { ClientesConDescuentosPDF } from './pdf/ClientesConDescuentosPDF';

import { useAuth } from '../../Context/AuthContext';

type Period = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
type InvoiceType = 'ambas' | 'electronicas' | 'normales';

const formatCurrency = (value: number) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(value);
const condicionesVentaMap: { [key: string]: string } = { '01': 'Contado', '02': 'Crédito', '99': 'Otros' };

const getDateRange = (period: Period) => {
    const now = new Date();
    switch (period) {
        case 'weekly': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'biweekly': return { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
        case 'quarterly': return { start: startOfQuarter(now), end: endOfQuarter(now) };
        case 'yearly': return { start: startOfYear(now), end: endOfYear(now) };
        default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
};

export default function ProductionReportsPage() {
    const { role } = useAuth();

    const [summaryData, setSummaryData] = useState<SummaryData>({ totalSales: 0, totalDebt: 0, totalInventoryValue: 0, activeClients: 0 });
    const [deudasDetalladas, setDeudasDetalladas] = useState<DeudaProveedorDetallada[]>([]);
    const [inventoryData, setInventoryData] = useState<InventarioData[]>([]);
    const [ventasDetalladas, setVentasDetalladas] = useState<VentaDetallada[]>([]);
    const [reporteDescuentos, setReporteDescuentos] = useState<ReporteDescuentoCliente[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [period, setPeriod] = useState<Period>('monthly');
    const [invoiceType, setInvoiceType] = useState<InvoiceType>('ambas');

    useEffect(() => {
        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                const { start, end } = getDateRange(period);
                let salesQuery = supabase.from('facturas').select('*, clientes(nombre), moneda, detalle, condicion_venta').gte('fecha_emision', start.toISOString()).lte('fecha_emision', end.toISOString());
                if (invoiceType === 'electronicas') { salesQuery = salesQuery.not('clave_hacienda', 'is', null); } else if (invoiceType === 'normales') { salesQuery = salesQuery.is('clave_hacienda', null); }
                
                const [
                    debtRes, inventoryRes, salesRes, clientsRes,
                    discountsRes
                ] = await Promise.all([
                    supabase.from('facturas_proveedor').select('*, providers!facturas_proveedor_proveedor_id_fkey(nombre), monedas(codigo)').not('estado', 'in', '("Pagada","Anulada")'),
                    supabase.from('productos').select('*, providers!productos_proveedor_id_fkey(nombre), stock_minimo, stock_alert'),
                    salesQuery,
                    supabase.from('clientes').select('id', { count: 'exact' }).eq('status', true),
                    supabase.from('cliente_producto').select(`*, clientes(id, nombre), productos(id, nombre, precio_venta)`).or('descuento.gt.0,precio_fijo.gt.0'),
                ]);

                if (debtRes.error) throw debtRes.error; 
                if (inventoryRes.error) throw inventoryRes.error; 
                if (salesRes.error) throw salesRes.error; 
                if (clientsRes.error) throw clientsRes.error; 
                if (discountsRes.error) throw discountsRes.error;

                const groupedDiscounts: { [key: number]: ReporteDescuentoCliente } = {};
                (discountsRes.data || []).forEach(d => {
                    const clienteId = d.clientes?.id;
                    if (!clienteId || !d.productos) return;

                    if (!groupedDiscounts[clienteId]) {
                        groupedDiscounts[clienteId] = {
                            cliente_id: clienteId,
                            cliente_nombre: d.clientes.nombre,
                            descuentos: [],
                        };
                    }

                    const precioBase = d.productos.precio_venta || 0;
                    let tipo_descuento: 'Porcentaje' | 'Precio Fijo' = 'Porcentaje';
                    let valor_formateado = '0%';
                    let precio_final = precioBase;

                    if (d.precio_fijo && d.precio_fijo > 0 && precioBase > 0) {
                        tipo_descuento = 'Precio Fijo';
                        const porc = ((precioBase - d.precio_fijo) / precioBase) * 100;
                        valor_formateado = `${porc.toFixed(1)}%`;
                        precio_final = d.precio_fijo;
                    } else if (d.descuento && d.descuento > 0) {
                        tipo_descuento = 'Porcentaje';
                        valor_formateado = `${d.descuento}%`;
                        precio_final = precioBase * (1 - d.descuento / 100);
                    } else {
                        return; 
                    }

                    groupedDiscounts[clienteId].descuentos.push({
                        producto_nombre: d.productos.nombre,
                        precio_base: precioBase,
                        precio_final: precio_final,
                        tipo_descuento,
                        valor_formateado,
                    });
                });
                setReporteDescuentos(Object.values(groupedDiscounts));

                const totalSales = salesRes.data?.reduce((sum, item) => sum + (item.total_factura || 0), 0) ?? 0;
                const totalDebt = debtRes.data?.reduce((sum, item) => sum + (item.saldo_pendiente || 0), 0) ?? 0;
                const totalInventoryValue = inventoryRes.data?.reduce((sum, item) => sum + ((item.stock || 0) * (item.precio_compra || 0)), 0) ?? 0;
                const activeClients = clientsRes.count ?? 0;
                setSummaryData({ totalSales, totalDebt, totalInventoryValue, activeClients });

                const deudasMapped: DeudaProveedorDetallada[] = (debtRes.data as SupplierBillForReport[] || []).map(bill => ({ proveedor_nombre: bill.providers?.nombre || 'Desconocido', numero_documento: bill.numero_documento, fecha_emision: new Date(bill.fecha_emision).toLocaleDateString('es-CR'), fecha_vencimiento: new Date(bill.fecha_vencimiento).toLocaleDateString('es-CR'), total: bill.total, saldo_pendiente: bill.saldo_pendiente, estado: bill.estado, moneda: bill.monedas?.codigo || 'CRC' }));
                setDeudasDetalladas(deudasMapped);
                
                const productMap = new Map(inventoryRes.data?.map(p => [p.id, p.nombre]));
                
                const ventasMapped: VentaDetallada[] = [];
                (salesRes.data as ClientInvoiceForReport[] || []).forEach(factura => {
                    try {
                        // --- CORRECCIÓN CRÍTICA AQUÍ ---
                        const detalleData = factura.detalle;
                        const detalles = typeof detalleData === 'string' 
                            ? JSON.parse(detalleData || '[]') 
                            : (Array.isArray(detalleData) ? detalleData : []);

                        if (Array.isArray(detalles)) {
                            detalles.forEach((item: any) => {
                                const cantidad = Number(item.cantidad) || 0; 
                                const precio_unitario = Number(item.precio_unitario) || 0; 
                                const impuesto = Number(item.impuesto) || 0;
                                const total_linea = (cantidad * precio_unitario) + (cantidad * precio_unitario * impuesto / 100);
                                ventasMapped.push({ 
                                    fecha_compra: new Date(factura.fecha_emision).toLocaleDateString('es-CR'),
                                    producto_nombre: productMap.get(item.producto_id) || item.descripcion_item || 'Producto Desconocido',
                                    cantidad, 
                                    precio_unitario, 
                                    total_linea: parseFloat(total_linea.toFixed(2)), 
                                    cliente_nombre: factura.clientes?.nombre || 'Cliente Genérico', 
                                    tipo_compra: condicionesVentaMap[factura.condicion_venta] || factura.condicion_venta, 
                                });
                            });
                        }
                    } catch (e) { console.error("Error parsing invoice detail or calculating total", e, "Factura ID:", factura.id); }
                });
                setVentasDetalladas(ventasMapped);
                
                const inventoryMapped: InventarioData[] = (inventoryRes.data || []).map(p => { 
                    let estado = "En Stock"; 
                    if (p.stock <= p.stock_minimo) estado = "Agotado"; 
                    else if (p.stock <= p.stock_alert) estado = "Stock Bajo"; 
                    return { ...p, estado, providers: Array.isArray(p.providers) ? p.providers[0] : p.providers, precio_venta: p.precio_venta || 0, precio_compra: p.precio_compra || 0 }; 
                });
                setInventoryData(inventoryMapped);

            } catch (error: any) { toast.error(`Error al cargar datos: ${error.message}`);
            } finally { setIsLoading(false); }
        };
        fetchAllData();
    }, [period, invoiceType]);
    
    const handleExcelExport = (data: any[], fileName: string) => { if (!data || data.length === 0) { toast.error("No hay datos para exportar."); return; } try { const worksheet = utils.json_to_sheet(data); const workbook = utils.book_new(); utils.book_append_sheet(workbook, worksheet, 'Datos'); writeFile(workbook, `${fileName}.xlsx`); toast.success("Reporte exportado a Excel."); } catch { toast.error("No se pudo exportar el reporte a Excel."); } };
    const salesReportTitle = useMemo(() => { const periodText = { weekly: 'Semanal', biweekly: 'Quincenal', monthly: 'Mensual', quarterly: 'Trimestral', yearly: 'Anual' }[period]; const invoiceTypeText = { ambas: 'Totales', electronicas: 'Electrónicas', normales: 'Normales' }[invoiceType]; return `Ventas (${periodText} - ${invoiceTypeText})`; }, [period, invoiceType]);
    
    if (isLoading) { return <div className="p-8 text-center text-slate-500">Cargando reportes...</div>; }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Reportes de Operación"
                subtitle="Visualiza y exporta datos clave de tu negocio."
            />
            <div className="bg-white p-4 rounded-xl shadow-md border border-slate-200/60 flex flex-col md:flex-row items-center gap-4">
              <div className="w-full md:w-auto flex-grow">
                  <Select label="Período del Reporte" selectedKeys={new Set([period])} onSelectionChange={(keys) => setPeriod(Array.from(keys as Set<React.Key>)[0] as Period)}>
                      <SelectItem key="weekly">Semanal</SelectItem>
                      <SelectItem key="biweekly">Quincenal</SelectItem>
                      <SelectItem key="monthly">Mensual</SelectItem>
                      <SelectItem key="quarterly">Trimestral</SelectItem>
                      <SelectItem key="yearly">Anual</SelectItem>
                  </Select>
              </div>
              <div className="w-full md:w-auto flex-grow">
                    <Select label="Tipo de Factura (Ventas)" selectedKeys={new Set([invoiceType])} onSelectionChange={(keys) => setInvoiceType(Array.from(keys as Set<React.Key>)[0] as InvoiceType)}>
                      <SelectItem key="ambas">Ambas</SelectItem>
                      <SelectItem key="electronicas">Electrónicas</SelectItem>
                      <SelectItem key="normales">Tiquetes (normales)</SelectItem>
                  </Select>
              </div>
            </div>
    <ReporteImpuestosVentas />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-6">
                 <MetricCard 
                    title={salesReportTitle}
                    value={formatCurrency(summaryData.totalSales)}
                    icon={<Icon icon="heroicons:chart-bar-solid" className="h-6 w-6 text-sky-600"/>}
                >
                    <div className="mt-4 flex gap-2">
                        <Button size="sm" color="primary" variant="light" onPress={() => document.getElementById('pdf-ventas')?.click()}>PDF</Button>
                        <Button size="sm" color="success" variant="light" onPress={() => handleExcelExport(ventasDetalladas, 'reporte_ventas')}>Excel</Button>
                    </div>
                </MetricCard>

                 <MetricCard 
                    title="Deuda a Proveedores"
                    value={formatCurrency(summaryData.totalDebt)}
                    icon={<Icon icon="heroicons:banknotes-solid" className="h-6 w-6 text-sky-600"/>}
                >
                     <div className="mt-4 flex gap-2">
                        <Button size="sm" color="primary" variant="light" onPress={() => document.getElementById('pdf-deudas')?.click()}>PDF</Button>
                        <Button size="sm" color="success" variant="light" onPress={() => handleExcelExport(deudasDetalladas, 'reporte_deudas_proveedores')}>Excel</Button>
                    </div>
                </MetricCard>

                <MetricCard 
                    title="Valor del Inventario"
                    value={formatCurrency(summaryData.totalInventoryValue)}
                    icon={<Icon icon="heroicons:archive-box-solid" className="h-6 w-6 text-sky-600"/>}
                >
                    <div className="mt-4 flex gap-2">
                        <Button size="sm" color="primary" variant="light" onPress={() => document.getElementById('pdf-inventario')?.click()}>PDF</Button>
                        {(role === 'admin' || role === 'gerente') && (
                          <Button size="sm" color="success" variant="light" onPress={() => {
                              const dataToExport = inventoryData.map(item => ({ 'Producto': item.nombre, 'Categoría': item.categoria, 'Proveedor': item.providers?.nombre || 'N/A', 'Stock Actual': item.stock, 'Stock Mínimo': item.stock_minimo, 'Estado': item.estado, 'Precio Compra': item.precio_compra, 'Precio Venta': item.precio_venta, }));
                              handleExcelExport(dataToExport, 'reporte_inventario');
                          }}>Excel</Button>
                        )}
                    </div>
                </MetricCard>
                
                <MetricCard 
                    title="Descuentos por Cliente"
                    value={`${reporteDescuentos.length} Clientes`}
                    icon={<Icon icon="heroicons:tag-solid" className="h-6 w-6 text-sky-600"/>}
                >
                     <div className="mt-4 flex gap-2">
                        <Button size="sm" color="primary" variant="light" onPress={() => document.getElementById('pdf-descuentos')?.click()}>PDF</Button>
                        <Button size="sm" color="success" variant="light" onPress={() => {
                            const dataToExport = reporteDescuentos.flatMap(c => 
                                c.descuentos.map(d => ({
                                    'Cliente': c.cliente_nombre,
                                    'Producto': d.producto_nombre,
                                    'Precio Base': d.precio_base,
                                    'Tipo Descuento': d.tipo_descuento,
                                    'Valor Descuento': d.valor_formateado,
                                    'Precio Final': d.precio_final,
                                }))
                            );
                            handleExcelExport(dataToExport, 'reporte_descuentos_clientes');
                        }}>Excel</Button>
                    </div>
                </MetricCard>
            </div>
            
            <div className="hidden">
                <PDFDownloadLink id="pdf-deudas" document={<ProveedoresPDF data={deudasDetalladas} />} fileName="reporte_deudas.pdf">
                    {({loading}) => (loading ? '...' : 'Descargar PDF Deudas')}
                </PDFDownloadLink>
                <PDFDownloadLink id="pdf-inventario" document={<InventarioPDF data={inventoryData} />} fileName="reporte_inventario.pdf">
                    {({loading}) => (loading ? '...' : 'Descargar PDF Inventario')}
                </PDFDownloadLink>
                <PDFDownloadLink id="pdf-ventas" document={<VentasPDF data={ventasDetalladas} />} fileName="reporte_ventas.pdf">
                    {({loading}) => (loading ? '...' : 'Descargar PDF Ventas')}
                </PDFDownloadLink>
                <PDFDownloadLink id="pdf-descuentos" document={<ClientesConDescuentosPDF data={reporteDescuentos} />} fileName="reporte_descuentos_clientes.pdf">
                    {({loading}) => (loading ? '...' : 'Descargar PDF Descuentos')}
                </PDFDownloadLink>
            </div>
        </div>
    );
}