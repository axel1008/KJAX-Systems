<?php
require_once __DIR__ . '/../QRGenerator.php';

function renderFacturaHTML($factura, $emisor, $receptor, $detalles, $config) {

    // Tipo de factura
    $esElectronica = (($factura['tipo_factura'] ?? '') === 'ELECTRONICA');

    // Totales + IVA por tasa
    $subtotal = 0; $totalImpuestos = 0; $totalDescuentos = 0; $impuestosPorTasa = [];
    foreach ($detalles as $d) {
        $cant   = (float)($d['cantidad'] ?? 0);
        $pu     = (float)($d['precio_unitario'] ?? 0);
        $impto  = (float)($d['impuesto'] ?? 13);
        $desc   = (float)($d['descuento'] ?? 0);

        $lineaSub    = $cant * $pu;
        $lineaDesc   = $lineaSub * ($desc / 100);
        $base        = $lineaSub - $lineaDesc;
        $lineaImpto  = $base * ($impto / 100);

        $subtotal        += $lineaSub;
        $totalDescuentos += $lineaDesc;
        $totalImpuestos  += $lineaImpto;

        $key = number_format($impto, 2, '.', '');
        $impuestosPorTasa[$key] = ($impuestosPorTasa[$key] ?? 0) + $lineaImpto;
    }
    $total = $subtotal - $totalDescuentos + $totalImpuestos;

    // QR solo electrónicas
    $qrCodeBase64 = '';
    if ($esElectronica && !empty($factura['clave'])) {
        $qrData = $factura['clave'] . ',' . $factura['fecha_emision'] . ',' .
                  ($emisor['numero_identificacion'] ?? '') . ',' .
                  ($receptor['identificacion'] ?? '') . ',' .
                  number_format($total, 2, '.', '');
        $qrCodeBase64 = QRGenerator::generateQRBase64($qrData, 120);
    }

    // >>> NUEVO: color de acento (banda superior) por tipo <<<
    $colorAccent = $esElectronica ? '#1e40af' : '#6b7280';

    ob_start(); ?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 20mm; size: A4 portrait; }
    *{ margin:0; padding:0; box-sizing:border-box; }
    body{ font-family:"DejaVu Sans", Arial, sans-serif; font-size:11px; line-height:1.3; color:#000; background:#fff; }

    /* Banda superior delgada para diferenciar COMERCIAL vs ELECTRÓNICA */
    .brand-bar{ height:6px; background: <?= $colorAccent ?>; border-radius:3px; margin-bottom:8mm; }

    /* Header (fondo blanco, solo títulos) */
    .header{ padding: 0 2mm 4mm 2mm; display: table; width:100%; }
    .header-left{ display:table-cell; width:60%; vertical-align:middle; }
    .header-right{ display:table-cell; width:40%; vertical-align:middle; text-align:right; }
    .logo-placeholder{ width:90px; height:68px; border:2px solid #e5e7eb; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; color:#374151; }

    .doc-type{ font-weight:bold; font-size:14px; color: <?= $colorAccent ?>; text-align:right; margin-top:4px; }
    .doc-type small{ display:block; color:#111827; letter-spacing:.5px; }

    /* Bloque principal */
    .main-info{ background:#f8f9fa; padding:12px 16px; border:1px solid #dee2e6; display:table; width:100%; }
    .info-left, .info-right{ display:table-cell; width:50%; vertical-align:top; }
    .info-row{ margin-bottom:6px; display:flex; align-items:baseline; }
    .info-label{ font-weight:bold; min-width:120px; margin-right:10px; }
    .info-value{ flex:1; }

    .section{ margin:18px 0; border:1px solid #dee2e6; }
    .section-header{ background:#e9ecef; padding:8px 15px; font-weight:bold; font-size:12px; border-bottom:1px solid #dee2e6; }
    .section-content{ padding:15px; }
    .section-grid{ display:table; width:100%; }
    .section-column{ display:table-cell; width:50%; vertical-align:top; padding-right:20px; }
    .section-column:last-child{ padding-right:0; }

    .products-table{ width:100%; border-collapse:collapse; margin:18px 0; border:1px solid #dee2e6; }
    .products-table th{ background:#e9ecef; padding:10px 8px; border:1px solid #dee2e6; font-weight:bold; font-size:10px; text-align:center; }
    .products-table td{ padding:8px; border:1px solid #dee2e6; font-size:10px; vertical-align:top; }
    .products-table tbody tr:nth-child(even){ background:#f8f9fa; }

    .totals-section{ margin:18px 0; display:table; width:100%; }
    .totals-left{ display:table-cell; width:50%; vertical-align:top; padding-right:20px; }
    .totals-right{ display:table-cell; width:50%; vertical-align:top; }
    .totals-table{ width:100%; border-collapse:collapse; border:1px solid #dee2e6; }
    .totals-table td{ padding:8px 12px; border-bottom:1px solid #dee2e6; font-size:11px; }
    .totals-table .total-label{ text-align:right; font-weight:bold; width:70%; }
    .totals-table .total-value{ text-align:right; font-weight:bold; width:30%; }
    .totals-table .final-total{ background:#f8f9fa; font-size:12px; font-weight:bold; }

    .validation-section{ text-align:center; margin:18px 0; padding:15px; border:1px solid #dee2e6; background:#f8f9fa; }
    .validation-text{ font-size:10px; margin-bottom:12px; font-weight:bold; }
    .qr-container{ display:inline-block; border:2px solid #333; padding:10px; background:#fff; }
    .qr-image{ width:100px; height:100px; display:block; }
    .qr-placeholder{ width:100px; height:100px; border:2px dashed #999; display:flex; align-items:center; justify-content:center; font-size:10px; color:#666; background:#f8f9fa; }
    .qr-label{ text-align:center; font-size:9px; margin-top:5px; font-weight:bold; }

    .text-right{ text-align:right; }
    .font-bold{ font-weight:bold; }
    .price-symbol{ font-weight:bold; }

    /* Pie mini */
    .tiny-footer{ margin-top:12px; font-size:9px; color:#6b7280; text-align:center; }
</style>
</head>
<body>

    <!-- NUEVO: banda superior de color -->
    <div class="brand-bar"></div>

    <!-- Header (blanco) -->
    <div class="header">
        <div class="header-left">
            <div class="logo-placeholder"><?= htmlspecialchars($config['empresa']['codigo_logo']) ?></div>
        </div>
        <div class="header-right">
            <div class="doc-type">
                <?= $esElectronica ? 'FACTURA' : 'FACTURA' ?>
                <small><?= $esElectronica ? 'ELECTRÓNICA' : 'COMERCIAL' ?></small>
            </div>
        </div>
    </div>

    <!-- Info principal -->
    <div class="main-info">
        <div class="info-left">
            <?php if ($esElectronica && !empty($factura['clave'])): ?>
            <div class="info-row">
                <span class="info-label">Clave:</span>
                <span class="info-value" style="font-family:monospace;font-size:9px;"><?= htmlspecialchars($factura['clave']) ?></span>
            </div>
            <?php endif; ?>
            <div class="info-row">
                <span class="info-label">Fecha Emisión:</span>
                <span class="info-value"><?= date('Y-m-d\TH:i:s-06:00', strtotime($factura['fecha_emision'])) ?></span>
            </div>
        </div>
        <div class="info-right">
            <div class="info-row">
                <span class="info-label">Num. Consecutivo:</span>
                <span class="info-value font-bold"><?= htmlspecialchars($factura['consecutivo'] ?? 'N/A') ?></span>
            </div>
            <div class="info-row">
                <span class="info-label">Tipo:</span>
                <span class="info-value"><?= $esElectronica ? '01 – Factura Electrónica' : 'Factura Comercial' ?></span>
            </div>
        </div>
    </div>

    <!-- Emisor -->
    <div class="section">
        <div class="section-header">Emisor</div>
        <div class="section-content">
            <div class="section-grid">
                <div class="section-column">
                    <div class="info-row"><span class="info-label">Nombre Comercial:</span><span class="info-value font-bold"><?= htmlspecialchars($config['empresa']['nombre']) ?></span></div>
                    <div class="info-row"><span class="info-label">Razón Social:</span><span class="info-value"><?= htmlspecialchars($config['empresa']['razon_social'] ?? $config['empresa']['nombre']) ?></span></div>
                    <div class="info-row"><span class="info-label">Identificación:</span><span class="info-value"><?= htmlspecialchars(($emisor['tipo_identificacion'] ?? 'Jurídica') . ' ' . ($emisor['numero_identificacion'] ?? '')) ?></span></div>
                </div>
                <div class="section-column">
                    <div class="info-row"><span class="info-label">Ubicación:</span><span class="info-value"><?= htmlspecialchars(($emisor['provincia'] ?? '') . ', ' . ($emisor['canton'] ?? '') . ', ' . ($emisor['distrito'] ?? '')) ?></span></div>
                    <div class="info-row"><span class="info-label">Tel:</span><span class="info-value"><?= htmlspecialchars($config['empresa']['telefono_contacto']) ?> • Email: <?= htmlspecialchars($config['empresa']['email_contacto']) ?></span></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Receptor -->
    <div class="section">
        <div class="section-header">Receptor</div>
        <div class="section-content">
            <div class="section-grid">
                <div class="section-column">
                    <div class="info-row"><span class="info-label">Nombre/Razón:</span><span class="info-value font-bold"><?= htmlspecialchars($receptor['nombre'] ?? 'Cliente') ?></span></div>
                    <?php if (!empty($receptor['nombre_comercial'])): ?>
                    <div class="info-row"><span class="info-label">Nombre Comercial:</span><span class="info-value font-bold"><?= htmlspecialchars($receptor['nombre_comercial']) ?></span></div>
                    <?php endif; ?>
                    <div class="info-row"><span class="info-label">Identificación:</span><span class="info-value"><?= htmlspecialchars(($receptor['tipo_identificacion'] ?? '') . ' ' . ($receptor['identificacion'] ?? '')) ?></span></div>
                </div>
                <div class="section-column">
                    <div class="info-row"><span class="info-label">Ubicación:</span><span class="info-value"><?= htmlspecialchars(($receptor['provincia'] ?? '') . ', ' . ($receptor['canton'] ?? '') . ', ' . ($receptor['distrito'] ?? '') . (!empty($receptor['barrio']) ? ', '.$receptor['barrio'] : '') . (!empty($receptor['otras_senas']) ? ', '.$receptor['otras_senas'] : '')) ?></span></div>
                    <div class="info-row"><span class="info-label">Email:</span><span class="info-value"><?= htmlspecialchars($receptor['correo'] ?? $receptor['email'] ?? 'No especificado') ?></span></div>
                </div>
            </div>
        </div>
    </div>

    <!-- Detalle -->
    <table class="products-table">
        <thead>
            <tr>
                <th style="width:8%;">Cant.</th>
                <th style="width:10%;">Unidad</th>
                <?php if ($esElectronica): ?><th style="width:12%;">Código</th><?php endif; ?>
                <th style="width: <?= $esElectronica ? '35%' : '47%' ?>;">Descripción</th>
                <th style="width:12%;">P. Unit</th>
                <th style="width:8%;">Desc.</th>
                <th style="width:15%;">SubTotal</th>
            </tr>
        </thead>
        <tbody>
        <?php foreach ($detalles as $d):
            $cant=(float)($d['cantidad']??0); $pu=(float)($d['precio_unitario']??0); $descPorc=(float)($d['descuento']??0);
            $lineaSub=$cant*$pu; $lineaDesc=$lineaSub*($descPorc/100); $lineaTotal=$lineaSub-$lineaDesc; ?>
            <tr>
                <td class="text-center"><?= number_format($cant,3) ?></td>
                <td class="text-center"><?= htmlspecialchars($d['unidad_medida'] ?? 'UND') ?></td>
                <?php if ($esElectronica): ?><td class="text-center"><?= htmlspecialchars($d['cabys_code'] ?? $d['codigo'] ?? 'N/A') ?></td><?php endif; ?>
                <td><?= htmlspecialchars($d['descripcion_item'] ?? $d['descripcion'] ?? 'Producto/Servicio') ?></td>
                <td class="text-right"><span class="price-symbol">■</span> <?= number_format($pu,2) ?></td>
                <td class="text-right"><span class="price-symbol">■</span> <?= number_format($lineaDesc,2) ?></td>
                <td class="text-right"><span class="price-symbol">■</span> <?= number_format($lineaTotal,2) ?></td>
            </tr>
        <?php endforeach; ?>
        </tbody>
    </table>

    <!-- Totales -->
    <div class="totals-section">
        <div class="totals-left">
            <div class="section">
                <div class="section-header">Condiciones de Pago</div>
                <div class="section-content">
                    <div class="info-row"><span class="info-label">Condición:</span><span class="info-value"><?= getCondicionVentaNombre($factura['condicion_venta'] ?? '01') ?></span></div>
                    <div class="info-row"><span class="info-label">Método:</span><span class="info-value"><?= getMetodoPagoNombre($factura['medio_pago'] ?? '01') ?></span></div>
                    <?php if (!empty($factura['plazo_credito'])): ?>
                    <div class="info-row"><span class="info-label">Plazo:</span><span class="info-value"><?= (int)$factura['plazo_credito'] ?> días</span></div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        <div class="totals-right">
            <table class="totals-table">
                <tr>
                    <td class="total-label">Subtotal:</td>
                    <td class="total-value"><span class="price-symbol">■</span> <?= number_format($subtotal,2) ?></td>
                </tr>
                <?php if ($totalDescuentos > 0): ?>
                <tr>
                    <td class="total-label">Descuentos:</td>
                    <td class="total-value"><span class="price-symbol">■</span> <?= number_format($totalDescuentos,2) ?></td>
                </tr>
                <?php endif; ?>
                <?php if (count($impuestosPorTasa) === 1): $tasa = array_key_first($impuestosPorTasa); ?>
                    <tr>
                        <td class="total-label">IVA (<?= rtrim(rtrim($tasa,'0'),'.') ?>%):</td>
                        <td class="total-value"><span class="price-symbol">■</span> <?= number_format($totalImpuestos,2) ?></td>
                    </tr>
                <?php else: foreach ($impuestosPorTasa as $tasa => $monto): ?>
                    <tr>
                        <td class="total-label">IVA (<?= rtrim(rtrim($tasa,'0'),'.') ?>%):</td>
                        <td class="total-value"><span class="price-symbol">■</span> <?= number_format($monto,2) ?></td>
                    </tr>
                <?php endforeach; ?>
                    <tr>
                        <td class="total-label">Impuestos:</td>
                        <td class="total-value"><span class="price-symbol">■</span> <?= number_format($totalImpuestos,2) ?></td>
                    </tr>
                <?php endif; ?>
                <tr class="final-total">
                    <td class="total-label">Total Comprobante:</td>
                    <td class="total-value"><span class="price-symbol">■</span> <?= number_format($total,2) ?></td>
                </tr>
            </table>
        </div>
    </div>

    <!-- Validación / QR o pie simple -->
    <?php if ($esElectronica): ?>
        <div class="validation-section">
            <div class="validation-text">Para validar este comprobante ingrese a Tribunet con la clave.</div>
            <div class="qr-container">
                <?php if ($qrCodeBase64): ?>
                    <img src="<?= $qrCodeBase64 ?>" class="qr-image" alt="QR Code">
                <?php else: ?>
                    <div class="qr-placeholder">QR Aquí</div>
                <?php endif; ?>
                <div class="qr-label">QR Aquí</div>
            </div>
        </div>
    <?php endif; ?>

    <!-- Pie mini (para ambos tipos) -->
    <div class="tiny-footer">
        Factura generada en sistema de facturación KJAX Systems
    </div>

</body>
</html>
<?php
    return ob_get_clean();
}

// Helpers si no existen
if (!function_exists('getCondicionVentaNombre')) {
function getCondicionVentaNombre($codigo) {
    $cond = ["01"=>"Contado","02"=>"Crédito","03"=>"Consignación","04"=>"Apartado","05"=>"Arrendamiento con opción de compra","06"=>"Arrendamiento en función financiera","99"=>"Otros"];
    return $cond[$codigo] ?? 'Desconocido';
}}
if (!function_exists('getMetodoPagoNombre')) {
function getMetodoPagoNombre($codigo) {
    $map = ["01"=>"Efectivo","02"=>"Tarjeta","03"=>"Transferencia","04"=>"Cheque","05"=>"Recaudado por tercero"];
    return $map[$codigo] ?? 'Otros';
}}
