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
        $emisor->addChild('Nombre', $this->datosFactura['emisorNombre'] ?? ($_ENV['EMISOR_NOMBRE'] ?? 'Tu Empresa S.A.'));
        $emisorIdent = $emisor->addChild('Identificacion');
        $emisorIdent->addChild('Tipo', $this->datosFactura['emisorTipo'] ?? '02'); // 02 Jurídica
        $emisorIdent->addChild('Numero', $this->datosFactura['cedulaEmisor'] ?? '3101123456');

        // Información del receptor
        $receptor = $xml->addChild('Receptor');
        $receptor->addChild('Nombre', $this->datosFactura['nombreReceptor'] ?? 'Cliente');
        $receptorIdent = $receptor->addChild('Identificacion');
        $receptorIdent->addChild('Tipo', $this->datosFactura['receptorTipo'] ?? '01');
        $receptorIdent->addChild('Numero', $this->datosFactura['cedulaReceptor'] ?? '123456789');

        // Condición de venta
        $xml->addChild('CondicionVenta', $this->datosFactura['condicionVenta'] ?? '01'); // 01 Contado
        // Plazo crédito opcional:
        if (!empty($this->datosFactura['plazoCredito'])) {
            $xml->addChild('PlazoCredito', (string)$this->datosFactura['plazoCredito']);
        }
        // Medio de pago (repetible en XSD, dejamos simple)
        $xml->addChild('MedioPago', $this->datosFactura['medioPago'] ?? '01');

        // Detalle de servicio
        $detalleServicio = $xml->addChild('DetalleServicio');

        $totalServGravados = 0.0;
        $totalServExentos  = 0.0;
        $totalGravado      = 0.0;
        $totalExento       = 0.0;
        $totalVenta        = 0.0;
        $totalDescuentos   = 0.0;
        $totalImpuesto     = 0.0;

        if (!empty($this->datosFactura['detalle']) && is_array($this->datosFactura['detalle'])) {
            $numLinea = 1;
            foreach ($this->datosFactura['detalle'] as $item) {
                $cantidad       = (float)($item['cantidad'] ?? 1);
                $precioUnit     = (float)($item['precioUnitario'] ?? $item['precio_unitario'] ?? 0);
                $descripcion    = $item['detalle'] ?? $item['descripcion_item'] ?? 'Producto/Servicio';
                $unidad         = $item['unidadMedida'] ?? $item['unidad_medida'] ?? 'Unid';
                $codigoCabys    = $item['codigoCabys'] ?? $item['cabys_code'] ?? null;

                // Descuento: porcentaje o monto (si viniera)
                $descuentoPct   = (float)($item['descuento'] ?? 0);
                $montoBruto     = $cantidad * $precioUnit;
                $montoDesc      = $montoBruto * ($descuentoPct / 100);
                $montoNeto      = $montoBruto - $montoDesc;

                // Tasa de impuesto por línea (desde CABYS)
                $tasaLineal     = (float)($item['impuesto'] ?? 13);
                $montoImpuesto  = $montoNeto * ($tasaLineal / 100);

                $lineaDetalle = $detalleServicio->addChild('LineaDetalle');
                $lineaDetalle->addChild('NumeroLinea', (string)$numLinea);
                
                if (!empty($codigoCabys)) {
                    $codCom = $lineaDetalle->addChild('CodigoComercial');
                    $codCom->addChild('Tipo', '04'); // CABYS
                    $codCom->addChild('Codigo', $codigoCabys);
                }

                $lineaDetalle->addChild('Cantidad', number_format($cantidad, 3, '.', ''));
                $lineaDetalle->addChild('UnidadMedida', $unidad);
                $lineaDetalle->addChild('Detalle', htmlspecialchars($descripcion, ENT_XML1 | ENT_COMPAT, 'UTF-8'));
                $lineaDetalle->addChild('PrecioUnitario', number_format($precioUnit, 5, '.', ''));
                $lineaDetalle->addChild('MontoTotal', number_format($montoBruto, 5, '.', ''));

                if ($montoDesc > 0) {
                    $desc = $lineaDetalle->addChild('Descuento');
                    $desc->addChild('MontoDescuento', number_format($montoDesc, 5, '.', ''));
                    $desc->addChild('NaturalezaDescuento', 'Descuento aplicado');
                }

                $lineaDetalle->addChild('SubTotal', number_format($montoNeto, 5, '.', ''));

                // Impuesto (solo si tasa > 0)
                if ($tasaLineal > 0) {
                    $imp = $lineaDetalle->addChild('Impuesto');
                    $imp->addChild('Codigo', '01'); // IVA
                    $imp->addChild('CodigoTarifa', '08'); // genérico, opcional según catálogo (ajusta si usas tipos)
                    $imp->addChild('Tarifa', number_format($tasaLineal, 2, '.', ''));
                    $imp->addChild('Monto', number_format($montoImpuesto, 5, '.', ''));
                }

                $lineaDetalle->addChild('MontoTotalLinea', number_format($montoNeto + $montoImpuesto, 5, '.', ''));

                // Acumuladores de resumen
                if ($tasaLineal > 0) {
                    $totalServGravados += $montoNeto;
                    $totalGravado      += $montoNeto;
                } else {
                    $totalServExentos  += $montoNeto;
                    $totalExento       += $montoNeto;
                }
                $totalVenta      += $montoBruto;
                $totalDescuentos += $montoDesc;
                $totalImpuesto   += $montoImpuesto;

                $numLinea++;
            }
        }

        // Resumen de la factura
        $resumen = $xml->addChild('ResumenFactura');
        $resumen->addChild('CodigoMoneda', $this->datosFactura['codigoMoneda'] ?? 'CRC');
        $resumen->addChild('TotalServGravados', number_format($totalServGravados, 5, '.', ''));
        $resumen->addChild('TotalServExentos', number_format($totalServExentos, 5, '.', ''));
        $resumen->addChild('TotalMercanciasGravadas', number_format(0, 5, '.', ''));
        $resumen->addChild('TotalMercanciasExentas', number_format(0, 5, '.', ''));
        $resumen->addChild('TotalGravado', number_format($totalGravado, 5, '.', ''));
        $resumen->addChild('TotalExento', number_format($totalExento, 5, '.', ''));
        $resumen->addChild('TotalVenta', number_format($totalVenta, 5, '.', ''));
        $resumen->addChild('TotalDescuentos', number_format($totalDescuentos, 5, '.', ''));
        $resumen->addChild('TotalVentaNeta', number_format($totalVenta - $totalDescuentos, 5, '.', ''));
        $resumen->addChild('TotalImpuesto', number_format($totalImpuesto, 5, '.', ''));
        $resumen->addChild('TotalComprobante', number_format(($totalVenta - $totalDescuentos) + $totalImpuesto, 5, '.', ''));

        return $xml->asXML();
    }
}
