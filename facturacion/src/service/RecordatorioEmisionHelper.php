<?php
declare(strict_types=1);

require_once __DIR__ . '/SupabaseService.php';
require_once __DIR__ . '/EmailBasicoService.php';

class RecordatorioEmisionHelper
{
    /**
     * Envía el recordatorio de EMISIÓN al crear una factura de crédito.
     * No altera tu flujo; solo llámalo luego de guardar la factura.
     */
    public static function enviarRecordatorioEmisionSiCredito(array $factura): void
    {
        // crédito típico en CR = '02'
        $esCredito = (($factura['condicion_venta'] ?? '') === '02');
        $total     = (float)($factura['total_factura'] ?? 0);
        $saldo     = (float)($factura['saldo_pendiente'] ?? $total);

        if (!$esCredito || $saldo <= 0) return;
        if (empty($factura['id'])) return;

        $sb = new SupabaseService();
        // Evitar duplicados por tipo 'emision'
        if ($sb->yaSeEnvioRecordatorio((string)$factura['id'], 'emision')) return;

        $config = include dirname(__DIR__, 2) . '/config/email_config.php';
        $mailer = new EmailBasicoService();

        // Cliente
        $emailCliente = null;
        $nombreCliente = 'Cliente';
        if (!empty($factura['cliente_id'])) {
            $cli = $sb->getCliente((string)$factura['cliente_id']);
            $emailCliente  = $cli['email'] ?? $cli['correo'] ?? null;
            $nombreCliente = $cli['nombre'] ?? $cli['razon_social'] ?? 'Cliente';
        }
        if (!$emailCliente || !filter_var($emailCliente, FILTER_VALIDATE_EMAIL)) return;

        $consecutivo = $factura['consecutivo'] ?? substr((string)$factura['id'], 0, 8);
        $asunto  = "📄 Factura emitida #{$consecutivo} - " . ($config['empresa']['nombre'] ?? 'Mi Empresa');

        // Plantilla simple con saldo
        $msg = self::mensajeEmisionHTML([
            'id'               => (string)$factura['id'],
            'consecutivo'      => $consecutivo,
            'fecha_vencimiento'=> $factura['fecha_vencimiento'] ?? null,
            'total_factura'    => $total,
            'saldo_pendiente'  => $saldo,
            'cliente_email'    => $emailCliente,
            'cliente_nombre'   => $nombreCliente,
        ], $config);

        $res = $mailer->enviarEmail($emailCliente, $asunto, $msg);
        if (!empty($res['success'])) {
            $sb->registrarRecordatorio((string)$factura['id'], 'emision');
        }
    }

    private static function mensajeEmisionHTML(array $factura, array $config): string
    {
        $empresa = $config['empresa']['nombre'] ?? 'Mi Empresa';
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
            .header{background:#2563eb;color:#fff;padding:20px;text-align:center;border-radius:12px 12px 0 0;}
            .content{padding:30px;}
            .factura-info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin:20px 0;}
            .footer{background:#f8fafc;padding:15px;text-align:center;font-size:12px;color:#718096;border-radius:0 0 12px 12px;}
          </style>
        </head>
        <body>
          <div class='container'>
            <div class='header'>
              <h1>{$empresa}</h1>
              <p>Factura emitida</p>
            </div>
            <div class='content'>
              <p>Estimado/a <strong>{$nombre}</strong>,</p>
              <p>Te compartimos los detalles de tu factura.</p>
              <div class='factura-info'>
                <h3>📄 Detalles</h3>
                <p><strong>Número:</strong> {$consec}</p>
                <p><strong>Vencimiento:</strong> {$vtoFmt}</p>
                <p><strong>Total:</strong> ₡{$total}</p>
                <p><strong>Saldo:</strong> ₡{$saldo}</p>
              </div>
              <p>Gracias por tu preferencia.</p>
              <p><strong>{$empresa}</strong></p>
            </div>
            <div class='footer'>
              <p>Email automático generado el " . date('d/m/Y H:i:s') . "</p>
            </div>
          </div>
        </body></html>";
    }
}
