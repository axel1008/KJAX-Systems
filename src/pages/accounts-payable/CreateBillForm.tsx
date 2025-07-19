
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { FormModal } from '../../components/ui/form-modal';
import { Input, Button, Select, SelectItem, Textarea, Modal, ModalBody, ModalContent, ModalHeader } from '@heroui/react';
import type { ProviderForSelect, CondicionPago, Moneda, NewBillFormData, DetalleFacturaFormData } from './types';
import { Icon } from '@iconify/react';
import toast from 'react-hot-toast';
import CreateInventoryItem from '../../pages/inventory/CreateInventoryItem';
import { differenceInDays, addDays, parseISO } from 'date-fns';

interface CreateBillFormProps {
  isOpen: boolean; onClose: () => void; onBillCreated: () => void; onProductCreated: () => void;
  providers: ProviderForSelect[]; condicionesPago: CondicionPago[];
  monedas: Moneda[]; productos: { id: number; nombre: string; precio_compra?: number | null, proveedor_id?: number | null }[];
}

const createInitialDetalle = (): DetalleFacturaFormData => ({
  id_temporal: Date.now().toString(),
  producto_id: null,
  descripcion_item: '',
  cantidad: 1,
  precio_unitario: 0,
  subtotal_linea: 0,
  es_bonificacion: false, 
});

type InitialFormStateType = NewBillFormData & {
    porcentaje_impuesto: number;
    dias_credito_calculados: number | null;
    reemplaza_anulada?: boolean;
    factura_anulada_referencia?: string;
};

