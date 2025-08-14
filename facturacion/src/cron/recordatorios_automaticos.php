<?php
declare(strict_types=1);

/**
 * CRON: Recordatorios automáticos de facturas a crédito
 * - Tres días antes del vencimiento
 * - El día del vencimiento (recomendado 07:00 a.m. CR)
 *
 * Uso:
 *   php src/cron/recordatorios_automaticos.php
 *   php src/cron/recordatorios_automaticos.php --modo=vence_hoy
 *   php src/cron/recordatorios_automaticos.php --modo=tres_dias
 */

date_default_timezone_set('America/Costa_Rica');

/* ===================== Includes ===================== */
$base = dirname(__DIR__);        // .../src
$root = dirname($base);          // project root

$autoload = $root . '/vendor/autoload.php';
if (file_exists($autoload)) {
    require_once $autoload; // Composer (si lo usas)
}

$sbPath    = $base . '/service/SupabaseService.php';
$mailPath  = $base . '/service/EmailBasicoService.php';
if (file_exists($sbPath))   require_once $sbPath;
if (file_exists($mailPath)) require_once $mailPath;

$configMailPath = $root . '/config/email_config.php';
$configMail = file_exists($configMailPath) ? include $configMailPath : [
    'empresa' => ['nombre' => 'Tu Empresa']
];

/* ===== Aliases por si tus clases usan namespace App\Service ===== */
if (!class_exists('SupabaseService') && class_exists('\App\Service\SupabaseService')) {
    class_alias('\App\Service\SupabaseService', 'SupabaseService');
}
if (!class_exists('EmailBasicoService') && class_exists('\App\Service\EmailBasicoService')) {
    class_alias('\App\Service\EmailBasicoService', 'EmailBasicoService');
}

/* ===================== Helpers ===================== */

/** Lee --modo=... (vence_hoy|tres_dias|ambos) */
function leerModoDesdeCLI(array $argv): string {
    foreach ($argv as $arg) {
        if (strpos($arg, '--modo=') === 0) {
            $val = substr($arg, 7);
            if (in_array($val, ['vence_hoy','tres_dias','ambos'], true)) return $val;
        }
    }
    return 'ambos';
}

function asuntoRecordatorio(string $tipo, array $f): string {
    $num = !empty($f['consecutivo']) ? $f['consecutivo'] : substr((string)$f['id'], 0, 8);
    if ($tipo === 'emision') {
        return "📄 Factura emitida #{$num}";
    }
    return $tipo === 'tres_dias'
        ? "Recordatorio: factura {$num} vence en 3 días"
        : "Recordatorio: factura {$num} vence hoy";
}

function cuerpoRecordatorioHTML(string $tipo, array $f, array $empresa): string {
    $vence  = !empty($f['fecha_vencimiento']) ? date('d/m/Y', strtotime((string)$f['fecha_vencimiento'])) : 'N/D';
    $total  = (float)($f['total_factura'] ?? 0);
    $saldoP = (float)($f['saldo_pendiente'] ?? $total);
    $montoTotal  = number_format($total, 2);
    $montoSaldo  = number_format($saldoP, 2);
    $moneda = !empty($f['moneda']) ? $f['moneda'] : 'CRC';
    $num    = !empty($f['consecutivo']) ? htmlspecialchars((string)$f['consecutivo']) : substr((string)$f['id'], 0, 8);

    $empresaNombre = htmlspecialchars((string)($empresa['nombre'] ?? 'Tu Empresa'));

    $mensajeTipo = [
        'emision'    => "Se ha emitido tu factura.",
        'tres_dias'  => "Tu factura vence en 3 días (fecha de pago {$vence}).",
        'vence_hoy'  => "Tu factura vence <strong>hoy</strong> ({$vence}).",
    ][$tipo] ?? "Recordatorio de factura.";

    return "
  <div style='font-family:Arial,sans-serif;max-width:600px;margin:auto'>
    <h2>Recordatorio de pago</h2>
    <p>{$mensajeTipo}</p>
    <ul>
      <li><strong>Número:</strong> {$num}</li>
      <li><strong>Vencimiento:</strong> {$vence}</li>
      <li><strong>Total:</strong> {$moneda} {$montoTotal}</li>
      <li><strong>Saldo pendiente:</strong> {$moneda} {$montoSaldo}</li>
    </ul>
    <p>Si ya realizaste el pago, puedes ignorar este mensaje.</p>
    <hr>
    <p style='font-size:12px;color:#666'>Este es un mensaje automático de {$empresaNombre}.</p>
  </div>";
}

/**
 * Envía un recordatorio y registra en log si fue exitoso.
 */
