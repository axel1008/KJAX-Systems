import { create } from 'xmlbuilder2';

function generateInvoiceXML(factura) {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('FacturaElectronica', { 'xmlns': 'https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica' })
    .ele('Clave').txt(factura.clave).up()
    .ele('NumeroConsecutivo').txt(factura.consecutivo).up()
    .ele('FechaEmision').txt(factura.fechaEmision).up()
    .ele('Emisor')
      .ele('Nombre').txt(factura.emisor.nombre).up()
      .ele('Identificacion')
        .ele('Tipo').txt(factura.emisor.tipoIdentificacion).up()
        .ele('Numero').txt(factura.emisor.numeroIdentificacion).up()
      .up()
      .ele('Ubicacion')
        .ele('Provincia').txt(factura.emisor.provincia).up()
        .ele('Canton').txt(factura.emisor.canton).up()
        .ele('Distrito').txt(factura.emisor.distrito).up()
        .ele('Barrio').txt(factura.emisor.barrio).up()
        .ele('OtrasSenas').txt(factura.emisor.otrasSenas).up()
      .up()
      .ele('CorreoElectronico').txt(factura.emisor.email).up()
    .up()
    .ele('Receptor')
      .ele('Nombre').txt(factura.receptor.nombre).up()
      .ele('Identificacion')
        .ele('Tipo').txt(factura.receptor.tipoIdentificacion).up()
        .ele('Numero').txt(factura.receptor.numeroIdentificacion).up()
      .up()
      .ele('CorreoElectronico').txt(factura.receptor.email).up()
    .up()
    .ele('DetalleServicio');

  factura.items.forEach(item => {
    root.ele('LineaDetalle')
      .ele('NumeroLinea').txt(item.numeroLinea).up()
      .ele('Cantidad').txt(item.cantidad).up()
      .ele('UnidadMedida').txt(item.unidadMedida).up()
      .ele('Detalle').txt(item.detalle).up()
      .ele('PrecioUnitario').txt(item.precioUnitario.toFixed(2)).up()
      .ele('MontoTotal').txt(item.montoTotal.toFixed(2)).up()
      .up();
  });

  root.up()
    .ele('ResumenFactura')
      .ele('TotalServGravados').txt(factura.totalServGravados.toFixed(2)).up()
      .ele('TotalVenta').txt(factura.totalVenta.toFixed(2)).up()
    .up();

  return root.end({ prettyPrint: true });
}

// Ejemplo simple de uso:
const facturaEjemplo = {
  clave: '50601021900310112345600100001010000000001112345678',
  consecutivo: '00100001010000000001',
  fechaEmision: '2025-06-15T12:00:00-06:00',
  emisor: {
    nombre: 'Mi Empresa S.A.',
    tipoIdentificacion: '01',
    numeroIdentificacion: '3101123456',
    provincia: '1',
    canton: '1',
    distrito: '1',
    barrio: '01',
    otrasSenas: 'Centro Comercial',
    email: 'ventas@miempresa.com',
  },
  receptor: {
    nombre: 'Cliente Ejemplo',
    tipoIdentificacion: '01',
    numeroIdentificacion: '3101987654',
    email: 'cliente@correo.com',
  },
  items: [
    { numeroLinea: 1, cantidad: 2, unidadMedida: 'Unid', detalle: 'Producto A', precioUnitario: 1000, montoTotal: 2000 },
    { numeroLinea: 2, cantidad: 1, unidadMedida: 'Unid', detalle: 'Producto B', precioUnitario: 500, montoTotal: 500 },
  ],
  totalServGravados: 2500,
  totalVenta: 2500,
};

console.log(generateInvoiceXML(facturaEjemplo));
