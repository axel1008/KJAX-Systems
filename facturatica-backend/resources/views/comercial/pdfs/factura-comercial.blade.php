<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura Comercial {{ $factura['numero'] }}</title>
    @include('comercial.pdfs.partials.styles')
</head>
<body>
    <div class="container">
        
        <!-- Header profesional con logo -->
        <div class="company-header-facturatica">
            <div class="company-logo-small">
                @if(isset($empresa['logo']) && $empresa['logo'])
                    <img src="{{ public_path('storage/' . $empresa['logo']) }}" alt="Logo {{ $empresa['nombre'] }}">
                @else
                    <div style="font-size: 10px; color: #666;">Logo {{ $empresa['nombre'] }}</div>
                @endif
            </div>
            <div class="company-details-facturatica">
                <h2 class="company-name-facturatica">{{ $empresa['nombre'] }}</h2>
                <div class="company-subtitle">FACTURA COMERCIAL</div>
                <div class="invoice-number-red">{{ $factura['numero'] }}</div>
            </div>
        </div>

        <!-- Información principal mejorada -->
        <div class="invoice-info-section">
            <div class="invoice-details">
                <strong>Fecha:</strong> {{ $factura['fecha'] }}<br>
                <strong>Condición:</strong> {{ $factura['condicionVenta'] }}<br>
                <strong>Divisa:</strong> {{ $factura['moneda'] }}
            </div>
            @if(isset($empresa['slogan']))
                <div class="company-slogan">{{ $empresa['slogan'] }}</div>
            @endif
        </div>

        <!-- Sección Emisor y Receptor mejorada -->
        <div class="emisor-receptor-section">
            <div class="emisor-column">
                <h3 class="section-title">EMISOR</h3>
                <div class="data-row">
                    <span class="icon">🏛️</span>
                    <span class="label">Razón Social</span>
                    <span class="value">{{ $empresa['nombre'] }}</span>
                </div>
                <div class="data-row">
                    <span class="icon">🆔</span>
                    <span class="label">Identificación</span>
                    <span class="value">{{ $empresa['identificacion'] }}</span>
                </div>
                <div class="data-row">
                    <span class="icon">📞</span>
                    <span class="label">Teléfono</span>
                    <span class="value">{{ $empresa['telefono'] }}</span>
                </div>
                <div class="data-row">
                    <span class="icon">✉️</span>
                    <span class="label">Correo</span>
                    <span class="value">{{ $empresa['email'] }}</span>
                </div>
                <div class="data-row">
                    <span class="icon">📍</span>
                    <span class="label">Dirección</span>
                    <span class="value">{{ $empresa['direccion'] }}</span>
                </div>
            </div>

            <div class="receptor-column">
                <h3 class="section-title">RECEPTOR</h3>
                <div class="data-row">
                    <span class="icon">🏢</span>
                    <span class="label">Razón Social</span>
                    <span class="value">{{ $factura['cliente']['nombre'] }}</span>
                </div>
                @if(isset($factura['cliente']['identificacion']))
                <div class="data-row">
                    <span class="icon">🆔</span>
                    <span class="label">Identificación</span>
                    <span class="value">{{ $factura['cliente']['identificacion'] }}</span>
                </div>
                @endif
                @if(isset($factura['cliente']['telefono']))
                <div class="data-row">
                    <span class="icon">📞</span>
                    <span class="label">Teléfono</span>
                    <span class="value">{{ $factura['cliente']['telefono'] }}</span>
                </div>
                @endif
                @if(isset($factura['cliente']['email']))
                <div class="data-row">
                    <span class="icon">✉️</span>
                    <span class="label">Correo</span>
                    <span class="value">{{ $factura['cliente']['email'] }}</span>
                </div>
                @endif
                @if(isset($factura['cliente']['direccion']))
                <div class="data-row">
                    <span class="icon">📍</span>
                    <span class="label">Dirección</span>
                    <span class="value">{{ $factura['cliente']['direccion'] }}</span>
                </div>
                @endif
            </div>
        </div>

        <!-- Tabla de productos mejorada -->
        <div class="products-section">
            <table class="products-table">
                <thead>
                    <tr>
                        <th style="width: 8%">CANT</th>
                        <th style="width: 45%">DESCRIPCIÓN</th>
                        <th style="width: 15%">PRECIO UNIT.</th>
                        <th style="width: 10%">DESC.</th>
                        <th style="width: 10%">IVA</th>
                        <th style="width: 5%">%</th>
                        <th style="width: 17%">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($factura['detalles'] as $detalle)
                        <tr>
                            <td class="text-center">{{ number_format($detalle['cantidad'], 0) }}</td>
                            <td>{{ $detalle['descripcion'] }}</td>
                            <td class="text-right">{{ $factura['moneda'] }} {{ number_format($detalle['precioUnitario'], 2) }}</td>
                            <td class="text-center">
                                @if(isset($detalle['descuento']) && $detalle['descuento'] > 0)
                                    {{ number_format($detalle['descuento'], 2) }}
                                @else
                                    —
                                @endif
                            </td>
                            <td class="text-right">{{ number_format($detalle['impuesto'] ?? 0, 2) }}</td>
                            <td class="text-center">{{ $detalle['tarifaImpuesto'] ?? 13 }}</td>
                            <td class="text-right">{{ $factura['moneda'] }} {{ number_format($detalle['total'], 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Sección de totales profesional (3 columnas) -->
        <div class="totals-facturatica-section">
            <!-- Resumen de factura -->
            <div class="totals-column">
                <h4>RESUMEN DE FACTURA</h4>
                <div class="total-line">
                    <span>Serv. Gravados</span>
                    <span>₡ {{ number_format($factura['serviciosGravados'] ?? 0, 2) }}</span>
                </div>
                <div class="total-line">
                    <span>Serv. Exentos</span>
                    <span>₡ {{ number_format($factura['serviciosExentos'] ?? 0, 2) }}</span>
                </div>
                <div class="total-line">
                    <span>Merc. Gravadas</span>
                    <span>₡ {{ number_format($factura['mercanciaGravada'], 2) }}</span>
                </div>
                <div class="total-line">
                    <span>Merc. Exentas</span>
                    <span>₡ {{ number_format($factura['mercanciaExenta'] ?? 0, 2) }}</span>
                </div>
                <div class="total-line-bold">
                    <span>Gravado</span>
                    <span>₡ {{ number_format($factura['totalGravado'], 2) }}</span>
                </div>
                <div class="total-line-bold">
                    <span>Exento</span>
                    <span>₡ {{ number_format($factura['totalExento'] ?? 0, 2) }}</span>
                </div>
            </div>

            <!-- Desglose IVA -->
            <div class="totals-column">
                <h4>DESGLOSE DEL IVA</h4>
                <div class="iva-line">
                    <span><strong>TARIFA</strong></span>
                    <span><strong>IMPUESTO</strong></span>
                </div>
                <div class="total-line">
                    <span>13% IVA</span>
                    <span>₡ {{ number_format($factura['totalImpuesto'], 2) }}</span>
                </div>
            </div>

            <!-- Totales finales -->
            <div class="totals-column final-totals">
                <h4>TOTALES</h4>
                <div class="total-line">
                    <span><strong>SUB TOTAL</strong></span>
                    <span><strong>₡ {{ number_format($factura['subtotal'], 2) }}</strong></span>
                </div>
                <div class="total-line">
                    <span><strong>IVA (13%)</strong></span>
                    <span><strong>₡ {{ number_format($factura['totalImpuesto'], 2) }}</strong></span>
                </div>
                <div class="grand-total">
                    <span>GRAN TOTAL</span>
                    <span>₡ {{ number_format($factura['total'], 2) }}</span>
                </div>
                @if(isset($factura['totalLetras']))
                <div class="total-words">
                    {{ $factura['totalLetras'] }}
                </div>
                @endif
            </div>
        </div>

        <!-- Términos y condiciones -->
        <div style="margin-bottom: 15px; padding: 12px; background: linear-gradient(135deg, #e8f5e8, #f0f8f0); border: 1px solid #27ae60; border-radius: 6px; font-size: 9px; color: #1e8449;">
            <strong style="display: block; margin-bottom: 6px; color: #27ae60;">TÉRMINOS Y CONDICIONES:</strong>
            • Esta factura comercial es válida para efectos contables internos.<br>
            • Documento generado automáticamente por sistema de facturación.<br>
            • Para consultas, contactar a {{ $empresa['telefono'] }} o {{ $empresa['email'] }}
        </div>

        <!-- Footer profesional -->
        <div class="footer-facturatica">
            <p><strong>{{ $empresa['nombre'] }}</strong></p>
            <p>{{ $empresa['direccion'] }} | Tel: {{ $empresa['telefono'] }} | Email: {{ $empresa['email'] }}</p>
            @if(isset($empresa['slogan']))
                <p style="font-style: italic; color: #3498db; margin-top: 4px;">"{{ $empresa['slogan'] }}"</p>
            @endif
            <div class="generation-info">
                Documento generado automáticamente el {{ now()->format('d/m/Y H:i:s') }}
            </div>
        </div>
    </div>
</body>
</html>