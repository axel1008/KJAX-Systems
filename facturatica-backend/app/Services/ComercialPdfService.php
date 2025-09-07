<?php

namespace App\Services;

use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ComercialPdfService
{
    public function generarFacturaPdf($datosFactura)
    {
        try {
            // Preparar datos para la vista
            $datos = $this->prepararDatosFactura($datosFactura);
            
            // Generar PDF usando la vista blade
            $pdf = Pdf::loadView('comercial.pdfs.factura-comercial', $datos);
            
            // Configurar opciones del PDF
            $pdf->setPaper('letter', 'portrait');
            $pdf->setOption('isHtml5ParserEnabled', true);
            $pdf->setOption('isRemoteEnabled', true);
            $pdf->setOption('defaultFont', 'Arial');
            
            // Generar nombre único para el archivo
            $nombreArchivo = $this->generarNombreArchivo('factura', $datosFactura);
            $rutaArchivo = "comercial/pdfs/{$nombreArchivo}";
            
            // Guardar PDF en storage
            Storage::disk('public')->put($rutaArchivo, $pdf->output());
            
            return [
                'success' => true,
                'rutaArchivo' => $rutaArchivo,
                'nombreArchivo' => $nombreArchivo,
                'urlPublica' => asset('storage/' . $rutaArchivo),
                'pdf' => $pdf // Para descarga directa si se necesita
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error generando PDF: ' . $e->getMessage()
            ];
        }
    }
    
    public function generarNotaCreditoPdf($datosNota)
    {
        try {
            $datos = $this->prepararDatosNotaCredito($datosNota);
            
            $pdf = Pdf::loadView('comercial.pdfs.nota-credito-comercial', $datos);
            $pdf->setPaper('letter', 'portrait');
            
            $nombreArchivo = $this->generarNombreArchivo('nota-credito', $datosNota);
            $rutaArchivo = "comercial/pdfs/{$nombreArchivo}";
            
            Storage::disk('public')->put($rutaArchivo, $pdf->output());
            
            return [
                'success' => true,
                'rutaArchivo' => $rutaArchivo,
                'nombreArchivo' => $nombreArchivo,
                'urlPublica' => asset('storage/' . $rutaArchivo)
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Error generando PDF nota crédito: ' . $e->getMessage()
            ];
        }
    }
    
    private function prepararDatosFactura($datosFactura)
    {
        return [
            'empresa' => [
                'nombre' => $datosFactura['empresa']['nombre'] ?? 'Empresa Demo',
                'identificacion' => $datosFactura['empresa']['identificacion'] ?? '3-101-123456',
                'telefono' => $datosFactura['empresa']['telefono'] ?? '2222-2222',
                'email' => $datosFactura['empresa']['email'] ?? 'info@empresa.com',
                'direccion' => $datosFactura['empresa']['direccion'] ?? 'San José, Costa Rica',
                'logo' => $datosFactura['empresa']['logo'] ?? 'logos/empresa-logo.png', // Logo por defecto
                'slogan' => $datosFactura['empresa']['slogan'] ?? 'Tu negocio nos fortalece'
            ],
            'cliente' => [
                'nombre' => $datosFactura['cliente']['nombre'],
                'identificacion' => $datosFactura['cliente']['identificacion'] ?? 'N/A',
                'telefono' => $datosFactura['cliente']['telefono'] ?? '',
                'email' => $datosFactura['cliente']['email'] ?? '',
                'direccion' => $datosFactura['cliente']['direccion'] ?? ''
            ],
            'factura' => [
                'numero' => $datosFactura['numero'],
                'fecha' => Carbon::parse($datosFactura['fecha'])->format('d/m/Y'),
                'fechaVencimiento' => isset($datosFactura['fechaVencimiento']) 
                    ? Carbon::parse($datosFactura['fechaVencimiento'])->format('d/m/Y') 
                    : null,
                'condicionVenta' => $datosFactura['condicionVenta'] ?? 'Contado',
                'moneda' => $datosFactura['moneda'] ?? 'CRC',
                'tipoCambio' => $datosFactura['tipoCambio'] ?? 1
            ],
            'detalles' => $datosFactura['detalles'],
            'totales' => [
                'subtotal' => $datosFactura['subtotal'],
                'impuestos' => $datosFactura['impuestos'] ?? 0,
                'descuentos' => $datosFactura['descuentos'] ?? 0,
                'total' => $datosFactura['total'],
                // Campos adicionales para el estilo FacturaTICA
                'servicios_gravados' => $datosFactura['servicios_gravados'] ?? 0,
                'servicios_exentos' => $datosFactura['servicios_exentos'] ?? 0,
                'mercancias_exentas' => $datosFactura['mercancias_exentas'] ?? 0,
                'exento' => $datosFactura['exento'] ?? 0
            ],
            'observaciones' => $datosFactura['observaciones'] ?? '',
            'fechaGeneracion' => Carbon::now()->format('d/m/Y H:i:s'),
            'totalEnLetras' => $this->convertirNumeroALetras($datosFactura['total'])
        ];
    }
    
    private function prepararDatosNotaCredito($datosNota)
    {
        return [
            'empresa' => $datosNota['empresa'],
            'cliente' => $datosNota['cliente'],
            'notaCredito' => [
                'numero' => $datosNota['numero'],
                'fecha' => Carbon::parse($datosNota['fecha'])->format('d/m/Y'),
                'facturaReferencia' => $datosNota['facturaReferencia'],
                'motivo' => $datosNota['motivo'],
                'moneda' => $datosNota['moneda'] ?? 'CRC'
            ],
            'detalles' => $datosNota['detalles'],
            'totales' => $datosNota['totales'],
            'fechaGeneracion' => Carbon::now()->format('d/m/Y H:i:s')
        ];
    }
    
    private function generarNombreArchivo($tipo, $datos)
    {
        $numero = str_replace(['/', '\\', ' '], '-', $datos['numero']);
        $fecha = Carbon::now()->format('Ymd_His');
        
        return "{$tipo}_{$numero}_{$fecha}.pdf";
    }
    
    public function eliminarArchivoPdf($rutaArchivo)
    {
        try {
            if (Storage::disk('public')->exists($rutaArchivo)) {
                Storage::disk('public')->delete($rutaArchivo);
                return true;
            }
            return false;
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Convertir número a letras (función simplificada)
     */
    private function convertirNumeroALetras($numero)
    {
        // Función simplificada para convertir números a letras
        $numero = round($numero, 2);
        $entero = floor($numero);
        $decimales = round(($numero - $entero) * 100);
        
        if ($entero == 0) {
            return 'cero colones';
        }
        
        $resultado = '';
        
        // Lógica simplificada para números hasta 999,999
        if ($entero >= 1000) {
            $miles = floor($entero / 1000);
            $resto = $entero % 1000;
            
            if ($miles == 1) {
                $resultado .= 'mil ';
            } else {
                $resultado .= $this->convertirCentenas($miles) . ' mil ';
            }
            
            if ($resto > 0) {
                $resultado .= $this->convertirCentenas($resto);
            }
        } else {
            $resultado = $this->convertirCentenas($entero);
        }
        
        $resultado = ucfirst(trim($resultado));
        
        if ($decimales > 0) {
            $resultado .= " PUNTO " . $this->convertirCentenas($decimales);
        }
        
        return $resultado . ' colones';
    }
    
    private function convertirCentenas($numero)
    {
        $unidades = [
            '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
            'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 
            'dieciocho', 'diecinueve', 'veinte'
        ];
        
        $decenas = [
            '', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 
            'ochenta', 'noventa'
        ];
        
        $centenas = [
            '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
            'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
        ];
        
        $resultado = '';
        
        if ($numero >= 100) {
            if ($numero == 100) {
                $resultado .= 'cien ';
            } else {
                $resultado .= $centenas[floor($numero / 100)] . ' ';
            }
            $numero = $numero % 100;
        }
        
        if ($numero >= 21) {
            $resultado .= $decenas[floor($numero / 10)];
            if ($numero % 10 > 0) {
                $resultado .= ' y ' . $unidades[$numero % 10];
            }
        } elseif ($numero > 0) {
            $resultado .= $unidades[$numero];
        }
        
        return trim($resultado);
    }
}