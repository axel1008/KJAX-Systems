// RUTA: src/pages/accounts-payable/types.ts (ACTUALIZADO)

import { JSX } from "react";

export interface ProviderForSelect {
  id: number;
  nombre: string;
}

export interface CondicionPago {
  id: number;
  nombre: string;
  dias_credito?: number | null;
}

export interface Moneda {
  id: number;
  codigo: string;
  descripcion: string;
}

export interface OrdenCompraForSelect {
  id: number;
  descripcion_corta: string; 
}

// --- NUEVO TIPO AÑADIDO ---
export interface NotaDebito {
  id: number;
  motivo: string;
  total: number; // <-- Corregido
  fecha: string;
};
// -------------------------

export interface RawSupplierBill {
  id: string; 
  proveedor_id: number;
  orden_compra_id: number | null;
  numero_documento: string;
  tipo_documento: string; 
  fecha_emision: string; 
  fecha_vencimiento: string; 
  condiciones_pago_id: number | null;
  subtotal: number;
  impuestos: number;
  total: number;
  moneda_id: number | null;
  estado: string; 
  saldo_pendiente: number;
  descripcion: string | null;
  porcentaje_impuesto?: number | null;
  dias_credito_calculados?: number | null;
  providers: { nombre: string } | null;
  condiciones_pago?: { nombre?: string | null } | null; 
  monedas?: { codigo?: string | null } | null; 
}

export interface SupplierBill {
  id: string;
  proveedor_id: number;
  orden_compra_id: number | null;
  numero_documento: string;
  tipo_documento: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  condiciones_pago_id: number | null;
  subtotal: number;
  impuestos: number;
  total: number;
  moneda_id: number | null;
  estado: string;
  saldo_pendiente: number;
  descripcion: string | null;
  porcentaje_impuesto?: number | null;
  proveedor_nombre: string;
  condicion_pago_nombre?: string | null;
  moneda_codigo?: string | null;
  dias_vencimiento: number;
  dias_credito_calculados?: number | null;
}

export type ProcessedSupplierBill = SupplierBill & {
  total_formatted: string;
  saldo_pendiente_formatted: string;
  estado_badge: JSX.Element;
  proveedor_nombre_display: string;
};

export interface DetalleFacturaFormData {
  id_temporal: string; 
  detalle_id_original?: number;
  producto_id: number | null; 
  descripcion_item: string; 
  cantidad: number;
  precio_unitario: number;
  subtotal_linea: number;
  descripcion?: string;
  total_linea?: number;
  es_bonificacion: boolean;
}

export interface NewBillFormData {
  proveedor_id: number | null;
  orden_compra_id?: number | null;
  numero_documento: string;
  tipo_documento: 'Nota de Crédito' | 'Recibo' | 'Factura';
  fecha_emision: string;
  fecha_vencimiento: string;
  condiciones_pago_id?: number | null;
  subtotal: number;
  impuestos: number;
  total: number;
  moneda_id: number | null;
  estado: string;
  descripcion?: string | null;
  detalles: DetalleFacturaFormData[];
  porcentaje_impuesto: number;
  dias_credito_calculados?: number | null;
}

export interface PaymentFormData {
  factura_proveedor_id: string;
  proveedor_id: number;
  fecha_pago: string;
  monto_pagado: number;
  metodo_pago: string; 
  moneda_pago_id: number | null; 
  referencia_pago?: string | null;
  nota?: string | null;
}
