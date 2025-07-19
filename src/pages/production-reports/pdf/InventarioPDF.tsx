// src/pages/production-reports/pdf/InventarioPDF.tsx

import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
import { styles } from './pdfStyles';
import type { InventarioData } from '../types';

export const InventarioPDF: React.FC<{ data: InventarioData[] }> = ({ data }) => (
  <Document>
    <Page size="A4" style={styles.page} orientation="landscape">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reporte de Estado de Inventario</Text>
        <Text style={styles.subHeader}>Generado: {new Date().toLocaleDateString('es-CR')}</Text>
      </View>
      <View style={styles.table}>
        {/* --- CORRECCIÓN AQUÍ: Se añaden columnas y se ajustan anchos --- */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, {width: '25%'}]}>Producto</Text>
          <Text style={[styles.colHeader, {width: '20%'}]}>Categoría</Text>
          <Text style={[styles.colHeader, {width: '20%'}]}>Proveedor</Text>
          <Text style={[styles.colHeader, {width: '10%', textAlign: 'right'}]}>Stock</Text>
          <Text style={[styles.colHeader, {width: '10%', textAlign: 'right'}]}>Stock Mín.</Text>
          <Text style={[styles.colHeader, {width: '15%', textAlign: 'center'}]}>Estado</Text>
        </View>
        {data.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <Text style={[styles.col, {width: '25%'}]}>{item.nombre}</Text>
            <Text style={[styles.col, {width: '20%'}]}>{item.categoria}</Text>
            <Text style={[styles.col, {width: '20%'}]}>{item.providers?.nombre || 'N/A'}</Text>
            <Text style={[styles.col, {width: '10%', textAlign: 'right'}]}>{item.stock}</Text>
            <Text style={[styles.col, {width: '10%', textAlign: 'right'}]}>{item.stock_minimo}</Text>
            <Text style={[styles.col, {width: '15%', textAlign: 'center'}]}>{item.estado}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </Page>
  </Document>
);