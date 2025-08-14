<?php
return [
    // ========================================
    // 🏢 CONFIGURACIÓN DE TU EMPRESA (EDITAR AQUÍ)
    // ========================================
    'empresa' => [
        'nombre' => 'Rodrigo Chan',              // ✏️ CAMBIAR: Nombre de tu empresa
        'nombre_comercial' => 'Distribudora Chan',     // ✏️ CAMBIAR: Nombre comercial
        'eslogan' => 'La mejor distribuidora',   // ✏️ CAMBIAR: Tu eslogan
        'codigo_logo' => 'Chan',                           // ✏️ CAMBIAR: Iniciales para logo circular
        
        // 🎨 COLORES (Cambiar por los de tu marca)
        'color_primario' => '#1e3a8a',      // Azul oscuro principal
        'color_secundario' => '#3b82f6',    // Azul claro secundario  
        'color_acento' => '#f8fafc',        // Gris muy claro para fondos
        'color_texto' => '#1f2937',         // Gris oscuro para texto
        
        // 📱 CONTACTO
        'email_contacto' => 'chan@gmail.com',      // ✏️ CAMBIAR: Tu email
        'telefono_contacto' => '+506 2234-5678',        // ✏️ CAMBIAR: Tu teléfono
        
    ],
    
    // ========================================
    // 📝 TEXTOS PERSONALIZABLES
    // ========================================
    'textos' => [
        'titulo_factura_normal' => 'FACTURA COMERCIAL',
        'titulo_factura_electronica' => 'FACTURA ELECTRÓNICA',
        'certificacion_hacienda' => 'DOCUMENTO CERTIFICADO POR HACIENDA',
        'footer_sistema' => 'KJAX Systems Facturacion 2025',
        'footer_legal' => 'Documento válido sin firma según Ley 8454',
    ],
    
    // ========================================
    // 🎨 CONFIGURACIÓN DE DISEÑO
    // ========================================
    'diseno' => [
        'mostrar_wave' => true,              // Efecto wave en header
        'mostrar_gradientes' => true,        // Gradientes de colores
        'mostrar_sombras' => true,           // Sombras en elementos
        'bordes_redondeados' => '12px',      // Radio de bordes
        'fuente_principal' => 'Arial',       // Fuente principal
    ]
];
?>