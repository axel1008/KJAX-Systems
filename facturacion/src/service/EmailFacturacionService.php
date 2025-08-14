<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;
use Dompdf\Dompdf;
use Dompdf\Options;

class EmailFacturacionService {
    private $mailer;
    private $config;
    private $supabase;
    
    public function __construct($supabaseClient) {
        $this->supabase = $supabaseClient;
        $this->config = include __DIR__ . '/../../config/email_config.php';
        $this->setupMailer();
    }
    
    private function setupMailer() {
        $this->mailer = new PHPMailer(true);
        
        try {
            // Configuración SMTP
            $this->mailer->isSMTP();
            $this->mailer->Host = $this->config['smtp']['host'];
            $this->mailer->SMTPAuth = true;
            $this->mailer->Username = $this->config['smtp']['username'];
            $this->mailer->Password = $this->config['smtp']['password'];
            $this->mailer->Port = $this->config['smtp']['port'];
            $this->mailer->CharSet = 'UTF-8';
            
            // Configuración SSL para Gmail
            if ($this->config['smtp']['host'] === 'smtp.gmail.com') {
                $this->mailer->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $this->mailer->SMTPAutoTLS = true;
            } else {
                $this->mailer->SMTPSecure = $this->config['smtp']['encryption'];
            }
            
            // Opciones SSL para evitar problemas de certificados
            $this->mailer->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            // Configuración del remitente
            $this->mailer->setFrom(
                $this->config['from']['email'], 
                $this->config['from']['name']
            );
            
            // Configuraciones adicionales
            $this->mailer->isHTML(true);
            $this->mailer->Timeout = 30;
            $this->mailer->SMTPKeepAlive = true;
            
        } catch (Exception $e) {
            error_log("Error configurando mailer: " . $e->getMessage());
            throw new Exception("Error de configuración de email: " . $e->getMessage());
        }
    }
    
    /**
     * Enviar factura completa con todos los archivos
     */
    public function enviarFacturaCompleta($facturaId, $forzarReenvio = false) {
        try {
            // Obtener datos completos
            $factura = $this->obtenerFacturaCompleta($facturaId);
            if (!$factura) {
                throw new Exception("Factura no encontrada: {$facturaId}");
            }
            
            $cliente = $this->obtenerCliente($factura['cliente_id']);
            if (!$cliente) {
                throw new Exception("Cliente no encontrado para factura: {$facturaId}");
            }
            
            // Validar email del cliente
            if (!$cliente['email'] || !filter_var($cliente['email'], FILTER_VALIDATE_EMAIL)) {
                throw new Exception("El cliente no tiene un email válido: " . ($cliente['email'] ?? 'sin email'));
            }
            
            // Verificar si ya fue enviada (a menos que sea reenvío)
            if (!$forzarReenvio && isset($factura['estado_envio']) && $factura['estado_envio'] === 'enviado') {
                return [
                    'success' => false,
                    'message' => 'La factura ya fue enviada. Use forzarReenvio=true para reenviar.'
                ];
            }
            
            // Generar archivos si no existen
            $archivos = $this->prepararArchivosFactura($factura);
            
            // Limpiar mailer
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            $this->mailer->clearCCs();
            $this->mailer->clearBCCs();
            
            // Configurar destinatario
            $this->mailer->addAddress($cliente['email'], $cliente['nombre']);
            
            // Agregar copia oculta si está configurado
            if (!empty($this->config['copia']['bcc'])) {
                $this->mailer->addBCC($this->config['copia']['bcc']);
            }
            
            // Configurar asunto
            $this->mailer->Subject = $this->generarAsunto($factura);
            
            // Generar cuerpo del email
            $this->mailer->Body = $this->generarCuerpoHTML($factura, $cliente, $archivos);
            $this->mailer->AltBody = $this->generarCuerpoTexto($factura, $cliente);
            
// Adjuntar archivos
$archivosAdjuntos = [];

// 1. PDF Principal
if ($archivos['pdf']) {
    $nombrePDF = $this->generarNombreArchivo($factura, 'pdf');
    $this->mailer->addStringAttachment(
        base64_decode($archivos['pdf']),
        $nombrePDF,
        'base64',
        'application/pdf'
    );
    $archivosAdjuntos[] = $nombrePDF;
}

// 2. XML Firmado (solo para facturas electrónicas)
if (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA' && $archivos['xml_firmado']) {
    $nombreXMLFirmado = $this->generarNombreArchivo($factura, 'xml_firmado');
    $this->mailer->addStringAttachment(
        base64_decode($archivos['xml_firmado']),
        $nombreXMLFirmado,
        'base64',
        'application/xml'
    );
    $archivosAdjuntos[] = $nombreXMLFirmado;
}

// 3. XML Respuesta (solo si existe respuesta de Hacienda)
if (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA' && $archivos['xml_respuesta']) {
    $nombreXMLRespuesta = $this->generarNombreArchivo($factura, 'xml_respuesta');
    $this->mailer->addStringAttachment(
        base64_decode($archivos['xml_respuesta']),
        $nombreXMLRespuesta,
        'base64',
        'application/xml'
    );
    $archivosAdjuntos[] = $nombreXMLRespuesta;
}



            
            // Enviar email
            $envioExitoso = $this->mailer->send();
            
            if ($envioExitoso) {
                // Actualizar estado en base de datos
                $this->actualizarEstadoEnvio($facturaId, 'enviado', $archivosAdjuntos);
                
                // Registrar envío
                $this->registrarEnvio(
                    $facturaId, 
                    $cliente['email'], 
                    'factura_completa', 
                    'enviado',
                    null,
                    $archivosAdjuntos
                );
                
                return [
                    'success' => true,
                    'message' => 'Factura enviada exitosamente',
                    'destinatario' => $cliente['email'],
                    'archivos_enviados' => $archivosAdjuntos,
                    'fecha_envio' => date('Y-m-d H:i:s')
                ];
            } else {
                throw new Exception('Error desconocido al enviar el email');
            }
            
        } catch (PHPMailerException $e) {
            $errorMsg = "Error PHPMailer: " . $e->getMessage();
            error_log($errorMsg);
            
            if (isset($facturaId) && isset($cliente['email'])) {
                $this->registrarEnvio($facturaId, $cliente['email'], 'factura_completa', 'error', $errorMsg);
            }
            
            return [
                'success' => false,
                'error' => $errorMsg,
                'tipo_error' => 'phpmailer'
            ];
            
        } catch (Exception $e) {
            $errorMsg = $e->getMessage();
            error_log("Error enviando factura: " . $errorMsg);
            
            if (isset($facturaId) && isset($cliente['email'])) {
                $this->registrarEnvio($facturaId, $cliente['email'], 'factura_completa', 'error', $errorMsg);
            }
            
            return [
                'success' => false,
                'error' => $errorMsg,
                'tipo_error' => 'general'
            ];
        }
    }
    
