export interface ClienteProducto {
  id: number;
  cliente_id: number;
  producto_id: number;
  descuento: number;
  precio_fijo: number | null; // Modificado para aceptar null
  producto_nombre?: string; // Nombre del producto (opcional, se añade después)
  producto_precio_venta?: number | null; // Precio de venta del producto (opcional, se añade después)
}

export interface Producto {
  id: number;
  nombre: string;
  precio_venta: number | null;
  // Otros campos relevantes del producto si los tienes
}
