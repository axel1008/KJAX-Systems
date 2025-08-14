// src/pages/accounts-payable/CreateBillForm.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { FormModal } from '../../components/ui/form-modal';
import { Input, Button, Select, SelectItem, Textarea, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import type { ProviderForSelect, CondicionPago, Moneda, NewBillFormData, DetalleFacturaFormData } from './types';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import CreateInventoryItem from '../../pages/inventory/CreateInventoryItem';
import { differenceInDays, addDays, parseISO } from 'date-fns';

// Hook para subir archivos
const uploadFileToBucket = async (file: File, folder: string, prefix: string): Promise<string> => {
  const fileName = `${folder}/${prefix}_${Date.now()}_${file.name}`;
  const { error } = await supabase.storage
    .from('facturas_proveedor')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });
  if (error) throw error;
  return fileName;
};

interface CreateBillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onBillCreated: () => void;
  onProductCreated: () => void;
  providers: ProviderForSelect[];
  condicionesPago: CondicionPago[];
  monedas: Moneda[];
  productos: { id: number; nombre: string; precio_compra?: number | null; proveedor_id?: number | null }[];
}

interface DetalleFacturaFormDataPlus extends DetalleFacturaFormData {
  cantidad_bonificacion: number;
}

type InitialFormStateType = NewBillFormData & {
  porcentaje_impuesto: number;
  dias_credito_calculados: number | null;
  reemplaza_anulada?: boolean;
  factura_anulada_referencia?: string;
};

const createInitialDetalle = (): DetalleFacturaFormDataPlus => ({
  id_temporal: Date.now().toString(),
  producto_id: null,
  descripcion_item: '',
  cantidad: 1,
  cantidad_bonificacion: 0,
  precio_unitario: 0,
  subtotal_linea: 0,
  es_bonificacion: false,
});

const createInitialFormState = (
  condicionesPago: CondicionPago[],
  monedas: Moneda[]
): InitialFormStateType => {
  const defaultCondicion = condicionesPago.find(c => c.nombre === 'Contado') || condicionesPago[0];
  const defaultMoneda = monedas.find(m => m.codigo === 'CRC') || monedas[0];
  const today = new Date();
  let defaultFechaVencimiento = today.toISOString().split('T')[0];
  if (defaultCondicion?.dias_credito && defaultCondicion.dias_credito > 0)
    defaultFechaVencimiento = addDays(today, defaultCondicion.dias_credito).toISOString().split('T')[0];

  return {
    proveedor_id: null,
    numero_documento: '',
    tipo_documento: 'Recibo',
    fecha_emision: today.toISOString().split('T')[0],
    fecha_vencimiento: defaultFechaVencimiento,
    condiciones_pago_id: defaultCondicion?.id || null,
    subtotal: 0,
    impuestos: 0,
    total: 0,
    moneda_id: defaultMoneda?.id || null,
    estado: 'Pendiente',
    descripcion: '',
    detalles: [createInitialDetalle()],
    porcentaje_impuesto: 13,
    dias_credito_calculados: defaultCondicion?.nombre === 'Contado' ? 0 : null,
    reemplaza_anulada: false,
    factura_anulada_referencia: '',
  };
};

