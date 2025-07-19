// src/components/ui/metric-card.tsx

import React from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  className?: string;
  titleSize?: string;
  valueSize?: string;
  cardHeight?: string;
  onClick?: () => void;
  children?: React.ReactNode; // <-- AÑADE ESTA LÍNEA
}

export const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  icon, 
  className = "", 
  titleSize = "text-sm", 
  valueSize = "text-3xl", 
  cardHeight = "min-h-[120px]",
  onClick,
  children, // <-- AÑADE `children` AQUÍ
}) => (
  <div 
    className={`bg-white/60 backdrop-blur-xl border border-sky-200/50 rounded-2xl shadow-xl p-5 w-full flex flex-col justify-between hover:bg-white/80 hover:shadow-sky-500/20 transition-all duration-300 text-slate-800 transform hover:-translate-y-1 ${cardHeight} ${className} ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div> {/* Envuelve la parte superior en un div para agruparla */}
      <div className="flex items-center justify-between mb-2">
        <h3 className={`${titleSize} font-medium text-slate-500`}>{title}</h3>
        {icon && <span className="text-sky-500 opacity-90">{icon}</span>}
      </div>
      <p className={`${valueSize} font-bold text-slate-700`}>{value}</p>
    </div>
    {/* Renderiza los botones o cualquier otro contenido aquí */}
    {children && <div className="mt-auto pt-2">{children}</div>}
  </div>
);