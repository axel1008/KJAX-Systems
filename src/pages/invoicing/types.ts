// src/pages/invoicing/types.ts - Tipos completos actualizados

import { JSX } from "react";

/**
 * Representa una factura en la base de datos y en la lógica de la aplicación.
 */
export interface Factura {
  id: string;
  consecutivo?: string;
  clave?: string;
  cliente_id: number;
  cliente_nombre?: string; // Campo añadido en el procesamiento
  fecha_emision: string;
  fecha_vencimiento?: string;
  condicion_venta: string;
  plazo_credito?: number;
  medio_pago?: string;
  moneda: string;
  total_factura: number;
  total_impuesto?: number;
  saldo_pendiente?: number;
  estado: 'Pendiente' | 'Pagada' | 'Anulada' | 'Vencida' | 'Parcial';
  detalle: string; // JSON de detalles con códigos CABYS
  created_at?: string;
  updated_at?: string;
  // Relación con cliente (para funciones avanzadas)
  cliente?: ClienteCompleto;
  // Información adicional de procesamiento
  moneda_id?: number;
  moneda_codigo?: string;
}

/**
 * Representa la data cruda que viene de Supabase con la relación a clientes.
 */
export interface RawFactura extends Omit<Factura, 'cliente_nombre' | 'cliente'> {
  clientes: { nombre: string } | null;
}

/**
 * Factura procesada con campos adicionales para mostrar en la UI.
 */
export interface ProcessedInvoice extends Factura {
  total_formatted: string;
  saldo_pendiente_formatted: string;
  estado_badge: JSX.Element;
  cliente_nombre_display: string;
}

// --- Tipos para Clientes (mejorados) ---

export interface Cliente {
  id: number;
  nombre: string;
  email?: string;
  telefono?: string;
  status?: boolean;
}

/**
 * Cliente completo con todos los datos fiscales para facturación electrónica
 */
export interface ClienteCompleto extends Cliente {
  tipo_identificacion: string; // '01', '02', '03', '04'
  identificacion: string; // Número de cédula/identificación
  correo_facturacion: string; // Email obligatorio para facturación
  provincia: string;
  canton: string;
  distrito: string;
  barrio?: string;
  direccion_exacta: string;
  requiere_electronica: boolean; // Siempre true para facturación
  // Campos adicionales opcionales
  limite_credito?: number;
  dias_credito?: number;
  metodo_pago_preferido?: string;
  notas_internas?: string;
}

// --- Tipos para Productos (mejorados) ---

export interface Producto {
  id: number;
  nombre: string;
  precio_venta: number;
  status?: boolean;
}

/**
 * Producto completo con información para facturación electrónica
 */
export interface ProductoCompleto extends Producto {
  cabys_code: string; // Código CABYS obligatorio (13 dígitos)
  categoria: string; // Categoría del producto
  unidad: string; // Unidad de medida (kg, lt, unidad, etc.)
  precio_compra: number;
  stock: number;
  stock_minimo: number;
  stock_alert: number;
  stock_maximo: number;
  proveedor_id?: number;
  proveedor?: string;
  // Información adicional para Hacienda
  descripcion_cabys?: string; // Descripción oficial del código CABYS
  impuesto_iva?: boolean; // Si aplica IVA según CABYS
}

// --- Tipos para Monedas y Métodos de Pago ---

export interface Moneda {
  id: number;
  codigo: string; // CRC, USD, EUR
  descripcion: string;
  nombre?: string;
  activo?: boolean;
  tasa_cambio?: number;
}

export interface MetodoPago {
  codigo: string; // '01', '02', '03', '04', '05'
  nombre: string; // Efectivo, Tarjeta, Transferencia, etc.
}

// --- Tipos para Detalles de Factura (actualizados) ---

/**
 * Representa una línea de detalle completa con información para Hacienda
 */
export interface DetalleFacturaFormData {
  // --- Campos Principales (se guardan en la BD) ---
  producto_id: number | null;
  descripcion_item: string; // Nombre comercial del producto
  cantidad: number;
  precio_unitario: number;
  impuesto: number; // Porcentaje de impuesto
  subtotal_linea: number; // Campo calculado

  // --- Campos para Hacienda (se agregan al guardar) ---
  cabys_code?: string; // Código CABYS del producto
  unidad_medida?: string; // Unidad de medida oficial
  categoria?: string; // Categoría del producto
  descripcion_cabys?: string; // Descripción oficial CABYS

  // --- Campos Auxiliares para la UI (NO se guardan en la BD) ---
  id_temporal?: string; // Para el 'key' en React
  detalle_id_original?: number; // Para identificar un detalle existente
  tipo_descuento?: "precio_fijo" | "descuento" | null;
  valor_descuento?: number | null;
  precio_original?: number | null; // Precio base antes de descuentos
  precio_manual?: boolean; // Si el precio fue modificado manualmente
}

/**
 * Detalle simplificado que se guarda en la base de datos (JSON)
 */
export interface DetalleFacturaDB {
  producto_id: number | null;
  descripcion_item: string;
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  impuesto: number;
  // Información para Hacienda
  cabys_code: string;
  unidad_medida: string;
  categoria: string;
}

// --- Tipos para Pagos ---

/**
 * Representa los datos del formulario para registrar un pago.
 */
