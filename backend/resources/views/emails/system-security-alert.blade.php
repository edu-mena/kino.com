@php
    $when = $event->created_at->timezone('Africa/Luanda')->format('d/m/Y H:i');
@endphp
<x-mail::message>
@if($autoBlocked)
# 🚫 IP bloqueado automaticamente

O endereço **{{ $event->ip }}** foi bloqueado automaticamente depois de
**{{ $recentFailedAttempts }}** tentativas de login falhadas em pouco tempo.
Já não consegue chegar ao login de sistema.
@elseif($event->event === 'login_attempt' && $event->outcome === 'success')
# 🔑 Senha correta — a aguardar código 2FA

Alguém pôs a senha certa de uma conta de sistema. Ainda não entrou: falta o
código da app de autenticação. **Se não foi você, a senha vazou** — bloqueie
este IP e altere a senha já.
@elseif($event->event === 'login_attempt')
# ⚠️ Tentativa de login falhada

Alguém tentou entrar no painel de sistema da Luku com uma senha errada.
@elseif($event->event === 'two_factor' && $event->outcome === 'success')
# ✅ Login de sistema concluído

Alguém entrou no painel de sistema da Luku (senha + código 2FA).
@elseif($event->event === 'two_factor')
# ⚠️ Código 2FA errado

Alguém com a senha certa de uma conta de sistema errou o código da app de
autenticação. **Se não foi você, a senha vazou** — altere-a já.
@elseif($event->event === 'two_factor_enabled')
# 🔐 2FA ativado

A autenticação de dois fatores foi ativada numa conta de sistema. Se não
foi você, alguém com a senha dessa conta ligou-a à própria app — bloqueie
este IP e contacte a equipa técnica.
@elseif($event->event === 'recovery_codes_regenerated')
# 🔐 Códigos de recuperação regenerados

Foram gerados novos códigos de recuperação 2FA numa conta de sistema — os
anteriores deixaram de funcionar.
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
