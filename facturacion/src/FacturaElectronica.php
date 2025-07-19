<?php
require_once __DIR__ . '/utils/helpers.php';
use App\utils\ClaveGenerator;

class FacturaElectronica
{
    private $datosFactura;

    public function __construct($datosFactura)
    {
        $this->datosFactura = $datosFactura;
    }

    public function generarXML(): string
    {
        // Generar clave con TODOS los parámetros necesarios
        $clave = ClaveGenerator::generarClave(
            $this->datosFactura['tipoComprobante'] ?? '01',
            $this->datosFactura['codigoPais'] ?? '506',
            $this->datosFactura['dia'] ?? date('d'),
            $this->datosFactura['mes'] ?? date('m'),
            $this->datosFactura['anio'] ?? date('y'),
            $this->datosFactura['cedulaEmisor'] ?? '3101123456',
            $this->datosFactura['consecutivo'] ?? '00100001010000000001',
            $this->datosFactura['situacionComprobante'] ?? '1',
            $this->datosFactura['codigoSeguridad'] ?? '12345678'
        );

        $xml = new SimpleXMLElement('<FacturaElectronica/>');
        $xml->addChild('Clave', $clave);
        $xml->addChild('NumeroConsecutivo', $this->datosFactura['consecutivo']);
        $xml->addChild('FechaEmision', date('c'));

        // Información del emisor
        $emisor = $xml->addChild('Emisor');
        $emisor->addChild('Nombre', $_ENV['EMISOR_NOMBRE'] ?? 'Tu Empresa S.A.');
        $emisor->addChild('Identificacion');
        $emisor->Identificacion->addChild('Tipo', $this->datosFactura['emisorTipo'] ?? '02');
        $emisor->Identificacion->addChild('Numero', $this->datosFactura['cedulaEmisor'] ?? '3101123456');

        // Información del receptor
        $receptor = $xml->addChild('Receptor');
        $receptor->addChild('Nombre', $this->datosFactura['nombreReceptor'] ?? 'Cliente');
        $receptor->addChild('Identificacion');
        $receptor->Identificacion->addChild('Tipo', $this->datosFactura['receptorTipo'] ?? '01');
        $receptor->Identificacion->addChild('Numero', $this->datosFactura['cedulaReceptor'] ?? '123456789');

        // Condiciones de la venta
        $condicionVenta = $xml->addChild('CondicionVenta', '01'); // Contado

        // Plazo crédito (solo si es crédito)
        // $xml->addChild('PlazoCredito', '30');

        // Medio de pago
        $medioPago = $xml->addChild('MedioPago', '01'); // Efectivo

        // Detalles de servicio
        $detalleServicio = $xml->addChild('DetalleServicio');
        
        if (isset($this->datosFactura['detalle']) && is_array($this->datosFactura['detalle'])) {
            foreach ($this->datosFactura['detalle'] as $item) {
                $lineaDetalle = $detalleServicio->addChild('LineaDetalle');
                $lineaDetalle->addChild('NumeroLinea', $item['numeroLinea'] ?? 1);
                $lineaDetalle->addChild('Codigo', $item['codigoCabys'] ?? '123456789');
                $lineaDetalle->addChild('Cantidad', $item['cantidad'] ?? 1);
                $lineaDetalle->addChild('UnidadMedida', $item['unidadMedida'] ?? 'Unid');
                $lineaDetalle->addChild('Detalle', $item['detalle'] ?? 'Producto/Servicio');
                $lineaDetalle->addChild('PrecioUnitario', $item['precioUnitario'] ?? 1000);
                $lineaDetalle->addChild('MontoTotal', $item['montoTotal'] ?? 1000);
                
                // Impuestos
                $impuesto = $lineaDetalle->addChild('Impuesto');
                $impuesto->addChild('Codigo', '01'); // IVA
                $impuesto->addChild('Tarifa', '13.00');
                $impuesto->addChild('Monto', ($item['montoTotal'] ?? 1000) * 0.13);
            }
        }

        // Resumen de la factura
        $resumenFactura = $xml->addChild('ResumenFactura');
        $resumenFactura->addChild('CodigoMoneda', $this->datosFactura['codigoMoneda'] ?? 'CRC');
        $resumenFactura->addChild('TotalServGravados', $this->datosFactura['totalGravado'] ?? 1000);
        $resumenFactura->addChild('TotalServExentos', $this->datosFactura['totalExento'] ?? 0);
        $resumenFactura->addChild('TotalMercanciasGravadas', 0);
        $resumenFactura->addChild('TotalMercanciasExentas', 0);
        $resumenFactura->addChild('TotalGravado', $this->datosFactura['totalGravado'] ?? 1000);
        $resumenFactura->addChild('TotalExento', $this->datosFactura['totalExento'] ?? 0);
        $resumenFactura->addChild('TotalVenta', $this->datosFactura['totalVenta'] ?? 1000);
        $resumenFactura->addChild('TotalDescuentos', 0);
        $resumenFactura->addChild('TotalVentaNeta', $this->datosFactura['totalVenta'] ?? 1000);
        $resumenFactura->addChild('TotalImpuesto', $this->datosFactura['totalImpuesto'] ?? 130);
        $resumenFactura->addChild('TotalComprobante', $this->datosFactura['totalComprobante'] ?? 1130);

        return $xml->asXML();
    }
}