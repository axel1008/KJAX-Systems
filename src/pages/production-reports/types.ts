// src/pages/production-reports/types.ts

export interface SummaryData {
  totalSales: number;
  totalDebt: number;
  totalInventoryValue: number;
  activeClients: number;
}

// Interfaz para los datos crudos de las facturas a clientes.
export interface ClientInvoiceForReport {
  id: string;
  consecutivo: string;
  total_factura: number;
  fecha_emision: string;
  estado: string;
  clientes: { nombre: string } | null;
  moneda: string; // Se ajusta para que sea un string, como en la tabla
  detalle: string;
  condicion_venta: string;
  clave: string | null;
}

// Interfaz para los datos crudos de las facturas de proveedores.
export interface SupplierBillForReport {
  numero_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  total: number;
  saldo_pendiente: number;
  estado: string;
  providers: { nombre: string } | null;
  monedas: { codigo: string } | null;
}

// Interfaz para el reporte procesado de ventas detalladas.
export interface VentaDetallada {
  fecha_compra: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  total_linea: number;
  cliente_nombre: string;
  tipo_compra: string;
}

// Interfaz para el reporte procesado de deudas detalladas.
export interface DeudaProveedorDetallada {
  proveedor_nombre: string;
  numero_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  total: number;
  saldo_pendiente: number;
  estado: string;
  moneda: string;
}

// Interfaz para el reporte procesado de inventario.
export interface InventarioData {
  nombre: string;
  categoria: string;
  stock: number;
  estado: string;
  precio_venta: number;
  precio_compra: number;
  providers: { nombre: string } | null;
  valor_total?: number;
  stock_minimo: number;
  stock_alert: number;
}

// Interfaz genérica para el PDF de resumen.
export interface FacturaParaReporte {
  id: string;
  total_factura: number;
  fecha_emision: string;
  clave: string | null;
  clientes: { nombre: string } | null;
  detalle: string;
  condicion_venta: string;
}
// src/pages/production-reports/types.ts

// ... (otras interfaces no cambian) ...

/**
 * Describe un descuento específico para un producto.
 */
export interface DescuentoProductoDetallado {
  producto_nombre: string;
  // --- CORRECCIÓN: Cambiados de string a number ---
  precio_base: number; 
  precio_final: number;
  // --- FIN CORRECCIÓN ---
  tipo_descuento: 'Porcentaje' | 'Precio Fijo';
  valor_formateado: string; // Se mantiene como string para mostrar "15%"
}

// ... (el resto del archivo no cambia) ...