export interface PaymentFormData {
  factura_id: string;
  cliente_id: number;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string;
  moneda_pago_id?: number;
  moneda_id?: number; // Para compatibilidad
  referencia_pago?: string;
  notas?: string;
}

/**
 * Pago registrado en la base de datos
 */
export interface PagoCliente {
  id: number;
  factura_id: string;
  cliente_id: number;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string;
  moneda_id: number;
  referencia_pago?: string;
  notas?: string;
  created_at: string;
  // Relaciones
  monedas?: { codigo: string; nombre: string };
}

// --- Tipos para Configuración de Empresa ---

/**
 * Configuración completa del emisor para facturación electrónica
 */
export interface ConfiguracionEmpresa {
  id: number;
  nombre: string;
  nombre_comercial?: string;
  tipo_identificacion: string; // '01', '02', '03'
  numero_identificacion: string;
  provincia: string;
  canton: string;
  distrito: string;
  barrio?: string;
  otras_senas: string;
  telefono: string;
  email: string;
  codigo_actividad: string; // Código de actividad económica
  regimen_tributario?: string;
  // Configuraciones adicionales
  logo_url?: string;
  firma_digital?: string;
  certificado_hacienda?: string;
  pin_certificado?: string;
  // Configuraciones de facturación
  consecutivo_actual?: number;
  prefijo_factura?: string;
  // Metadata
  created_at?: string;
  updated_at?: string;
}

// --- Tipos para Descuentos y Precios Especiales ---

/**
 * Descuentos o precios fijos por cliente y producto
 */
export interface DescuentoClienteProducto {
  id: number;
  cliente_id: number;
  producto_id: number;
  descuento: number | null; // Porcentaje de descuento
  precio_fijo: number | null; // Precio fijo especial
  activo: boolean;
  fecha_inicio?: string;
  fecha_fin?: string;
  notas?: string;
  created_at?: string;
}

// --- Tipos para API y Funciones de Hacienda ---

/**
 * Payload completo para envío a Hacienda
 */
export interface FacturaHaciendaPayload {
  // Datos de la factura
  id: string;
  consecutivo?: string;
  cliente_id: number;
  fecha_emision: string;
  condicion_venta: string;
  plazo_credito?: number;
  medio_pago: string;
  moneda: string;
  total_factura: number;
  
  // Datos del emisor
  emisor: {
    nombre: string;
    identificacion: {
      tipo: string;
      numero: string;
    };
    nombre_comercial?: string;
    ubicacion_provincia: string;
    ubicacion_canton: string;
    ubicacion_distrito: string;
    ubicacion_otras_senas: string;
    telefono: string;
    correo: string;
    codigo_actividad: string;
  };
  
  // Datos del receptor
  receptor: {
    nombre: string;
    identificacion_tipo: string;
    identificacion_numero: string;
    correo: string;
    provincia?: string;
    canton?: string;
    distrito?: string;
    direccion_exacta?: string;
  };
  
  // Detalles con códigos CABYS
  detalles_con_cabys: DetalleFacturaDB[];
}

/**
 * Respuesta de la API de Hacienda
 */
export interface RespuestaHacienda {
  success: boolean;
  message: string;
  clave?: string;
  consecutivo?: string;
  xml_firmado?: string;
  error_code?: string;
  error_details?: any;
}

// --- Tipos para Auditoría ---

/**
 * Log de auditoría para cambios en facturas
 */
export interface AuditLog {
  id: number;
  user_id: string;
  user_email: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
}

// --- Tipos de Utilidad ---

/**
 * Opciones para filtros y búsquedas
 */
export interface FiltroOpcion {
  key: string;
  label: string;
  count?: number;
}

/**
 * Estadísticas del módulo de facturación
 */
export interface EstadisticasFacturacion {
  total_facturas: number;
  total_pendiente: number;
  total_pagado: number;
  total_anulado: number;
  promedio_diario: number;
  facturas_vencidas: number;
  clientes_activos: number;
  productos_facturados: number;
}

// --- Tipos para Estados y Validaciones ---

/**
 * Estados posibles de una factura
 */
export type EstadoFactura = 'Pendiente' | 'Pagada' | 'Anulada' | 'Vencida' | 'Parcial';

/**
 * Tipos de identificación válidos en Costa Rica
 */
export type TipoIdentificacion = '01' | '02' | '03' | '04';

/**
 * Condiciones de venta según Hacienda
 */
export type CondicionVenta = '01' | '02' | '03' | '04' | '05' | '06' | '99';

/**
 * Códigos de métodos de pago
 */
export type MetodoPagoCodigo = '01' | '02' | '03' | '04' | '05';

// --- Tipos para Componentes UI ---

/**
 * Props para componentes de formulario de factura
 */
export interface InvoiceFormProps {
  onSubmit: (factura: Factura) => void;
  onCancel: () => void;
  initialData?: Partial<Factura>;
  readonly?: boolean;
}

/**
 * Props para componentes de edición de factura
 */
export interface EditInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData: Factura;
  onUpdated: () => void;
}

/**
 * Props para modales de pago
 */
export interface PayInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Factura;
  onPaymentRegistered: () => void;
}

// --- Exports por defecto para compatibilidad ---

export default {
  Factura,
  ClienteCompleto,
  ProductoCompleto,
  DetalleFacturaFormData,
  ConfiguracionEmpresa,
  FacturaHaciendaPayload,
  RespuestaHacienda
};