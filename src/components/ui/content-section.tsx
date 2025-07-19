import React from "react";

interface ContentSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  titleClassName?: string;
}

export const ContentSection: React.FC<ContentSectionProps> = ({ 
  title, 
  children, 
  className = "", 
  headerClassName = "", 
  titleClassName = "" 
}) => (
  <div className={`bg-white/40 backdrop-blur-lg border border-sky-200/40 rounded-2xl shadow-lg p-6 text-slate-800 ${className}`}>
    {title && (
      <div className={`mb-6 ${headerClassName}`}>
        <h2 className={`text-xl font-semibold text-slate-700 ${titleClassName}`}>{title}</h2>
      </div>
    )}
    {children}
  </div>
);