<?php
require_once __DIR__ . '/../../config/config.php';
require_once __DIR__ . '/../utils/helpers.php';

use GuzzleHttp\Client;

function getHaciendaToken()
{
    $client = new Client();

    // Usar $_ENV en lugar de getenv() para mayor confiabilidad
    $tokenUrl = $_ENV['HACIENDA_TOKEN_URL'] ?? null;
    $clientId = $_ENV['HACIENDA_CLIENT_ID'] ?? null;
    $username = $_ENV['HACIENDA_USER'] ?? null;
    $password = $_ENV['HACIENDA_PASS'] ?? null;

    // Verificar que todas las variables existan
    if (!$tokenUrl) {
        throw new Exception('HACIENDA_TOKEN_URL no está configurada en .env');
    }
    if (!$clientId) {
        throw new Exception('HACIENDA_CLIENT_ID no está configurada en .env');
    }
    if (!$username) {
        throw new Exception('HACIENDA_USER no está configurada en .env');
    }
    if (!$password) {
        throw new Exception('HACIENDA_PASS no está configurada en .env');
    }

    try {
        $response = $client->request('POST', $tokenUrl, [
            'form_params' => [
                'grant_type' => 'password',
                'client_id' => $clientId,
                'username' => $username,
                'password' => $password
            ],
            'verify' => false // Deshabilitar SSL temporalmente
        ]);

        $data = json_decode($response->getBody(), true);
        return $data['access_token'] ?? null;
    } catch (\GuzzleHttp\Exception\RequestException $e) {
        $errorMessage = 'Error obteniendo token: ' . $e->getMessage();
        if ($e->hasResponse()) {
            $errorMessage .= ' - Response: ' . $e->getResponse()->getBody();
        }
        throw new Exception($errorMessage);
    }
}

function enviarAFacturaHacienda($xmlFirmado, $clave, $fecha, $emisorTipo, $emisorNum, $receptorTipo, $receptorNum)
{
    $token = getHaciendaToken();

    if (!$token) {
        throw new Exception('Token no obtenido de Hacienda');
    }

    $client = new Client();
    $recepcionUrl = $_ENV['HACIENDA_RECEPCION_URL'] ?? null;

    if (!$recepcionUrl) {
        throw new Exception('HACIENDA_RECEPCION_URL no está configurada en .env');
    }

    // DEBUG: Preparar datos que se envían
    $datosEnvio = [
        'clave' => $clave,
        'fecha' => $fecha,
        'emisor' => [
            'tipoIdentificacion' => $emisorTipo,
            'numeroIdentificacion' => $emisorNum
        ],
        'receptor' => [
            'tipoIdentificacion' => $receptorTipo,
            'numeroIdentificacion' => $receptorNum
        ],
        'comprobanteXml' => base64_encode($xmlFirmado)
    ];

    echo "=== DEBUG HACIENDA SERVICE ===\n";
    echo "URL: $recepcionUrl\n";
    echo "Token: " . substr($token, 0, 20) . "...\n";
    echo "Clave: $clave\n";
    echo "Fecha: $fecha\n";
    echo "Emisor: $emisorTipo - $emisorNum\n";
    echo "Receptor: $receptorTipo - $receptorNum\n";
    echo "XML length: " . strlen($xmlFirmado) . " chars\n";
    echo "Base64 XML length: " . strlen(base64_encode($xmlFirmado)) . " chars\n";
    echo "================================\n";

    try {
        $response = $client->request('POST', $recepcionUrl, [
            'headers' => [
                'Authorization' => 'Bearer ' . $token,
                'Content-Type' => 'application/json'
            ],
            'json' => $datosEnvio,
            'verify' => false // Deshabilitar SSL temporalmente
        ]);
        
        return [
            'success' => true,
            'status_code' => $response->getStatusCode(),
            'response' => json_decode($response->getBody(), true)
        ];
    } catch (\GuzzleHttp\Exception\ClientException $e) {
        $statusCode = $e->getResponse()->getStatusCode();
        $body = $e->getResponse()->getBody()->getContents();
        
        echo "=== ERROR HACIENDA ===\n";
        echo "Status Code: $statusCode\n";
        echo "Response Body: '$body'\n";
        echo "Response Length: " . strlen($body) . " chars\n";
        echo "====================\n";
        
        // Crear directorio logs si no existe
        $logDir = __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        $logMessage = date('Y-m-d H:i:s') . " - Error $statusCode\n";
        $logMessage .= "URL: $recepcionUrl\n";
        $logMessage .= "Clave: $clave\n";
        $logMessage .= "Body: '$body'\n";
        $logMessage .= "Headers: " . json_encode($e->getResponse()->getHeaders()) . "\n";
        $logMessage .= "========================\n";
        
        file_put_contents($logDir . '/error_hacienda.log', $logMessage, FILE_APPEND);
        
        throw new Exception("Hacienda respondió con error $statusCode: '$body'");
    } catch (\GuzzleHttp\Exception\RequestException $e) {
        $errorMessage = 'Error enviando a Hacienda: ' . $e->getMessage();
        if ($e->hasResponse()) {
            $errorMessage .= ' - Response: ' . $e->getResponse()->getBody();
        }
        
        // Crear directorio logs si no existe
        $logDir = __DIR__ . '/../../logs';
        if (!is_dir($logDir)) {
            mkdir($logDir, 0755, true);
        }
        
        file_put_contents($logDir . '/error_hacienda.log', 
            date('Y-m-d H:i:s') . " - Error: $errorMessage\n", FILE_APPEND);
        
        throw new Exception($errorMessage);
    }
}