export const CreateBillForm: React.FC<CreateBillFormProps> = ({
  isOpen, onClose, onBillCreated, onProductCreated, providers, condicionesPago, monedas, productos,
}) => {
  const [filteredProducts, setFilteredProducts] = useState(productos);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<InitialFormStateType>(() =>
    createInitialFormState(condicionesPago, monedas)
  );
  const [diasCreditoCalculados, setDiasCreditoCalculados] = useState<number | null>(null);
  const [isTaxInvalid, setIsTaxInvalid] = useState(false);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

  useEffect(() => {
    if (isOpen) {
      const init = createInitialFormState(condicionesPago, monedas);
      setFormData(init);
      setFilteredProducts(productos);
      setDiasCreditoCalculados(init.dias_credito_calculados);
      setIsTaxInvalid(false);
      setInvoiceFile(null);
    }
  }, [isOpen, condicionesPago, monedas, productos]);

  useEffect(() => {
    if (formData.proveedor_id) {
      const newFilteredProducts = productos.filter(
        p => p.proveedor_id === formData.proveedor_id || !p.proveedor_id
      );
      setFilteredProducts(newFilteredProducts);
    } else {
      setFilteredProducts(productos);
    }
  }, [formData.proveedor_id, productos]);

  const handleSelectChange = useCallback(
    (name: keyof NewBillFormData | 'reemplaza_anulada', selectedKeys: Set<React.Key>) => {
      const selectedKey = Array.from(selectedKeys)[0];
      const value = selectedKey !== undefined ? String(selectedKey) : null;
      let newFormDataPartial: Partial<InitialFormStateType> = {};

      if (name === 'tipo_documento') {
        const tipoDoc = value as 'Crédito' | 'Recibo';
        newFormDataPartial.tipo_documento = tipoDoc;
        if (tipoDoc === 'Recibo') {
          const contadoCondicion = condicionesPago.find(c => c.nombre === 'Contado');
          newFormDataPartial.condiciones_pago_id = contadoCondicion?.id || null;
          const today = new Date().toISOString().split('T')[0];
          newFormDataPartial.fecha_emision = today;
          newFormDataPartial.fecha_vencimiento = today;
          setDiasCreditoCalculados(0);
          newFormDataPartial.dias_credito_calculados = 0;
        } else if (tipoDoc === 'Crédito') {
          const thirtyDaysCondicion = condicionesPago.find(c => c.dias_credito === 30);
          newFormDataPartial.condiciones_pago_id = thirtyDaysCondicion?.id || null;
          if (!formData.fecha_emision) newFormDataPartial.fecha_emision = new Date().toISOString().split('T')[0];
          if (thirtyDaysCondicion?.dias_credito) {
            const newDueDate = addDays(parseISO(newFormDataPartial.fecha_emision || formData.fecha_emision), thirtyDaysCondicion.dias_credito).toISOString().split('T')[0];
            newFormDataPartial.fecha_vencimiento = newDueDate;
          }
        }
      } else if (name === 'condiciones_pago_id') {
        const condId = value ? Number(value) : null;
        const selectedCondicion = condicionesPago.find(c => c.id === condId);
        newFormDataPartial.condiciones_pago_id = condId;
        if (selectedCondicion?.nombre === 'Contado') {
          const today = new Date().toISOString().split('T')[0];
          newFormDataPartial.fecha_emision = today;
          newFormDataPartial.fecha_vencimiento = today;
          setDiasCreditoCalculados(0);
          newFormDataPartial.dias_credito_calculados = 0;
        } else if (selectedCondicion?.dias_credito !== undefined && selectedCondicion.dias_credito !== null) {
          const currentIssueDate = parseISO(formData.fecha_emision);
          const newDueDate = addDays(currentIssueDate, selectedCondicion.dias_credito).toISOString().split('T')[0];
          newFormDataPartial.fecha_vencimiento = newDueDate;
          setDiasCreditoCalculados(selectedCondicion.dias_credito);
          newFormDataPartial.dias_credito_calculados = selectedCondicion.dias_credito;
        } else {
          setDiasCreditoCalculados(null);
          newFormDataPartial.dias_credito_calculados = null;
        }
      } else if (name === 'reemplaza_anulada') {
        const replacesAnulada = value === 'true';
        newFormDataPartial.reemplaza_anulada = replacesAnulada;
        if (!replacesAnulada) newFormDataPartial.factura_anulada_referencia = '';
      } else {
        const numValue = ['proveedor_id', 'moneda_id'].includes(name as string) ? (value ? Number(value) : null) : value;
        newFormDataPartial = { [name]: numValue } as Partial<InitialFormStateType>;
      }
      setFormData(prev => ({ ...prev, ...newFormDataPartial }));
    },
    [condicionesPago, formData.fecha_emision]
  );

  const handleDateChange = useCallback(
    (dateString: string, field: 'fecha_emision' | 'fecha_vencimiento') => {
      setFormData(prev => ({ ...prev, [field]: dateString }));
    },
    []
  );

  const calcularTotales = useCallback(
    (detalles: DetalleFacturaFormDataPlus[], porcentajeImpuesto: number) => {
      const subtotal = detalles.reduce((sum, d) => sum + d.subtotal_linea, 0);
      const impuestos = subtotal * (porcentajeImpuesto / 100);
      const total = subtotal + impuestos;
      setFormData(prev => ({
        ...prev,
        subtotal: parseFloat(subtotal.toFixed(2)),
        impuestos: parseFloat(impuestos.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
      }));
    },
    []
  );

  useEffect(() => {
    if (formData.detalles) {
      calcularTotales(formData.detalles, formData.porcentaje_impuesto);
    }
  }, [formData.detalles, formData.porcentaje_impuesto, calcularTotales]);

  const handleDetalleChange = (
    index: number,
    field: keyof DetalleFacturaFormDataPlus,
    value: any
  ) => {
    const nuevosDetalles = [...formData.detalles] as DetalleFacturaFormDataPlus[];
    const detalleActual = nuevosDetalles[index];

    if (field === 'producto_id') {
      const numValue = value ? Number(value) : null;
      detalleActual.producto_id = numValue;
      const productoSeleccionado = productos.find(p => p.id === numValue);
      if (productoSeleccionado) {
        detalleActual.descripcion_item = productoSeleccionado.nombre;
        detalleActual.precio_unitario = productoSeleccionado.precio_compra || 0;
        detalleActual.es_bonificacion = false;
      }
    } else if (['cantidad', 'cantidad_bonificacion', 'precio_unitario'].includes(field)) {
      (detalleActual as any)[field] = Math.max(0, parseFloat(String(value)) || 0);
    } else {
      (detalleActual as any)[field] = String(value);
    }
    const cantidadPagada = detalleActual.cantidad;
    detalleActual.subtotal_linea = cantidadPagada * detalleActual.precio_unitario;
    setFormData(prev => ({ ...prev, detalles: nuevosDetalles }));
  };

  const addDetalle = () =>
    setFormData(prev => ({ ...prev, detalles: [...prev.detalles, createInitialDetalle()] }));

  const removeDetalle = (index: number) =>
    setFormData(prev => ({ ...prev, detalles: prev.detalles.filter((_, i) => i !== index) }));

    const handleSubmit = async () => {
      if (formData.porcentaje_impuesto < 1 || formData.porcentaje_impuesto > 15) {
        toast.error('El impuesto debe estar entre 1% y 15%.');
        return;
      }
      setIsLoading(true);
  
      if (!formData.proveedor_id || !formData.numero_documento) {
        toast.error('Proveedor y Número de Documento son obligatorios.');
        setIsLoading(false);
        return;
      }
      const detallesValidos = formData.detalles.filter(
        d => (d.producto_id || d.descripcion_item.trim() !== '') && d.cantidad > 0
      );
      if (detallesValidos.length === 0) {
        toast.error('Debe añadir al menos una línea de detalle con cantidad mayor a 0.');
        setIsLoading(false);
        return;
      }
  
      try {
        let finalCondicionPagoId = formData.condiciones_pago_id;
        const diasCredito = formData.dias_credito_calculados;
  
        if (formData.tipo_documento === 'Crédito' && diasCredito !== null && diasCredito >= 0) {
          const existingCondition = condicionesPago.find(c => c.dias_credito === diasCredito);
          if (existingCondition) {
            finalCondicionPagoId = existingCondition.id;
          } else {
            const newConditionName = `${diasCredito} días`;
            toast(`Creando nueva condición de pago: ${newConditionName}`);
            const { data: newCondData, error: newCondError } = await supabase
              .from('condiciones_pago')
              .insert({ nombre: newConditionName, dias_credito: diasCredito })
              .select()
              .single();
            if (newCondError) throw new Error(`No se pudo crear la nueva condición de pago: ${newCondError.message}`);
            finalCondicionPagoId = newCondData.id;
            toast.success(`Condición "${newConditionName}" creada.`);
          }
        }
  
        const { detalles, porcentaje_impuesto, ...billHead } = formData;
        const subtotalFinal = detallesValidos.reduce((sum, d) => sum + d.subtotal_linea, 0);
        const impuestosFinal = subtotalFinal * (formData.porcentaje_impuesto / 100);
        const totalFinal = subtotalFinal + impuestosFinal;
  
        let archivoPath: string | null = null;
        const condicion = condicionesPago.find(c => c.id === finalCondicionPagoId);
        if (condicion?.nombre === 'Contado' && invoiceFile) {
          archivoPath = await uploadFileToBucket(invoiceFile, 'facturas', 'factura');
        }
  
        const billToInsert = {
          ...billHead,
          condiciones_pago_id: finalCondicionPagoId,
          subtotal: subtotalFinal,
          impuestos: impuestosFinal,
          total: totalFinal,
          saldo_pendiente: formData.tipo_documento === 'Recibo' ? 0 : totalFinal,
          estado: formData.tipo_documento === 'Recibo' ? 'Pagada' : 'Pendiente',
          archivo_factura_path: archivoPath,
        };
  
        const { data: billData, error: billError } = await supabase
          .from('facturas_proveedor')
          .insert(billToInsert)
          .select()
          .single();
        if (billError) {
          throw new Error(`Error al crear factura: ${billError.message}`);
        }

        if (formData.tipo_documento === 'Recibo') {
            const pagoData = {
              factura_proveedor_id: billData.id,
              proveedor_id: billData.proveedor_id,
              fecha_pago: new Date().toISOString().split('T')[0],
              monto_total: totalFinal,
              medio_pago: 'Efectivo',
              moneda_id: billData.moneda_id,
              comprobante_path: archivoPath,
            };
      
            const { data: newPagoData, error: pagoError } = await supabase.from('pagos_proveedor').insert(pagoData).select().single();
            if (pagoError) {
              toast.error(`Factura creada, pero error al registrar el pago: ${pagoError.message}`);
            } else {
                const { error: updateError } = await supabase
                .from('facturas_proveedor')
                .update({ saldo_pendiente: 0, estado: 'Pagada' })
                .eq('id', billData.id);
      
              if (updateError) {
                toast.error(`Pago registrado, pero no se pudo actualizar la factura: ${updateError.message}`);
              }
            }
          }
  
        const detallesParaInsertar = detallesValidos.map(d => ({
          factura_proveedor_id: billData.id,
          producto_id: d.producto_id,
          descripcion: d.descripcion_item,
          cantidad: d.cantidad + d.cantidad_bonificacion,
          cantidad_bonificacion: d.cantidad_bonificacion,
          precio_unitario: d.precio_unitario,
          subtotal_linea: d.subtotal_linea,
          total_linea: d.subtotal_linea,
          es_bonificacion: d.es_bonificacion,
        }));
  
        if (detallesParaInsertar.length > 0) {
          const { error: detallesError } = await supabase.from('detalle_factura_proveedor').insert(detallesParaInsertar);
          if (detallesError) {
            throw new Error(`Factura creada, pero error en detalles: ${detallesError.message || 'Error desconocido.'}`);
          }
        }
  
        const stockUpdatePromises = detallesValidos.filter(d => d.producto_id).map(d =>
          supabase.rpc('actualizar_stock_producto', {
            id_producto_a_actualizar: d.producto_id,
            cantidad_a_sumar: d.cantidad + d.cantidad_bonificacion,
          })
        );
        const results = await Promise.all(stockUpdatePromises);
        const failedUpdate = results.find(result => result.error);
        if (failedUpdate?.error) {
          toast.error(`Factura guardada, pero error al actualizar stock: ${failedUpdate.error.message}`);
        } else {
          toast.success('¡Factura creada y stock actualizado exitosamente!');
        }
  
        onBillCreated();
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setIsLoading(false);
      }
    };

  const formatCurrency = (v: number, code = 'CRC') =>
    new Intl.NumberFormat('es-CR', { style: 'currency', currency: code }).format(v || 0);
  const getMonedaCodigo = (id: number | null) => monedas.find(m => m.id === id)?.codigo || 'CRC';

  const displayedCondicionesPago = useMemo(() => {
    if (formData.tipo_documento === 'Recibo') return condicionesPago.filter(c => c.nombre === 'Contado');
    return condicionesPago.filter(c => c.nombre !== 'Contado');
  }, [formData.tipo_documento, condicionesPago]);

  const shouldShowDateFields = useMemo(() => {
    const selectedCondicion = condicionesPago.find(c => c.id === formData.condiciones_pago_id);
    return formData.tipo_documento === 'Crédito' || (selectedCondicion && selectedCondicion.nombre !== 'Contado');
  }, [formData.tipo_documento, formData.condiciones_pago_id, condicionesPago]);

  return (
    <>
      <FormModal
        isOpen={isOpen}
        onClose={onClose}
        title="Registrar Nueva Factura de Proveedor"
        onFormSubmit={handleSubmit}
        submitButtonText="Guardar Factura"
        isSubmitting={isLoading}
        cancelButtonClassName="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
        submitButtonClassName="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Proveedor *"
              selectedKeys={formData.proveedor_id ? new Set([String(formData.proveedor_id)]) : new Set()}
              onSelectionChange={(k) => handleSelectChange('proveedor_id', k as Set<React.Key>)}
              items={providers.map(p => ({ key: String(p.id), label: p.nombre }))}
              isRequired
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
            <Input type="text" label="Número de Documento *" value={formData.numero_documento} onValueChange={v => setFormData(p => ({ ...p, numero_documento: v }))} isRequired />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Documento *"
              selectedKeys={new Set([formData.tipo_documento])}
              onSelectionChange={(k) => handleSelectChange('tipo_documento', k as Set<React.Key>)}
              items={[{ key: 'Crédito', label: 'Crédito' }, { key: 'Recibo', label: 'Recibo' }]}
              isRequired
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
            <Select
              label="Condiciones de Pago *"
              selectedKeys={formData.condiciones_pago_id ? new Set([String(formData.condiciones_pago_id)]) : new Set()}
              onSelectionChange={(k) => handleSelectChange('condiciones_pago_id', k as Set<React.Key>)}
              items={displayedCondicionesPago.map(c => ({ key: String(c.id), label: `${c.nombre} (${c.dias_credito || 0}d)` }))}
              isRequired
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
          </div>

          {shouldShowDateFields && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input type="date" label="Fecha de Emisión *" value={formData.fecha_emision} onValueChange={v => handleDateChange(v, 'fecha_emision')} isRequired />
              <Input type="date" label="Fecha de Vencimiento *" value={formData.fecha_vencimiento} onValueChange={v => handleDateChange(v, 'fecha_vencimiento')} isRequired />
            </div>
          )}

          {formData.tipo_documento === 'Crédito' && diasCreditoCalculados !== null && (
            <div className="text-sm text-gray-600">
              Días de crédito calculados: <span className="font-semibold">{diasCreditoCalculados} días</span>
            </div>
          )}

          <Textarea label="Descripción (Opcional)" value={formData.descripcion ?? ''} onValueChange={v => setFormData(p => ({ ...p, descripcion: v }))} />

          {displayedCondicionesPago.find(c => c.id === formData.condiciones_pago_id)?.nombre === 'Contado' && (
            <label className="block mt-4">
              <span className="text-sm font-medium text-slate-700">Archivo Factura / Comprobante</span>
              <input
                type="file"
                className="mt-1 block w-full text-sm file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

          <div className="my-6">
            <h3 className="text-md font-semibold text-slate-700 mb-3">Detalles de la Factura *</h3>
            {formData.detalles.map((detalle, index) => (
              <div key={detalle.id_temporal} className="grid grid-cols-auto gap-x-2 gap-y-3 mb-3 p-3 border rounded-md bg-slate-50 items-center">
                <div className="col-span-12 md:col-span-4 relative flex items-center">
                  <Select
                    label="Producto"
                    size="sm"
                    selectedKeys={detalle.producto_id ? new Set([String(detalle.producto_id)]) : new Set<string>()}
                    onSelectionChange={(k) => handleDetalleChange(index, 'producto_id', Array.from(k as Set<React.Key>)[0])}
                    items={filteredProducts.map(p => ({ key: String(p.id), label: p.nombre }))}
                    className="flex-grow"
                  >
                    {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                  </Select>
                  <Button isIconOnly size="sm" variant="light" className="ml-1" onPress={() => setIsCreateProductModalOpen(true)} title="Crear nuevo producto">
                    <Icon icon="lucide:plus-circle" className="text-sky-600" />
                  </Button>
                </div>
                <div className="col-span-12 md:col-span-3"><Input label="Desc. Item" size="sm" value={detalle.descripcion_item} onValueChange={v => handleDetalleChange(index, 'descripcion_item', v)} /></div>
                <div className="col-span-4 md:col-span-1"><Input type="number" label="Cant." size="sm" value={String(detalle.cantidad)} onValueChange={v => handleDetalleChange(index, 'cantidad', v)} /></div>
                <div className="col-span-4 md:col-span-1"><Input type="number" label="Bonif." size="sm" value={String(detalle.cantidad_bonificacion)} onValueChange={v => handleDetalleChange(index, 'cantidad_bonificacion', v)} /></div>
                <div className="col-span-4 md:col-span-1"><Input type="number" label="P. Unit." size="sm" value={String(detalle.precio_unitario)} onValueChange={v => handleDetalleChange(index, 'precio_unitario', v)} isDisabled={detalle.es_bonificacion} /></div>
                <div className="col-span-4 md:col-span-1"><Input label="Subtotal" size="sm" value={detalle.subtotal_linea.toFixed(2)} isDisabled /></div>
                <div className="col-span-6 md:col-span-1 flex items-center justify-end"><Button isIconOnly color="danger" variant="light" size="sm" onPress={() => removeDetalle(index)}><Icon icon="lucide:trash-2" /></Button></div>
              </div>
            ))}
            <Button color="primary" onPress={addDetalle} startContent={<Icon icon="lucide:plus" className="mr-1" />} size="sm" className="mt-2 px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm">
              Añadir Línea
            </Button>
          </div>

          <div className="mt-6 border-t pt-4 space-y-2 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal:</span><span className="font-medium text-slate-800">{formatCurrency(formData.subtotal, getMonedaCodigo(formData.moneda_id))}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-600">Impuestos:</span><div className="flex items-center gap-1"><Input type="number" min="1" max="15" value={String(formData.porcentaje_impuesto)} onValueChange={v => { const numVal = Number(v); setFormData(p => ({ ...p, porcentaje_impuesto: numVal })); setIsTaxInvalid(numVal < 1 || numVal > 15); }} className="w-16 text-right" size="sm" isInvalid={isTaxInvalid} errorMessage={isTaxInvalid ? 'Rango: 1-15%' : ''} /><span className="font-medium text-slate-800">% = {formatCurrency(formData.impuestos, getMonedaCodigo(formData.moneda_id))}</span></div></div>
              <div className="flex justify-between text-lg font-bold"><span className="text-slate-700">Total:</span><span className="text-sky-600">{formatCurrency(formData.total, getMonedaCodigo(formData.moneda_id))}</span></div>
            </div>
          </div>
        </div>
      </FormModal>

      <Modal isOpen={isCreateProductModalOpen} onOpenChange={setIsCreateProductModalOpen} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onModalClose) => (
            <>
              <ModalHeader className="text-lg font-semibold">Agregar Nuevo Producto al Inventario</ModalHeader>
              <ModalBody><CreateInventoryItem onClose={onModalClose} onCreated={() => { onModalClose(); toast.success('Producto creado. Refrescando lista...'); onProductCreated(); }} /></ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};