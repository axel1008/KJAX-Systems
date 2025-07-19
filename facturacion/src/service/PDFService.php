<?php
require_once __DIR__ . '/../../vendor/autoload.php';

// No usar "use TCPDF" ya que está en el namespace global

class PDFService
{
    private $pdf;
    
    public function __construct()
    {
        $this->pdf = new \TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
        $this->configurarPDF();
    }
    
    private function configurarPDF()
    {
        // Configuración del documento
        $this->pdf->SetCreator('Sistema de Facturación Electrónica');
        $this->pdf->SetAuthor($_ENV['EMISOR_NOMBRE'] ?? 'Tu Empresa S.A.');
        $this->pdf->SetTitle('Factura Electrónica');
        $this->pdf->SetSubject('Comprobante Fiscal Electrónico');
        $this->pdf->SetKeywords('Factura, Electrónica, Costa Rica, Hacienda');

        // Configurar márgenes
        $this->pdf->SetMargins(15, 27, 15);
        $this->pdf->SetHeaderMargin(10);
        $this->pdf->SetFooterMargin(10);

        // Auto page breaks
        $this->pdf->SetAutoPageBreak(TRUE, 25);

        // Configurar fuente
        $this->pdf->SetFont('helvetica', '', 10);
        
        // No mostrar header y footer por defecto
        $this->pdf->setPrintHeader(false);
        $this->pdf->setPrintFooter(false);
    }
    
    public function generarPDFFactura($datosFactura)
    {
        $this->pdf->AddPage();
        
        // Header de la empresa
        $this->agregarHeaderEmpresa();
        
        // Información de la factura
        $this->agregarInfoFactura($datosFactura);
        
        // Información del cliente
        $this->agregarInfoCliente($datosFactura);
        
        // Detalle de productos/servicios
        $this->agregarDetalleProductos($datosFactura);
        
        // Totales
        $this->agregarTotales($datosFactura);
        
        // Footer con clave y códigos QR
        $this->agregarFooter($datosFactura);
        
        return $this->pdf->Output('', 'S'); // Retornar como string
    }
    
