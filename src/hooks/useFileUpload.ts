import { useState } from 'react';
import { supabase } from '../supabaseClient';

export const useFileUpload = () => {
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File, facturaId: string) => {
    setUploading(true);
    const fileName = `${facturaId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('facturas_proveedor')
      .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (uploadError) throw uploadError;

    const { error: dbError } = await supabase.from('factura_archivos').insert({
      factura_id: facturaId,
      file_name: file.name,
      file_path: fileName,
      file_size: file.size,
      mime_type: file.type,
    });

    if (dbError) throw dbError;
    setUploading(false);
    return fileName;
  };

  return { upload, uploading };
};