<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../src/FacturaElectronica.php';
require_once __DIR__ . '/../src/service/HaciendaService.php';
require_once __DIR__ . '/../src/service/SupabaseService.php';
require_once __DIR__ . '/../src/utils/Signer.php';
require_once __DIR__ . '/../config/config.php';

use App\utils\Signer;

// Establecer header de respuesta JSON
header('Content-Type: application/json');

try {
    // Leer datos del request
    $input = file_get_contents('php://input');
    
    // DEBUG: Ver qué método y datos llegan
    echo "=== DEBUG REQUEST ===\n";
    echo "Método: " . $_SERVER['REQUEST_METHOD'] . "\n";
    echo "Input length: " . strlen($input) . "\n";
    echo "========================\n";
    
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && !empty($input)) {
        // Datos desde Postman (POST)
        $datosFactura = json_decode($input, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception('JSON inválido: ' . json_last_error_msg());
        }
        
        echo "=== DATOS RECIBIDOS DESDE POSTMAN ===\n";
        echo "Emisor: " . ($datosFactura['cedulaEmisor'] ?? 'NO ESPECIFICADO') . "\n";
        echo "Receptor: " . ($datosFactura['cedulaReceptor'] ?? 'NO ESPECIFICADO') . "\n";
        echo "Total: " . ($datosFactura['totalComprobante'] ?? 'NO ESPECIFICADO') . "\n";
        echo "Consecutivo: " . ($datosFactura['consecutivo'] ?? 'NO ESPECIFICADO') . "\n";
        
    } else {
        // Datos hardcodeados (GET o POST vacío)
        echo "=== USANDO DATOS DE PRUEBA ===\n";
        $datosFactura = [
            'tipoComprobante' => '01',
            'codigoPais' => '506',
            'dia' => date('d'),
            'mes' => date('m'),
            'anio' => date('Y'),
            'cedulaEmisor' => '3101123456',
            'consecutivo' => '00100001010000000011', // Número diferente
            'situacionComprobante' => '1',
            'codigoSeguridad' => '22222222', // Código diferente
            'emisorTipo' => '01',
            'nombreReceptor' => 'Cliente Prueba DB',
            'receptorTipo' => '01',
            'cedulaReceptor' => '114350898',
            'codigoMoneda' => 'CRC',
            'totalGravado' => 1000.00,
            'totalExento' => 0.00,
            'totalVenta' => 1000.00,
            'totalImpuesto' => 130.00,
            'totalComprobante' => 1130.00,
            'detalle' => [
                [
                    'numeroLinea' => 1,
                    'codigoCabys' => '5020220000000',
                    'cantidad' => 1,
                    'unidadMedida' => 'Unid',
                    'detalle' => 'Servicio con base de datos',
                    'precioUnitario' => 1000.00,
                    'montoTotal' => 1000.00
                ]
            ]
        ];
    }

    // 1. Generar XML
    echo "=== GENERANDO XML ===\n";
    $factura = new FacturaElectronica($datosFactura);
    $xml = $factura->generarXML();
    file_put_contents(__DIR__ . '/../temp/factura.xml', $xml);
    echo "XML generado correctamente\n";

    // 2. Firmar XML
    echo "=== FIRMANDO XML ===\n";
    $signer = new Signer();
    $certPath = $_ENV['P12_FILE'] ?? null;
    $certPassword = $_ENV['P12_PASSWORD'] ?? null;

    if (!$certPath || !$certPassword) {
        throw new Exception("Certificado no configurado correctamente");
    }

    $xmlFirmado = $signer->firmarXML($xml, $certPath, $certPassword);
    file_put_contents(__DIR__ . '/../temp/factura_firmada.xml', $xmlFirmado);
    echo "XML firmado correctamente\n";

    // 3. Extraer clave del XML
    preg_match('/<Clave>([^<]+)<\/Clave>/', $xml, $matches);
    $clave = $matches[1] ?? 'CLAVE_NO_ENCONTRADA';
    echo "Clave extraída: $clave\n";

    // 4. Preparar datos para Hacienda
    $emisorTipo = $datosFactura['emisorTipo'] ?? '01';
    $emisorNum = $datosFactura['cedulaEmisor'] ?? '3101123456';
    $receptorTipo = $datosFactura['receptorTipo'] ?? '01';
    $receptorNum = $datosFactura['cedulaReceptor'] ?? '114350898';

    // 5. Enviar a Hacienda
    echo "=== ENVIANDO A HACIENDA ===\n";
    $respuesta = enviarAFacturaHacienda(
        $xmlFirmado,
        $clave,
        date('c'),
        $emisorTipo,
        $emisorNum,
        $receptorTipo,
        $receptorNum
    );

    // 6. Guardar en Supabase
    echo "=== GUARDANDO EN SUPABASE ===\n";
    try {
        $supabase = new SupabaseService();
        
        $datosParaDB = [
            'clave' => $clave,
            'consecutivo' => $datosFactura['consecutivo'],
            'xml' => $xmlFirmado,
            'estado' => $respuesta['success'] ? 'ACEPTADA' : 'RECHAZADA',
            'respuesta_hacienda' => json_encode($respuesta),
            'fecha_emision' => date('Y-m-d H:i:s'),
            'condicion_venta' => 'CONTADO',
            'medio_pago' => 'EFECTIVO',
            'moneda' => $datosFactura['codigoMoneda'] ?? 'CRC',
            'total_exento' => $datosFactura['totalExento'] ?? 0,
            'total_gravado' => $datosFactura['totalGravado'] ?? 0,
            'total_impuesto' => $datosFactura['totalImpuesto'] ?? 0,
            'total_factura' => $datosFactura['totalComprobante'] ?? 0,
            'detalle' => $datosFactura['detalle'] ?? [],
            'saldo_pendiente' => $datosFactura['totalComprobante'] ?? 0
        ];
        
        $facturaGuardada = $supabase->insertFactura($datosParaDB);
        echo "Factura guardada en Supabase con ID: " . ($facturaGuardada[0]['id'] ?? 'N/A') . "\n";
        
    } catch (Exception $e) {
        echo "Error guardando en Supabase: " . $e->getMessage() . "\n";
        // No fallar si Supabase tiene problemas
    }

    echo "=== RESPUESTA FINAL ===\n";
    echo json_encode([
        'estado' => 'ok',
        'clave' => $clave,
        'factura_id' => $facturaGuardada[0]['id'] ?? null,
        'datos_enviados' => [
            'emisor' => "$emisorTipo - $emisorNum",
            'receptor' => "$receptorTipo - $receptorNum"
        ],
        'respuesta_hacienda' => $respuesta,
        'guardado_db' => isset($facturaGuardada)
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'estado' => 'error', 
        'mensaje' => $e->getMessage(),
        'linea' => $e->getLine(),
        'archivo' => basename($e->getFile())
    ], JSON_PRETTY_PRINT);
}