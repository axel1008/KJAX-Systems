import React, { useState, useEffect, useMemo, useCallback, DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

import { MetricCard } from "../../components/ui/metric-card";
import { StatusBadge } from "../../components/ui/status-badge";
import { ConfirmationModal } from "../../components/ui/confirmation-modal";
import { supabase } from "../../supabaseClient";
import type { Factura, ProcessedInvoice, RawFactura } from "./types";
import InvoiceForm from "./InvoiceForm";
import EditInvoiceForm from "./EditInvoiceForm";
import PayInvoiceForm from "./PayInvoiceForm";
import InvoicePaymentHistoryModal from "./InvoicePaymentHistoryModal";

import { PaperAirplaneIcon, BanknotesIcon, ClockIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
// CAMBIO: Se importa FileX2 y se elimina TrashIcon de heroicons
import { Search, Plus, Download, Filter, ChevronDown, Eye, Edit, FileX2 } from "lucide-react"; 
import { testSignInvoice } from './api';

type ColumnKey =
  | "id" | "cliente_nombre_display" | "fecha_emision" | "fecha_vencimiento"
  | "total_formatted" | "saldo_pendiente_formatted" | "estado_badge" | "acciones";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  width?: string;
}

const condicionesVenta = [
    { codigo: "01", nombre: "Contado" }, { codigo: "02", nombre: "Crédito" }, { codigo: "03", nombre: "Consignación" },
    { codigo: "04", nombre: "Apartado" }, { codigo: "05", nombre: "Arrendamiento con opción de compra" },
    { codigo: "06", nombre: "Arrendamiento en función financiera" }, { codigo: "99", nombre: "Otros" },
];

export const InvoicingPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [invoices, setInvoices] = useState<Factura[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || "");
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isAnnulModalOpen, setIsAnnulModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<ProcessedInvoice | null>(null);
    const [invoiceToDelete, setInvoiceToDelete] = useState<Factura | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
        "id", "cliente_nombre_display", "fecha_emision", "fecha_vencimiento", "total_formatted", "saldo_pendiente_formatted", "estado_badge", "acciones",
    ]);
    const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);

    const allColumns: Record<ColumnKey, ColumnDef> = {
        id: { key: "id", label: "FACTURA ID", width: "150px" },
        cliente_nombre_display: { key: "cliente_nombre_display", label: "CLIENTE", width: "220px" },
        fecha_emision: { key: "fecha_emision", label: "F. EMISIÓN", width: "130px" },
        fecha_vencimiento: { key: "fecha_vencimiento", label: "F. VENCIM.", width: "130px" },
        total_formatted: { key: "total_formatted", label: "TOTAL", width: "150px" },
        saldo_pendiente_formatted: { key: "saldo_pendiente_formatted", label: "SALDO PEND.", width: "150px" },
        estado_badge: { key: "estado_badge", label: "ESTADO", width: "120px" },
        acciones: { key: "acciones", label: "ACCIONES", width: "210px" },
    };

    const fetchInvoices = useCallback(async () => {
        setLoadingData(true);
        const { data, error } = await supabase.from("facturas").select<string, RawFactura>("*, clientes ( nombre )").order("fecha_emision", { ascending: false });
        if (error) {
            toast.error(`Error cargando facturas: ${error.message}`);
            setInvoices([]);
        } else if (data) {
            const transformedData: Factura[] = data.map((f) => ({ ...f, fecha_emision: new Date(f.fecha_emision).toISOString().split("T")[0], fecha_vencimiento: f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toISOString().split("T")[0] : 'N/A', cliente_nombre: f.clientes?.nombre || "Desconocido" }));
            setInvoices(transformedData);
        }
        setLoadingData(false);
    }, []);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
    useEffect(() => { setSearchQuery(searchParams.get('q') || ''); }, [searchParams]);

    const onDragStart = (e: DragEvent<HTMLTableHeaderCellElement>, key: ColumnKey) => { setDraggedKey(key); if(e.dataTransfer) e.dataTransfer.effectAllowed = "move"; };
    const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
    const onDrop = (e: DragEvent<HTMLTableHeaderCellElement>, targetKey: ColumnKey) => { e.preventDefault(); if (!draggedKey || draggedKey === targetKey) return; setColumnOrder(cols => { const arr = [...cols]; const from = arr.indexOf(draggedKey); const to = arr.indexOf(targetKey); arr.splice(from, 1); arr.splice(to, 0, draggedKey); return arr; }); setDraggedKey(null); };

    const formatCurrency = (value: number | undefined | null): string => { if (value === undefined || value === null) return "₡0.00"; return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(value); };
    
    const handleConfirmAnnul = async () => { if (!selectedInvoice) return; const { error } = await supabase.from("facturas").update({ estado: 'Anulada', saldo_pendiente: 0 }).eq('id', selectedInvoice.id); if (error) { toast.error(`Error al anular factura: ${error.message}`); } else { toast.success("Factura anulada correctamente."); } setIsAnnulModalOpen(false); fetchInvoices(); };
    
    const handleInvoiceCreated = (newInvoice: Factura) => { fetchInvoices(); setIsNewModalOpen(false); toast.success(`Factura ${newInvoice.consecutivo || newInvoice.id.substring(0,8)} creada.`); };

    const getCondicionVentaNombre = (codigo: string) => condicionesVenta.find(c => c.codigo === codigo)?.nombre || 'Desconocido';

    const handleSignTest = async (invoice: ProcessedInvoice) => {
        const toastId = toast.loading('Preparando datos para la firma...');
        try {
            const { estado_badge, total_formatted, saldo_pendiente_formatted, cliente_nombre_display, ...cleanInvoiceData } = invoice;
            const { data: emisorData, error: emisorError } = await supabase.from('configuracion_empresa').select('*').limit(1).single();
            if (emisorError || !emisorData) throw new Error("No se pudo cargar la configuración del emisor.");
            const { data: receptorData, error: receptorError } = await supabase.from('clientes').select('*').eq('id', invoice.cliente_id).single();
            if (receptorError || !receptorData) throw new Error(`No se encontraron los datos fiscales del cliente ID: ${invoice.cliente_id}`);
            const fullInvoicePayload = { ...cleanInvoiceData, emisor: emisorData, receptor: receptorData };
            toast.loading('Enviando para firmar...', { id: toastId });
            const signedXml = await testSignInvoice(fullInvoicePayload as any);
            toast.success('¡XML firmado con éxito! Revisa la consola del navegador.', { id: toastId, duration: 4000 });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            toast.error(`Error al firmar: ${errorMessage}`, { id: toastId });
        }
    };
    
    const filteredInvoices = useMemo(() => invoices.filter((invoice) => (invoice.id?.toLowerCase().includes(searchQuery.toLowerCase()) || (invoice.cliente_nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) || (invoice.estado || "").toLowerCase().includes(searchQuery.toLowerCase()))), [invoices, searchQuery]);
    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / rowsPerPage));
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const processedInvoices: ProcessedInvoice[] = useMemo(() => paginatedInvoices.map((invoice: Factura) => ({ ...invoice, total_formatted: formatCurrency(invoice.total_factura), saldo_pendiente_formatted: formatCurrency(invoice.saldo_pendiente ?? invoice.total_factura), estado_badge: <StatusBadge text={invoice.estado} type={invoice.estado.toLowerCase()} />, cliente_nombre_display: invoice.cliente_nombre || 'N/A' })), [paginatedInvoices]);
    
    const detallesFactura = useMemo(() => { if (!selectedInvoice?.detalle) return []; try { return JSON.parse(selectedInvoice.detalle); } catch (e) { console.error("Error al parsear detalle de factura:", e); return []; } }, [selectedInvoice]);

    const totalFacturas = invoices.length;
    const totalPendiente = invoices.filter(f => f.estado === 'Pendiente' || f.estado === 'Vencida').reduce((sum, f) => sum + (f.saldo_pendiente ?? f.total_factura), 0);
    
    return (
        <div className="p-4 md:p-6 min-h-screen font-sans">
            
            <div className="mb-4">
                <h1 className="flex items-center text-2xl font-bold text-gray-900">
                    <DocumentTextIcon className="h-6 w-6 text-black mr-2" />
                    Facturación
                </h1>
                <p className="text-gray-600 text-base">
                    Gestiona tus facturas emitidas y recibidas
                </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <MetricCard title="Total Facturas" value={totalFacturas} icon={<Icon icon="lucide:file-text" />} />
                <MetricCard title="Total Pendiente por Cobrar" value={formatCurrency(totalPendiente)} icon={<Icon icon="lucide:file-warning" className="text-amber-500" />} />
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
                        placeholder="Buscar por cliente o estado..."
                        className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 hover:border-gray-300 transition"
                    />
                </div>

                <div className="flex space-x-2 w-full md:w-auto justify-end">
                    <Button
                        onPress={() => toast.success("Exportar próximamente")}
                        variant="bordered"
                        startContent={<Download className="h-4 w-4 mr-2 text-gray-500" />}
                        className="hover:bg-gray-300 border border-gray-300"
                         style={{
                           height: "38px",
                           paddingTop: 0,
                           paddingBottom: 0,
                           backgroundColor: "white",
                         }}
                    >
                        Exportar
                    </Button>
                    <Button
                        onPress={() => setIsNewModalOpen(true)}
                        color="primary"
                        startContent={<Plus className="h-5 w-5 mr-1" />}
                    >
                        Nueva Factura
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
                <table className="min-w-full text-center table-fixed">
                    <thead className="bg-gray-200 border-b border-gray-300">
                        <tr>{columnOrder.map(colKey => (<th key={colKey} draggable onDragStart={(e) => onDragStart(e, colKey)} onDragOver={onDragOver} onDrop={(e) => onDrop(e, colKey)} onDragEnd={() => setDraggedKey(null)} style={{ width: allColumns[colKey].width }} className={`px-4 py-3 text-center text-xs uppercase tracking-wider cursor-move select-none font-bold text-gray-800 ${draggedKey === colKey ? "opacity-50" : ""}`}>{allColumns[colKey].label}</th>))}</tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {processedInvoices.map((invoice) => (
                        <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                        {columnOrder.map(colKey => (
                            <td key={colKey} className="px-4 py-3 text-center text-gray-700 whitespace-nowrap font-normal">
                            {colKey === 'acciones' ? (
                                <div className="flex justify-center space-x-2">
                                    <button type="button" onClick={() => { setSelectedInvoice(invoice); setIsViewModalOpen(true); }} title="Ver" className="p-2 rounded-full transition text-gray-600 hover:text-blue-500"><Eye size={18} /></button>
                                    <Button
                                      isIconOnly
                                      variant="shadow-none"
                                      size="sm"
                                      className="text-gray-600 hover:text-blue-600"
                                      onPress={() => { setSelectedInvoice(invoice); setIsEditModalOpen(true); }}
                                      title="Editar"
                                      isDisabled={invoice.estado !== 'Pendiente'}
                                    >
                                      <Edit size={18} />
                                    </Button>

                                    {/* CAMBIO: Se reemplaza el icono de Anular */}
                                    <button type="button" onClick={() => { setSelectedInvoice(invoice); setIsAnnulModalOpen(true); }} title="Anular" disabled={invoice.estado === 'Anulada' || invoice.estado === 'Pagada'} className="transition text-gray-600 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                        <FileX2 size={18} />
                                    </button>
                                    
                                    <button type="button" onClick={() => { setSelectedInvoice(invoice); setIsPayModalOpen(true); }} title="Pagar" disabled={invoice.estado === 'Anulada' || invoice.estado === 'Pagada'} className="transition text-gray-600 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"><BanknotesIcon className="h-[18px] w-[18px]" /></button>
                                    <button type="button" onClick={() => { setSelectedInvoice(invoice); setIsHistoryModalOpen(true); }} title="Historial de Pagos" className="transition text-gray-600 hover:text-purple-500"><ClockIcon className="h-[18px] w-[18px]" /></button>
                                    <button type="button" onClick={() => handleSignTest(invoice)} title="Probar Firma de Hacienda" className="transition text-gray-600 hover:text-sky-600"><PaperAirplaneIcon className="h-[18px] w-[18px]" /></button>
                                </div>
                            ) : colKey === 'estado_badge' ? invoice.estado_badge : colKey === 'id' ? invoice.id.substring(0, 8) : (invoice as any)[colKey]}
                            </td>
                        ))}
                        </tr>
                    ))}
                    {paginatedInvoices.length === 0 && <tr><td colSpan={columnOrder.length} className="py-8 text-center text-gray-500">{loadingData ? "Cargando..." : "No se encontraron facturas."}</td></tr>}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t border-gray-300">
                         <tr>
                           <td colSpan={columnOrder.length - 1} className="px-4 py-2 text-gray-700 text-left">
                               <label htmlFor="pageSizeInvoices" className="mr-2 text-sm">Filas por página:</label>
                               <select id="pageSizeInvoices" value={rowsPerPage} onChange={e => { setRowsPerPage(+e.target.value); setCurrentPage(1); }} className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm">
                                   {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                               </select>
                           </td>
                           <td className="px-4 py-2">
                               <div className="flex justify-end items-center space-x-2">
                                   <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>&lt;</button>
                                   <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded" disabled>{currentPage}</button>
                                   <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || totalPages === 0} className={`px-3 py-1 rounded text-sm ${currentPage === totalPages || totalPages === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}>&gt;</button>
                               </div>
                           </td>
                         </tr>
                    </tfoot>
                </table>
            </div>
            
            <Modal isOpen={isNewModalOpen} onOpenChange={setIsNewModalOpen} size="5xl" scrollBehavior='inside'><ModalContent><ModalHeader>Nueva Factura</ModalHeader><ModalBody><InvoiceForm onSubmit={handleInvoiceCreated} onCancel={() => setIsNewModalOpen(false)} /></ModalBody></ModalContent></Modal>
            {selectedInvoice && <EditInvoiceForm isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} invoiceData={selectedInvoice} onUpdated={() => { fetchInvoices(); setIsEditModalOpen(false); toast.success("Factura actualizada."); }} />}
            {selectedInvoice && <PayInvoiceForm isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} invoice={selectedInvoice} onPaymentRegistered={() => { fetchInvoices(); setIsPayModalOpen(false); toast.success("Pago registrado."); }} />}
            {selectedInvoice && (<InvoicePaymentHistoryModal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} invoice={selectedInvoice} />)}
            {selectedInvoice && (<Modal isOpen={isViewModalOpen} onOpenChange={() => setIsViewModalOpen(false)} scrollBehavior="inside"><ModalContent>{(onModalClose) => (<><ModalHeader className="flex flex-col gap-1">Detalles de la Factura<span className="text-sm font-normal text-slate-500">{selectedInvoice.id}</span></ModalHeader><ModalBody><div className="space-y-4"><div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm"><div className="font-semibold text-slate-600">Cliente:</div><div className="text-slate-800">{selectedInvoice.cliente_nombre_display}</div><div className="font-semibold text-slate-600">Fecha Emisión:</div><div className="text-slate-800">{selectedInvoice.fecha_emision}</div><div className="font-semibold text-slate-600">Condición:</div><div className="text-slate-800">{getCondicionVentaNombre(selectedInvoice.condicion_venta)}</div><div className="font-semibold text-slate-600">Estado:</div><div>{selectedInvoice.estado_badge}</div></div><div className="border-t pt-4"><h4 className="font-semibold text-slate-700 mb-2">Productos y Servicios</h4><div className="space-y-2">{detallesFactura.map((item: any, index: number) => (<div key={index} className="grid grid-cols-12 gap-2 p-2 rounded-md bg-slate-50 border"><div className="col-span-6 font-medium text-slate-700">{item.descripcion_item}</div><div className="col-span-2 text-center text-slate-600">x{item.cantidad}</div><div className="col-span-4 text-right text-slate-800">{formatCurrency(item.subtotal_linea)}</div></div>))}{detallesFactura.length === 0 && <p className="text-slate-500 text-xs">No hay detalles para mostrar.</p>}</div></div><div className="border-t pt-4 text-right space-y-1"><p className="text-sm text-slate-600">Impuestos: <span className="font-medium text-slate-800">{formatCurrency(selectedInvoice.total_impuesto)}</span></p><p className="text-lg font-bold text-slate-800">Total: <span className="text-sky-600">{selectedInvoice.total_formatted}</span></p><p className="text-sm font-semibold text-red-600">Saldo Pendiente: {selectedInvoice.saldo_pendiente_formatted}</p></div></div></ModalBody><ModalFooter><Button color="primary" onPress={onModalClose}>Cerrar</Button></ModalFooter></>)}</ModalContent></Modal>)}
            {selectedInvoice && <ConfirmationModal isOpen={isAnnulModalOpen} onClose={() => setIsAnnulModalOpen(false)} onConfirm={handleConfirmAnnul} title="Anular Factura" message={`¿Seguro que deseas anular la factura? Esta acción no se puede deshacer.`} />}
        </div>
    );
};

export default InvoicingPage;