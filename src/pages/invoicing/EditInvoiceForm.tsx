import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../../supabaseClient";
import { Factura, DetalleFacturaFormData, Producto, Cliente } from "./types";
import { FormModal } from "../../components/ui/form-modal";
import { Button, Input, Select, SelectItem } from "@heroui/react";
import { Icon } from "@iconify/react";
import { Shield, CheckCircle, AlertTriangle, Package } from 'lucide-react';

interface DescuentoClienteProducto {
  id: number;
  cliente_id: number;
  producto_id: number;
  descuento: number | null;
  precio_fijo: number | null;
}

interface ClienteCompleto extends Cliente {
  tipo_identificacion: string;
  identificacion: string;
  correo_facturacion: string;
  provincia: string;
  canton: string;
  distrito: string;
  direccion_exacta: string;
  requiere_electronica: boolean;
}

interface ProductoCompleto extends Producto {
  cabys_code: string;
  categoria: string;
  unidad: string;
}

// Solo para la UI, NO SE GUARDA EN BD
type DetalleLineaEditable = DetalleFacturaFormData & {
  tipo_descuento?: "precio_fijo" | "descuento" | null;
  valor_descuento?: number | null;
  precio_original?: number | null;
  precio_manual?: boolean;
};

interface EditInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: Factura;
  onUpdated: () => void;
}

