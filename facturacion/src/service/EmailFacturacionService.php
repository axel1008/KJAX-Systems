<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

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
            $this->mailer->SMTPSecure = $this->config['smtp']['encryption'];
            $this->mailer->Port = $this->config['smtp']['port'];
            $this->mailer->CharSet = 'UTF-8';
            
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
            if (!$forzarReenvio && $factura['estado_envio'] === 'enviado') {
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
            if ($factura['tipo_factura'] === 'ELECTRONICA' && $archivos['xml_firmado']) {
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
            if ($factura['tipo_factura'] === 'ELECTRONICA' && $archivos['xml_respuesta']) {
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
            
            $this->registrarEnvio($facturaId, $cliente['email'] ?? 'desconocido', 'factura_completa', 'error', $errorMsg);
            
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
        
        // 1. Generar/Obtener PDF
        if ($factura['pdf_generado']) {
            $archivos['pdf'] = $factura['pdf_generado'];
        } else {
            // Generar PDF usando tu función existente
            $archivos['pdf'] = $this->generarPDFFactura($factura);
            
            // Guardar PDF en base de datos
            $this->supabase->from('facturas')
                ->update(['pdf_generado' => $archivos['pdf']])
                ->eq('id', $factura['id']);
        }
        
        // 2. XML Firmado (solo facturas electrónicas)
        if ($factura['tipo_factura'] === 'ELECTRONICA') {
            if ($factura['xml_firmado']) {
                $archivos['xml_firmado'] = $factura['xml_firmado'];
            } else {
                // Generar XML firmado usando tu función existente
                $archivos['xml_firmado'] = $this->generarXMLFirmado($factura);
                
                // Guardar en base de datos
                $this->supabase->from('facturas')
                    ->update(['xml_firmado' => $archivos['xml_firmado']])
                    ->eq('id', $factura['id']);
            }
            
            // 3. XML Respuesta (si existe)
            if ($factura['xml_respuesta']) {
                $archivos['xml_respuesta'] = $factura['xml_respuesta'];
            }
        }
        
        return $archivos;
    }
    
    /**
     * Generar PDF de la factura
     */
    private function generarPDFFactura($factura) {
        try {
            // Usar tu función existente de generación de PDF
            // Esto debería llamar a tu endpoint pdf.php o función similar
            
            $response = $this->llamarGeneradorPDF($factura);
            
            if ($response && isset($response['pdf_base64'])) {
                return $response['pdf_base64'];
            } else {
                throw new Exception('Error generando PDF');
            }
            
        } catch (Exception $e) {
            error_log("Error generando PDF: " . $e->getMessage());
            throw new Exception("No se pudo generar el PDF: " . $e->getMessage());
        }
    }
    
    /**
     * Generar XML firmado (implementar según tu lógica de firmado)
     */
    private function generarXMLFirmado($factura) {
        try {
            // Aquí iría tu lógica de generación y firmado de XML
            // Por ahora retornamos un XML básico de ejemplo
            
            $xml = $this->construirXMLFactura($factura);
            $xmlFirmado = $this->firmarXML($xml); // Tu función de firmado
            
            return base64_encode($xmlFirmado);
            
        } catch (Exception $e) {
            error_log("Error generando XML firmado: " . $e->getMessage());
            throw new Exception("No se pudo generar el XML firmado: " . $e->getMessage());
        }
    }
    
    /**
     * Construir XML según especificaciones de Hacienda CR
     */
    private function construirXMLFactura($factura) {
        // Implementar según especificaciones exactas del MH
        $xml = '<?xml version="1.0" encoding="UTF-8"?>';
        $xml .= '<FacturaElectronica xmlns="https://tribunet.hacienda.go.cr/docs/esquemas/2017/v4.3/facturaElectronica">';
        
        // Agregar todos los elementos requeridos por Hacienda
        // Clave, fechas, emisor, receptor, líneas de detalle, etc.
        
        $xml .= '</FacturaElectronica>';
        
        return $xml;
    }
    
    /**
     * Firmar XML con certificado digital
     */
    private function firmarXML($xml) {
        // Implementar firmado digital según tu certificado
        // Por ahora retornamos el XML sin firmar
        return $xml;
    }
    
    /**
     * Llamar al generador de PDF
     */
    private function llamarGeneradorPDF($factura) {
        // Preparar datos para tu endpoint de PDF
        $datos = [
            'factura' => $factura,
            'emisor' => $this->obtenerEmisor(),
            'receptor' => $this->obtenerCliente($factura['cliente_id']),
            'detalles' => $this->obtenerDetallesFactura($factura['id'])
        ];
        
        // Llamar a tu endpoint
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, 'http://localhost:8080/api/pdf.php');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($datos));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            return json_decode($response, true);
        } else {
            throw new Exception("Error en generador PDF: HTTP {$httpCode}");
        }
    }
    
    /**
     * Generar nombre de archivo según tipo
     */
    private function generarNombreArchivo($factura, $tipo) {
        $consecutivo = $factura['consecutivo'] ?? substr($factura['id'], 0, 8);
        $fecha = date('Ymd', strtotime($factura['fecha_emision']));
        
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
            '{tipo_factura}' => $factura['tipo_factura'] === 'ELECTRONICA' ? 'Electrónica' : 'Comercial',
            '{fecha}' => date('d/m/Y', strtotime($factura['fecha_emision'])),
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
        
        $tipoFactura = $factura['tipo_factura'] === 'ELECTRONICA' ? 'Electrónica' : 'Comercial';
        $estadoHacienda = '';
        
        if ($factura['tipo_factura'] === 'ELECTRONICA') {
            $estadoHacienda = '
            <div style="background: #dbeafe; border: 1px solid #3b82f6; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <h4 style="color: #1e40af; margin-bottom: 10px;">⚡ Factura Electrónica Certificada</h4>
                <p style="margin: 5px 0;"><strong>Clave:</strong> ' . htmlspecialchars($factura['clave']) . '</p>
                <p style="margin: 5px 0;"><strong>Estado:</strong> ' . ($factura['estado_hacienda'] ?? 'Procesada') . '</p>
                <p style="font-size: 12px; color: #6b7280;">Autorizada por el Ministerio de Hacienda de Costa Rica</p>
            </div>';
        }
        
        $variables = [
            '{nombre_cliente}' => htmlspecialchars($cliente['nombre']),
            '{numero_factura}' => $factura['consecutivo'] ?? substr($factura['id'], 0, 8),
            '{tipo_factura}' => $tipoFactura,
            '{fecha_emision}' => date('d/m/Y', strtotime($factura['fecha_emision'])),
            '{fecha_vencimiento}' => $factura['fecha_vencimiento'] ? date('d/m/Y', strtotime($factura['fecha_vencimiento'])) : 'No aplica',
            '{total}' => '₡' . number_format($factura['total_factura'], 2),
            '{saldo_pendiente}' => '₡' . number_format($factura['saldo_pendiente'] ?? $factura['total_factura'], 2),
            '{empresa}' => $this->config['empresa']['nombre'],
            '{telefono}' => $this->config['empresa']['telefono'],
            '{email}' => $this->config['empresa']['email'],
            '{sitio_web}' => $this->config['empresa']['sitio_web'] ?? '',
            '{lista_archivos}' => $listaArchivos,
            '{estado_hacienda}' => $estadoHacienda
        ];
        
        return str_replace(array_keys($variables), array_values($variables), $plantilla);
    }
    
    /**
     * Generar cuerpo de texto plano
     */
    private function generarCuerpoTexto($factura, $cliente) {
        $tipoFactura = $factura['tipo_factura'] === 'ELECTRONICA' ? 'Electrónica' : 'Comercial';
        
        return "
Estimado/a " . $cliente['nombre'] . ",

Adjunto encontrará su Factura {$tipoFactura} con los siguientes detalles:

Número: " . ($factura['consecutivo'] ?? substr($factura['id'], 0, 8)) . "
Fecha de emisión: " . date('d/m/Y', strtotime($factura['fecha_emision'])) . "
" . ($factura['fecha_vencimiento'] ? "Fecha de vencimiento: " . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) . "\n" : '') . "
Monto total: ₡" . number_format($factura['total_factura'], 2) . "

" . ($factura['tipo_factura'] === 'ELECTRONICA' ? "Esta factura electrónica ha sido certificada por el Ministerio de Hacienda.\nClave: " . $factura['clave'] . "\n\n" : '') . "

Archivos adjuntos:
- Factura en formato PDF
" . ($factura['tipo_factura'] === 'ELECTRONICA' ? "- XML Firmado digitalmente\n- XML Respuesta de Hacienda (si aplica)\n" : '') . "

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
            $cliente = $this->obtenerCliente($factura['cliente_id']);
            
            if (!$cliente['email']) {
                throw new Exception('Cliente sin email');
            }
            
            $diasVencido = $diasVencimiento ?? $this->calcularDiasVencido($factura['fecha_vencimiento']);
            
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
                        " . ($factura['tipo_factura'] === 'ELECTRONICA' ? "<p><strong>Clave:</strong> <small>{$factura['clave']}</small></p>" : '') . "
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
           $response = $this->supabase->from('facturas')
               ->select('*')
               ->eq('id', $facturaId)
               ->single();
               
           return $response->data ?? null;
       } catch (Exception $e) {
           error_log("Error obteniendo factura: " . $e->getMessage());
           return null;
       }
   }
   
   private function obtenerCliente($clienteId) {
       try {
           $response = $this->supabase->from('clientes')
               ->select('*')
               ->eq('id', $clienteId)
               ->single();
               
           return $response->data ?? null;
       } catch (Exception $e) {
           error_log("Error obteniendo cliente: " . $e->getMessage());
           return null;
       }
   }
   
   private function obtenerEmisor() {
       try {
           $response = $this->supabase->from('configuracion_empresa')
               ->select('*')
               ->limit(1)
               ->single();
               
           return $response->data ?? null;
       } catch (Exception $e) {
           error_log("Error obteniendo emisor: " . $e->getMessage());
           return null;
       }
   }
   
   private function obtenerDetallesFactura($facturaId) {
       try {
           $factura = $this->obtenerFacturaCompleta($facturaId);
           if ($factura && isset($factura['detalle'])) {
               return json_decode($factura['detalle'], true) ?? [];
           }
           return [];
       } catch (Exception $e) {
           error_log("Error obteniendo detalles: " . $e->getMessage());
           return [];
       }
   }
   
   private function actualizarEstadoEnvio($facturaId, $estado, $archivosEnviados = []) {
       try {
           $this->supabase->from('facturas')
               ->update([
                   'estado_envio' => $estado,
                   'fecha_envio' => date('Y-m-d H:i:s'),
                   'archivos_enviados' => json_encode($archivosEnviados)
               ])
               ->eq('id', $facturaId);
       } catch (Exception $e) {
           error_log("Error actualizando estado: " . $e->getMessage());
       }
   }
   
   private function registrarEnvio($facturaId, $destinatario, $tipo, $estado, $error = null, $archivos = []) {
       try {
           $this->supabase->from('envios_automaticos')->insert([
               'factura_id' => $facturaId,
               'destinatario' => $destinatario,
               'tipo_envio' => $tipo,
               'estado' => $estado,
               'archivos_enviados' => json_encode($archivos),
               'error_mensaje' => $error,
               'fecha_envio' => date('Y-m-d H:i:s'),
               'intentos' => 1
           ]);
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
           $response = $this->supabase->from('envios_automaticos')
               ->select('*')
               ->eq('factura_id', $facturaId)
               ->order('fecha_envio', ['ascending' => false]);
               
           return $response->data ?? [];
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
?>