<style>
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: 'Arial', sans-serif;
        font-size: 11px;
        line-height: 1.3;
        color: #333;
    }

    .container {
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
        padding: 15px;
    }

    /* Header estilo FacturaTICA (sin logo gigante) */
    .company-header-facturatica {
        display: table;
        width: 100%;
        margin-bottom: 20px;
        border-bottom: 3px solid #000;
        padding-bottom: 10px;
    }

    .company-logo-small {
        display: table-cell;
        width: 80px;
        vertical-align: middle;
    }

    .company-logo-small img {
        max-width: 70px;
        max-height: 60px;
    }

    .company-details-facturatica {
        display: table-cell;
        vertical-align: middle;
        text-align: right;
        padding-left: 20px;
    }

    .company-name-facturatica {
        font-size: 24px;
        font-weight: bold;
        color: #000;
        margin-bottom: 5px;
        letter-spacing: 2px;
    }

    .company-subtitle {
        font-size: 14px;
        font-weight: bold;
        color: #000;
        margin-bottom: 5px;
        letter-spacing: 1px;
    }

    .invoice-number-red {
        font-size: 16px;
        font-weight: bold;
        color: #e74c3c;
        margin-bottom: 5px;
    }

    /* Información de la factura */
    .invoice-info-section {
        margin-bottom: 15px;
        text-align: right;
        font-size: 11px;
    }

    .company-slogan {
        font-style: italic;
        color: #666;
        margin-top: 10px;
        font-size: 10px;
    }

    /* Sección Emisor-Receptor estilo FacturaTICA */
    .emisor-receptor-section {
        display: table;
        width: 100%;
        margin-bottom: 15px;
        border: 1px solid #ddd;
    }

    .emisor-column, .receptor-column {
        display: table-cell;
        width: 50%;
        padding: 10px;
        vertical-align: top;
        border-right: 1px solid #ddd;
    }

    .receptor-column {
        border-right: none;
    }

    .section-title {
        font-size: 12px;
        font-weight: bold;
        color: #000;
        margin-bottom: 8px;
        text-align: center;
        background-color: #f5f5f5;
        padding: 5px;
        border-bottom: 1px solid #ddd;
    }

    .data-row {
        display: table;
        width: 100%;
        margin-bottom: 4px;
        font-size: 10px;
    }

    .data-row .icon {
        display: table-cell;
        width: 20px;
        vertical-align: top;
        font-size: 8px;
    }

    .data-row .label {
        display: table-cell;
        width: 70px;
        font-weight: bold;
        vertical-align: top;
        padding-right: 5px;
    }

    .data-row .value {
        display: table-cell;
        vertical-align: top;
        word-wrap: break-word;
    }

    /* Tabla de productos estilo FacturaTICA */
    .products-section {
        margin-bottom: 15px;
    }

    .products-table {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #000;
    }

    .products-table thead th {
        background-color: #f5f5f5;
        color: #000;
        padding: 8px 5px;
        text-align: center;
        font-weight: bold;
        font-size: 10px;
        border: 1px solid #000;
    }

    .products-table tbody td {
        padding: 6px 5px;
        border: 1px solid #000;
        vertical-align: top;
        font-size: 10px;
    }

    .products-table tbody tr:nth-child(even) {
        background-color: #fafafa;
    }

    /* Totales estilo FacturaTICA (3 columnas) */
    .totals-facturatica-section {
        display: table;
        width: 100%;
        margin-bottom: 15px;
    }

    .totals-column {
        display: table-cell;
        width: 33.33%;
        padding: 8px;
        vertical-align: top;
        border: 1px solid #ddd;
        font-size: 9px;
    }

    .totals-column h4 {
        font-size: 10px;
        font-weight: bold;
        margin-bottom: 8px;
        text-align: center;
        background-color: #f5f5f5;
        padding: 4px;
        border-bottom: 1px solid #ddd;
    }

    .total-line {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        padding: 2px 0;
    }

    .total-line-bold {
        display: flex;
        justify-content: space-between;
        margin-bottom: 3px;
        padding: 2px 0;
        font-weight: bold;
        border-bottom: 1px solid #ddd;
    }

    .iva-line {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        margin-bottom: 5px;
        padding: 2px 0;
        border-bottom: 1px solid #ddd;
    }

    .final-totals {
        border-left: 2px solid #000;
    }

    .grand-total {
        display: flex;
        justify-content: space-between;
        font-weight: bold;
        font-size: 11px;
        margin-top: 5px;
        padding: 5px 0;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        background-color: #f0f0f0;
    }

    .total-words {
        font-size: 8px;
        font-style: italic;
        text-align: center;
        margin-top: 5px;
        color: #666;
    }

    /* Observaciones */
    .observations-facturatica {
        margin-bottom: 15px;
        border: 1px solid #ddd;
        padding: 8px;
        font-size: 10px;
        background-color: #f9f9f9;
    }

    /* Footer */
    .footer-facturatica {
        border-top: 1px solid #ddd;
        padding-top: 10px;
        text-align: center;
        font-size: 9px;
        color: #666;
    }

    .generation-info {
        margin-top: 5px;
        font-size: 8px;
        color: #999;
    }

    /* Utilities */
    .text-center {
        text-align: center;
    }

    .text-right {
        text-align: right;
    }

    .text-left {
        text-align: left;
    }

    /* Currency symbol */
    .currency::before {
        content: "₡ ";
    }

    /* Print adjustments */
    @media print {
        .container {
            padding: 10px;
        }
        
        body {
            font-size: 10px;
        }
        
        .company-header-facturatica {
            margin-bottom: 15px;
        }
    }

    /* Responsive adjustments for PDF */
    @page {
        margin: 15mm;
        size: A4;
    }
</style>