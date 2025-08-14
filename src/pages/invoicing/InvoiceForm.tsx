import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { Factura, Cliente, Moneda, MetodoPago, Producto, DetalleFacturaFormData } from "./types";
import { useNotifications } from "../../Context/NotificationContext";
import { Icon } from "@iconify/react";
import { Button, Switch } from "@heroui/react";
import { Shield, CheckCircle, AlertTriangle, Package, FileText, Zap, User } from "lucide-react";

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
  provincia_id: number | null;
  canton_id: number | null;
  distrito_id: number | null;
  provincia_nombre: string | null;
  canton_nombre: string | null;
  distrito_nombre: string | null;
  direccion_exacta: string | null;
  prefiere_electronica?: boolean;
}

interface ProductoCompleto extends Producto {
  cabys_code?: string;
  categoria: string;
  unidad: string;
  impuesto?: number;
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
  const [usarFacturacionElectronica, setUsarFacturacionElectronica] = useState<boolean>(false);

  const [clientes, setClientes] = useState<ClienteCompleto[]>([]);
  const [monedas, setMonedas] = useState<Moneda[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [productos, setProductos] = useState<ProductoCompleto[]>([]);
  const [productosConCABYS, setProductosConCABYS] = useState<ProductoCompleto[]>([]);
  const [todosLosProductos, setTodosLosProductos] = useState<ProductoCompleto[]>([]);
  
  const [detalle, setDetalle] = useState<DetalleFacturaFormData[]>([]);
  const [descuentosCliente, setDescuentosCliente] = useState<DescuentoClienteProducto[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteCompleto | null>(null);
  
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
    const fetchData = async () => {
      const { data: clientsData, error: clientsError } = await supabase
        .from("clientes")
        .select(`
          id, nombre, tipo_identificacion, identificacion, email, status,
          provincia_id, canton_id, distrito_id,
          provincias!clientes_provincia_id_fkey(nombre),
          cantones!clientes_canton_id_fkey(nombre),
          distritos!clientes_distrito_id_fkey(nombre)
        `)
        .eq("status", true)
        .order("nombre");

      if (clientsError) {
        console.error("Error fetching clientes:", clientsError);
        addNotification({ type: 'error', title: 'Error', message: 'No se pudieron cargar los clientes.' });
        return;
      }

      const clientesActivos = clientsData?.map(client => ({
        ...client,
        provincia_nombre: client.provincias?.nombre || null,
        canton_nombre: client.cantones?.nombre || null,
        distrito_nombre: client.distritos?.nombre || null,
      })) || [];
      setClientes(clientesActivos);

      const { data: monedasData } = await supabase.from("monedas").select("id, codigo, descripcion").eq("activo", true);
      setMonedas(monedasData ?? []);

      const { data: productsData } = await supabase
        .from("productos")
        .select("id, nombre, precio_venta, status, cabys_code, categoria, unidad, stock");

      const productosActivos = productsData || [];

      const productosConImpuestos = await Promise.all(productosActivos.map(async (p) => {
        if (p.cabys_code) {
          const { data: cabysData } = await supabase
            .from('cabys_codes')
            .select('impuesto_iva')
            .eq('codigo', p.cabys_code)
            .single();
          return { ...p, impuesto: cabysData?.impuesto_iva ?? 13 };
        }
        return { ...p, impuesto: 13 };
      }));

      const conCABYS = productosConImpuestos.filter(p => p.cabys_code && p.cabys_code.length === 13);
      setProductosConCABYS(conCABYS);
      setTodosLosProductos(productosConImpuestos);
      setProductos(productosConImpuestos);

      setMetodosPago([
        { codigo: "01", nombre: "Efectivo" }, 
        { codigo: "02", nombre: "Tarjeta" }, 
        { codigo: "03", nombre: "Transferencia" }, 
        { codigo: "04", nombre: "Cheque" }, 
        { codigo: "05", nombre: "Recaudado por tercero" }
      ]);
    };

    fetchData();
  }, [addNotification]);

