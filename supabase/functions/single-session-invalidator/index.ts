// RUTA: supabase/functions/single-session-invalidator/index.ts (CORREGIDO)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Iniciando la función single-session-invalidator");

Deno.serve(async (req) => {
  // Manejar la petición pre-vuelo (preflight) de CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear un cliente de Supabase que puede actuar en nombre del usuario que invoca la función.
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // --- INICIO DE LA CORRECCIÓN ---
    // Forma más segura de obtener el usuario para evitar errores si el token no está listo.
    const { data, error: userError } = await supabaseClient.auth.getUser();

    // Si hubo un error o el token no corresponde a un usuario, lanzamos un error controlado.
    if (userError) {
      throw userError;
    }
    if (!data.user) {
      throw new Error('Usuario no autenticado. El token podría ser inválido o haber expirado.');
    }
    const { user } = data;
    // --- FIN DE LA CORRECCIÓN ---

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: updateError } = await supabaseAdmin
      .from('usuarios')
      .update({ min_token_issue_time: new Date().toISOString() })
      .eq('id', user.id); 

    if (updateError) {
      throw updateError;
    }

    console.log(`Sesiones invalidadas para el usuario: ${user.email}`);
    return new Response(JSON.stringify({ success: true, message: 'Sesiones anteriores invalidadas.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    console.error("Error en la Edge Function:", err);
    // Devolvemos el error en un formato JSON claro en lugar de un error genérico 500.
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 401, // Usamos 401 Unauthorized, que es más apropiado.
    });
  }
});