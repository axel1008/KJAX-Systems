import { supabase } from '../supabaseClient';

export const downloadFile = async (filePath: string, originalName: string) => {
  const { data, error } = await supabase.storage
    .from('facturas_proveedor')
    .download(filePath);

  if (error) throw error;

  // Crear blob y descargar
  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = originalName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};