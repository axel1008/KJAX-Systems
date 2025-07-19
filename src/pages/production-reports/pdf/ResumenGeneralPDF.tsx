// src/pages/production-reports/pdf/ResumenGeneralPDF.tsx
import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
import { styles, formatNumberForPDF } from './pdfStyles';
import { FacturaParaReporte } from '../types';

interface ResumenDetalladoPDFProps {
  invoices: FacturaParaReporte[];
  filterType: string;
}

export const ResumenGeneralPDF: React.FC<ResumenDetalladoPDFProps> = ({ invoices, filterType }) => {
  const totalGeneral = invoices.reduce((sum, invoice) => sum + invoice.total_factura, 0);

  // Función interna para obtener los nombres de los productos de una factura
  const getProductNames = (detalleJSON: string): string => {
    try {
      const detalles = JSON.parse(detalleJSON || '[]');
      if (Array.isArray(detalles) && detalles.length > 0) {
        return detalles.map(d => d.descripcion_item || d.descripcion || 'N/A').join(', ');
      }
      return 'Sin detalle';
    } catch (e) {
      return 'Error en detalle';
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page} orientation="landscape">
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Resumen General de Ventas</Text>
          <View style={{ textAlign: 'right' }}>
            <Text style={styles.subHeader}>Generado: {new Date().toLocaleDateString('es-CR')}</Text>
            <Text style={styles.subHeader}>Tipo de Factura: {filterType}</Text>
          </View>
        </View>

        {/* Tabla de Facturas */}
        <View style={styles.table}>
          {/* Encabezado de la tabla */}
          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, { width: '10%' }]}>Fecha</Text>
            <Text style={[styles.colHeader, { width: '18%' }]}>Cliente</Text>
            <Text style={[styles.colHeader, { width: '10%' }]}>Tipo</Text>
            <Text style={[styles.colHeader, { width: '42%' }]}>Productos</Text>
            <Text style={[styles.colHeader, { width: '20%', textAlign: 'right' }]}>Monto Factura</Text>
          </View>

          {/* Filas de la tabla */}
          {invoices.map((invoice) => (
            <View key={invoice.id} style={styles.tableRow}>
              <Text style={[styles.col, { width: '10%' }]}>{new Date(invoice.fecha_emision).toLocaleDateString('es-CR')}</Text>
              <Text style={[styles.col, { width: '18%' }]}>{invoice.clientes?.nombre || 'N/A'}</Text>
              <Text style={[styles.col, { width: '10%' }]}>{invoice.clave ? 'Electrónica' : 'Normal'}</Text>
              <Text style={[styles.col, { width: '42%', fontSize: 8 }]}>{getProductNames(invoice.detalle)}</Text>
              <Text style={[styles.col, { width: '20%', textAlign: 'right' }]}>{formatNumberForPDF(invoice.total_factura)}</Text>
            </View>
          ))}
        </View>

        {/* Total General */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total General de Ventas:</Text>
            <Text style={styles.summaryValue}>{formatNumberForPDF( totalGeneral)}</Text>
          </View>
        </View>
        
        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
};