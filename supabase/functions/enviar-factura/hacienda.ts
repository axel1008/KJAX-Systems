// supabase/functions/enviar-factura/hacienda.ts

interface TokenResponse { access_token: string; }

export async function obtenerTokenHacienda(): Promise<string> {
  const clientId = Deno.env.get('HACIENDA_CLIENT_ID');
  const tokenUrl = Deno.env.get('HACIENDA_URL_TOKEN');

  if (!clientId || !tokenUrl) throw new Error('Faltan variables de entorno para la autenticación de Hacienda.');

  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');
  body.append('client_id', clientId);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body,
  });

  if (!response.ok) throw new Error(`Error al obtener token de Hacienda: ${response.status} ${await response.text()}`);

  const data: TokenResponse = await response.json();
  return data.access_token;
}

export async function enviarFacturaHacienda(xmlFirmado: string, clave: string, datosEmisor: any) {
  const recepcionUrl = Deno.env.get('HACIENDA_URL_RECEPCION');
  if (!recepcionUrl) throw new Error('URL de recepción de Hacienda no configurada.');

  const token = await obtenerTokenHacienda();
  const fechaEmision = new Date().toISOString();
  
  const payload = {
    clave: clave,
    fecha: fechaEmision,
    emisor: {
      tipoIdentificacion: datosEmisor.identificacion.tipo,
      numeroIdentificacion: datosEmisor.identificacion.numero,
    },
    comprobanteXml: btoa(unescape(encodeURIComponent(xmlFirmado))),
  };

  const response = await fetch(recepcionUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    statusText: response.statusText,
    errorCause: response.headers.get('x-error-cause')
  };
}