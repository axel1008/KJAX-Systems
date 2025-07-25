<?php
// Configurar la zona horaria
date_default_timezone_set('America/Costa_Rica');

// Incluir dependencias
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../service/EmailBasicoService.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

echo "=== PRUEBA DE RECORDATORIOS REALES ===\n";
echo "Fecha: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // Cargar configuración
    $config = include __DIR__ . '/../../config/email_config.php';
    
    if (!$config) {
        throw new Exception('No se pudo cargar la configuración de email');
    }
    
    echo "✅ Configuración cargada correctamente\n";
    
    // Inicializar servicio de email
    $emailService = new EmailBasicoService();
    
    // Probar configuración SMTP
    echo "🔧 Probando configuración SMTP...\n";
    $testSMTP = $emailService->probarConfiguracion();
    
    if (!$testSMTP['success']) {
        throw new Exception("Error SMTP: " . $testSMTP['error']);
    }
    
    echo "✅ Configuración SMTP válida\n";
    echo "🚀 INICIANDO ENVÍO REAL DE EMAILS\n\n";
    
    // Obtener facturas simuladas
    $facturasPendientes = obtenerFacturasSimuladas();
    
    echo "📋 Facturas encontradas para recordatorio: " . count($facturasPendientes) . "\n\n";
    
    $exitosos = 0;
    $errores = 0;
    
    foreach ($facturasPendientes as $factura) {
        echo "📧 Procesando factura {$factura['consecutivo']}\n";
        echo "   📅 Vencimiento: {$factura['fecha_vencimiento']}\n";
        echo "   👤 Cliente: {$factura['cliente_nombre']} ({$factura['cliente_email']})\n";
        
        // Calcular días vencido
        $diasVencido = calcularDiasVencimiento($factura['fecha_vencimiento']);
        echo "   ⏰ Días de vencimiento: {$diasVencido}\n";
        
        // Enviar recordatorio REAL
        $resultado = enviarRecordatorioReal($factura, $config, $emailService);
        
        if ($resultado['success']) {
            echo "   ✅ Recordatorio enviado exitosamente\n";
            $exitosos++;
        } else {
            echo "   ❌ Error: {$resultado['error']}\n";
            $errores++;
        }
        
        echo "\n";
        
        // Delay entre envíos para no sobrecargar SMTP
        sleep(2);
    }
    
    echo "=== RESUMEN DE LA PRUEBA ===\n";
    echo "✅ Recordatorios enviados exitosamente: {$exitosos}\n";
    echo "❌ Errores: {$errores}\n";
    echo "📊 Total procesadas: " . ($exitosos + $errores) . "\n";
    echo "🕒 Finalizado: " . date('Y-m-d H:i:s') . "\n";
    
} catch (Exception $e) {
    echo "💥 ERROR CRÍTICO: " . $e->getMessage() . "\n";
    error_log("Error en prueba de recordatorios: " . $e->getMessage());
}

function obtenerFacturasSimuladas() {
    return [
        [
            'id' => 'test-001',
            'consecutivo' => '001001010000000001',
            'cliente_email' => 'tu-email@gmail.com',  // ✏️ CAMBIAR POR TU EMAIL PARA PRUEBAS
            'cliente_nombre' => 'Cliente de Prueba 1',
            'fecha_vencimiento' => date('Y-m-d', strtotime('+1 day')), // Vence mañana
            'total_factura' => 150000.00,
            'saldo_pendiente' => 150000.00
        ],
        [
            'id' => 'test-002',
            'consecutivo' => '001001010000000002',
            'cliente_email' => 'tu-email@gmail.com',  // ✏️ CAMBIAR POR TU EMAIL PARA PRUEBAS
            'cliente_nombre' => 'Cliente de Prueba 2',
            'fecha_vencimiento' => date('Y-m-d'), // Vence hoy
            'total_factura' => 75000.00,
            'saldo_pendiente' => 75000.00
        ]
    ];
}

