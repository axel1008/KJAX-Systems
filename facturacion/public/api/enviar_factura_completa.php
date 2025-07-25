<?php
require_once __DIR__ . '/../../src/services/EmailFacturacionService.php';
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config/database.php'; // Tu configuración de Supabase

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['factura_id'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'ID de factura requerido'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // Inicializar servicio
    $emailService = new EmailFacturacionService($supabase); // Tu instancia de Supabase
    
    // Validar configuración
    $validacion = $emailService->validarConfiguracion();
    if (!$validacion['valido']) {
        throw new Exception('Configuración de email inválida: ' . implode(', ', $validacion['errores']));
    }
    
    // Parámetros
    $facturaId = $data['factura_id'];
    $forzarReenvio = $data['forzar_reenvio'] ?? false;
    $tipoEnvio = $data['tipo'] ?? 'factura'; // 'factura' o 'recordatorio'
    
    // Enviar según tipo
    if ($tipoEnvio === 'recordatorio') {
        $resultado = $emailService->enviarRecordatorioVencimiento($facturaId);
    } else {
        $resultado = $emailService->enviarFacturaCompleta($facturaId, $forzarReenvio);
    }
    
    // Respuesta
    http_response_code($resultado['success'] ? 200 : 400);
    echo json_encode($resultado, JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    error_log("Error en endpoint envío factura: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
}
?>