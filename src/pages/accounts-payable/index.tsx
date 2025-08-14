import React, { useState, useEffect, useMemo, useCallback, DragEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, DateInput } from "@heroui/react";
import { Icon } from "@iconify/react";
import toast from 'react-hot-toast';
import { parseDate, getLocalTimeZone } from "@internationalized/date";
import type { DateValue } from '@internationalized/date';
import { MetricCard } from "../../components/ui/metric-card";
import { StatusBadge } from "../../components/ui/status-badge";
import { ConfirmationModal } from "../../components/ui/confirmation-modal";
import { ViewBillModal } from "./ViewBillModal";
import { supabase } from "../../supabaseClient";
import type { RawSupplierBill, SupplierBill, ProcessedSupplierBill, ProviderForSelect, CondicionPago, Moneda, NotaDebito } from "./types";
import CreateDebitNoteModal from "./CreateDebitNoteModal";
import { CreateBillForm } from "./CreateBillForm";
import PayBillForm from "./PayBillForm";
import BillPaymentHistoryModal from "./BillPaymentHistoryModal";
import { Filter, Search, CreditCard, Plus, Eye, HandCoins, FileX2, History } from "lucide-react";

type ColumnKey = 'numero_documento' | 'proveedor_nombre' | 'fecha_emision' | 'fecha_vencimiento' | 'total' | 'saldo_pendiente' | 'estado' | 'acciones';
interface ColumnDef { key: ColumnKey; label: string; width?: string; }

