// src/pages/accounts-payable/ViewBillModal.tsx
import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from '@heroui/react';
import { supabase } from '../../supabaseClient';
import type { ProcessedSupplierBill } from './types';
import { StatusBadge } from '../../components/ui/status-badge';
import toast from 'react-hot-toast';

const formatCurrency = (value: number | null | undefined, currency?: string | null) =>
  new Intl.NumberFormat('es-CR', { style: 'currency', currency: currency || 'CRC' }).format(value || 0);

interface BillDetail {
  id: number;
  descripcion: string;
  cantidad: number;
  cantidad_bonificacion: number;
  precio_unitario: number;
  subtotal_linea: number;
  productos: { nombre: string } | null;
}

interface PaymentFile {
  id: string;
  fecha_pago: string;
  monto_total: number;
  medio_pago: string;
  archivo_pago_path: string;
}

interface ViewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: ProcessedSupplierBill | null;
}

const downloadFile = async (filePath: string, originalName: string) => {
  try {
    const { data, error } = await supabase.storage.from('facturas_proveedor').download(filePath);
    if (error) {
      toast.error('Error al descargar: ' + error.message);
      return;
    }
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    toast.error('Error al procesar el archivo');
  }
};

export const ViewBillModal: React.FC<ViewBillModalProps> = ({ isOpen, onClose, bill }) => {
  const [details, setDetails] = useState<BillDetail[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [paymentFiles, setPaymentFiles] = useState<PaymentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen || !bill) return;
      
      setLoading(true);
      setDebugInfo(''); // Limpiar debug
      
      try {
        console.log('🔍 Cargando datos para factura:', {
          id: bill.id,
          numero: bill.numero_documento,
          proveedor: bill.proveedor_nombre
        });
        
        // 1. Detalles de la factura
        const { data: detallesData, error: detallesError } = await supabase
          .from('detalle_factura_proveedor')
          .select('id, descripcion, cantidad, cantidad_bonificacion, precio_unitario, subtotal_linea, productos(nombre)')
          .eq('factura_proveedor_id', bill.id);

        // 2. Archivos adicionales de factura
        const { data: archivosData, error: archivosError } = await supabase
          .from('factura_archivos')
          .select('*')
          .eq('factura_id', bill.id);

        // 3. Comprobantes de pago
        const { data: pagosData, error: pagosError } = await supabase
          .from('pagos_proveedor')
          .select('id, fecha_pago, monto_total, medio_pago, archivo_pago_path')
          .eq('factura_proveedor_id', bill.id)
          .not('archivo_pago_path', 'is', null);

        // Debug info
        console.log('📊 Resultados:', {
          detalles: detallesData?.length || 0,
          archivos: archivosData?.length || 0,
          pagos: pagosData?.length || 0,
          pagosData: pagosData
        });

        setDebugInfo(
          `Detalles: ${detallesData?.length || 0} | ` +
          `Archivos: ${archivosData?.length || 0} | ` +
          `Pagos: ${pagosData?.length || 0}`
        );

        setDetails(detallesData || []);
        setFiles(archivosData || []);
        setPaymentFiles(pagosData || []);
        
      } catch (error) {
        console.error('❌ Error completo:', error);
        setDebugInfo(`Error: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isOpen, bill?.id]);

  if (!bill) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {(modalOnClose) => (
          <>
            <ModalHeader>Detalles de la Factura: {bill.numero_documento}</ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* Debug Info (solo visible si hay datos) */}
                {debugInfo && (
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded">
                    {debugInfo}
                  </div>
                )}

                {/* Información general */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Proveedor</p>
                    <p className="font-semibold">{bill.proveedor_nombre}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tipo</p>
                    <p className="font-semibold">{bill.condicion_pago_nombre} ({bill.dias_credito_calculados} días)</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Emisión</p>
                    <p className="font-semibold">{bill.fecha_emision}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Vencimiento</p>
                    <p className="font-semibold">{bill.fecha_vencimiento}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Estado</p>
                    <StatusBadge text={bill.estado} type={bill.estado.toLowerCase()} />
                  </div>
                </div>

                {/* Detalles de productos */}
                <div>
                  <h4 className="font-semibold text-slate-700 border-t pt-4 mb-2">Productos / Servicios</h4>
                  {loading ? (
                    <Spinner label="Cargando detalles..." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border rounded bg-slate-50">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-2 py-1 text-left">Producto</th>
                            <th className="px-2 py-1 text-center">Cant.</th>
                            <th className="px-2 py-1 text-center">Bonif.</th>
                            <th className="px-2 py-1 text-right">P. Unit.</th>
                            <th className="px-2 py-1 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {details.map((d) => (
                            <tr key={d.id}>
                              <td className="px-2 py-1">{d.productos?.nombre || d.descripcion}</td>
                              <td className="px-2 py-1 text-center">{d.cantidad + d.cantidad_bonificacion}</td>
                              <td className="px-2 py-1 text-center">{d.cantidad_bonificacion}</td>
                              <td className="px-2 py-1 text-right">{formatCurrency(d.precio_unitario, bill.moneda_codigo)}</td>
                              <td className="px-2 py-1 text-right">{formatCurrency(d.subtotal_linea, bill.moneda_codigo)}</td>
                            </tr>
                          ))}
                          {details.length === 0 && (
                            <tr>
                              <td colSpan={5} className="text-center py-4 text-gray-500">
                                Sin detalles
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Archivos adjuntos - SECCIÓN CORREGIDA */}
                <div className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-slate-700">Archivos adjuntos</h4>
                  
                  {/* Factura original */}
                  {bill.archivo_factura_path && (
                    <div className="flex items-center justify-between text-sm p-2 bg-blue-50 rounded">
                      <span className="text-blue-700 font-medium">📄 Factura Original</span>
                      <div className="flex gap-2">
                        <a
                          href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/facturas_proveedor/${bill.archivo_factura_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Ver
                        </a>
                        <button
                          onClick={() => downloadFile(bill.archivo_factura_path!, `factura_${bill.numero_documento}`)}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Descargar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Archivos adicionales */}
                  {files.length > 0 && (
                    <>
                      <h5 className="font-semibold text-slate-600 text-sm">Archivos adicionales</h5>
                      {files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                          <span className="text-gray-700">{f.file_name} ({(f.file_size / 1024).toFixed(1)} KB)</span>
                          <div className="flex gap-2">
                            <a
                              href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/facturas_proveedor/${f.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Ver
                            </a>
                            <button
                              onClick={() => downloadFile(f.file_path, f.file_name)}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Descargar
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  
                  {/* Comprobantes de pago - SECCIÓN CRÍTICA */}
                  {paymentFiles.length > 0 ? (
                    <>
                      <h5 className="font-semibold text-slate-600 text-sm">Comprobantes de Pago ({paymentFiles.length})</h5>
                      {paymentFiles.map((pago, index) => (
                        <div key={pago.id} className="flex items-center justify-between text-sm p-2 bg-green-50 rounded mb-2">
                          <div>
                            <span className="text-green-700 font-medium">💰 Comprobante #{index + 1}</span>
                            <span className="text-gray-600 ml-2 text-xs">
                              {pago.fecha_pago} - {formatCurrency(pago.monto_total, bill.moneda_codigo)} ({pago.medio_pago})
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <a
                              href={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/facturas_proveedor/${pago.archivo_pago_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Ver
                            </a>
                            <button
                              onClick={() => downloadFile(pago.archivo_pago_path, `comprobante_${pago.id}`)}
                              className="text-green-600 hover:underline text-xs"
                            >
                              Descargar
                            </button>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No hay comprobantes de pago registrados</p>
                  )}
                  
                  {/* Mensaje cuando no hay archivos absolutamente */}
                  {files.length === 0 && !bill.archivo_factura_path && paymentFiles.length === 0 && !loading && (
                    <p className="text-xs text-gray-500 italic">No hay archivos adjuntos para esta factura</p>
                  )}
                </div>

                {/* Totales */}
                <div className="border-t pt-4 text-right space-y-1 text-sm">
                  <p className="text-slate-600">
                    Subtotal: <span className="font-medium">{formatCurrency(bill.subtotal, bill.moneda_codigo)}</span>
                  </p>
                  <p className="text-slate-600">
                    Impuestos: <span className="font-medium">{formatCurrency(bill.impuestos, bill.moneda_codigo)}</span>
                  </p>
                  <p className="text-lg font-bold">
                    Total: <span className="text-sky-600">{formatCurrency(bill.total, bill.moneda_codigo)}</span>
                  </p>
                  <p className="font-bold text-red-600">
                    Saldo Pendiente: {formatCurrency(bill.saldo_pendiente, bill.moneda_codigo)}
                  </p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onPress={modalOnClose}>Cerrar</Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};