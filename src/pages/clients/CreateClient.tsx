import { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import type { Cliente } from "./types";
// CAMBIO: Se añade 'Button' y se elimina la importación incorrecta
import { Select, SelectItem, Button } from "@heroui/react";

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
  // --- Campos básicos ---
  const [nombre, setNombre] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");

  // --- Campos fiscales y dirección ---
  const [tipoIdentificacion, setTipoIdentificacion] = useState<string>("");
  const [identificacion, setIdentificacion] = useState<string>("");
  const [correoFacturacion, setCorreoFacturacion] = useState<string>("");
  const [provincia, setProvincia] = useState<string>("");
  const [canton, setCanton] = useState<string>("");
  const [distrito, setDistrito] = useState<string>("");
  const [barrio, setBarrio] = useState<string>("");
  const [direccionExacta, setDireccionExacta] = useState<string>("");

  // --- Notas internas ---
  const [notasInternas, setNotasInternas] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Resetear todos los campos
      setNombre("");
      setEmail("");
      setTelefono("");
      setTipoIdentificacion("");
      setIdentificacion("");
      setCorreoFacturacion("");
      setProvincia("");
      setCanton("");
      setDistrito("");
      setBarrio("");
      setDireccionExacta("");
      setNotasInternas("");
      setErrorMsg(null);
      setTimeout(() => nombreRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // --- Validaciones básicas ---
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

    // --- Validaciones fiscales (si se ingresaron) ---
    const fiscalFieldsEntered = tipoIdentificacion || identificacion || correoFacturacion || provincia || canton || distrito || direccionExacta;
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
        if (!/^\S+@\S+\.\S+$/.test(correoFacturacion.trim())) {
            const msg = "Ingresa un correo válido de facturación.";
            setErrorMsg(msg);
            toast.error(msg);
            return;
        }
        if (!provincia.trim() || !canton.trim() || !distrito.trim() || !direccionExacta.trim()) {
            const msg = "Completa Provincia, Cantón, Distrito y Dirección Exacta.";
            setErrorMsg(msg);
            toast.error(msg);
            return;
        }
    }


    // --- Construcción del objeto para el backend ---
    const nuevoCliente = {
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      tipo_identificacion: tipoIdentificacion || null,
      identificacion: identificacion.trim() || null,
      correo_facturacion: correoFacturacion.trim() || null,
      provincia: provincia.trim() || null,
      canton: canton.trim() || null,
      distrito: distrito.trim() || null,
      barrio: barrio.trim() || null,
      direccion_exacta: direccionExacta.trim() || null,
      requiere_electronica: !!fiscalFieldsEntered, // Será true si se llenó algún campo fiscal
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
          {/* --- DATOS BÁSICOS --- */}
          <h3 className="text-md font-semibold border-b pb-2">Información de Contacto</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre Cliente/Empresa *
            </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Email *
                </label>
                <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono (solo dígitos) *
                </label>
                <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
            </div>
          </div>
          
          {/* --- DATOS FISCALES (Opcional) --- */}
          <h3 className="text-md font-semibold border-b pb-2 pt-2">Datos Fiscales (Para Factura Electrónica)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Identificación
                </label>
                <Select
                selectedKeys={tipoIdentificacion ? new Set([tipoIdentificacion]) : new Set()}
                onSelectionChange={(keys) =>
                    setTipoIdentificacion(Array.from(keys)[0] as string || "")
                }
                className="w-full"
                >
                {[
                    { key: "Cédula Física", label: "Cédula Física" },
                    { key: "DIMEX", label: "DIMEX" },
                    { key: "Cédula Jurídica", label: "Cédula Jurídica" },
                ].map((item) => (
                    <SelectItem key={item.key}>{item.label}</SelectItem>
                ))}
                </Select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Identificación
                </label>
                <input
                type="text"
                value={identificacion}
                onChange={(e) => setIdentificacion(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo para Facturación
                </label>
                <input
                type="email"
                value={correoFacturacion}
                onChange={(e) => setCorreoFacturacion(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Provincia
              </label>
              <input
                type="text"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cantón
              </label>
              <input
                type="text"
                value={canton}
                onChange={(e) => setCanton(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Distrito
              </label>
              <input
                type="text"
                value={distrito}
                onChange={(e) => setDistrito(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección Exacta
              </label>
              <textarea
                rows={2}
                value={direccionExacta}
                onChange={(e) => setDireccionExacta(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
            </div>
          </div>
          

          {/* Notas internas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Internas (opcional)
            </label>
            <textarea
              rows={3}
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Agrega comentarios internos sobre este cliente..."
            />
          </div>

          {/* CAMBIO: Se reemplazan los botones nativos por los de HeroUI */}
          <div className="mt-6 flex justify-end space-x-2">
            <Button
              type="button"
              onPress={onClose}
              variant="light"
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-gray-700 text-sm"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              color="primary"
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
            >
              Guardar Cliente
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}