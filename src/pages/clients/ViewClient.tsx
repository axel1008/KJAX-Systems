import { useState, useEffect } from "react";
import type { Cliente } from "./types";
import { supabase } from "../../supabaseClient";

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

interface ViewClientProps {
  isOpen: boolean;
  onClose: () => void;
  client: Cliente;
}

export default function ViewClient({
  isOpen,
  onClose,
  client,
}: ViewClientProps) {
  const [provinciaNombre, setProvinciaNombre] = useState<string | null>(null);
  const [cantonNombre, setCantonNombre] = useState<string | null>(null);
  const [distritoNombre, setDistritoNombre] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && client.requiere_electronica) {
      const fetchDivisionTerritorial = async () => {
        try {
          // Cargar nombre de la provincia
          if (client.provincia_id) {
            const { data: provinciaData } = await supabase
              .from("provincias")
              .select("nombre")
              .eq("id", client.provincia_id)
              .single();
            setProvinciaNombre(provinciaData?.nombre || "---");
          }

          // Cargar nombre del cantón
          if (client.canton_id) {
            const { data: cantonData } = await supabase
              .from("cantones")
              .select("nombre")
              .eq("id", client.canton_id)
              .single();
            setCantonNombre(cantonData?.nombre || "---");
          }

          // Cargar nombre del distrito
          if (client.distrito_id) {
            const { data: distritoData } = await supabase
              .from("distritos")
              .select("nombre")
              .eq("id", client.distrito_id)
              .single();
            setDistritoNombre(distritoData?.nombre || "---");
          }
        } catch (error) {
          console.error("Error fetching division territorial:", error);
          setProvinciaNombre("---");
          setCantonNombre("---");
          setDistritoNombre("---");
        }
      };

      fetchDivisionTerritorial();
    }
  }, [isOpen, client.requiere_electronica, client.provincia_id, client.canton_id, client.distrito_id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Ficha Completa del Cliente</h2>
          {/* Botón X eliminado */}
        </div>

        {/* Contenido de la ficha */}
        <div className="space-y-6">
          {/* Datos Básicos */}
          <div>
            <h3 className="text-md font-semibold border-b border-gray-200 pb-1 mb-2">
              Datos Básicos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ID Cliente:</p>
                <p className="text-gray-800 font-medium">
                  CL-{String(client.id).padStart(3, "0")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Nombre:</p>
                <p className="text-gray-800 font-medium">{client.nombre}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email:</p>
                <p className="text-gray-800 font-medium">{client.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono:</p>
                <p className="text-gray-800 font-medium">{client.telefono}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status:</p>
                {client.status ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    Activo
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Inactivo
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Creado En:</p>
                <p className="text-gray-800">
                  {new Date(client.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Actualizado En:</p>
                <p className="text-gray-800">
                  {new Date(client.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Datos Fiscales / Dirección */}
          <div>
            <h3 className="text-md font-semibold border-b border-gray-200 pb-1 mb-2">
              Datos Fiscales / Dirección
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Requiere Electrónica:</p>
                <p className="text-gray-800">
                  {client.requiere_electronica ? "Sí" : "No"}
                </p>
              </div>

              {client.requiere_electronica && (
                <>
                  <div>
                    <p className="text-sm text-gray-600">Tipo ID:</p>
                    <p className="text-gray-800">
                      {client.tipo_identificacion}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Identificación:</p>
                    <p className="text-gray-800">{client.identificacion}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Correo Facturación:</p>
                    <p className="text-gray-800">
                      {client.correo_facturacion}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Provincia:</p>
                    <p className="text-gray-800">{provinciaNombre || "---"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cantón:</p>
                    <p className="text-gray-800">{cantonNombre || "---"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Distrito:</p>
                    <p className="text-gray-800">{distritoNombre || "---"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Barrio:</p>
                    <p className="text-gray-800">{client.barrio ?? "---"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600">Dirección Exacta:</p>
                    <p className="text-gray-800">
                      {client.direccion_exacta}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notas Internas */}
          <div>
            <h3 className="text-md font-semibold border-b border-gray-200 pb-1 mb-2">
              Notas Internas
            </h3>
            <p className="text-gray-800">{client.notas_internas ?? "---"}</p>
          </div>
        </div>

        {/* Botón Cerrar */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}