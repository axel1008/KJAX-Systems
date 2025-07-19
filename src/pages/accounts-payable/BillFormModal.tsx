// src/pages/accounts-payable/BillFormModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { FormModal } from '../../components/ui/form-modal';
import { Input, Button, Select, SelectItem, Textarea } from '@heroui/react';
import type { ProviderForSelect, CondicionPago, Moneda, OrdenCompraForSelect, NewBillFormData, DetalleFacturaFormData } from './types';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';

interface CreateBillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onBillCreated: () => void;
  providers: ProviderForSelect[];
  condicionesPago: CondicionPago[];
  monedas: Moneda[];
  ordenesCompra: OrdenCompraForSelect[];
  productos: { id: number; nombre: string; precio_compra?: number }[];
  setModalMessage: (message?: string | undefined) => void;
  setMessageReact: React.Dispatch<React.SetStateAction<string>>;
}

const formatCurrency = (value: number | undefined | null, currencyCode: string = 'CRC'): string => {
    if (value === undefined || value === null) return new Intl.NumberFormat("es-CR", { style: "currency", currency: currencyCode }).format(0);
    try {
        return new Intl.NumberFormat("es-CR", { style: "currency", currency: currencyCode }).format(value);
    } catch (e) {
        return value.toFixed(2);
    }
};

export const BillFormModal: React.FC<CreateBillFormProps> = ({
  isOpen, onClose, onBillCreated, providers, condicionesPago, monedas, ordenesCompra, productos, setModalMessage, setMessageReact
}) => {
  const initialFormState = (): NewBillFormData => ({
    proveedor_id: null,
    numero_documento: `FAC-PROV-${Date.now().toString().slice(-6)}`,
    tipo_documento: 'Factura',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    condiciones_pago_id: null,
    subtotal: 0,
    impuestos: 0,
    total: 0,
    moneda_id: null,
    estado: 'Pendiente',
    descripcion: '',
    detalles: [{ id_temporal: Date.now().toString(), producto_id: null, descripcion_item: '', cantidad: 1, precio_unitario: 0, subtotal_linea: 0 }],
    porcentaje_impuesto: 13, // Se añade la propiedad que faltaba
  });
  
  const [formData, setFormData] = useState<NewBillFormData>(initialFormState);
  const [isLoading, setIsLoading] = useState(false);
  const [isTaxInvalid, setIsTaxInvalid] = useState(false);

  useEffect(() => {
      if(isOpen) {
          setFormData(initialFormState());
          setIsTaxInvalid(false);
      }
  }, [isOpen]);

  const handleTaxChange = (valueStr: string) => {
    const percentage = parseFloat(valueStr);
    setFormData(prev => ({ ...prev, porcentaje_impuesto: isNaN(percentage) ? 0 : percentage }));
    setIsTaxInvalid(!isNaN(percentage) && (percentage < 1 || percentage > 15));
  };
  
  const recalcularTotales = useCallback(() => {
    const subtotal = formData.detalles.reduce((sum, detalle) => sum + detalle.subtotal_linea, 0);
    const impuestos = subtotal * (formData.porcentaje_impuesto / 100); 
    const total = subtotal + impuestos;
    setFormData(prev => ({ ...prev, subtotal: parseFloat(subtotal.toFixed(2)), impuestos: parseFloat(impuestos.toFixed(2)), total: parseFloat(total.toFixed(2)) }));
  }, [formData.detalles, formData.porcentaje_impuesto]);

  useEffect(() => {
    recalcularTotales();
  }, [formData.detalles, formData.porcentaje_impuesto, recalcularTotales]);
  
  // (Aquí irían el resto de las funciones: handleSelectChange, handleDateChange, handleDetalleChange, addDetalle, removeDetalle...)

  const handleSubmit = async () => {
    if (isTaxInvalid) {
        toast.error("El impuesto debe estar entre 1% y 15%.");
        return;
    }
    // ...resto de la lógica de guardado...
  };
  
  const getMonedaCodigo = (monedaId: number | null): string => monedas.find(m => m.id === monedaId)?.codigo || 'CRC';

  return (
    <FormModal isOpen={isOpen} onClose={onClose} title="Registrar Nueva Factura de Proveedor" onFormSubmit={handleSubmit} submitButtonText="Guardar Factura" isSubmitting={isLoading}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
        {/* ... (resto del JSX del formulario) ... */}
        <div className="mt-6 border-t pt-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Impuestos:</span>
                <div className="flex items-center gap-1">
                    <Input type="number" min="1" max="15" value={String(formData.porcentaje_impuesto)} onValueChange={handleTaxChange} isInvalid={isTaxInvalid} errorMessage={isTaxInvalid ? "1-15%" : ""} size="sm" className="w-20"/>
                    <span className="font-medium text-slate-800">% = {formatCurrency(formData.impuestos, getMonedaCodigo(formData.moneda_id))}</span>
                </div>
            </div>
            {/* ... */}
        </div>
      </div>
    </FormModal>
  );
};