    /**
     * Preparar todos los archivos necesarios
     */
    private function prepararArchivosFactura($factura) {
    $archivos = [
        'pdf' => null,
        'xml_firmado' => null,
        'xml_respuesta' => null
    ];
    
    // 1. PDF - Buscar en múltiples campos posibles
    if (!empty($factura['pdf_generado'])) {
        // DESHABILITADO: evitar PDF cacheado
// $archivos['pdf'] = \$factura['pdf_generado'];
} else if (!empty($factura['pdf_base64'])) {
        // DESHABILITADO: evitar PDF base64 previo
// $archivos['pdf'] = \$factura['pdf_base64'];
} else if (!empty($factura['pdf_url'])) {
        // Si hay una URL del PDF, descargarlo
        try {
            $pdfContent = file_get_contents($factura['pdf_url']);
            $archivos['pdf'] = base64_encode($pdfContent);
        } catch (Exception $e) {
            error_log("Error descargando PDF desde URL: " . $e->getMessage());
        }
    }
    
    // Si aún no hay PDF, generarlo DIRECTAMENTE (SIN cURL)
    if (!$archivos['pdf']) {
        try {
            error_log("📄 Generando PDF directamente...");
            error_log('PDF unificado: generarPDFDirecto');
$archivos['pdf'] = $this->generarPDFDirecto($factura);
            
            // Guardar PDF en base de datos para futuras consultas
            try {
                $this->supabase->updateFacturaEstado($factura['id'], 'pdf_generado', [
                    'pdf_generado' => $archivos['pdf']
                ]);
            } catch (Exception $e) {
                error_log("Error guardando PDF en BD: " . $e->getMessage());
            }
            
        } catch (Exception $e) {
            error_log("Error generando PDF directo: " . $e->getMessage());
            // Crear PDF básico de respaldo
            // DESHABILITADO: evitar fallback a plantilla básica
// $archivos['pdf'] = \$this->generarPDFBasico(\$factura);
}
    }
        
        // 2. XML Firmado (solo facturas electrónicas)
        if (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA') {
            if (!empty($factura['xml_firmado'])) {
                // Si es base64, usarlo directamente
                if ($this->isBase64($factura['xml_firmado'])) {
                    $archivos['xml_firmado'] = $factura['xml_firmado'];
                } else {
                    // Si es XML plano, convertir a base64
                    $archivos['xml_firmado'] = base64_encode($factura['xml_firmado']);
                }
            } else if (!empty($factura['xml'])) {
                // Usar XML normal si no hay firmado
                if ($this->isBase64($factura['xml'])) {
                    $archivos['xml_firmado'] = $factura['xml'];
                } else {
                    $archivos['xml_firmado'] = base64_encode($factura['xml']);
                }
            }
        }
        
        // 3. XML Respuesta (si existe)
        if (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA' && !empty($factura['xml_respuesta'])) {
            if ($this->isBase64($factura['xml_respuesta'])) {
                $archivos['xml_respuesta'] = $factura['xml_respuesta'];
            } else {
                $archivos['xml_respuesta'] = base64_encode($factura['xml_respuesta']);
            }
        }
        
        return $archivos;
    }
    
    /**
     * Generar PDF directamente con DOMPDF (SIN cURL)
     */
    private function generarPDFDirecto($factura) {
    try {
        // Dompdf config
        $options = new Options();
        $options->set('defaultFont', 'DejaVu Sans');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('chroot', realpath(__DIR__ . '/../../'));
        $dompdf = new Dompdf($options);

        // Datos
        $cliente = $this->obtenerCliente($factura['cliente_id']);
        $emisor = $this->obtenerEmisor();
        $detalles = $this->obtenerDetallesFactura($factura['id']);
        $config = include __DIR__ . '/../../config/pdf_config.php';

        // Plantilla unificada
        require_once __DIR__ . '/../templates/factura_template.php';
        $receptor = [
            'nombre' => $cliente['nombre'] ?? ($factura['receptor_nombre'] ?? 'Cliente'),
            'email'  => $cliente['email'] ?? ($factura['receptor_email'] ?? ''),
            'telefono' => $cliente['telefono'] ?? ($factura['receptor_telefono'] ?? ''),
            'tipo_identificacion' => $cliente['tipo_identificacion'] ?? ($factura['receptor_tipo_identificacion'] ?? ''),
            'identificacion' => $cliente['identificacion'] ?? ($factura['receptor_identificacion'] ?? ''),
            'provincia' => $cliente['provincia'] ?? ($factura['receptor_provincia'] ?? ''),
            'canton' => $cliente['canton'] ?? ($factura['receptor_canton'] ?? ''),
            'distrito' => $cliente['distrito'] ?? ($factura['receptor_distrito'] ?? ''),
            'barrio' => $cliente['barrio'] ?? ($factura['receptor_barrio'] ?? ''),
            'otras_senas' => $cliente['otras_senas'] ?? ($factura['receptor_otras_senas'] ?? ''),
        ];
        $html = renderFacturaHTML($factura, $emisor, $receptor, $detalles, $config);

        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        $pdfContent = $dompdf->output();
        return base64_encode($pdfContent);
    } catch (Exception $e) {
        error_log('Error generarPDFDirecto unificado: ' . $e->getMessage());
        throw $e;
    }
}

    
    /**
     * Generar HTML para la factura (función completa)
     */
    private function generarHTMLFactura($factura, $emisor, $receptor, $detalles, $config) {
        // Calcular totales
        $subtotal = 0;
        $totalImpuestos = 0;
        $totalDescuentos = 0;
        
        foreach ($detalles as $detalle) {
            $cantidad = floatval($detalle['cantidad'] ?? 0);
            $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
            $impuesto = floatval($detalle['impuesto'] ?? 13);
            $descuento = floatval($detalle['descuento'] ?? 0);
            
            $lineaSubtotal = $cantidad * $precioUnitario;
            $lineaDescuento = $lineaSubtotal * ($descuento / 100);
            $lineaImpuesto = ($lineaSubtotal - $lineaDescuento) * ($impuesto / 100);
            
            $subtotal += $lineaSubtotal;
            $totalDescuentos += $lineaDescuento;
            $totalImpuestos += $lineaImpuesto;
        }
        $total = $subtotal - $totalDescuentos + $totalImpuestos;

        // Generar QR si es electrónica
        $qrCodeBase64 = '';
        if (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' && !empty($factura['clave'])) {
            require_once __DIR__ . '/../QRGenerator.php';
            $qrData = $factura['clave'] . ',' . $factura['fecha_emision'] . ',' . $emisor['numero_identificacion'] . ',' . $receptor['identificacion'] . ',' . number_format($total, 2, '.', '');
            $qrCodeBase64 = QRGenerator::generateQRBase64($qrData, 120);
        }

        return '
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { margin: 15mm; size: A4 portrait; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: "DejaVu Sans", Arial, sans-serif; 
                    font-size: 10px; 
                    line-height: 1.4; 
                    color: #2d3748;
                }
                
                .header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                }
                
                .header-grid { display: table; width: 100%; }
                .header-left, .header-center, .header-right {
                    display: table-cell; vertical-align: top; padding: 0 10px;
                }
                .header-left { width: 30%; }
                .header-center { width: 40%; }
                .header-right { width: 30%; }
                
                .company-logo {
                    width: 70px; height: 70px;
                    background: rgba(255,255,255,0.2);
                    border-radius: 15px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: bold;
                }
                
                .company-name {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                
                .invoice-badge {
                    background: rgba(255,255,255,0.15);
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 12px;
                    padding: 15px;
                    text-align: center;
                }
                
                .invoice-type {
                    font-size: 14px;
                    font-weight: bold;
                    margin-bottom: 8px;
                    text-transform: uppercase;
                }
                
                .info-section {
                    margin: 20px 0;
                    display: table;
                    width: 100%;
                    border-spacing: 15px;
                }
                
                .info-card {
                    display: table-cell;
                    width: 48%;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border: 1px solid #cbd5e0;
                    border-radius: 12px;
                    padding: 18px;
                    vertical-align: top;
                }
                
                .card-header {
                    background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 8px;
                    font-size: 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin: -18px -18px 15px -18px;
                    text-align: center;
                }
                
                .products-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    margin: 20px 0;
                }
                .products-table th {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 10px 6px;
                    font-size: 8px;
                    font-weight: bold;
                    text-transform: uppercase;
                    text-align: center;
                }
                .products-table td {
                    padding: 8px 6px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 9px;
                    vertical-align: top;
                }
                .products-table tr:nth-child(even) {
                    background: #f7fafc;
                }
                
