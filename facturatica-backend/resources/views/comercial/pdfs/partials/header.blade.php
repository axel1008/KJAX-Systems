<div class="company-header">
    <div class="company-logo">
        @if(isset($empresa['logo']) && $empresa['logo'])
            <img src="{{ public_path('storage/' . $empresa['logo']) }}" alt="Logo">
        @endif
    </div>
    <div class="company-info">
        <div class="company-name">{{ $empresa['nombre'] }}</div>
        <div class="company-details">
            <strong>ID:</strong> {{ $empresa['identificacion'] }}<br>
            <strong>Tel:</strong> {{ $empresa['telefono'] }} | <strong>Email:</strong> {{ $empresa['email'] }}<br>
            {{ $empresa['direccion'] }}
        </div>
    </div>
</div>