interface BillsFilters {
  status: string;
  providerId: string;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

const initialFilterState: BillsFilters = {
  status: 'all',
  providerId: 'all',
  dateRange: { start: null, end: null },
};

export const AccountsPayablePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [notasDebito, setNotasDebito] = useState<NotaDebito[]>([]);
  const [isDebitNoteModalOpen, setIsDebitNoteModalOpen] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<BillsFilters>(initialFilterState);
  const [tempFilters, setTempFilters] = useState<BillsFilters>(activeFilters);
  const [loadingBills, setLoadingBills] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || "");
  const [isNewBillModalOpen, setIsNewBillModalOpen] = useState(false);
  const [isPayBillModalOpen, setIsPayBillModalOpen] = useState(false);
  const [isAnnulBillModalOpen, setIsAnnulBillModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isViewBillModalOpen, setIsViewBillModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<ProcessedSupplierBill | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [providersList, setProvidersList] = useState<ProviderForSelect[]>([]);
  const [condicionesPagoList, setCondicionesPagoList] = useState<CondicionPago[]>([]);
  const [monedasList, setMonedasList] = useState<Moneda[]>([]);
  const [productosList, setProductosList] = useState<{ id: number; nombre: string; precio_compra?: number | null, proveedor_id?: number | null }[]>([]);
  const [pagosMesActual, setPagosMesActual] = useState<number>(0);
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(['numero_documento', 'proveedor_nombre', 'fecha_emision', 'fecha_vencimiento', 'total', 'saldo_pendiente', 'estado', 'acciones']);
  const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);

  const allColumns: Record<ColumnKey, ColumnDef> = {
    numero_documento: { key: "numero_documento", label: "N° Doc.", width: "150px" },
    proveedor_nombre: { key: "proveedor_nombre", label: "Proveedor", width: "220px" },
    fecha_emision: { key: "fecha_emision", label: "F. Emisión", width: "130px" },
    fecha_vencimiento: { key: "fecha_vencimiento", label: "F. Vencim.", width: "130px" },
    total: { key: "total", label: "Total", width: "150px" },
    saldo_pendiente: { key: "saldo_pendiente", label: "Saldo Pend.", width: "150px" },
    estado: { key: "estado", label: "Estado", width: "120px" },
    acciones: { key: "acciones", label: "Acciones", width: "180px" },
  };

  const fetchDebitNotes = useCallback(async (providerId: string) => {
    if (!providerId || providerId === 'all') {
      setNotasDebito([]);
      return;
    }
    const { data, error } = await supabase
      .from('notas_debito_proveedor')
      .select('id, motivo, total, fecha')
      .eq('proveedor_id', providerId);

    if (error) {
      toast.error(`Error al cargar notas de débito: ${error.message}`);
      setNotasDebito([]);
    } else {
      setNotasDebito(data || []);
    }
  }, []);

  useEffect(() => {
    fetchDebitNotes(activeFilters.providerId);
  }, [activeFilters.providerId, fetchDebitNotes]);

  const fetchFormData = useCallback(async () => {
    setLoading(true);
    try {
      const [providersRes, condRes, monedasRes, prodsRes] = await Promise.all([
          supabase.from("providers").select("id, nombre").order("nombre", { ascending: true }),
          supabase.from("condiciones_pago").select("id, nombre, dias_credito").order("nombre", { ascending: true }),
          supabase.from("monedas").select("id, codigo, descripcion").order("descripcion", { ascending: true }),
          supabase.from("productos").select("id, nombre, precio_compra, proveedor_id").eq("status", true).order("nombre", { ascending: true })
      ]);

      if (providersRes.error) throw new Error(`Error al cargar proveedores: ${providersRes.error.message}`);
      setProvidersList(providersRes.data || []);
      if (condRes.error) throw new Error(`Error al cargar condiciones de pago: ${condRes.error.message}`);
      setCondicionesPagoList(condRes.data || []);
      if (monedasRes.error) throw new Error(`Error al cargar monedas: ${monedasRes.error.message}`);
      setMonedasList(monedasRes.data || []);
      if (prodsRes.error) throw new Error(`Error al cargar productos: ${prodsRes.error.message}`);
      setProductosList(prodsRes.data || []);

    } catch (error: any) {
      toast.error(error.message || "No se pudieron cargar los datos maestros.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupplierBills = useCallback(async () => {
    setLoadingBills(true);
    const { data, error } = await supabase.from("facturas_proveedor").select<string, RawSupplierBill>(
        `id, proveedor_id, orden_compra_id, numero_documento, tipo_documento, fecha_emision, fecha_vencimiento,
         condiciones_pago_id, subtotal, impuestos, total, moneda_id, estado, saldo_pendiente, descripcion,
         porcentaje_impuesto, dias_credito_calculados, archivo_factura_path,
         providers!facturas_proveedor_proveedor_id_fkey(nombre),
         condiciones_pago(nombre, dias_credito),
         monedas(codigo, descripcion),
         pagos_proveedor(id, fecha_pago, monto_total, medio_pago, moneda_id, archivo_pago_path, monedas(codigo))`
    ).order("fecha_emision", { ascending: false });

    if (error) {
        toast.error(`Error al cargar facturas: ${error.message}`);
        setBills([]);
    } else {
        const transformedData: SupplierBill[] = data.map((bill) => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const venc = bill.fecha_vencimiento ? new Date(bill.fecha_vencimiento) : new Date();
            const diasVencimiento = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

            return {
                ...bill,
                // --- PUNTO CLAVE ---
                // Asigna el array del nombre de la BD al nombre esperado por la App
                pagos: bill.pagos_proveedor, 
                // --- FIN DEL PUNTO CLAVE ---
                fecha_emision: bill.fecha_emision ? new Date(bill.fecha_emision).toISOString().split("T")[0] : "N/A",
                fecha_vencimiento: bill.fecha_vencimiento ? new Date(bill.fecha_vencimiento).toISOString().split("T")[0] : "N/A",
                proveedor_nombre: bill.providers?.nombre || "Desconocido",
                condicion_pago_nombre: bill.condiciones_pago?.nombre,
                moneda_codigo: bill.monedas?.codigo,
                dias_vencimiento: diasVencimiento,
                porcentaje_impuesto: bill.porcentaje_impuesto,
                dias_credito_calculados: bill.dias_credito_calculados
            };
        });
        setBills(transformedData);
    }
    setLoadingBills(false);
  }, []);

  const fetchPagosMesActual = useCallback(async () => {
    const hoy = new Date();
    const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
    const { data, error } = await supabase.from('pagos_proveedor').select('monto_total').gte('fecha_pago', primerDiaMes);
    if (error) { setPagosMesActual(0); }
    else {
      const totalPagado = data.reduce((sum, pago) => sum + pago.monto_total, 0);
      setPagosMesActual(totalPagado);
    }
  }, []);

  const refreshAllData = useCallback(() => {
    fetchSupplierBills();
    fetchPagosMesActual();
    if (activeFilters.providerId !== 'all') {
      fetchDebitNotes(activeFilters.providerId);
    }
  }, [fetchSupplierBills, fetchPagosMesActual, activeFilters.providerId, fetchDebitNotes]);

  useEffect(() => {
    fetchFormData().then(refreshAllData);
  }, [fetchFormData, refreshAllData]);

  useEffect(() => {
    setSearchQuery(searchParams.get('q') || '');
  }, [searchParams]);

  const handleBillActionSuccess = (message: string) => {
    toast.success(message);
    refreshAllData();
    setIsNewBillModalOpen(false);
    setIsPayBillModalOpen(false);
    setIsAnnulBillModalOpen(false);
    setIsHistoryModalOpen(false);
    setIsDebitNoteModalOpen(false);
    setSelectedBill(null);
  };

  const handleConfirmAnnulBill = async () => {
    if (!selectedBill) return;
    setLoadingBills(true);

    try {
        const { data: detallesFactura, error: detallesError } = await supabase.from('detalle_factura_proveedor').select('producto_id, cantidad').eq('factura_proveedor_id', selectedBill.id);
        if (detallesError) throw new Error(`Error al obtener detalles: ${detallesError.message}`);

        const stockUpdatePromises = (detallesFactura || []).filter(d => d.producto_id).map(d => supabase.rpc('actualizar_stock_producto', { id_producto_a_actualizar: d.producto_id, cantidad_a_sumar: -d.cantidad }));
        const stockResults = await Promise.all(stockUpdatePromises);
        stockResults.forEach(res => { if (res.error) console.error('Error al reajustar stock:', res.error); });

        const { error: annulError } = await supabase.from('facturas_proveedor').update({ estado: 'Anulada', saldo_pendiente: 0 }).eq('id', selectedBill.id);
        if (annulError) throw new Error(`Error al anular la factura: ${annulError.message}`);

        handleBillActionSuccess(`Factura ${selectedBill.numero_documento} anulada.`);
    } catch (error: any) {
        toast.error(error.message || 'Error desconocido al anular.');
    } finally {
        setLoadingBills(false);
    }
  };

  const openPayBillModal = (bill: ProcessedSupplierBill) => {
    setSelectedBill(bill);
    setIsPayBillModalOpen(true);
  };

  const openViewBillModal = (bill: ProcessedSupplierBill) => {
    setSelectedBill(bill);
    setIsViewBillModalOpen(true);
  };

  const openAnnulBillModal = (bill: ProcessedSupplierBill) => {
    setSelectedBill(bill);
    setIsAnnulBillModalOpen(true);
  };

  const openHistoryModal = (bill: ProcessedSupplierBill) => {
    setSelectedBill(bill);
    setIsHistoryModalOpen(true);
  };

  const onDragStart = (e: DragEvent<HTMLTableHeaderCellElement>, key: ColumnKey) => { setDraggedKey(key); if(e.dataTransfer) e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
  const onDrop = (e: DragEvent<HTMLTableHeaderCellElement>, targetKey: ColumnKey) => { e.preventDefault(); if (!draggedKey || draggedKey === targetKey) return; setColumnOrder(cols => { const arr = [...cols]; const from = arr.indexOf(draggedKey); const to = arr.indexOf(targetKey); arr.splice(from, 1); arr.splice(to, 0, draggedKey); return arr; }); setDraggedKey(null); };

  const formatCurrency = (value: number | undefined | null, currencyCode?: string | null): string =>
    new Intl.NumberFormat("es-CR", { style: "currency", currency: currencyCode || 'CRC' }).format(value || 0);

  const totalNotasDebito = useMemo(() =>
    notasDebito.reduce((sum, nota) => sum + nota.total, 0), [notasDebito]);

  const totalPendiente = useMemo(() => {
    const totalFacturasPendientes = bills.reduce((sum, bill) => (['Pendiente', 'Parcial', 'Vencida'].includes(bill.estado) ? sum + (bill.saldo_pendiente || 0) : sum), 0);
    return totalFacturasPendientes - totalNotasDebito;
  }, [bills, totalNotasDebito]);

  const facturasVencidas = useMemo(() => bills.filter((bill) => bill.estado === "Vencida").length, [bills]);
  const facturasPorVencer = useMemo(() => bills.filter(bill => bill.estado === "Pendiente" && bill.dias_vencimiento >= 0 && bill.dias_vencimiento <= 7).length, [bills]);

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLSelectElement>) => { setRowsPerPage(parseInt(e.target.value, 10)); setCurrentPage(1); };
  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const handleOpenFilterModal = () => { setTempFilters(activeFilters); setIsFilterModalOpen(true); };
  const handleApplyFilters = () => { setActiveFilters(tempFilters); setIsFilterModalOpen(false); };
  const handleClearFilters = () => { setTempFilters(initialFilterState); setActiveFilters(initialFilterState); };
  const handleDateChange = (date: DateValue | null, part: 'start' | 'end') => { setTempFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, [part]: date ? date.toDate(getLocalTimeZone()) : null } })); };
  const hasActiveFilters = useMemo(() => activeFilters.status !== 'all' || activeFilters.providerId !== 'all' || activeFilters.dateRange.start || activeFilters.dateRange.end, [activeFilters]);

  const filteredBills = useMemo(() => {
      return bills.filter(bill => {
          const matchSearch = ((bill.proveedor_nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) || (bill.numero_documento || "").toLowerCase().includes(searchQuery.toLowerCase()));
          const matchStatus = activeFilters.status === 'all' || bill.estado === activeFilters.status;
          const matchProvider = activeFilters.providerId === 'all' || String(bill.proveedor_id) === activeFilters.providerId;
          const billDate = new Date(bill.fecha_emision + 'T00:00:00');
          const matchDate = ((!activeFilters.dateRange.start || billDate >= activeFilters.dateRange.start) && (!activeFilters.dateRange.end || billDate <= activeFilters.dateRange.end));
          return matchSearch && matchStatus && matchProvider && matchDate;
      });
  }, [bills, searchQuery, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / rowsPerPage));
  const paginatedBills = useMemo(() => filteredBills.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage), [filteredBills, currentPage, rowsPerPage]);

  if (loading) return <div className="p-6 text-center text-slate-500">Cargando datos maestros...</div>;

  return (
    <div className="p-4 md:p-6 min-h-screen font-sans">
      <div className="mb-4">
        <h1 className="flex items-center text-2xl font-bold text-gray-900">
          <CreditCard className="h-6 w-6 text-black mr-2" />
          Cuentas por Pagar
        </h1>
        <p className="text-gray-600 text-base">
          Gestiona las facturas y pagos a tus proveedores
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <MetricCard title="Total Pendiente" value={formatCurrency(totalPendiente)} icon={<Icon icon="lucide:file-warning" className="text-amber-500" />} />
        <MetricCard title="Facturas Vencidas" value={facturasVencidas.toString()} icon={<Icon icon="lucide:calendar-x" className="text-red-500" />} />
        <MetricCard title="Total Notas Débito" value={formatCurrency(totalNotasDebito)} icon={<Icon icon="lucide:minus-circle" className="text-orange-500" />} />
        <MetricCard title="Pagos Realizados (Mes)" value={formatCurrency(pagosMesActual)} icon={<Icon icon="lucide:check-circle" className="text-green-500" />} />
      </div>

      <div className="flex flex-col md:flex-row justify-between mb-4 space-y-3 md:space-y-0">
        <div className="relative w-full md:w-1/5">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={20} />
            </span>
            <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                }}
                placeholder="Buscar por proveedor, N° factura..."
                className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 hover:border-gray-300 transition"
            />
        </div>
        <div className="flex space-x-2 w-full md:w-auto justify-end">
          <Button onPress={handleOpenFilterModal} variant="bordered" startContent={<Filter className="h-4 w-4 mr-2 text-gray-500" />} className="relative hover:bg-gray-300 border border-gray-300" style={{ height: "38px", paddingTop: 0, paddingBottom: 0, backgroundColor: "white" }}>
            Filtrar
            {hasActiveFilters && <span className="absolute -top-1 -right-1 block h-2 w-2 rounded-full bg-sky-500" />}
          </Button>
          {activeFilters.providerId !== 'all' && (
            <Button onPress={() => setIsDebitNoteModalOpen(true)} color="secondary" variant="ghost" startContent={<Icon icon="lucide:minus-circle" />}>
              Nota de Débito
            </Button>
          )}
          <Button onPress={() => setIsNewBillModalOpen(true)} color="primary" startContent={<Plus className="mr-1" size={20} />}>
            Registrar Factura
          </Button>
        </div>
      </div>

      {activeFilters.providerId !== 'all' && notasDebito.length > 0 && (
        <div className="bg-white shadow-md rounded-lg border overflow-hidden mb-4">
          <h3 className="text-md font-semibold p-4 bg-orange-50 border-b border-orange-200 text-orange-800">Notas de Débito para el Proveedor Seleccionado</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-200 border-b border-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-gray-800">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-bold text-gray-800">Motivo</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-bold text-gray-800">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {notasDebito.map(nota => (
                  <tr key={nota.id}>
                    <td className="px-4 py-3 text-gray-700">{nota.fecha}</td>
                    <td className="px-4 py-3 text-gray-700">{nota.motivo}</td>
                    <td className="px-4 py-3 text-right text-orange-600 font-medium">
                      {formatCurrency(nota.total, 'CRC')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-200 border-b border-gray-300">
              <tr>{columnOrder.map(colKey => (<th key={colKey} draggable onDragStart={(e) => onDragStart(e, colKey)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, colKey)} onDragEnd={() => setDraggedKey(null)} style={{ width: allColumns[colKey].width }} className="px-4 py-3 text-center text-xs uppercase tracking-wider cursor-move select-none font-bold text-gray-800">{allColumns[colKey].label}</th>))}</tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedBills.map((bill: SupplierBill) => {
                const processedBill: ProcessedSupplierBill = { ...bill, total_formatted: formatCurrency(bill.total, bill.moneda_codigo), saldo_pendiente_formatted: formatCurrency(bill.saldo_pendiente, bill.moneda_codigo), estado_badge: <StatusBadge text={bill.estado} type={bill.estado.toLowerCase().replace(" ", "-")} />, proveedor_nombre_display: bill.proveedor_nombre };
                return (<tr key={bill.id} className="hover:bg-gray-50 transition-colors">{columnOrder.map(colKey => (<td key={colKey} className="px-4 py-3 text-center text-gray-700 whitespace-nowrap">{
                    colKey === 'acciones' ? (
                        <div className="flex justify-center space-x-2">
                            <button type="button" onClick={() => openViewBillModal(processedBill)} title="Ver" className="p-2 rounded-full transition text-gray-600 hover:text-sky-600"><Eye size={18} /></button>
                            <button type="button" onClick={() => openPayBillModal(processedBill)} className="transition text-gray-600 hover:text-green-600" disabled={processedBill.estado === 'Pagada' || processedBill.estado === 'Anulada'} title="Pagar"><HandCoins size={18} /></button>
                            <button type="button" onClick={() => openAnnulBillModal(processedBill)} className="transition text-gray-600 hover:text-red-600" disabled={processedBill.estado === 'Anulada' || processedBill.estado === 'Pagada'} title="Anular"><FileX2 size={18} /></button>
                            <button type="button" onClick={() => openHistoryModal(processedBill)} className="transition text-gray-600 hover:text-purple-500" title="Historial de Pagos"><History size={18} /></button>
                        </div>
                    ) : colKey === 'estado' ? processedBill.estado_badge : colKey === 'total' ? processedBill.total_formatted : colKey === 'saldo_pendiente' ? processedBill.saldo_pendiente_formatted : (bill as any)[colKey]}</td>))}</tr>);
              })}
              {(loadingBills && paginatedBills.length === 0) && <tr><td colSpan={columnOrder.length} className="py-8 text-center text-gray-500">Cargando facturas...</td></tr>}
              {(!loadingBills && paginatedBills.length === 0) && <tr><td colSpan={columnOrder.length} className="py-8 text-center text-gray-500">No se encontraron facturas.</td></tr>}
            </tbody>
            <tfoot className="bg-gray-100 border-t border-gray-300">
                <tr>
                    <td colSpan={columnOrder.length - 1} className="px-4 py-2 text-gray-700 text-left">
                        <label htmlFor="rowsPerPageAP" className="mr-2 text-sm">Filas por página:</label>
                        <select id="rowsPerPageAP" value={rowsPerPage} onChange={handleChangeRowsPerPage} className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm">{[10, 15, 20, 50, 75, 100].map(size => <option key={size} value={size}>{size}</option>)}</select>
                    </td>
                    <td className="px-4 py-2">
                        <div className="flex justify-end items-center space-x-2">
                            <button onClick={handlePrevPage} disabled={currentPage === 1} className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>&lt;</button>
                            <button disabled className="px-3 py-1 text-sm bg-blue-500 text-white rounded">{currentPage}</button>
                            <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0} className={`px-3 py-1 rounded text-sm ${currentPage === totalPages || totalPages === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>&gt;</button>
                        </div>
                    </td>
                </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {isFilterModalOpen && (
        <Modal size="2xl" isOpen={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex items-center gap-2">
                  <Filter className="text-sky-500 h-6 w-6" />
                  Filtrar Cuentas por Pagar
                </ModalHeader>
                <ModalBody>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-4">
                      <Select
                        label="Estado"
                        selectedKeys={new Set([tempFilters.status])}
                        onSelectionChange={(keys) =>
                          setTempFilters(f => ({ ...f, status: Array.from(keys)[0] as string }))
                        }
                        items={[
                          { key: 'all', label: 'Todos los Estados' },
                          { key: 'Pendiente', label: 'Pendiente' },
                          { key: 'Pagada', label: 'Pagada' },
                          { key: 'Vencida', label: 'Vencida' },
                          { key: 'Parcial', label: 'Parcial' },
                          { key: 'Anulada', label: 'Anulada' },
                        ]}
                      >
                        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                      </Select>
                      <Select
                        label="Proveedor"
                        selectedKeys={new Set([tempFilters.providerId])}
                        onSelectionChange={(keys) =>
                          setTempFilters(f => ({ ...f, providerId: Array.from(keys)[0] as string }))
                        }
                        items={[
                          { key: 'all', label: 'Todos los Proveedores' },
                          ...providersList.map(p => ({ key: String(p.id), label: p.nombre }))
                        ]}
                      >
                        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                      </Select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <h3 className="font-semibold text-gray-800">Rango de Fechas de Emisión</h3>
                      <DateInput
                        label="Desde"
                        value={tempFilters.dateRange.start ? parseDate(tempFilters.dateRange.start.toISOString().split('T')[0]) : null}
                        onChange={(date) => handleDateChange(date, 'start')}
                      />
                      <DateInput
                        label="Hasta"
                        value={tempFilters.dateRange.end ? parseDate(tempFilters.dateRange.end.toISOString().split('T')[0]) : null}
                        onChange={(date) => handleDateChange(date, 'end')}
                      />
                    </div>
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button
                    variant="bordered"
                    onPress={handleClearFilters}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 hover:text-gray-700 text-sm"
                    style={{ color: "black" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "black")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "black")}
                  >
                    Limpiar
                  </Button>
                  <Button color="primary" onPress={handleApplyFilters}>
                    Aplicar
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}

      {isDebitNoteModalOpen && activeFilters.providerId !== 'all' && (
        <CreateDebitNoteModal
          isOpen={isDebitNoteModalOpen}
          onClose={() => setIsDebitNoteModalOpen(false)}
          proveedorId={parseInt(activeFilters.providerId, 10)}
          onSaved={refreshAllData}
        />
      )}

      {isNewBillModalOpen && ( <CreateBillForm isOpen={isNewBillModalOpen} onClose={() => setIsNewBillModalOpen(false)} onBillCreated={() => handleBillActionSuccess("Factura creada.")} onProductCreated={fetchFormData} providers={providersList} condicionesPago={condicionesPagoList} monedas={monedasList} productos={productosList} /> )}
      {selectedBill && isPayBillModalOpen && ( <PayBillForm isOpen={isPayBillModalOpen} onClose={() => setIsPayBillModalOpen(false)} onPaymentRegistered={() => handleBillActionSuccess("Pago registrado.")} bill={selectedBill} monedas={monedasList} /> )}
      {selectedBill && isViewBillModalOpen && ( <ViewBillModal isOpen={isViewBillModalOpen} onClose={() => setIsViewBillModalOpen(false)} bill={selectedBill} /> )}
      {selectedBill && isAnnulBillModalOpen && ( <ConfirmationModal isOpen={isAnnulBillModalOpen} onClose={() => setIsAnnulBillModalOpen(false)} onConfirm={handleConfirmAnnulBill} title="Confirmar Anulación" message={`¿Anular la factura ${selectedBill.numero_documento}? Esta acción ajustará el stock de los productos involucrados.`} confirmText="Anular" isConfirming={loadingBills} /> )}
      {selectedBill && isHistoryModalOpen && ( <BillPaymentHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} bill={selectedBill} monedasList={monedasList} /> )}
    </div>
  );
};