  useEffect(() => {
    if (usarFacturacionElectronica) {
      setProductos(productosConCABYS);
      setDetalle(prev => prev.filter(d => {
        if (!d.producto_id) return true;
        const producto = productosConCABYS.find(p => p.id === d.producto_id);
        return !!(producto && producto.cabys_code);
      }));
    } else {
      setProductos(todosLosProductos);
    }
  }, [usarFacturacionElectronica, productosConCABYS, todosLosProductos]);

  useEffect(() => {
    if (form.cliente_id) {
      supabase.from("cliente_producto").select("*").eq("cliente_id", form.cliente_id).then(({ data }) => setDescuentosCliente(data ?? []));
      const cliente = clientes.find(c => c.id === form.cliente_id);
      setClienteSeleccionado(cliente || null);
    }
    setDetalle([]);
  }, [form.cliente_id, clientes]);

  const formatCurrency = (value: number) => value.toLocaleString("es-CR", { style: "currency", currency: "CRC" });

  const validarFactura = (): string | null => {
    if (!form.cliente_id) return "Debe seleccionar un cliente.";
    const clienteActual = clientes.find(c => c.id === Number(form.cliente_id));
    if (!clienteActual) return "Error: No se pudo encontrar el cliente seleccionado.";

    if (usarFacturacionElectronica) {
      const camposFaltantes: string[] = [];
      if (!clienteActual.tipo_identificacion) camposFaltantes.push("tipo de identificación");
      if (!clienteActual.identificacion) camposFaltantes.push("número de identificación");
      if (!clienteActual.email) camposFaltantes.push("email");
      if (!clienteActual.provincia_nombre) camposFaltantes.push("provincia");
      if (!clienteActual.canton_nombre) camposFaltantes.push("cantón");
      if (clienteActual.distrito_nombre === undefined) camposFaltantes.push("distrito");
      if (camposFaltantes.length > 0) {
        return `Para facturación electrónica faltan datos del cliente: ${camposFaltantes.join(", ")}. Por favor, complete estos datos en el módulo de clientes o seleccione otro cliente.`;
      }
    }

    if (!detalle.length) return "Debe agregar al menos un producto a la factura.";
    for (const linea of detalle) {
      if (!linea.producto_id || linea.cantidad <= 0) return "Todas las líneas deben tener un producto y una cantidad mayor a cero.";
      if (usarFacturacionElectronica) {
        const producto = productos.find(p => p.id === linea.producto_id);
        if (!producto || !producto.cabys_code) {
          return `Para facturación electrónica el producto "${producto?.nombre || 'seleccionado'}" debe tener código CABYS asignado.`;
        }
      }
    }
    return null;
  };

  const validarStock = (): string | null => {
    for (const linea of detalle) {
      const prod = productos.find(p => p.id === linea.producto_id);
      if (prod && prod.stock !== null && prod.stock < linea.cantidad) {
        return `Stock insuficiente para ${prod.nombre}: disponible ${prod.stock}, solicitado ${linea.cantidad}`;
      }
    }
    return null;
  };

  const addDetalle = () => {
    setDetalle([...detalle, { 
      id_temporal: Date.now().toString(), 
      producto_id: null, 
      descripcion_item: "", 
      cantidad: 1, 
      precio_unitario: 0, 
      impuesto: 13, 
      subtotal_linea: 0 
    }]);
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
          newLinea.descripcion_item = prod?.nombre ?? "";
          newLinea.precio_original = precioBase;

          const desc = descuentosCliente.find((d) => d.producto_id === newLinea.producto_id);
          if (desc) {
            if (desc.precio_fijo && desc.precio_fijo > 0) {
              newLinea.precio_unitario = desc.precio_fijo;
              newLinea.tipo_descuento = "precio_fijo";
            } else if (desc.descuento && desc.descuento > 0) {
              newLinea.precio_unitario = precioBase * (1 - desc.descuento / 100);
              newLinea.tipo_descuento = "descuento";
              newLinea.valor_descuento = desc.descuento;
            } else {
              newLinea.precio_unitario = precioBase;
            }
          } else {
            newLinea.precio_unitario = precioBase;
          }

          newLinea.impuesto = prod?.impuesto ?? 13;
        } else {
          (newLinea as any)[field] = Number(value) || 0;
        }

