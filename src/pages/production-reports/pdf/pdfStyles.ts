// src/pages/production-reports/pdf/pdfStyles.ts
import { StyleSheet } from '@react-pdf/renderer';

export const formatNumberForPDF = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '0.00';
  const parts = value.toFixed(2).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

export const styles = StyleSheet.create({
  page: { padding: '40px 30px', fontFamily: 'Helvetica', fontSize: 10, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 10, borderBottom: '2px solid #0ea5e9' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0c4a6e' },
  subHeader: { fontSize: 10, color: '#64748b' },
  table: { width: '100%' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', padding: '5px 8px' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #e2e8f0', padding: '5px 8px' },
  colHeader: { fontWeight: 'bold', fontSize: 11, color: '#334155' },
  col: { color: '#475569' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', color: '#94a3b8', fontSize: 9 },
  summary: { marginTop: 20, paddingTop: 10, borderTop: '1px solid #e2e8f0', alignSelf: 'flex-end', width: '40%' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  summaryLabel: { fontWeight: 'bold' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#0284c7' },
  section: { marginTop: 25 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginBottom: 10, borderBottom: '1px solid #e2e8f0', paddingBottom: 5 },
});