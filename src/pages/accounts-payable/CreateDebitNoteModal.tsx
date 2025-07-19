// RUTA: src/pages/accounts-payable/CreateDebitNoteModal.tsx (VERSIÓN ACTUALIZADA)

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import toast from 'react-hot-toast';
import { Select, SelectItem } from "@heroui/react"; // Asumiendo que usas este componente

interface CreateDebitNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  proveedorId: number;
  onSaved: () => void;
}

// --- NUEVO: Interfaz para las facturas a seleccionar
interface FacturaParaSeleccionar {
  id: string; // uuid
  numero_documento: string;
}

export default function CreateDebitNoteModal({ isOpen, onClose, proveedorId, onSaved }: CreateDebitNoteModalProps) {
  // --- MODIFICADO: Estados para los nuevos campos
  const [consecutivo, setConsecutivo] = useState('');
  const [subtotal, setSubtotal] = useState('');
  const [impuestos, setImpuestos] = useState('0'); // IVA por defecto en 0
  const [total, setTotal] = useState(0);
  const [motivo, setMotivo] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [facturaId, setFacturaId] = useState<string | null>(null); // Para la factura original opcional
  const [facturasProveedor, setFacturasProveedor] = useState<FacturaParaSeleccionar[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingConsecutivo, setLoadingConsecutivo] = useState(true);

  // --- MODIFICADO: Calcular total automáticamente
  useEffect(() => {
    const nSubtotal = parseFloat(subtotal) || 0;
    const nImpuestos = parseFloat(impuestos) || 0;
    setTotal(nSubtotal + nImpuestos);
  }, [subtotal, impuestos]);

  // --- NUEVO: Cargar datos al abrir el modal (consecutivo y facturas)
  const loadInitialData = useCallback(async () => {
    if (!isOpen || !proveedorId) return;

    setLoadingConsecutivo(true);
    // 1. Obtener el número consecutivo
    const { data: consecutivoData, error: consecutivoError } = await supabase.rpc('obtener_siguiente_consecutivo_debito');
    if (consecutivoError) {
      toast.error("Error al generar el consecutivo.");
      console.error(consecutivoError);
    } else {
      setConsecutivo(consecutivoData);
    }

    // 2. Obtener facturas del proveedor para el selector
    const { data: facturasData, error: facturasError } = await supabase
      .from('facturas_proveedor')
      .select('id, numero_documento')
      .eq('proveedor_id', proveedorId)
      .in('estado', ['Pagada', 'Parcial', 'Pendiente', 'Vencida']); // Solo facturas válidas
    
    if (facturasError) {
      toast.error("Error al cargar facturas del proveedor.");
    } else {
      setFacturasProveedor(facturasData || []);
    }
    
    setLoadingConsecutivo(false);
  }, [isOpen, proveedorId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);


  // Resetea el formulario cuando se cierra
  useEffect(() => {
    if (!isOpen) {
      setSubtotal('');
      setImpuestos('0');
      setMotivo('');
      setFacturaId(null);
      setFecha(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- MODIFICADO: Guardar todos los nuevos campos
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtotal || !motivo || !consecutivo) {
      toast.error('El motivo, subtotal y consecutivo son obligatorios.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('notas_debito_proveedor')
      .insert({
        proveedor_id: proveedorId,
        numero_documento: consecutivo,
        subtotal: parseFloat(subtotal),
        impuestos: parseFloat(impuestos) || 0,
        total: total,
        motivo: motivo,
        fecha: fecha,
        factura_id: facturaId, // Puede ser nulo
      });
    
    setLoading(false);

    if (error) {
      console.error('Error creando nota de débito:', error.message);
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success('¡Nota de débito creada con éxito!');
      onSaved();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Nueva Nota de Débito</h2>
        
        {loadingConsecutivo ? <p>Cargando...</p> : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* --- NUEVO: Campos para el emisor y receptor (informativo) --- */}
              {/* Aquí podrías mostrar info de la empresa y del proveedor si la tienes */}

              {/* --- NUEVO: Número de Nota de Débito --- */}
              <div>
                <label htmlFor="consecutivo" className="block text-sm font-medium text-gray-700">Número de Documento</label>
                <input
                  id="consecutivo"
                  type="text"
                  value={consecutivo}
                  readOnly
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100"
                />
              </div>

              {/* --- NUEVO: Selector de Factura Original (Opcional) --- */}
              <div>
                <Select
                  label="Factura Original (Opcional)"
                  placeholder="Seleccione una factura"
                  selectedKeys={facturaId ? [facturaId] : []}
                  onSelectionChange={(keys) => setFacturaId(Array.from(keys)[0] as string)}
                  items={facturasProveedor}
                >
                  {(item) => <SelectItem key={item.id}>{item.numero_documento}</SelectItem>}
                </Select>
              </div>

              {/* --- MODIFICADO: Desglose de Monto --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="subtotal" className="block text-sm font-medium text-gray-700">Subtotal</label>
                  <input id="subtotal" type="number" step="0.01" value={subtotal} onChange={(e) => setSubtotal(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
                </div>
                <div>
                  <label htmlFor="impuestos" className="block text-sm font-medium text-gray-700">Impuestos (IVA)</label>
                  <input id="impuestos" type="number" step="0.01" value={impuestos} onChange={(e) => setImpuestos(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                </div>
                <div>
                  <label htmlFor="total" className="block text-sm font-medium text-gray-700">Total</label>
                  <input id="total" type="text" value={`₡${total.toFixed(2)}`} readOnly className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" />
                </div>
              </div>
              
              {/* --- Descripción del Ajuste --- */}
              <div>
                <label htmlFor="motivo_debito" className="block text-sm font-medium text-gray-700">Descripción del Ajuste / Motivo</label>
                <textarea id="motivo_debito" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
              </div>

              {/* --- Fecha de Emisión --- */}
              <div>
                <label htmlFor="fecha_debito" className="block text-sm font-medium text-gray-700">Fecha de Emisión</label>
                <input id="fecha_debito" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" required />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">Cancelar</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {loading ? 'Guardando...' : 'Guardar Nota de Débito'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}