function procesarLote(string $tipo, array $facturas, $sb, $mailer, array $configMail): array {
    $ok = 0; $err = 0;

    if (!is_object($sb) || !method_exists($sb, 'yaSeEnvioRecordatorio') || !method_exists($sb, 'registrarRecordatorio') || !method_exists($sb, 'getFactura')) {
        throw new RuntimeException('SupabaseService no válido o métodos faltantes.');
    }
    if (!is_object($mailer) || !method_exists($mailer, 'enviarCorreoBasico')) {
        throw new RuntimeException('EmailBasicoService no válido o método enviarCorreoBasico faltante.');
    }

    foreach ($facturas as $f) {
        $fid = (string)$f['id'];

        // Idempotencia por tipo
        if ($sb->yaSeEnvioRecordatorio($fid, $tipo)) {
            echo " - Saltando {$fid} (ya enviado {$tipo})\n";
            continue;
        }

        // REFRESCAR datos de la factura para leer saldo actualizado
        $fRef = $sb->getFactura($fid) ?: $f;
        $total = (float)($fRef['total_factura'] ?? 0);
        $saldo = (float)($fRef['saldo_pendiente'] ?? $total);

        // Si ya está saldada, no enviar (pago total)
        if ($saldo <= 0) {
            echo " - Saltando {$fid} (saldo 0, ya pagada)\n";
            continue;
        }

        // Obtener email del cliente
        $emailCliente = $fRef['cliente_email'] ?? null;
        if (!$emailCliente && !empty($fRef['cliente_id']) && method_exists($sb, 'getCliente')) {
            $cliente = $sb->getCliente((string)$fRef['cliente_id']);
            $emailCliente = $cliente['email'] ?? $cliente['correo'] ?? null;
        }
        if (!$emailCliente) {
            echo " - Sin email de cliente, no se envía (factura {$fid}).\n";
            $err++;
            continue;
        }

        // Enriquecer la data que va al template (incluye saldo)
        $fData = $fRef;
        $fData['saldo_pendiente'] = $saldo;

        $subject = asuntoRecordatorio($tipo, $fData);
        $html    = cuerpoRecordatorioHTML($tipo, $fData, $configMail['empresa'] ?? []);

        $res = $mailer->enviarCorreoBasico($emailCliente, $subject, $html);
        $exito = is_array($res) ? !empty($res['success']) : (bool)$res;

        if ($exito) {
            $sb->registrarRecordatorio($fid, $tipo);
            $ok++;
            echo " - Enviado OK a {$emailCliente}\n";
        } else {
            $err++;
            $msg = is_array($res) && !empty($res['error']) ? $res['error'] : 'Error desconocido';
            echo " - Error al enviar a {$emailCliente}: {$msg}\n";
        }
    }

    return ['ok' => $ok, 'err' => $err];
}

/* ===================== Main ===================== */

echo "=== Recordatorios automáticos === " . date('Y-m-d H:i:s') . " (America/Costa_Rica)\n";

try {
    $sbClass = class_exists('SupabaseService') ? 'SupabaseService'
             : (class_exists('\App\Service\SupabaseService') ? '\App\Service\SupabaseService' : null);
    if (!$sbClass) throw new RuntimeException('No se encontró SupabaseService');
    $sb = new $sbClass();

    $mailerClass = class_exists('EmailBasicoService') ? 'EmailBasicoService'
                 : (class_exists('\App\Service\EmailBasicoService') ? '\App\Service\EmailBasicoService' : null);
    if (!$mailerClass) throw new RuntimeException('No se encontró EmailBasicoService');
    $mailer = new $mailerClass();

    $modo = PHP_SAPI === 'cli' ? leerModoDesdeCLI($argv) : 'ambos';
    echo "Modo: {$modo}\n";

    $tz = new DateTimeZone('America/Costa_Rica');
    $hoy  = (new DateTime('now', $tz))->format('Y-m-d');
    $mas3 = (new DateTime('now', $tz))->modify('+3 day')->format('Y-m-d');

    if ($modo === 'vence_hoy' || $modo === 'ambos') {
        echo "[Lote] VENCE HOY ({$hoy})\n";
        if (!method_exists($sb, 'getFacturasPorVencimiento')) {
            throw new RuntimeException('Falta método getFacturasPorVencimiento en SupabaseService');
        }
        $lista = $sb->getFacturasPorVencimiento($hoy);
        $res = procesarLote('vence_hoy', $lista, $sb, $mailer, $configMail);
        echo "Resumen vence hoy → enviados: {$res['ok']}, errores: {$res['err']}\n";
    }

    if ($modo === 'tres_dias' || $modo === 'ambos') {
        echo "[Lote] TRES DÍAS ANTES ({$mas3})\n";
        $lista = $sb->getFacturasPorVencimiento($mas3);
        $res = procesarLote('tres_dias', $lista, $sb, $mailer, $configMail);
        echo "Resumen 3 días antes → enviados: {$res['ok']}, errores: {$res['err']}\n";
    }

    echo "✔ Finalizado\n";
    exit(0);

} catch (Throwable $e) {
    error_log("[Recordatorios] " . $e->getMessage());
    fwrite(STDERR, "✖ Error: " . $e->getMessage() . "\n");
    exit(1);
}