const EditInvoiceForm: React.FC<EditInvoiceFormProps> = ({
  isOpen,
  onClose,
  invoiceData,
  onUpdated,
}) => {
  const [formData, setFormData] = useState<Partial<Factura>>({});
  const [detalles, setDetalles] = useState<DetalleLineaEditable[]>([]);
  const [productos, setProductos] = useState<ProductoCompleto[]>([]);
  const [clientes, setClientes] = useState<ClienteCompleto[]>([]);
  const [loading, setLoading] = useState(false);
  const [descuentosCliente, setDescuentosCliente] = useState<DescuentoClienteProducto[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCompleto | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string>("");

  // -- 1. Carga catálogos con validaciones --
  const fetchDependencies = useCallback(async () => {
    try {
      // SOLO clientes con facturación electrónica completa
      const { data: clientsData } = await supabase
        .from("clientes")
        .select(`
          id, nombre, tipo_identificacion, identificacion, correo_facturacion,
          provincia, canton, distrito, direccion_exacta, requiere_electronica, status
        `)
        .eq("status", true)
        .eq("requiere_electronica", true);

      const clientesValidos = (clientsData || []).filter(cliente => 
        cliente.tipo_identificacion && 
        cliente.identificacion && 
        cliente.correo_facturacion &&
        cliente.provincia &&
        cliente.canton &&
        cliente.distrito
      );
      setClientes(clientesValidos);

      // SOLO productos con códigos CABYS válidos
      const { data: productsData } = await supabase
        .from("productos")
        .select("id, nombre, precio_venta, status, cabys_code, categoria, unidad")
        .eq("status", true)
        .not("cabys_code", "is", null);

      const productosValidos = (productsData || []).filter(producto => 
        producto.cabys_code && 
        producto.cabys_code.length === 13
      );
      setProductos(productosValidos);

      // Validar disponibilidad de datos
      if (clientesValidos.length === 0) {
        setErrorValidacion("No hay clientes con datos fiscales completos para facturación electrónica.");
      } else if (productosValidos.length === 0) {
        setErrorValidacion("No hay productos con códigos CABYS válidos para facturación electrónica.");
      } else {
        setErrorValidacion("");
      }

    } catch (error) {
      console.error("Error cargando dependencias:", error);
      setErrorValidacion("Error cargando datos del sistema.");
    }
  }, []);

  // -- 2. Carga descuentos/precios fijos SOLO cuando cambia cliente --
  useEffect(() => {
    if (formData.cliente_id) {
      supabase
        .from("cliente_producto")
        .select("*")
        .eq("cliente_id", formData.cliente_id)
        .then(({ data }) => setDescuentosCliente(data ?? []));

      // Obtener datos completos del cliente seleccionado
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      setClienteSeleccionado(cliente || null);
    } else {
      setDescuentosCliente([]);
      setClienteSeleccionado(null);
    }
  }, [formData.cliente_id, clientes]);

  // -- 3. Solo rehidrata detalles al abrir el modal --
  useEffect(() => {
    if (isOpen) {
      fetchDependencies();
      setFormData({ ...invoiceData });
      setDetalles(() => {
        try {
          return JSON.parse(invoiceData.detalle || "[]").map((d: any, index: number) => ({
            id_temporal: d.id_temporal || `temp-${index}`,
            producto_id: d.producto_id ?? null,
            descripcion_item: d.descripcion_item ?? "",
            cantidad: d.cantidad ?? 1,
            precio_unitario: d.precio_unitario ?? 0,
            subtotal_linea: d.subtotal_linea ?? 0,
            impuesto: d.impuesto ?? 0,
            tipo_descuento: null,
            valor_descuento: null,
            precio_original: null,
            precio_manual: false,
          }));
        } catch (e) {
          console.error("Error parseando detalles:", e);
          return [];
        }
      });
    }
  }, [isOpen, fetchDependencies]);

  // -- 4. Handlers generales de formulario --
  const handleHeaderChange = (field: keyof Factura, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "cliente_id") setDetalles([]);
  };

  const handleSelectChange = (
    field: keyof Factura,
    keys: Set<React.Key> | "all"
  ) => {
    if (keys instanceof Set) {
      const value = Array.from(keys)[0];
      handleHeaderChange(field, field === "cliente_id" ? Number(value) : String(value));
    }
  };

  // -- 5. Validaciones mejoradas --
  const validarFactura = (): string | null => {
    if (!formData.cliente_id) {
      return "Debe seleccionar un cliente con datos fiscales completos.";
    }

    if (!clienteSeleccionado) {
      return "Error: No se pudieron cargar los datos del cliente seleccionado.";
    }

    // Validar datos fiscales del cliente
    if (!clienteSeleccionado.tipo_identificacion || !clienteSeleccionado.identificacion || !clienteSeleccionado.correo_facturacion) {
      return "El cliente seleccionado no tiene datos fiscales completos.";
    }

    if (!detalles.length) {
      return "Debe agregar al menos un producto a la factura.";
    }

    // Validar cada línea de detalle
    for (const linea of detalles) {
      if (!linea.producto_id || linea.cantidad <= 0) {
        return "Todas las líneas deben tener un producto y una cantidad mayor a cero.";
      }

      // Validar que el producto tiene código CABYS
      const producto = productos.find(p => p.id === linea.producto_id);
      if (!producto || !producto.cabys_code) {
        return `El producto "${producto?.nombre || 'seleccionado'}" no tiene código CABYS asignado.`;
      }

      if (producto.cabys_code.length !== 13) {
        return `El código CABYS del producto "${producto.nombre}" no es válido (debe tener 13 dígitos).`;
      }
    }

    return null;
  };

  // -- 6. Lógica de detalle mejorada --
  const handleDetailChange = (
    index: number,
    field: keyof DetalleFacturaFormData,
    value: any
  ) => {
    setDetalles((prevDetalles) => {
      const newDetalles = [...prevDetalles];
      const item = { ...newDetalles[index] };

      if (field === "producto_id") {
        item.producto_id = value ? Number(value) : null;
        const producto = productos.find((p) => p.id === item.producto_id);
        let precioBase = producto ? producto.precio_venta : 0;
        item.descripcion_item = producto ? producto.nombre : "";
        item.precio_original = precioBase;

        const descuentoObj = descuentosCliente.find(
          (d) => d.producto_id === item.producto_id
        );
        if (descuentoObj) {
          if (descuentoObj.precio_fijo && Number(descuentoObj.precio_fijo) > 0) {
            item.precio_unitario = Number(descuentoObj.precio_fijo);
            item.tipo_descuento = "precio_fijo";
            item.valor_descuento = Number(descuentoObj.precio_fijo);
            item.precio_manual = false;
          } else if (
            descuentoObj.descuento &&
            Number(descuentoObj.descuento) > 0
          ) {
            const descuento = Number(descuentoObj.descuento);
            item.precio_unitario = precioBase - (precioBase * descuento) / 100;
            item.tipo_descuento = "descuento";
            item.valor_descuento = descuento;
            item.precio_manual = false;
          } else {
            item.precio_unitario = precioBase;
            item.tipo_descuento = null;
            item.valor_descuento = null;
            item.precio_manual = false;
          }
        } else {
          item.precio_unitario = precioBase;
          item.tipo_descuento = null;
          item.valor_descuento = null;
          item.precio_manual = false;
        }
      } else if (field === "precio_unitario") {
        item.precio_unitario = Number(value) || 0;
        item.precio_manual =
          typeof item.precio_original === "number" &&
          Math.abs(item.precio_unitario - item.precio_original) > 0.009 &&
          !item.tipo_descuento;
      } else if (["cantidad", "impuesto"].includes(field)) {
        (item as any)[field] = Number(value) || 0;
      } else {
        (item as any)[field] = value;
      }

      const cantidad = Number(item.cantidad) || 0;
      const precio = Number(item.precio_unitario) || 0;
      const impuesto = Number(item.impuesto) || 0;
      item.subtotal_linea = cantidad * precio + (cantidad * precio * impuesto) / 100;

      newDetalles[index] = item;
      recalcularTotal(newDetalles);
      return newDetalles;
    });
  };

  const recalcularTotal = useCallback((currentDetails: DetalleLineaEditable[]) => {
    const totalFactura = currentDetails.reduce(
      (sum, item) => sum + (item.subtotal_linea || 0),
      0
    );
    setFormData((prev) => ({
      ...prev,
      total_factura: totalFactura,
      saldo_pendiente: totalFactura,
    }));
  }, []);

  const addDetalle = () => {
    setDetalles((prev) => [
      ...prev,
      {
        id_temporal: `new-${Date.now()}`,
        producto_id: null,
        descripcion_item: "",
        cantidad: 1,
        precio_unitario: 0,
        subtotal_linea: 0,
        impuesto: 13,
        tipo_descuento: null,
        valor_descuento: null,
        precio_original: null,
        precio_manual: false,
      },
    ]);
  };

  const removeDetalle = (id_temporal: string) => {
    setDetalles((prev) => {
      const newDetalles = prev.filter((d) => d.id_temporal !== id_temporal);
      recalcularTotal(newDetalles);
      return newDetalles;
    });
  };

  const totalDescuentos = detalles.reduce((sum, l) => {
    if (l.tipo_descuento === "precio_fijo" && l.precio_original) {
      return sum + (l.precio_original - l.precio_unitario) * (l.cantidad || 1);
    }
    if (l.tipo_descuento === "descuento" && l.precio_original) {
      return sum + (l.precio_original - l.precio_unitario) * (l.cantidad || 1);
    }
    return sum;
  }, 0);

  async function handleSubmit() {
    // Validar antes de enviar
    const errorValidacion = validarFactura();
    if (errorValidacion) {
      alert("Error de validación: " + errorValidacion);
      return;
    }

    setLoading(true);
    try {
      const { id, cliente_nombre, created_at, ...updateData } = formData;

      // Preparar detalles con información completa para Hacienda
      const detallesParaGuardar = detalles.map((d) => {
        const producto = productos.find(p => p.id === d.producto_id);
        return {
          producto_id: typeof d.producto_id === "number" ? d.producto_id : null,
          descripcion_item: typeof d.descripcion_item === "string" ? d.descripcion_item : "",
          cantidad: typeof d.cantidad === "number" ? d.cantidad : 0,
          precio_unitario: typeof d.precio_unitario === "number" ? d.precio_unitario : 0,
          subtotal_linea: typeof d.subtotal_linea === "number" ? d.subtotal_linea : 0,
          impuesto: typeof d.impuesto === "number" ? d.impuesto : 0,
          // Información adicional para Hacienda
          cabys_code: producto?.cabys_code,
          unidad_medida: producto?.unidad || 'unidad',
          categoria: producto?.categoria
        };
      });

      const { error } = await supabase
        .from("facturas")
        .update({
          ...updateData,
          detalle: JSON.stringify(detallesParaGuardar),
        })
        .eq("id", id);

      if (error) {
        alert("Error al actualizar la factura: " + error.message);
        console.error("Supabase update error:", error);
      } else {
        onUpdated();
      }
    } catch (err) {
      alert(
        "Error inesperado al guardar: " +
          (err instanceof Error ? err.message : String(err))
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(value);

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Editar Factura ${formData.id?.substring(0, 8)}...`}
      onFormSubmit={handleSubmit}
      isSubmitting={loading}
      submitButtonText="Guardar Cambios"
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto p-2">
        
        {/* Indicadores de validación */}
        {errorValidacion && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center text-red-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              <span className="font-medium">Error de Configuración</span>
            </div>
            <p className="text-sm text-red-700 mt-1">{errorValidacion}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center text-sm">
            <Shield className="h-4 w-4 text-blue-600 mr-2" />
            <span><strong>Clientes válidos:</strong> {clientes.length}</span>
          </div>
          <div className="flex items-center text-sm">
            <Package className="h-4 w-4 text-blue-600 mr-2" />
            <span><strong>Productos con CABYS:</strong> {productos.length}</span>
          </div>
        </div>

        <h3 className="text-md font-semibold text-slate-700">Datos Generales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select
              label="Cliente"
              isRequired
              items={clientes.map((c) => ({ 
                key: c.id, 
                label: `${c.nombre} (${c.tipo_identificacion}: ${c.identificacion})` 
              }))}
              selectedKeys={new Set(
                formData.cliente_id ? [String(formData.cliente_id)] : []
              )}
              onSelectionChange={(k) => handleSelectChange("cliente_id", k)}
            >
              {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
            </Select>
            {clienteSeleccionado && (
              <div className="mt-1 text-xs text-green-600 flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Datos fiscales completos ✓
              </div>
            )}
          </div>
          <Input
            type="date"
            label="Fecha de Emisión"
            isRequired
            value={formData.fecha_emision}
            onValueChange={(v) => handleHeaderChange("fecha_emision", v)}
          />
        </div>

        <h3 className="text-md font-semibold text-slate-700 mt-4 flex items-center">
          <Shield className="h-4 w-4 mr-2" />
          Detalles de la Factura (con códigos CABYS)
        </h3>
        
        <div>
          {detalles.map((detalle, index) => {
            const producto = productos.find(p => p.id === detalle.producto_id);
            return (
              <div
                key={detalle.id_temporal}
                className="flex flex-wrap md:flex-nowrap items-end gap-2 mb-2 p-3 rounded-md border bg-slate-50 shadow-sm min-w-0"
              >
                <div className="flex-1 min-w-[180px]">
                  <Select
                    label="Producto"
                    size="sm"
                    selectedKeys={
                      new Set(
                        detalle.producto_id ? [String(detalle.producto_id)] : []
                      )
                    }
                    onSelectionChange={(keys) =>
                      handleDetailChange(
                        index,
                        "producto_id",
                        Number(Array.from(keys)[0])
                      )
                    }
                    items={productos.map((p) => ({
                      key: p.id,
                      label: `${p.nombre} (CABYS: ${p.cabys_code})`,
                    }))}
                  >
                    {(item) => (
                      <SelectItem key={item.key}>{item.label}</SelectItem>
                    )}
                  </Select>
                  {producto && (
                    <div className="text-xs text-green-600 mt-1 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      CABYS: {producto.cabys_code} ✓
                    </div>
                  )}
                </div>
                <div className="w-20 min-w-[75px]">
                  <Input
                    label="Cantidad"
                    type="number"
                    size="sm"
                    value={String(detalle.cantidad)}
                    onValueChange={(v) =>
                      handleDetailChange(index, "cantidad", v)
                    }
                  />
                </div>
                <div className="w-32 min-w-[115px] flex items-center relative">
                  <Input
                    label="Precio"
                    type="number"
                    size="sm"
                    value={String(detalle.precio_unitario)}
                    onValueChange={(v) =>
                      handleDetailChange(index, "precio_unitario", v)
                    }
                    className={detalle.precio_manual ? "border-yellow-400" : ""}
                  />
                  {detalle.tipo_descuento === "descuento" && (
                    <span className="ml-1 bg-blue-100 text-blue-700 px-2 rounded text-xs flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="mdi:percent" width={15} />{" "}
                      {detalle.valor_descuento}% 
                    </span>
                  )}
                  {detalle.tipo_descuento === "precio_fijo" && (
                    <span className="ml-1 bg-green-100 text-green-700 px-2 rounded text-xs flex items-center gap-1 whitespace-nowrap">
                      <Icon icon="mdi:tag-outline" width={15} /> Precio Fijo
                    </span>
                  )}
                  {detalle.precio_manual && (
                    <span
                      className="ml-1 bg-yellow-100 text-yellow-800 px-2 rounded text-xs flex items-center gap-1 whitespace-nowrap"
                      title="Precio modificado manualmente"
                    >
                      <Icon icon="mdi:alert-outline" width={15} /> Manual
                    </span>
                  )}
                </div>
                <div className="w-24 min-w-[70px]">
                  <Input
                    label="Impuesto"
                    type="number"
                    size="sm"
                    value={String(detalle.impuesto || 0)}
                    onValueChange={(v) =>
                      handleDetailChange(index, "impuesto", v)
                    }
                  />
                </div>
                <div className="w-28 min-w-[90px]">
                  <Input
                    label="Subtotal"
                    size="sm"
                    isDisabled
                    value={formatCurrency(detalle.subtotal_linea)}
                  />
                </div>
                <div className="min-w-[38px] flex justify-end">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    color="danger"
                    onPress={() => removeDetalle(detalle.id_temporal)}
                    className="mt-4"
                    title="Eliminar línea"
                  >
                    <Icon icon="lucide:trash-2" />
                  </Button>
                </div>
              </div>
            );
          })}
          
          <Button
            color="primary"
            onPress={addDetalle}
            startContent={<Icon icon="lucide:plus" className="mr-1" />}
            size="sm"
            isDisabled={productos.length === 0}
          >
            Añadir Línea
          </Button>
          
          {productos.length === 0 && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              No hay productos con códigos CABYS válidos.
            </div>
          )}
        </div>
        
        {totalDescuentos > 0 && (
          <div className="text-right mt-2 text-blue-700 text-sm">
            <Icon icon="mdi:ticket-percent" className="inline" width={18} />{" "}
            <b>Total de descuentos aplicados:</b> {formatCurrency(totalDescuentos)}
          </div>
        )}
        
        <div className="text-right font-bold text-lg mt-4 border-t pt-4">
          <p className="text-sm text-gray-500 font-medium">
            Subtotal:{" "}
            {formatCurrency(
              detalles.reduce((s, d) => s + (d.subtotal_linea || 0), 0)
            )}
          </p>
          <p className="text-xl">
            Total: {formatCurrency(formData.total_factura || 0)}
          </p>
        </div>
      </div>
    </FormModal>
  );
};

export default EditInvoiceForm;