import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { FormModal } from '../../components/ui/form-modal';
import { Input, Select, SelectItem } from '@heroui/react';
import { Factura, Moneda, PaymentFormData } from './types';
import { useAuth } from '../../Context/AuthContext';

interface PayInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Factura;
  onPaymentRegistered: () => void;
}

const PayInvoiceForm: React.FC<PayInvoiceFormProps> = ({ isOpen, onClose, invoice, onPaymentRegistered }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<PaymentFormData>>({
    factura_id: invoice.id,
    cliente_id: invoice.cliente_id,
    fecha_pago: new Date().toISOString().split('T')[0],
    moneda_pago_id: invoice.moneda_id,
  });
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMonedas = async () => {
      const { data } = await supabase.from('monedas').select('*');
      setMonedas(data || []);
    };
    fetchMonedas();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'monto_pagado' ? parseFloat(value) : value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const saldoActual = invoice.saldo_pendiente ?? invoice.total_factura;
    const montoPagado = formData.monto_pagado || 0;

    if (montoPagado > saldoActual || montoPagado <= 0) {
      alert("El monto no puede ser mayor al saldo pendiente o menor o igual a cero.");
      setLoading(false);
      return;
    }

    // 1. Registrar el pago y obtener el registro insertado
    const { data: paymentData, error: paymentError } = await supabase
        .from('pagos_cliente')
        .insert([formData])
        .select()
        .single();

    if (paymentError) {
      alert(`Error al registrar el pago: ${paymentError.message}`);
      setLoading(false);
      return;
    }

    // --- LÓGICA DE AUDITORÍA AÑADIDA ---
    if (user && paymentData) {
      await supabase.from('audit_log').insert({
        user_id: user.id,
        user_email: user.email,
        action: 'INSERT',
        table_name: 'pagos_cliente',
        record_id: paymentData.id.toString(),
        old_values: {},
        new_values: paymentData
      });
    }
    // --- FIN LÓGICA DE AUDITORÍA ---

    // 2. Actualizar la factura
    const nuevoSaldo = saldoActual - montoPagado;
    const nuevoEstado = nuevoSaldo <= 0.01 ? 'Pagada' : 'Parcial';
    const { error: updateError } = await supabase
      .from('facturas')
      .update({ saldo_pendiente: nuevoSaldo, estado: nuevoEstado })
      .eq('id', invoice.id);

    setLoading(false);
    if (!updateError) {
      onPaymentRegistered();
    } else {
      alert(`Error al actualizar la factura: ${updateError.message}`);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleSubmit}
      title={`Registrar Pago para Factura #${invoice.consecutivo}`}
      confirmText="Registrar Pago"
      isConfirmDisabled={loading || !formData.monto_pagado || !formData.metodo_pago}
      isLoading={loading}
    >
      <div className="space-y-4">
        <p>Saldo Pendiente: {invoice.moneda_codigo} {new Intl.NumberFormat('en-US').format(invoice.saldo_pendiente || 0)}</p>
        <Input
          label="Fecha de Pago"
          type="date"
          name="fecha_pago"
          value={formData.fecha_pago}
          onChange={handleChange}
        />
        <Input
          label="Monto Pagado"
          type="number"
          name="monto_pagado"
          placeholder="0.00"
          onChange={handleChange}
        />
        <Select label="Moneda" name="moneda_pago_id" value={String(formData.moneda_pago_id)} onChange={(e) => handleChange(e as any)}>
          {monedas.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
        </Select>
        <Select label="Método de Pago" name="metodo_pago" onChange={(e) => handleChange(e as any)}>
          <SelectItem value="">Seleccione uno</SelectItem>
          <SelectItem value="Efectivo">Efectivo</SelectItem>
          <SelectItem value="Transferencia">Transferencia</SelectItem>
          <SelectItem value="Tarjeta">Tarjeta</SelectItem>
          <SelectItem value="Otro">Otro</SelectItem>
        </Select>
      </div>
    </FormModal>
  );
};

export default PayInvoiceForm;