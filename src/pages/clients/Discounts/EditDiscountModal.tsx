import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import type { ClienteProducto } from './types';
import { Button, Input, Select, SelectItem } from '@heroui/react';

export interface EditDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  clienteId: number;
  editing: ClienteProducto | null;
  onSaved: () => void;
}

interface Proveedor {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  nombre: string;
  proveedor_id: number;
  precio_venta: number;
}

export default function EditDiscountModal({
  isOpen,
  onClose,
  clienteId,
  editing,
  onSaved,
}: EditDiscountModalProps) {
  // Estado para proveedor/producto
  const [proveedorId, setProveedorId] = useState<number>(0);
  const [productoId, setProductoId] = useState<number>(editing?.producto_id || 0);
  const [descuento, setDescuento] = useState<number>(editing?.descuento || 0);
  const [precioFijo, setPrecioFijo] = useState<number>(editing?.precio_fijo || 0);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [products, setProducts] = useState<Producto[]>([]);
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  // Para control de último campo editado
  const [lastChanged, setLastChanged] = useState<'descuento' | 'precioFijo'>('descuento');
  const isFirstLoad = useRef(true);

  // Cargar proveedores activos al abrir modal
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const { data } = await supabase
        .from('providers')
        .select('id, nombre')
        .eq('estado', true);
      setProveedores(data ?? []);
    })();
  }, [isOpen]);

  // Al abrir el modal o cambiar edición, resetea campos
  useEffect(() => {
    if (!isOpen) return;
    setProductoId(editing?.producto_id || 0);
    setDescuento(editing?.descuento || 0);
    setPrecioFijo(editing?.precio_fijo || 0);

    // Si editando, busca proveedor y precio base del producto
    if (editing?.producto_id) {
      (async () => {
        const { data: producto } = await supabase
          .from('productos')
          .select('proveedor_id, precio_venta')
          .eq('id', editing.producto_id)
          .single();
        if (producto?.proveedor_id) setProveedorId(producto.proveedor_id);
        if (producto?.precio_venta) setPrecioBase(producto.precio_venta);
      })();
    } else {
      setProveedorId(0);
      setPrecioBase(0);
    }
    setProducts([]);
    isFirstLoad.current = true;
  }, [isOpen, editing]);

  // Cargar productos activos del proveedor seleccionado
  useEffect(() => {
    if (!isOpen || !proveedorId) {
      setProducts([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from('productos')
        .select('id, nombre, proveedor_id, precio_venta')
        .eq('status', true)
        .eq('proveedor_id', proveedorId)
        .order('nombre', { ascending: true });
      setProducts(data ?? []);
    })();
  }, [isOpen, proveedorId]);

  // Al seleccionar producto, cargar precio base
  useEffect(() => {
    if (!isOpen || !productoId) {
      setPrecioBase(0);
      return;
    }
    const producto = products.find(p => p.id === productoId);
    setPrecioBase(producto?.precio_venta ?? 0);

    // Solo si es creación (no edición), resetea descuento y precio fijo
    if (!editing && producto) {
      setDescuento(0);
      setPrecioFijo(0);
      setLastChanged('descuento');
    }
  }, [productoId, products, isOpen, editing]);

  // Sincroniza % y precio fijo según cuál se cambió último
  useEffect(() => {
    if (!isOpen || !precioBase) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return; // evita doble ajuste al abrir modal
    }
    if (lastChanged === 'descuento') {
      // Si el campo cambiado es % descuento, actualiza precio fijo
      const nuevoPrecio = +(precioBase * (1 - descuento / 100)).toFixed(2);
      setPrecioFijo(nuevoPrecio);
    } else if (lastChanged === 'precioFijo') {
      // Si el campo cambiado es precio fijo, actualiza descuento %
      if (precioFijo >= precioBase) setDescuento(0);
      else {
        const nuevoDescuento = +(((1 - precioFijo / precioBase) * 100) || 0).toFixed(2);
        setDescuento(nuevoDescuento > 0 ? nuevoDescuento : 0);
      }
    }
    // eslint-disable-next-line
  }, [descuento, precioFijo, precioBase, lastChanged]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!editing && (!proveedorId || !productoId)) {
      alert('Selecciona proveedor y producto');
      return;
    }
    setLoading(true);
    if (editing) {
      const { error } = await supabase
        .from('cliente_producto')
        .update({ descuento, precio_fijo: precioFijo })
        .eq('id', editing.id);
      if (error) {
        console.error(error);
        alert('Error al actualizar descuento');
      } else {
        onSaved();
      }
    } else {
      const { error } = await supabase
        .from('cliente_producto')
        .insert({
          cliente_id: clienteId,
          producto_id: productoId,
          descuento,
          precio_fijo: precioFijo,
        });
      if (error) {
        console.error(error);
        alert('Error al crear descuento');
      } else {
        onSaved();
      }
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            {editing ? 'Editar Descuento' : 'Añadir Descuento'}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Select proveedor SOLO cuando NO editas */}
          {!editing && (
            <div>
              <label className="block text-sm mb-1">Proveedor</label>
              <Select
                selectedKeys={proveedorId ? new Set([String(proveedorId)]) : new Set([])}
                onSelectionChange={keys => {
                  setProveedorId(Number(Array.from(keys)[0]) || 0);
                  setProductoId(0); // Al cambiar proveedor, resetea producto
                  setPrecioBase(0);
                }}
                items={proveedores.map(p => ({ key: String(p.id), label: p.nombre }))}
                className="w-full"
              >
                {item => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
          )}

          {/* Select producto SOLO cuando hay proveedor y NO editas */}
          {!editing && proveedorId > 0 && (
            <div>
              <label className="block text-sm mb-1">Producto</label>
              <Select
                selectedKeys={productoId ? new Set([String(productoId)]) : new Set([])}
                onSelectionChange={keys => setProductoId(Number(Array.from(keys)[0]) || 0)}
                items={products.map(p => ({ key: String(p.id), label: p.nombre }))}
                className="w-full"
              >
                {item => <SelectItem key={item.key}>{item.label}</SelectItem>}
              </Select>
            </div>
          )}

          {/* Mostrar precio base si hay producto */}
          {precioBase > 0 && (
            <div className="text-sm text-gray-700 font-semibold">
              Precio base:{' '}
              <span className="text-blue-700">
                ₡{precioBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* % Descuento */}
          <div>
            <label className="block text-sm mb-1">% Descuento</label>
            <Input
              type="number"
              value={descuento.toString()}
              min={0}
              max={100}
              onChange={e => {
                setDescuento(Number(e.target.value) || 0);
                setLastChanged('descuento');
              }}
              placeholder="0.00"
              step={0.01}
            />
          </div>

          {/* Precio Fijo */}
          <div>
            <label className="block text-sm mb-1">Precio Fijo</label>
            <Input
              type="number"
              value={precioFijo.toString()}
              min={0}
              max={precioBase}
              onChange={e => {
                setPrecioFijo(Number(e.target.value) || 0);
                setLastChanged('precioFijo');
              }}
              placeholder="0.00"
              step={0.01}
            />
          </div>

          {/* Mostrar precio final */}
          {precioBase > 0 && (
            <div className="text-md mt-1 text-gray-800 font-bold">
              Precio final:{' '}
              <span className="text-green-700">
                ₡{precioFijo.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              onPress={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleSubmit}
              color="primary"
              disabled={loading || (!editing && (!proveedorId || !productoId))}
            >
              {loading ? 'Guardando…' : editing ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}