                .totals-card {
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border: 2px solid #667eea;
                    border-radius: 12px;
                    overflow: hidden;
                    margin: 20px 0;
                    width: 300px;
                    float: right;
                }
                .totals-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 10px;
                    font-size: 10px;
                    font-weight: bold;
                    text-transform: uppercase;
                    text-align: center;
                }
                .totals-content { padding: 15px; }
                .total-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 0;
                    font-size: 10px;
                    border-bottom: 1px solid #e2e8f0;
                }
                .final-total {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    margin: 10px -15px -15px -15px;
                    padding: 12px 15px;
                    font-size: 12px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                }
                
                .footer {
                    margin-top: 30px;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                    border: 1px solid #cbd5e0;
                    border-radius: 12px;
                    padding: 20px;
                    text-align: center;
                    clear: both;
                }
                
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
            </style>
        </head>
        <body>
            <!-- Header -->
            <div class="header">
                <div class="header-grid">
                    <div class="header-left">
                        <div class="company-logo">' . htmlspecialchars($config['empresa']['codigo_logo']) . '</div>
                    </div>
                    <div class="header-center">
                        <div class="company-name">' . htmlspecialchars($config['empresa']['nombre']) . '</div>
                        <div style="font-size: 9px; margin-top: 5px;">
                            <strong>Cédula:</strong> ' . htmlspecialchars($emisor['numero_identificacion'] ?? 'N/A') . '<br>
                            <strong>Teléfono:</strong> ' . htmlspecialchars($config['empresa']['telefono_contacto']) . '<br>
                            <strong>Email:</strong> ' . htmlspecialchars($config['empresa']['email_contacto']) . '
                        </div>
                    </div>
                    <div class="header-right">
                        <div class="invoice-badge">
                            <div class="invoice-type">
                                ' . (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' ? '⚡ FACTURA ELECTRÓNICA' : '📄 FACTURA') . '
                            </div>
                            <div style="background: rgba(255,255,255,0.25); padding: 6px; border-radius: 8px; margin: 5px 0; font-weight: bold;">
                                No. ' . htmlspecialchars($factura['consecutivo'] ?? 'N/A') . '
                            </div>
                            <div style="font-size: 9px;">
                                <strong>Fecha:</strong><br>' . date('d/m/Y', strtotime($factura['fecha_emision'])) . '
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Información del cliente y condiciones -->
            <div class="info-section">
                <div class="info-card">
                    <div class="card-header">👤 Información del Cliente</div>
                    <div style="font-size: 9px; line-height: 1.6;">
                        <div style="font-weight: bold; font-size: 11px; margin-bottom: 8px; color: #2d3748;">
                            ' . htmlspecialchars($receptor['nombre']) . '
                        </div>
                        <strong>Email:</strong> ' . htmlspecialchars($receptor['email'] ?? 'No especificado') . '<br>
                        <strong>Teléfono:</strong> ' . htmlspecialchars($receptor['telefono'] ?? 'No especificado') . '
                    </div>
                </div>
                <div class="info-card">
                    <div class="card-header">💼 Condiciones de Venta</div>
                    <div style="font-size: 9px; line-height: 1.6;">
                        <strong>Condición:</strong> ' . $this->getCondicionVentaNombre($factura['condicion_venta'] ?? '01') . '<br>
                        <strong>Método de Pago:</strong> ' . $this->getMetodoPagoNombre($factura['medio_pago'] ?? '01') . '<br>
                        <strong>Moneda:</strong> ' . ($factura['moneda'] ?? 'CRC') . '<br>
                        <strong>Estado:</strong> <span style="color: #059669; font-weight: bold;">' . ($factura['estado'] ?? 'Pendiente') . '</span>
                    </div>
                </div>
            </div>

            <!-- Banner electrónico si aplica -->
            ' . (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' && isset($factura['clave']) ? '
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 12px; text-align: center; margin: 15px 0;">
                <div style="font-size: 12px; font-weight: bold; margin-bottom: 8px;">⚡ FACTURA ELECTRÓNICA CERTIFICADA</div>
                <div style="font-size: 9px; margin-bottom: 10px;">Autorizada por el Ministerio de Hacienda de Costa Rica</div>
                <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 8px; font-family: monospace; font-size: 8px; word-break: break-all;">
                    <strong>Clave:</strong> ' . htmlspecialchars($factura['clave']) . '
                </div>
            </div>' : '') . '

            <!-- Tabla de productos -->
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 45%;">Descripción</th>
                        <th style="width: 10%;">Cantidad</th>
                        <th style="width: 15%;">Precio Unit.</th>
                        <th style="width: 10%;">Impuesto</th>
                        <th style="width: 15%;">Total</th>
                    </tr>
                </thead>
                <tbody>';

        foreach ($detalles as $index => $detalle) {
            $cantidad = floatval($detalle['cantidad'] ?? 0);
            $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
            $impuestoPorcentaje = floatval($detalle['impuesto'] ?? 13);
            
            $lineaSubtotal = $cantidad * $precioUnitario;
            $lineaImpuesto = $lineaSubtotal * ($impuestoPorcentaje / 100);
            $lineaTotal = $lineaSubtotal + $lineaImpuesto;
            
            $html .= '
                <tr>
                    <td class="text-center font-bold">' . ($index + 1) . '</td>
                    <td>
                        <div style="font-weight: bold; margin-bottom: 3px;">' . htmlspecialchars($detalle['descripcion_item'] ?? $detalle['descripcion'] ?? 'Producto/Servicio') . '</div>
                    </td>
                    <td class="text-center font-bold">' . number_format($cantidad, 2) . '</td>
                    <td class="text-right">₡' . number_format($precioUnitario, 2) . '</td>
                    <td class="text-center">' . number_format($impuestoPorcentaje, 1) . '%</td>
                    <td class="text-right font-bold">₡' . number_format($lineaTotal, 2) . '</td>
                </tr>';
        }

        $html .= '
                </tbody>
            </table>

            <!-- Totales -->
            <div class="totals-card">
                <div class="totals-header">💰 Resumen de Facturación</div>
                <div class="totals-content">
                  <div class="total-row">
                        <span style="font-weight: 600; color: #4a5568;">Subtotal</span>
                        <span style="font-weight: bold; color: #2d3748;">₡' . number_format($subtotal, 2) . '</span>
                    </div>
                    ' . ($totalDescuentos > 0 ? '
                    <div class="total-row">
                        <span style="font-weight: 600; color: #4a5568;">Descuentos</span>
                        <span style="font-weight: bold; color: #2d3748;">-₡' . number_format($totalDescuentos, 2) . '</span>
                    </div>' : '') . '
                    <div class="total-row">
                        <span style="font-weight: 600; color: #4a5568;">Impuestos (IVA 13%)</span>
                        <span style="font-weight: bold; color: #2d3748;">₡' . number_format($totalImpuestos, 2) . '</span>
                    </div>
                    <div class="final-total">
                        <span>TOTAL A PAGAR</span>
                        <span>₡' . number_format($total, 2) . '</span>
                    </div>
                </div>
            </div>

            <!-- QR Code si es electrónica -->
            ' . ($qrCodeBase64 ? '
            <div style="float: left; width: 200px; background: #f8fafc; border: 1px solid #cbd5e0; border-radius: 12px; padding: 15px; text-align: center; margin-top: 20px;">
                <div style="background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%); color: white; padding: 8px; border-radius: 8px; font-size: 9px; font-weight: bold; margin: -15px -15px 12px -15px;">📱 CÓDIGO QR</div>
                <img src="' . $qrCodeBase64 . '" style="width: 100px; height: 100px; border: 2px solid #667eea; border-radius: 8px; margin: 10px 0;" alt="QR Code">
                <div style="font-size: 8px; color: #718096; line-height: 1.3;">
                    Escanee para verificar en Hacienda
                </div>
            </div>' : '') . '

            <!-- Footer -->
            <div class="footer">
                <div style="font-size: 8px; color: #4a5568; line-height: 1.4; margin-bottom: 10px;">
                    <span style="color: #667eea; font-weight: bold;">✅ Documento generado electrónicamente</span> | 
                    ' . (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' ? 
                        '<span style="color: #667eea; font-weight: bold;">Resolución DGT-R-48-2016</span>' : 
                        'Factura de uso interno') . '
                    <br>
                    <span style="color: #667eea; font-weight: bold;">' . $config['textos']['footer_sistema'] . '</span> | 
                    Generado el ' . date('d/m/Y H:i:s') . '
                </div>
                <div style="font-size: 7px; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 10px;">
                    ' . $config['textos']['footer_legal'] . ' | 
                    ID Documento: ' . htmlspecialchars($factura['id']) . ' | 
                    Sistema de Facturación Profesional
                </div>
            </div>
        </body>
        </html>';

        return $html;
    }
    
    /**
     * Funciones auxiliares para nombres
     */
    private function getCondicionVentaNombre($codigo) {
        $condiciones = [
            "01" => "Contado", "02" => "Crédito", "03" => "Consignación",
            "04" => "Apartado", "05" => "Arrendamiento con opción de compra",
            "06" => "Arrendamiento en función financiera", "99" => "Otros"
        ];
        return $condiciones[$codigo] ?? 'Desconocido';
    }

    private function getMetodoPagoNombre($codigo) {
        $metodos = [
            "01" => "Efectivo", "02" => "Tarjeta", "03" => "Transferencia",
            "04" => "Cheque", "05" => "Recaudado por tercero"
        ];
        return $metodos[$codigo] ?? 'Otros';
    }
    
    /**
     * Generar PDF básico de respaldo
     */
    private function generarPDFBasico($factura) {
        try {
            $contenidoPDF = "=== FACTURA ===\n";
            $contenidoPDF .= "Número: " . ($factura['consecutivo'] ?? 'N/A') . "\n";
            $contenidoPDF .= "Fecha: " . ($factura['fecha_emision'] ?? date('Y-m-d')) . "\n";
            $contenidoPDF .= "Total: ₡" . number_format($factura['total_factura'] ?? 0, 2) . "\n";
            $contenidoPDF .= "\nPDF generado automáticamente.\n";
            $contenidoPDF .= "Sistema de Facturación KJAX\n";
            
            return base64_encode($contenidoPDF);
            
        } catch (Exception $e) {
            error_log("Error generando PDF básico: " . $e->getMessage());
            return base64_encode("PDF no disponible - Error en generación");
        }
    }
    
    /**
     * Método auxiliar para verificar si es base64
     */
    private function isBase64($string) {
        // Verificar si la cadena está en formato base64
        if (empty($string)) return false;
        
        // Decodificar y recodificar para verificar
        $decoded = base64_decode($string, true);
        if ($decoded === false) return false;
        
        // Verificar que al recodificar obtenemos lo mismo
        return base64_encode($decoded) === $string;
    }
    
    /**
     * Método para generar PDF real (MANTENER PARA COMPATIBILIDAD - PERO NO SE USA)
     */
    private function generarPDFReal($factura) {
        // Esta función se mantiene para compatibilidad pero ya no se llama
        // porque ahora usamos generarPDFDirecto()
        return $this->generarPDFDirecto($factura);
    }
    
    /**
     * Generar PDF de la factura (simplificado)
     */
    private function generarPDFFactura($factura) {
        try {
            // Por ahora, usar el PDF ya generado si existe
            if (!empty($factura['pdf_generado'])) {
                return $factura['pdf_generado'];
            }
            
            // Si no existe, generar uno simple base64 de prueba
            $contenidoPDF = "Factura #{$factura['consecutivo']}\n";
            $contenidoPDF .= "Fecha: {$factura['fecha_emision']}\n";
            $contenidoPDF .= "Total: {$factura['total_factura']}\n";
            $contenidoPDF .= "\nEste es un PDF de prueba.";
            
            // Convertir a base64
            return base64_encode($contenidoPDF);
            
        } catch (Exception $e) {
            error_log("Error generando PDF: " . $e->getMessage());
            // Retornar un PDF vacío base64
            return base64_encode("PDF no disponible");
        }
    }
    
    /**
     * Generar XML firmado (simplificado)
     */
    private function generarXMLFirmado($factura) {
        try {
            // Por ahora retornar un XML básico de ejemplo
            $xml = '<?xml version="1.0" encoding="UTF-8"?>';
            $xml .= '<FacturaElectronica>';
            $xml .= '<Clave>' . ($factura['clave'] ?? 'N/A') . '</Clave>';
            $xml .= '<NumeroConsecutivo>' . ($factura['consecutivo'] ?? 'N/A') . '</NumeroConsecutivo>';
            $xml .= '</FacturaElectronica>';
            
            return base64_encode($xml);
            
        } catch (Exception $e) {
            error_log("Error generando XML firmado: " . $e->getMessage());
            throw new Exception("No se pudo generar el XML firmado: " . $e->getMessage());
        }
    }
    
    /**
     * Construir XML según especificaciones de Hacienda CR
     */
    private function construirXMLFactura($factura) {
        // Implementación básica
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<FacturaElectronica xmlns="https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.3/facturaElectronica">';
        $xml .= '</FacturaElectronica>';
        
        return $xml;
    }
    
    /**
     * Firmar XML con certificado digital
     */
    private function firmarXML($xml) {
        // Por ahora retornar el XML sin firmar
        return $xml;
    }
    
    /**
     * Generar nombre de archivo según tipo
     */
    private function generarNombreArchivo($factura, $tipo) {
        $consecutivo = $factura['consecutivo'] ?? substr($factura['id'], 0, 8);
        $fecha = date('Ymd', strtotime($factura['fecha_emision'] ?? date('Y-m-d')));
        
        switch ($tipo) {
            case 'pdf':
                return "Factura_{$consecutivo}_{$fecha}.pdf";
            case 'xml_firmado':
                return "Factura_{$consecutivo}_{$fecha}_Firmado.xml";
            case 'xml_respuesta':
                return "Factura_{$consecutivo}_{$fecha}_Respuesta_MH.xml";
            default:
                return "Factura_{$consecutivo}_{$fecha}";
        }
    }
    
    /**
     * Generar asunto del email
     */
    private function generarAsunto($factura) {
        $plantilla = $this->config['templates']['subject'];
        $variables = [
            '{numero_factura}' => $factura['consecutivo'] ?? substr($factura['id'], 0, 8),
            '{tipo_factura}' => (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA') ? 'Electrónica' : 'Comercial',
            '{fecha}' => date('d/m/Y', strtotime($factura['fecha_emision'] ?? date('Y-m-d'))),
            '{empresa}' => $this->config['empresa']['nombre']
        ];
        
        return str_replace(array_keys($variables), array_values($variables), $plantilla);
    }
    
    /**
     * Generar cuerpo HTML del email
     */
   private function generarCuerpoHTML($factura, $cliente, $archivos) {
    $plantilla = $this->config['templates']['html'];
    
    // Lista de archivos adjuntos
    $listaArchivos = '';
    if ($archivos['pdf']) {
        $listaArchivos .= '<li>📄 Factura en formato PDF</li>';
    }
    if ($archivos['xml_firmado']) {
        $listaArchivos .= '<li>📰 XML Firmado digitalmente</li>';
    }
    if ($archivos['xml_respuesta']) {
        $listaArchivos .= '<li>🔐 XML Respuesta de Hacienda</li>';
    }
    
    $tipoFactura = (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA') ? 'Electrónica' : 'Comercial';
    
    // Generar HTML basado en generarFacturaEstiloPDF
    $esElectronica = ($factura['tipo_factura'] ?? '') === 'ELECTRONICA';
    $config = include __DIR__ . '/../../config/pdf_config.php';
    $emisor = $this->obtenerEmisor();
    $receptor = [
        'nombre' => $cliente['nombre'],
        'email' => $cliente['email'] ?? 'No especificado',
        'telefono' => $cliente['telefono'] ?? 'No especificado',
        'identificacion' => $factura['cedulaReceptor'] ?? 'N/A',
        'tipo_identificacion' => $factura['receptorTipo'] ?? '01',
        'provincia' => $factura['receptor_provincia'] ?? '',
        'canton' => $factura['receptor_canton'] ?? '',
        'distrito' => $factura['receptor_distrito'] ?? '',
        'barrio' => $factura['receptor_barrio'] ?? '',
        'otras_senas' => $factura['receptor_otras_senas'] ?? ''
    ];
    $detalles = $this->obtenerDetallesFactura($factura['id']);
    
    // Calcular totales
    $subtotal = 0;
    $totalImpuestos = 0;
    $totalDescuentos = 0;
    foreach ($detalles as $detalle) {
        $cantidad = floatval($detalle['cantidad'] ?? 0);
        $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
        $impuesto = floatval($detalle['impuesto'] ?? 13);
        $descuento = floatval($detalle['descuento'] ?? 0);
        $lineaSubtotal = $cantidad * $precioUnitario;
        $lineaDescuento = $lineaSubtotal * ($descuento / 100);
        $lineaImpuesto = ($lineaSubtotal - $lineaDescuento) * ($impuesto / 100);
        $subtotal += $lineaSubtotal;
        $totalDescuentos += $lineaDescuento;
        $totalImpuestos += $lineaImpuesto;
    }
    $total = $subtotal - $totalDescuentos + $totalImpuestos;

    // Generar QR si es electrónica
    $qrCodeBase64 = '';
    if ($esElectronica && !empty($factura['clave'])) {
        require_once __DIR__ . '/../QRGenerator.php';
        $qrData = $factura['clave'] . ',' . $factura['fecha_emision'] . ',' . $emisor['numero_identificacion'] . ',' . $receptor['identificacion'] . ',' . number_format($total, 2, '.', '');
        $qrCodeBase64 = QRGenerator::generateQRBase64($qrData, 120);
    }

    // HTML adaptado de generarFacturaEstiloPDF
    $html = '
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @media screen { body { max-width: 600px; margin: 20px auto; padding: 20px; background: #f7fafc; box-shadow: 0 4px 15px rgba(0,0,0,0.1); } }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #000; background: #ffffff; }
            .header-blue { background: ' . ($esElectronica ? '#1e40af' : '#6b7280') . '; color: white; padding: 15px 20px; display: table; width: 100%; }
            .header-left { display: table-cell; width: 70%; vertical-align: middle; }
            .header-right { display: table-cell; width: 30%; vertical-align: middle; text-align: center; }
            .version-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .logo-placeholder { width: 60px; height: 45px; border: 2px solid white; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; background: rgba(255,255,255,0.1); }
            .main-info { background: #f8f9fa; padding: 15px 20px; border: 1px solid #dee2e6; display: table; width: 100%; }
            .info-left, .info-right { display: table-cell; width: 50%; vertical-align: top; }
            .info-row { margin-bottom: 6px; display: flex; align-items: baseline; }
            .info-label { font-weight: bold; min-width: 100px; margin-right: 10px; }
            .info-value { flex: 1; }
            .section { margin: 15px 0; border: 1px solid #dee2e6; }
            .section-header { background: #e9ecef; padding: 8px 15px; font-weight: bold; font-size: 11px; }
            .section-content { padding: 15px; }
            .section-grid { display: table; width: 100%; }
            .section-column { display: table-cell; width: 50%; padding-right: 15px; }
            .section-column:last-child { padding-right: 0; }
            .products-table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #dee2e6; }
            .products-table th { background: #e9ecef; padding: 8px; border: 1px solid #dee2e6; font-weight: bold; font-size: 9px; text-align: center; }
            .products-table td { padding: 6px; border: 1px solid #dee2e6; font-size: 9px; vertical-align: top; }
            .products-table tbody tr:nth-child(even) { background: #f8f9fa; }
            .totals-section { margin: 15px 0; display: table; width: 100%; }
            .totals-left, .totals-right { display: table-cell; width: 50%; vertical-align: top; }
            .totals-table { width: 100%; border-collapse: collapse; border: 1px solid #dee2e6; }
            .totals-table td { padding: 6px 10px; border-bottom: 1px solid #dee2e6; font-size: 10px; }
            .totals-table .total-label { text-align: right; font-weight: bold; width: 70%; }
            .totals-table .total-value { text-align: right; font-weight: bold; width: 30%; }
            .totals-table .final-total { background: #f8f9fa; font-size: 11px; font-weight: bold; }
            .validation-section { text-align: center; margin: 15px 0; padding: 10px; border: 1px solid #dee2e6; background: #f8f9fa; }
            .validation-text { font-size: 9px; margin-bottom: 10px; font-weight: bold; }
            .qr-container { display: inline-block; border: 2px solid #333; padding: 8px; background: white; }
            .qr-image { width: 80px; height: 80px; display: block; }
            .qr-label { text-align: center; font-size: 8px; margin-top: 5px; font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .price-symbol { font-weight: bold; }
            .electronic-info { background: #fff3cd; border: 1px solid #ffeaa7; padding: 8px; margin: 8px 0; font-size: 9px; }
            .clave-display { font-family: monospace; font-size: 8px; word-break: break-all; background: white; padding: 5px; border: 1px solid #ddd; margin-top: 5px; }
        </style>
    </head>
    <body>
        <div class="header-blue">
            <div class="header-left">
                <div class="version-title">' . ($esElectronica ? 'Distribudora Chan - Factura Electrónica' : 'Distribudora Chan - Factura Comercial') . '</div>
            </div>
            <div class="header-right">
                <div class="logo-placeholder">' . htmlspecialchars($config['empresa']['codigo_logo']) . '</div>
            </div>
        </div>
        <div class="main-info">
            <div class="info-left">' . ($esElectronica && !empty($factura['clave']) ? '
                <div class="info-row">
                    <span class="info-label">Clave:</span>
                    <span class="info-value" style="font-family: monospace; font-size: 8px;">' . htmlspecialchars($factura['clave']) . '</span>
                </div>' : '') . '
                <div class="info-row">
                    <span class="info-label">Fecha Emisión:</span>
                    <span class="info-value">' . date('Y-m-d\TH:i:s-06:00', strtotime($factura['fecha_emision'])) . '</span>
                </div>
            </div>
            <div class="info-right">
                <div class="info-row">
                    <span class="info-label">Num. Consecutivo:</span>
                    <span class="info-value font-bold">' . htmlspecialchars($factura['consecutivo'] ?? 'N/A') . '</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Tipo:</span>
                    <span class="info-value">' . ($esElectronica ? '01 – Factura Electrónica' : 'Factura Comercial') . '</span>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="section-header">Emisor</div>
            <div class="section-content">
                <div class="section-grid">
                    <div class="section-column">
                        <div class="info-row">
                            <span class="info-label">Nombre Comercial:</span>
                            <span class="info-value font-bold">' . htmlspecialchars($config['empresa']['nombre']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Razón Social:</span>
                            <span class="info-value">' . htmlspecialchars($config['empresa']['razon_social'] ?? $config['empresa']['nombre']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Identificación:</span>
                            <span class="info-value">' . htmlspecialchars(($emisor['tipo_identificacion'] ?? 'Jurídica') . ' ' . $emisor['numero_identificacion']) . '</span>
                        </div>
                    </div>
                    <div class="section-column">
                        <div class="info-row">
                            <span class="info-label">Ubicación:</span>
                            <span class="info-value">' . htmlspecialchars($emisor['provincia'] . ', ' . $emisor['canton'] . ', ' . $emisor['distrito']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Tel:</span>
                            <span class="info-value">' . htmlspecialchars($config['empresa']['telefono_contacto']) . ' • Email: ' . htmlspecialchars($config['empresa']['email_contacto']) . '</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="section">
            <div class="section-header">Receptor</div>
            <div class="section-content">
                <div class="section-grid">
                    <div class="section-column">
                        <div class="info-row">
                            <span class="info-label">Nombre/Razón:</span>
                            <span class="info-value font-bold">' . htmlspecialchars($receptor['nombre']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Identificación:</span>
                            <span class="info-value">' . htmlspecialchars($receptor['tipo_identificacion'] . ' ' . $receptor['identificacion']) . '</span>
                        </div>
                    </div>
                    <div class="section-column">
                        <div class="info-row">
                            <span class="info-label">Ubicación:</span>
                            <span class="info-value">' . htmlspecialchars($receptor['provincia'] . ', ' . $receptor['canton'] . ', ' . $receptor['distrito'] . (!empty($receptor['barrio']) ? ', ' . $receptor['barrio'] : '') . (!empty($receptor['otras_senas']) ? ', ' . $receptor['otras_senas'] : '')) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email:</span>
                            <span class="info-value">' . htmlspecialchars($receptor['email']) . '</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <table class="products-table">
            <thead>
                <tr>
                    <th style="width: 8%;">Cant.</th>
                    <th style="width: 10%;">Unidad</th>' . ($esElectronica ? '<th style="width: 12%;">Código</th>' : '') . '
                    <th style="width: ' . ($esElectronica ? '35%' : '47%') . ';">Descripción</th>
                    <th style="width: 12%;">P. Unit</th>
                    <th style="width: 8%;">Desc.</th>
                    <th style="width: 15%;">SubTotal</th>
                </tr>
            </thead>
            <tbody>';
    foreach ($detalles as $detalle) {
        $cantidad = floatval($detalle['cantidad'] ?? 0);
        $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
        $descuentoPorcentaje = floatval($detalle['descuento'] ?? 0);
        $lineaSubtotal = $cantidad * $precioUnitario;
        $lineaDescuento = $lineaSubtotal * ($descuentoPorcentaje / 100);
        $lineaTotal = $lineaSubtotal - $lineaDescuento;
        $html .= '
                <tr>
                    <td class="text-center">' . number_format($cantidad, 3) . '</td>
                    <td class="text-center">' . htmlspecialchars($detalle['unidad_medida'] ?? 'UND') . '</td>' .
                    ($esElectronica ? '<td class="text-center">' . htmlspecialchars($detalle['cabys_code'] ?? $detalle['codigo'] ?? 'N/A') . '</td>' : '') . '
                    <td>' . htmlspecialchars($detalle['descripcion_item']) . '</td>
                    <td class="text-right"><span class="price-symbol">■</span> ' . number_format($precioUnitario, 2) . '</td>
                    <td class="text-right"><span class="price-symbol">■</span> ' . number_format($lineaDescuento, 2) . '</td>
                    <td class="text-right"><span class="price-symbol">■</span> ' . number_format($lineaTotal, 2) . '</td>
                </tr>';
    }
    $html .= '
            </tbody>
        </table>
        <div class="totals-section">
            <div class="totals-left">
                <div class="section">
                    <div class="section-header">Condiciones de Pago</div>
                    <div class="section-content">
                        <div class="info-row">
                            <span class="info-label">Condición:</span>
                            <span class="info-value">' . $this->getCondicionVentaNombre($factura['condicion_venta']) . '</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Método:</span>
                            <span class="info-value">' . $this->getMetodoPagoNombre($factura['medio_pago'] ?? '01') . '</span>
                        </div>' . (isset($factura['plazo_credito']) && $factura['plazo_credito'] > 0 ? '
                        <div class="info-row">
                            <span class="info-label">Plazo:</span>
                            <span class="info-value">' . $factura['plazo_credito'] . ' días</span>
                        </div>' : '') . '
                    </div>
                </div>
            </div>
            <div class="totals-right">
                <table class="totals-table">
                    <tr>
                        <td class="total-label">Subtotal:</td>
                        <td class="total-value"><span class="price-symbol">■</span> ' . number_format($subtotal, 2) . '</td>
                    </tr>' . ($totalDescuentos > 0 ? '
                    <tr>
                        <td class="total-label">Descuentos:</td>
                        <td class="total-value"><span class="price-symbol">■</span> ' . number_format($totalDescuentos, 2) . '</td>
                    </tr>' : '') . '
                    <tr>
                        <td class="total-label">IVA (13%):</td>
                        <td class="total-value"><span class="price-symbol">■</span> ' . number_format($totalImpuestos, 2) . '</td>
                    </tr>
                    <tr class="final-total">
                        <td class="total-label">Total Comprobante:</td>
                        <td class="total-value"><span class="price-symbol">■</span> ' . number_format($total, 2) . '</td>
                    </tr>
                </table>
            </div>
        </div>' . ($esElectronica ? '
        <div class="validation-section">
            <div class="validation-text">Para validar este comprobante ingrese a Tribunet con la clave.</div>
            <div class="qr-container">' . ($qrCodeBase64 ? '<img src="' . $qrCodeBase64 . '" class="qr-image" alt="QR Code">' : '<div class="qr-placeholder">QR Aquí</div>') . '
                <div class="qr-label">QR Aquí</div>
            </div>
        </div>' : '
        <div style="text-align: center; margin-top: 20px; padding: 10px; border-top: 1px solid #dee2e6; font-size: 9px; color: #666;">
            <p><strong>' . htmlspecialchars($config['empresa']['nombre']) . '</strong></p>
            <p>Factura generada el ' . date('d/m/Y H:i:s') . '</p>
        </div>') . '
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; font-size: 10px;">
            <p><strong>Adjuntos:</strong></p>
            <ul>' . $listaArchivos . '</ul>
            <p>Por favor, revise los documentos adjuntos para más detalles.</p>
            <p>Para cualquier consulta, contáctenos:</p>
            <ul>
                <li><strong>Teléfono:</strong> ' . htmlspecialchars($config['empresa']['telefono_contacto']) . '</li>
                <li><strong>Email:</strong> ' . htmlspecialchars($config['empresa']['email_contacto']) . '</li>
            </ul>
        </div>
    </body>
    </html>';

    // Combinar con plantilla de email_config.php
    $variables = [
        '{nombre_cliente}' => htmlspecialchars($cliente['nombre']),
        '{numero_factura}' => $factura['consecutivo'] ?? substr($factura['id'], 0, 8),
        '{tipo_factura}' => $tipoFactura,
        '{fecha_emision}' => date('d/m/Y', strtotime($factura['fecha_emision'] ?? date('Y-m-d'))),
        '{fecha_vencimiento}' => isset($factura['fecha_vencimiento']) ? date('d/m/Y', strtotime($factura['fecha_vencimiento'])) : 'No aplica',
        '{total}' => '₡' . number_format($factura['total_factura'] ?? $total, 2),
        '{saldo_pendiente}' => '₡' . number_format($factura['saldo_pendiente'] ?? $factura['total_factura'] ?? $total, 2),
        '{empresa}' => $this->config['empresa']['nombre'],
        '{telefono}' => $this->config['empresa']['telefono'],
        '{email}' => $this->config['empresa']['email'],
        '{sitio_web}' => $this->config['empresa']['sitio_web'] ?? '',
        '{lista_archivos}' => $listaArchivos,
        '{estado_hacienda}' => $esElectronica ? '<div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; font-size: 10px;">Factura Electrónica Certificada<br><strong>Clave:</strong> ' . htmlspecialchars($factura['clave'] ?? 'N/A') . '</div>' : '',
        '{contenido_factura}' => $html,
        '{fecha_generacion}' => date('d/m/Y H:i:s') // Agregar esta línea
    ];
    
    return str_replace(array_keys($variables), array_values($variables), $plantilla);
}
    
    /**
     * Generar cuerpo de texto plano
     */
    private function generarCuerpoTexto($factura, $cliente) {
        $tipoFactura = (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA') ? 'Electrónica' : 'Comercial';
        
        return "
Estimado/a " . $cliente['nombre'] . ",

Adjunto encontrará su Factura {$tipoFactura} con los siguientes detalles:

Número: " . ($factura['consecutivo'] ?? substr($factura['id'], 0, 8)) . "
Fecha de emisión: " . date('d/m/Y', strtotime($factura['fecha_emision'] ?? date('Y-m-d'))) . "
" . (isset($factura['fecha_vencimiento']) ? "Fecha de vencimiento: " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "\n" : '') . "
Monto total: ₡" . number_format($factura['total_factura'] ?? 0, 2) . "

" . (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA' ? "Esta factura electrónica ha sido certificada por el Ministerio de Hacienda.\nClave: " . ($factura['clave'] ?? 'N/A') . "\n\n" : '') . "

Archivos adjuntos:
- Factura en formato PDF
" . (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA' ? "- XML Firmado digitalmente\n- XML Respuesta de Hacienda (si aplica)\n" : '') . "

Para cualquier consulta, contáctenos:
Teléfono: " . $this->config['empresa']['telefono'] . "
Email: " . $this->config['empresa']['email'] . "

Gracias por su preferencia.

Saludos cordiales,
" . $this->config['empresa']['nombre'] . "

---
Este es un mensaje automático del sistema de facturación.
        ";
    }
    
    /**
     * Enviar recordatorio de vencimiento
     */
    public function enviarRecordatorioVencimiento($facturaId, $diasVencimiento = null) {
        try {
            $factura = $this->obtenerFacturaCompleta($facturaId);
            if (!$factura) {
                throw new Exception("Factura no encontrada: {$facturaId}");
            }
            
            $cliente = $this->obtenerCliente($factura['cliente_id']);
            if (!$cliente) {
                throw new Exception("Cliente no encontrado");
            }
            
            if (!$cliente['email']) {
                throw new Exception('Cliente sin email');
            }
            
            $diasVencido = $diasVencimiento ?? $this->calcularDiasVencido($factura['fecha_vencimiento'] ?? null);
            
            $this->mailer->clearAddresses();
            $this->mailer->clearAttachments();
            
            $this->mailer->addAddress($cliente['email'], $cliente['nombre']);
            
            // Determinar urgencia y asunto
            if ($diasVencido > 0) {
                $urgencia = $diasVencido > 30 ? 'URGENTE' : 'Importante';
                $this->mailer->Subject = "⚠️ Factura Vencida #{$factura['consecutivo']} - {$this->config['empresa']['nombre']}";
            } else {
                $urgencia = 'Recordatorio';
                $this->mailer->Subject = "🔔 Recordatorio: Factura por Vencer #{$factura['consecutivo']} - {$this->config['empresa']['nombre']}";
            }
            
            $this->mailer->Body = $this->generarRecordatorioHTML($factura, $cliente, $diasVencido, $urgencia);
            $this->mailer->AltBody = $this->generarRecordatorioTexto($factura, $cliente, $diasVencido);
            
            $envioExitoso = $this->mailer->send();
            
            if ($envioExitoso) {
                $this->registrarEnvio($facturaId, $cliente['email'], 'recordatorio', 'enviado');
                
                return [
                    'success' => true,
                    'message' => 'Recordatorio enviado exitosamente',
                    'destinatario' => $cliente['email'],
                    'dias_vencido' => $diasVencido
                ];
            } else {
                throw new Exception('Error enviando recordatorio');
            }
            
        } catch (Exception $e) {
            $errorMsg = $e->getMessage();
            error_log("Error enviando recordatorio: " . $errorMsg);
            
            if (isset($facturaId) && isset($cliente['email'])) {
                $this->registrarEnvio($facturaId, $cliente['email'], 'recordatorio', 'error', $errorMsg);
            }
            
            return [
                'success' => false,
                'error' => $errorMsg
            ];
        }
    }
    
    /**
     * Generar HTML para recordatorio
     */
    private function generarRecordatorioHTML($factura, $cliente, $diasVencido, $urgencia) {
        $colorUrgencia = $diasVencido > 30 ? '#dc2626' : ($diasVencido > 0 ? '#f59e0b' : '#059669');
        $iconoUrgencia = $diasVencido > 30 ? '🚨' : ($diasVencido > 0 ? '⚠️' : '🔔');
        
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
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset='UTF-8'>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f7fafc; }
                .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, {$colorUrgencia} 0%, {$colorUrgencia}cc 100%); color: white; padding: 20px; text-align: center; }
                .content { padding: 30px; }
                .urgencia { background: {$colorUrgencia}; color: white; padding: 15px; border-radius: 8px; text-align: center; font-weight: bold; margin-bottom: 20px; font-size: 16px; }
                .factura-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-radius: 0 0 12px 12px; }
                .btn { display: inline-block; background: {$colorUrgencia}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
                .btn:hover { opacity: 0.9; }
                .destacado { color: {$colorUrgencia}; font-weight: bold; font-size: 18px; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>{$iconoUrgencia} {$this->config['empresa']['nombre']}</h1>
                    <p>Notificación de Factura</p>
                </div>
                <div class='content'>
                    <div class='urgencia'>{$urgencia}: {$mensajeVencimiento}</div>
                    
                    <p>Estimado/a <strong>{$cliente['nombre']}</strong>,</p>
                    
                    <p>{$mensajeVencimiento} Le solicitamos su pronta atención:</p>
                    
                    <div class='factura-info'>
                        <h3>📄 Factura #{$factura['consecutivo']}</h3>
                        <p><strong>Fecha de emisión:</strong> " . date('d/m/Y', strtotime($factura['fecha_emision'])) . "</p>
                        <p><strong>Fecha de vencimiento:</strong> " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "</p>
                        <p><strong>Monto total:</strong> <span class='destacado'>₡" . number_format($factura['total_factura'], 2) . "</span></p>
                        <p><strong>Saldo pendiente:</strong> <span class='destacado'>₡" . number_format($factura['saldo_pendiente'] ?? $factura['total_factura'], 2) . "</span></p>
                        " . (isset($factura['tipo_factura']) && $factura['tipo_factura'] === 'ELECTRONICA' ? "<p><strong>Clave:</strong> <small>{$factura['clave']}</small></p>" : '') . "
                    </div>
                    
                    <p><strong>Para proceder con el pago, puede contactarnos:</strong></p>
                    <ul>
                        <li>📞 <strong>Teléfono:</strong> {$this->config['empresa']['telefono']}</li>
                        <li>📧 <strong>Email:</strong> {$this->config['empresa']['email']}</li>
                        <li>📱 <strong>WhatsApp:</strong> {$this->config['empresa']['whatsapp']}</li>
                        <li>🏢 <strong>Dirección:</strong> {$this->config['empresa']['direccion']}</li>
                    </ul>
                    
                    <center>
                        <a href='tel:{$this->config['empresa']['telefono']}' class='btn'>📞 Llamar Ahora</a>
                        <a href='mailto:{$this->config['empresa']['email']}' class='btn'>📧 Enviar Email</a>
                    </center>
                    
                    <p style='margin-top: 20px;'>Agradecemos su pronta atención a este asunto.</p>
                    <p>Saludos cordiales,<br><strong>Equipo de {$this->config['empresa']['nombre']}</strong></p>
                </div>
                <div class='footer'>
                    <p>Este es un mensaje automático del sistema de facturación.</p>
                    <p>Documento generado el " . date('d/m/Y H:i:s') . "</p>
                    <p>{$this->config['empresa']['nombre']} | {$this->config['empresa']['direccion']}</p>
                </div>
            </div>
        </body>
        </html>";
    }
    
    /**
     * Generar texto plano para recordatorio
     */
    private function generarRecordatorioTexto($factura, $cliente, $diasVencido) {
        $mensajeVencimiento = '';
        if ($diasVencido > 0) {
            $mensajeVencimiento = "Su factura está VENCIDA hace {$diasVencido} días.";
        } elseif ($diasVencido === 0) {
            $mensajeVencimiento = "Su factura VENCE HOY.";
        } else {
            $diasRestantes = abs($diasVencido);
            $mensajeVencimiento = "Su factura vence en {$diasRestantes} días.";
        }
        
        return "
Estimado/a {$cliente['nombre']},

{$mensajeVencimiento}

DETALLES DE LA FACTURA:
Número: #{$factura['consecutivo']}
Fecha de emisión: " . date('d/m/Y', strtotime($factura['fecha_emision'])) . "
Fecha de vencimiento: " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "
Monto total: ₡" . number_format($factura['total_factura'], 2) . "
Saldo pendiente: ₡" . number_format($factura['saldo_pendiente'] ?? $factura['total_factura'], 2) . "

PARA PROCEDER CON EL PAGO:
Teléfono: {$this->config['empresa']['telefono']}
Email: {$this->config['empresa']['email']}
Dirección: {$this->config['empresa']['direccion']}

Agradecemos su pronta atención.

Saludos cordiales,
{$this->config['empresa']['nombre']}
        ";
    }
    
    /**
     * Métodos auxiliares para base de datos
     */
    private function obtenerFacturaCompleta($facturaId) {
        try {
            // Usar el método getFactura que ya existe en tu SupabaseService
            $factura = $this->supabase->getFactura($facturaId);
            return $factura;
        } catch (Exception $e) {
            error_log("Error obteniendo factura: " . $e->getMessage());
            return null;
        }
    }
    
    private function obtenerCliente($clienteId) {
        try {
            // Obtener cliente real de Supabase
            $cliente = $this->supabase->getCliente($clienteId);
            
            if (!$cliente) {
                throw new Exception("Cliente no encontrado: {$clienteId}");
            }
            
            // Asegurar que tenga los campos necesarios
            return [
                'id' => $cliente['id'] ?? $clienteId,
                'nombre' => $cliente['nombre'] ?? $cliente['razon_social'] ?? 'Cliente',
                'email' => $cliente['email'] ?? $cliente['correo'] ?? null,
                'telefono' => $cliente['telefono'] ?? $cliente['celular'] ?? ''
            ];
            
        } catch (Exception $e) {
            error_log("Error obteniendo cliente: " . $e->getMessage());
            // Retornar datos mínimos para no romper el flujo
            return [
                'id' => $clienteId,
                'nombre' => 'Cliente',
                'email' => null,
                'telefono' => ''
            ];
        }
    }
    
    private function obtenerEmisor() {
        try {
            // Retornar datos del emisor desde la configuración
            return [
                'nombre' => $this->config['empresa']['nombre'] ?? 'KJAX Facturacion',
                'numero_identificacion' => '3101123456', // TODO: Obtener de configuración
                'provincia' => 'San José',
                'canton' => 'Central',
                'distrito' => 'Carmen',
                'tipo_identificacion' => '02' // Cédula Jurídica
            ];
        } catch (Exception $e) {
            error_log("Error obteniendo emisor: " . $e->getMessage());
            return null;
        }
    }
    
    private function obtenerDetallesFactura($facturaId) {
        try {
            $factura = $this->obtenerFacturaCompleta($facturaId);
            if ($factura && isset($factura['detalle'])) {
                // Si detalle es string JSON, decodificarlo
                if (is_string($factura['detalle'])) {
                    return json_decode($factura['detalle'], true) ?? [];
                }
                return $factura['detalle'];
            }
            return [];
        } catch (Exception $e) {
            error_log("Error obteniendo detalles: " . $e->getMessage());
            return [];
        }
    }
    
    private function actualizarEstadoEnvio($facturaId, $estado, $archivosEnviados = []) {
        try {
            // Usar el método updateFacturaEstado existente
            $this->supabase->updateFacturaEstado($facturaId, $estado, [
                'estado_envio' => $estado,
                'fecha_envio' => date('Y-m-d H:i:s'),
                'archivos_enviados' => json_encode($archivosEnviados)
            ]);
        } catch (Exception $e) {
            error_log("Error actualizando estado: " . $e->getMessage());
        }
    }
    
    private function registrarEnvio($facturaId, $destinatario, $tipo, $estado, $error = null, $archivos = []) {
        try {
            // Por ahora solo loggear, implementar insertEnvio en SupabaseService si es necesario
            error_log("Envío registrado: Factura $facturaId a $destinatario - Estado: $estado");
        } catch (Exception $e) {
            error_log("Error registrando envío: " . $e->getMessage());
        }
    }
    
    private function calcularDiasVencido($fechaVencimiento) {
        if (!$fechaVencimiento) return 0;
        
        $hoy = new DateTime();
        $vencimiento = new DateTime($fechaVencimiento);
        $diferencia = $hoy->diff($vencimiento);
        
        return $vencimiento < $hoy ? $diferencia->days : -$diferencia->days;
    }
    
    /**
     * Obtener historial de envíos
     */
    public function obtenerHistorialEnvios($facturaId) {
        try {
            // Por ahora retornar array vacío
            return [];
        } catch (Exception $e) {
            error_log("Error obteniendo historial: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Validar configuración de email
     */
    public function validarConfiguracion() {
        $errores = [];
        
        // Validar SMTP
        if (empty($this->config['smtp']['host'])) {
            $errores[] = 'Host SMTP no configurado';
        }
        if (empty($this->config['smtp']['username'])) {
            $errores[] = 'Usuario SMTP no configurado';
        }
        if (empty($this->config['smtp']['password'])) {
            $errores[] = 'Contraseña SMTP no configurada';
        }
        
        // Validar remitente
        if (empty($this->config['from']['email']) || !filter_var($this->config['from']['email'], FILTER_VALIDATE_EMAIL)) {
            $errores[] = 'Email de remitente inválido';
        }
        
        // Probar conexión SMTP
        try {
            // Agregar opciones SSL antes de conectar
            $this->mailer->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            $this->mailer->smtpConnect();
            $this->mailer->smtpClose();
        } catch (Exception $e) {
            $errores[] = 'Error de conexión SMTP: ' . $e->getMessage();
        }
        
        return [
            'valido' => empty($errores),
            'errores' => $errores
        ];
    }
}
?>="font-weight: 600; color: #4a5568;">Subtotal</span>
                        <span style="font-weight: bold; color: #2d3748;">₡' . number_format($subtotal, 2) . '</span>
                    </div>
                    ' . ($totalDescuentos > 0 ? '
                    <div class="total-row">
                        <span style="font-weight: 600; color: #4a5568;">Descuentos</span>
                        <span style