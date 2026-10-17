<x-mail::message>
@if($phase === 'started')
# 🔴 Incidente em curso

Desde **{{ $startedAt }}** (hora de Luanda) há serviços em falha:
**{{ implode(', ', $components) }}**.

Os utilizadores só são avisados se a falha durar mais de
{{ config('status.notify_users_after_minutes') }} minutos.
@else
# ✅ Incidente resolvido

Os serviços **{{ implode(', ', $components) }}** estão estáveis desde
**{{ $resolvedAt }}** (falha desde {{ $startedAt }}, hora de Luanda).

Pode ajustar a causa que os utilizadores leem em /sistema/estado.
@endif

## Verificações

<x-mail::table>
| Verificação | Estado | Tempo |
|:--|:--|--:|
@foreach($checks as $name => $check)
| {{ $name }} | {{ $check['ok'] ? '✅ OK' : '❌ FALHA' }} | {{ $check['ms'] }} ms |
@endforeach
</x-mail::table>

@foreach($checks as $name => $check)
@if(! $check['ok'])
**{{ $name }}:** `{{ $check['error'] }}`

@endif
@endforeach

<x-mail::button :url="rtrim(config('app.frontend_url'), '/') . '/sistema/estado'">
Abrir o painel de estado
</x-mail::button>
</x-mail::message>
