<?php

namespace App\Http\Controllers;

use App\Services\ComercialPdfService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ComercialController extends Controller
{
    protected $pdfService;

    public function __construct(ComercialPdfService $pdfService)
    {
        $this->pdfService = $pdfService;
    }

    /**
     * Generar PDF de factura comercial
     */
    public function generarPdf(Request $request)
    {
        try {
            // Validar datos de entrada
            $request->validate([
                'numero' => 'required|string',
                'fecha' => 'required|date',
                'cliente' => 'required|array',
                'cliente.nombre' => 'required|string',
                'detalles' => 'required|array|min:1',
                'detalles.*.descripcion' => 'required|string',
                'detalles.*.cantidad' => 'required|numeric|min:0',
                'detalles.*.precioUnitario' => 'required|numeric|min:0',
                'detalles.*.total' => 'required|numeric',
                'subtotal' => 'required|numeric',
                'total' => 'required|numeric'
            ]);

            Log::info('Generando PDF comercial', ['numero' => $request->numero]);

            // Obtener datos de la empresa (puedes configurar estos datos)
            $datosEmpresa = $this->obtenerDatosEmpresa();

            // Preparar datos completos para el PDF
            $datosFactura = array_merge($request->all(), [
                'empresa' => $datosEmpresa
            ]);

            // Generar PDF usando el servicio
            $resultado = $this->pdfService->generarFacturaPdf($datosFactura);

            if (!$resultado['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $resultado['error']
                ], 500);
            }

            Log::info('PDF generado exitosamente', [
                'archivo' => $resultado['nombreArchivo'],
                'ruta' => $resultado['rutaArchivo']
            ]);

            return response()->json([
                'success' => true,
                'message' => 'PDF generado correctamente',
                'data' => [
                    'nombreArchivo' => $resultado['nombreArchivo'],
                    'urlDescarga' => $resultado['urlPublica'],
                    'rutaArchivo' => $resultado['rutaArchivo']
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Datos inválidos',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error generando PDF comercial', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error interno del servidor: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Descargar PDF generado
     */
    public function descargarPdf(Request $request)
    {
        try {
            $rutaArchivo = $request->input('rutaArchivo');
            
            if (!$rutaArchivo || !Storage::disk('public')->exists($rutaArchivo)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Archivo no encontrado'
                ], 404);
            }

            $contenido = Storage::disk('public')->get($rutaArchivo);
            $nombreArchivo = basename($rutaArchivo);

            return response($contenido, 200)
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', 'attachment; filename="' . $nombreArchivo . '"')
                ->header('Cache-Control', 'no-cache, no-store, must-revalidate')
                ->header('Pragma', 'no-cache')
                ->header('Expires', '0');

        } catch (\Exception $e) {
            Log::error('Error descargando PDF', [
                'error' => $e->getMessage(),
                'rutaArchivo' => $request->input('rutaArchivo')
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error descargando archivo'
            ], 500);
        }
    }

    /**
     * Crear nota de crédito
     */
    public function crearNotaCredito(Request $request)
    {
        try {
            $request->validate([
                'numero' => 'required|string',
                'fecha' => 'required|date',
                'facturaReferencia' => 'required|string',
                'motivo' => 'required|string',
                'cliente' => 'required|array',
                'cliente.nombre' => 'required|string',
                'detalles' => 'required|array|min:1',
                'totales' => 'required|array'
            ]);

            Log::info('Creando nota de crédito', ['numero' => $request->numero]);

            $datosEmpresa = $this->obtenerDatosEmpresa();
            
            $datosNota = array_merge($request->all(), [
                'empresa' => $datosEmpresa
            ]);

            $resultado = $this->pdfService->generarNotaCreditoPdf($datosNota);

            if (!$resultado['success']) {
                return response()->json([
                    'success' => false,
                    'message' => $resultado['error']
                ], 500);
            }

            return response()->json([
                'success' => true,
                'message' => 'Nota de crédito creada correctamente',
                'data' => [
                    'nombreArchivo' => $resultado['nombreArchivo'],
                    'urlDescarga' => $resultado['urlPublica'],
                    'rutaArchivo' => $resultado['rutaArchivo']
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error creando nota de crédito', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error creando nota de crédito: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enviar email (implementaremos en el siguiente paso)
     */
    public function enviarEmail(Request $request)
    {
        try {
            $request->validate([
                'destinatario' => 'required|email',
                'tipoDocumento' => 'required|string|in:factura,nota-credito',
                'numeroDocumento' => 'required|string',
                'rutaArchivo' => 'required|string'
            ]);

            Log::info('Enviando email comercial', [
                'destinatario' => $request->destinatario,
                'tipo' => $request->tipoDocumento,
                'numero' => $request->numeroDocumento
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Email enviado correctamente (implementación pendiente)',
                'data' => [
                    'destinatario' => $request->destinatario,
                    'fechaEnvio' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error enviando email comercial', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error enviando email: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Anular factura comercial
     */
    public function anularFactura(Request $request)
    {
        try {
            $request->validate([
                'numeroFactura' => 'required|string',
                'motivo' => 'required|string',
                'rutaArchivo' => 'string'
            ]);

            Log::info('Anulando factura comercial', [
                'numero' => $request->numeroFactura,
                'motivo' => $request->motivo
            ]);

            if ($request->rutaArchivo) {
                $this->pdfService->eliminarArchivoPdf($request->rutaArchivo);
            }

            return response()->json([
                'success' => true,
                'message' => 'Factura anulada correctamente',
                'data' => [
                    'numeroFactura' => $request->numeroFactura,
                    'fechaAnulacion' => now()->toISOString(),
                    'motivo' => $request->motivo
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error anulando factura', [
                'error' => $e->getMessage(),
                'numero' => $request->numeroFactura ?? 'N/A'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error anulando factura: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Reenviar documento
     */
    public function reenviarDocumento(Request $request)
    {
        try {
            $request->validate([
                'numeroDocumento' => 'required|string',
                'tipoDocumento' => 'required|string|in:factura,nota-credito',
                'destinatario' => 'required|email',
                'rutaArchivo' => 'required|string'
            ]);

            if (!Storage::disk('public')->exists($request->rutaArchivo)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Archivo no encontrado para reenvío'
                ], 404);
            }

            Log::info('Reenviando documento comercial', [
                'numero' => $request->numeroDocumento,
                'tipo' => $request->tipoDocumento,
                'destinatario' => $request->destinatario
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Documento reenviado correctamente',
                'data' => [
                    'numeroDocumento' => $request->numeroDocumento,
                    'destinatario' => $request->destinatario,
                    'fechaReenvio' => now()->toISOString()
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Error reenviando documento', [
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error reenviando documento: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtener listado de PDFs generados
     */
    public function listarPdfs()
    {
        try {
            $archivos = Storage::disk('public')->files('comercial/pdfs');
            
            $pdfs = collect($archivos)->map(function ($archivo) {
                $info = pathinfo($archivo);
                return [
                    'nombre' => $info['basename'],
                    'ruta' => $archivo,
                    'url' => asset('storage/' . $archivo),
                    'tamaño' => Storage::disk('public')->size($archivo),
                    'fechaModificacion' => Storage::disk('public')->lastModified($archivo)
                ];
            })->sortByDesc('fechaModificacion')->values();

            return response()->json([
                'success' => true,
                'data' => $pdfs
            ]);

        } catch (\Exception $e) {
            Log::error('Error listando PDFs', ['error' => $e->getMessage()]);

            return response()->json([
                'success' => false,
                'message' => 'Error obteniendo listado de archivos'
            ], 500);
        }
    }

    /**
     * Eliminar PDF
     */
    public function eliminarPdf(Request $request)
    {
        try {
            $request->validate([
                'rutaArchivo' => 'required|string'
            ]);

            $eliminado = $this->pdfService->eliminarArchivoPdf($request->rutaArchivo);

            if (!$eliminado) {
                return response()->json([
                    'success' => false,
                    'message' => 'Archivo no encontrado o no se pudo eliminar'
                ], 404);
            }

            Log::info('PDF eliminado', ['ruta' => $request->rutaArchivo]);

            return response()->json([
                'success' => true,
                'message' => 'Archivo eliminado correctamente'
            ]);

        } catch (\Exception $e) {
            Log::error('Error eliminando PDF', [
                'error' => $e->getMessage(),
                'ruta' => $request->rutaArchivo ?? 'N/A'
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Error eliminando archivo'
            ], 500);
        }
    }

    /**
     * Obtener configuración de empresa
     */
    private function obtenerDatosEmpresa()
    {
        return [
            'nombre' => config('app.empresa.nombre', 'Distribuidora Chan.'),
            'identificacion' => config('app.empresa.identificacion', '3-102-910978'),
            'telefono' => config('app.empresa.telefono', '2222-2222'),
            'email' => config('app.empresa.email', 'ventaschan01@gmail.com'),
            'direccion' => config('app.empresa.direccion', 'San José, Costa Rica'),
            'logo' => config('app.empresa.logo', null),
            'slogan' => config('app.empresa.slogan', null)
        ];
    }
}