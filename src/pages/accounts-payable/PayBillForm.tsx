import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FormModal } from '../../components/ui/form-modal';
import { Input, Select, SelectItem } from '@heroui/react';
import type { ProcessedSupplierBill, PaymentFormData, Moneda } from './types';
import toast from 'react-hot-toast';
import { useAuth } from '../../Context/AuthContext';

interface PayBillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentRegistered: () => void;
  bill: ProcessedSupplierBill;
  monedas: Moneda[];
}

const PayBillForm: React.FC<PayBillFormProps> = ({ isOpen, onClose, onPaymentRegistered, bill, monedas }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<PaymentFormData>>({});
  const [isLoading, setIsLoading] = useState(false);

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
    }
  }, [isOpen, bill, monedas]);

  const handleInputChange = (field: keyof PaymentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: keyof PaymentFormData, keys: Set<React.Key>) => {
    const value = Array.from(keys)[0];
    const fieldName = field.toString();
    
    if (fieldName === 'moneda_pago_id') {
      setFormData(p => ({ ...p, [field]: value ? Number(value) : null }));
    } else {
      setFormData(p => ({ ...p, [field]: String(value) }));
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    if (!formData.monto_pagado || formData.monto_pagado <= 0) {
      toast.error("El monto a pagar debe ser mayor a cero.");
      setIsLoading(false);
      return;
    }
    if (formData.monto_pagado > (bill.saldo_pendiente || 0)) {
        toast.error("El monto a pagar no puede ser mayor que el saldo pendiente.");
        setIsLoading(false);
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
    
    // --- INICIO: MENSAJES DE DEPURACIÓN ---
    console.log('--- DEBUG DE AUDITORÍA DE PAGO ---');
    console.log('Usuario que realiza la acción:', user?.email);
    console.log('Error al insertar el pago:', pagoError);
    console.log('Datos del pago recuperados tras insertar:', pagoData);
    // --- FIN: MENSAJES DE DEPURACIÓN ---

    if (pagoError) {
      toast.error(`Error registrando el pago: ${pagoError.message}`); 
      setIsLoading(false);
      return;
    }
    
    if (user && pagoData) {
      console.log('--- DEBUG DE AUDITORÍA DE PAGO: Condición cumplida. Registrando en auditoría...');
      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'INSERT',
        table_name: 'pagos_proveedor',
        record_id: pagoData.id.toString(),
        old_values: {},
        new_values: pagoData
      });
    } else {
        console.warn('--- DEBUG DE AUDITORÍA DE PAGO: Condición NO cumplida. Se omite el registro en auditoría. Revisa si "pagoData" es nulo.');
    }
    
    const nuevoSaldo = (bill.saldo_pendiente || 0) - formData.monto_pagado;
    const nuevoEstado = nuevoSaldo <= 0.009 ? 'Pagada' : 'Parcial';

    const { error: facturaError } = await supabase
      .from('facturas_proveedor')
      .update({ 
          saldo_pendiente: nuevoSaldo, 
          estado: nuevoEstado,
      })
      .eq('id', bill.id);

    if (facturaError) {
      toast.error(`Pago registrado, pero hubo un error al actualizar la factura: ${facturaError.message}`);
    } else { 
      toast.success("Pago registrado exitosamente.");
      onPaymentRegistered(); 
    }
    setIsLoading(false);
  };
  
  const formatCurrency = (v: number | null | undefined, c?: string | null): string => new Intl.NumberFormat("es-CR",{style:"currency",currency:c||'CRC'}).format(v||0);

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title={`Registrar Pago para Factura ${bill.numero_documento}`} onFormSubmit={handleSubmit} submitButtonText="Registrar Pago" isSubmitting={isLoading}>
      <div className="space-y-4">
        <p className="text-sm">Proveedor: <span className="font-semibold">{bill.proveedor_nombre}</span></p>
        <p className="text-sm">Saldo Pendiente: <span className="font-semibold text-red-600">{formatCurrency(bill.saldo_pendiente, bill.moneda_codigo)}</span></p>
        <Input type="date" label="Fecha de Pago" value={formData.fecha_pago || ''} onValueChange={v => handleInputChange('fecha_pago', v)} isRequired/>
        <div className="grid grid-cols-2 gap-4">
          <Input type="number" label="Monto a Pagar" value={String(formData.monto_pagado || '')} onValueChange={v => handleInputChange('monto_pagado', Number(v))} isRequired min="0.01" step="0.01" />
          <Select label="Moneda del Pago" placeholder="Moneda" selectedKeys={formData.moneda_pago_id ? new Set([String(formData.moneda_pago_id)]) : new Set()} onSelectionChange={(k) => handleSelectChange('moneda_pago_id', k as Set<React.Key>)} isRequired items={monedas.map(m => ({key: String(m.id), label: `${m.codigo}`}))}>
            {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
          </Select>
        </div>
        <Select 
          label="Método de Pago" 
          placeholder="Seleccione método" 
          selectedKeys={formData.metodo_pago ? new Set([formData.metodo_pago]) : new Set()} 
          onSelectionChange={(k) => handleSelectChange('metodo_pago', k as Set<React.Key>)} 
          isRequired
          items={[ 
            {key: "Transferencia", label: "Transferencia"}, {key: "Efectivo", label: "Efectivo"},
            {key: "Cheque", label: "Cheque"}, {key: "SINPE Móvil", label: "SINPE Móvil"},
            {key: "Tarjeta", label: "Tarjeta"}, {key: "Otro", label: "Otro"},
          ]}
        >
          {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
        </Select>
      </div>
    </FormModal>
  );
};

export default PayBillForm;