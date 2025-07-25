<?php
return [
    // ========================================
    // 📧 CONFIGURACIÓN SMTP
    // ========================================
    'smtp' => [
        'host' => 'sandbox.smtp.mailtrap.io',
        'username' => 'ad3cda0029d361 ',
        'password' => 'd59414e192fbb4',
        'port' => 2525,
        'encryption' => 'tls'
    ],
    
    // ========================================
    // 👤 INFORMACIÓN DEL REMITENTE  
    // ========================================
    'from' => [
        'email' => 'axelrojas176@gmail.com',
        'name' => 'Sistema KJAX - Facturación'
    ],
    
    // ========================================
    // 📧 COPIAS DE EMAILS
    // ========================================
    'copia' => [
        'bcc' => '',
        'cc' => ''
    ],
    
    // ========================================
    // 🏢 DATOS DE LA EMPRESA
    // ========================================
    'empresa' => [
        'nombre' => 'KJAX Technologies',
        'telefono' => '+506 2234-5678',
        'email' => 'contacto@kjax.com',
        'whatsapp' => '+50612345678',
        'direccion' => 'San José, Costa Rica',
        'sitio_web' => 'www.kjax.com'
    ],
    
    // ========================================
    // 📝 PLANTILLAS DE EMAILS
    // ========================================
    'templates' => [
        'subject' => 'Factura {tipo_factura} #{numero_factura} - {empresa}',
        'html' => '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f7fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .content { padding: 30px; }
        .factura-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{empresa}</h1>
            <p>Sistema de Facturación</p>
        </div>
        <div class="content">
            <h2>Estimado/a {nombre_cliente},</h2>
            <p>Adjunto encontrará su factura:</p>
            <div class="factura-info">
                <p><strong>Número:</strong> #{numero_factura}</p>
                <p><strong>Fecha:</strong> {fecha_emision}</p>
                <p><strong>Total:</strong> {total}</p>
            </div>
            <p>Gracias por su preferencia.</p>
        </div>
        <div class="footer">
            <p>Este es un mensaje automático.</p>
        </div>
    </div>
</body>
</html>'
    ],
    
    // ========================================
    // ⚙️ CONFIGURACIÓN DE ENVÍOS AUTOMÁTICOS
    // ========================================
    'automatico' => [
        'enviar_al_crear' => true,
        'recordatorios_dias' => [-7, -3, -1, 0, 7, 15, 30],
        'maximo_recordatorios' => 6,
        'horario_envio' => ['08:00', '23:00'],
        'dias_habiles' => true,
        'excluir_festivos' => true
    ],
    
    // ========================================
    // 🔧 CONFIGURACIONES TÉCNICAS
    // ========================================
    'tecnico' => [
        'timeout' => 30,
        'max_intentos' => 3,
        'delay_entre_envios' => 5,
        'tamaño_maximo_adjunto' => 25,
        'encoding' => 'UTF-8',
        'verificar_ssl' => true
    ]
];
?>