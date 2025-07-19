<?php

class SupabaseService
{
    private $url;
    private $anonKey;
    private $serviceKey;

    public function __construct()
    {
        $this->url = $_ENV['SUPABASE_URL'] ?? null;
        $this->anonKey = $_ENV['SUPABASE_ANON_KEY'] ?? null;
        $this->serviceKey = $_ENV['SUPABASE_SERVICE_KEY'] ?? null;

        if (!$this->url || !$this->anonKey) {
            throw new Exception('Configuración de Supabase incompleta en .env');
        }
    }

    public function insertFactura($datos)
    {
        $url = $this->url . '/rest/v1/facturas';
        
        // Mapear datos a tu estructura de tabla
        $facturaData = [
            'clave' => $datos['clave'],
            'consecutivo' => $datos['consecutivo'],
            'xml' => $datos['xml_firmado'] ?? $datos['xml'],
            'estado' => $datos['estado'] ?? 'ENVIADA',
            'respuesta_hacienda' => $datos['respuesta_hacienda'] ?? '',
            'cliente_id' => $datos['cliente_id'] ?? null,
            'usuario_id' => $datos['usuario_id'] ?? null,
            'fecha_emision' => $datos['fecha_emision'] ?? date('Y-m-d H:i:s'),
            'condicion_venta' => $datos['condicion_venta'] ?? 'CONTADO',
            'medio_pago' => $datos['medio_pago'] ?? 'EFECTIVO',
            'moneda' => $datos['moneda'] ?? 'CRC',
            'total_exento' => $datos['total_exento'] ?? 0,
            'total_gravado' => $datos['total_gravado'] ?? 0,
            'total_impuesto' => $datos['total_impuesto'] ?? 0,
            'total_descuento' => $datos['total_descuento'] ?? 0,
            'total_neto' => $datos['total_neto'] ?? 0,
            'total_factura' => $datos['total_factura'] ?? 0,
            'detalle' => $datos['detalle'] ?? [],
            'saldo_pendiente' => $datos['total_factura'] ?? 0,
            'porcentaje_impuesto' => $datos['porcentaje_impuesto'] ?? 13
        ];
        
        $headers = [
            'Content-Type: application/json',
            'apikey: ' . $this->anonKey,
            'Authorization: Bearer ' . ($this->serviceKey ?? $this->anonKey),
            'Prefer: return=representation'
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($facturaData),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("Error cURL: $error");
        }

        if ($httpCode !== 201) {
            throw new Exception("Error Supabase: HTTP $httpCode - $response");
        }

        return json_decode($response, true);
    }

    public function getFactura($clave)
    {
        $url = $this->url . '/rest/v1/facturas?clave=eq.' . urlencode($clave);
        
        $headers = [
            'apikey: ' . $this->anonKey,
            'Authorization: Bearer ' . ($this->serviceKey ?? $this->anonKey)
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Error obteniendo factura: HTTP $httpCode");
        }

        $data = json_decode($response, true);
        return $data[0] ?? null; // Retorna la primera factura o null
    }

    public function updateFacturaEstado($clave, $estado, $additionalData = [])
    {
        $url = $this->url . '/rest/v1/facturas?clave=eq.' . urlencode($clave);
        
        $updateData = array_merge(['estado_hacienda' => $estado, 'updated_at' => date('c')], $additionalData);
        
        $headers = [
            'Content-Type: application/json',
            'apikey: ' . $this->anonKey,
            'Authorization: Bearer ' . ($this->serviceKey ?? $this->anonKey)
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => 'PATCH',
            CURLOPT_POSTFIELDS => json_encode($updateData),
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return $httpCode === 204; // 204 = No Content (success)
    }

    public function getFacturas($limit = 50, $offset = 0)
    {
        $url = $this->url . '/rest/v1/facturas?order=created_at.desc&limit=' . $limit . '&offset=' . $offset;
        
        $headers = [
            'apikey: ' . $this->anonKey,
            'Authorization: Bearer ' . ($this->serviceKey ?? $this->anonKey)
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_SSL_VERIFYPEER => false
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new Exception("Error obteniendo facturas: HTTP $httpCode");
        }

        return json_decode($response, true);
    }
}