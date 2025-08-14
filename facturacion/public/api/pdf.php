<?php
// HEADERS UTF-8
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// CARGAR DEPENDENCIAS
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../src/QRGenerator.php';
require_once __DIR__ . '/../../src/templates/factura_template.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['factura'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de factura requeridos']);
    exit;
}

try {
    // Cargar configuración
    $config   = include __DIR__ . '/../../config/pdf_config.php';
    $factura  = $data['factura'];
    $emisor   = $data['emisor'];
    $receptor = $data['receptor'];
    $detalles = $data['detalles'];

    // Configurar DOMPDF
    $options = new Options();
    $options->set('defaultFont', 'DejaVu Sans');
    $options->set('isRemoteEnabled', true);
    $options->set('isHtml5ParserEnabled', true);
    $options->set('chroot', realpath(__DIR__ . '/../../'));
    $dompdf = new Dompdf($options);

    // HTML desde plantilla unificada
    $html = generarFacturaEstiloPDF($factura, $emisor, $receptor, $detalles, $config);

    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    $filename  = 'Factura_' . ($factura['consecutivo'] ?? substr($factura['id'], 0, 8)) . '.pdf';
    $pdfBase64 = base64_encode($dompdf->output());

    echo json_encode([
        'success'    => true,
        'filename'   => $filename,
        'pdf_base64' => $pdfBase64,
        'message'    => 'PDF generado exitosamente'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    error_log("Error generando PDF: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function generarFacturaEstiloPDF($factura, $emisor, $receptor, $detalles, $config) {
    require_once __DIR__ . '/../../src/templates/factura_template.php';
    return renderFacturaHTML($factura, $emisor, $receptor, $detalles, $config);
}

// Helpers locales (por si se usan en el template)
function getCondicionVentaNombre($c) {
    $map = ["01"=>"Contado","02"=>"Crédito","03"=>"Consignación","04"=>"Apartado",
            "05"=>"Arrendamiento con opción de compra","06"=>"Arrendamiento en función financiera","99"=>"Otros"];
    return $map[$c] ?? 'Desconocido';
}
function getMetodoPagoNombre($c) {
    $map = ["01"=>"Efectivo","02"=>"Tarjeta","03"=>"Transferencia","04"=>"Cheque","05"=>"Recaudado por tercero"];
    return $map[$c] ?? 'Otros';
}
