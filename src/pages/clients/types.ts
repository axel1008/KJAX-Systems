// types.ts
export interface Cliente {
  id: number;
  nombre: string;
  nombre_comercial: string | null; // Cambiado de nombre_fantasia a nombre_comercial
  email: string | null;
  telefono: string | null;
  status: boolean;
  tipo_identificacion: string | null;
  identificacion: string | null;
  provincia: string | null; // Podrías considerar eliminar estos si usas provincia_id
  canton: string | null;    // Podrías considerar eliminar estos si usas canton_id
  distrito: string | null;  // Podrías considerar eliminar estos si usas distrito_id
  barrio: string | null;
  direccion_exacta: string | null;
  correo_facturacion: string | null;
  requiere_electronica: boolean | null;
  limite_credito: number | null;
  dias_credito: number | null;
  metodo_pago_preferido: string | null;
  notas_internas: string | null;
  created_at: string;
  updated_at: string;
  pais: string | null;
  user_id_viejo: string | null;
  user_id: string | null;
  provincia_id: number | null;
  canton_id: number | null;
  distrito_id: number | null;
}