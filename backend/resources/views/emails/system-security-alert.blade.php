@php
    $when = $event->created_at->timezone('Africa/Luanda')->format('d/m/Y H:i');
@endphp
<x-mail::message>
@if($autoBlocked)
# 🚫 IP bloqueado automaticamente

O endereço **{{ $event->ip }}** foi bloqueado automaticamente depois de
**{{ $recentFailedAttempts }}** tentativas de login falhadas em pouco tempo.
Já não consegue chegar ao login de sistema.
@elseif($event->event === 'login_attempt')
# {{ $event->outcome === 'success' ? '✅ Login de sistema bem-sucedido' : '⚠️ Tentativa de login falhada' }}

Alguém {{ $event->outcome === 'success' ? 'entrou' : 'tentou entrar' }} no
painel de sistema da Luku.
@else
# 👀 Acesso à página de login de sistema

Alguém abriu a página de login de sistema (`/sistema/entrar`) — ainda sem
tentar entrar.
@endif

<x-mail::panel>
**IP:** {{ $event->ip }}
**Data/hora:** {{ $when }} (Luanda)
@if($event->email_attempted)
**Email usado na tentativa:** {{ $event->email_attempted }}
@endif
@if($event->user_agent)
**Dispositivo/navegador:** {{ $event->user_agent }}
@endif
**Tentativas falhadas recentes deste IP:** {{ $recentFailedAttempts }}
</x-mail::panel>

@unless($autoBlocked)
Se isto não foi você, pode fechar o acesso a este endereço com um clique —
ninguém a usar este IP volta a conseguir sequer abrir a página de login.

<x-mail::button :url="$blockIpUrl" color="error">
Bloquear este IP
</x-mail::button>

**Nota:** bloquear um IP também bloqueia qualquer outra pessoa a usar o
mesmo endereço (ex: a mesma rede Wi-Fi/empresa) — normal se for um ataque
de um único ponto, mas tenha isso em conta antes de clicar.
@endunless

Este é um alerta automático — nunca partilhe este email nem o link acima.

Luku · Segurança
</x-mail::message>
