// src/components/ui/ReportCard.tsx
import React from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Button } from '@heroui/react';
import { Icon } from '@iconify/react';

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
  iconBgColor?: string;
  // --- PROPIEDADES AÑADIDAS ---
  onExportExcel?: () => void;
  onExportPDF?: () => React.ReactElement; // Ahora espera un componente PDF para el link
}

export const ReportCard: React.FC<ReportCardProps> = ({ 
  icon, 
  title, 
  description, 
  children, 
  iconBgColor = 'bg-sky-100',
  onExportExcel,
  onExportPDF
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col h-full hover:shadow-xl transition-shadow duration-300 border border-slate-200/50">
      <div className="flex items-start gap-4 mb-4">
        <div className={`flex-shrink-0 p-3 rounded-xl ${iconBgColor}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex-grow mt-2 flex flex-col justify-between">
        <div>{children}</div>
        {/* --- LÓGICA DE BOTONES AÑADIDA --- */}
        {(onExportExcel || onExportPDF) && (
          <div className="flex justify-end gap-2 mt-4">
            {onExportPDF && (
              <PDFDownloadLink document={onExportPDF()} fileName={`${title.replace(/\s/g, '_').toLowerCase()}.pdf`}>
                {({ loading }) => (
                  <Button size="sm" color="primary" isLoading={loading} startContent={<Icon icon="lucide:download"/>}>
                    PDF
                  </Button>
                )}
              </PDFDownloadLink>
            )}
            {onExportExcel && (
              <Button size="sm" color="success" onPress={onExportExcel} startContent={<Icon icon="lucide:file-spreadsheet"/>}>
                Excel
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};