<?php
class SupabaseService
{
    private $url;
    private $anonKey;
    private $serviceKey;

    public function __construct()
    {
        $this->url        = $_ENV['SUPABASE_URL']        ?? null;
        $this->anonKey    = $_ENV['SUPABASE_ANON_KEY']   ?? null;
        $this->serviceKey = $_ENV['SUPABASE_SERVICE_KEY']?? null;

        if (!$this->url || !$this->anonKey) {
            throw new Exception('Configuración de Supabase incompleta en .env');
        }
    }

    /* ================== Helpers HTTP ================== */
    private function headers($write = false) {
        $key = $write ? ($this->serviceKey ?: $this->anonKey) : $this->anonKey;
        return [
            'Content-Type: application/json',
            'apikey: ' . $key,
            'Authorization: Bearer ' . $key,
            'Prefer: return=representation'
        ];
    }

    private function get($path, $query = '') {
        $url = rtrim($this->url, '/') . '/rest/v1/' . ltrim($path,'/');
        if ($query) $url .= (strpos($url, '?') === false ? '?' : '&') . $query;

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $this->headers(false),
            CURLOPT_SSL_VERIFYPEER => false, // ⚠️ En producción ponlo en TRUE
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) throw new Exception("Supabase GET error: $err");
        if ($code >= 400) throw new Exception("Supabase GET HTTP $code: $res");

        return json_decode($res, true);
    }

    private function post($path, $payload) {
        $url = rtrim($this->url, '/') . '/rest/v1/' . ltrim($path,'/');

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $this->headers(true),
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_SSL_VERIFYPEER => false, // ⚠️ En producción TRUE
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) throw new Exception("Supabase POST error: $err");
        if ($code >= 400) throw new Exception("Supabase POST HTTP $code: $res");

        return json_decode($res, true);
    }

    private function patch($path, $payload) {
        $url = rtrim($this->url, '/') . '/rest/v1/' . ltrim($path,'/');

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $this->headers(true),
            CURLOPT_CUSTOMREQUEST => 'PATCH',
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_SSL_VERIFYPEER => false, // ⚠️ En producción TRUE
        ]);
        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err) throw new Exception("Supabase PATCH error: $err");
        if ($code >= 400) throw new Exception("Supabase PATCH HTTP $code: $res");

        return $res === '' ? true : json_decode($res, true);
    }

    /* ================== Facturas (tus métodos existentes) ================== */

    public function insertFactura($datos)
    {
        $facturaData = [
            'clave'               => $datos['clave'] ?? null,
            'consecutivo'         => $datos['consecutivo'] ?? null,
            'xml'                 => $datos['xml_firmado'] ?? ($datos['xml'] ?? null),
            'estado'              => $datos['estado'] ?? 'ENVIADA',
            'respuesta_hacienda'  => $datos['respuesta_hacienda'] ?? '',
            'cliente_id'          => $datos['cliente_id'] ?? null,
            'usuario_id'          => $datos['usuario_id'] ?? null,
            'fecha_emision'       => $datos['fecha_emision'] ?? date('Y-m-d H:i:s'),
            'condicion_venta'     => $datos['condicion_venta'] ?? 'CONTADO',
            'medio_pago'          => $datos['medio_pago'] ?? 'EFECTIVO',
            'moneda'              => $datos['moneda'] ?? 'CRC',
            'total_exento'        => $datos['total_exento'] ?? 0,
            'total_gravado'       => $datos['total_gravado'] ?? 0,
            'total_impuesto'      => $datos['total_impuesto'] ?? 0,
            'total_descuento'     => $datos['total_descuento'] ?? 0,
            'total_neto'          => $datos['total_neto'] ?? 0,
            'total_factura'       => $datos['total_factura'] ?? 0,
            'detalle'             => $datos['detalle'] ?? [],
            'saldo_pendiente'     => $datos['total_factura'] ?? 0,
            'porcentaje_impuesto' => $datos['porcentaje_impuesto'] ?? 13
        ];
        return $this->post('facturas', [$facturaData]);
    }

    public function getFactura($idOrClave)
    {
        // por id
        $r = $this->get('facturas', 'id=eq.'.urlencode($idOrClave));
        if (!empty($r)) return $r[0];
        // por clave
        $r = $this->get('facturas', 'clave=eq.'.urlencode($idOrClave));
        return $r[0] ?? null;
    }

    public function updateFacturaEstado($idOrClave, $estado, $additionalData = [])
    {
        $payload = array_merge(['estado_hacienda' => $estado, 'updated_at' => date('c')], $additionalData);
        // por id
        $ok = $this->patch('facturas?id=eq.'.urlencode($idOrClave), $payload);
        if ($ok === true) return true;
        // por clave
        $ok = $this->patch('facturas?clave=eq.'.urlencode($idOrClave), $payload);
        return $ok === true;
    }

    public function getFacturas($limit = 50, $offset = 0)
    {
        return $this->get('facturas', 'order=created_at.desc&limit='.$limit.'&offset='.$offset);
    }

    public function getCliente($clienteId)
    {
        $r = $this->get('clientes', 'id=eq.'.urlencode($clienteId));
        return $r[0] ?? null;
    }

    /* ================== NUEVO: Soporte recordatorios ================== */

    public function getFacturasPorVencimiento(string $fechaISO, array $estados = ['pendiente','en_proceso'])
    {
        // condicion_venta = '02' (Crédito), estado en lista, fecha_vencimiento exacta
        $estadoIn = 'in.(' . implode(',', array_map('strval', $estados)) . ')';
        $params = [
            'select' => 'id,consecutivo,cliente_id,fecha_vencimiento,total_factura,saldo_pendiente,condicion_venta,moneda',
            'condicion_venta' => 'eq.02',
            'estado' => $estadoIn,
            'fecha_vencimiento' => 'eq.' . $fechaISO,
            'order' => 'fecha_vencimiento.asc,consecutivo.asc'
        ];
        return $this->get('facturas', http_build_query($params));
    }

    public function yaSeEnvioRecordatorio(string $facturaId, string $tipo): bool
    {
        $q = http_build_query([
            'select' => 'id',
            'factura_id' => 'eq.' . $facturaId,
            'tipo'       => 'eq.' . $tipo,
            'limit'      => 1
        ]);
        $r = $this->get('recordatorios_log', $q);
        return !empty($r);
    }

    public function registrarRecordatorio(string $facturaId, string $tipo)
    {
        return $this->post('recordatorios_log', [[
            'factura_id' => $facturaId,
            'tipo'       => $tipo
        ]]);
    }
}
?>
