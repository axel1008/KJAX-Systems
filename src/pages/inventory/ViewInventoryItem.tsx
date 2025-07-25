import React from "react";
import { InventoryItem } from "./types";
import { StatusBadge } from "../../components/ui/status-badge";
import {
  Hash,
  Shapes,
  Warehouse,
  Tag,
  Truck,
  AlertTriangle,
  PackageCheck,
  PackageX,
  PackagePlus,
  FileText,
  Shield,
} from "lucide-react";

const formatCRC = (value: number | null): string => {
  if (value === null || isNaN(value)) {
    return "N/A";
  }
  return new Intl.NumberFormat("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  }).format(value);
};

const DetailRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}> = ({ icon, label, children }) => (
  <div>
    <div className="flex items-center text-sm text-slate-500 mb-1">
      {icon}
      <span className="ml-2">{label}</span>
    </div>
    <div className="pl-7 text-base font-semibold text-slate-700">{children}</div>
  </div>
);

interface ViewInventoryItemProps {
  item: InventoryItem;
  onClose: () => void;
}

export default function ViewInventoryItem({
  item,
  onClose,
}: ViewInventoryItemProps): JSX.Element {
  const getStatusInfo = () => {
    let statusLabel = "En Stock";
    let statusType = "active";
    let StatusIcon = PackageCheck;

    if (!item.status) {
      statusLabel = "Inactivo";
      statusType = "inactive";
      StatusIcon = PackageX;
    } else if (item.stock <= item.stock_minimo) {
      statusLabel = "Agotado";
      statusType = "out-of-stock";
      StatusIcon = PackageX;
    } else if (item.stock <= item.stock_alert) {
      statusLabel = "Stock Bajo";
      statusType = "low-stock";
      StatusIcon = AlertTriangle;
    } else if (item.stock > item.stock_maximo) {
      statusLabel = "Sobre Stock";
      statusType = "over-stock";
      StatusIcon = PackagePlus;
    }

    return { statusLabel, statusType, StatusIcon };
  };

  const { statusLabel, statusType, StatusIcon } = getStatusInfo();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleUp">
        {/* Encabezado del Modal */}
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Detalles del Producto</h2>
          <p className="text-sm text-slate-500">{item.nombre}</p>
        </div>

        {/* Contenido con Detalles */}
        <div className="space-y-5">
          <DetailRow icon={<Hash size={16} />} label="Identificación">
            {`PROD-${String(item.id).padStart(3, "0")}`}
          </DetailRow>

          {/* NUEVO: Código CABYS */}
          <DetailRow icon={<Shield size={16} />} label="Código CABYS">
            <div className="space-y-1">
              <div className="font-mono text-blue-600">
                {item.cabys_code || "No asignado"}
              </div>
              {item.cabys_code && (
                <div className="text-xs text-slate-500 font-normal">
                  Código oficial para Hacienda
                </div>
              )}
            </div>
          </DetailRow>

          <DetailRow icon={<Shapes size={16} />} label="Categoría">
            {item.categoria ?? "N/A"}
          </DetailRow>

          <DetailRow icon={<Warehouse size={16} />} label="Existencias">
            <div className="space-y-1">
              <div>{`${item.stock} ${item.unidad || "unidades"}`}</div>
              <div className="text-xs text-slate-500 font-normal">
                Mín: {item.stock_minimo} | Máx: {item.stock_maximo}
              </div>
            </div>
          </DetailRow>

          <DetailRow icon={<Tag size={16} />} label="Precios">
            <div className="space-y-1">
              <div className="text-green-600">Venta: {formatCRC(item.precio_venta)}</div>
              <div className="text-xs text-slate-500 font-normal">
                Compra: {formatCRC(item.precio_compra)}
              </div>
            </div>
          </DetailRow>

          <DetailRow icon={<Truck size={16} />} label="Proveedor">
            {item.proveedor || "No asignado"}
          </DetailRow>

          <DetailRow icon={<StatusIcon size={16} />} label="Estado">
            <StatusBadge text={statusLabel} type={statusType} />
          </DetailRow>
        </div>

        {/* NUEVO: Sección de información adicional si hay código CABYS */}
        {item.cabys_code && (
          <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center text-blue-800 text-sm font-medium mb-2">
              <FileText size={14} className="mr-2" />
              Información para Facturación Electrónica
            </div>
            <div className="text-xs text-blue-700">
              Este producto cuenta con código CABYS oficial y cumple con los 
              requisitos de Hacienda para facturación electrónica.
            </div>
          </div>
        )}

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