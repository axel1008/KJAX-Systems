import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import type { VentaDetallada } from '../types';

// --- FUNCIÓN DE AYUDA MODIFICADA ---
// Se ha eliminado el prefijo '₡' para que solo devuelva el número.
const formatCurrencyForPDF = (value: number) => {
  if (isNaN(value)) return '0.00';
  const parts = value.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.'); // Antes retornaba: `₡${parts.join('.')}`
};

const styles = StyleSheet.create({
  page: { padding: '40px 30px', fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #0ea5e9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0c4a6e' },
  subHeader: { fontSize: 10, color: '#64748b' },
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '5px 8px' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', padding: '5px 8px' },
  colHeader: { fontWeight: 'bold', fontSize: 9, color: '#334155' },
  col: { color: '#475569', fontSize: 8 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', color: '#94a3b8', fontSize: 9 },
  summary: { marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', alignSelf: 'flex-end', width: '40%' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryLabel: { fontWeight: 'bold' },
  summaryTotal: { fontWeight: 'bold', fontSize: 12, color: '#0284c7' }
});

interface VentasPDFProps {
  data: VentaDetallada[];
  fechaInicio?: string;
  fechaFin?: string;
}

export const VentasPDF: React.FC<VentasPDFProps> = ({ data, fechaInicio, fechaFin }) => {
  const totalGeneral = data.reduce((sum, item) => sum + item.total_linea, 0);
  const fechaReporte = `Generado: ${new Date().toLocaleDateString('es-CR')}`;
  const rangoFechas = fechaInicio && fechaFin ? `Del ${fechaInicio} al ${fechaFin}` : 'Todas las fechas';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Reporte de Ventas por Producto</Text>
          <View style={{ textAlign: 'right' }}>
              <Text style={styles.subHeader}>{fechaReporte}</Text>
              <Text style={styles.subHeader}>{rangoFechas}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, {width: '15%'}]}>Fecha</Text>
            <Text style={[styles.colHeader, {width: '25%'}]}>Producto</Text>
            <Text style={[styles.colHeader, {width: '25%'}]}>Cliente</Text>
            <Text style={[styles.colHeader, {width: '10%', textAlign: 'center'}]}>Tipo</Text>
            <Text style={[styles.colHeader, {width: '10%', textAlign: 'right'}]}>Cant.</Text>
            <Text style={[styles.colHeader, {width: '15%', textAlign: 'right'}]}>Total</Text>
          </View>
          {data.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.col, {width: '15%'}]}>{item.fecha_compra}</Text>
              <Text style={[styles.col, {width: '25%'}]}>{item.producto_nombre}</Text>
              <Text style={[styles.col, {width: '25%'}]}>{item.cliente_nombre}</Text>
              <Text style={[styles.col, {width: '10%', textAlign: 'center'}]}>{item.tipo_compra}</Text>
              <Text style={[styles.col, {width: '10%', textAlign: 'right'}]}>{item.cantidad}</Text>
              <Text style={[styles.col, {width: '15%', textAlign: 'right'}]}>{formatCurrencyForPDF(item.total_linea)}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.summary}>
            <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Venta Total del Periodo:</Text>
                <Text style={styles.summaryTotal}>{formatCurrencyForPDF(totalGeneral)}</Text>
            </View>
        </View>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => (`Página ${pageNumber} de ${totalPages}`)} />
      </Page>
    </Document>
  );
};