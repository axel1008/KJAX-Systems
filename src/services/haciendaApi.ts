// src/services/haciendaApi.ts
const API = process.env.REACT_APP_API_URL;

export async function crearFactura(data: any) {
  const resp = await fetch(`${API}/api/facturas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!resp.ok) throw new Error(await resp.text());
  return resp.json();
}

export async function validarXML(xmlString: string) {
  const resp = await fetch(`${API}/validar-xml`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xmlString })
  });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error || 'Error validando XML');
  return json.valido;
}
