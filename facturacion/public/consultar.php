<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/service/SupabaseService.php';
require_once __DIR__ . '/../src/service/ConsultarEstadoService.php';
require_once __DIR__ . '/../config/config.php';

header('Content-Type: application/json');

try {
    $method = $_SERVER['REQUEST_METHOD'];
    $input  = file_get_contents('php://input');

    echo "=== CONSULTAR ESTADO DE FACTURAS ===\n";
    echo "Método: $method\n";

    if ($method === 'GET') {
        // Consultar por clave específica en URL
        $clave      = $_GET['clave'] ?? null;
        $emisorTipo = $_GET['emisor_tipo'] ?? '01';
        $emisorNum  = $_GET['emisor_numero'] ?? '3101123456';

        if (!$clave) {
            throw new Exception('Parámetro "clave" requerido. Ejemplo: ?clave=506190722...&emisor_tipo=01&emisor_numero=3101123456');
        }

        echo "Consultando clave: $clave\n";

        $consultarService = new ConsultarEstadoService();
        $resultado = $consultarService->consultarEstadoFactura($clave, $emisorTipo, $emisorNum);

        // Actualizar estado en Supabase si es exitoso
        if (!empty($resultado['success']) && isset($resultado['response'])) {
            try {
                $supabase      = new SupabaseService();
                $estadoHacienda = $resultado['response']['ind-estado'] ?? 'DESCONOCIDO';

                $supabase->updateFacturaEstado($clave, $estadoHacienda, [
                    'respuesta_hacienda' => json_encode($resultado['response'])
                ]);

                echo "Estado actualizado en Supabase\n";
            } catch (Exception $e) {
                echo "Error actualizando Supabase: " . $e->getMessage() . "\n";
            }
        }

        echo json_encode([
            'estado'   => 'ok',
            'clave'    => $clave,
            'consulta' => $resultado
        ], JSON_PRETTY_PRINT);

    } elseif ($method === 'POST') {
        // Consultar múltiples facturas desde Supabase
        $data  = json_decode($input, true) ?: [];
        $limit = (int)($data['limit'] ?? 10);

        echo "Consultando últimas $limit facturas de Supabase\n";

        // Obtener facturas de Supabase
        $supabase = new SupabaseService();
        $facturas = $supabase->getFacturas($limit, 0);

        if (empty($facturas)) {
            throw new Exception('No hay facturas en la base de datos');
        }

        // Preparar datos para consulta (solo con clave)
        $facturasParaConsultar = [];
        foreach ($facturas as $factura) {
            if (!empty($factura['clave'])) {
                $facturasParaConsultar[] = [
                    'clave'         => $factura['clave'],
                    'emisor_tipo'   => '01',        // Ajusta si usas otro valor
                    'emisor_numero' => '3101123456' // Ajusta con tu cédula jurídica
                ];
            }
        }

        echo "Consultando " . count($facturasParaConsultar) . " facturas en Hacienda\n";

        // Consultar estados en Hacienda (sin consultarMultiplesFacturas)
        $consultarService = new ConsultarEstadoService();
        $resultados       = [];
        $consultadas      = 0;

        foreach ($facturasParaConsultar as $f) {
            $clave = $f['clave'];
            $emisorTipo = $f['emisor_tipo'];
            $emisorNum  = $f['emisor_numero'];

            try {
                $res = $consultarService->consultarEstadoFactura($clave, $emisorTipo, $emisorNum);
                $resultados[] = [
                    'clave'    => $clave,
                    'success'  => (bool)($res['success'] ?? false),
                    'response' => $res['response'] ?? null,
                    'error'    => $res['error'] ?? null
                ];
                $consultadas++;

                // Actualizar Supabase si hay respuesta
                if (!empty($res['success']) && isset($res['response'])) {
                    $estadoHacienda = $res['response']['ind-estado'] ?? 'DESCONOCIDO';
                    try {
                        $supabase->updateFacturaEstado($clave, $estadoHacienda, [
                            'respuesta_hacienda' => json_encode($res['response'])
                        ]);
                    } catch (Exception $e) {
                        error_log("Error actualizando Supabase para $clave: " . $e->getMessage());
                    }
                }
            } catch (Exception $e) {
                $resultados[] = [
                    'clave'   => $clave,
                    'success' => false,
                    'error'   => $e->getMessage()
                ];
            }
        }

        echo json_encode([
            'estado'          => 'ok',
            'total_facturas'  => count($facturas),
            'consultadas'     => $consultadas,
            'resultados'      => $resultados
        ], JSON_PRETTY_PRINT);

    } else {
        throw new Exception('Método no soportado. Use GET para consulta específica o POST para múltiples');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'estado'  => 'error',
        'mensaje' => $e->getMessage(),
        'linea'   => $e->getLine(),
        'archivo' => basename($e->getFile())
    ], JSON_PRETTY_PRINT);
}
