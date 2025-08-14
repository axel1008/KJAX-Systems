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

const PayInvoiceForm: React.FC<PayInvoiceFormProps> = ({ 
  isOpen, 
  onClose, 
  invoice, 
  onPaymentRegistered 
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<PaymentFormData>>({
    factura_id: invoice.id,
    cliente_id: invoice.cliente_id,
    fecha_pago: new Date().toISOString().split('T')[0],
    moneda_pago_id: 1, // Valor por defecto para CRC
    metodo_pago: '',
    monto_pagado: 0
  });
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [loading, setLoading] = useState(false);

  // 🔧 CARGAR MONEDAS AL ABRIR EL MODAL
  useEffect(() => {
    const fetchMonedas = async () => {
      try {
        console.log("🔄 Cargando monedas...");
        
        // Intentar cargar desde tabla monedas
        const { data: monedasData, error: monedasError } = await supabase
          .from('monedas')
          .select('*')
          .eq('activo', true);
        
        if (monedasError) {
          console.warn("⚠️ Error cargando tabla monedas:", monedasError);
          // Usar monedas por defecto si la tabla no existe
          setMonedas([
            { id: 1, codigo: 'CRC', descripcion: 'Colones Costarricenses', nombre: 'Colones' },
            { id: 2, codigo: 'USD', descripcion: 'Dólares Estadounidenses', nombre: 'Dólares' },
            { id: 3, codigo: 'EUR', descripcion: 'Euros', nombre: 'Euros' }
          ]);
        } else {
          console.log("✅ Monedas cargadas:", monedasData);
          setMonedas(monedasData || []);
        }
      } catch (error) {
        console.error("❌ Error cargando monedas:", error);
        // Monedas por defecto en caso de error
        setMonedas([
          { id: 1, codigo: 'CRC', descripcion: 'Colones Costarricenses', nombre: 'Colones' }
        ]);
      }
    };

    if (isOpen) {
      fetchMonedas();
      // Resetear form data cuando se abre el modal
      setFormData({
        factura_id: invoice.id,
        cliente_id: invoice.cliente_id,
        fecha_pago: new Date().toISOString().split('T')[0],
        moneda_pago_id: 1,
        metodo_pago: '',
        monto_pagado: 0
      });
    }
  }, [isOpen, invoice]);

  // 🔧 MANEJAR CAMBIOS EN INPUTS NORMALES
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'monto_pagado' ? parseFloat(value) || 0 : value 
    }));
  };

  // 🔧 MANEJAR CAMBIOS EN SELECTS DE NEXTUI
  const handleSelectChange = (field: keyof PaymentFormData, keys: Set<React.Key> | "all") => {
    if (keys instanceof Set) {
      const value = Array.from(keys)[0];
      setFormData(prev => ({ 
        ...prev, 
        [field]: field === 'moneda_pago_id' ? Number(value) : String(value)
      }));
    }
  };

  // 🔧 FUNCIÓN DE ENVÍO MEJORADA
  const handleSubmit = async () => {
    console.log("🔄 Iniciando registro de pago...");
    console.log("💰 Datos del formulario:", formData);
    
    setLoading(true);
    
    try {
      const saldoActual = Number(invoice.saldo_pendiente ?? invoice.total_factura);
      const montoPagado = Number(formData.monto_pagado) || 0;

      console.log("🔍 Debug validación:");
      console.log("- Saldo actual:", saldoActual, typeof saldoActual);
      console.log("- Monto pagado:", montoPagado, typeof montoPagado);
      console.log("- Es mayor?", montoPagado > saldoActual);

      // Validaciones
      if (montoPagado <= 0) {
        alert("El monto debe ser mayor a cero.");
        setLoading(false);
        return;
      }

      if (montoPagado > saldoActual + 0.01) { // Margen de error por decimales
        alert(`El monto no puede ser mayor al saldo pendiente.\nSaldo: ₡${saldoActual.toLocaleString()}\nMonto ingresado: ₡${montoPagado.toLocaleString()}`);
        setLoading(false);
        return;
      }

      if (!formData.metodo_pago) {
        alert("Debe seleccionar un método de pago.");
        setLoading(false);
        return;
      }

      console.log("✅ Validaciones pasadas, registrando pago...");

      // 1. Registrar el pago
      const pagoData = {
        factura_id: formData.factura_id,
        cliente_id: formData.cliente_id,
        fecha_pago: formData.fecha_pago,
        monto_pagado: montoPagado,
        metodo_pago: formData.metodo_pago,
        moneda_id: formData.moneda_pago_id || 1,
        referencia_pago: formData.referencia_pago || null
        // Quitar 'notas' porque no existe en la tabla
      };

      console.log("📤 Enviando datos del pago:", pagoData);

      const { data: paymentData, error: paymentError } = await supabase
        .from('pagos_cliente')
        .insert([pagoData])
        .select()
        .single();

      if (paymentError) {
        console.error("❌ Error registrando pago:", paymentError);
        alert(`Error al registrar el pago: ${paymentError.message}`);
        setLoading(false);
        return;
      }

      console.log("✅ Pago registrado:", paymentData);

      // 2. Auditoría (si existe el usuario)
      if (user && paymentData) {
        try {
          await supabase.from('audit_log').insert({
            user_id: user.id,
            user_email: user.email,
            action: 'INSERT',
            table_name: 'pagos_cliente',
            record_id: paymentData.id.toString(),
            old_values: {},
            new_values: paymentData
          });
          console.log("✅ Auditoría registrada");
        } catch (auditError) {
          console.warn("⚠️ Error en auditoría (no crítico):", auditError);
        }
      }

      // 3. Actualizar la factura
      const nuevoSaldo = saldoActual - montoPagado;
      const nuevoEstado = nuevoSaldo <= 0.01 ? 'Pagada' : 'Parcial';
      
      console.log(`🔄 Actualizando factura: ${invoice.estado} → ${nuevoEstado}, saldo: ${saldoActual} → ${nuevoSaldo}`);

      const { error: updateError } = await supabase
        .from('facturas')
        .update({ 
          saldo_pendiente: nuevoSaldo, 
          estado: nuevoEstado,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoice.id);

      if (updateError) {
        console.error("❌ Error actualizando factura:", updateError);
        alert(`Error al actualizar la factura: ${updateError.message}`);
        setLoading(false);
        return;
      }

      console.log("✅ Factura actualizada exitosamente");

      // 4. Cerrar modal y notificar éxito
      setLoading(false);
      onPaymentRegistered();
      alert(`¡Pago registrado exitosamente!\nMonto: ₡${montoPagado.toLocaleString()}\nNuevo estado: ${nuevoEstado}`);

    } catch (error: any) {
      console.error("💥 Error inesperado:", error);
      alert(`Error inesperado: ${error.message}`);
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("es-CR", { 
      style: "currency", 
      currency: "CRC",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(value);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`💰 Registrar Pago - Factura #${invoice.consecutivo || invoice.id.substring(0, 8)}`}
      onFormSubmit={handleSubmit}
      isSubmitting={loading}
      submitButtonText={loading ? "Procesando..." : "Registrar Pago"}
    >
      <div className="space-y-4">
        {/* Información de la factura */}
        <div className="bg-blue-50 p-4 rounded-lg border">
          <h4 className="font-semibold text-blue-800 mb-2">📋 Información de la Factura</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Cliente:</strong> {invoice.cliente_nombre || 'N/A'}</div>
            <div><strong>Total:</strong> {formatCurrency(invoice.total_factura)}</div>
            <div><strong>Estado:</strong> 
              <span className={`ml-1 px-2 py-1 rounded text-xs ${
                invoice.estado === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' :
                invoice.estado === 'Pagada' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.estado}
              </span>
            </div>
            <div><strong>Saldo Pendiente:</strong> 
              <span className="text-lg font-bold text-red-600 ml-1">
                {formatCurrency(invoice.saldo_pendiente ?? invoice.total_factura)}
              </span>
            </div>
          </div>
        </div>

        {/* Formulario de pago */}
        <div className="space-y-4">
          <Input
            label="📅 Fecha de Pago"
            type="date"
            name="fecha_pago"
            value={formData.fecha_pago || ''}
            onChange={handleInputChange}
            isRequired
          />
          
          <Input
            label="💵 Monto a Pagar"
            type="number"
            name="monto_pagado"
            placeholder="0.00"
            value={formData.monto_pagado?.toString() || ''}
            onChange={handleInputChange}
            isRequired
            startContent={<span className="text-gray-500">₡</span>}
            description={`Máximo: ${formatCurrency(invoice.saldo_pendiente ?? invoice.total_factura)}`}
          />

          <Select 
            label="💰 Moneda" 
            selectedKeys={formData.moneda_pago_id ? new Set([String(formData.moneda_pago_id)]) : new Set()}
            onSelectionChange={(keys) => handleSelectChange('moneda_pago_id', keys)}
            isRequired
          >
            {monedas.map((moneda) => (
              <SelectItem key={moneda.id} value={String(moneda.id)}>
                {moneda.codigo} - {moneda.descripcion || moneda.nombre}
              </SelectItem>
            ))}
          </Select>

          <Select 
            label="💳 Método de Pago" 
            selectedKeys={formData.metodo_pago ? new Set([formData.metodo_pago]) : new Set()}
            onSelectionChange={(keys) => handleSelectChange('metodo_pago', keys)}
            isRequired
          >
            <SelectItem key="Efectivo" value="Efectivo">💵 Efectivo</SelectItem>
            <SelectItem key="Transferencia" value="Transferencia">🏦 Transferencia Bancaria</SelectItem>
            <SelectItem key="Tarjeta" value="Tarjeta">💳 Tarjeta de Crédito/Débito</SelectItem>
            <SelectItem key="Cheque" value="Cheque">📝 Cheque</SelectItem>
            <SelectItem key="Otro" value="Otro">🔧 Otro</SelectItem>
          </Select>

          <Input
            label="📄 Referencia (Opcional)"
            name="referencia_pago"
            placeholder="Número de transacción, cheque, etc."
            value={formData.referencia_pago || ''}
            onChange={handleInputChange}
          />
        </div>

        {/* Resumen */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-2">📊 Resumen del Pago</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Saldo actual:</span>
              <span>{formatCurrency(invoice.saldo_pendiente ?? invoice.total_factura)}</span>
            </div>
            <div className="flex justify-between">
              <span>Monto a pagar:</span>
              <span className="font-bold">{formatCurrency(formData.monto_pagado || 0)}</span>
            </div>
            <hr className="border-green-300" />
            <div className="flex justify-between font-bold text-green-800">
              <span>Saldo restante:</span>
              <span>
                ₡{((invoice.saldo_pendiente ?? invoice.total_factura) - (formData.monto_pagado || 0)).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </FormModal>
  );
};

export default PayInvoiceForm;