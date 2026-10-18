<x-mail::message>
@if($phase === 'started')
# 🔴 Incidente em curso

Desde **{{ $startedAt }}** (hora de Luanda) há serviços em falha:
**{{ implode(', ', $components) }}**.

**Os utilizadores ainda não foram avisados** — só o são com a sua
autorização. Se a falha estiver a afetar os clientes, use o botão abaixo
(abre uma página de confirmação com a mensagem exata).

@if($announceUrl)
<x-mail::button :url="$announceUrl" color="error">
Avisar os utilizadores ("Ups, aconteceu um erro…")
</x-mail::button>
@endif
@else
# ✅ Incidente resolvido

Os serviços **{{ implode(', ', $components) }}** estão estáveis desde
**{{ $resolvedAt }}** (falha desde {{ $startedAt }}, hora de Luanda).

Ajuste primeiro a causa que os utilizadores vão ler em /sistema/estado
("…devido a ___"). A mensagem de resolução só sai com a sua autorização:

@if($announceUrl)
<x-mail::button :url="$announceUrl" color="success">
Enviar "Depois dos anjos estão os engenheiros!"
</x-mail::button>
@endif
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
