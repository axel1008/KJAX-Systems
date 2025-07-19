// RUTA: src/pages/invoicing/types.ts (Código completo y corregido)

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
  detalle: string; // Representa el JSON de los detalles
  created_at?: string;
  // Añadido para poder acceder a los datos del cliente en las funciones
  cliente?: Cliente;
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

// --- Tipos para Formularios y Datos Maestros ---

export interface Cliente {
  id: number;
  nombre: string;
  identificacion?: string;
  correo?: string;
  status?: boolean;
}

export interface Moneda {
  id: number;
  codigo: string;
  descripcion: string;
  activo?: boolean;
}

export interface MetodoPago {
  codigo: string;
  nombre: string;
}

export interface Producto {
  id: number;
  nombre: string;
  precio_venta: number;
  status?: boolean;
}

// --- INICIO DE LA CORRECCIÓN ---
/**
 * Representa una línea de detalle en los formularios de la UI.
 * Combina campos que se guardan en la base de datos con campos auxiliares para la lógica del formulario.
 */
export interface DetalleFacturaFormData {
  // --- Campos Principales (se mapean para guardar en la BD) ---
  producto_id: number | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  impuesto: number;
  subtotal: number; // Campo calculado en la UI, no se guarda directamente

  // --- Campos Auxiliares para la UI (NO se guardan en la BD) ---
  id_temporal?: string; // Para el 'key' en React, generado en el frontend
  detalle_id_original?: number; // Para identificar un detalle existente al editar
  tipo_descuento?: "precio_fijo" | "descuento" | null;
  valor_descuento?: number | null;
  precio_original?: number | null; // El precio base del producto antes de descuentos
  precio_manual?: boolean; // Flag si el precio fue modificado manualmente
}
// --- FIN DE LA CORRECCIÓN ---


/**
 * Representa los datos del formulario para registrar un pago.
 */
export interface PaymentFormData {
  factura_id: string;
  cliente_id: number;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string;
  moneda_id: number | null;
  referencia_pago?: string;
}// KodaXel Factura/src/pages/invoicing/types.ts

// ... (otros tipos)

//..export interface LineItemPayload {
  item_id: string;
  description?: string;
  quantity: number;
  price: number;
  tax_rate: number;
  descuento: number;
  bonificacion?: number; // <--- CAMBIO: Añadido campo para la cantidad bonificada
}///

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  discount: number;
  total_price: number;
  bonificacion?: number; // <--- CAMBIO: Añadido campo para la cantidad bonificada
}

// ... (el resto del archivo)