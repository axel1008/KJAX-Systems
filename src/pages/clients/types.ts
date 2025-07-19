// src/pages/clients/types.ts

/**
 * Representa el objeto cliente completo, con los nuevos campos de “ficha”.
 */
export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  status: boolean;

  // — Campos adicionales de “ficha” —
  tipo_identificacion: string | null;
  identificacion: string | null;
  provincia: string | null;
  canton: string | null;
  distrito: string | null;
  barrio: string | null;
  direccion_exacta: string | null;
  correo_facturacion: string | null;
  requiere_electronica: boolean;
  limite_credito: number | null;
  dias_credito: number | null;
  metodo_pago_preferido: string | null;
  notas_internas: string | null;

  created_at: string;   // timestampz en ISO
  updated_at: string;   // timestampz en ISO
}
