<?php
// Configurar la zona horaria
date_default_timezone_set('America/Costa_Rica');

// Incluir dependencias
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../service/EmailBasicoService.php';

// Usar PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

echo "=== INICIANDO PROCESO DE RECORDATORIOS AUTOMÁTICOS ===\n";
echo "Fecha: " . date('Y-m-d H:i:s') . "\n\n";

try {
    // Cargar configuración
    $config = include __DIR__ . '/../../config/email_config.php';
    
    if (!$config) {
        throw new Exception('No se pudo cargar la configuración de email');
    }
    
    echo "✅ Configuración cargada correctamente\n";
    
    // Verificar horario
    $horaActual = date('H:i');
    $diaActual = date('N'); // 1=Lunes, 7=Domingo
    
    $horarioInicio = $config['automatico']['horario_envio'][0];
    $horarioFin = $config['automatico']['horario_envio'][1];
    
    echo "🕒 Hora actual: {$horaActual}\n";
    echo "📅 Día actual: {$diaActual} (1=Lun, 7=Dom)\n";
    
    if ($horaActual < $horarioInicio || $horaActual > $horarioFin) {
        echo "❌ Fuera del horario de envío ({$horarioInicio} - {$horarioFin})\n";
        exit;
    }
    
    if ($config['automatico']['dias_habiles'] && ($diaActual == 6 || $diaActual == 7)) {
        echo "❌ No es día hábil (sábado/domingo)\n";
        exit;
    }
    
    echo "✅ Horario y día válidos para envío\n";
    
    // Simular obtención de facturas (reemplazar con tu lógica de Supabase)
    $facturasPendientes = obtenerFacturasSimuladas();
    
    echo "📋 Facturas encontradas para recordatorio: " . count($facturasPendientes) . "\n\n";
    
    $exitosos = 0;
    $errores = 0;
    
    // Inicializar servicio de email
    $emailService = new EmailBasicoService();
    
    foreach ($facturasPendientes as $factura) {
        echo "📧 Procesando factura {$factura['consecutivo']}\n";
        echo "   📅 Vencimiento: {$factura['fecha_vencimiento']}\n";
        echo "   👤 Cliente: {$factura['cliente_nombre']} ({$factura['cliente_email']})\n";
        
        // Calcular días vencido
        $diasVencido = calcularDiasVencimiento($factura['fecha_vencimiento']);
        echo "   ⏰ Días de vencimiento: {$diasVencido}\n";
        
        // Enviar recordatorio
        $resultado = enviarRecordatorioSimulado($factura, $config, $emailService);
        
        if ($resultado['success']) {
            echo "   ✅ Recordatorio enviado exitosamente\n";
            $exitosos++;
        } else {
            echo "   ❌ Error: {$resultado['error']}\n";
            $errores++;
        }
        
        echo "\n";
        
        // Delay entre envíos
        if (isset($config['tecnico']['delay_entre_envios']) && $config['tecnico']['delay_entre_envios'] > 0) {
            sleep($config['tecnico']['delay_entre_envios']);
        }
    }
    
    echo "=== RESUMEN DEL PROCESO ===\n";
    echo "✅ Recordatorios enviados exitosamente: {$exitosos}\n";
    echo "❌ Errores: {$errores}\n";
    echo "📊 Total procesadas: " . ($exitosos + $errores) . "\n";
    echo "🕒 Finalizado: " . date('Y-m-d H:i:s') . "\n";
    
} catch (Exception $e) {
    echo "💥 ERROR CRÍTICO: " . $e->getMessage() . "\n";
    error_log("Error en recordatorios automáticos: " . $e->getMessage());
}

function obtenerFacturasSimuladas() {
    // Datos de prueba - reemplazar con tu consulta a Supabase
    return [
        [
            'id' => 'test-001',
            'consecutivo' => '001001010000000001',
            'cliente_email' => 'cliente@test.com',
            'cliente_nombre' => 'Cliente de Prueba',
            'fecha_vencimiento' => date('Y-m-d', strtotime('+1 day')),
            'total_factura' => 150000.00,
            'saldo_pendiente' => 150000.00
        ],
        [
            'id' => 'test-002',
            'consecutivo' => '001001010000000002',
            'cliente_email' => 'cliente2@test.com',
            'cliente_nombre' => 'Segundo Cliente',
            'fecha_vencimiento' => date('Y-m-d', strtotime('-5 days')),
            'total_factura' => 75000.00,
            'saldo_pendiente' => 75000.00
        ]
    ];
}

function enviarRecordatorioSimulado($factura, $config, $emailService) {
    try {
        // Generar asunto
        $diasVencido = calcularDiasVencimiento($factura['fecha_vencimiento']);
        
        if ($diasVencido > 0) {
            $asunto = "⚠️ Factura Vencida #{$factura['consecutivo']} - {$config['empresa']['nombre']}";
        } else {
            $asunto = "🔔 Recordatorio: Factura por Vencer #{$factura['consecutivo']}";
        }
        
        // Generar mensaje
        $mensaje = generarMensajeRecordatorio($factura, $config, $diasVencido);
        
        // Simular envío (comentar esta línea y descomentar la siguiente para envío real)
        echo "   📧 SIMULANDO envío de recordatorio a: {$factura['cliente_email']}\n";
        echo "   📝 Asunto: {$asunto}\n";
        
        // Para envío real, descomentar esta línea:
        // return $emailService->enviarEmail($factura['cliente_email'], $asunto, $mensaje);
        
        return ['success' => true, 'message' => 'Simulación exitosa'];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

function generarMensajeRecordatorio($factura, $config, $diasVencido) {
    $mensajeVencimiento = '';
    if ($diasVencido > 0) {
        $mensajeVencimiento = "Su factura está <strong>VENCIDA</strong> hace <strong>{$diasVencido} días</strong>.";
    } elseif ($diasVencido === 0) {
        $mensajeVencimiento = "Su factura <strong>VENCE HOY</strong>.";
    } else {
        $diasRestantes = abs($diasVencido);
        $mensajeVencimiento = "Su factura vence en <strong>{$diasRestantes} días</strong>.";
    }
    
    return "
    <h2>Recordatorio de Factura</h2>
    <p>Estimado/a {$factura['cliente_nombre']},</p>
    <p>{$mensajeVencimiento}</p>
    
    <h3>Detalles de la Factura:</h3>
    <ul>
        <li><strong>Número:</strong> {$factura['consecutivo']}</li>
        <li><strong>Fecha de vencimiento:</strong> " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "</li>
        <li><strong>Monto total:</strong> ₡" . number_format($factura['total_factura'], 2) . "</li>
        <li><strong>Saldo pendiente:</strong> ₡" . number_format($factura['saldo_pendiente'], 2) . "</li>
    </ul>
    
    <h3>Para proceder con el pago:</h3>
    <ul>
        <li><strong>Teléfono:</strong> {$config['empresa']['telefono']}</li>
        <li><strong>Email:</strong> {$config['empresa']['email']}</li>
    </ul>
    
    <p>Agradecemos su pronta atención.</p>
    <p>Saludos cordiales,<br><strong>{$config['empresa']['nombre']}</strong></p>
    ";
}

function calcularDiasVencimiento($fechaVencimiento) {
    if (!$fechaVencimiento) return 0;
    
    $hoy = new DateTime();
    $vencimiento = new DateTime($fechaVencimiento);
    $diferencia = $hoy->diff($vencimiento);
    
    return $vencimiento < $hoy ? $diferencia->days : -$diferencia->days;
}
?>