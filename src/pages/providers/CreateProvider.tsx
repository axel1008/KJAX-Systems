// src/pages/providers/CreateProvider.tsx

import React, { useState, useRef, useEffect } from "react";
import type { Proveedor } from "./types";

interface CrearProveedorProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (nuevo: Omit<Proveedor, "id" | "estado">) => void;
}

export default function CrearProveedor({
  isOpen,
  onClose,
  onCreated,
}: CrearProveedorProps) {
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [categoria, setCategoria] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNombre("");
      setContacto("");
      setCorreo("");
      setTelefono("");
      setCategoria("");
      setErrorMsg(null);
      setTimeout(() => nombreRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validaciones básicas
    if (
      !nombre.trim() ||
      !contacto.trim() ||
      !correo.trim() ||
      !telefono.trim() ||
      !categoria.trim()
    ) {
      setErrorMsg("Todos los campos son obligatorios.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      setErrorMsg("Por favor ingresa un correo válido.");
      return;
    }
    // Entregamos el nuevo proveedor sin 'id' ni 'estado' (porque el padre lo forzará)
    onCreated({
      nombre: nombre.trim(),
      contacto: contacto.trim(),
      correo: correo.trim(),
      telefono: telefono.trim(),
      categoria: categoria.trim(),
    });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Añadir Nuevo Proveedor</h2>

        {errorMsg && (
          <p className="text-red-500 text-sm mb-2 text-center">{errorMsg}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre
            </label>
            <input
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Nombre del proveedor..."
            />
          </div>

          {/* Contacto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contacto
            </label>
            <input
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="Persona de contacto..."
            />
          </div>

          {/* Correo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo
            </label>
            <input
              type="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="proveedor@ejemplo.com"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="(555) 123-4567"
            />
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
              placeholder="ej. Electrónica"
            />
          </div>

          {/* Botones */}
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
              Guardar Proveedor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
