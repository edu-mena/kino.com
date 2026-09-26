<x-mail::message>
# Resumo de ontem — {{ $restaurant->name }}

@if($summary['ordersCount'] > 0)
**Pedidos**: {{ $summary['ordersCount'] }} recebido(s), {{ number_format($summary['ordersRevenue'], 0, ',', ' ') }} Kz em pedidos entregues/concluídos.
@endif
@if($summary['reservationsCount'] > 0)
**Reservas**: {{ $summary['reservationsCount'] }} recebida(s), {{ $summary['reservationsConfirmed'] }} confirmada(s).
@endif
@if($summary['reviewsCount'] > 0)
**Avaliações**: {{ $summary['reviewsCount'] }} nova(s), média de {{ $summary['reviewsAvgRating'] }} estrelas.
@endif

<x-mail::button :url="config('app.frontend_url') . '/admin'">
Ver painel
</x-mail::button>

Até já,
Luku
</x-mail::message>
