<?php
// HEADERS UTF-8
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// CARGAR DEPENDENCIAS
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../src/QRGenerator.php';

use Dompdf\Dompdf;
use Dompdf\Options;

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['factura'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de factura requeridos']);
    exit;
}

try {
    // Cargar configuración
    $config = include __DIR__ . '/../../config/pdf_config.php';
    
    $factura = $data['factura'];
    $emisor = $data['emisor'];
    $receptor = $data['receptor'];
    $detalles = $data['detalles'];

    // Configurar DOMPDF
    $options = new Options();
    $options->set('defaultFont', 'DejaVu Sans');
    $options->set('isRemoteEnabled', true);
    $options->set('isHtml5ParserEnabled', true);
    $options->set('chroot', realpath(__DIR__ . '/../../'));

    $dompdf = new Dompdf($options);

    // Generar HTML moderno
    $html = generarFacturaModernaProfesional($factura, $emisor, $receptor, $detalles, $config);
    
    $dompdf->loadHtml($html, 'UTF-8');
    $dompdf->setPaper('A4', 'portrait');
    $dompdf->render();

    // Generar archivo
    $filename = 'Factura_' . ($factura['consecutivo'] ?? substr($factura['id'], 0, 8)) . '.pdf';
    $pdfContent = $dompdf->output();
    $base64Pdf = base64_encode($pdfContent);

    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'pdf_base64' => $base64Pdf,
        'message' => 'PDF generado exitosamente'
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    error_log("Error generando PDF: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}

function generarFacturaModernaProfesional($factura, $emisor, $receptor, $detalles, $config) {
    // Calcular totales
    $subtotal = 0;
    $totalImpuestos = 0;
    $totalDescuentos = 0;
    
    foreach ($detalles as $detalle) {
        $cantidad = floatval($detalle['cantidad'] ?? 0);
        $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
        $impuesto = floatval($detalle['impuesto'] ?? 13);
        $descuento = floatval($detalle['descuento'] ?? 0);
        
        $lineaSubtotal = $cantidad * $precioUnitario;
        $lineaDescuento = $lineaSubtotal * ($descuento / 100);
        $lineaImpuesto = ($lineaSubtotal - $lineaDescuento) * ($impuesto / 100);
        
        $subtotal += $lineaSubtotal;
        $totalDescuentos += $lineaDescuento;
        $totalImpuestos += $lineaImpuesto;
    }
    $total = $subtotal - $totalDescuentos + $totalImpuestos;

    // Generar QR
    $qrCodeBase64 = '';
    if (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' && !empty($factura['clave'])) {
        $qrData = $factura['clave'] . ',' . $factura['fecha_emision'] . ',' . $emisor['numero_identificacion'] . ',' . $receptor['identificacion'] . ',' . number_format($total, 2, '.', '');
        $qrCodeBase64 = QRGenerator::generateQRBase64($qrData, 120);
    }

    $html = '
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { 
                margin: 15mm; 
                size: A4 portrait; 
            }
            * { 
                margin: 0; 
                padding: 0; 
                box-sizing: border-box; 
            }
            body { 
                font-family: "DejaVu Sans", Arial, sans-serif; 
                font-size: 10px; 
                line-height: 1.4; 
                color: #2d3748;
                background: #ffffff;
            }
            
            /* === HEADER MODERNO === */
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            
            .header-grid {
                display: table;
                width: 100%;
            }
            .header-left, .header-center, .header-right {
                display: table-cell;
                vertical-align: top;
                padding: 0 10px;
            }
            .header-left { width: 30%; }
            .header-center { width: 40%; }
            .header-right { width: 30%; }
            
            .logo-section {
                text-align: center;
                margin-bottom: 10px;
            }
            .company-logo {
                width: 70px;
                height: 70px;
                background: rgba(255,255,255,0.2);
                border-radius: 15px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                font-weight: bold;
                border: 2px solid rgba(255,255,255,0.3);
                backdrop-filter: blur(10px);
            }
            
            .company-info {
                text-align: center;
            }
            .company-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .company-slogan {
                font-size: 11px;
                opacity: 0.9;
                font-style: italic;
                margin-bottom: 8px;
            }
            .company-details {
                font-size: 9px;
                opacity: 0.85;
                line-height: 1.5;
            }
            
            .invoice-badge {
                background: rgba(255,255,255,0.15);
                border: 2px solid rgba(255,255,255,0.3);
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                backdrop-filter: blur(15px);
            }
            .invoice-type {
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .invoice-number {
                font-size: 12px;
                background: rgba(255,255,255,0.25);
                padding: 6px 10px;
                border-radius: 8px;
                margin: 5px 0;
                display: inline-block;
                font-weight: bold;
            }
            .invoice-dates {
                font-size: 9px;
                line-height: 1.4;
            }
            
            /* === CARDS DE INFORMACIÓN === */
            .info-section {
                margin: 20px 0;
                display: table;
                width: 100%;
                border-spacing: 15px;
            }
            
            .info-card {
                display: table-cell;
                width: 48%;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 1px solid #cbd5e0;
                border-radius: 12px;
                padding: 18px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
                vertical-align: top;
            }
            
            .card-header {
                background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: -18px -18px 15px -18px;
                text-align: center;
            }
            
            .card-content {
                font-size: 9px;
                line-height: 1.6;
            }
            .highlight-text {
                font-weight: bold;
                color: #2d3748;
                font-size: 11px;
                margin-bottom: 8px;
                padding-bottom: 5px;
                border-bottom: 2px solid #667eea;
            }
            
            /* === INFORMACIÓN ELECTRÓNICA === */
            .electronic-banner {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px;
                border-radius: 12px;
                text-align: center;
                margin: 15px 0;
                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            .electronic-title {
                font-size: 12px;
                font-weight: bold;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .electronic-subtitle {
                font-size: 9px;
                opacity: 0.9;
                margin-bottom: 10px;
            }
            .clave-container {
                background: rgba(255,255,255,0.15);
                border: 1px solid rgba(255,255,255,0.3);
                border-radius: 8px;
                padding: 8px;
                font-family: monospace;
                font-size: 8px;
                word-break: break-all;
                backdrop-filter: blur(10px);
            }
            
            /* === TABLA MODERNA === */
            .products-section {
                margin: 20px 0;
            }
            .section-title {
                background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                color: white;
                padding: 12px;
                border-radius: 8px 8px 0 0;
                font-size: 11px;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                text-align: center;
            }
            
            .products-table {
                width: 100%;
                border-collapse: collapse;
                background: white;
                border-radius: 0 0 12px 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .products-table th {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px 6px;
                font-size: 8px;
                font-weight: bold;
                text-transform: uppercase;
                text-align: center;
                border-right: 1px solid rgba(255,255,255,0.2);
            }
            .products-table td {
                padding: 8px 6px;
                border-bottom: 1px solid #e2e8f0;
                border-right: 1px solid #e2e8f0;
                font-size: 9px;
                vertical-align: top;
            }
            .products-table tr:nth-child(even) {
                background: #f7fafc;
            }
            .products-table tr:hover {
                background: #edf2f7;
            }
            
            .product-name {
                font-weight: bold;
                color: #2d3748;
                margin-bottom: 3px;
            }
            .product-code {
                font-size: 8px;
                color: #718096;
                font-family: monospace;
            }
            
            /* === SECCIÓN FINAL === */
            .final-section {
                margin-top: 25px;
                display: table;
                width: 100%;
            }
            
            .payment-conditions {
                display: table-cell;
                width: 35%;
                vertical-align: top;
                padding-right: 20px;
            }
            .conditions-card {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 1px solid #cbd5e0;
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .conditions-title {
                background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                color: white;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                margin: -15px -15px 12px -15px;
                text-align: center;
            }
            .conditions-content {
                font-size: 9px;
                line-height: 1.5;
            }
            
            .totals-qr-section {
                display: table-cell;
                width: 65%;
                vertical-align: top;
            }
            .totals-qr-grid {
                display: table;
                width: 100%;
            }
            .totals-column {
                display: table-cell;
                width: 60%;
                padding-right: 15px;
                vertical-align: top;
            }
            .qr-column {
                display: table-cell;
                width: 40%;
                vertical-align: top;
            }
            
            .totals-card {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 2px solid #667eea;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            }
            .totals-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 10px;
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
                text-align: center;
            }
            .totals-content {
                padding: 15px;
            }
            .total-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 6px 0;
                font-size: 10px;
                border-bottom: 1px solid #e2e8f0;
            }
            .total-row:last-child {
                border-bottom: none;
            }
            .total-label {
                font-weight: 600;
                color: #4a5568;
            }
            .total-value {
                font-weight: bold;
                color: #2d3748;
            }
            .final-total {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                margin: 10px -15px -15px -15px;
                padding: 12px 15px;
                font-size: 12px;
                font-weight: bold;
                display: flex;
                justify-content: space-between;
            }
            
            .qr-card {
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 1px solid #cbd5e0;
                border-radius: 12px;
                padding: 15px;
                text-align: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .qr-header {
                background: linear-gradient(135deg, #4a5568 0%, #2d3748 100%);
                color: white;
                padding: 8px;
                border-radius: 8px;
                font-size: 9px;
                font-weight: bold;
                text-transform: uppercase;
                margin: -15px -15px 12px -15px;
            }
            .qr-image {
                width: 100px;
                height: 100px;
                border: 2px solid #667eea;
                border-radius: 8px;
                margin: 10px 0;
            }
            .qr-description {
                font-size: 8px;
                color: #718096;
                line-height: 1.3;
            }
            
            /* === FOOTER === */
            .footer {
                margin-top: 30px;
                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                border: 1px solid #cbd5e0;
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            }
            .footer-content {
                font-size: 8px;
                color: #4a5568;
                line-height: 1.4;
                margin-bottom: 10px;
            }
            .footer-highlight {
                color: #667eea;
                font-weight: bold;
            }
            .footer-legal {
                font-size: 7px;
                color: #718096;
                border-top: 1px solid #e2e8f0;
                padding-top: 10px;
                margin-top: 10px;
            }
            
            /* === UTILIDADES === */
            .text-left { text-align: left; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
        </style>
    </head>
    <body>
        <!-- Header moderno con gradiente -->
        <div class="header">
            <div class="header-grid">
                <div class="header-left">
                    <div class="logo-section">
                        <div class="company-logo">' . htmlspecialchars($config['empresa']['codigo_logo']) . '</div>
                    </div>
                </div>
                <div class="header-center">
                    <div class="company-info">
                        <div class="company-name">' . htmlspecialchars($config['empresa']['nombre']) . '</div>
                        <div class="company-slogan">' . htmlspecialchars($config['empresa']['eslogan']) . '</div>
                        <div class="company-details">
                            <strong>Cédula Jurídica:</strong> ' . htmlspecialchars($emisor['numero_identificacion']) . '<br>
                            <strong>Teléfono:</strong> ' . htmlspecialchars($config['empresa']['telefono_contacto']) . '<br>
                            <strong>Email:</strong> ' . htmlspecialchars($config['empresa']['email_contacto']) . '<br>
                            <strong>Dirección:</strong> ' . htmlspecialchars($emisor['provincia'] . ', ' . $emisor['canton'] . ', ' . $emisor['distrito']) . '
                        </div>
                    </div>
                </div>
                <div class="header-right">
                    <div class="invoice-badge">
                        <div class="invoice-type">
                            ' . (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' ? '⚡ FACTURA ELECTRÓNICA' : '📄 FACTURA') . '
                        </div>
                        <div class="invoice-number">No. ' . htmlspecialchars($factura['consecutivo'] ?? 'N/A') . '</div>
                        <div class="invoice-dates">
                            <strong>Fecha Emisión:</strong><br>' . date('d/m/Y', strtotime($factura['fecha_emision'])) . '<br>
                            ' . (isset($factura['fecha_vencimiento']) && $factura['fecha_vencimiento'] ? 
                                '<strong>Vencimiento:</strong><br>' . date('d/m/Y', strtotime($factura['fecha_vencimiento'])) : '') . '
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cards de información -->
        <div class="info-section">
            <div class="info-card">
                <div class="card-header">👤 Información del Cliente</div>
                <div class="card-content">
                    <div class="highlight-text">' . htmlspecialchars($receptor['nombre']) . '</div>
                    <strong>Identificación:</strong> ' . htmlspecialchars($receptor['tipo_identificacion'] . ': ' . $receptor['identificacion']) . '<br>
                    <strong>Teléfono:</strong> ' . htmlspecialchars($receptor['telefono'] ?? 'No especificado') . '<br>
                    <strong>Email:</strong> ' . htmlspecialchars($receptor['correo'] ?? $receptor['email'] ?? 'No especificado') . '<br>
                    <strong>Dirección:</strong> ' . htmlspecialchars($receptor['provincia'] . ', ' . $receptor['canton'] . ', ' . $receptor['distrito']) . '<br>
                    ' . (isset($receptor['direccion_exacta']) && $receptor['direccion_exacta'] ? 
                        '<strong>Detalle:</strong> ' . htmlspecialchars($receptor['direccion_exacta']) : '') . '
                </div>
            </div>
            <div class="info-card">
                <div class="card-header">💼 Condiciones de Venta</div>
                <div class="card-content">
                    <strong>Condición de Venta:</strong><br>
                    <span class="highlight-text">' . getCondicionVentaNombre($factura['condicion_venta']) . '</span>
                    <strong>Método de Pago:</strong> ' . getMetodoPagoNombre($factura['medio_pago'] ?? '01') . '<br>
                    <strong>Moneda:</strong> ' . ($factura['moneda'] ?? 'CRC (Colones)') . '<br>
                    ' . (isset($factura['plazo_credito']) && $factura['plazo_credito'] > 0 ? 
                        '<strong>Plazo de Crédito:</strong> ' . $factura['plazo_credito'] . ' días<br>' : '') . '
                    <strong>Estado:</strong> <span style="color: #059669; font-weight: bold;">' . ($factura['estado'] ?? 'Pendiente') . '</span>
                </div>
            </div>
        </div>';

    // Banner de factura electrónica
    if (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' && isset($factura['clave'])) {
        $html .= '
        <div class="electronic-banner">
            <div class="electronic-title">⚡ FACTURA ELECTRÓNICA CERTIFICADA</div>
            <div class="electronic-subtitle">Autorizada por el Ministerio de Hacienda de Costa Rica</div>
            <div class="electronic-subtitle">Resolución DGT-R-48-2016</div>
            <div class="clave-container">
                <strong>Clave Numérica:</strong> ' . htmlspecialchars($factura['clave']) . '
            </div>
        </div>';
    }

    // Tabla de productos moderna
    $html .= '
        <div class="products-section">
            <div class="section-title">📦 Productos y Servicios</div>
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 35%;">Descripción</th>
                        <th style="width: 10%;">Cantidad</th>
                        <th style="width: 15%;">Precio Unitario</th>
                        <th style="width: 10%;">Impuesto</th>
                        <th style="width: 10%;">Descuento</th>
                        <th style="width: 15%;">Total Línea</th>
                    </tr>
                </thead>
                <tbody>';

    foreach ($detalles as $index => $detalle) {
        $cantidad = floatval($detalle['cantidad'] ?? 0);
        $precioUnitario = floatval($detalle['precio_unitario'] ?? 0);
        $impuestoPorcentaje = floatval($detalle['impuesto'] ?? 13);
        $descuentoPorcentaje = floatval($detalle['descuento'] ?? 0);
        
        $lineaSubtotal = $cantidad * $precioUnitario;
        $lineaDescuento = $lineaSubtotal * ($descuentoPorcentaje / 100);
        $lineaImpuesto = ($lineaSubtotal - $lineaDescuento) * ($impuestoPorcentaje / 100);
        $lineaTotal = $lineaSubtotal - $lineaDescuento + $lineaImpuesto;
        
        $html .= '
            <tr>
                <td class="text-center font-bold">' . ($index + 1) . '</td>
                <td class="text-left">
                    <div class="product-name">' . htmlspecialchars($detalle['descripcion_item']) . '</div>
                    ' . (isset($detalle['cabys_code']) ? '<div class="product-code">CABYS: ' . $detalle['cabys_code'] . '</div>' : '') . '
                    ' . (isset($detalle['unidad_medida']) ? '<div class="product-code">Unidad: ' . $detalle['unidad_medida'] . '</div>' : '') . '
                </td>
                <td class="text-center font-bold">' . number_format($cantidad, 2) . '</td>
                <td class="text-right">₡' . number_format($precioUnitario, 2) . '</td>
                <td class="text-center">' . number_format($impuestoPorcentaje, 1) . '%</td>
                <td class="text-center">' . number_format($descuentoPorcentaje, 1) . '%</td>
                <td class="text-right font-bold">₡' . number_format($lineaTotal, 2) . '</td>
            </tr>';
    }

    $html .= '
                </tbody>
            </table>
        </div>

        <!-- Sección final: Condiciones + Totales + QR -->
        <div class="final-section">
            <div class="payment-conditions">
                <div class="conditions-card">
                    <div class="conditions-title">📋 Condiciones de Pago</div>
                    <div class="conditions-content">
                        <strong>Condición:</strong> ' . getCondicionVentaNombre($factura['condicion_venta']) . '<br><br>
                        <strong>Método de Pago:</strong> ' . getMetodoPagoNombre($factura['medio_pago'] ?? '01') . '<br><br>
                        ' . (isset($factura['plazo_credito']) && $factura['plazo_credito'] > 0 ? 
                            '<strong>Plazo:</strong> ' . $factura['plazo_credito'] . ' días<br><br>' : '') . '
                        <strong>Observaciones:</strong><br>
                        ' . (isset($factura['observaciones']) ? htmlspecialchars($factura['observaciones']) : 'Gracias por su preferencia. Pago según condiciones acordadas.') . '
                    </div>
                </div>
            </div>
            
            <div class="totals-qr-section">
                <div class="totals-qr-grid">
                    <div class="totals-column">
                        <div class="totals-card">
                            <div class="totals-header">💰 Resumen de Facturación</div>
                            <div class="totals-content">
                                <div class="total-row">
                                    <span class="total-label">Subtotal</span>
                                    <span class="total-value">₡' . number_format($subtotal, 2) . '</span>
                                </div>
                                ' . ($totalDescuentos > 0 ? '
                                <div class="total-row">
                                    <span class="total-label">Descuentos</span>
                                    <span class="total-value">-₡' . number_format($totalDescuentos, 2) . '</span>
                                </div>' : '') . '
                                <div class="total-row">
                                    <span class="total-label">Impuestos (IVA 13%)</span>
                                    <span class="total-value">₡' . number_format($totalImpuestos, 2) . '</span>
                                </div>
                                <div class="total-row">
                                    <span class="total-label">Saldo Pendiente</span>
                                    <span class="total-value">₡' . number_format($factura['saldo_pendiente'] ?? $total, 2) . '</span>
                                </div>
                                <div class="final-total">
                                    <span>TOTAL A PAGAR</span>
                                   <span>₡' . number_format($total, 2) . '</span>
                               </div>
                           </div>
                       </div>
                   </div>
                   <div class="qr-column">';
                   
       // QR Code para facturas electrónicas
       if ($qrCodeBase64) {
           $html .= '
                       <div class="qr-card">
                           <div class="qr-header">📱 Código QR Verificación</div>
                           <img src="' . $qrCodeBase64 . '" class="qr-image" alt="QR Code">
                           <div class="qr-description">
                               Escanee para verificar la autenticidad de este documento en el sitio web del Ministerio de Hacienda
                           </div>
                       </div>';
       } else {
           $html .= '
                       <div class="qr-card">
                           <div class="qr-header">📄 Documento Interno</div>
                           <div style="width: 100px; height: 100px; border: 2px dashed #cbd5e0; margin: 10px auto; display: flex; align-items: center; justify-content: center; border-radius: 8px; background: #f7fafc;">
                               <div style="text-align: center; font-size: 8px; color: #718096;">
                                   Factura<br>Interna<br>Sin QR
                               </div>
                           </div>
                           <div class="qr-description">
                               Documento de uso interno. No requiere verificación en Hacienda.
                           </div>
                       </div>';
       }
       
       $html .= '
                   </div>
               </div>
           </div>
       </div>

       <!-- Footer moderno -->
       <div class="footer">
           <div class="footer-content">
               <span class="footer-highlight">✅ Documento generado electrónicamente</span> | 
               ' . (($factura['tipo_factura'] ?? '') === 'ELECTRONICA' ? 
                   '<span class="footer-highlight">Resolución DGT-R-48-2016</span>' : 
                   'Factura de uso interno') . '
               <br>
               <span class="footer-highlight">' . $config['textos']['footer_sistema'] . '</span> | 
               Generado el ' . date('d/m/Y H:i:s') . '
           </div>
           <div class="footer-legal">
               ' . $config['textos']['footer_legal'] . ' | 
               ID Documento: ' . htmlspecialchars($factura['id']) . ' | 
               Sistema de Facturación Profesional
           </div>
       </div>
   </body>
   </html>';

   return $html;
}

function getCondicionVentaNombre($codigo) {
   $condiciones = [
       "01" => "Contado", "02" => "Crédito", "03" => "Consignación",
       "04" => "Apartado", "05" => "Arrendamiento con opción de compra",
       "06" => "Arrendamiento en función financiera", "99" => "Otros"
   ];
   return $condiciones[$codigo] ?? 'Desconocido';
}

function getMetodoPagoNombre($codigo) {
   $metodos = [
       "01" => "Efectivo", "02" => "Tarjeta", "03" => "Transferencia",
       "04" => "Cheque", "05" => "Recaudado por tercero"
   ];
   return $metodos[$codigo] ?? 'Otros';
}
?>