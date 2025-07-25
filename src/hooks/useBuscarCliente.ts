import { useState } from 'react';

interface ClienteEncontrado {
  encontrado: boolean;
  tipo: 'fisica' | 'juridica';
  cedula: string;
  cedula_numerica: string;
  nombre: string;
  tipo_identificacion: string;
  estado: string;
  fuente: string;
  error?: string;
}

export const useBuscarCliente = () => {
  const [buscando, setBuscando] = useState(false);
  const [resultado, setResultado] = useState<ClienteEncontrado | null>(null);
  const [error, setError] = useState<string>('');

  const buscarCliente = async (cedula: string): Promise<ClienteEncontrado | null> => {
    setBuscando(true);
    setError('');
    setResultado(null);
    
    try {
      const response = await fetch(
        `http://localhost:8080/api/buscar-cliente.php?cedula=${encodeURIComponent(cedula)}`
      );
      
      const data: ClienteEncontrado = await response.json();
      
      if (data.encontrado) {
        setResultado(data);
        return data;
      } else {
        setError(data.error || 'Cliente no encontrado en registros oficiales');
        return null;
      }
    } catch (err) {
      const errorMsg = 'Error conectando con servicios oficiales';
      setError(errorMsg);
      return null;
    } finally {
      setBuscando(false);
    }
  };

  const limpiarBusqueda = () => {
    setResultado(null);
    setError('');
    setBuscando(false);
  };

  return {
    buscarCliente,
    buscando,
    resultado,
    error,
    limpiarBusqueda
  };
};