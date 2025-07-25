<?php
// Headers CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Leer datos del frontend
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido']);
    exit;
}

try {
    error_log("📤 Factura recibida en backend PHP: " . json_encode($data));
    
    $factura = $data['factura'];
    $emisor = $data['emisor'];
    $receptor = $data['receptor'];
    $detalles = $data['detalles_con_cabys'];
    
    // PASO 1: Generar clave numérica única
    $clave = generarClaveNumerica($factura, $emisor);
    
    // PASO 2: Construir XML de la factura
    $xml = construirXMLFactura($factura, $emisor, $receptor, $detalles, $clave);
    
    // PASO 3: Firmar XML con certificado digital
    $xmlFirmado = firmarXML($xml);
    
    // PASO 4: Enviar a Hacienda
    $respuestaHacienda = enviarAHacienda($xmlFirmado, $clave);
    
    // PASO 5: Responder al frontend
    echo json_encode([
        'success' => true,
        'message' => 'Factura procesada y enviada exitosamente',
        'clave' => $clave,
        'xml_firmado' => base64_encode($xmlFirmado),
        'estado_hacienda' => $respuestaHacienda['estado'],
        'mensaje_hacienda' => $respuestaHacienda['mensaje'],
        'consecutivo' => $factura['consecutivo'],
        'fecha_procesamiento' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    error_log("❌ Error procesando factura: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'message' => 'Error al procesar la factura electrónica'
    ]);
}

// ============= FUNCIONES DE HACIENDA =============

function generarClaveNumerica($factura, $emisor) {
    // Formato: PPAAAMMDDTTTNNNNNNNNNCS
    // PP: País (CR = 506)
    // AAA: Día del año
    // MM: Mes
    // DD: Día
    // TTT: Tipo comprobante (01 = Factura Electrónica)
    // NNNNNNNNN: Número consecutivo
    // C: Código de seguridad (random)
    // S: Dígito verificador
    
    $pais = "506";
    $fecha = new DateTime($factura['fecha_emision']);
    $dia_ano = $fecha->format('z') + 1; // +1 porque format('z') empieza en 0
    $mes = $fecha->format('m');
    $dia = $fecha->format('d');
    $tipo = "01"; // Factura Electrónica
    
    // Extraer número consecutivo (últimos 10 dígitos)
    $consecutivo = $factura['consecutivo'];
    preg_match('/(\d{10})$/', $consecutivo, $matches);
    $numero = $matches[1] ?? str_pad(rand(1, 9999999999), 10, '0', STR_PAD_LEFT);
    
    $codigo_seguridad = rand(1, 9);
    
    // Formar clave sin dígito verificador
    $clave_sin_dv = $pais . str_pad($dia_ano, 3, '0', STR_PAD_LEFT) . $mes . $dia . $tipo . $numero . $codigo_seguridad;
    
    // Calcular dígito verificador
    $dv = calcularDigitoVerificador($clave_sin_dv);
    
    return $clave_sin_dv . $dv;
}

function calcularDigitoVerificador($clave) {
    $multiplicadores = [2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2, 3, 4, 5, 6, 7, 2];
    
    $suma = 0;
    $len = strlen($clave);
    
    for ($i = 0; $i < $len; $i++) {
        $suma += (int)$clave[$i] * $multiplicadores[$i];
    }
    
    $residuo = $suma % 11;
    
    if ($residuo < 2) {
        return $residuo;
    } else {
        return 11 - $residuo;
    }
}

function construirXMLFactura($factura, $emisor, $receptor, $detalles, $clave) {
    // Aquí va tu lógica existente para generar el XML
    // Por ahora, XML básico de ejemplo:
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<FacturaElectronica xmlns="https://cdn.comprobanteselectronicos.go.cr/xml-schemas/v4.3/facturaElectronica">';
    $xml .= "<Clave>$clave</Clave>";
    $xml .= "<CodigoActividad>722001</CodigoActividad>"; // Ajustar según tu actividad
    $xml .= "<NumeroConsecutivo>{$factura['consecutivo']}</NumeroConsecutivo>";
    $xml .= "<FechaEmision>{$factura['fecha_emision']}T00:00:00-06:00</FechaEmision>";
    
    // Emisor
    $xml .= "<Emisor>";
    $xml .= "<Nombre>{$emisor['nombre']}</Nombre>";
    $xml .= "<Identificacion>";
    $xml .= "<Tipo>{$emisor['tipo_identificacion']}</Tipo>";
    $xml .= "<Numero>{$emisor['identificacion']}</Numero>";
    $xml .= "</Identificacion>";
    $xml .= "</Emisor>";
    
    // Receptor
    $xml .= "<Receptor>";
    $xml .= "<Nombre>{$receptor['nombre']}</Nombre>";
    $xml .= "<Identificacion>";
    $xml .= "<Tipo>{$receptor['tipo_identificacion']}</Tipo>";
    $xml .= "<Numero>{$receptor['identificacion']}</Numero>";
    $xml .= "</Identificacion>";
    $xml .= "</Receptor>";
    
    // Detalles (simplificado)
    $xml .= "<DetalleServicio>";
    foreach ($detalles as $detalle) {
        $xml .= "<LineaDetalle>";
        $xml .= "<NumeroLinea>{$detalle['linea']}</NumeroLinea>";
        $xml .= "<Codigo>{$detalle['codigo_producto']}</Codigo>";
        $xml .= "<CodigoComercial>";
        $xml .= "<Tipo>04</Tipo>"; // CABYS
        $xml .= "<Codigo>{$detalle['cabys_code']}</Codigo>";
        $xml .= "</CodigoComercial>";
        $xml .= "<Cantidad>{$detalle['cantidad']}</Cantidad>";
        $xml .= "<UnidadMedida>Unid</UnidadMedida>";
        $xml .= "<Detalle>{$detalle['descripcion']}</Detalle>";
        $xml .= "<PrecioUnitario>{$detalle['precio_unitario']}</PrecioUnitario>";
        $xml .= "<MontoTotal>{$detalle['total']}</MontoTotal>";
        $xml .= "</LineaDetalle>";
    }
    $xml .= "</DetalleServicio>";
    
    // Totales
    $xml .= "<ResumenFactura>";
    $xml .= "<CodigoTipoMoneda>CRC</CodigoTipoMoneda>";
    $xml .= "<TotalServGravados>{$factura['subtotal']}</TotalServGravados>";
    $xml .= "<TotalImpuesto>{$factura['impuestos']}</TotalImpuesto>";
    $xml .= "<TotalComprobante>{$factura['total']}</TotalComprobante>";
    $xml .= "</ResumenFactura>";
    
    $xml .= '</FacturaElectronica>';
    
    return $xml;
}

function firmarXML($xml) {
    // Aquí va tu lógica de firma digital existente
    // Por ahora retorna el XML sin firmar para testing
    return $xml;
}

function enviarAHacienda($xmlFirmado, $clave) {
    // Aquí va tu lógica para enviar a Hacienda
    // Por ahora respuesta simulada
    return [
        'estado' => 'aceptada',
        'mensaje' => 'Factura procesada exitosamente (simulación)'
    ];
}
?>