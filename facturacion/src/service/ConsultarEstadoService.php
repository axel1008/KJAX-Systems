<?php
require_once __DIR__ . '/../../config/config.php';

use GuzzleHttp\Client;

class ConsultarEstadoService
{
    public function consultarEstadoFactura($clave, $emisorTipo, $emisorNum)
    {
        // Método 1: Intentar con API de consultas
        try {
            return $this->consultarPorAPI($clave, $emisorTipo, $emisorNum);
        } catch (Exception $e) {
            echo "Método API falló: " . $e->getMessage() . "\n";
        }
        
        // Método 2: Consultar desde Supabase (estado local)
        try {
            return $this->consultarDesdeSupabase($clave);
        } catch (Exception $e) {
            echo "Método Supabase falló: " . $e->getMessage() . "\n";
        }
        
        throw new Exception("No se pudo consultar el estado por ningún método");
    }
    
    private function consultarPorAPI($clave, $emisorTipo, $emisorNum)
    {
        $token = $this->getHaciendaToken();
        if (!$token) {
            throw new Exception('Token no obtenido de Hacienda');
        }

        $client = new Client();
        
        // Intentar diferentes formatos de URL
        $urls = [
            // Formato 1: API de consultas oficial
            'https://api-sandbox.comprobanteselectronicos.go.cr/consultas/v1/recepcion/' . $clave . '-' . $emisorTipo . '-' . $emisorNum,
            
            // Formato 2: Sin guiones
            'https://api-sandbox.comprobanteselectronicos.go.cr/consultas/v1/recepcion/' . $clave,
            
            // Formato 3: Con parámetros query
            'https://api-sandbox.comprobanteselectronicos.go.cr/consultas/v1/recepcion?clave=' . $clave . '&emisor=' . $emisorNum
        ];

        foreach ($urls as $index => $url) {
            echo "=== INTENTANDO MÉTODO " . ($index + 1) . " ===\n";
            echo "URL: $url\n";
            
            try {
                $response = $client->request('GET', $url, [
                    'headers' => [
                        'Authorization' => 'bearer ' . $token,
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json'
                    ],
                    'verify' => false,
                    'timeout' => 15
                ]);
                
                $statusCode = $response->getStatusCode();
                $body = $response->getBody()->getContents();
                
                echo "✅ ÉXITO - Status: $statusCode\n";
                echo "Response: $body\n";
                
                return [
                    'success' => true,
                    'status_code' => $statusCode,
                    'response' => json_decode($body, true),
                    'raw_response' => $body,
                    'metodo_usado' => 'API_HACIENDA_' . ($index + 1)
                ];
                
            } catch (\GuzzleHttp\Exception\ClientException $e) {
                $statusCode = $e->getResponse()->getStatusCode();
                $body = $e->getResponse()->getBody()->getContents();
                
                echo "❌ Error Status: $statusCode\n";
                echo "Error: $body\n";
                
                // Si es 404, la factura no existe, no intentar más métodos
                if ($statusCode === 404) {
                    return [
                        'success' => false,
                        'status_code' => $statusCode,
                        'error' => 'Factura no encontrada en Hacienda',
                        'metodo_usado' => 'API_HACIENDA_' . ($index + 1)
                    ];
                }
                
                continue; // Intentar siguiente URL
            }
        }
        
        throw new Exception("Todos los métodos de API fallaron");
    }
    
    private function consultarDesdeSupabase($clave)
    {
        echo "=== CONSULTANDO DESDE SUPABASE ===\n";
        
        $supabase = new SupabaseService();
        $factura = $supabase->getFactura($clave);
        
        if (!$factura) {
            throw new Exception("Factura no encontrada en Supabase");
        }
        
        echo "Factura encontrada en Supabase\n";
        echo "Estado actual: " . ($factura['estado'] ?? 'N/A') . "\n";
        echo "Fecha: " . ($factura['created_at'] ?? 'N/A') . "\n";
        
        return [
            'success' => true,
            'status_code' => 200,
            'response' => [
                'ind-estado' => $factura['estado'] ?? 'DESCONOCIDO',
                'fecha-creacion' => $factura['created_at'],
                'total' => $factura['total_factura'],
                'respuesta-hacienda' => $factura['respuesta_hacienda']
            ],
            'metodo_usado' => 'SUPABASE_LOCAL',
            'factura_completa' => $factura
        ];
    }

    private function getHaciendaToken()
    {
        $client = new Client();

        $tokenUrl = $_ENV['HACIENDA_TOKEN_URL'] ?? null;
        $clientId = $_ENV['HACIENDA_CLIENT_ID'] ?? null;
        $username = $_ENV['HACIENDA_USER'] ?? null;
        $password = $_ENV['HACIENDA_PASS'] ?? null;

        if (!$tokenUrl || !$clientId || !$username || !$password) {
            throw new Exception('Configuración de Hacienda incompleta en .env');
        }

        try {
            $response = $client->request('POST', $tokenUrl, [
                'form_params' => [
                    'grant_type' => 'password',
                    'client_id' => $clientId,
                    'username' => $username,
                    'password' => $password
                ],
                'verify' => false
            ]);

            $data = json_decode($response->getBody(), true);
            return $data['access_token'] ?? null;
        } catch (\GuzzleHttp\Exception\RequestException $e) {
            throw new Exception('Error obteniendo token: ' . $e->getMessage());
        }
    }
}