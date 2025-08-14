import React, { useState, useEffect, useRef } from "react";
import type { Proveedor } from "./types";

interface EditarProveedorProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor: Proveedor;
  onSaved: (actualizado: Proveedor) => void;
}

export default function EditarProveedor({
  isOpen,
  onClose,
  proveedor,
  onSaved,
}: EditarProveedorProps) {
  const [nombre, setNombre] = useState(proveedor.nombre);
  const [contacto, setContacto] = useState(proveedor.contacto);
  const [correo, setCorreo] = useState(proveedor.correo);
  const [telefono, setTelefono] = useState(proveedor.telefono);
  // const [categoria, setCategoria] = useState(proveedor.categoria); // Eliminado
  const [estado, setEstado] = useState(proveedor.estado);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const nombreRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNombre(proveedor.nombre);
      setContacto(proveedor.contacto);
      setCorreo(proveedor.correo);
      setTelefono(proveedor.telefono);
      // setCategoria(proveedor.categoria); // Eliminado
      setEstado(proveedor.estado);
      setErrorMsg(null);
      setTimeout(() => nombreRef.current?.focus(), 0);
    }
  }, [isOpen, proveedor]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !nombre.trim() ||
      !contacto.trim() ||
      !correo.trim() ||
      !telefono.trim()
      // !categoria.trim() // Eliminado
    ) {
      setErrorMsg("Todos los campos son obligatorios.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(correo)) {
      setErrorMsg("Por favor ingresa un correo válido.");
      return;
    }

    onSaved({
      id: proveedor.id,
      nombre: nombre.trim(),
      contacto: contacto.trim(),
      correo: correo.trim(),
      telefono: telefono.trim(),
      // categoria: categoria.trim(), // Eliminado
      estado,
    });
    onClose(); // Agregado para cerrar el modal al guardar
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Editar Proveedor</h2>

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
            />
          </div>

          {/* Categoría - ELIMINADO */}
          {/* <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div> */}

          {/* Estado (Activo / Inactivo) */}
          <div className="flex items-center space-x-2">
            <input
              id="estado-edit"
              type="checkbox"
              checked={estado}
              onChange={(e) => setEstado(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-400 border-gray-300 rounded"
            />
            <label htmlFor="estado-edit" className="text-sm text-gray-700">
              Activo
            </label>
          </div>

          {/* Botones Cancelar / Guardar */}
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