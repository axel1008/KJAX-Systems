// RUTA: supabase/functions/enviar-factura/generarXML.ts (Código con corrección final)

import { formatInTimeZone } from 'npm:date-fns-tz';

// ... (Las funciones generarClaveNumerica, calcularTotales y formatarLineasDetalle no cambian)

function generarClaveNumerica(datos: any): string {
    const ahora = new Date();
    const dia = String(ahora.getDate()).padStart(2, '0');
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const anio = String(ahora.getFullYear()).slice(-2);
    
    if (!datos.emisor?.identificacion?.numero) throw new Error("El 'numero' de identificación del emisor es nulo.");
    if (!datos.consecutivo) throw new Error("El 'consecutivo' de la factura es nulo.");
    
    const identificacion = String(datos.emisor.identificacion.numero).padStart(12, '0');
    const consecutivoFactura = String(datos.consecutivo);
    const situacionComprobante = '1';
    const codigoSeguridad = String(Math.floor(10000000 + Math.random() * 90000000));
    
    return `506${dia}${mes}${anio}${identificacion}${consecutivoFactura}${situacionComprobante}${codigoSeguridad}`;
}

function calcularTotales(detalle: any[]) {
    const resumen = { TotalServGravados: 0, TotalServExentos: 0, TotalMercanciasGravadas: 0, TotalMercanciasExentas: 0, TotalGravado: 0, TotalExento: 0, TotalVenta: 0, TotalDescuentos: 0, TotalVentaNeta: 0, TotalImpuesto: 0, TotalComprobante: 0 };
    (detalle || []).forEach(linea => {
        const cant = linea.cantidad || 0, precio = linea.precio_unitario || 0, imp = linea.impuesto || 0;
        const subtotal = cant * precio; const montoImpuesto = (subtotal * imp) / 100;
        resumen.TotalVenta += subtotal; resumen.TotalImpuesto += montoImpuesto;
        if (imp > 0) resumen.TotalMercanciasGravadas += subtotal; else resumen.TotalMercanciasExentas += subtotal;
    });
    resumen.TotalGravado = resumen.TotalMercanciasGravadas + resumen.TotalServGravados;
    resumen.TotalExento = resumen.TotalMercanciasExentas + resumen.TotalServExentos;
    resumen.TotalVentaNeta = resumen.TotalVenta - resumen.TotalDescuentos;
    resumen.TotalComprobante = resumen.TotalVentaNeta + resumen.TotalImpuesto;
    return Object.fromEntries(Object.entries(resumen).map(([k, v]) => [k, v.toFixed(5)]));
}

function formatarLineasDetalle(detalle: any[]): string {
    return (detalle || []).map((linea, index) => {
        const cant = linea.cantidad || 0, precio = linea.precio_unitario || 0, imp = linea.impuesto || 0;
        const total = cant * precio, montoImpuesto = (total * imp) / 100, totalLinea = total + montoImpuesto;
        return `<LineaDetalle><NumeroLinea>${index + 1}</NumeroLinea><Codigo><Tipo>01</Tipo><Codigo>${String(linea.producto_id || '0').padStart(13, '0')}</Codigo></Codigo><Cantidad>${cant.toFixed(3)}</Cantidad><UnidadMedida>Unid</UnidadMedida><Detalle>${linea.descripcion}</Detalle><PrecioUnitario>${precio.toFixed(5)}</PrecioUnitario><MontoTotal>${total.toFixed(5)}</MontoTotal><SubTotal>${total.toFixed(5)}</SubTotal><Impuesto><Codigo>01</Codigo><CodigoTarifa>08</CodigoTarifa><Tarifa>${imp.toFixed(2)}</Tarifa><Monto>${montoImpuesto.toFixed(5)}</Monto></Impuesto><MontoTotalLinea>${totalLinea.toFixed(5)}</MontoTotalLinea></LineaDetalle>`;
    }).join('');
}

