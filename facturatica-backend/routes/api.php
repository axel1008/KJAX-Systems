<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\FacturaTicaController;
use App\Http\Controllers\ComercialController;

// Rutas para FacturaTICA (facturas electrónicas)
Route::prefix('facturatica')->group(function () {
    Route::get('health-check', [FacturaTicaController::class, 'healthCheck']);
    Route::post('send-invoice', [FacturaTicaController::class, 'sendInvoice']);
    Route::post('consultar-estado', [FacturaTicaController::class, 'consultarEstado']);
    Route::post('anular-factura', [FacturaTicaController::class, 'anularFactura']);
    Route::post('reenviar-factura', [FacturaTicaController::class, 'reenviarFactura']);
    Route::post('descargar-documentos', [FacturaTicaController::class, 'descargarDocumentos']);
    Route::post('generar-pdf', [FacturaTicaController::class, 'generarPDF']);
    Route::post('enviar-email', [FacturaTicaController::class, 'enviarEmail']);
    Route::post('crear-nota-credito', [FacturaTicaController::class, 'crearNotaCredito']);
    Route::post('listar-facturas', [FacturaTicaController::class, 'listarFacturas']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Rutas para facturas comerciales (normales)
Route::prefix('comercial')->group(function () {
    Route::post('/generar-pdf', [ComercialController::class, 'generarPdf']);
    Route::post('/descargar-pdf', [ComercialController::class, 'descargarPdf']);
    Route::post('/crear-nota-credito', [ComercialController::class, 'crearNotaCredito']);
    Route::post('/anular-factura', [ComercialController::class, 'anularFactura']);
    Route::post('/reenviar-documento', [ComercialController::class, 'reenviarDocumento']);
    Route::post('/enviar-email', [ComercialController::class, 'enviarEmail']);
    Route::get('/listar-pdfs', [ComercialController::class, 'listarPdfs']);
    Route::delete('/eliminar-pdf', [ComercialController::class, 'eliminarPdf']);
});