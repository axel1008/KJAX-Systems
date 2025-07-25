<?php
require_once __DIR__ . '/../../src/service/EmailBasicoService.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $emailService = new EmailBasicoService();
    
    // Probar configuración
    $resultado = $emailService->probarConfiguracion();
    
    if ($resultado['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'Configuración de email válida',
            'configuracion_ok' => true
        ], JSON_UNESCAPED_UNICODE);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $resultado['error'],
            'configuracion_ok' => false
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'configuracion_ok' => false
    ], JSON_UNESCAPED_UNICODE);
}
?>