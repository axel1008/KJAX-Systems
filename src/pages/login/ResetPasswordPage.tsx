// VERSIÓN CORREGIDA: src/pages/login/ResetPasswordPage.tsx

import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';
import { useNavigate } from 'react-router-dom';

/**
 * Componente que muestra un formulario para que el usuario
 * ingrese y confirme su nueva contraseña después de hacer clic
 * en el enlace de recuperación. Ahora usa estilos de Tailwind CSS
 * consistentes con el resto del proyecto.
 */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  /**
   * Se ejecuta cuando el usuario envía el formulario.
   * Llama a Supabase para actualizar la contraseña del usuario.
   */
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Llama a la función de Supabase para actualizar el usuario.
    const { error } = await supabase.auth.updateUser({ password: password });

    setLoading(false);

    if (error) {
      setError(`Error al actualizar: ${error.message}`);
    } else {
      setMessage('¡Tu contraseña ha sido actualizada con éxito! Serás redirigido a la página de inicio de sesión.');
      // Espera 3 segundos para que el usuario lea el mensaje y luego lo redirige.
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 border border-slate-200">
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
          Restablecer Contraseña
        </h2>
        <p className="text-center text-slate-600 mb-6">
          Por favor, introduce tu nueva contraseña.
        </p>
        <form onSubmit={handlePasswordReset} className="space-y-6">
          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Nueva Contraseña
            </label>
            <input
              id="new-password"
              type="password"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Debe ser una contraseña segura"
              required
              disabled={loading || !!message} // Desactivar si está cargando o si ya hay un mensaje de éxito
            />
          </div>

          <button
            type="submit"
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50 transition-colors"
            disabled={loading || !password || !!message}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              'Guardar Nueva Contraseña'
            )}
          </button>

          {error && <p className="text-sm text-center text-red-500 pt-2">{error}</p>}
          {message && <p className="text-sm text-center text-green-500 pt-2">{message}</p>}
        </form>
      </div>
    </div>
  );
}