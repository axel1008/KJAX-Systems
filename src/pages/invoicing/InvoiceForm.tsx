import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Factura, Cliente, Moneda, MetodoPago, Producto, DetalleFacturaFormData } from "./types";
import { useNotifications } from "../../Context/NotificationContext";
import { Icon } from "@iconify/react";
import { Button } from "@heroui/react";

interface DescuentoClienteProducto {
  id: number;
  cliente_id: number;
  producto_id: number;
  descuento: number | null;
  precio_fijo: number | null;
}

interface InvoiceFormProps {
  onSubmit: (factura: Factura) => void;
  onCancel: () => void;
}

const estados = ["Pendiente", "Pagado", "Anulado"];
const condicionesVenta = [
  { codigo: "01", nombre: "Contado" },
  { codigo: "02", nombre: "Crédito" },
  { codigo: "03", nombre: "Consignación" },
  { codigo: "04", nombre: "Apartado" },
  { codigo: "05", nombre: "Arrendamiento con opción de compra" },
  { codigo: "06", nombre: "Arrendamiento en función financiera" },
  { codigo: "99", nombre: "Otros" },
];

export default function InvoiceForm({ onSubmit, onCancel }: InvoiceFormProps) {
  const { addNotification } = useNotifications(); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [detalle, setDetalle] = useState<DetalleFacturaFormData[]>([]);
  const [searchProducto, setSearchProducto] = useState("");
  const [descuentosCliente, setDescuentosCliente] = useState<DescuentoClienteProducto[]>([]);
  const [form, setForm] = useState<Partial<Factura>>({
    cliente_id: undefined,
    fecha_emision: new Date().toISOString().split("T")[0],
    estado: "Pendiente",
    condicion_venta: "01",
    plazo_credito: 0,
    medio_pago: "01",
    moneda: "CRC",
  });

  useEffect(() => {
    supabase.from("clientes").select("id, nombre").eq("status", true).then(({ data }) => setClientes(data ?? []));
    supabase.from("monedas").select("id, codigo, descripcion").eq("activo", true).then(({ data }) => setMonedas(data ?? []));
    supabase.from("productos").select("id, nombre, precio_venta, status").eq("status", true).then(({ data }) => setProductos(data ?? []));
    setMetodosPago([{ codigo: "01", nombre: "Efectivo" }, { codigo: "02", nombre: "Tarjeta" }, { codigo: "03", nombre: "Transferencia" }, { codigo: "04", nombre: "Cheque" }, { codigo: "05", nombre: "Recaudado por tercero" }]);
  }, []);

  useEffect(() => {
    if (form.cliente_id) {
      supabase.from("cliente_producto").select("*").eq("cliente_id", form.cliente_id).then(({ data }) => setDescuentosCliente(data ?? []));
    }
    setDetalle([]);
  }, [form.cliente_id]);

  const formatCurrency = (value: number) => value.toLocaleString("es-CR", { style: "currency", currency: "CRC" });

  const validarFactura = (): string | null => {
    if (!form.cliente_id) { return "Debe seleccionar un cliente."; }
    if (!detalle.length) return "Debe agregar al menos un producto a la factura.";
    for (const linea of detalle) { if (!linea.producto_id || linea.cantidad <= 0) { return "Todas las líneas deben tener un producto y una cantidad mayor a cero."; } }
    return null;
  };

  const addDetalle = () => {
    setDetalle([...detalle, { id_temporal: Date.now().toString(), producto_id: null, descripcion: "", cantidad: 1, precio_unitario: 0, impuesto: 13, subtotal: 0 }]);
  };

  const handleDetalleChange = (idx: number, field: keyof DetalleFacturaFormData, value: any) => {
    setDetalle((prev) =>
      prev.map((linea, i) => {
        if (i !== idx) return linea;
        const newLinea = { ...linea };
        if (field === "producto_id") {
          newLinea.producto_id = value ? Number(value) : null;
          const prod = productos.find((p) => p.id === newLinea.producto_id);
          const precioBase = prod?.precio_venta ?? 0;
          newLinea.descripcion = prod?.nombre ?? "";
          newLinea.precio_original = precioBase;
          const desc = descuentosCliente.find((d) => d.producto_id === newLinea.producto_id);
          if (desc) {
            if (desc.precio_fijo && desc.precio_fijo > 0) {
              newLinea.precio_unitario = desc.precio_fijo; newLinea.tipo_descuento = "precio_fijo";
            } else if (desc.descuento && desc.descuento > 0) {
              newLinea.precio_unitario = precioBase * (1 - desc.descuento / 100); newLinea.tipo_descuento = "descuento"; newLinea.valor_descuento = desc.descuento;
            } else {
              newLinea.precio_unitario = precioBase;
            }
          } else {
            newLinea.precio_unitario = precioBase;
          }
        } else { (newLinea as any)[field] = Number(value) || 0; }
        newLinea.subtotal = (newLinea.cantidad || 0) * (newLinea.precio_unitario || 0) * (1 + (newLinea.impuesto || 0) / 100);
        return newLinea;
      })
    );
  };

  const handleRemoveLinea = (idx: number) => { setDetalle((prev) => prev.filter((_, i) => i !== idx)); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { const { name, value } = e.target; setForm((prev) => ({ ...prev, [name]: name === "plazo_credito" ? Number(value) : value, })); };
  const total = detalle.reduce((sum, l) => sum + l.subtotal, 0);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const err = validarFactura();
  if (err) {
    addNotification({ type: 'error', title: 'Error de Validación', message: err });
    return;
  }

  setIsSubmitting(true);
  addNotification({ type: 'info', title: 'Procesando...', message: 'Guardando y preparando la factura.' });

  const nuevaFactura: Partial<Factura> = {
    cliente_id: Number(form.cliente_id!),
    fecha_emision: form.fecha_emision!,
    condicion_venta: form.condicion_venta!,
    plazo_credito: form.condicion_venta === "02" ? form.plazo_credito! : 0,
    medio_pago: form.medio_pago!,
    moneda: form.moneda!,
    total_factura: total,
    saldo_pendiente: total,
    estado: form.estado as any,
    detalle: JSON.stringify(detalle.map(({ id_temporal, tipo_descuento, valor_descuento, precio_original, precio_manual, ...rest }) => rest)),
  };

  try {
    const { data: insertedInvoice, error: insertError } = await supabase
      .from('facturas')
      .insert([nuevaFactura])
      .select(`*, cliente:clientes(id, nombre, identificacion, tipo_identificacion, email, correo_facturacion)`)
      .single();
    
    if (insertError) throw insertError;

    addNotification({ type: 'success', title: 'Factura Guardada', message: `Verificando datos para envío...` });

    const { data: emisorData, error: emisorError } = await supabase.from('configuracion_empresa').select('*').single();
    
    if (emisorError || !emisorData) {
      throw new Error("No se pudo cargar la configuración del emisor. Revisa la tabla 'configuracion_empresa' en Supabase.");
    }
    if (!emisorData.numero_identificacion || !emisorData.tipo_identificacion || !emisorData.codigo_actividad) {
      throw new Error("Datos del emisor incompletos en la tabla 'configuracion_empresa'. Asegúrate de que las columnas 'numero_identificacion', 'tipo_identificacion' y 'codigo_actividad' tengan datos.");
    }
    
    const payloadParaFuncion = {
        ...insertedInvoice,
        emisor: {
            nombre: emisorData.nombre,
            identificacion: { tipo: emisorData.tipo_identificacion, numero: emisorData.numero_identificacion },
            nombre_comercial: emisorData.nombre_comercial || emisorData.nombre,
            ubicacion_provincia: emisorData.provincia,
            ubicacion_canton: emisorData.canton,
            ubicacion_distrito: emisorData.distrito,
            ubicacion_otras_senas: emisorData.otras_senas,
            telefono: emisorData.telefono,
            correo: emisorData.email,
            codigo_actividad: emisorData.codigo_actividad
        },
        receptor: {
            nombre: insertedInvoice.cliente.nombre,
            identificacion_tipo: insertedInvoice.cliente.tipo_identificacion,
            identificacion_numero: insertedInvoice.cliente.identificacion,
            correo: insertedInvoice.cliente.correo_facturacion || insertedInvoice.cliente.email 
        }
    };
    
    addNotification({ type: 'info', title: 'Enviando a Hacienda...', message: 'La información parece correcta.' });
    const { data: functionResult, error: functionError } = await supabase.functions.invoke('enviar-factura', { body: payloadParaFuncion });

    if (functionError) {
      const errorDetail = functionError.context?.error?.message || functionError.message;
      throw new Error(`Error en la función de envío: ${errorDetail}`);
    }

    addNotification({ type: 'success', title: 'Envío Exitoso', message: functionResult.message });
    onSubmit(insertedInvoice);
    
  } catch (error: any) {
    console.error("Error en el proceso de creación/envío:", error);
    addNotification({ title: 'Error en el Proceso', message: error.message, type: 'error' });
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto max-h-[80vh] p-4" style={{ minWidth: "min(800px, 95vw)" }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="font-semibold block mb-1 text-sm">Cliente *</label>
          <select name="cliente_id" value={form.cliente_id ?? ""} onChange={handleChange} className="w-full border rounded px-2 py-2" required>
            <option value="">Seleccione cliente</option>
            {clientes.map((c) => (<option key={c.id} value={c.id}>{c.nombre}</option>))}
          </select>
        </div>
        <div><label className="font-semibold block mb-1 text-sm">Fecha de Emisión *</label><input type="date" name="fecha_emision" value={form.fecha_emision!} onChange={handleChange} className="w-full border rounded px-2 py-2" required /></div>
        <div><label className="font-semibold block mb-1 text-sm">Condición de Venta *</label><select name="condicion_venta" value={form.condicion_venta!} onChange={handleChange} className="w-full border rounded px-2 py-2" required>{condicionesVenta.map((cv) => <option key={cv.codigo} value={cv.codigo}>{cv.nombre}</option>)}</select></div>
        {form.condicion_venta === "02" && (<div><label className="font-semibold block mb-1 text-sm">Plazo Crédito (días) *</label><input type="number" name="plazo_credito" value={form.plazo_credito ?? 0} onChange={handleChange} className="w-full border rounded px-2 py-2" min={0} required /></div>)}
        <div><label className="font-semibold block mb-1 text-sm">Método de Pago *</label><select name="medio_pago" value={form.medio_pago!} onChange={handleChange} className="w-full border rounded px-2 py-2" required><option value="">Seleccione método</option>{metodosPago.map((m) => <option key={m.codigo} value={m.codigo}>{m.nombre}</option>)}</select></div>
        <div><label className="font-semibold block mb-1 text-sm">Moneda *</label><select name="moneda" value={form.moneda!} onChange={handleChange} className="w-full border rounded px-2 py-2" required><option value="">Seleccione moneda</option>{monedas.map((m) => <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>)}</select></div>
      </div>
      <div className="bg-slate-50 rounded-lg border px-4 py-3 mt-4">
        <h3 className="font-bold text-sky-700 mb-2">Detalle de Productos / Servicios *</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100"><tr><th className="font-semibold p-2 text-left w-2/5">Producto</th><th className="font-semibold p-2 text-center">Cant.</th><th className="font-semibold p-2 text-center">Precio U.</th><th className="font-semibold p-2 text-center">Imp. %</th><th className="font-semibold p-2 text-right">Subtotal</th><th className="w-10"></th></tr></thead>
            <tbody>
              {detalle.map((linea, idx) => (
                <tr key={linea.id_temporal || idx} className="border-b"><td className="p-2"><select className="w-full border rounded px-1 py-1" value={linea.producto_id ?? ""} onChange={(e) => handleDetalleChange(idx, "producto_id", e.target.value)} required><option value="">Seleccionar</option>{productos.map((p) => (<option key={p.id} value={p.id}>{p.nombre}</option>))}</select></td><td className="p-2"><input type="number" min={1} className="w-16 border rounded px-1 py-1 text-center" value={linea.cantidad} onChange={(e) => handleDetalleChange(idx, "cantidad", e.target.value)} /></td><td className="p-2"><input type="number" step="0.01" className="w-24 border rounded px-1 py-1 text-right" value={linea.precio_unitario} onChange={(e) => handleDetalleChange(idx, "precio_unitario", e.target.value)} /></td><td className="p-2"><input type="number" step="0.01" className="w-16 border rounded px-1 py-1 text-center" value={linea.impuesto} onChange={(e) => handleDetalleChange(idx, "impuesto", e.target.value)} /></td><td className="p-2 text-right font-mono">{formatCurrency(linea.subtotal)}</td><td><button type="button" onClick={() => handleRemoveLinea(idx)} className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"><Icon icon="lucide:trash-2" /></button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="mt-2 px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm" onClick={addDetalle}><Icon icon="lucide:plus-circle" className="inline mr-1" /> Agregar línea</button>
        <div className="flex justify-end mt-4 text-xl font-bold"><div className="w-64">Total: <span className="float-right">{formatCurrency(total)}</span></div></div>
      </div>
      
      <div className="flex justify-end mt-6 gap-3">
        {/* --- INICIO: CAMBIO DE ESTILO DEL BOTÓN CANCELAR --- */}
        <Button
            variant="bordered"
            onPress={onCancel}
            isDisabled={isSubmitting}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm disabled:opacity-50"
        >
            Cancelar
        </Button>
        {/* --- FIN: CAMBIO DE ESTILO --- */}
        <Button
            type="submit"
            color="primary"
            isDisabled={isSubmitting}
            isLoading={isSubmitting}
        >
            {isSubmitting ? "Procesando..." : "Guardar y Enviar"}
        </Button>
      </div>

    </form>
  );
}