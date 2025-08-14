<?php
// facturacion/src/service/EmailBasicoService.php
declare(strict_types=1);

require_once __DIR__ . '/../../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

class EmailBasicoService
{
    private array $config;

    public function __construct()
    {
        $configPath = __DIR__ . '/../../config/email_config.php';
        if (!file_exists($configPath)) {
            throw new \Exception('No se encontró config/email_config.php');
        }

        $cfg = include $configPath;
        if (!is_array($cfg)) {
            throw new \Exception('email_config.php inválido');
        }
        $this->config = $cfg;

        // Validaciones mínimas
        if (empty($this->config['smtp']['host']) ||
            empty($this->config['smtp']['username']) ||
            empty($this->config['smtp']['password'])) {
            throw new \Exception('Configuración SMTP incompleta en email_config.php');
        }
        if (empty($this->config['from']['email'])) {
            throw new \Exception('Falta from.email en email_config.php');
        }
    }

    /**
     * Envía un email HTML simple.
     * @param string $destinatario
     * @param string $asunto
     * @param string $mensaje HTML
     * @return array{success:bool, error?:string}
     */
    public function enviarEmail(string $destinatario, string $asunto, string $mensaje): array
    {
        $mail = new PHPMailer(true);

        try {
            // SMTP
            $mail->isSMTP();
            $mail->Host       = $this->config['smtp']['host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->config['smtp']['username'];
            $mail->Password   = $this->config['smtp']['password'];
            $mail->CharSet    = 'UTF-8';

            // Seguridad / Puerto
            // Si usas Gmail: secure = 'tls', port = 587
            $secure = $this->config['smtp']['secure'] ?? 'tls'; // 'tls' | 'ssl' | ''
            if ($secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port = (int)($this->config['smtp']['port'] ?? 465);
            } elseif ($secure === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->SMTPAutoTLS = true;
                $mail->Port = (int)($this->config['smtp']['port'] ?? 587);
            } else {
                $mail->SMTPSecure = false;
                $mail->Port = (int)($this->config['smtp']['port'] ?? 25);
            }

            // Opciones SSL permisivas en dev
            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];

            // Remitente / Destinatario
            $fromEmail = $this->config['from']['email'];
            $fromName  = $this->config['from']['name'] ?? ($this->config['empresa']['nombre'] ?? 'Sistema');
            $mail->setFrom($fromEmail, $fromName);
            $mail->addAddress($destinatario);

            // Contenido
            $mail->isHTML(true);
            $mail->Subject = $asunto;
            $mail->Body    = $mensaje;
            $mail->AltBody = strip_tags($mensaje);

            $mail->send();
            return ['success' => true];

        } catch (Exception $e) {
            return ['success' => false, 'error' => $mail->ErrorInfo ?: $e->getMessage()];
        }
    }

    /**
     * Prueba conexión SMTP sin enviar correo.
     * @return array{success:bool, message?:string, error?:string}
     */
    public function probarConfiguracion(): array
    {
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host       = $this->config['smtp']['host'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->config['smtp']['username'];
            $mail->Password   = $this->config['smtp']['password'];

            $secure = $this->config['smtp']['secure'] ?? 'tls';
            if ($secure === 'ssl') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port = (int)($this->config['smtp']['port'] ?? 465);
            } elseif ($secure === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                $mail->SMTPAutoTLS = true;
                $mail->Port = (int)($this->config['smtp']['port'] ?? 587);
            } else {
                $mail->SMTPSecure = false;
                $mail->Port = (int)($this->config['smtp']['port'] ?? 25);
            }

            $mail->SMTPOptions = [
                'ssl' => [
                    'verify_peer'       => false,
                    'verify_peer_name'  => false,
                    'allow_self_signed' => true,
                ],
            ];

            $mail->smtpConnect();
            $mail->smtpClose();

            return ['success' => true, 'message' => 'Configuración SMTP válida'];

        } catch (Exception $e) {
            return ['success' => false, 'error' => 'Error de configuración: ' . $e->getMessage()];
        }
    }
}
