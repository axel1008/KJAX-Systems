import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import type { Cliente } from "./types";
import { Select, SelectItem, Button } from "@heroui/react";
import { supabase } from "../../supabaseClient"; // Ajusta la ruta según tu configuración

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

interface CreateClientProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (
    nuevo: Omit<Cliente, "id" | "status" | "created_at" | "updated_at">
  ) => void;
}

export default function CreateClient({
  isOpen,
  onClose,
  onCreated,
}: CreateClientProps) {
  const [nombre, setNombre] = useState<string>("");
  const [nombreComercial, setNombreComercial] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");

  const [tipoIdentificacion, setTipoIdentificacion] = useState<string>("");
  const [identificacion, setIdentificacion] = useState<string>("");
  const [correoFacturacion, setCorreoFacturacion] = useState<string>("");
  
  // Estados para división territorial (ahora con IDs)
  const [provinciaId, setProvinciaId] = useState<string>("");
  const [cantonId, setCantonId] = useState<string>("");
  const [distritoId, setDistritoId] = useState<string>("");
  const [direccionExacta, setDireccionExacta] = useState<string>("");

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
      // Limpiar cantón y distrito cuando cambia provincia
      setCantonId("");
      setDistritoId("");
      setDistritos([]);
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
      // Limpiar distrito cuando cambia cantón
      setDistritoId("");
    } else {
      setDistritos([]);
    }
  }, [cantonId]);

  useEffect(() => {
    if (isOpen) {
      setNombre("");
      setNombreComercial("");
      setEmail("");
      setTelefono("");
      setTipoIdentificacion("");
      setIdentificacion("");
      setCorreoFacturacion("");
      setProvinciaId("");
      setCantonId("");
      setDistritoId("");
      setDireccionExacta("");
      setNotasInternas("");
      setErrorMsg(null);
      
      // Limpiar arrays
      setCantones([]);
      setDistritos([]);
      
      setTimeout(() => nombreRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

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

    const fiscalFieldsEntered =
      tipoIdentificacion ||
      identificacion ||
      correoFacturacion ||
      provinciaId ||
      cantonId ||
      distritoId ||
      direccionExacta;

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

    const nuevoCliente = {
      nombre: nombre.trim(),
      nombre_comercial: nombreComercial.trim() || null, // Cambiado de nombre_fantasia a nombre_comercial
      email: email.trim(),
      telefono: telefono.trim(),
      tipo_identificacion: tipoIdentificacion || null,
      identificacion: identificacion.trim() || null,
      correo_facturacion: correoFacturacion.trim() || null,
      provincia_id: provinciaId ? parseInt(provinciaId) : null,
      canton_id: cantonId ? parseInt(cantonId) : null,
      distrito_id: distritoId ? parseInt(distritoId) : null,
      direccion_exacta: direccionExacta.trim() || null,
      requiere_electronica: !!fiscalFieldsEntered,
      notas_internas: notasInternas.trim() || null,
    };

    onCreated(nuevoCliente);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-semibold mb-4">Añadir Nuevo Cliente</h2>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-2 text-center">{errorMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-md font-semibold border-b pb-2">Información de Contacto</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nombre">
              Nombre Cliente/Empresa *
            </label>
            <input
              id="nombre"
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="nombreComercial">
              Nombre Comercial (Opcional)
            </label>
            <input
              id="nombreComercial"
              type="text"
              value={nombreComercial}
              onChange={(e) => setNombreComercial(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="email">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="telefono">
                Teléfono (solo dígitos) *
              </label>
              <input
                id="telefono"
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
          </div>

          <h3 className="text-md font-semibold border-b pb-2 pt-2">Datos Fiscales (Para Factura Electrónica)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="tipoIdentificacion">
                Tipo de Identificación
              </label>
              <Select
                id="tipoIdentificacion"
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
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="identificacion">
                Identificación
              </label>
              <input
                id="identificacion"
                type="text"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Número de identificación"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="correoFacturacion">
                Correo para Facturación
              </label>
              <input
                id="correoFacturacion"
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
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="provincia">
                Provincia
              </label>
              <Select
                id="provincia"
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
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="canton">
                Cantón
              </label>
              <Select
                id="canton"
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
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="distrito">
                Distrito (opcional)
              </label>
              <Select
                id="distrito"
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
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="direccionExacta">
                Dirección Exacta
              </label>
              <textarea
                id="direccionExacta"
                rows={2}
                value={direccionExacta}
                onChange={(e) => setDireccionExacta(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                placeholder="Ejemplo: 200m norte de la iglesia católica"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notasInternas">
              Notas Internas (opcional)
            </label>
            <textarea
              id="notasInternas"
              rows={3}
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Agrega comentarios internos sobre este cliente..."
            />
          </div>

          <div className="mt-6 flex justify-end space-x-2">
            <Button
              type="button"
              onPress={onClose}
              variant="light"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
              aria-label="Cancelar creación de cliente"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              color="primary"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
              aria-label="Guardar nuevo cliente"
            >
              Guardar Cliente
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}