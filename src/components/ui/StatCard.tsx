// src/components/ui/StatCard.tsx
import React, { ReactNode } from 'react';
import { Button } from '@heroui/react'; // O tu librería de componentes
import { Icon } from '@iconify/react';

interface StatCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  bgColorClass: string; // Ej: 'bg-blue-100'
  iconColorClass: string; // Ej: 'text-blue-500'
  children?: ReactNode;
  exportButtons?: {
    onPdf?: () => void;
    onExcel?: () => void;
  };
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  description,
  bgColorClass,
  iconColorClass,
  children,
  exportButtons
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col h-full hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200/80">
      <div className="flex items-start gap-4 mb-4">
        <div className={`flex-shrink-0 p-3 rounded-xl ${bgColorClass}`}>
          <div className={iconColorClass}>{icon}</div>
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex-grow mt-2 flex flex-col justify-between">
        <div>{children}</div>
        {(exportButtons?.onPdf || exportButtons?.onExcel) && (
          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-200/60">
            {exportButtons.onPdf && (
              <Button size="sm" color="primary" variant="light" onPress={exportButtons.onPdf} startContent={<Icon icon="lucide:download-cloud"/>}>
                PDF
              </Button>
            )}
            {exportButtons.onExcel && (
              <Button size="sm" color="success" variant="light" onPress={exportButtons.onExcel} startContent={<Icon icon="lucide:file-spreadsheet"/>}>
                Excel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};