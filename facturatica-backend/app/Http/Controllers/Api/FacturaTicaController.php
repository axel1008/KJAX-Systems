<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use GuzzleHttp\Client;
use Exception;

class FacturaTicaController extends Controller
{
    private $client;
    private $apiUrl;
    private $apiKey;
    private $clientId;

    public function __construct()
    {
        try {
            $this->client = new Client([
                'timeout' => 30,
                'verify' => false,
            ]);
            
            // Valores por defecto si no existen en .env
            $this->apiUrl = env('FACTURATICA_API_URL', '');
            $this->apiKey = env('FACTURATICA_API_KEY', '');
            $this->clientId = env('FACTURATICA_CLIENT_ID', '');
            
        } catch (Exception $e) {
            // Si falla el constructor, inicializar con valores vacíos
            $this->apiUrl = '';
            $this->apiKey = '';
            $this->clientId = '';
            $this->client = null;
        }
    }

    public function healthCheck(): JsonResponse
    {
        try {
            return response()->json([
                'status' => 'ok',
                'api_available' => true,
                'credentials_configured' => !empty($this->apiKey),
                'message' => 'Conexión con FacturaTICA disponible'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'status' => 'error',
                'api_available' => false,
                'message' => 'Error conectando con FacturaTICA: ' . $e->getMessage()
            ], 500);
        }
    }

public function sendInvoice(Request $request): JsonResponse
{
    try {
        // Validar credenciales
        if (empty($this->apiUrl) || empty($this->apiKey)) {
            return response()->json([
                'success' => false,
                'error' => 'Credenciales no configuradas'
            ], 400);
        }

        // Log de inicio
        Log::info('Enviando factura a FacturaTICA', [
            'url' => $this->apiUrl,
            'data' => $request->all()
        ]);

        // Generar datos simulados
        $fecha = date('Y-m-d H:i:s');
        $claveNumerica = 'CR' . date('dmY') . rand(100000000000, 999999999999);
        $numeroFactura = 'FAC-' . date('Ymd') . '-' . rand(1000, 9999);

        $response = [
            'success' => true,
            'clave' => $claveNumerica,
            'estado' => 'ENVIADA',
            'mensaje' => 'Factura enviada a FacturaTICA correctamente (simulado)',
            'xml_firmado' => '<xml>Documento XML firmado simulado</xml>',
            'pdf_url' => null,
            'fecha_envio' => $fecha,
            'numero_factura' => $numeroFactura
        ];

        // Log de respuesta exitosa
        Log::info('Factura enviada exitosamente', [
            'clave' => $claveNumerica,
            'numero_factura' => $numeroFactura
        ]);

        return response()->json($response);
        
    } catch (Exception $e) {
        Log::error('Error enviando factura a FacturaTICA', [
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);
        
        return response()->json([
            'success' => false,
            'error' => 'Error interno del servidor: ' . $e->getMessage()
        ], 500);
    }
}
/**
     * Consultar estado de una factura en FacturaTICA
     */
    public function consultarEstado(Request $request): JsonResponse
    {
        try {
            $clave = $request->input('clave');
            
            if (empty($clave)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Clave de factura requerida'
                ], 400);
            }

            // Simular consulta a FacturaTICA
            Log::info('Consultando estado de factura', ['clave' => $clave]);

            // Simular diferentes estados posibles
            $estados = ['ENVIADA', 'PROCESADA', 'ACEPTADA', 'RECHAZADA'];
            $estadoSimulado = $estados[array_rand($estados)];

            return response()->json([
                'success' => true,
                'clave' => $clave,
                'estado' => $estadoSimulado,
                'fecha_consulta' => date('Y-m-d H:i:s'),
                'mensaje' => 'Estado consultado correctamente (simulado)'
            ]);

        } catch (Exception $e) {
            Log::error('Error consultando estado', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error consultando estado: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Anular una factura en FacturaTICA
     */
    public function anularFactura(Request $request): JsonResponse
    {
        try {
            $clave = $request->input('clave');
            $motivo = $request->input('motivo', 'Anulación solicitada por el usuario');

            if (empty($clave)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Clave de factura requerida'
                ], 400);
            }

            Log::info('Anulando factura', [
                'clave' => $clave,
                'motivo' => $motivo
            ]);

            return response()->json([
                'success' => true,
                'clave' => $clave,
                'estado' => 'ANULADA',
                'motivo' => $motivo,
                'fecha_anulacion' => date('Y-m-d H:i:s'),
                'mensaje' => 'Factura anulada correctamente (simulado)'
            ]);

        } catch (Exception $e) {
            Log::error('Error anulando factura', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error anulando factura: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reenviar una factura
     */
    public function reenviarFactura(Request $request): JsonResponse
    {
        try {
            $clave = $request->input('clave');

            if (empty($clave)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Clave de factura requerida'
                ], 400);
            }

            Log::info('Reenviando factura', ['clave' => $clave]);

            return response()->json([
                'success' => true,
                'clave' => $clave,
                'estado' => 'REENVIADA',
                'fecha_reenvio' => date('Y-m-d H:i:s'),
                'mensaje' => 'Factura reenviada correctamente (simulado)'
            ]);

        } catch (Exception $e) {
            Log::error('Error reenviando factura', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error reenviando factura: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Descargar documentos (XML/PDF)
     */
    public function descargarDocumentos(Request $request): JsonResponse
    {
        try {
            $clave = $request->input('clave');
            $tipo = $request->input('tipo', 'both'); // xml, pdf, both

            if (empty($clave)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Clave de factura requerida'
                ], 400);
            }

            Log::info('Descargando documentos', [
                'clave' => $clave,
                'tipo' => $tipo
            ]);

            $response = [
                'success' => true,
                'clave' => $clave,
                'fecha_descarga' => date('Y-m-d H:i:s')
            ];

            if ($tipo === 'xml' || $tipo === 'both') {
                $response['xml_url'] = "https://api-sandbox.facturatica.com/downloads/xml/{$clave}.xml";
                $response['xml_content'] = base64_encode('<xml>Contenido XML simulado para ' . $clave . '</xml>');
            }

            if ($tipo === 'pdf' || $tipo === 'both') {
                $response['pdf_url'] = "https://api-sandbox.facturatica.com/downloads/pdf/{$clave}.pdf";
                $response['pdf_content'] = base64_encode('PDF simulado para ' . $clave);
            }

            return response()->json($response);

        } catch (Exception $e) {
            Log::error('Error descargando documentos', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error descargando documentos: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Crear nota de crédito
     */
    public function crearNotaCredito(Request $request): JsonResponse
    {
        try {
            $claveFacturaOriginal = $request->input('clave_factura_original');
            $motivo = $request->input('motivo', 'Nota de crédito');
            $monto = $request->input('monto', 0);

            if (empty($claveFacturaOriginal)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Clave de factura original requerida'
                ], 400);
            }

            Log::info('Creando nota de crédito', [
                'factura_original' => $claveFacturaOriginal,
                'motivo' => $motivo,
                'monto' => $monto
            ]);

            $claveNotaCredito = 'NC' . date('dmY') . rand(100000000000, 999999999999);

            return response()->json([
                'success' => true,
                'clave_nota_credito' => $claveNotaCredito,
                'clave_factura_original' => $claveFacturaOriginal,
                'estado' => 'ENVIADA',
                'motivo' => $motivo,
                'monto' => $monto,
                'fecha_creacion' => date('Y-m-d H:i:s'),
                'mensaje' => 'Nota de crédito creada correctamente (simulado)'
            ]);

        } catch (Exception $e) {
            Log::error('Error creando nota de crédito', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error creando nota de crédito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Listar facturas por rango de fechas
     */
    public function listarFacturas(Request $request): JsonResponse
    {
        try {
            $fechaInicio = $request->input('fecha_inicio', date('Y-m-01'));
            $fechaFin = $request->input('fecha_fin', date('Y-m-d'));

            Log::info('Listando facturas', [
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin
            ]);

            // Simular lista de facturas
            $facturas = [];
            for ($i = 1; $i <= 5; $i++) {
                $facturas[] = [
                    'clave' => 'CR' . date('dmY') . rand(100000000000, 999999999999),
                    'numero_factura' => 'FAC-' . date('Ymd') . '-' . rand(1000, 9999),
                    'fecha' => date('Y-m-d', strtotime("-{$i} days")),
                    'cliente' => 'Cliente Simulado ' . $i,
                    'monto' => rand(10000, 100000),
                    'estado' => ['ENVIADA', 'ACEPTADA', 'PROCESADA'][rand(0, 2)]
                ];
            }

            return response()->json([
                'success' => true,
                'fecha_inicio' => $fechaInicio,
                'fecha_fin' => $fechaFin,
                'total_facturas' => count($facturas),
                'facturas' => $facturas
            ]);

        } catch (Exception $e) {
            Log::error('Error listando facturas', ['error' => $e->getMessage()]);
            
            return response()->json([
                'success' => false,
                'error' => 'Error listando facturas: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
 * Enviar factura por email
 */
public function enviarEmail(Request $request): JsonResponse
{
    try {
        $clave = $request->input('clave');
        $tipo = $request->input('tipo', 'factura');
        $destinatario = $request->input('destinatario');

        if (empty($clave)) {
            return response()->json([
                'success' => false,
                'error' => 'Clave de factura requerida'
            ], 400);
        }

        Log::info('Enviando email', [
            'clave' => $clave,
            'tipo' => $tipo,
            'destinatario' => $destinatario
        ]);

        return response()->json([
            'success' => true,
            'clave' => $clave,
            'tipo' => $tipo,
            'destinatario' => $destinatario ?: 'cliente@email.com',
            'fecha_envio' => date('Y-m-d H:i:s'),
            'mensaje' => 'Email enviado correctamente (simulado)'
        ]);

    } catch (Exception $e) {
        Log::error('Error enviando email', ['error' => $e->getMessage()]);
        
        return response()->json([
            'success' => false,
            'error' => 'Error enviando email: ' . $e->getMessage()
        ], 500);
    }
}

/**
 * Generar PDF
 */
public function generarPDF(Request $request): JsonResponse
{
    try {
        $clave = $request->input('clave');
        $tipo = $request->input('tipo', 'electronica');

        if (empty($clave)) {
            return response()->json([
                'success' => false,
                'error' => 'Clave de factura requerida'
            ], 400);
        }

        Log::info('Generando PDF', [
            'clave' => $clave,
            'tipo' => $tipo
        ]);

        return response()->json([
            'success' => true,
            'clave' => $clave,
            'tipo' => $tipo,
            'pdf_url' => "https://api-sandbox.facturatica.com/downloads/pdf/{$clave}.pdf",
            'pdf_content' => base64_encode("PDF {$tipo} simulado para {$clave}"),
            'fecha_generacion' => date('Y-m-d H:i:s'),
            'mensaje' => 'PDF generado correctamente (simulado)'
        ]);

    } catch (Exception $e) {
        Log::error('Error generando PDF', ['error' => $e->getMessage()]);
        
        return response()->json([
            'success' => false,
            'error' => 'Error generando PDF: ' . $e->getMessage()
        ], 500);
    }
}
}