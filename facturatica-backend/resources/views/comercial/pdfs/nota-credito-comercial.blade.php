<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nota de Crédito {{ $notaCredito['numero'] }}</title>
    @include('comercial.pdfs.partials.styles')
</head>
<body>
    <div class="container">
        @include('comercial.pdfs.partials.header')
        
        <!-- Información de la nota de crédito -->
        <div class="invoice-header">
            <div class="invoice-info">
                <h1 class="invoice-title" style="color: #e74c3c;">NOTA DE CRÉDITO</h1>
                <div class="invoice-number">No. {{ $notaCredito['numero'] }}</div>
                <div class="invoice-dates">
                    <strong>Fecha:</strong> {{ $notaCredito['fecha'] }}<br>
                    <strong>Factura Ref:</strong> {{ $notaCredito['facturaReferencia'] }}<br>
                    <strong>Moneda:</strong> {{ $notaCredito['moneda'] }}
                </div>
            </div>
        </div>

        <!-- Información del cliente -->
        <div class="client-section">
            <h3>CLIENTE:</h3>
            <div class="client-info">
                <strong>{{ $cliente['nombre'] }}</strong><br>
                @if($cliente['identificacion'])
                    <strong>ID:</strong> {{ $cliente['identificacion'] }}<br>
                @endif
                @if($cliente['direccion'])
                    {{ $cliente['direccion'] }}<br>
                @endif
                @if($cliente['telefono'])
                    <strong>Tel:</strong> {{ $cliente['telefono'] }}
                @endif
                @if($cliente['email'])
                    | <strong>Email:</strong> {{ $cliente['email'] }}
                @endif
            </div>
        </div>

        <!-- Motivo de la nota de crédito -->
        <div class="observations-section" style="background-color: #fff3cd; border: 1px solid #ffeaa7;">
            <h4 style="color: #e17055;">MOTIVO DE LA NOTA DE CRÉDITO:</h4>
            <p><strong>{{ $notaCredito['motivo'] }}</strong></p>
        </div>

        <!-- Detalles de la nota de crédito -->
        <div class="details-section">
            <table class="details-table">
                <thead>
                    <tr style="background-color: #e74c3c;">
                        <th style="width: 10%">Cant.</th>
                        <th style="width: 50%">Descripción</th>
                        <th style="width: 15%">Precio Unit.</th>
                        <th style="width: 10%">Desc.</th>
                        <th style="width: 15%">Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($detalles as $detalle)
                        <tr>
                            <td class="text-center">{{ $detalle['cantidad'] }}</td>
                            <td>
                                <strong>{{ $detalle['descripcion'] }}</strong>
                                @if(isset($detalle['detalleAdicional']) && $detalle['detalleAdicional'])
                                    <br><small>{{ $detalle['detalleAdicional'] }}</small>
                                @endif
                            </td>
                            <td class="text-right">{{ $notaCredito['moneda'] }} {{ number_format($detalle['precioUnitario'], 2) }}</td>
                            <td class="text-right">
                                @if(isset($detalle['descuento']) && $detalle['descuento'] > 0)
                                    {{ number_format($detalle['descuento'], 2) }}%
                                @else
                                    -
                                @endif
                            </td>
                            <td class="text-right">{{ $notaCredito['moneda'] }} {{ number_format($detalle['total'], 2) }}</td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        <!-- Totales -->
        <div class="totals-section">
            <table class="totals-table">
                <tr>
                    <td><strong>Subtotal:</strong></td>
                    <td class="text-right">{{ $notaCredito['moneda'] }} {{ number_format($totales['subtotal'], 2) }}</td>
                </tr>
                @if(isset($totales['descuentos']) && $totales['descuentos'] > 0)
                <tr>
                    <td><strong>Descuentos:</strong></td>
                    <td class="text-right">-{{ $notaCredito['moneda'] }} {{ number_format($totales['descuentos'], 2) }}</td>
                </tr>
                @endif
                @if(isset($totales['impuestos']) && $totales['impuestos'] > 0)
                <tr>
                    <td><strong>Impuestos:</strong></td>
                    <td class="text-right">{{ $notaCredito['moneda'] }} {{ number_format($totales['impuestos'], 2) }}</td>
                </tr>
                @endif
                <tr class="total-final" style="background-color: #fadbd8;">
                    <td><strong>TOTAL A ACREDITAR:</strong></td>
                    <td class="text-right"><strong>{{ $notaCredito['moneda'] }} {{ number_format($totales['total'], 2) }}</strong></td>
                </tr>
            </table>
        </div>

        <!-- Información importante sobre nota de crédito -->
        <div class="observations-section" style="border: 2px solid #e74c3c; background-color: #fdedec;">
            <h4 style="color: #c0392b;">INFORMACIÓN IMPORTANTE:</h4>
            <p style="font-size: 11px;">
                Esta nota de crédito afecta la factura No. <strong>{{ $notaCredito['facturaReferencia'] }}</strong>. 
                El monto total de <strong>{{ $notaCredito['moneda'] }} {{ number_format($totales['total'], 2) }}</strong> 
                será acreditado a su cuenta o aplicado según corresponda. 
                Conserve este documento para sus registros contables.
            </p>
        </div>

        @include('comercial.pdfs.partials.footer')
    </div>
</body>
</html>