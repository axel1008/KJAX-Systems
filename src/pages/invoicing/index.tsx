import React, { useState, useEffect, useMemo, useCallback, DragEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip } from "@heroui/react";
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
import { Search, Plus, Download, Filter, Eye, Edit, FileX2, Zap, FileText, AlertCircle, Clock, Mail, Bell, RefreshCw } from "lucide-react";

type ColumnKey =
  | "id" | "cliente_nombre_display" | "fecha_emision" | "dias_vencido"
  | "tipo_factura" | "clave_hacienda" | "total_formatted" 
  | "saldo_pendiente_formatted" | "estado_badge" | "acciones";

interface ColumnDef {
  key: ColumnKey;
  label: string;
  width?: string;
}

interface ExtendedProcessedInvoice extends ProcessedInvoice {
  dias_vencido: string;
  tipo_factura_badge: React.ReactNode;
  clave_display: string;
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
    const [filtroEstado, setFiltroEstado] = useState<string>("Todas");
    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [isAnnulModalOpen, setIsAnnulModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<ExtendedProcessedInvoice | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [columnOrder, setColumnOrder] = useState<ColumnKey[]>([
        "id", "cliente_nombre_display", "fecha_emision", "dias_vencido", 
        "tipo_factura", "clave_hacienda", "total_formatted", 
        "saldo_pendiente_formatted", "estado_badge", "acciones",
    ]);
    const [draggedKey, setDraggedKey] = useState<ColumnKey | null>(null);

    const allColumns: Record<ColumnKey, ColumnDef> = {
        id: { key: "id", label: "FACTURA ID", width: "120px" },
        cliente_nombre_display: { key: "cliente_nombre_display", label: "CLIENTE", width: "200px" },
        fecha_emision: { key: "fecha_emision", label: "F. EMISIÓN", width: "110px" },
        dias_vencido: { key: "dias_vencido", label: "DÍAS VENC.", width: "100px" },
        tipo_factura: { key: "tipo_factura", label: "TIPO", width: "90px" },
        clave_hacienda: { key: "clave_hacienda", label: "CLAVE", width: "130px" },
        total_formatted: { key: "total_formatted", label: "TOTAL", width: "120px" },
        saldo_pendiente_formatted: { key: "saldo_pendiente_formatted", label: "SALDO PEND.", width: "120px" },
        estado_badge: { key: "estado_badge", label: "ESTADO", width: "100px" },
        acciones: { key: "acciones", label: "ACCIONES", width: "240px" },
    };

    const fetchInvoices = useCallback(async () => {
        setLoadingData(true);
        const { data, error } = await supabase
            .from("facturas")
            .select<string, RawFactura>("*, clientes ( nombre )")
            .order("fecha_emision", { ascending: false });
            
        if (error) {
            toast.error(`Error cargando facturas: ${error.message}`);
            setInvoices([]);
        } else if (data) {
            const transformedData: Factura[] = data.map((f) => ({
                ...f,
                fecha_emision: new Date(f.fecha_emision).toISOString().split("T")[0],
                fecha_vencimiento: f.fecha_vencimiento ? new Date(f.fecha_vencimiento).toISOString().split("T")[0] : null,
                cliente_nombre: f.clientes?.nombre || "Desconocido"
            }));
            setInvoices(transformedData);
        }
        setLoadingData(false);
    }, []);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
    useEffect(() => { setSearchQuery(searchParams.get('q') || ''); }, [searchParams]);

    // === FUNCIONES DE EMAIL === //

    // Función para enviar factura completa por email
    const enviarFacturaPorEmail = async (facturaId: string) => {
        const toastId = toast.loading('Enviando factura por email...');
        
        try {
            const response = await fetch('http://localhost:8080/api/enviar_factura_completa.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    factura_id: facturaId,
                    tipo: 'factura'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(
                    `✅ Factura enviada a ${result.destinatario}`, 
                    { id: toastId, duration: 4000 }
                );
                // Actualizar tabla
                fetchInvoices();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error: any) {
            toast.error(`❌ Error enviando factura: ${error.message}`, { id: toastId });
        }
    };

    // Función para enviar recordatorio de vencimiento
    const enviarRecordatorio = async (facturaId: string) => {
        const toastId = toast.loading('Enviando recordatorio de vencimiento...');
        
        try {
            const response = await fetch('http://localhost:8080/api/enviar_recordatorio.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    factura_id: facturaId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(
                    `🔔 Recordatorio enviado a ${result.destinatario}`, 
                    { id: toastId, duration: 4000 }
                );
            } else {
                throw new Error(result.error);
            }
            
        } catch (error: any) {
            toast.error(`❌ Error enviando recordatorio: ${error.message}`, { id: toastId });
        }
    };

    // Función para reenviar factura (forzar reenvío)
    const reenviarFactura = async (facturaId: string) => {
        const toastId = toast.loading('Reenviando factura...');
        
        try {
            const response = await fetch('http://localhost:8080/api/enviar_factura_completa.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    factura_id: facturaId,
                    forzar_reenvio: true,
                    tipo: 'factura'
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                toast.success(
                    `🔄 Factura reenviada a ${result.destinatario}`, 
                    { id: toastId, duration: 4000 }
                );
                fetchInvoices();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error: any) {
            toast.error(`❌ Error reenviando factura: ${error.message}`, { id: toastId });
        }
    };

    // Función para probar configuración de email
    const probarConfiguracionEmail = async () => {
        const toastId = toast.loading('Verificando configuración de email...');
        
        try {
            const response = await fetch('http://localhost:8080/api/test_email.php');
            const result = await response.json();
            
            if (result.success) {
                toast.success('✅ Configuración de email válida', { id: toastId });
            } else {
                toast.error(`❌ Error de configuración: ${result.error}`, { id: toastId });
            }
            
        } catch (error: any) {
            toast.error(`❌ Error verificando email: ${error.message}`, { id: toastId });
        }
    };

    // Funciones de drag and drop
    const onDragStart = (e: DragEvent<HTMLTableHeaderCellElement>, key: ColumnKey) => { 
        setDraggedKey(key); 
        if(e.dataTransfer) e.dataTransfer.effectAllowed = "move"; 
    };
    const onDragOver = (e: DragEvent<HTMLTableHeaderCellElement>) => e.preventDefault();
    const onDrop = (e: DragEvent<HTMLTableHeaderCellElement>, targetKey: ColumnKey) => { 
        e.preventDefault(); 
        if (!draggedKey || draggedKey === targetKey) return; 
        setColumnOrder(cols => { 
            const arr = [...cols]; 
            const from = arr.indexOf(draggedKey); 
            const to = arr.indexOf(targetKey); 
            arr.splice(from, 1); 
            arr.splice(to, 0, draggedKey); 
            return arr; 
        }); 
        setDraggedKey(null); 
    };

    // Funciones de utilidad
    const formatCurrency = (value: number | undefined | null): string => { 
        if (value === undefined || value === null) return "₡0.00"; 
        return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(value); 
    };

    const calcularDiasVencido = (fechaVencimiento: string | null, estado: string): { texto: string, color: string } => {
        if (!fechaVencimiento || estado === 'Pagada' || estado === 'Anulada') {
            return { texto: '-', color: 'text-gray-400' };
        }
        
        const hoy = new Date();
        const vencimiento = new Date(fechaVencimiento);
        const diferencia = Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diferencia <= 0) {
            return { texto: `${Math.abs(diferencia)}d`, color: 'text-blue-600' }; // Por vencer
        } else if (diferencia <= 30) {
            return { texto: `+${diferencia}d`, color: 'text-green-600' }; // Recién vencida
        } else if (diferencia <= 60) {
            return { texto: `+${diferencia}d`, color: 'text-yellow-600' }; // Moderadamente vencida
        } else {
            return { texto: `+${diferencia}d`, color: 'text-red-600' }; // Muy vencida
        }
    };

    const getTipoFacturaBadge = (tipoFactura: string) => {
        if (tipoFactura === 'ELECTRONICA') {
            return (
                <Chip size="sm" color="primary" variant="flat" className="text-xs">
                    ⚡ Electrónica
                </Chip>
            );
        } else {
            return (
                <Chip size="sm" color="default" variant="flat" className="text-xs">
                    📄 Normal
                </Chip>
            );
        }
    };

    const getClaveDisplay = (clave: string | null, tipoFactura: string): string => {
        if (tipoFactura !== 'ELECTRONICA' || !clave) {
            return '-';
        }
        return clave.length > 12 ? `...${clave.slice(-12)}` : clave;
    };

    // Manejadores de eventos
    const handleConfirmAnnul = async () => { 
        if (!selectedInvoice) return; 
        const { error } = await supabase
            .from("facturas")
            .update({ estado: 'Anulada', saldo_pendiente: 0 })
            .eq('id', selectedInvoice.id); 
        if (error) { 
            toast.error(`Error al anular factura: ${error.message}`); 
        } else { 
            toast.success("Factura anulada correctamente."); 
        } 
        setIsAnnulModalOpen(false); 
        fetchInvoices(); 
    };
    
    const handleInvoiceCreated = (newInvoice: Factura) => { 
        fetchInvoices(); 
        setIsNewModalOpen(false); 
        toast.success(`Factura ${newInvoice.consecutivo || newInvoice.id.substring(0,8)} creada.`); 
    };

    const getCondicionVentaNombre = (codigo: string) => 
        condicionesVenta.find(c => c.codigo === codigo)?.nombre || 'Desconocido';

    const handleReenviarHacienda = async (invoice: ExtendedProcessedInvoice) => {
        const toastId = toast.loading('Reenviando a Hacienda...');
        try {
            // Aquí iría la lógica para reenviar a Hacienda
            // Por ahora simular
            await new Promise(resolve => setTimeout(resolve, 2000));
            toast.success('Reenviado a Hacienda exitosamente', { id: toastId });
            fetchInvoices();
        } catch (error) {
            toast.error('Error al reenviar a Hacienda', { id: toastId });
        }
    };

    const handleGenerarPDF = async (invoice: ExtendedProcessedInvoice) => {
        const toastId = toast.loading('Generando PDF...');
        try {
            // Obtener datos completos del emisor
            const { data: emisorData, error: emisorError } = await supabase
                .from('configuracion_empresa')
                .select('*')
                .limit(1)
                .single();
                
            if (emisorError || !emisorData) {
                throw new Error("No se pudo cargar la configuración del emisor.");
            }

            // Obtener datos completos del receptor
            const { data: receptorData, error: receptorError } = await supabase
                .from('clientes')
                .select('*')
                .eq('id', invoice.cliente_id)
                .single();
                
            if (receptorError || !receptorData) {
                throw new Error(`No se encontraron los datos del cliente ID: ${invoice.cliente_id}`);
            }

            // Parsear detalles de la factura
            let detalles = [];
            try {
                detalles = JSON.parse(invoice.detalle || '[]');
            } catch (e) {
                console.error("Error al parsear detalle de factura:", e);
                detalles = [];
            }

            // Preparar payload para PDF
            const pdfPayload = {
                factura: {
                    id: invoice.id,
                    consecutivo: invoice.consecutivo,
                    clave: invoice.clave,
                    fecha_emision: invoice.fecha_emision,
                    fecha_vencimiento: invoice.fecha_vencimiento,
                    condicion_venta: invoice.condicion_venta,
                    medio_pago: invoice.medio_pago,
                    moneda: invoice.moneda,
                    plazo_credito: invoice.plazo_credito,
                    tipo_factura: invoice.tipo_factura,
                    total_factura: invoice.total_factura,
                    total_impuesto: invoice.total_impuesto,
                    estado: invoice.estado
                },
                emisor: emisorData,
                receptor: receptorData,
                detalles: detalles
            };

            console.log('📄 Enviando datos para PDF:', pdfPayload);

            // Llamar al backend PHP para generar PDF
            const response = await fetch('http://localhost:8080/api/pdf.php', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(pdfPayload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error desconocido al generar PDF');
            }

            // Descargar PDF
            const pdfBlob = new Blob([
                Uint8Array.from(atob(result.pdf_base64), c => c.charCodeAt(0))
            ], { type: 'application/pdf' });

            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = result.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('PDF descargado exitosamente', { id: toastId });

        } catch (error: any) {
            console.error('❌ Error generando PDF:', error);
            toast.error(`Error al generar PDF: ${error.message}`, { id: toastId });
        }
    };

    // Filtrado y paginación
    const filteredInvoices = useMemo(() => {
        let filtered = invoices.filter((invoice) => (
            invoice.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (invoice.cliente_nombre || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (invoice.estado || "").toLowerCase().includes(searchQuery.toLowerCase())
        ));

        // Aplicar filtro de estado
        if (filtroEstado !== "Todas") {
            if (filtroEstado === "Vencidas") {
                filtered = filtered.filter(invoice => {
                    if (!invoice.fecha_vencimiento || invoice.estado === 'Pagada' || invoice.estado === 'Anulada') return false;
                    const hoy = new Date();
                    const vencimiento = new Date(invoice.fecha_vencimiento);
                    return hoy > vencimiento;
                });
            } else if (filtroEstado === "Electrónicas") {
                filtered = filtered.filter(invoice => invoice.tipo_factura === 'ELECTRONICA');
            } else if (filtroEstado === "Normales") {
                filtered = filtered.filter(invoice => invoice.tipo_factura === 'NORMAL');
            } else {
                filtered = filtered.filter(invoice => invoice.estado === filtroEstado);
            }
        }

        return filtered;
    }, [invoices, searchQuery, filtroEstado]);

    const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / rowsPerPage));
    const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const processedInvoices: ExtendedProcessedInvoice[] = useMemo(() => 
        paginatedInvoices.map((invoice: Factura) => {
            const diasVencido = calcularDiasVencido(invoice.fecha_vencimiento, invoice.estado);
            return {
                ...invoice,
                total_formatted: formatCurrency(invoice.total_factura),
                saldo_pendiente_formatted: formatCurrency(invoice.saldo_pendiente ?? invoice.total_factura),
                estado_badge: <StatusBadge text={invoice.estado} type={invoice.estado.toLowerCase()} />,
                cliente_nombre_display: invoice.cliente_nombre || 'N/A',
                dias_vencido: diasVencido.texto,
                tipo_factura_badge: getTipoFacturaBadge(invoice.tipo_factura || 'NORMAL'),
                clave_display: getClaveDisplay(invoice.clave, invoice.tipo_factura || 'NORMAL')
            } as ExtendedProcessedInvoice;
        }), [paginatedInvoices]);
    
    const detallesFactura = useMemo(() => { 
        if (!selectedInvoice?.detalle) return []; 
        try { 
            return JSON.parse(selectedInvoice.detalle); 
        } catch (e) { 
            console.error("Error al parsear detalle de factura:", e); 
            return []; 
        } 
    }, [selectedInvoice]);

    // Métricas mejoradas
    const totalFacturas = invoices.length;
    const facturasMesActual = invoices.filter(f => {
        const fechaFactura = new Date(f.fecha_emision);
        const hoy = new Date();
        return fechaFactura.getMonth() === hoy.getMonth() && fechaFactura.getFullYear() === hoy.getFullYear();
    });
    const totalPendienteCobro = invoices
        .filter(f => f.estado === 'Pendiente' || f.estado === 'Vencida')
        .reduce((sum, f) => sum + (f.saldo_pendiente ?? f.total_factura), 0);
    const facturasVencidas = invoices.filter(f => {
        if (!f.fecha_vencimiento || f.estado === 'Pagada' || f.estado === 'Anulada') return false;
        const hoy = new Date();
        const vencimiento = new Date(f.fecha_vencimiento);
        const diferencia = Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
        return diferencia > 30;
    });
    const facturasElectronicas = invoices.filter(f => f.tipo_factura === 'ELECTRONICA');

    // Función para renderizar acciones optimizadas con emails
    const renderAcciones = (invoice: ExtendedProcessedInvoice) => {
        return (
            <div className="flex justify-center space-x-1">
                {/* Ver - siempre disponible */}
                <button 
                    type="button" 
                    onClick={() => { setSelectedInvoice(invoice); setIsViewModalOpen(true); }} 
                    title="Ver Detalles" 
                    className="p-1.5 rounded-full transition text-gray-600 hover:text-blue-500 hover:bg-blue-50"
                >
                    <Eye size={16} />
                </button>

                {/* Editar - solo si pendiente */}
                {invoice.estado === 'Pendiente' && (
                    <button 
                        type="button" 
                        onClick={() => { setSelectedInvoice(invoice); setIsEditModalOpen(true); }} 
                        title="Editar" 
                        className="p-1.5 rounded-full transition text-gray-600 hover:text-blue-500 hover:bg-blue-50"
                    >
                        <Edit size={16} />
                    </button>
                )}

                {/* Enviar por Email - siempre disponible */}
                <button 
                    type="button" 
                    onClick={() => enviarFacturaPorEmail(invoice.id)} 
                    title="Enviar Factura por Email" 
                    className="p-1.5 rounded-full transition text-gray-600 hover:text-green-500 hover:bg-green-50"
                >
                    <Mail size={16} />
                </button>

                {/* Recordatorio - solo si pendiente o vencida */}
                {(invoice.estado === 'Pendiente' || invoice.estado === 'Vencida') && (
                    <button 
                        type="button" 
                        onClick={() => enviarRecordatorio(invoice.id)} 
                        title="Enviar Recordatorio de Vencimiento" 
                        className="p-1.5 rounded-full transition text-gray-600 hover:text-yellow-500 hover:bg-yellow-50"
                    >
                        <Bell size={16} />
                    </button>
                )}

                {/* Reenviar - solo si ya fue enviada */}
                {invoice.estado_envio === 'enviado' && (
                    <button 
                        type="button" 
                        onClick={() => reenviarFactura(invoice.id)} 
                        title="Reenviar Factura" 
                        className="p-1.5 rounded-full transition text-gray-600 hover:text-orange-500 hover:bg-orange-50"
                    >
                        <RefreshCw size={16} />
                    </button>
                )}

                {/* Pagar - solo si tiene saldo pendiente */}
                {(invoice.saldo_pendiente ?? invoice.total_factura) > 0 && invoice.estado !== 'Anulada' && (
                    <button 
                        type="button" 
                        onClick={() => { setSelectedInvoice(invoice); setIsPayModalOpen(true); }} 
                        title="Registrar Pago" 
                        className="p-1.5 rounded-full transition text-gray-600 hover:text-green-500 hover:bg-green-50"
                    >
                        <BanknotesIcon className="h-4 w-4" />
                    </button>
                )}

                {/* PDF - siempre disponible */}
                <button 
                    type="button" 
                    onClick={() => handleGenerarPDF(invoice)} 
                    title="Generar PDF" 
                    className="p-1.5 rounded-full transition text-gray-600 hover:text-purple-500 hover:bg-purple-50"
                >
                    <Download size={16} />
                </button>

                {/* Reenviar a Hacienda - solo electrónicas */}
                {invoice.tipo_factura === 'ELECTRONICA' && (
                    <button 
                        type="button" 
                        onClick={() => handleReenviarHacienda(invoice)} 
                        title="Reenviar a Hacienda" 
                        className="p-1.5 rounded-full transition text-gray-600 hover:text-blue-500 hover:bg-blue-50"
                    >
                        <PaperAirplaneIcon className="h-4 w-4" />
                    </button>
                )}

                {/* Historial de pagos */}
                <button 
                    type="button" 
                    onClick={() => { setSelectedInvoice(invoice); setIsHistoryModalOpen(true); }} 
                    title="Historial de Pagos" 
                    className="p-1.5 rounded-full transition text-gray-600 hover:text-purple-500 hover:bg-purple-50"
                >
                    <ClockIcon className="h-4 w-4" />
                </button>

                {/* Anular - solo si no está anulada o pagada */}
                {invoice.estado !== 'Anulada' && invoice.estado !== 'Pagada' && (
                    <button 
                        type="button" 
                        onClick={() => { setSelectedInvoice(invoice); setIsAnnulModalOpen(true); }} 
                        title="Anular" 
                        className="p-1.5 rounded-full transition text-gray-600 hover:text-red-500 hover:bg-red-50"
                    >
                        <FileX2 size={16} />
                    </button>
                )}
            </div>
        );
    };

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
            
            {/* Métricas mejoradas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <MetricCard 
                    title="Facturas Este Mes" 
                    value={facturasMesActual.length} 
                    icon={<FileText className="h-5 w-5" />} 
                />
                <MetricCard 
                    title="Pendiente de Cobro" 
                    value={formatCurrency(totalPendienteCobro)} 
                    icon={<AlertCircle className="h-5 w-5 text-yellow-500" />} 
                />
                <MetricCard 
                    title="Vencidas (+30 días)" 
                    value={facturasVencidas.length} 
                    icon={<Clock className="h-5 w-5 text-red-500" />} 
                />
                <MetricCard 
                    title="Enviadas a Hacienda" 
                    value={facturasElectronicas.length} 
                    icon={<Zap className="h-5 w-5 text-blue-500" />} 
                />
            </div>

            {/* Controles mejorados */}
            <div className="flex flex-col md:flex-row justify-between mb-4 space-y-3 md:space-y-0 md:space-x-4">
                {/* Búsqueda */}
                <div className="relative w-full md:w-1/4">
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
                        placeholder="Buscar por cliente, ID o estado..."
                        className="w-full bg-white border border-gray-200 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 hover:border-gray-300 transition"
                    />
                </div>

                {/* Filtros */}
                <div className="flex items-center space-x-2">
                    <Filter size={16} className="text-gray-500" />
                    <select
                        value={filtroEstado}
                        onChange={(e) => {
                            setFiltroEstado(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500 bg-white"
                    >
                        <option value="Todas">Todas</option>
                        <option value="Pendiente">Pendientes</option>
                        <option value="Vencidas">Vencidas</option>
                        <option value="Pagada">Pagadas</option>
                        <option value="Anulada">Anuladas</option>
                        <option value="Electrónicas">Electrónicas</option>
                        <option value="Normales">Normales</option>
                    </select>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-2">
                    <Button
                        onPress={probarConfiguracionEmail}
                        variant="bordered"
                        startContent={<Mail className="h-4 w-4" />}
                        className="hover:bg-gray-50 border border-gray-300"
                        style={{
                           height: "38px",
                           backgroundColor: "white",
                        }}
                    >
                        Test Email
                    </Button>
                    <Button
                        onPress={() => toast.success("Exportar próximamente")}
                        variant="bordered"
                        startContent={<Download className="h-4 w-4" />}
                        className="hover:bg-gray-50 border border-gray-300"
                        style={{
                           height: "38px",
                           backgroundColor: "white",
                        }}
                    >
                        Exportar
                    </Button>
                    <Button
                        onPress={() => setIsNewModalOpen(true)}
                        color="primary"
                        startContent={<Plus className="h-5 w-5" />}
                    >
                        Nueva Factura
                    </Button>
                </div>
            </div>

            {/* Tabla mejorada */}
            <div className="overflow-x-auto bg-white shadow rounded-lg border border-gray-200">
                <table className="min-w-full text-center table-fixed">
                    <thead className="bg-gray-200 border-b border-gray-300">
                        <tr>
                            {columnOrder.map(colKey => (
                                <th 
                                    key={colKey} 
                                    draggable 
                                    onDragStart={(e) => onDragStart(e, colKey)} 
                                    onDragOver={onDragOver} 
                                    onDrop={(e) => onDrop(e, colKey)} 
                                    onDragEnd={() => setDraggedKey(null)} 
                                    style={{ width: allColumns[colKey].width }} 
                                    className={`px-4 py-3 text-center text-xs uppercase tracking-wider cursor-move select-none font-bold text-gray-800 ${draggedKey === colKey ? "opacity-50" : ""}`}
                                >
                                    {allColumns[colKey].label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {processedInvoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                {columnOrder.map(colKey => (
                                    <td key={colKey} className="px-4 py-3 text-center text-gray-700 whitespace-nowrap font-normal">
                                        {colKey === 'acciones' ? renderAcciones(invoice) :
                                         colKey === 'estado_badge' ? invoice.estado_badge :
                                         colKey === 'id' ? invoice.id.substring(0, 8) :
                                         colKey === 'tipo_factura' ? invoice.tipo_factura_badge :
                                         colKey === 'clave_hacienda' ? (
                                            <span className="text-xs text-gray-600 font-mono">
                                                {invoice.clave_display}
                                            </span>
                                         ) :
                                         colKey === 'dias_vencido' ? (
                                            <span className={`text-sm font-medium ${calcularDiasVencido(invoice.fecha_vencimiento, invoice.estado).color}`}>
                                                {invoice.dias_vencido}
                                            </span>
                                         ) :
                                         (invoice as any)[colKey]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                        {paginatedInvoices.length === 0 && (
                            <tr>
                                <td colSpan={columnOrder.length} className="py-8 text-center text-gray-500">
                                    {loadingData ? "Cargando..." : filtroEstado === "Todas" ? "No se encontraron facturas." : `No hay facturas ${filtroEstado.toLowerCase()}.`}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot className="bg-gray-100 border-t border-gray-300">
                         <tr>
                           <td colSpan={columnOrder.length - 1} className="px-4 py-2 text-gray-700 text-left">
                               <label htmlFor="pageSizeInvoices" className="mr-2 text-sm">Filas por página:</label>
                               <select 
                                   id="pageSizeInvoices" 
                                   value={rowsPerPage} 
                                   onChange={e => { setRowsPerPage(+e.target.value); setCurrentPage(1); }} 
                                   className="border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-gray-800 text-sm"
                               >
                                   {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
                               </select>
                               <span className="ml-4 text-sm text-gray-600">
                                   Mostrando {((currentPage - 1) * rowsPerPage) + 1} - {Math.min(currentPage * rowsPerPage, filteredInvoices.length)} de {filteredInvoices.length}
                               </span>
                           </td>
                           <td className="px-4 py-2">
                               <div className="flex justify-end items-center space-x-2">
                                   <button 
                                       onClick={() => setCurrentPage(p => p - 1)} 
                                       disabled={currentPage === 1} 
                                       className={`px-3 py-1 rounded text-sm ${currentPage === 1 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                                   >
                                       &lt;
                                   </button>
                                   <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded" disabled>
                                       {currentPage}
                                   </button>
                                   <button 
                                       onClick={() => setCurrentPage(p => p + 1)} 
                                       disabled={currentPage === totalPages || totalPages === 0} 
                                       className={`px-3 py-1 rounded text-sm ${currentPage === totalPages || totalPages === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                                   >
                                       &gt;
                                   </button>
                               </div>
                           </td>
                         </tr>
                    </tfoot>
                </table>
            </div>
            
            {/* Modales */}
            <Modal isOpen={isNewModalOpen} onOpenChange={setIsNewModalOpen} size="5xl" scrollBehavior='inside'>
                <ModalContent>
                    <ModalHeader>Nueva Factura</ModalHeader>
                    <ModalBody>
                        <InvoiceForm onSubmit={handleInvoiceCreated} onCancel={() => setIsNewModalOpen(false)} />
                    </ModalBody>
                </ModalContent>
            </Modal>

            {selectedInvoice && (
                <EditInvoiceForm 
                    isOpen={isEditModalOpen} 
                    onClose={() => setIsEditModalOpen(false)} 
                    invoiceData={selectedInvoice} 
                    onUpdated={() => { 
                        fetchInvoices(); 
                        setIsEditModalOpen(false); 
                        toast.success("Factura actualizada."); 
                    }} 
                />
            )}

            {selectedInvoice && (
                <PayInvoiceForm 
                    isOpen={isPayModalOpen} 
                    onClose={() => setIsPayModalOpen(false)} 
                    invoice={selectedInvoice} 
                    onPaymentRegistered={() => { 
                        fetchInvoices(); 
                        setIsPayModalOpen(false); 
                        toast.success("Pago registrado."); 
                    }} 
                />
            )}

            {selectedInvoice && (
                <InvoicePaymentHistoryModal 
                    isOpen={isHistoryModalOpen} 
                    onClose={() => setIsHistoryModalOpen(false)} 
                    invoice={selectedInvoice} 
                />
            )}

            {selectedInvoice && (
                <Modal isOpen={isViewModalOpen} onOpenChange={() => setIsViewModalOpen(false)} scrollBehavior="inside" size="3xl">
                    <ModalContent>
                        {(onModalClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-lg">Detalles de la Factura</span>
                                            <span className="text-sm font-normal text-slate-500 block">{selectedInvoice.id}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            {selectedInvoice.tipo_factura_badge}
                                            {selectedInvoice.estado_badge}
                                        </div>
                                    </div>
                                </ModalHeader>
                                <ModalBody>
                                    <div className="space-y-6">
                                        {/* Información del cliente */}
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm bg-gray-50 p-4 rounded-lg">
                                            <div className="font-semibold text-slate-600">Cliente:</div>
                                            <div className="text-slate-800">{selectedInvoice.cliente_nombre_display}</div>
                                            
                                            <div className="font-semibold text-slate-600">Fecha Emisión:</div>
                                            <div className="text-slate-800">{selectedInvoice.fecha_emision}</div>
                                            
                                            <div className="font-semibold text-slate-600">Condición:</div>
                                            <div className="text-slate-800">{getCondicionVentaNombre(selectedInvoice.condicion_venta)}</div>
                                            
                                            {selectedInvoice.fecha_vencimiento && (
                                                <>
                                                    <div className="font-semibold text-slate-600">Fecha Vencimiento:</div>
                                                    <div className="text-slate-800">{selectedInvoice.fecha_vencimiento}</div>
                                                </>
                                            )}
                                            
                                            {selectedInvoice.tipo_factura === 'ELECTRONICA' && selectedInvoice.clave && (
                                                <>
                                                    <div className="font-semibold text-slate-600">Clave Hacienda:</div>
                                                    <div className="text-slate-800 font-mono text-xs break-all">{selectedInvoice.clave}</div>
                                                </>
                                            )}
                                        </div>

                                        {/* Productos y servicios */}
                                        <div>
                                            <h4 className="font-semibold text-slate-700 mb-3 flex items-center">
                                                <Icon icon="lucide:package" className="mr-2" />
                                                Productos y Servicios
                                            </h4>
                                            <div className="space-y-2">
                                                {detallesFactura.map((item: any, index: number) => (
                                                    <div key={index} className="grid grid-cols-12 gap-3 p-3 rounded-md bg-slate-50 border">
                                                        <div className="col-span-6 font-medium text-slate-700">
                                                            {item.descripcion_item}
                                                            {item.cabys_code && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    CABYS: {item.cabys_code}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2 text-center text-slate-600">
                                                            x{item.cantidad}
                                                        </div>
                                                        <div className="col-span-2 text-center text-slate-600">
                                                            {formatCurrency(item.precio_unitario)}
                                                        </div>
                                                        <div className="col-span-2 text-right text-slate-800 font-medium">
                                                            {formatCurrency(item.subtotal_linea)}
                                                        </div>
                                                    </div>
                                                ))}
                                                {detallesFactura.length === 0 && (
                                                    <p className="text-slate-500 text-sm text-center py-4">
                                                        No hay detalles para mostrar.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Totales */}
                                        <div className="border-t pt-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Subtotal:</span>
                                                <span className="text-slate-800 font-medium">
                                                    {formatCurrency((selectedInvoice.total_factura || 0) - (selectedInvoice.total_impuesto || 0))}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Impuestos:</span>
                                                <span className="text-slate-800 font-medium">
                                                    {formatCurrency(selectedInvoice.total_impuesto)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                                <span className="text-slate-800">Total:</span>
                                                <span className="text-blue-600">{selectedInvoice.total_formatted}</span>
                                            </div>
                                            {(selectedInvoice.saldo_pendiente ?? selectedInvoice.total_factura) > 0 && (
                                                <div className="flex justify-between text-sm font-semibold">
                                                    <span className="text-red-600">Saldo Pendiente:</span>
                                                    <span className="text-red-600">{selectedInvoice.saldo_pendiente_formatted}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Información adicional para facturas electrónicas */}
                                        {selectedInvoice.tipo_factura === 'ELECTRONICA' && (
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <h5 className="font-semibold text-blue-800 mb-2 flex items-center">
                                                    <Zap className="mr-2 h-4 w-4" />
                                                    Información de Hacienda
                                                </h5>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div className="text-blue-700">Estado:</div>
                                                    <div className="text-blue-800 font-medium">
                                                        {selectedInvoice.estado_hacienda || 'Pendiente'}
                                                    </div>
                                                    {selectedInvoice.fecha_envio_hacienda && (
                                                        <>
                                                            <div className="text-blue-700">Fecha Envío:</div>
                                                            <div className="text-blue-800">
                                                                {new Date(selectedInvoice.fecha_envio_hacienda).toLocaleString()}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ModalBody>
                                <ModalFooter>
                                    <div className="flex justify-between w-full">
                                        <div className="flex space-x-2">
                                            <Button
                                                color="success"
                                                variant="flat"
                                                onPress={() => enviarFacturaPorEmail(selectedInvoice.id)}
                                                startContent={<Mail className="h-4 w-4" />}
                                            >
                                                Enviar por Email
                                            </Button>
                                            <Button
                                                color="primary"
                                                variant="flat"
                                                onPress={() => handleGenerarPDF(selectedInvoice)}
                                                startContent={<Download className="h-4 w-4" />}
                                            >
                                                Descargar PDF
                                            </Button>
                                            {selectedInvoice.tipo_factura === 'ELECTRONICA' && (
                                                <Button
                                                    color="secondary"
                                                    variant="flat"
                                                    onPress={() => handleReenviarHacienda(selectedInvoice)}
                                                    startContent={<PaperAirplaneIcon className="h-4 w-4" />}
                                                >
                                                    Reenviar
                                                </Button>
                                            )}
                                        </div>
                                        <Button color="primary" onPress={onModalClose}>
                                            Cerrar
                                        </Button>
                                    </div>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>
            )}

            {selectedInvoice && (
                <ConfirmationModal 
                    isOpen={isAnnulModalOpen} 
                    onClose={() => setIsAnnulModalOpen(false)} 
                    onConfirm={handleConfirmAnnul} 
                    title="Anular Factura" 
                    message={`¿Seguro que deseas anular la factura ${selectedInvoice.id.substring(0, 8)}? Esta acción no se puede deshacer.`} 
                />
            )}
        </div>
    );
};

export default InvoicingPage;