    private function agregarHeaderEmpresa()
    {
        // Logo (si existe)
        $logoPath = __DIR__ . '/../../assets/logo.png';
        if (file_exists($logoPath)) {
            $this->pdf->Image($logoPath, 15, 15, 30, 15, 'PNG');
        }
        
        // Información de la empresa
        $this->pdf->SetFont('helvetica', 'B', 16);
        $this->pdf->SetXY(50, 15);
        $this->pdf->Cell(0, 8, $_ENV['EMISOR_NOMBRE'] ?? 'Tu Empresa S.A.', 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', '', 10);
        $this->pdf->SetXY(50, 23);
        $this->pdf->Cell(0, 5, 'Cédula Jurídica: 3-101-123456', 0, 1, 'L');
        $this->pdf->SetXY(50, 28);
        $this->pdf->Cell(0, 5, 'Teléfono: +506 2234-5678', 0, 1, 'L');
        $this->pdf->SetXY(50, 33);
        $this->pdf->Cell(0, 5, 'Email: info@tuempresa.com', 0, 1, 'L');
        
        // Título FACTURA ELECTRÓNICA
        $this->pdf->SetFont('helvetica', 'B', 14);
        $this->pdf->SetTextColor(204, 51, 51); // Rojo
        $this->pdf->SetXY(130, 20);
        $this->pdf->Cell(65, 8, 'FACTURA ELECTRÓNICA', 1, 1, 'C');
        $this->pdf->SetTextColor(0, 0, 0); // Volver a negro
        
        // Línea separadora
        $this->pdf->Line(15, 45, 195, 45);
    }
    
    private function agregarInfoFactura($datos)
    {
        $y = 50;
        
        $this->pdf->SetFont('helvetica', 'B', 10);
        $this->pdf->SetXY(130, $y);
        $this->pdf->Cell(30, 5, 'Factura No:', 0, 0, 'L');
        $this->pdf->SetFont('helvetica', '', 10);
        $this->pdf->Cell(35, 5, $datos['consecutivo'] ?? 'N/A', 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', 'B', 10);
        $this->pdf->SetXY(130, $y + 5);
        $this->pdf->Cell(30, 5, 'Fecha:', 0, 0, 'L');
        $this->pdf->SetFont('helvetica', '', 10);
        $this->pdf->Cell(35, 5, date('d/m/Y H:i'), 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', 'B', 10);
        $this->pdf->SetXY(130, $y + 10);
        $this->pdf->Cell(30, 5, 'Moneda:', 0, 0, 'L');
        $this->pdf->SetFont('helvetica', '', 10);
        $this->pdf->Cell(35, 5, $datos['moneda'] ?? 'CRC', 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', 'B', 10);
        $this->pdf->SetXY(130, $y + 15);
        $this->pdf->Cell(30, 5, 'Condición:', 0, 0, 'L');
        $this->pdf->SetFont('helvetica', '', 10);
        $this->pdf->Cell(35, 5, $datos['condicion_venta'] ?? 'CONTADO', 0, 1, 'L');
    }
    
    private function agregarInfoCliente($datos)
    {
        $y = 50;
        
        $this->pdf->SetFont('helvetica', 'B', 12);
        $this->pdf->SetXY(15, $y);
        $this->pdf->Cell(0, 8, 'FACTURAR A:', 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', 'B', 11);
        $this->pdf->SetXY(15, $y + 8);
        $cliente = $this->extraerDatosCliente($datos);
        $this->pdf->Cell(0, 6, $cliente['nombre'], 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', '', 10);
        $this->pdf->SetXY(15, $y + 14);
        $this->pdf->Cell(0, 5, 'Identificación: ' . $cliente['identificacion'], 0, 1, 'L');
        
        if (!empty($cliente['email'])) {
            $this->pdf->SetXY(15, $y + 19);
            $this->pdf->Cell(0, 5, 'Email: ' . $cliente['email'], 0, 1, 'L');
        }
        
        if (!empty($cliente['telefono'])) {
            $this->pdf->SetXY(15, $y + 24);
            $this->pdf->Cell(0, 5, 'Teléfono: ' . $cliente['telefono'], 0, 1, 'L');
        }
    }
    
    private function extraerDatosCliente($datos)
    {
        // Si viene de Supabase (factura completa)
        if (isset($datos['factura_completa'])) {
            $factura = $datos['factura_completa'];
            return [
                'nombre' => $this->extraerNombreDelXML($factura['xml']) ?? 'Cliente',
                'identificacion' => $this->extraerCedulaDelXML($factura['xml']) ?? 'N/A',
                'email' => '',
                'telefono' => ''
            ];
        }
        
        // Si viene de datos directos
        return [
            'nombre' => $datos['nombreReceptor'] ?? $datos['receptor_nombre'] ?? 'Cliente',
            'identificacion' => $datos['cedulaReceptor'] ?? $datos['receptor_cedula'] ?? 'N/A',
            'email' => $datos['email'] ?? '',
            'telefono' => $datos['telefono'] ?? ''
        ];
    }
    
    private function extraerNombreDelXML($xml)
    {
        if (preg_match('/<Receptor>.*?<Nombre>([^<]+)<\/Nombre>.*?<\/Receptor>/s', $xml, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    private function extraerCedulaDelXML($xml)
    {
        if (preg_match('/<Receptor>.*?<Numero>([^<]+)<\/Numero>.*?<\/Receptor>/s', $xml, $matches)) {
            return $matches[1];
        }
        return null;
    }
    
    private function agregarDetalleProductos($datos)
    {
        $y = 85;
        
        // Header de la tabla
        $this->pdf->SetFillColor(230, 230, 230);
        $this->pdf->SetFont('helvetica', 'B', 9);
        
        $this->pdf->SetXY(15, $y);
        $this->pdf->Cell(10, 8, '#', 1, 0, 'C', true);
        $this->pdf->Cell(80, 8, 'Descripción', 1, 0, 'C', true);
        $this->pdf->Cell(20, 8, 'Cantidad', 1, 0, 'C', true);
        $this->pdf->Cell(25, 8, 'Precio Unit.', 1, 0, 'C', true);
        $this->pdf->Cell(25, 8, 'Impuesto', 1, 0, 'C', true);
        $this->pdf->Cell(25, 8, 'Total', 1, 1, 'C', true);
        
        // Contenido de la tabla
        $this->pdf->SetFont('helvetica', '', 9);
        $this->pdf->SetFillColor(255, 255, 255);
        
        $detalles = $this->extraerDetalles($datos);
        $yActual = $y + 8;
        
        foreach ($detalles as $index => $detalle) {
            $this->pdf->SetXY(15, $yActual);
            $this->pdf->Cell(10, 6, $index + 1, 1, 0, 'C');
            $this->pdf->Cell(80, 6, $detalle['descripcion'], 1, 0, 'L');
            $this->pdf->Cell(20, 6, $detalle['cantidad'], 1, 0, 'C');
            $this->pdf->Cell(25, 6, '₡' . number_format($detalle['precio'], 2), 1, 0, 'R');
            $this->pdf->Cell(25, 6, '₡' . number_format($detalle['impuesto'], 2), 1, 0, 'R');
            $this->pdf->Cell(25, 6, '₡' . number_format($detalle['total'], 2), 1, 1, 'R');
            
            $yActual += 6;
        }
        
        return $yActual;
    }
    
    private function extraerDetalles($datos)
    {
        // Si viene de Supabase
        if (isset($datos['factura_completa']['detalle'])) {
            $detalles = $datos['factura_completa']['detalle'];
            $resultado = [];
            
            foreach ($detalles as $detalle) {
                $precio = $detalle['precioUnitario'] ?? 0;
                $cantidad = $detalle['cantidad'] ?? 1;
                $total = $detalle['montoTotal'] ?? ($precio * $cantidad);
                $impuesto = $total * 0.13; // 13% IVA
                
                $resultado[] = [
                    'descripcion' => $detalle['detalle'] ?? 'Producto/Servicio',
                    'cantidad' => $cantidad,
                    'precio' => $precio,
                    'impuesto' => $impuesto,
                    'total' => $total
                ];
            }
            
            return $resultado;
        }
        
        // Si viene de datos directos
        if (isset($datos['detalle'])) {
            return $this->procesarDetallesDirectos($datos['detalle']);
        }
        
        // Fallback - crear un detalle genérico
        return [[
            'descripcion' => 'Producto/Servicio',
            'cantidad' => 1,
            'precio' => $datos['total_gravado'] ?? 1000,
            'impuesto' => $datos['total_impuesto'] ?? 130,
            'total' => $datos['total_factura'] ?? 1130
        ]];
    }
    
    private function procesarDetallesDirectos($detalles)
    {
        $resultado = [];
        
        foreach ($detalles as $detalle) {
            $precio = $detalle['precioUnitario'] ?? 0;
            $cantidad = $detalle['cantidad'] ?? 1;
            $total = $detalle['montoTotal'] ?? ($precio * $cantidad);
            $impuesto = $total * 0.13;
            
            $resultado[] = [
                'descripcion' => $detalle['detalle'] ?? 'Producto/Servicio',
                'cantidad' => $cantidad,
                'precio' => $precio,
                'impuesto' => $impuesto,
                'total' => $total
            ];
        }
        
        return $resultado;
    }
    
    private function agregarTotales($datos)
    {
        $y = 150; // Posición aproximada después de la tabla
        
        // Extraer totales
        $totales = $this->extraerTotales($datos);
        
        // Cuadro de totales
        $this->pdf->SetFillColor(240, 240, 240);
        $this->pdf->SetFont('helvetica', 'B', 10);
        
        $this->pdf->SetXY(130, $y);
        $this->pdf->Cell(40, 6, 'Subtotal:', 1, 0, 'L', true);
        $this->pdf->Cell(25, 6, '₡' . number_format($totales['subtotal'], 2), 1, 1, 'R', true);
        
        $this->pdf->SetXY(130, $y + 6);
        $this->pdf->Cell(40, 6, 'Impuesto (13%):', 1, 0, 'L', true);
        $this->pdf->Cell(25, 6, '₡' . number_format($totales['impuesto'], 2), 1, 1, 'R', true);
        
        $this->pdf->SetFont('helvetica', 'B', 12);
        $this->pdf->SetFillColor(220, 220, 220);
        $this->pdf->SetXY(130, $y + 12);
        $this->pdf->Cell(40, 8, 'TOTAL:', 1, 0, 'L', true);
        $this->pdf->Cell(25, 8, '₡' . number_format($totales['total'], 2), 1, 1, 'R', true);
    }
    
    private function extraerTotales($datos)
    {
        if (isset($datos['factura_completa'])) {
            $factura = $datos['factura_completa'];
            return [
                'subtotal' => $factura['total_gravado'] ?? 0,
                'impuesto' => $factura['total_impuesto'] ?? 0,
                'total' => $factura['total_factura'] ?? 0
            ];
        }
        
        return [
            'subtotal' => $datos['total_gravado'] ?? $datos['totalGravado'] ?? 0,
            'impuesto' => $datos['total_impuesto'] ?? $datos['totalImpuesto'] ?? 0,
            'total' => $datos['total_factura'] ?? $datos['totalComprobante'] ?? 0
        ];
    }
    
    private function agregarFooter($datos)
    {
        $y = 200;
        
        // Clave de la factura
        $clave = $datos['clave'] ?? ($datos['factura_completa']['clave'] ?? 'N/A');
        
        $this->pdf->SetFont('helvetica', 'B', 8);
        $this->pdf->SetXY(15, $y);
        $this->pdf->Cell(0, 5, 'Clave Numérica:', 0, 1, 'L');
        
        $this->pdf->SetFont('helvetica', '', 7);
        $this->pdf->SetXY(15, $y + 5);
        $this->pdf->Cell(0, 5, $clave, 0, 1, 'L');
        
        // Información adicional
        $this->pdf->SetFont('helvetica', '', 8);
        $this->pdf->SetXY(15, $y + 15);
        $this->pdf->Cell(0, 5, 'Factura autorizada mediante sistema de facturación electrónica.', 0, 1, 'L');
        $this->pdf->SetXY(15, $y + 20);
        $this->pdf->Cell(0, 5, 'Consulte su factura en: www.hacienda.go.cr', 0, 1, 'L');
    }
    
    public function guardarPDF($contenido, $nombreArchivo)
    {
        $rutaPDF = __DIR__ . '/../../temp/' . $nombreArchivo;
        file_put_contents($rutaPDF, $contenido);
        return $rutaPDF;
    }
}