const createInitialFormState = (condicionesPago: CondicionPago[], monedas: Moneda[]): InitialFormStateType => {
  const defaultCondicion = condicionesPago.find(c => c.nombre === 'Contado') || condicionesPago[0];
  const defaultMoneda = monedas.find(m => m.codigo === 'CRC') || monedas[0];
  const today = new Date();
  let defaultFechaVencimiento = today.toISOString().split('T')[0];

  if (defaultCondicion?.dias_credito && defaultCondicion.dias_credito > 0) {
    defaultFechaVencimiento = addDays(today, defaultCondicion.dias_credito).toISOString().split('T')[0];
  }

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
  const [formData, setFormData] = useState<InitialFormStateType>(() => createInitialFormState(condicionesPago, monedas));

  const [diasCreditoCalculados, setDiasCreditoCalculados] = useState<number | null>(null);
  const [isTaxInvalid, setIsTaxInvalid] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialState = createInitialFormState(condicionesPago, monedas);
      setFormData(initialState);
      setFilteredProducts(productos);
      setDiasCreditoCalculados(initialState.dias_credito_calculados);
      setIsTaxInvalid(false);
    }
  }, [isOpen, condicionesPago, monedas, productos]);

  useEffect(() => {
    if (formData.proveedor_id) {
      const newFilteredProducts = productos.filter(p => p.proveedor_id === formData.proveedor_id || !p.proveedor_id);
      setFilteredProducts(newFilteredProducts);
    } else {
      setFilteredProducts(productos);
    }
  }, [formData.proveedor_id, productos]);

  const handleSelectChange = useCallback((name: keyof NewBillFormData | 'reemplaza_anulada', selectedKeys: Set<React.Key>) => {
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
      if (!replacesAnulada) {
        newFormDataPartial.factura_anulada_referencia = '';
      }
    }
    else {
      const numValue = ['proveedor_id', 'moneda_id'].includes(name as string) ? (value ? Number(value) : null) : value;
      newFormDataPartial = { [name]: numValue } as Partial<InitialFormStateType>;
    }
    setFormData(prev => ({ ...prev, ...newFormDataPartial }));
  }, [condicionesPago, formData.fecha_emision]);

  const handleDateChange = useCallback((dateString: string, field: 'fecha_emision' | 'fecha_vencimiento') => {
    setFormData(prev => ({ ...prev, [field]: dateString }));
  }, []);

  useEffect(() => {
    if (formData.tipo_documento === 'Crédito' && formData.fecha_emision && formData.fecha_vencimiento) {
      try {
        const fechaEmision = parseISO(formData.fecha_emision);
        const fechaVencimiento = parseISO(formData.fecha_vencimiento);
        if(!isNaN(fechaEmision.getTime()) && !isNaN(fechaVencimiento.getTime())) {
          const diffDays = differenceInDays(fechaVencimiento, fechaEmision);

          if (diffDays < 0) {
            toast.error("La fecha de vencimiento no puede ser anterior a la de emisión.");
            setDiasCreditoCalculados(null);
            setFormData(prev => ({ ...prev, dias_credito_calculados: null, condiciones_pago_id: null }));
          } else {
            setDiasCreditoCalculados(diffDays);
            setFormData(prev => ({ ...prev, dias_credito_calculados: diffDays }));
          }
        }
      } catch (e) {
        // Ignorar fechas inválidas
      }
    } else if (formData.tipo_documento === 'Recibo') {
        setDiasCreditoCalculados(0);
        setFormData(prev => ({ ...prev, dias_credito_calculados: 0 }));
    } else {
      setDiasCreditoCalculados(null);
      setFormData(prev => ({ ...prev, dias_credito_calculados: null }));
    }
  }, [formData.fecha_emision, formData.fecha_vencimiento, formData.tipo_documento]);

  const calcularTotales = useCallback((detalles: DetalleFacturaFormData[], porcentajeImpuesto: number) => {
    const subtotal = detalles.reduce((sum, d) => sum + d.subtotal_linea, 0);
    const impuestos = subtotal * (porcentajeImpuesto / 100);
    const total = subtotal + impuestos;
    setFormData(prev => ({ ...prev, subtotal: parseFloat(subtotal.toFixed(2)), impuestos: parseFloat(impuestos.toFixed(2)), total: parseFloat(total.toFixed(2)) }));
  }, []);

  useEffect(() => {
    if(formData.detalles){
      calcularTotales(formData.detalles, formData.porcentaje_impuesto);
    }
  }, [formData.detalles, formData.porcentaje_impuesto, calcularTotales]);

  const handleBonificacionChange = useCallback((index: number, isChecked: boolean) => {
    setFormData(prev => {
        const nuevosDetalles = [...prev.detalles];
        const detalleActual = nuevosDetalles[index];

        if (detalleActual.producto_id) { 
            detalleActual.es_bonificacion = isChecked;

            if (isChecked) {
                detalleActual.precio_unitario = 0;
            } else {
                const productoOriginal = productos.find(p => p.id === detalleActual.producto_id);
                detalleActual.precio_unitario = productoOriginal?.precio_compra || 0;
            }
            detalleActual.subtotal_linea = detalleActual.cantidad * detalleActual.precio_unitario;
        }
        
        return { ...prev, detalles: nuevosDetalles };
    });
  }, [productos]);

  const handleDetalleChange = (index: number, field: keyof DetalleFacturaFormData, value: any) => {
    const nuevosDetalles = [...formData.detalles];
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
    } else if (field === 'cantidad' || field === 'precio_unitario') {
      (detalleActual as any)[field] = parseFloat(String(value)) || 0;
    } else {
      (detalleActual as any)[field] = String(value);
    }
    detalleActual.subtotal_linea = (detalleActual.cantidad || 0) * (detalleActual.precio_unitario || 0);
    setFormData(prev => ({ ...prev, detalles: nuevosDetalles }));
  };

  const addDetalle = () => setFormData(prev => ({ ...prev, detalles: [...prev.detalles, createInitialDetalle()] }));
  const removeDetalle = (index: number) => setFormData(prev => ({ ...prev, detalles: prev.detalles.filter((_, i) => i !== index) }));

  const handleSubmit = async () => {
    if (formData.porcentaje_impuesto < 1 || formData.porcentaje_impuesto > 15) {
        toast.error("El impuesto debe estar entre 1% y 15%.");
        return;
    }
    setIsLoading(true);
    if (!formData.proveedor_id || !formData.numero_documento) {
      toast.error("Proveedor y Número de Documento son obligatorios.");
      setIsLoading(false); return;
    }
    const detallesValidos = formData.detalles.filter(d => (d.producto_id || d.descripcion_item.trim() !== '') && d.cantidad > 0);
    if (detallesValidos.length === 0) {
      toast.error("Debe añadir al menos una línea de detalle con cantidad mayor a 0.");
      setIsLoading(false); return;
    }

    if (formData.tipo_documento === 'Crédito') {
      if (!formData.fecha_emision || !formData.fecha_vencimiento) {
        toast.error('Para Crédito, la fecha de emisión y vencimiento son obligatorias.');
        setIsLoading(false); return;
      }
      if (parseISO(formData.fecha_vencimiento) < parseISO(formData.fecha_emision)) {
        toast.error('La fecha de vencimiento no puede ser anterior a la fecha de emisión para Crédito.');
        setIsLoading(false); return;
      }
    }
    
    let finalCondicionPagoId = formData.condiciones_pago_id;
    const diasCredito = formData.dias_credito_calculados;

    if (formData.tipo_documento === 'Crédito' && diasCredito !== null && diasCredito >= 0) {
      const existingCondition = condicionesPago.find(c => c.dias_credito === diasCredito);
      
      if (existingCondition) {
        finalCondicionPagoId = existingCondition.id;
      } else {
        try {
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
        } catch (error: any) {
          toast.error(error.message);
          setIsLoading(false);
          return;
        }
      }
    }
    
    const { detalles, porcentaje_impuesto, ...billHead } = formData;
    const subtotalFinal = detallesValidos.reduce((sum, d) => sum + d.subtotal_linea, 0);
    const impuestosFinal = subtotalFinal * (formData.porcentaje_impuesto / 100);
    const totalFinal = subtotalFinal + impuestosFinal;

    const billToInsert = {
        ...billHead,
        condiciones_pago_id: finalCondicionPagoId,
        subtotal: subtotalFinal,
        impuestos: impuestosFinal,
        total: totalFinal,
        saldo_pendiente: totalFinal,
    };

    const { data: billData, error: billError } = await supabase.from('facturas_proveedor').insert(billToInsert).select().single();
    if (billError) {
      toast.error(`Error al crear factura: ${billError.message}`);
      setIsLoading(false); return;
    }

    const detallesParaInsertar = detallesValidos.map(d => ({ 
        factura_proveedor_id: billData.id, 
        producto_id: d.producto_id, 
        descripcion: d.descripcion_item, 
        cantidad: d.cantidad, 
        precio_unitario: d.precio_unitario, 
        subtotal_linea: d.subtotal_linea, 
        total_linea: d.subtotal_linea,
        es_bonificacion: d.es_bonificacion,
    }));

    if (detallesParaInsertar.length > 0) {
      const { error: detallesError } = await supabase.from('detalle_factura_proveedor').insert(detallesParaInsertar);
      if (detallesError) {
        toast.error(`Factura creada, pero error en detalles: ${detallesError.message || 'Error desconocido.'}`);
        setIsLoading(false); return;
      }
    }

    const stockUpdatePromises = detallesValidos.filter(d => d.producto_id).map(d => supabase.rpc('actualizar_stock_producto', { id_producto_a_actualizar: d.producto_id, cantidad_a_sumar: d.cantidad }));
    const results = await Promise.all(stockUpdatePromises);
    const failedUpdate = results.find(result => result.error);

    if (failedUpdate?.error) {
      toast.error(`Factura guardada, pero ocurrió un error al actualizar el stock: ${failedUpdate.error.message}`);
    } else {
      toast.success("¡Factura creada y stock actualizado exitosamente!");
    }

    onBillCreated();
    setIsLoading(false);
  };

  const formatCurrency = (v: number, code = 'CRC') => new Intl.NumberFormat("es-CR", { style: "currency", currency: code }).format(v || 0);
  const getMonedaCodigo = (id: number | null) => monedas.find(m => m.id === id)?.codigo || 'CRC';

  const displayedCondicionesPago = useMemo(() => {
    if (formData.tipo_documento === 'Recibo') {
      return condicionesPago.filter(c => c.nombre === 'Contado');
    } else {
      return condicionesPago.filter(c => c.nombre !== 'Contado');
    }
  }, [formData.tipo_documento, condicionesPago]);

  const shouldShowDateFields = useMemo(() => {
    const selectedCondicion = condicionesPago.find(c => c.id === formData.condiciones_pago_id);
    return formData.tipo_documento === 'Crédito' || (selectedCondicion && selectedCondicion.nombre !== 'Contado');
  }, [formData.tipo_documento, formData.condiciones_pago_id, condicionesPago]);

  return (
    <>
      <FormModal isOpen={isOpen} onClose={onClose} title="Registrar Nueva Factura de Proveedor" onFormSubmit={handleSubmit} submitButtonText="Guardar Factura" isSubmitting={isLoading}
        cancelButtonClassName="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
        submitButtonClassName="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto p-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                label="Proveedor *"
                selectedKeys={formData.proveedor_id ? new Set([String(formData.proveedor_id)]) : new Set<string>()}
                onSelectionChange={(k) => handleSelectChange('proveedor_id', k as Set<React.Key>)}
                items={providers.map(p => ({key: String(p.id), label: p.nombre}))}
                isRequired
            >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
            <Input type="text" label="Número de Documento *" value={formData.numero_documento} onValueChange={(v) => setFormData(p => ({...p, numero_documento: v}))} isRequired/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
                label="Tipo de Documento *"
                selectedKeys={new Set([formData.tipo_documento ?? ''])}
                onSelectionChange={(k) => handleSelectChange('tipo_documento', k as Set<React.Key>)}
                items={[{key: "Crédito", label: "Crédito"}, {key: "Recibo", label: "Recibo"}]}
                isRequired
            >
                {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
            <Select
                label="Condiciones de Pago *"
                selectedKeys={formData.condiciones_pago_id ? new Set([String(formData.condiciones_pago_id)]) : new Set<string>()}
                onSelectionChange={(k) => handleSelectChange('condiciones_pago_id', k as Set<React.Key>)}
                items={displayedCondicionesPago.map(c => ({key: String(c.id), label: `${c.nombre} (${c.dias_credito || 0}d)`}))}
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
                              items={filteredProducts.map(p => ({key: String(p.id), label: p.nombre}))}
                              className="flex-grow"
                          >
                              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                          </Select>
                          <Button isIconOnly size="sm" variant="light" className="ml-1" onPress={() => setIsCreateProductModalOpen(true)} title="Crear nuevo producto"><Icon icon="lucide:plus-circle" className="text-sky-600" /></Button>
                      </div>
                      <div className="col-span-12 md:col-span-3"><Input label="Desc. Item" size="sm" value={detalle.descripcion_item} onValueChange={v => handleDetalleChange(index, 'descripcion_item', v)} /></div>
                      <div className="col-span-4 md:col-span-1"><Input type="number" label="Cant." size="sm" value={String(detalle.cantidad)} onValueChange={v => handleDetalleChange(index, 'cantidad', v)} /></div>
                      <div className="col-span-4 md:col-span-1">
                          <Input type="number" label="P. Unit." size="sm" value={String(detalle.precio_unitario)} onValueChange={v => handleDetalleChange(index, 'precio_unitario', v)} isDisabled={detalle.es_bonificacion}/>
                      </div>
                      <div className="col-span-4 md:col-span-1"><Input label="Subtotal" size="sm" value={detalle.subtotal_linea.toFixed(2)} isDisabled /></div>
                      <div className="col-span-6 md:col-span-1 flex flex-col items-center justify-center">
                          <label htmlFor={`bonificacion-${index}`} className="text-xs text-gray-500 mb-1">Bonif.</label>
                          <input 
                            id={`bonificacion-${index}`}
                            type="checkbox"
                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={detalle.es_bonificacion}
                            onChange={(e) => handleBonificacionChange(index, e.target.checked)}
                            disabled={!detalle.producto_id}
                          />
                      </div>
                      <div className="col-span-6 md:col-span-1 flex items-center justify-end"><Button isIconOnly color="danger" variant="light" size="sm" onPress={() => removeDetalle(index)}><Icon icon="lucide:trash-2" /></Button></div>
                  </div>
              ))}
              {/* --- INICIO: CAMBIO DE ESTILO DEL BOTÓN --- */}
              <Button 
                color="primary" 
                onPress={addDetalle} 
                startContent={<Icon icon="lucide:plus" className="mr-1" />} 
                size="sm" 
                className="mt-2 px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm"
              >
                Añadir Línea
              </Button>
              {/* --- FIN: CAMBIO DE ESTILO --- */}
          </div>
          
          <div className="mt-6 border-t pt-4 space-y-2 flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm"><span className="text-slate-600">Subtotal:</span><span className="font-medium text-slate-800">{formatCurrency(formData.subtotal, getMonedaCodigo(formData.moneda_id))}</span></div>
              <div className="flex justify-between items-center text-sm"><span className="text-slate-600">Impuestos:</span><div className="flex items-center gap-1"><Input type="number" min="1" max="15" value={String(formData.porcentaje_impuesto)} onValueChange={v => { const numVal = Number(v); setFormData(p=>({...p, porcentaje_impuesto: numVal})); setIsTaxInvalid(numVal < 1 || numVal > 15); }} className="w-16 text-right" size="sm" isInvalid={isTaxInvalid} errorMessage={isTaxInvalid ? "Rango: 1-15%" : ""}/><span className="font-medium text-slate-800">% = {formatCurrency(formData.impuestos, getMonedaCodigo(formData.moneda_id))}</span></div></div>
              <div className="flex justify-between text-lg font-bold"><span className="text-slate-700">Total:</span><span className="text-sky-600">{formatCurrency(formData.total, getMonedaCodigo(formData.moneda_id))}</span></div>
            </div>
          </div>
        </div>
      </FormModal>

      <Modal isOpen={isCreateProductModalOpen} onOpenChange={setIsCreateProductModalOpen} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onModalClose) => (
            <React.Fragment>
              <ModalHeader className="text-lg font-semibold">Agregar Nuevo Producto al Inventario</ModalHeader>
              <ModalBody><CreateInventoryItem onClose={onModalClose} onCreated={() => { onModalClose(); toast.success("Producto creado. Refrescando lista..."); onProductCreated(); }} /></ModalBody>
            </React.Fragment>
          )}
        </ModalContent>
      </Modal>
    </>
  );
};