import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Spinner } from '@heroui/react';
import { supabase } from '../../supabaseClient';
import type { ProcessedSupplierBill } from './types';
import { StatusBadge } from '../../components/ui/status-badge';

const formatCurrency = (value: number | null | undefined, currency?: string | null) => {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: currency || 'CRC' }).format(value || 0);
};

interface BillDetail {
    id: number;
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    productos: { nombre: string } | null;
}

// Se añade la interfaz de las props que faltaba para claridad
interface ViewBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: ProcessedSupplierBill | null;
}

export const ViewBillModal: React.FC<ViewBillModalProps> = ({ isOpen, onClose, bill }) => {
  const [details, setDetails] = useState<BillDetail[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && bill) {
      const fetchDetails = async () => {
        setLoading(true);

        const { data, error } = await supabase
          .from('detalle_factura_proveedor')
          .select('id, descripcion, cantidad, precio_unitario, productos(nombre)')
          .eq('factura_proveedor_id', bill.id);

        if (error) {
          console.error("Error fetching bill details:", error);
          setDetails([]);
        } else {
          setDetails((data as unknown as BillDetail[]) || []);
        }
        setLoading(false);
      };
      fetchDetails();
    }
  }, [isOpen, bill]);

  if (!bill) return null;

  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        {(modalOnClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Detalles de la Factura: {bill.numero_documento}
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                  <div><p className="text-slate-500">Proveedor:</p><p className="font-semibold text-slate-800">{bill.proveedor_nombre}</p></div>
                  <div><p className="text-slate-500">Tipo de Factura:</p><p className="font-semibold text-slate-800">{bill.condicion_pago_nombre || 'No especificado'}</p></div>
                  <div><p className="text-slate-500">Fecha de Emisión:</p><p className="font-semibold text-slate-800">{bill.fecha_emision}</p></div>
                  <div><p className="text-slate-500">Fecha de Vencimiento:</p><p className="font-semibold text-slate-800">{bill.fecha_vencimiento}</p></div>
                  <div><p className="text-slate-500">Estado:</p><StatusBadge text={bill.estado} type={bill.estado.toLowerCase()} /></div>
                </div>
                <div>
                  <h4 className="text-md font-semibold text-slate-700 mb-2 border-t pt-4">Productos Incluidos</h4>
                  {loading ? <div className="flex justify-center items-center h-24"><Spinner label="Cargando detalles..." /></div> : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                      {details.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 p-2 rounded-md bg-slate-50">
                          <div className="col-span-6 font-medium text-slate-700">{item.productos?.nombre || item.descripcion}</div>
                          <div className="col-span-2 text-center text-slate-600">x{item.cantidad}</div>
                          <div className="col-span-4 text-right text-slate-800">{formatCurrency(item.precio_unitario, bill.moneda_codigo)}</div>
                        </div>
                      ))}
                      {details.length === 0 && <p className="text-slate-500 text-xs text-center py-4">No hay detalles para esta factura.</p>}
                    </div>
                  )}
                </div>
                <div className="border-t pt-4 text-right space-y-1 text-sm">
                  <p className="text-slate-600">Subtotal: <span className="font-medium text-slate-800 w-24 inline-block text-right">{formatCurrency(bill.subtotal, bill.moneda_codigo)}</span></p>
                  <p className="text-slate-600">Impuestos: <span className="font-medium text-slate-800 w-24 inline-block text-right">{formatCurrency(bill.impuestos, bill.moneda_codigo)}</span></p>
                  <p className="text-lg font-bold text-slate-800 mt-2">Total: <span className="text-sky-600 w-24 inline-block text-right">{formatCurrency(bill.total, bill.moneda_codigo)}</span></p>
                  <p className="font-semibold text-red-600">Saldo Pendiente: <span className="w-24 inline-block text-right">{formatCurrency(bill.saldo_pendiente, bill.moneda_codigo)}</span></p>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              {/* --- INICIO: CAMBIO DE ESTILO DEL BOTÓN --- */}
              <Button color="primary" onPress={modalOnClose}>
                Cerrar
              </Button>
              {/* --- FIN: CAMBIO DE ESTILO --- */}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};