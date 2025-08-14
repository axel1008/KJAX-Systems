// src/pages/accounts-payable/PayBillForm.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input, Select, SelectItem } from '@heroui/react';
import type { ProcessedSupplierBill, PaymentFormData, Moneda } from './types';
import toast from 'react-hot-toast';
import { useAuth } from '../../Context/AuthContext';

const uploadFileToBucket = async (file: File, folder: string, prefix: string): Promise<string> => {
  const fileName = `${folder}/${prefix}_${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from('facturas_proveedor')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return fileName;
};

interface PayBillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRegistered: () => void;
  bill: ProcessedSupplierBill;
  monedas: Moneda[];
}

const PayBillForm: React.FC<PayBillFormProps> = ({
  isOpen,
  onClose,
  onPaymentRegistered,
  bill,
  monedas,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<PaymentFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pagoId, setPagoId] = useState<string | null>(null);

  // Reset al abrir
  useEffect(() => {
    if (isOpen) {
      setFormData({
        factura_proveedor_id: bill.id,
        proveedor_id: bill.proveedor_id,
        fecha_pago: new Date().toISOString().split('T')[0],
        monto_pagado: bill.saldo_pendiente || 0,
        metodo_pago: 'Transferencia',
        moneda_pago_id: bill.moneda_id || (monedas.find(m => m.codigo === 'CRC')?.id || null),
      });
      setPaymentFile(null);
      setPagoId(null);
    }
  }, [isOpen, bill, monedas]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (!formData.monto_pagado || formData.monto_pagado <= 0) {
        toast.error('El monto a pagar debe ser mayor a cero.');
        return;
      }
      if (formData.monto_pagado > (bill.saldo_pendiente || 0)) {
        toast.error('El monto a pagar no puede ser mayor que el saldo pendiente.');
        return;
      }

      const paymentToInsert = {
        factura_proveedor_id: formData.factura_proveedor_id,
        proveedor_id: formData.proveedor_id,
        fecha_pago: formData.fecha_pago,
        monto_total: formData.monto_pagado,
        medio_pago: formData.metodo_pago,
        moneda_id: formData.moneda_pago_id,
      };

      const { data: pagoData, error: pagoError } = await supabase
        .from('pagos_proveedor')
        .insert(paymentToInsert)
        .select()
        .single();
      if (pagoError) {
        toast.error(`Error registrando el pago: ${pagoError.message}`);
        return;
      }

      const nuevoSaldo = (bill.saldo_pendiente || 0) - formData.monto_pagado;
      const nuevoEstado = nuevoSaldo <= 0.009 ? 'Pagada' : 'Parcial';
      await supabase
        .from('facturas_proveedor')
        .update({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado })
        .eq('id', bill.id);

      setPagoId(pagoData.id);
      toast.success('Pago registrado exitosamente.');
      setShowUploadModal(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFile = async () => {
    if (!paymentFile || !pagoId) {
      toast.error('Selecciona un archivo para subir.');
      return;
    }
    try {
      const archivoPath = await uploadFileToBucket(paymentFile, 'pagos', 'pago');
      await supabase
        .from('pagos_proveedor')
        .update({ archivo_pago_path: archivoPath })
        .eq('id', pagoId);
      toast.success('Archivo subido correctamente.');
      setShowUploadModal(false);
      onPaymentRegistered();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const formatCurrency = (v: number, code = 'CRC') =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency: code }).format(v || 0);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onOpenChange={onClose}
        size="2xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onModalClose) => (
            <>
              <ModalHeader>Registrar Pago – Factura {bill.numero_documento}</ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <p className="text-sm">Proveedor: <span className="font-semibold">{bill.proveedor_nombre}</span></p>
                  <p className="text-sm">Saldo Pendiente: <span className="font-semibold text-red-600">{formatCurrency(bill.saldo_pendiente, bill.moneda_codigo)}</span></p>

                  <Input type="date" label="Fecha de Pago" value={formData.fecha_pago || ''} onValueChange={v => setFormData(prev => ({ ...prev, fecha_pago: v }))} isRequired />

                  <div className="grid grid-cols-2 gap-4">
                    <Input type="number" label="Monto a Pagar" value={String(formData.monto_pagado || '')} onValueChange={v => setFormData(prev => ({ ...prev, monto_pagado: Number(v) }))} isRequired min="0.01" step="0.01" />
                    <Select label="Moneda del Pago" selectedKeys={formData.moneda_pago_id ? new Set([String(formData.moneda_pago_id)]) : new Set()} onSelectionChange={(k) => handleSelectChange('moneda_pago_id', k as Set<React.Key>)} isRequired items={monedas.map(m => ({ key: String(m.id), label: m.codigo }))}>
                      {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                    </Select>
                  </div>

                  <Select
                    label="Método de Pago"
                    selectedKeys={formData.metodo_pago ? new Set([formData.metodo_pago]) : new Set()}
                    onSelectionChange={(k) => handleSelectChange('metodo_pago', k as Set<React.Key>)}
                    isRequired
                    items={[
                      { key: 'Transferencia', label: 'Transferencia' },
                      { key: 'Efectivo', label: 'Efectivo' },
                      { key: 'Cheque', label: 'Cheque' },
                      { key: 'SINPE Móvil', label: 'SINPE Móvil' },
                      { key: 'Tarjeta', label: 'Tarjeta' },
                      { key: 'Otro', label: 'Otro' },
                    ]}
                  >
                    {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onModalClose}>Cancelar</Button>
                <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>Registrar Pago</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* Modal para subir archivo del pago */}
      <Modal
        isOpen={showUploadModal}
        onOpenChange={setShowUploadModal}
        size="md"
        scrollBehavior="inside"
      >
        <ModalContent>
          {(onModalClose) => (
            <>
              <ModalHeader>Subir comprobante de pago</ModalHeader>
              <ModalBody>
                <label className="block">
                  <span className="text-sm font-medium text-slate-700">Selecciona archivo</span>
                  <input
                    type="file"
                    className="mt-1 block w-full text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                    onChange={(e) => setPaymentFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onModalClose}>Cancelar</Button>
                <Button color="primary" onPress={handleUploadFile} disabled={!paymentFile}>Subir archivo</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};

export default PayBillForm;