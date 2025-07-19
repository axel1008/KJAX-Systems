// src/types/supplier-bill.ts

export interface SupplierBill {
  id: number;
  id_proveedor: number;
  nombre_proveedor: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  total: number;
  estado: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
  numero_factura: string;
  moneda: 'CRC' | 'USD';
}

export interface RawSupplierBill {
  id: number;
  supplier: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  issue_date: string;
  due_date: string;
  total: number;
  currency: 'CRC' | 'USD';
  status: 'pendiente' | 'pagada' | 'vencida' | 'anulada';
  bill_number: string;
  notes: string | null;

  // --- PROPIEDADES AGREGADAS PARA CORREGIR ERRORES ---
  orden_compra_id: number | null;
  tipo_documento: string;
  condiciones_pago_id: number | null;
  subtotal: number;
  impuestos: number;
  descripcion: string | null; // Se permite null para que coincida con los formularios
}