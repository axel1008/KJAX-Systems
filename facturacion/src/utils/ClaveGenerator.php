<?php
namespace App\utils;

class ClaveGenerator
{
    public static function generarClave($tipoComprobante, $codigoPais, $dia, $mes, $anio, $cedula, $consecutivo, $situacion, $codigoSeguridad)
    {
        // Normaliza valores para EXACTAMENTE 50 caracteres
        $codigoPais = str_pad($codigoPais, 3, '0', STR_PAD_LEFT);           // 3 chars
        $dia = str_pad($dia, 2, '0', STR_PAD_LEFT);                        // 2 chars  
        $mes = str_pad($mes, 2, '0', STR_PAD_LEFT);                        // 2 chars
        $anio = str_pad($anio, 2, '0', STR_PAD_LEFT);                      // 2 chars
        $cedula = str_pad($cedula, 12, '0', STR_PAD_LEFT);                 // 12 chars
        
        // ARREGLO: El consecutivo debe ser 20 chars, pero a veces viene más largo
        $consecutivo = str_pad(substr($consecutivo, 0, 20), 20, '0', STR_PAD_LEFT); // 20 chars EXACTOS
        
        $situacion = str_pad($situacion, 1, '0', STR_PAD_LEFT);            // 1 char
        $codigoSeguridad = str_pad($codigoSeguridad, 8, '0', STR_PAD_LEFT); // 8 chars
        
        $claveGenerada = "{$codigoPais}{$dia}{$mes}{$anio}{$cedula}{$consecutivo}{$situacion}{$codigoSeguridad}";
        
        // DEBUG: Verificar longitud
        echo "=== DEBUG CLAVE GENERATOR ===\n";
        echo "País: $codigoPais (3)\n";
        echo "Día: $dia (2)\n";
        echo "Mes: $mes (2)\n";
        echo "Año: $anio (2)\n";
        echo "Cédula: $cedula (12)\n";
        echo "Consecutivo: $consecutivo (20)\n";
        echo "Situación: $situacion (1)\n";
        echo "Código Seg: $codigoSeguridad (8)\n";
        echo "Clave final: $claveGenerada\n";
        echo "Longitud: " . strlen($claveGenerada) . " chars\n";
        echo "==============================\n";
        
        // Asegurar que sea exactamente 50 caracteres
        if (strlen($claveGenerada) > 50) {
            $claveGenerada = substr($claveGenerada, 0, 50);
            echo "AJUSTADA a 50 chars: $claveGenerada\n";
        }
        
        return $claveGenerada;
    }
}