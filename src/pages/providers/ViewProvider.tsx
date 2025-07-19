import React from "react";
import type { Proveedor } from "./types";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  Building2,
  User,
  Mail,
  Phone,
  Shapes,
  Power,
} from "lucide-react";

// Componente pequeño para mostrar cada detalle de forma consistente
const DetailRow: React.FC<{ icon: React.ReactNode; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
  <div>
    <div className="flex items-center text-sm text-slate-500 mb-1">
      {icon}
      <span className="ml-2">{label}</span>
    </div>
    <div className="pl-7 text-base font-semibold text-slate-700">{children}</div>
  </div>
);

interface VerProveedorProps {
  isOpen: boolean;
  onClose: () => void;
  proveedor: Proveedor;
}

export default function VerProveedor({
  isOpen,
  onClose,
  proveedor,
}: VerProveedorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleUp">
        {/* Encabezado del Modal */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Detalles del Proveedor</h2>
            <p className="text-sm text-slate-500">{proveedor.nombre}</p>
          </div>
          {/* Botón de cierre eliminado ya que se cuenta con botón en el pie */}
        </div>

        {/* Contenido con Detalles */}
        <div className="space-y-5">
          <DetailRow icon={<Building2 size={16} />} label="Nombre de la Empresa">
            {proveedor.nombre}
          </DetailRow>

          <DetailRow icon={<User size={16} />} label="Persona de Contacto">
            {proveedor.contacto}
          </DetailRow>
          
          <DetailRow icon={<Mail size={16} />} label="Correo Electrónico">
            {proveedor.correo}
          </DetailRow>

          <DetailRow icon={<Phone size={16} />} label="Teléfono">
            {proveedor.telefono}
          </DetailRow>

          <DetailRow icon={<Shapes size={16} />} label="Categoría">
            {proveedor.categoria}
          </DetailRow>

          <DetailRow icon={<Power size={16} />} label="Estado">
            <StatusBadge
              text={proveedor.estado ? "Activo" : "Inactivo"}
              type={proveedor.estado ? "active" : "inactive"}
            />
          </DetailRow>
        </div>

        {/* Pie del Modal */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-white text-sm font-semibold transition-colors shadow-sm hover:shadow-md"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
