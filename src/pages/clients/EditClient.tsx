import { useState, useEffect, useRef } from "react";
import type { Cliente } from "./types";
import { toast } from "react-hot-toast";
import { Select, SelectItem } from "@heroui/react";
import { supabase } from "../../supabaseClient"; // Ajusta esta ruta según tu estructura

// Tipos para la división territorial
interface Provincia {
  id: number;
  codigo: string;
  nombre: string;
}

interface Canton {
  id: number;
  codigo: string;
  nombre: string;
  provincia_id: number;
}

interface Distrito {
  id: number;
  codigo: string;
  nombre: string;
  canton_id: number;
}

interface EditClientProps {
  isOpen: boolean;
  onClose: () => void;
  client: Cliente;
  onSaved: (updated: Cliente) => void;
}

export default function EditClient({
  isOpen,
  onClose,
  client,
  onSaved,
}: EditClientProps) {
  // --- Campos Básicos ---
  const [nombre, setNombre] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");
  const [status, setStatus] = useState<boolean>(true);

  // --- Campos Fiscales (ahora con IDs) ---
  const [tipoIdentificacion, setTipoIdentificacion] = useState<string>("");
  const [identificacion, setIdentificacion] = useState<string>("");
  const [correoFacturacion, setCorreoFacturacion] = useState<string>("");
  const [provinciaId, setProvinciaId] = useState<string>("");
  const [cantonId, setCantonId] = useState<string>("");
  const [distritoId, setDistritoId] = useState<string>("");
  const [direccionExacta, setDireccionExacta] = useState<string>("");

  // --- Campo de Notas ---
  const [notasInternas, setNotasInternas] = useState<string>("");

  // Estados para los datos de división territorial
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [cantones, setCantones] = useState<Canton[]>([]);
  const [distritos, setDistritos] = useState<Distrito[]>([]);
  const [loadingCantones, setLoadingCantones] = useState<boolean>(false);
  const [loadingDistritos, setLoadingDistritos] = useState<boolean>(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  // Función para obtener las provincias
  const fetchProvincias = async () => {
    try {
      const { data, error } = await supabase
        .from('provincias')
        .select('id, codigo, nombre')
        .order('codigo');
      
      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }
      
      setProvincias(data || []);
    } catch (error) {
      console.error('Error fetching provincias:', error);
      toast.error('Error al cargar provincias');
    }
  };

  // Función para obtener cantones por provincia
  const fetchCantones = async (provinciaIdNum: number) => {
    setLoadingCantones(true);
    try {
      const { data, error } = await supabase
        .from('cantones')
        .select('id, codigo, nombre, provincia_id')
        .eq('provincia_id', provinciaIdNum)
        .order('nombre');
      
      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }
      
      setCantones(data || []);
    } catch (error) {
      console.error('Error fetching cantones:', error);
      toast.error('Error al cargar cantones');
      setCantones([]);
    } finally {
      setLoadingCantones(false);
    }
  };

  // Función para obtener distritos por cantón
  const fetchDistritos = async (cantonIdNum: number) => {
    setLoadingDistritos(true);
    try {
      const { data, error } = await supabase
        .from('distritos')
        .select('id, codigo, nombre, canton_id')
        .eq('canton_id', cantonIdNum)
        .order('nombre');
      
      if (error) {
        console.error('Error from Supabase:', error);
        throw error;
      }
      
      setDistritos(data || []);
    } catch (error) {
      console.error('Error fetching distritos:', error);
      toast.error('Error al cargar distritos');
      setDistritos([]);
    } finally {
      setLoadingDistritos(false);
    }
  };

  // Cargar provincias al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchProvincias();
    }
  }, [isOpen]);

  // Efecto para manejar cambio de provincia
  useEffect(() => {
    if (provinciaId) {
      const provinciaIdNum = parseInt(provinciaId);
      fetchCantones(provinciaIdNum);
      // Solo limpiar cantón y distrito si no es la carga inicial
      if (cantones.length > 0) {
        setCantonId("");
        setDistritoId("");
        setDistritos([]);
      }
    } else {
      setCantones([]);
      setDistritos([]);
    }
  }, [provinciaId]);

  // Efecto para manejar cambio de cantón
  useEffect(() => {
    if (cantonId) {
      const cantonIdNum = parseInt(cantonId);
      fetchDistritos(cantonIdNum);
      // Solo limpiar distrito si no es la carga inicial
      if (distritos.length > 0) {
        setDistritoId("");
      }
    } else {
      setDistritos([]);
    }
  }, [cantonId]);

  useEffect(() => {
    if (isOpen && client) {
      // Al abrir, se cargan todos los datos del cliente que se está editando
      setNombre(client.nombre);
      setEmail(client.email);
      setTelefono(client.telefono);
      setStatus(client.status);
      setTipoIdentificacion(client.tipo_identificacion ?? "");
      setIdentificacion(client.identificacion ?? "");
      setCorreoFacturacion(client.correo_facturacion ?? "");
      
      // Cargar IDs de división territorial
      setProvinciaId(client.provincia_id ? client.provincia_id.toString() : "");
      setCantonId(client.canton_id ? client.canton_id.toString() : "");
      setDistritoId(client.distrito_id ? client.distrito_id.toString() : "");
      
      setDireccionExacta(client.direccion_exacta ?? "");
      setNotasInternas(client.notas_internas ?? "");
      setErrorMsg(null);
      
      setTimeout(() => nombreRef.current?.focus(), 0);
    }
  }, [isOpen, client]);

  // Efecto especial para cargar cantones y distritos cuando se cargan los datos del cliente
  useEffect(() => {
    if (isOpen && client && client.provincia_id && provincias.length > 0) {
      fetchCantones(client.provincia_id);
    }
  }, [isOpen, client, provincias]);

  useEffect(() => {
    if (isOpen && client && client.canton_id && cantones.length > 0) {
      fetchDistritos(client.canton_id);
    }
  }, [isOpen, client, cantones]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // --- Validaciones ---
    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      const msg = "Nombre, Email y Teléfono son obligatorios.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      const msg = "Ingresa un correo electrónico válido.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    if (!/^\d+$/.test(telefono.trim())) {
      const msg = "El teléfono debe contener solo dígitos.";
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }
    
    // CAMBIO: Se determina si requiere factura electrónica basado en si se llenaron los campos
    const fiscalFieldsEntered = tipoIdentificacion || identificacion || correoFacturacion || provinciaId || cantonId || distritoId || direccionExacta;

    if (fiscalFieldsEntered) {
      if (!tipoIdentificacion) {
        const msg = "Selecciona un Tipo de Identificación.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if (!identificacion.trim()) {
        const msg = "Ingresa el número de identificación.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if (!correoFacturacion.trim() || !/^\S+@\S+\.\S+$/.test(correoFacturacion.trim())) {
        const msg = "Ingresa un correo válido de facturación.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if (!provinciaId.trim() || !cantonId.trim() || !direccionExacta.trim()) {
        const msg = "Completa Provincia, Cantón y Dirección Exacta.";
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
    }

    // --- Objeto actualizado ---
    const updatedCliente: Cliente = {
      ...client, // Mantenemos los datos originales como base (ID, created_at, etc.)
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      status: status,
      requiere_electronica: !!fiscalFieldsEntered,
      tipo_identificacion: fiscalFieldsEntered ? tipoIdentificacion : null,
      identificacion: fiscalFieldsEntered ? identificacion.trim() : null,
      correo_facturacion: fiscalFieldsEntered ? correoFacturacion.trim() : null,
      provincia_id: fiscalFieldsEntered && provinciaId ? parseInt(provinciaId) : null,
      canton_id: fiscalFieldsEntered && cantonId ? parseInt(cantonId) : null,
      distrito_id: fiscalFieldsEntered && distritoId ? parseInt(distritoId) : null,
      direccion_exacta: fiscalFieldsEntered ? direccionExacta.trim() : null,
      notas_internas: notasInternas.trim() || null,
    };

    onSaved(updatedCliente);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-semibold mb-4">Editar Cliente</h2>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-2 text-center">{errorMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* --- INFORMACIÓN DE CONTACTO --- */}
          <h3 className="text-md font-semibold border-b pb-2">Información de Contacto</h3>
          <div className="flex items-center space-x-2">
            <input
              id="status-edit"
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-300 rounded"
            />
            <label htmlFor="status-edit" className="text-sm text-gray-700">
              Cliente Activo
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Cliente/Empresa *</label>
            <input
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (solo dígitos) *</label>
              <input 
                type="text" 
                value={telefono} 
                onChange={(e) => setTelefono(e.target.value)} 
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none" 
              />
            </div>
          </div>

          {/* --- SECCIÓN FISCAL CON DROPDOWNS EN CASCADA --- */}
          <div className="space-y-4 pt-2">
            <h3 className="text-md font-semibold border-b pb-2">Datos Fiscales (Para Factura Electrónica)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Identificación</label>
                <Select
                  selectedKeys={tipoIdentificacion ? new Set([tipoIdentificacion]) : new Set()}
                  onSelectionChange={(keys) =>
                    setTipoIdentificacion(Array.from(keys)[0] as string || "")
                  }
                  className="w-full"
                  aria-label="Selecciona tipo de identificación"
                  placeholder="Selecciona tipo"
                >
                  {[
                    { key: "Cédula física", label: "Cédula Física" },
                    { key: "Dimex", label: "DIMEX" },
                    { key: "Cédula jurídica", label: "Cédula Jurídica" },
                  ].map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Identificación</label>
                <input 
                  type="text" 
                  value={identificacion} 
                  onChange={(e) => setIdentificacion(e.target.value)} 
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="Número de identificación"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo Facturación</label>
                <input 
                  type="email" 
                  value={correoFacturacion} 
                  onChange={(e) => setCorreoFacturacion(e.target.value)} 
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  placeholder="correo@empresa.com"
                />
              </div>
            </div>

            {/* DROPDOWNS EN CASCADA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
                <Select
                  selectedKeys={provinciaId ? new Set([provinciaId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selectedId = Array.from(keys)[0] as string || "";
                    setProvinciaId(selectedId);
                  }}
                  className="w-full"
                  aria-label="Selecciona provincia"
                  placeholder="Selecciona provincia"
                >
                  {provincias.map((provincia) => (
                    <SelectItem key={provincia.id.toString()} value={provincia.id.toString()}>
                      {provincia.nombre}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantón</label>
                <Select
                  selectedKeys={cantonId ? new Set([cantonId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selectedId = Array.from(keys)[0] as string || "";
                    setCantonId(selectedId);
                  }}
                  className="w-full"
                  aria-label="Selecciona cantón"
                  placeholder={provinciaId ? (loadingCantones ? "Cargando..." : "Selecciona cantón") : "Selecciona provincia primero"}
                  isDisabled={!provinciaId || loadingCantones}
                >
                  {cantones.map((canton) => (
                    <SelectItem key={canton.id.toString()} value={canton.id.toString()}>
                      {canton.nombre}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distrito (opcional)</label>
                <Select
                  selectedKeys={distritoId ? new Set([distritoId]) : new Set()}
                  onSelectionChange={(keys) => {
                    const selectedId = Array.from(keys)[0] as string || "";
                    setDistritoId(selectedId);
                  }}
                  className="w-full"
                  aria-label="Selecciona distrito"
                  placeholder={cantonId ? (loadingDistritos ? "Cargando..." : distritos.length > 0 ? "Selecciona distrito" : "No hay distritos disponibles") : "Selecciona cantón primero"}
                  isDisabled={!cantonId || loadingDistritos}
                >
                  {distritos.map((distrito) => (
                    <SelectItem key={distrito.id.toString()} value={distrito.id.toString()}>
                      {distrito.nombre}
                    </SelectItem>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Exacta</label>
              <textarea 
                rows={2} 
                value={direccionExacta} 
                onChange={(e) => setDireccionExacta(e.target.value)} 
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Ejemplo: 200m norte de la iglesia católica"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas Internas (opcional)</label>
            <textarea 
              rows={3} 
              value={notasInternas} 
              onChange={(e) => setNotasInternas(e.target.value)} 
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Agrega comentarios internos sobre este cliente..."
            />
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}