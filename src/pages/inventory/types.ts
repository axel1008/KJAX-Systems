// src/pages/inventory/types.ts

export interface InventoryItem {
  id: number;
  nombre: string;
  categoria: string;
  stock: number;
  stock_minimo: number;
  stock_alert: number;
  stock_maximo: number;
  unidad: string;
  precio_compra: number;
  precio_venta: number | null;  

  // ← NUEVO: guardamos la FK numérica al proveedor
  proveedor_id: number | null;   

  // Conservar el campo “proveedor” para mostrar el nombre
  // (lo llenamos desde el JOIN al hacer la consulta en index.tsx)
  proveedor: string | null;     

  status: boolean;
  cabys_code?: string;
}