function enviarRecordatorioReal($factura, $config, $emailService) {
    try {
        // Generar asunto
        $diasVencido = calcularDiasVencimiento($factura['fecha_vencimiento']);
        
        if ($diasVencido > 0) {
            $asunto = "⚠️ Factura Vencida #{$factura['consecutivo']} - {$config['empresa']['nombre']}";
            $urgencia = "VENCIDA";
        } elseif ($diasVencido === 0) {
            $asunto = "🔔 Factura Vence HOY #{$factura['consecutivo']} - {$config['empresa']['nombre']}";
            $urgencia = "VENCE HOY";
        } else {
            $asunto = "📅 Recordatorio: Factura por Vencer #{$factura['consecutivo']}";
            $urgencia = "POR VENCER";
        }
        
        // Generar mensaje
        $mensaje = generarMensajeRecordatorio($factura, $config, $diasVencido);
        
        echo "   📧 ENVIANDO recordatorio real a: {$factura['cliente_email']}\n";
        echo "   📝 Asunto: {$asunto}\n";
        echo "   🚨 Urgencia: {$urgencia}\n";
        
        // ENVÍO REAL
        return $emailService->enviarEmail($factura['cliente_email'], $asunto, $mensaje);
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function generarMensajeRecordatorio($factura, $config, $diasVencido) {
    $mensajeVencimiento = '';
    $colorUrgencia = '#059669'; // Verde por defecto
    
    if ($diasVencido > 0) {
        $mensajeVencimiento = "Su factura está <strong style='color: #dc2626;'>VENCIDA</strong> hace <strong>{$diasVencido} días</strong>.";
        $colorUrgencia = '#dc2626'; // Rojo
    } elseif ($diasVencido === 0) {
        $mensajeVencimiento = "Su factura <strong style='color: #f59e0b;'>VENCE HOY</strong>.";
        $colorUrgencia = '#f59e0b'; // Amarillo
    } else {
        $diasRestantes = abs($diasVencido);
        $mensajeVencimiento = "Su factura vence en <strong style='color: #059669;'>{$diasRestantes} días</strong>.";
        $colorUrgencia = '#059669'; // Verde
    }
    
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f7fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: {$colorUrgencia}; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; }
            .urgencia { background: {$colorUrgencia}; color: white; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
            .factura-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
            .btn { display: inline-block; background: {$colorUrgencia}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>{$config['empresa']['nombre']}</h1>
                <p>🔔 Recordatorio de Factura</p>
            </div>
            <div class='content'>
                <div class='urgencia'>
                    <h2>⚠️ ATENCIÓN REQUERIDA</h2>
                    <p>{$mensajeVencimiento}</p>
                </div>
                
                <p>Estimado/a <strong>{$factura['cliente_nombre']}</strong>,</p>
                
                <p>Le enviamos este recordatorio sobre el estado de su factura:</p>
                
                <div class='factura-info'>
                    <h3>📄 Detalles de la Factura</h3>
                    <p><strong>Número:</strong> {$factura['consecutivo']}</p>
                    <p><strong>Fecha de vencimiento:</strong> " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "</p>
                    <p><strong>Monto total:</strong> <span style='font-size: 18px; color: {$colorUrgencia}; font-weight: bold;'>₡" . number_format($factura['total_factura'], 2) . "</span></p>
                    <p><strong>Saldo pendiente:</strong> <span style='font-size: 18px; color: {$colorUrgencia}; font-weight: bold;'>₡" . number_format($factura['saldo_pendiente'], 2) . "</span></p>
                </div>
                
                <h3>📞 Información de Contacto para Pagos</h3>
                <ul style='line-height: 1.8;'>
                    <li><strong>📞 Teléfono:</strong> {$config['empresa']['telefono']}</li>
                    <li><strong>📧 Email:</strong> {$config['empresa']['email']}</li>
                    <li><strong>📍 Dirección:</strong> {$config['empresa']['direccion']}</li>
                    <li><strong>🌐 WhatsApp:</strong> {$config['empresa']['whatsapp']}</li>
                </ul>
                
                <div style='text-align: center; margin: 30px 0;'>
                    <a href='tel:{$config['empresa']['telefono']}' class='btn'>📞 Llamar Ahora</a>
                    <a href='mailto:{$config['empresa']['email']}' class='btn' style='background: #059669;'>📧 Enviar Email</a>
                </div>
                
                <p><strong>Agradecemos su pronta atención a este asunto.</strong></p>
                
                <p>Atentamente,<br>
                <strong>{$config['empresa']['nombre']}</strong><br>
                Departamento de Facturación</p>
            </div>
            <div class='footer'>
                <p><strong>📋 Este es un mensaje automático del sistema de facturación.</strong></p>
                <p>Generado el " . date('d/m/Y H:i:s') . " | ID: {$factura['id']}</p>
                <p style='margin-top: 10px; font-size: 10px; color: #a0aec0;'>
                    Sistema de Facturación KJAX | Todas las facturas son documentos legalmente válidos
                </p>
            </div>
        </div>
    </body>
    </html>";
}

function calcularDiasVencimiento($fechaVencimiento) {
    if (!$fechaVencimiento) return 0;
    
    $hoy = new DateTime();
    $vencimiento = new DateTime($fechaVencimiento);
    $diferencia = $hoy->diff($vencimiento);
    
    return $vencimiento < $hoy ? $diferencia->days : -$diferencia->days;
}
?>