export function generarFacturaXML(datosFactura: any): { xml: string, clave: string } {
    const { emisor, receptor, detalle, ...facturaInfo } = datosFactura;
    if (!emisor || !receptor || !detalle) throw new Error("Faltan datos del emisor, receptor o detalle en el objeto de la factura.");

    const clave = generarClaveNumerica(datosFactura);
    const totales = calcularTotales(detalle);
    const detalleXML = formatarLineasDetalle(detalle);
    const fechaEmision = formatInTimeZone(new Date(), 'America/Costa_Rica', "yyyy-MM-dd'T'HH:mm:ssXXX");

    // --- CORRECCIÓN CLAVE ---
    // Se elimina cualquier espacio o salto de línea antes de la declaración XML.
    const xml = `<?xml version="1.0" encoding="utf-8"?>
<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica FacturaElectronica_v4.3.xsd">
    <Clave>${clave}</Clave>
    <CodigoActividad>${emisor.codigo_actividad}</CodigoActividad>
    <NumeroConsecutivo>${facturaInfo.consecutivo}</NumeroConsecutivo>
    <FechaEmision>${fechaEmision}</FechaEmision>
    <Emisor>
        <Nombre>${emisor.nombre}</Nombre>
        <Identificacion>
            <Tipo>${emisor.identificacion.tipo}</Tipo>
            <Numero>${emisor.identificacion.numero}</Numero>
        </Identificacion>
        <NombreComercial>${emisor.nombre_comercial}</NombreComercial>
        <Ubicacion>
            <Provincia>${emisor.ubicacion_provincia}</Provincia>
            <Canton>${emisor.ubicacion_canton}</Canton>
            <Distrito>${emisor.ubicacion_distrito}</Distrito>
            <OtrasSenas>${emisor.ubicacion_otras_senas}</OtrasSenas>
        </Ubicacion>
        <Telefono>
            <CodigoPais>506</CodigoPais>
            <NumTelefono>${emisor.telefono}</NumTelefono>
        </Telefono>
        <CorreoElectronico>${emisor.correo}</CorreoElectronico>
    </Emisor>
    <Receptor>
        <Nombre>${receptor.nombre}</Nombre>
        <Identificacion>
            <Tipo>${receptor.identificacion_tipo}</Tipo>
            <Numero>${receptor.identificacion_numero}</Numero>
        </Identificacion>
        <CorreoElectronico>${receptor.correo}</CorreoElectronico>
    </Receptor>
    <CondicionVenta>${facturaInfo.condicion_venta}</CondicionVenta>
    <PlazoCredito>${facturaInfo.plazo_credito || 0}</PlazoCredito>
    <MedioPago>${facturaInfo.medio_pago}</MedioPago>
    <DetalleServicio>${detalleXML}</DetalleServicio>
    <ResumenFactura>
        <CodigoTipoMoneda>
            <CodigoMoneda>${facturaInfo.moneda}</CodigoMoneda>
            <TipoCambio>1.00</TipoCambio>
        </CodigoTipoMoneda>
        <TotalServGravados>${totales.TotalServGravados}</TotalServGravados>
        <TotalServExentos>${totales.TotalServExentos}</TotalServExentos>
        <TotalMercanciasGravadas>${totales.TotalMercanciasGravadas}</TotalMercanciasGravadas>
        <TotalMercanciasExentas>${totales.TotalMercanciasExentas}</TotalMercanciasExentas>
        <TotalGravado>${totales.TotalGravado}</TotalGravado>
        <TotalExento>${totales.TotalExento}</TotalExento>
        <TotalVenta>${totales.TotalVenta}</TotalVenta>
        <TotalDescuentos>${totales.TotalDescuentos}</TotalDescuentos>
        <TotalVentaNeta>${totales.TotalVentaNeta}</TotalVentaNeta>
        <TotalImpuesto>${totales.TotalImpuesto}</TotalImpuesto>
        <TotalComprobante>${totales.TotalComprobante}</TotalComprobante>
    </ResumenFactura>
    <Normativa>
        <NumeroResolucion>DGT-R-48-2016</NumeroResolucion>
        <FechaResolucion>07-10-2016 00:00:00</FechaResolucion>
    </Normativa>
</FacturaElectronica>`;

    return { xml: xml, clave: clave };
}