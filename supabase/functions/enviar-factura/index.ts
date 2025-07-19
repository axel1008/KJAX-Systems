// RUTA: supabase/functions/enviar-factura/index.ts (Vuelve a poner este código)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { generarFacturaXML } from './generarXML.ts'
import { firmarXML } from './firmarXML.ts'
import { enviarFacturaHacienda } from './hacienda.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const invoiceData = await req.json();

    if (typeof invoiceData.detalle === 'string') {
      try {
        invoiceData.detalle = JSON.parse(invoiceData.detalle);
      } catch (e) {
        throw new Error('El formato del detalle de la factura es inválido.');
      }
    }

    console.log("1. Iniciando generación de XML...");
    const { xml: xmlSinFirmar, clave } = generarFacturaXML(invoiceData);
    console.log(`XML generado para clave: ${clave}`);
    
    console.log("2. Iniciando firma de XML...");
    const xmlFirmado = firmarXML(xmlSinFirmar);
    console.log("XML firmado correctamente.");

    console.log("3. Enviando factura a Hacienda...");
    const respuestaHacienda = await enviarFacturaHacienda(xmlFirmado, clave, invoiceData.emisor);
    console.log("Respuesta de Hacienda recibida:", respuestaHacienda);

    if (respuestaHacienda.status === 202) {
      return new Response(
        JSON.stringify({ 
            success: true, 
            message: 'Factura enviada y aceptada para procesamiento por Hacienda.',
            clave: clave,
            status: respuestaHacienda.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    } else {
      throw new Error(`Hacienda rechazó la factura (status ${respuestaHacienda.status}): ${respuestaHacienda.errorCause || 'Sin detalles adicionales'}`);
    }
  } catch (error) {
    console.error('Error en el flujo de facturación (Edge Function):', error);
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})