// src/pages/clients/EditClient.tsx

import { useState, useEffect, useRef } from "react";
import type { Cliente } from "./types";

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
  // ─── Campos Básicos ─────────────────────────────────────────────
  const [nombre, setNombre] = useState<string>(client.nombre);
  const [email, setEmail] = useState<string>(client.email);
  const [telefono, setTelefono] = useState<string>(client.telefono);
  const [status, setStatus] = useState<boolean>(client.status);

  // ─── Campos “Datos Fiscales” (solo si requiere electrónica) ──────────
  const [requiereElectronica, setRequiereElectronica] = useState<boolean>(
    client.requiere_electronica
  );
  const [tipoIdentificacion, setTipoIdentificacion] = useState<string>(
    client.tipo_identificacion ?? ""
  );
  const [identificacion, setIdentificacion] = useState<string>(
    client.identificacion ?? ""
  );
  const [correoFacturacion, setCorreoFacturacion] = useState<string>(
    client.correo_facturacion ?? ""
  );
  const [provincia, setProvincia] = useState<string>(client.provincia ?? "");
  const [canton, setCanton] = useState<string>(client.canton ?? "");
  const [distrito, setDistrito] = useState<string>(client.distrito ?? "");
  const [barrio, setBarrio] = useState<string>(client.barrio ?? "");
  const [direccionExacta, setDireccionExacta] = useState<string>(
    client.direccion_exacta ?? ""
  );

  // ─── Campo “Notas Internas” ───────────────────────────────────────
  const [notasInternas, setNotasInternas] = useState<string>(
    client.notas_internas ?? ""
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Al abrir modal, recargamos todos los datos del cliente
      setNombre(client.nombre);
      setEmail(client.email);
      setTelefono(client.telefono);
      setStatus(client.status);

      setRequiereElectronica(client.requiere_electronica);
      setTipoIdentificacion(client.tipo_identificacion ?? "");
      setIdentificacion(client.identificacion ?? "");
      setCorreoFacturacion(client.correo_facturacion ?? "");
      setProvincia(client.provincia ?? "");
      setCanton(client.canton ?? "");
      setDistrito(client.distrito ?? "");
      setBarrio(client.barrio ?? "");
      setDireccionExacta(client.direccion_exacta ?? "");

      setNotasInternas(client.notas_internas ?? "");
      setErrorMsg(null);
      setTimeout(() => nombreRef.current?.focus(), 0);
    }
  }, [isOpen, client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // ─── Validaciones ───────────────────────────────────
    if (!nombre.trim() || !email.trim() || !telefono.trim()) {
      setErrorMsg("Nombre, Email y Teléfono son obligatorios.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMsg("Ingresa un correo válido.");
      return;
    }
    if (!/^\d+$/.test(telefono.trim())) {
      setErrorMsg("El teléfono debe contener solo dígitos.");
      return;
    }

    if (requiereElectronica) {
      if (!tipoIdentificacion.trim() || !identificacion.trim()) {
        setErrorMsg("Si requiere factura electrónica, ingresa Tipo ID e Identificación.");
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(correoFacturacion.trim())) {
        setErrorMsg("Ingresa un correo de facturación válido.");
        return;
      }
      if (!provincia.trim() || !canton.trim() || !distrito.trim() || !direccionExacta.trim()) {
        setErrorMsg("Completa la Dirección: Provincia, Cantón, Distrito y Dirección Exacta.");
        return;
      }
    }

    // ─── Armar objeto actualizado ──────────────────────────
    const updatedCliente: Cliente = {
      id: client.id,
      nombre: nombre.trim(),
      email: email.trim(),
      telefono: telefono.trim(),
      status: status,

      tipo_identificacion: requiereElectronica ? tipoIdentificacion.trim() : null,
      identificacion: requiereElectronica ? identificacion.trim() : null,
      correo_facturacion: requiereElectronica ? correoFacturacion.trim() : null,
      provincia: requiereElectronica ? provincia.trim() : null,
      canton: requiereElectronica ? canton.trim() : null,
      distrito: requiereElectronica ? distrito.trim() : null,
      barrio: requiereElectronica ? barrio.trim() : null,
      direccion_exacta: requiereElectronica ? direccionExacta.trim() : null,
      requiere_electronica: requiereElectronica,

      limite_credito: null,         // Eliminado
      dias_credito: null,           // Eliminado
      metodo_pago_preferido: null,  // Eliminado

      notas_internas: notasInternas.trim() || null,

      created_at: client.created_at,
      updated_at: client.updated_at,
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
          {/* Nombre Cliente/Empresa */}
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

          {/* Email */}
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

          {/* Teléfono */}
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

          {/* Status (Activo/Inactivo) */}
          <div className="flex items-center space-x-2">
            <input
              id="status-edit"
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-300 rounded"
            />
            <label htmlFor="status-edit" className="text-sm text-gray-700">
              Activo
            </label>
          </div>

          {/* Requiere Factura Electrónica */}
          <div className="flex items-center space-x-2">
            <input
              id="requiere-electronica-edit"
              type="checkbox"
              checked={requiereElectronica}
              onChange={(e) => setRequiereElectronica(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-300 rounded"
            />
            <label htmlFor="requiere-electronica-edit" className="text-sm text-gray-700">
              Requiere Factura Electrónica
            </label>
          </div>

          {/* Si marcó “requiere electrónica”, mostramos los campos fiscales */}
          {requiereElectronica && (
            <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
              <h3 className="text-md font-semibold border-b border-gray-200 pb-1 mb-2">
                Datos Fiscales / Dirección
              </h3>

              {/* Tipo & Número Identificación */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Identificación *
                  </label>
                  <input
                    type="text"
                    value={tipoIdentificacion}
                    onChange={(e) => setTipoIdentificacion(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Identificación *
                  </label>
                  <input
                    type="text"
                    value={identificacion}
                    onChange={(e) => setIdentificacion(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Correo Facturación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Facturación *
                </label>
                <input
                  type="email"
                  value={correoFacturacion}
                  onChange={(e) => setCorreoFacturacion(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>

              {/* Dirección geográfica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provincia *
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
                    Cantón *
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
                    Distrito *
                  </label>
                  <input
                    type="text"
                    value={distrito}
                    onChange={(e) => setDistrito(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barrio
                  </label>
                  <input
                    type="text"
                    value={barrio}
                    onChange={(e) => setBarrio(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dirección Exacta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Exacta *
                </label>
                <textarea
                  rows={2}
                  value={direccionExacta}
                  onChange={(e) => setDireccionExacta(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Notas Internas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas Internas (opcional)
            </label>
            <textarea
              rows={3}
              value={notasInternas}
              onChange={(e) => setNotasInternas(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Botones “Cancelar” / “Guardar Cambios” */}
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
