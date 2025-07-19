// RUTA: src/components/ui/status-badge.tsx (VERSIÓN FINAL ACTUALIZADA)

import React from "react";

interface StatusBadgeProps {
  text: string;
  type: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ text, type }) => {
  let colorClasses: string;

  // Normalizamos el tipo a minúsculas para que no haya problemas de mayúsculas/minúsculas
  const normalizedType = type.toLowerCase();

  switch (normalizedType) {
    // --- Colores Verdes ---
    case "active":
    case "in-stock":
    case "paid":
    case "pagada": // Añadido
    case "completado":
    case "en stock":
    case "entregado":
    case "insert":
      colorClasses = "bg-green-100 text-green-800 border border-green-200/80";
      break;

    // --- Colores Amarillos ---
    case "low-stock":
    case "pending":
    case "pendiente": // Añadido
    case "bajo stock":
    case "en preparación":
    case "update":
      colorClasses = "bg-yellow-100 text-yellow-800 border border-yellow-200/80";
      break;

    // --- Colores Rojos ---
    case "inactive":
    case "out-of-stock":
    case "overdue":
    case "vencida": // Añadido
    case "agotado":
    case "delete":
      colorClasses = "bg-red-100 text-red-700 border border-red-200/80";
      break;
      
    // --- Colores Azules ---
    case "parcial": // Añadido
    case "pan dulce":
    case "pan salado":
    case "ingredientes":
    case "empaques":
    case "electronics":
    case "office-supplies":
    case "shipping":
    case "packaging":
    case "software":
    case "furniture":
    case "harinas":
    case "lácteos":
    case "azúcares":
    case "chocolates":
    case "levaduras":
      colorClasses = "bg-sky-100 text-sky-700 border border-sky-200/80";
      break;

    // --- Colores Grises ---
    case "anulada": // Añadido
      colorClasses = "bg-slate-100 text-slate-600 border border-slate-200/80";
      break;
      
    // --- Color por defecto ---
    default:
      colorClasses = "bg-slate-100 text-slate-600 border border-slate-200/80";
  }
  
  return (
    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full inline-block whitespace-nowrap ${colorClasses}`}>
      {text}
    </span>
  );
};