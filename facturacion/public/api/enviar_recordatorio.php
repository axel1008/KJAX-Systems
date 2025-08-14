<?php
declare(strict_types=1);

// ===== Rutas y dependencias =====
$root = dirname(__DIR__, 2); // de public/api -> raíz del proyecto
require_once $root . '/vendor/autoload.php';
require_once $root . '/src/service/SupabaseService.php';
require_once $root . '/src/service/EmailBasicoService.php';

// Carga .env si usas vlucas/phpdotenv
if (class_exists(\Dotenv\Dotenv::class)) {
    $dotenv = \Dotenv\Dotenv::createImmutable($root);
    $dotenv->safeLoad();
}

// ===== CORS / Headers =====
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ===== Entrada =====
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || empty($data['factura_id'])) {
    http_response_code(400);
    echo json_encode(['success'=>false, 'error' => 'ID de factura requerido (factura_id)']);
    exit;
}

$facturaId = (string)$data['factura_id'];

try {
    // ===== Config y servicios =====
    $config = include $root . '/config/email_config.php';
    $sb     = new SupabaseService();
    $email  = new EmailBasicoService();

    // ===== Obtener factura real =====
    $f = $sb->getFactura($facturaId);
    if (!$f) {
        http_response_code(404);
        echo json_encode(['success'=>false, 'error' => 'Factura no encontrada']);
        exit;
    }

    // ===== Cliente real =====
    $cliente = null;
    if (!empty($f['cliente_id'])) {
        $cliente = $sb->getCliente((string)$f['cliente_id']);
    }
    $emailCliente  = $cliente['email'] ?? $cliente['correo'] ?? ($data['email_cliente'] ?? null);
    $nombreCliente = $cliente['nombre'] ?? $cliente['razon_social'] ?? ($data['nombre_cliente'] ?? 'Cliente');

    if (!$emailCliente || !filter_var($emailCliente, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        echo json_encode(['success'=>false, 'error' => 'El cliente no tiene email válido']);
        exit;
    }

    // ===== Preparar datos de vencimiento =====
    $fechaVto = $f['fecha_vencimiento'] ?? null;
    if (!$fechaVto && ($f['condicion_venta'] ?? '') === '02') {
        $emision = !empty($f['fecha_emision']) ? new DateTime($f['fecha_emision']) : new DateTime('now', new DateTimeZone('America/Costa_Rica'));
        $plazo   = (int)($f['plazo_credito'] ?? 0);
        if ($plazo > 0) {
            $emision->modify("+{$plazo} day");
            $fechaVto = $emision->format('Y-m-d');
        }
    }

    // Totales
    $total = (float)($f['total_factura'] ?? 0);
    $saldo = (float)($f['saldo_pendiente'] ?? $total);

    // **BLOQUEO**: si saldo es 0, no permitir recordatorios manuales
    if ($saldo <= 0) {
        http_response_code(409);
        echo json_encode(['success'=>false, 'error'=>'La factura ya está saldada; no se permiten recordatorios.']);
        exit;
    }

    // Consecutivo
    $consecutivo = $f['consecutivo'] ?? substr((string)$f['id'], 0, 8);

    // Armar arreglo de factura para el template
    $factura = [
        'id'               => (string)$f['id'],
        'consecutivo'      => $consecutivo,
        'fecha_vencimiento'=> $fechaVto,
        'total_factura'    => $total,
        'saldo_pendiente'  => $saldo,
        'cliente_email'    => $emailCliente,
        'cliente_nombre'   => $nombreCliente,
    ];

    // ===== Días a/desde vencimiento =====
    $diasVencido = calcularDiasVencimiento($fechaVto);

    // ===== Asunto =====
    if ($diasVencido > 0) {
        $asunto = "⚠️ Factura Vencida #{$consecutivo} - " . ($config['empresa']['nombre'] ?? 'Mi Empresa');
    } elseif ($diasVencido === 0) {
        $asunto = "🔔 Factura VENCE HOY #{$consecutivo} - " . ($config['empresa']['nombre'] ?? 'Mi Empresa');
    } else {
        $asunto = "📅 Recordatorio: Factura por Vencer #{$consecutivo}";
    }

    // Tipo para el template (por claridad de mensaje)
    $tipo = ($diasVencido > 0) ? 'vencida' : (($diasVencido === 0) ? 'vence_hoy' : 'por_vencer');

    // ===== Mensaje HTML real =====
    $mensaje = generarMensajeHTML($factura, $config, $diasVencido, $tipo);

    // ===== Enviar =====
    $resultado = $email->enviarEmail($emailCliente, $asunto, $mensaje);

    if (!empty($resultado['success'])) {
        echo json_encode([
            'success'      => true,
            'message'      => 'Recordatorio enviado exitosamente',
            'destinatario' => $emailCliente,
            'asunto'       => $asunto
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error'   => $resultado['error'] ?? 'Error desconocido al enviar correo'
        ]);
    }

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success'=>false, 'error'=>$e->getMessage()]);
    error_log("[enviar_recordatorio] " . $e->getMessage());
    exit;
}


// ===== Helpers =====

function calcularDiasVencimiento(?string $fechaVencimiento): int {
    if (empty($fechaVencimiento)) return 0;
    $tz = new DateTimeZone('America/Costa_Rica');
    $hoy = new DateTime('today', $tz);
    $vto = new DateTime($fechaVencimiento, $tz);
    $diff = $hoy->diff($vto);
    return $vto < $hoy ? $diff->days : -$diff->days;
}

function generarMensajeHTML(array $factura, array $config, int $diasVencido, string $tipo = 'por_vencer'): string {
    $colorUrgencia = '#059669';
    if ($diasVencido > 0)       $colorUrgencia = '#dc2626';
    elseif ($diasVencido === 0) $colorUrgencia = '#f59e0b';

    if ($tipo === 'vencida') {
        $mensajeVenc = "Su factura está <strong style='color:#dc2626;'>VENCIDA</strong> hace <strong>{$diasVencido} días</strong>.";
    } elseif ($tipo === 'vence_hoy') {
        $mensajeVenc = "Su factura <strong style='color:#f59e0b;'>VENCE HOY</strong>.";
    } else {
        $dias = abs($diasVencido);
        $mensajeVenc = "Su factura vence en <strong>{$dias} días</strong>.";
    }

    $empresa = $config['empresa']['nombre'] ?? 'Mi Empresa';
    $tel     = $config['empresa']['telefono'] ?? '';
    $mail    = $config['empresa']['email'] ?? '';

    $consec  = htmlspecialchars($factura['consecutivo']);
    $nombre  = htmlspecialchars($factura['cliente_nombre']);
    $vtoFmt  = $factura['fecha_vencimiento'] ? date('d/m/Y', strtotime($factura['fecha_vencimiento'])) : 'No aplica';
    $total   = number_format((float)$factura['total_factura'], 2);
    $saldo   = number_format((float)$factura['saldo_pendiente'], 2);

    return "
    <!DOCTYPE html>
    <html><head><meta charset='UTF-8'>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f7fafc;}
        .container{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 4px 15px rgba(0,0,0,.1);}
        .header{background:{$colorUrgencia};color:#fff;padding:20px;text-align:center;border-radius:12px 12px 0 0;}
        .content{padding:30px;}
        .urgencia{background:{$colorUrgencia};color:#fff;padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;}
        .factura-info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;}
        .footer{background:#f8fafc;padding:15px;text-align:center;font-size:12px;color:#718096;border-radius:0 0 12px 12px;}
      </style>
    </head>
    <body>
      <div class='container'>
        <div class='header'>
          <h1>{$empresa}</h1>
          <p>Recordatorio de Factura</p>
        </div>
        <div class='content'>
          <div class='urgencia'><h2>ATENCIÓN</h2><p>{$mensajeVenc}</p></div>
          <p>Estimado/a <strong>{$nombre}</strong>,</p>
          <div class='factura-info'>
            <h3>📄 Detalles de la Factura</h3>
            <p><strong>Número:</strong> {$consec}</p>
            <p><strong>Vencimiento:</strong> {$vtoFmt}</p>
            <p><strong>Total:</strong> ₡{$total}</p>
            <p><strong>Saldo:</strong> ₡{$saldo}</p>
          </div>
          <h3>📞 Contacto para Pago</h3>
          <ul>
            <li><strong>Teléfono:</strong> {$tel}</li>
            <li><strong>Email:</strong> {$mail}</li>
          </ul>
          <p>Gracias por su atención.</p>
          <p><strong>{$empresa}</strong></p>
        </div>
        <div class='footer'>
          <p>Email automático generado el " . date('d/m/Y H:i:s') . "</p>
        </div>
      </div>
    </body></html>";
}
