<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/service/SupabaseService.php';
require_once __DIR__ . '/../src/service/PDFService.php';
require_once __DIR__ . '/../config/config.php';

try {
    $clave = $_GET['clave'] ?? null;
    $descargar = $_GET['download'] ?? 'true';
    
    if (!$clave) {
        throw new Exception('Parámetro "clave" requerido. Ejemplo: ?clave=506190722...');
    }
    
    // Obtener factura de Supabase
    $supabase = new SupabaseService();
    $factura = $supabase->getFactura($clave);
    
    if (!$factura) {
        throw new Exception('Factura no encontrada en la base de datos');
    }
    
    // Preparar datos para PDF
    $datosParaPDF = [
        'clave' => $clave,
        'factura_completa' => $factura
    ];
    
    if ($descargar === 'false') {
        // Modo debug - mostrar información sin generar PDF
        header('Content-Type: application/json');
        echo json_encode([
            'estado' => 'debug',
            'mensaje' => 'Información de la factura',
            'clave' => $clave,
            'factura' => [
                'consecutivo' => $factura['consecutivo'],
                'fecha' => $factura['created_at'],
                'total' => $factura['total_factura'],
                'cliente' => $factura['receptor_nombre'] ?? 'N/A',
                'xml_presente' => isset($factura['xml']),
                'detalle_items' => isset($factura['detalle']) ? count($factura['detalle']) : 0
            ],
            'datos_para_pdf' => array_keys($datosParaPDF)
        ], JSON_PRETTY_PRINT);
        return;
    }
    
    // Generar PDF SIN output de debug
    ob_start(); // Capturar cualquier output no deseado
    
    $pdfService = new PDFService();
    $contenidoPDF = $pdfService->generarPDFFactura($datosParaPDF);
    
    ob_end_clean(); // Limpiar buffer
    
    // Nombre del archivo
    $nombreArchivo = 'factura_' . $factura['consecutivo'] . '_' . date('Ymd_His') . '.pdf';
    
    // Guardar PDF en temp
    $rutaPDF = $pdfService->guardarPDF($contenidoPDF, $nombreArchivo);
    
    // Enviar headers para descarga
    header('Content-Type: application/pdf');
    header('Content-Disposition: attachment; filename="' . $nombreArchivo . '"');
    header('Content-Length: ' . strlen($contenidoPDF));
    header('Cache-Control: no-cache, must-revalidate');
    header('Pragma: no-cache');
    
    // Enviar contenido del PDF
    echo $contenidoPDF;
    
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'estado' => 'error',
        'mensaje' => $e->getMessage(),
        'linea' => $e->getLine(),
        'archivo' => basename($e->getFile())
    ], JSON_PRETTY_PRINT);
}