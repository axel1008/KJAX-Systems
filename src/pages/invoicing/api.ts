// src/pages/invoicing/api.ts

import { supabase } from "../../supabaseClient";
import type { Factura } from "./types";

/**
 * 📤 Crea una nueva factura en la base de datos.
 * Esta función es llamada por el formulario de nueva factura.
 */
export async function crearFactura(factura: Partial<Factura>): Promise<Factura> {
  const { data, error } = await supabase
    .from('facturas')
    .insert([factura])
    .select()
    .single(); // devuelve el objeto creado en lugar de un array

  if (error) {
    console.error("Error en API al crear factura:", error);
    throw new Error(error.message || "Error desconocido al crear la factura.");
  }

  return data as Factura;
}

/**
 * 🚀 Llama al endpoint del backend para firmar una factura.
 * @param invoice - El objeto completo de la factura.
 * @returns El XML firmado como texto plano.
 */
export async function testSignInvoice(invoice: Factura): Promise<string> {
  console.log('[Frontend] Enviando factura al backend para firma:', invoice);
  const apiKey = import.meta.env.VITE_BACKEND_API_KEY;

  if (!apiKey) {
    throw new Error("La API Key del backend no está configurada en el frontend.");
  }
  const response = await fetch('http://localhost:4000/api/factura/firmar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoice),
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const err = JSON.parse(text);
      throw new Error(err.error || 'Error al conectar con el backend.');
    } catch {
      throw new Error(text || 'Error desconocido del backend.');
    }
  }

  return await response.text();
}