        newLinea.subtotal_linea = (newLinea.cantidad || 0) * (newLinea.precio_unitario || 0) * (1 + (newLinea.impuesto || 0) / 100);
        return newLinea;
      })
    );
  };

  const handleRemoveLinea = (idx: number) => { 
    setDetalle((prev) => prev.filter((_, i) => i !== idx)); 
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { 
    const { name, value } = e.target; 
    setForm((prev) => ({ 
      ...prev, 
      [name]: name === "plazo_credito" ? Number(value) : value, 
    })); 
  };
  
  const total = detalle.reduce((sum, l) => sum + l.subtotal_linea, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validarFactura() || validarStock();
    if (err) {
      addNotification({ type: 'error', title: 'Error de Validación', message: err });
      return;
    }

    setIsSubmitting(true);
    const tipoFactura = usarFacturacionElectronica ? 'ELECTRONICA' : 'NORMAL';
    
    addNotification({ 
      type: 'info', 
      title: 'Procesando...', 
      message: `Creando factura ${tipoFactura.toLowerCase()}...` 
    });

    const productosState = usarFacturacionElectronica ? productosConCABYS : todosLosProductos;

    const detallesPreparados = detalle.map(d => {
      const producto = productosState.find(p => p.id === d.producto_id);
      const detalleBase = {
        producto_id: d.producto_id,
        descripcion_item: d.descripcion_item,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal_linea: d.subtotal_linea,
        impuesto: d.impuesto,
      };

      if (usarFacturacionElectronica) {
        return {
          ...detalleBase,
          cabys_code: producto?.cabys_code,
          unidad_medida: producto?.unidad || 'unidad',
          categoria: producto?.categoria
        };
      }
      
      return detalleBase;
    });

    const baseImponible = detalle.reduce((sum, l) => sum + (l.subtotal_linea / (1 + (l.impuesto || 0) / 100)), 0);
    const totalImpuesto = detalle.reduce((sum, l) => sum + (l.subtotal_linea - (l.subtotal_linea / (1 + (l.impuesto || 0) / 100))), 0);

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
      detalle: JSON.stringify(detallesPreparados),
      tipo_factura: tipoFactura,
      total_gravado: baseImponible,
      total_impuesto: totalImpuesto,
    };

    try {
      const { data: insertedInvoice, error: insertError } = await supabase
        .from('facturas')
        .insert([nuevaFactura])
        .select(`
          *, 
          cliente:clientes(
            id, nombre, identificacion, tipo_identificacion, 
            email, correo_facturacion, provincia_id, canton_id, 
            distrito_id, provincias!clientes_provincia_id_fkey(nombre), 
            cantones!clientes_canton_id_fkey(nombre), 
            distritos!clientes_distrito_id_fkey(nombre)
          )
        `)
        .single();

      if (insertError) throw insertError;

      // Actualizar inventario
      const updatePromises = detallesPreparados.map(async (d) => {
        const { data: productCheck, error: checkError } = await supabase
          .from('productos')
          .select('id, stock')
          .eq('id', d.producto_id)
          .single();
        if (checkError || !productCheck) return;

        const currentStock = productCheck.stock ?? 0;
        await supabase
          .from('productos')
          .update({ stock: currentStock - (d.cantidad ?? 0) })
          .eq('id', d.producto_id)
          .select('id, stock');
      });
      await Promise.all(updatePromises);

      // 🔔 Envío automático del recordatorio de EMISIÓN si es crédito y hay saldo
      try {
        const base = 'http://localhost:8080'; // ajusta si usas otra base
        const saldoPend = (insertedInvoice.saldo_pendiente ?? insertedInvoice.total_factura) || 0;
        if (insertedInvoice.condicion_venta === '02' && saldoPend > 0) {
          const resp = await fetch(`${base}/api/enviar_recordatorio.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ factura_id: insertedInvoice.id })
          });
          const json = await resp.json().catch(() => ({}));
          if (!resp.ok || !json.success) {
            console.warn('Recordatorio de emisión NO enviado:', json?.error || resp.status);
          } else {
            console.log('Recordatorio de emisión enviado OK');
          }
        }
      } catch (e) {
        console.error('Error llamando enviar_recordatorio.php', e);
      }

      if (usarFacturacionElectronica) {
        addNotification({ 
          type: 'info', 
          title: 'Enviando a Hacienda...', 
          message: 'Procesando factura electrónica según su elección...' 
        });

        const { data: emisorData, error: emisorError } = await supabase.from('configuracion_empresa').select('*').single();
        if (emisorError || !emisorData) throw new Error("No se pudo cargar la configuración del emisor.");

        const facturaParaHacienda = {
          factura: {
            id: insertedInvoice.id,
            consecutivo: insertedInvoice.consecutivo,
            clave: insertedInvoice.clave,
            fecha_emision: insertedInvoice.fecha_emision,
            fecha_vencimiento: insertedInvoice.fecha_vencimiento,
            condicion_venta: insertedInvoice.condicion_venta,
            metodo_pago: insertedInvoice.medio_pago,
            moneda: insertedInvoice.moneda,
            tipo_cambio: insertedInvoice.tipo_cambio || 1,
            subtotal: insertedInvoice.total_gravado,
            impuestos: insertedInvoice.total_impuesto,
            descuentos: insertedInvoice.total_descuento || 0,
            total: insertedInvoice.total_factura,
            observaciones: insertedInvoice.observaciones
          },
          emisor: emisorData,
          receptor: {
            nombre: insertedInvoice.cliente.nombre,
            identificacion: insertedInvoice.cliente.identificacion,
            tipo_identificacion: insertedInvoice.cliente.tipo_identificacion,
            provincia: insertedInvoice.cliente.provincias?.nombre || "",
            canton: insertedInvoice.cliente.cantones?.nombre || "",
            distrito: insertedInvoice.cliente.distritos?.nombre || "",
            direccion_exacta: insertedInvoice.cliente.direccion_exacta || "",
            telefono: insertedInvoice.cliente.telefono || "",
            correo: insertedInvoice.cliente.email,
          },
          detalles_con_cabys: detallesPreparados
        };

        const response = await fetch('http://localhost:8080/api/firmar.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(facturaParaHacienda)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Direct connection failed: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (result.success) {
          const { error: updateError } = await supabase
            .from('facturas')
            .update({
              clave: result.clave,
              estado_hacienda: result.estado_hacienda,
              xml_firmado: result.xml_firmado,
              fecha_envio_hacienda: new Date().toISOString(),
              mensaje_hacienda: result.mensaje_hacienda,
              xml: result.xml_firmado,
              respuesta_hacienda: JSON.stringify(result)
            })
            .eq('id', insertedInvoice.id);

          if (updateError) console.error("❌ Error actualizando factura:", updateError);

          addNotification({ 
            type: 'success', 
            title: 'Factura Electrónica Procesada', 
            message: `✅ Enviada exitosamente a Hacienda!\nClave: ${result.clave}\nEstado: ${result.estado_hacienda}`
          });
        } else {
          throw new Error(result.error || 'Error desconocido del backend');
        }
      } else {
        addNotification({ 
          type: 'success', 
          title: 'Factura Normal Creada', 
          message: 'Factura guardada correctamente. No se envía a Hacienda.'
        });
      }

      onSubmit(insertedInvoice);
    } catch (error: any) {
      console.error("Error en el proceso de creación/envío:", error);
      addNotification({ 
        title: 'Error en el Proceso', 
        message: error.message, 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientesDisponibles = clientes.length;
  const productosDisponibles = productos.length;
  const productosConCABYSCount = productosConCABYS.length;

  return (
    <div className="space-y-4 overflow-y-auto max-h-[80vh] p-4" style={{ minWidth: "min(800px, 95vw)" }}>
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              {usarFacturacionElectronica ? <Zap className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-gray-600" />}
              <span className="ml-2 font-semibold">
                Tipo de Factura: {usarFacturacionElectronica ? 'Electrónica' : 'Normal'}
              </span>
            </div>
            <Switch
              isSelected={usarFacturacionElectronica}
              onValueChange={setUsarFacturacionElectronica}
              color="primary"
              size="sm"
            />
          </div>
          <div className="text-sm text-gray-600">
            {usarFacturacionElectronica 
              ? 'Se enviará a Hacienda automáticamente' 
              : 'Solo para uso interno, no se envía a Hacienda'
            }
          </div>
        </div>
        {clienteSeleccionado && (
          <div className="mt-2 text-xs text-blue-700 flex items-center">
            <User className="h-3 w-3 mr-1" />
            Cliente seleccionado: {clienteSeleccionado.nombre}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center">
          <User className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm"><strong>Clientes disponibles:</strong> {clientesDisponibles}</span>
        </div>
        <div className="flex items-center">
          <Package className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm"><strong>Productos disponibles:</strong> {productosDisponibles}</span>
        </div>
        <div className="flex items-center">
          <Shield className="h-5 w-5 text-blue-600 mr-2" />
          <span className="text-sm"><strong>Con códigos CABYS:</strong> {productosConCABYSCount}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="font-semibold block mb-1 text-sm">Cliente *</label>
            <select 
              name="cliente_id" 
              value={form.cliente_id ?? ""} 
              onChange={handleChange} 
              className="w-full border rounded px-2 py-2" 
              required
            >
              <option value="">Seleccione cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} {c.tipo_identificacion && c.identificacion && ` (${c.tipo_identificacion}: ${c.identificacion})`}
                </option>
              ))}
            </select>
            {clienteSeleccionado && (
              <div className="mt-2 text-xs flex items-center">
                {usarFacturacionElectronica ? (
                  clienteSeleccionado.tipo_identificacion && 
                  clienteSeleccionado.identificacion && 
                  clienteSeleccionado.email &&
                  clienteSeleccionado.provincia_nombre &&
                  clienteSeleccionado.canton_nombre &&
                  clienteSeleccionado.distrito_nombre ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                      <span className="text-green-600">Listo para facturación electrónica ✓</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
                      <span className="text-yellow-600">Faltan datos fiscales para facturación electrónica</span>
                    </>
                  )
                ) : (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    <span className="text-green-600">Cliente seleccionado ✓</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          <div>
            <label className="font-semibold block mb-1 text-sm">Fecha de Emisión *</label>
            <input 
              type="date" 
              name="fecha_emision" 
              value={form.fecha_emision!} 
              onChange={handleChange} 
              className="w-full border rounded px-2 py-2" 
              required 
            />
          </div>
          
          <div>
            <label className="font-semibold block mb-1 text-sm">Condición de Venta *</label>
            <select 
              name="condicion_venta" 
              value={form.condicion_venta!} 
              onChange={handleChange} 
              className="w-full border rounded px-2 py-2" 
              required
            >
              {condicionesVenta.map((cv) => 
                <option key={cv.codigo} value={cv.codigo}>{cv.nombre}</option>
              )}
            </select>
          </div>
          
          {form.condicion_venta === "02" && (
            <div>
              <label className="font-semibold block mb-1 text-sm">Plazo Crédito (días) *</label>
              <input 
                type="number" 
                name="plazo_credito" 
                value={form.plazo_credito ?? 0} 
                onChange={handleChange} 
                className="w-full border rounded px-2 py-2" 
                min={0} 
                required 
              />
            </div>
          )}
          
          <div>
            <label className="font-semibold block mb-1 text-sm">Método de Pago *</label>
            <select 
              name="medio_pago" 
              value={form.medio_pago!} 
              onChange={handleChange} 
              className="w-full border rounded px-2 py-2" 
              required
            >
              <option value="">Seleccione método</option>
              {metodosPago.map((m) => 
                <option key={m.codigo} value={m.codigo}>{m.nombre}</option>
              )}
            </select>
          </div>
          
          <div>
            <label className="font-semibold block mb-1 text-sm">Moneda *</label>
            <select 
              name="moneda" 
              value={form.moneda!} 
              onChange={handleChange} 
              className="w-full border rounded px-2 py-2" 
              required
            >
              <option value="">Seleccione moneda</option>
              {monedas.map((m) => 
                <option key={m.codigo} value={m.codigo}>{m.descripcion}</option>
              )}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 rounded-lg border px-4 py-3 mt-4">
          <h3 className="font-bold text-sky-700 mb-2 flex items-center">
            {usarFacturacionElectronica ? <Shield className="h-5 w-5 mr-2" /> : <FileText className="h-5 w-5 mr-2" />}
            Detalle de Productos / Servicios *
            <span className="ml-2 text-sm font-normal">
              ({usarFacturacionElectronica ? 'Solo productos con CABYS' : 'Todos los productos'})
            </span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="font-semibold p-2 text-left w-2/5">Producto</th>
                  <th className="font-semibold p-2 text-center">Cant.</th>
                  <th className="font-semibold p-2 text-center">Precio U.</th>
                  <th className="font-semibold p-2 text-center">Imp. %</th>
                  <th className="font-semibold p-2 text-right">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {detalle.map((linea, idx) => {
                  const producto = productos.find(p => p.id === linea.producto_id);
                  return (
                    <tr key={linea.id_temporal || idx} className="border-b">
                      <td className="p-2">
                        <select 
                          className="w-full border rounded px-1 py-1" 
                          value={linea.producto_id ?? ""} 
                          onChange={(e) => handleDetalleChange(idx, "producto_id", e.target.value)} 
                          required
                        >
                          <option value="">Seleccionar</option>
                          {productos.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} 
                              {usarFacturacionElectronica && p.cabys_code && ` (${p.cabys_code})`}
                            </option>
                          ))}
                        </select>
                        {producto && (
                          <div className="text-xs mt-1 flex items-center">
                            {usarFacturacionElectronica && producto.cabys_code ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                                <span className="text-green-600">CABYS: {producto.cabys_code} ✓</span>
                              </>
                            ) : !usarFacturacionElectronica ? (
                              <>
                                <FileText className="h-3 w-3 mr-1 text-gray-600" />
                                <span className="text-gray-600">Factura normal</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3 mr-1 text-yellow-600" />
                                <span className="text-yellow-600">Sin código CABYS</span>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          min={1} 
                          className="w-16 border rounded px-1 py-1 text-center" 
                          value={linea.cantidad} 
                          onChange={(e) => handleDetalleChange(idx, "cantidad", e.target.value)} 
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01" 
                          className="w-24 border rounded px-1 py-1 text-right" 
                          value={linea.precio_unitario} 
                          onChange={(e) => handleDetalleChange(idx, "precio_unitario", e.target.value)} 
                        />
                      </td>
                      <td className="p-2">
                        <input 
                          type="number" 
                          step="0.01" 
                          className="w-16 border rounded px-1 py-1 text-center" 
                          value={linea.impuesto} 
                          onChange={(e) => handleDetalleChange(idx, "impuesto", e.target.value)} 
                        />
                      </td>
                      <td className="p-2 text-right font-mono">{formatCurrency(linea.subtotal_linea)}</td>
                      <td>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveLinea(idx)} 
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                        >
                          <Icon icon="lucide:trash-2" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <button 
            type="button" 
            className="mt-2 px-3 py-1 bg-sky-600 text-white rounded hover:bg-sky-700 text-sm" 
            onClick={addDetalle}
            disabled={productos.length === 0}
          >
            <Icon icon="lucide:plus-circle" className="inline mr-1" /> 
            Agregar línea
          </button>
          
          {productos.length === 0 && usarFacturacionElectronica && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              No hay productos con códigos CABYS válidos. Cambia a factura normal o agrega códigos CABYS a tus productos.
            </div>
          )}
          
          {productos.length === 0 && !usarFacturacionElectronica && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              No hay productos disponibles. Agrega productos al inventario primero.
            </div>
          )}
          
          <div className="flex justify-end mt-4 text-xl font-bold">
            <div className="w-64">
              Total: <span className="float-right">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end mt-6 gap-3">
          <Button
            variant="bordered"
            onPress={onCancel}
            isDisabled={isSubmitting}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm disabled:opacity-50"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            color="primary"
            isDisabled={isSubmitting || clientes.length === 0 || productos.length === 0}
            isLoading={isSubmitting}
          >
            {isSubmitting 
              ? "Procesando..." 
              : usarFacturacionElectronica
                ? "Guardar y Enviar a Hacienda"
                : "Guardar Factura Normal"
            }
          </Button>
        </div>
      </form>
    </div>
  );
}
