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

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['factura_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'ID de factura requerido']);
    exit;
}

try {
    $facturaId = $data['factura_id'];
    $emailCliente = $data['email_cliente'] ?? 'cliente@test.com';
    $nombreCliente = $data['nombre_cliente'] ?? 'Cliente';
    
    // Cargar configuración
    $config = include __DIR__ . '/../../config/email_config.php';
    $emailService = new EmailBasicoService();
    
    // Simular datos de factura (reemplazar con consulta real a Supabase)
    $factura = [
        'id' => $facturaId,
        'consecutivo' => '001001010000000001',
        'cliente_email' => $emailCliente,
        'cliente_nombre' => $nombreCliente,
        'fecha_vencimiento' => date('Y-m-d', strtotime('+7 days')),
        'total_factura' => 150000.00,
        'saldo_pendiente' => 150000.00
    ];
    
    // Calcular días vencido
    $diasVencido = calcularDiasVencimiento($factura['fecha_vencimiento']);
    
    // Generar asunto
    if ($diasVencido > 0) {
        $asunto = "⚠️ Factura Vencida #{$factura['consecutivo']} - {$config['empresa']['nombre']}";
    } elseif ($diasVencido === 0) {
        $asunto = "🔔 Factura Vence HOY #{$factura['consecutivo']} - {$config['empresa']['nombre']}";
    } else {
        $asunto = "📅 Recordatorio: Factura por Vencer #{$factura['consecutivo']}";
    }
    
    // Generar mensaje HTML
    $mensaje = generarMensajeHTML($factura, $config, $diasVencido);
    
    // Enviar email
    $resultado = $emailService->enviarEmail($emailCliente, $asunto, $mensaje);
    
    if ($resultado['success']) {
        echo json_encode([
            'success' => true,
            'message' => 'Recordatorio enviado exitosamente',
            'destinatario' => $emailCliente,
            'asunto' => $asunto
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => $resultado['error']
        ]);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function calcularDiasVencimiento($fechaVencimiento) {
    if (!$fechaVencimiento) return 0;
    
    $hoy = new DateTime();
    $vencimiento = new DateTime($fechaVencimiento);
    $diferencia = $hoy->diff($vencimiento);
    
    return $vencimiento < $hoy ? $diferencia->days : -$diferencia->days;
}

function generarMensajeHTML($factura, $config, $diasVencido) {
    $colorUrgencia = '#059669';
    $mensajeVencimiento = '';
    
    if ($diasVencido > 0) {
        $mensajeVencimiento = "Su factura está <strong style='color: #dc2626;'>VENCIDA</strong> hace <strong>{$diasVencido} días</strong>.";
        $colorUrgencia = '#dc2626';
    } elseif ($diasVencido === 0) {
        $mensajeVencimiento = "Su factura <strong style='color: #f59e0b;'>VENCE HOY</strong>.";
        $colorUrgencia = '#f59e0b';
    } else {
        $diasRestantes = abs($diasVencido);
        $mensajeVencimiento = "Su factura vence en <strong>{$diasRestantes} días</strong>.";
    }
    
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f7fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: {$colorUrgencia}; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0; }
            .content { padding: 30px; }
            .urgencia { background: {$colorUrgencia}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .factura-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #718096; border-radius: 0 0 12px 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>{$config['empresa']['nombre']}</h1>
                <p>Recordatorio de Factura</p>
            </div>
            <div class='content'>
                <div class='urgencia'>
                    <h2>ATENCIÓN REQUERIDA</h2>
                    <p>{$mensajeVencimiento}</p>
                </div>
                
                <p>Estimado/a <strong>{$factura['cliente_nombre']}</strong>,</p>
                
                <div class='factura-info'>
                    <h3>📄 Detalles de la Factura</h3>
                    <p><strong>Número:</strong> {$factura['consecutivo']}</p>
                    <p><strong>Vencimiento:</strong> " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "</p>
                    <p><strong>Total:</strong> ₡" . number_format($factura['total_factura'], 2) . "</p>
                    <p><strong>Saldo:</strong> ₡" . number_format($factura['saldo_pendiente'], 2) . "</p>
                </div>
                
                <h3>📞 Contacto para Pago</h3>
                <ul>
                    <li><strong>Teléfono:</strong> {$config['empresa']['telefono']}</li>
                    <li><strong>Email:</strong> {$config['empresa']['email']}</li>
                </ul>
                
                <p>Gracias por su atención.</p>
                <p><strong>{$config['empresa']['nombre']}</strong></p>
            </div>
            <div class='footer'>
                <p>Email automático generado el " . date('d/m/Y H:i:s') . "</p>
            </div>
        </div>
    </body>
    </html>";
}
?>