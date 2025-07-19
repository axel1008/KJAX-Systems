// RUTA: src/pages/production-reports/pdf/ClientesConDescuentosPDF.tsx (CORREGIDO)

import React from 'react';
import { Page, Text, View, Document } from '@react-pdf/renderer';
// --- INICIO CORRECCIÓN: Importamos el formateador de números ---
import { styles, formatNumberForPDF } from './pdfStyles'; 
import type { ReporteDescuentoCliente } from '../types';

interface ClientesDescuentosPDFProps {
  data: ReporteDescuentoCliente[];
}

export const ClientesConDescuentosPDF: React.FC<ClientesDescuentosPDFProps> = ({ data }) => {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>Reporte de Descuentos por Cliente</Text>
          <Text style={styles.subHeader}>Generado: {new Date().toLocaleDateString('es-CR')}</Text>
        </View>

        {data.length === 0 ? (
          <View>
            <Text style={{ textAlign: 'center', marginTop: 40, color: '#64748b' }}>
              No hay clientes con descuentos especiales para mostrar.
            </Text>
          </View>
        ) : (
          data.map(cliente => (
            <View key={cliente.cliente_id} style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>{cliente.cliente_nombre}</Text>
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colHeader, { width: '40%' }]}>Producto</Text>
                  <Text style={[styles.colHeader, { width: '20%', textAlign: 'right' }]}>Precio Base</Text>
                  <Text style={[styles.colHeader, { width: '20%', textAlign: 'center' }]}>Descuento (%)</Text>
                  <Text style={[styles.colHeader, { width: '20%', textAlign: 'right' }]}>Precio Final</Text>
                </View>
                
                {cliente.descuentos.map((desc, index) => (
                  <View key={index} style={styles.tableRow}>
                    <Text style={[styles.col, { width: '40%' }]}>{desc.producto_nombre}</Text>
                    {/* CORRECCIÓN: Usamos formatNumberForPDF para evitar símbolos de moneda */}
                    <Text style={[styles.col, { width: '20%', textAlign: 'right' }]}>{formatNumberForPDF(desc.precio_base)}</Text>
                    <Text style={[styles.col, { width: '20%', textAlign: 'center' }]}>{desc.valor_formateado}</Text>
                    <Text style={[styles.col, { width: '20%', textAlign: 'right', fontWeight: 'bold' }]}>{formatNumberForPDF(desc.precio_final)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </Page>
    </Document>
  );
};
// --- FIN CORRECCIÓN ---