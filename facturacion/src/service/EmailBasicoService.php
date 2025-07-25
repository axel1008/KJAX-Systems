<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

class EmailBasicoService {
    private $config;
    
    public function __construct() {
        $this->config = include __DIR__ . '/../../config/email_config.php';
        
        if (!$this->config) {
            throw new Exception('No se pudo cargar la configuración de email');
        }
    }
    
    public function enviarEmail($destinatario, $asunto, $mensaje) {
        try {
            $mail = new PHPMailer(true);
            
            // Configuración SMTP básica
            $mail->isSMTP();
            $mail->Host = $this->config['smtp']['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $this->config['smtp']['username'];
            $mail->Password = $this->config['smtp']['password'];
            $mail->Port = $this->config['smtp']['port'];
            $mail->CharSet = 'UTF-8';
            
            // ✅ CONFIGURACIONES SSL DESACTIVADAS PARA MAILTRAP
            $mail->SMTPSecure = false;                // Sin encriptación
            $mail->SMTPAutoTLS = false;               // Sin TLS automático
            
            // Configuraciones adicionales para evitar errores SSL
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            // Remitente y destinatario
            $mail->setFrom($this->config['from']['email'], $this->config['from']['name']);
            $mail->addAddress($destinatario);
            
            // Contenido
            $mail->isHTML(true);
            $mail->Subject = $asunto;
            $mail->Body = $mensaje;
            
            // Enviar
            $mail->send();
            
            return [
                'success' => true,
                'message' => 'Email enviado exitosamente'
            ];
            
        } catch (PHPMailerException $e) {
            error_log("Error PHPMailer: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Error de email: ' . $e->getMessage()
            ];
        } catch (Exception $e) {
            error_log("Error general: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    public function probarConfiguracion() {
        try {
            $mail = new PHPMailer(true);
            
            // Misma configuración que enviarEmail
            $mail->isSMTP();
            $mail->Host = $this->config['smtp']['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $this->config['smtp']['username'];
            $mail->Password = $this->config['smtp']['password'];
            $mail->Port = $this->config['smtp']['port'];
            
            // ✅ CONFIGURACIONES SSL DESACTIVADAS
            $mail->SMTPSecure = false;
            $mail->SMTPAutoTLS = false;
            
            $mail->SMTPOptions = array(
                'ssl' => array(
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                    'allow_self_signed' => true
                )
            );
            
            // Probar conexión sin enviar
            $mail->smtpConnect();
            $mail->smtpClose();
            
            return [
                'success' => true,
                'message' => 'Configuración SMTP válida'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Error de configuración: ' . $e->getMessage()
            ];
        }
    }
}
?>