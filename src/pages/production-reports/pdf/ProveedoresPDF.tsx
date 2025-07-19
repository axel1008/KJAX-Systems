// src/pages/production-reports/pdf/ProveedoresPDF.tsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import { DeudaProveedorDetallada } from '../types';

const formatCurrencyForPDF = (value: number) => {
  if (isNaN(value)) return '0.00';
  const parts = value.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

const styles = StyleSheet.create({
  page: { padding: '30px', fontFamily: 'Helvetica', fontSize: 9, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #0ea5e9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0c4a6e' },
  subHeader: { fontSize: 9, color: '#64748b' },
  table: { width: '100%', marginBottom: 15 },
  // --- CORRECCIÓN AQUÍ: Se usa fontWeight en lugar de fontStyle ---
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '5px', fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', padding: '4px 5px' },
  colHeader: { fontWeight: 'bold', fontSize: 9, color: '#334155' },
  col: { color: '#475569', fontSize: 8 },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', color: '#94a3b8', fontSize: 9 },
  summary: { marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', alignSelf: 'flex-end', width: '50%' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  summaryLabel: { fontWeight: 'bold', fontSize: 11 },
  summaryTotal: { fontWeight: 'bold', fontSize: 12, color: '#0284c7' },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#334155', marginTop: 15, marginBottom: 8, paddingBottom: 3, borderBottom: '1px solid #e2e8f0' }
});

export const ProveedoresPDF: React.FC<{ data: DeudaProveedorDetallada[] }> = ({ data }) => {
  const granTotal = data.reduce((sum, p) => sum + p.saldo_pendiente, 0);

  const groupedData = data.reduce((acc, bill) => {
    const key = bill.proveedor_nombre;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(bill);
    return acc;
  }, {} as Record<string, DeudaProveedorDetallada[]>);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Reporte Detallado de Deuda a Proveedores</Text>
          <Text style={styles.subHeader}>Generado: {new Date().toLocaleDateString('es-CR')}</Text>
        </View>

        {Object.entries(groupedData).map(([proveedor, facturas]) => (
          <View key={proveedor} wrap={false}>
            <Text style={styles.sectionTitle}>{proveedor}</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.colHeader, { width: '20%' }]}>N° Factura</Text>
                <Text style={[styles.colHeader, { width: '15%' }]}>F. Emisión</Text>
                <Text style={[styles.colHeader, { width: '15%' }]}>F. Vencim.</Text>
                <Text style={[styles.colHeader, { width: '15%', textAlign: 'center' }]}>Estado</Text>
                <Text style={[styles.colHeader, { width: '17.5%', textAlign: 'right' }]}>Total Factura</Text>
                <Text style={[styles.colHeader, { width: '17.5%', textAlign: 'right' }]}>Saldo Pendiente</Text>
              </View>
              {facturas.map((item, index) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.col, { width: '20%' }]}>{item.numero_documento}</Text>
                  <Text style={[styles.col, { width: '15%' }]}>{item.fecha_emision}</Text>
                  <Text style={[styles.col, { width: '15%' }]}>{item.fecha_vencimiento}</Text>
                  <Text style={[styles.col, { width: '15%', textAlign: 'center' }]}>{item.estado}</Text>
                  <Text style={[styles.col, { width: '17.5%', textAlign: 'right' }]}>{formatCurrencyForPDF(item.total)}</Text>
                  <Text style={[styles.col, { width: '17.5%', textAlign: 'right', fontWeight: 'bold' }]}>{formatCurrencyForPDF(item.saldo_pendiente)}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Deuda Total General:</Text>
              <Text style={styles.summaryTotal}>{formatCurrencyForPDF(granTotal)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
};